import { useState, useEffect, useCallback } from "react";

// ── Paleta fija de highlighters ──────────────────────────────────────
const PALETTE_FAMILIES = [
  { name: "Rosas",      colors: ["#EEBAB7", "#E68A8D", "#C96068", "#AB4543"] },
  { name: "Durazno",    colors: ["#EED3B7", "#E6B58A", "#C98860", "#AB7543"] },
  { name: "Lavanda",    colors: ["#A8AFD6", "#848EBC", "#5C6BAA", "#4B5390"] },
  { name: "Cielo",      colors: ["#A8C7D6", "#84AABC", "#5C93AA", "#4B7A90"] },
  { name: "Verde sage", colors: ["#E1E9B7", "#BDD299", "#7A9B57", "#5E7F19"] },
  { name: "Ciruela",    colors: ["#D4A8D6", "#BA84BC", "#A55CAA", "#8F4B90"] },
  { name: "Menta",      colors: ["#C8DBCD", "#ACC4C0", "#7E998D", "#6A7B67"] },
  { name: "Arena",      colors: ["#D0A292", "#9B785C", "#BF967B", "#A69D98"] },
  { name: "Gris suave", colors: ["#717B7F", "#667579", "#4C5B6C", "#D9E6EC"] },
  { name: "Coral",      colors: ["#FB6563", "#CF7041", "#E5C5BD", "#E2A55E"] },
];
const FLAT_PALETTE = PALETTE_FAMILIES.flatMap(f => f.colors);

// ── Constantes ───────────────────────────────────────────────────────
const DAYS_SHORT  = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const MONTHS      = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const TIPOS_TAREA = [
  { id:"tarea",      label:"Tarea",      icon:"📝" },
  { id:"proyecto",   label:"Proyecto",   icon:"📁" },
  { id:"exposicion", label:"Exposición", icon:"🎤" },
  { id:"examen",     label:"Examen",     icon:"📖" },
];
const HOUR_START  = 6;
const HOUR_END    = 21;
const HOUR_HEIGHT = 52;
const NOTE_COLOR  = "#E8A65C";

// ── Datos de ejemplo (solo si no hay guardados) ──────────────────────
const defaultMaterias = [
  { id:1, nombre:"Cálculo I",    color:"#EEBAB7", profesor:"Dr. García",    aula:"A-101", dias:{ Lun:"7:00 - 8:30",  Mié:"7:00 - 8:30",  Vie:"7:00 - 8:30"  }},
  { id:2, nombre:"Programación", color:"#A8C7D6", profesor:"Ing. Martínez", aula:"Lab-3", dias:{ Mar:"9:00 - 11:00", Jue:"10:00 - 12:00" }},
  { id:3, nombre:"Física I",     color:"#BDD299", profesor:"Dra. López",    aula:"B-205", dias:{ Lun:"11:00 - 12:30",Vie:"13:00 - 14:30" }},
];
function buildSampleTasks(today) {
  const inDays = n => { const d = new Date(today); d.setDate(d.getDate()+n); return d; };
  const fmt = d => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
  return [
    { id:1, materiaId:1, titulo:"Entregar ejercicios cap. 4", tipo:"tarea",   fecha:fmt(inDays(0)), horasEstimadas:2, completada:false },
    { id:2, materiaId:2, titulo:"Proyecto: API básica",        tipo:"proyecto",fecha:fmt(inDays(2)), horasEstimadas:6, completada:false },
    { id:3, materiaId:3, titulo:"Examen parcial",              tipo:"examen",  fecha:fmt(inDays(2)), horasEstimadas:3, completada:false },
    { id:4, materiaId:1, titulo:"Quiz online",                 tipo:"tarea",   fecha:fmt(inDays(5)), horasEstimadas:1, completada:false },
  ];
}
function buildSampleNotes(today) {
  const inDays = n => { const d = new Date(today); d.setDate(d.getDate()+n); return d; };
  const fmt = d => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
  return [
    { id:1, titulo:"Pagar colegiatura", fecha:fmt(inDays(1)), nota:"Antes de las 3pm en caja.", completada:false },
    { id:2, titulo:"Llevar libro a la biblioteca", fecha:fmt(inDays(4)), nota:"", completada:false },
  ];
}

// ── Helpers fecha ────────────────────────────────────────────────────
function getMondayBasedDay(date) { return (date.getDay()+6)%7; }
function getDaysInMonth(y,m)     { return new Date(y,m+1,0).getDate(); }
function getFirstDayOffset(y,m)  { return getMondayBasedDay(new Date(y,m,1)); }
function getDayLabel(date)       { return DAYS_SHORT[getMondayBasedDay(date)]; }
function isToday(date) {
  const t = new Date();
  return date.getDate()===t.getDate() && date.getMonth()===t.getMonth() && date.getFullYear()===t.getFullYear();
}
function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function parseRango(hora="") {
  const m = hora.match(/(\d+):(\d+)\s*-\s*(\d+):(\d+)/);
  if (!m) return { start:0, end:60 };
  return { start:parseInt(m[1])*60+parseInt(m[2]), end:parseInt(m[3])*60+parseInt(m[4]) };
}
function parseHora(hora="") { return parseRango(hora).start; }
function getMateriasForDate(date, materias) {
  const label = getDayLabel(date);
  return materias.filter(m => m.dias[label]!==undefined)
    .sort((a,b) => parseHora(a.dias[label])-parseHora(b.dias[label]));
}
function getTasksForDate(date, tasks) { return tasks.filter(t => t.fecha===dateKey(date)); }
function getNotesForDate(date, notes) { return notes.filter(n => n.fecha===dateKey(date)); }
function getDayMarkers(date, tasks, materias, notes) {
  const markers = [];
  getTasksForDate(date,tasks).forEach(t => {
    const m = materias.find(mat => mat.id===t.materiaId);
    const c = m ? m.color : "#9a8f84";
    if (!markers.some(mk=>mk.color===c && mk.shape==="circle")) markers.push({ color:c, shape:"circle" });
  });
  if (getNotesForDate(date,notes).length>0) markers.push({ color:NOTE_COLOR, shape:"square" });
  return markers;
}
function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate()-getMondayBasedDay(d));
  return d;
}
function getUrgencia(fecha) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(fecha+"T00:00:00");
  const diff  = Math.round((due-today)/(1000*60*60*24));
  if (diff<0)   return { color:"#9a8f84", label:"Vencida" };
  if (diff===0) return { color:"#E07A5F", label:"Hoy" };
  if (diff===1) return { color:"#E07A5F", label:"Mañana" };
  if (diff<=3)  return { color:"#F2A65A", label:`En ${diff} días` };
  if (diff<=7)  return { color:"#E8C468", label:`En ${diff} días` };
  return { color:"#8FB996", label:`En ${diff} días` };
}

// ═══════════════════════════════════════════════════════════════════
// SVG Foca (solo como marca / estados vacíos)
// ═══════════════════════════════════════════════════════════════════
const SEAL_SVG = ({ size=48, color="#7EC8D4" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="62" rx="30" ry="22" fill={color} opacity="0.9"/>
    <circle cx="50" cy="36" r="20" fill={color} opacity="0.95"/>
    <circle cx="43" cy="33" r="3" fill="#2C3E50"/>
    <circle cx="57" cy="33" r="3" fill="#2C3E50"/>
    <circle cx="44" cy="32" r="1" fill="white"/>
    <circle cx="58" cy="32" r="1" fill="white"/>
    <ellipse cx="50" cy="40" rx="4" ry="2.5" fill="#E8B4A0"/>
    <line x1="30" y1="39" x2="46" y2="41" stroke="#2C3E50" strokeWidth="1" opacity="0.4"/>
    <line x1="30" y1="43" x2="46" y2="43" stroke="#2C3E50" strokeWidth="1" opacity="0.4"/>
    <line x1="54" y1="41" x2="70" y2="39" stroke="#2C3E50" strokeWidth="1" opacity="0.4"/>
    <line x1="54" y1="43" x2="70" y2="43" stroke="#2C3E50" strokeWidth="1" opacity="0.4"/>
    <ellipse cx="22" cy="68" rx="10" ry="5" fill={color} opacity="0.8" transform="rotate(-20 22 68)"/>
    <ellipse cx="78" cy="68" rx="10" ry="5" fill={color} opacity="0.8" transform="rotate(20 78 68)"/>
    <ellipse cx="50" cy="82" rx="14" ry="6" fill={color} opacity="0.75"/>
    <path d="M44 44 Q50 48 56 44" stroke="#2C3E50" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════
// Color Picker
// ═══════════════════════════════════════════════════════════════════
function FixedColorPicker({ selected, onChange, usedColors=[] }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {PALETTE_FAMILIES.map(fam => (
        <div key={fam.name}>
          <div style={{ fontSize:9, fontWeight:700, color:"#b0a89e", textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>{fam.name}</div>
          <div style={{ display:"flex", gap:5 }}>
            {fam.colors.map(c => {
              const enUso = usedColors.includes(c) && c!==selected;
              return (
                <button key={c} onClick={() => !enUso && onChange(c)} style={{
                  width:26, height:26, borderRadius:"50%", background:c,
                  border: selected===c ? "3px solid #4A6FA5" : "2px solid #e8e0d8",
                  cursor: enUso ? "not-allowed" : "pointer",
                  transform: selected===c ? "scale(1.15)" : "scale(1)",
                  transition:"transform 0.15s", opacity: enUso ? 0.3 : 1, position:"relative",
                }}>
                  {enUso && <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"white" }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Materias UI
// ═══════════════════════════════════════════════════════════════════
function MateriaForm({ initial, usedColors, onSave, onCancel }) {
  const [nombre,   setNombre]   = useState(initial?.nombre   || "");
  const [color,    setColor]    = useState(initial?.color    || FLAT_PALETTE[0]);
  const [profesor, setProfesor] = useState(initial?.profesor || "");
  const [aula,     setAula]     = useState(initial?.aula     || "");
  const [diasH,    setDiasH]    = useState(initial?.dias     || {});

  const toggleDay = d => setDiasH(prev => { const c={...prev}; if(c[d]!==undefined) delete c[d]; else c[d]=""; return c; });
  const setHora   = (d,v) => setDiasH(prev => ({ ...prev, [d]:v }));
  const selDays   = Object.keys(diasH);
  const valid     = nombre.trim() && profesor.trim() && selDays.length>0 && selDays.every(d=>diasH[d].trim());

  const inp = { width:"100%", marginTop:6, padding:"9px 12px", border:"2px solid #e8e0d8", borderRadius:10, fontSize:13, fontFamily:"Nunito, sans-serif", color:"#2C3E50", outline:"none", boxSizing:"border-box" };

  return (
    <div style={{ background:"white", borderRadius:20, padding:22, boxShadow:"0 8px 32px rgba(74,111,165,0.12)", borderTop:`5px solid ${color}`, fontFamily:"Nunito, sans-serif" }}>
      <h3 style={{ margin:"0 0 16px", color:"#2C3E50", fontSize:16, fontWeight:800 }}>{initial ? "✏️ Editar" : "✨ Nueva"} materia</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:13 }}>

        <div>
          <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Nombre</label>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Cálculo I" style={inp}
            onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor="#e8e0d8"}/>
        </div>

        <div>
          <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Color</label>
          <div style={{ marginTop:8 }}><FixedColorPicker selected={color} onChange={setColor} usedColors={usedColors}/></div>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Profesor/a</label>
            <input value={profesor} onChange={e=>setProfesor(e.target.value)} placeholder="Ej. Dr. García" style={inp}
              onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor="#e8e0d8"}/>
          </div>
          <div style={{ width:110 }}>
            <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Aula</label>
            <input value={aula} onChange={e=>setAula(e.target.value)} placeholder="Ej. A-101" style={inp}
              onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor="#e8e0d8"}/>
          </div>
        </div>

        <div>
          <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Días y horarios</label>
          <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }}>
            {DAYS_SHORT.map(d => (
              <button key={d} onClick={()=>toggleDay(d)} style={{
                width:36, height:36, borderRadius:"50%", fontSize:10, fontWeight:700,
                fontFamily:"Nunito, sans-serif",
                background: selDays.includes(d) ? color : "#f0ebe3",
                color: selDays.includes(d) ? "white" : "#7a7065",
                border:"none", cursor:"pointer",
              }}>{d}</button>
            ))}
          </div>
          {selDays.length>0 && (
            <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
              {DAYS_SHORT.filter(d=>selDays.includes(d)).map(d => {
                const parts = (diasH[d]||"").split(" - ");
                const start = parts[0] || "";
                const end   = parts[1] || "";
                return (
                  <div key={d} style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ background:color, color:"white", fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, minWidth:30, textAlign:"center" }}>{d}</span>
                    <input type="time" value={start} onChange={e=>setHora(d, `${e.target.value} - ${end}`)}
                      style={{ flex:1, padding:"6px 8px", border:"2px solid #e8e0d8", borderRadius:10, fontSize:12, fontFamily:"Nunito, sans-serif", color:"#2C3E50", outline:"none", boxSizing:"border-box" }}/>
                    <span style={{ fontSize:10, color:"#9a8f84" }}>a</span>
                    <input type="time" value={end} onChange={e=>setHora(d, `${start} - ${e.target.value}`)}
                      style={{ flex:1, padding:"6px 8px", border:"2px solid #e8e0d8", borderRadius:10, fontSize:12, fontFamily:"Nunito, sans-serif", color:"#2C3E50", outline:"none", boxSizing:"border-box" }}/>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"10px", borderRadius:12, border:"2px solid #e8e0d8", background:"white", color:"#7a7065", fontWeight:700, fontSize:12, fontFamily:"Nunito, sans-serif", cursor:"pointer" }}>Cancelar</button>
          <button onClick={()=>valid&&onSave({nombre,color,profesor,aula,dias:diasH})} style={{ flex:2, padding:"10px", borderRadius:12, border:"none", background:valid?color:"#e8e0d8", color:valid?"white":"#aaa", fontWeight:800, fontSize:12, fontFamily:"Nunito, sans-serif", cursor:valid?"pointer":"not-allowed" }}>
            {initial?"Guardar cambios":"Agregar materia"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MateriaCard({ materia, tareas, onDelete, onEdit }) {
  const [exp, setExp] = useState(false);
  const dias = Object.entries(materia.dias).sort((a,b)=>DAYS_SHORT.indexOf(a[0])-DAYS_SHORT.indexOf(b[0]));
  const tareasMateria = tareas.filter(t=>t.materiaId===materia.id && !t.completada);

  return (
    <div style={{ background:"white", borderRadius:16, borderLeft:`5px solid ${materia.color}`, padding:"14px 16px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:38, height:38, borderRadius:"50%", background:materia.color+"33", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <div style={{ width:16, height:16, borderRadius:"50%", background:materia.color }}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#2C3E50" }}>{materia.nombre}</div>
          <div style={{ fontSize:11, color:"#9a8f84" }}>👩‍🏫 {materia.profesor} {materia.aula && `· 🏫 ${materia.aula}`}</div>
          <div style={{ display:"flex", gap:3, marginTop:4, flexWrap:"wrap" }}>
            {dias.map(([d])=><span key={d} style={{ background:materia.color+"33", color:materia.color, fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:20 }}>{d}</span>)}
            {tareasMateria.length>0 && <span style={{ background:"#fff0e8", color:"#E07A5F", fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:20 }}>📝 {tareasMateria.length} tarea{tareasMateria.length>1?"s":""}</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          <button onClick={()=>setExp(e=>!e)} style={{ background:"#f0ebe3", border:"none", borderRadius:8, width:28, height:28, cursor:"pointer", fontSize:12 }}>{exp?"▲":"🕐"}</button>
          <button onClick={()=>onEdit(materia)} style={{ background:"#f0ebe3", border:"none", borderRadius:8, width:28, height:28, cursor:"pointer", fontSize:12 }}>✏️</button>
          <button onClick={()=>onDelete(materia.id)} style={{ background:"#fff0f0", border:"none", borderRadius:8, width:28, height:28, cursor:"pointer", fontSize:12 }}>🗑️</button>
        </div>
      </div>
      {exp && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed ${materia.color}66`, display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#9a8f84", textTransform:"uppercase", letterSpacing:1 }}>Horario por día</div>
          {dias.map(([d,h]) => (
            <div key={d} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ background:materia.color, color:"white", fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:20, minWidth:28, textAlign:"center" }}>{d}</span>
              <span style={{ fontSize:11, color:"#5a5047", fontWeight:600 }}>🕐 {h}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tareas UI
// ═══════════════════════════════════════════════════════════════════
function TareaForm({ initial, materias, onSave, onCancel }) {
  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [matId,  setMatId]  = useState(initial?.materiaId || materias[0]?.id || null);
  const [tipo,   setTipo]   = useState(initial?.tipo   || "tarea");
  const [fecha,  setFecha]  = useState(initial?.fecha  || "");
  const [horas,  setHoras]  = useState(initial?.horasEstimadas || 1);
  const mat   = materias.find(m=>m.id===matId);
  const color = mat?.color || "#4A6FA5";
  const valid = titulo.trim() && matId && fecha;
  const inp   = { width:"100%", marginTop:6, padding:"9px 12px", border:"2px solid #e8e0d8", borderRadius:10, fontSize:13, fontFamily:"Nunito, sans-serif", color:"#2C3E50", outline:"none", boxSizing:"border-box" };

  return (
    <div style={{ background:"white", borderRadius:20, padding:22, boxShadow:"0 8px 32px rgba(74,111,165,0.12)", borderTop:`5px solid ${color}`, fontFamily:"Nunito, sans-serif" }}>
      <h3 style={{ margin:"0 0 16px", color:"#2C3E50", fontSize:16, fontWeight:800 }}>{initial?"✏️ Editar":"✨ Nueva"} tarea</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Título</label>
          <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ej. Entregar ejercicios" style={inp}
            onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor="#e8e0d8"}/>
        </div>
        {materias.length>0 ? (
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Materia</label>
            <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
              {materias.map(m => (
                <button key={m.id} onClick={()=>setMatId(m.id)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 11px", borderRadius:20, border:"none", background:matId===m.id?m.color:"#f0ebe3", color:matId===m.id?"white":"#7a7065", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Nunito, sans-serif" }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:matId===m.id?"white":m.color }}/>{m.nombre}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ fontSize:11, color:"#b0a89e", background:"#faf8f5", padding:"8px 12px", borderRadius:10 }}>Agrega una materia primero para poder ligar tareas.</div>
        )}
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Tipo</label>
          <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
            {TIPOS_TAREA.map(t => (
              <button key={t.id} onClick={()=>setTipo(t.id)} style={{ padding:"6px 11px", borderRadius:20, border:"none", background:tipo===t.id?color:"#f0ebe3", color:tipo===t.id?"white":"#7a7065", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Nunito, sans-serif" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Fecha de entrega</label>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inp}
              onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor="#e8e0d8"}/>
          </div>
          <div style={{ width:100 }}>
            <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Horas est.</label>
            <input type="number" min="0.5" step="0.5" value={horas} onChange={e=>setHoras(parseFloat(e.target.value)||0)} style={inp}
              onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor="#e8e0d8"}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"10px", borderRadius:12, border:"2px solid #e8e0d8", background:"white", color:"#7a7065", fontWeight:700, fontSize:12, fontFamily:"Nunito, sans-serif", cursor:"pointer" }}>Cancelar</button>
          <button onClick={()=>valid&&onSave({titulo,materiaId:matId,tipo,fecha,horasEstimadas:horas,completada:initial?.completada||false})} style={{ flex:2, padding:"10px", borderRadius:12, border:"none", background:valid?color:"#e8e0d8", color:valid?"white":"#aaa", fontWeight:800, fontSize:12, fontFamily:"Nunito, sans-serif", cursor:valid?"pointer":"not-allowed" }}>
            {initial?"Guardar cambios":"Agregar tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TareaCard({ tarea, materia, onToggle, onDelete, onEdit }) {
  const color = materia?.color || "#9a8f84";
  const urg   = getUrgencia(tarea.fecha);
  const tipo  = TIPOS_TAREA.find(t=>t.id===tarea.tipo)||TIPOS_TAREA[0];
  const fObj  = new Date(tarea.fecha+"T00:00:00");
  const fStr  = `${fObj.getDate()} ${MONTHS[fObj.getMonth()].slice(0,3)}`;

  return (
    <div style={{ background:"white", borderRadius:16, borderLeft:`5px solid ${tarea.completada?"#d8d2c8":color}`, padding:"13px 16px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)", opacity:tarea.completada?0.6:1, display:"flex", alignItems:"center", gap:12 }}>
      <button onClick={()=>onToggle(tarea.id)} style={{ width:24, height:24, borderRadius:"50%", flexShrink:0, border:`2px solid ${tarea.completada?"#bdb5aa":color}`, background:tarea.completada?"#bdb5aa":"white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"white" }}>
        {tarea.completada?"✓":""}
      </button>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#2C3E50", textDecoration:tarea.completada?"line-through":"none" }}>{tipo.icon} {tarea.titulo}</div>
        <div style={{ display:"flex", gap:5, marginTop:4, flexWrap:"wrap", alignItems:"center" }}>
          {materia && <span style={{ background:color+"30", color, fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:20 }}>{materia.nombre}</span>}
          <span style={{ fontSize:9, color:"#9a8f84", fontWeight:600 }}>🕐 {tarea.horasEstimadas}h</span>
          <span style={{ fontSize:9, color:"#9a8f84", fontWeight:600 }}>📅 {fStr}</span>
        </div>
      </div>
      {!tarea.completada && <span style={{ background:urg.color+"22", color:urg.color, fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:20, flexShrink:0 }}>{urg.label}</span>}
      <div style={{ display:"flex", gap:4, flexShrink:0 }}>
        <button onClick={()=>onEdit(tarea)} style={{ background:"#f0ebe3", border:"none", borderRadius:8, width:26, height:26, cursor:"pointer", fontSize:12 }}>✏️</button>
        <button onClick={()=>onDelete(tarea.id)} style={{ background:"#fff0f0", border:"none", borderRadius:8, width:26, height:26, cursor:"pointer", fontSize:12 }}>🗑️</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Notas / Recordatorios UI
// ═══════════════════════════════════════════════════════════════════
function NotaForm({ initial, onSave, onCancel }) {
  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [fecha,  setFecha]  = useState(initial?.fecha  || "");
  const [nota,   setNota]   = useState(initial?.nota   || "");
  const valid = titulo.trim() && fecha;
  const inp   = { width:"100%", marginTop:6, padding:"9px 12px", border:"2px solid #e8e0d8", borderRadius:10, fontSize:13, fontFamily:"Nunito, sans-serif", color:"#2C3E50", outline:"none", boxSizing:"border-box" };

  return (
    <div style={{ background:"white", borderRadius:20, padding:22, boxShadow:"0 8px 32px rgba(74,111,165,0.12)", borderTop:`5px solid ${NOTE_COLOR}`, fontFamily:"Nunito, sans-serif" }}>
      <h3 style={{ margin:"0 0 16px", color:"#2C3E50", fontSize:16, fontWeight:800 }}>{initial?"✏️ Editar":"✨ Nueva"} nota</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Título</label>
          <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ej. Pagar colegiatura" style={inp}
            onFocus={e=>e.target.style.borderColor=NOTE_COLOR} onBlur={e=>e.target.style.borderColor="#e8e0d8"}/>
        </div>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Fecha</label>
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inp}
            onFocus={e=>e.target.style.borderColor=NOTE_COLOR} onBlur={e=>e.target.style.borderColor="#e8e0d8"}/>
        </div>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:"#7a7065", textTransform:"uppercase", letterSpacing:1 }}>Nota (opcional)</label>
          <textarea value={nota} onChange={e=>setNota(e.target.value)} placeholder="Detalles, dirección, lo que sea..." rows={3}
            style={{ ...inp, resize:"vertical", fontFamily:"Nunito, sans-serif" }}
            onFocus={e=>e.target.style.borderColor=NOTE_COLOR} onBlur={e=>e.target.style.borderColor="#e8e0d8"}/>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"10px", borderRadius:12, border:"2px solid #e8e0d8", background:"white", color:"#7a7065", fontWeight:700, fontSize:12, fontFamily:"Nunito, sans-serif", cursor:"pointer" }}>Cancelar</button>
          <button onClick={()=>valid&&onSave({titulo,fecha,nota,completada:initial?.completada||false})} style={{ flex:2, padding:"10px", borderRadius:12, border:"none", background:valid?NOTE_COLOR:"#e8e0d8", color:valid?"white":"#aaa", fontWeight:800, fontSize:12, fontFamily:"Nunito, sans-serif", cursor:valid?"pointer":"not-allowed" }}>
            {initial?"Guardar cambios":"Agregar nota"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotaCard({ nota, onToggle, onDelete, onEdit }) {
  const urg  = getUrgencia(nota.fecha);
  const fObj = new Date(nota.fecha+"T00:00:00");
  const fStr = `${fObj.getDate()} ${MONTHS[fObj.getMonth()].slice(0,3)}`;

  return (
    <div style={{ background:"white", borderRadius:16, borderLeft:`5px solid ${nota.completada?"#d8d2c8":NOTE_COLOR}`, padding:"13px 16px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)", opacity:nota.completada?0.6:1, display:"flex", alignItems:"flex-start", gap:12 }}>
      <button onClick={()=>onToggle(nota.id)} style={{ width:24, height:24, borderRadius:8, flexShrink:0, marginTop:1, border:`2px solid ${nota.completada?"#bdb5aa":NOTE_COLOR}`, background:nota.completada?"#bdb5aa":"white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"white" }}>
        {nota.completada?"✓":""}
      </button>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#2C3E50", textDecoration:nota.completada?"line-through":"none" }}>🗒️ {nota.titulo}</div>
        {nota.nota && <div style={{ fontSize:11, color:"#7a7065", marginTop:3, lineHeight:1.4 }}>{nota.nota}</div>}
        <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:9, color:"#9a8f84", fontWeight:600 }}>📅 {fStr}</span>
        </div>
      </div>
      {!nota.completada && <span style={{ background:urg.color+"22", color:urg.color, fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:20, flexShrink:0 }}>{urg.label}</span>}
      <div style={{ display:"flex", gap:4, flexShrink:0 }}>
        <button onClick={()=>onEdit(nota)} style={{ background:"#f0ebe3", border:"none", borderRadius:8, width:26, height:26, cursor:"pointer", fontSize:12 }}>✏️</button>
        <button onClick={()=>onDelete(nota.id)} style={{ background:"#fff0f0", border:"none", borderRadius:8, width:26, height:26, cursor:"pointer", fontSize:12 }}>🗑️</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Calendar components
// ═══════════════════════════════════════════════════════════════════
function DayDetail({ date, materias, tasks, notes, onClose }) {
  const label       = getDayLabel(date);
  const dayMaterias = getMateriasForDate(date, materias);
  const dayTasks    = getTasksForDate(date, tasks);
  const dayNotes    = getNotesForDate(date, notes);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,62,80,0.35)", zIndex:50, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"white", borderRadius:"22px 22px 0 0", width:"100%", maxWidth:600, padding:"22px 20px 36px", boxShadow:"0 -8px 40px rgba(0,0,0,0.13)", fontFamily:"Nunito, sans-serif", maxHeight:"78vh", overflowY:"auto" }}>
        <div style={{ width:36, height:4, background:"#e8e0d8", borderRadius:2, margin:"0 auto 16px" }}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, color:"#9a8f84", fontWeight:700 }}>{DAYS_SHORT[getMondayBasedDay(date)]}</div>
            <div style={{ fontSize:24, fontWeight:900, color:"#2C3E50" }}>{date.getDate()} de {MONTHS[date.getMonth()]}</div>
          </div>
          <button onClick={onClose} style={{ background:"#f0ebe3", border:"none", borderRadius:12, width:32, height:32, fontSize:17, cursor:"pointer" }}>×</button>
        </div>

        {dayMaterias.length===0 && dayTasks.length===0 && dayNotes.length===0 ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <SEAL_SVG size={56} color="#d4cfc8"/>
            <p style={{ color:"#b0a89e", marginTop:10, fontSize:13 }}>Sin clases, tareas ni notas 🌿</p>
          </div>
        ) : (
          <>
            {dayMaterias.length>0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#9a8f84", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Clases · por hora</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {dayMaterias.map((m,i) => (
                    <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, background:m.color+"18", borderRadius:12, padding:"10px 12px", borderLeft:`4px solid ${m.color}` }}>
                      <div style={{ fontSize:10, fontWeight:900, color:m.color, minWidth:14 }}>{i+1}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:"#2C3E50" }}>{m.nombre}</div>
                        <div style={{ fontSize:10, color:"#9a8f84" }}>👩‍🏫 {m.profesor} {m.aula && `· 🏫 ${m.aula}`}</div>
                      </div>
                      <div style={{ background:m.color, color:"white", fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:20 }}>🕐 {m.dias[label]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dayTasks.length>0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#9a8f84", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>📝 Tareas</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {dayTasks.map(t => {
                    const m = materias.find(mat=>mat.id===t.materiaId);
                    const c = m?m.color:"#9a8f84";
                    return (
                      <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, background:"#faf8f5", borderRadius:10, padding:"9px 12px", border:`1.5px dashed ${c}88` }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:c, flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#2C3E50", textDecoration:t.completada?"line-through":"none" }}>{t.titulo}</div>
                          {m && <div style={{ fontSize:9, color:"#9a8f84" }}>{m.nombre} · {t.horasEstimadas}h est.</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {dayNotes.length>0 && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#9a8f84", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>🗒️ Notas</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {dayNotes.map(n => (
                    <div key={n.id} style={{ display:"flex", alignItems:"flex-start", gap:8, background:"#faf8f5", borderRadius:10, padding:"9px 12px", border:`1.5px dashed ${NOTE_COLOR}88` }}>
                      <div style={{ width:7, height:7, borderRadius:2, background:NOTE_COLOR, flexShrink:0, marginTop:5 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#2C3E50", textDecoration:n.completada?"line-through":"none" }}>{n.titulo}</div>
                        {n.nota && <div style={{ fontSize:10, color:"#9a8f84" }}>{n.nota}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CalendarGrid({ year, month, materias, tasks, notes, onDayClick }) {
  const today  = new Date();
  const days   = getDaysInMonth(year,month);
  const offset = getFirstDayOffset(year,month);
  const cells  = [];
  for (let i=0;i<offset;i++) cells.push(null);
  for (let d=1;d<=days;d++) cells.push(d);

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
        {DAYS_SHORT.map(d => <div key={d} style={{ textAlign:"center", fontSize:9, fontWeight:800, color:d==="Sáb"||d==="Dom"?"#c4b8ae":"#9a8f84", padding:"4px 0" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((day,i) => {
          if (!day) return <div key={`e-${i}`}/>;
          const date = new Date(year,month,day);
          const dm   = getMateriasForDate(date,materias);
          const mk   = getDayMarkers(date,tasks,materias,notes);
          const tf   = isToday(date);
          const past = date < new Date(today.getFullYear(),today.getMonth(),today.getDate());
          const we   = getMondayBasedDay(date)>=5;
          return (
            <button key={day} onClick={()=>onDayClick(date)} style={{ aspectRatio:"1", borderRadius:10, border:tf?"2px solid #4A6FA5":"2px solid transparent", background:tf?"#4A6FA5":we?"#faf7f4":"white", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, padding:"2px", boxShadow:tf?"0 3px 12px rgba(74,111,165,0.3)":"0 1px 3px rgba(0,0,0,0.06)", opacity:past?0.5:1, transition:"transform 0.1s", position:"relative", fontFamily:"Nunito, sans-serif" }}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.08)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              {mk.length>0 && (
                <div style={{ position:"absolute", top:2, right:2, width:5, height:5, borderRadius:mk[0].shape==="circle"?"50%":1, background:mk[0].color, boxShadow:"0 0 0 1px white" }}/>
              )}
              <span style={{ fontSize:11, fontWeight:tf?900:700, color:tf?"white":we?"#c4b8ae":"#2C3E50", lineHeight:1 }}>{day}</span>
              {dm.length>0 && (
                <div style={{ display:"flex", gap:2, justifyContent:"center" }}>
                  {dm.slice(0,3).map(m => <div key={m.id} style={{ width:4, height:4, borderRadius:"50%", background:tf?"white":m.color }}/>)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ weekStart, materias, tasks, notes, onDayClick }) {
  const hours     = [];
  for (let h=HOUR_START;h<=HOUR_END;h++) hours.push(h);
  const weekDates = DAYS_SHORT.map((_,i) => { const d=new Date(weekStart); d.setDate(d.getDate()+i); return d; });
  const fmtH      = h => { const p=h<12?"AM":"PM"; const h12=h%12===0?12:h%12; return `${h12}${p}`; };

  return (
    <div style={{ background:"white", borderRadius:18, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:"40px repeat(7,1fr)", borderBottom:"1px solid #f0ebe3" }}>
        <div/>
        {weekDates.map((date,i) => {
          const tf = isToday(date);
          const mk = getDayMarkers(date,tasks,materias,notes);
          return (
            <button key={i} onClick={()=>onDayClick(date)} style={{ border:"none", background:"transparent", cursor:"pointer", padding:"8px 2px 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:2, fontFamily:"Nunito, sans-serif", position:"relative" }}>
              <span style={{ fontSize:8, fontWeight:800, color:"#9a8f84" }}>{DAYS_SHORT[i]}</span>
              <span style={{ fontSize:13, fontWeight:900, width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:tf?"#4A6FA5":"transparent", color:tf?"white":"#2C3E50" }}>{date.getDate()}</span>
              {mk.length>0 && <div style={{ position:"absolute", top:6, right:"15%", width:5, height:5, borderRadius:mk[0].shape==="circle"?"50%":1, background:mk[0].color, boxShadow:"0 0 0 1px white" }}/>}
            </button>
          );
        })}
      </div>
      <div style={{ overflowX:"auto" }}>
        <div style={{ position:"relative", minWidth:520 }}>
          <div style={{ display:"grid", gridTemplateColumns:"40px repeat(7,1fr)" }}>
            {hours.map(h => (
              <>
                <div key={`l-${h}`} style={{ height:HOUR_HEIGHT, fontSize:8, color:"#b0a89e", fontWeight:700, textAlign:"right", paddingRight:5, paddingTop:2, borderTop:"1px solid #f5f1ec", fontFamily:"Nunito, sans-serif" }}>{fmtH(h)}</div>
                {weekDates.map((_,di) => <div key={`c-${h}-${di}`} style={{ height:HOUR_HEIGHT, borderTop:"1px solid #f5f1ec", background:di>=5?"#fcfaf7":"white" }}/>)}
              </>
            ))}
          </div>
          <div style={{ position:"absolute", top:0, left:40, right:0, bottom:0, display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {weekDates.map((date,di) => {
              const label = DAYS_SHORT[di];
              const dm    = materias.filter(m=>m.dias[label]!==undefined);
              return (
                <div key={di} style={{ position:"relative" }}>
                  {dm.map(m => {
                    const { start, end } = parseRango(m.dias[label]);
                    const top    = ((start-HOUR_START*60)/60)*HOUR_HEIGHT;
                    const height = Math.max(((end-start)/60)*HOUR_HEIGHT, 20);
                    if (top<0) return null;
                    return (
                      <div key={m.id} style={{ position:"absolute", top, left:2, right:2, height, background:m.color, borderRadius:7, padding:"2px 5px", overflow:"hidden", boxShadow:`0 2px 5px ${m.color}55`, fontFamily:"Nunito, sans-serif" }}>
                        <div style={{ fontSize:9, fontWeight:800, color:"white", lineHeight:1.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{m.nombre}</div>
                        {height>28 && <div style={{ fontSize:7.5, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>{m.dias[label]}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const today = new Date();

  // ── State y almacenamiento persistente (localStorage del navegador) ──
  const [materias, setMateriasRaw] = useState(defaultMaterias);
  const [tasks, setTasksRaw] = useState(() => buildSampleTasks(today));
  const [notes, setNotesRaw] = useState(() => buildSampleNotes(today));
  const [nextMatId, setNextMatId] = useState(4);
  const [nextTarId, setNextTarId] = useState(5);
  const [nextNoteId, setNextNoteId] = useState(3);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // ── Cargar datos guardados ───────────────────────────────────────
  useEffect(() => {
    try {
      const savedMaterias = localStorage.getItem("studyplanner_materias");
      const savedTasks = localStorage.getItem("studyplanner_tasks");
      const savedNotes = localStorage.getItem("studyplanner_notes");
      const savedNextIds = localStorage.getItem("studyplanner_nextIds");

      if (savedMaterias) setMateriasRaw(JSON.parse(savedMaterias));
      if (savedTasks) setTasksRaw(JSON.parse(savedTasks));
      if (savedNotes) setNotesRaw(JSON.parse(savedNotes));

      if (savedNextIds) {
        const ids = JSON.parse(savedNextIds);
        if (typeof ids.mat === "number") setNextMatId(ids.mat);
        if (typeof ids.tar === "number") setNextTarId(ids.tar);
        if (typeof ids.note === "number") setNextNoteId(ids.note);
      }
    } catch (error) {
      console.error("No se pudieron cargar los datos:", error);
      setSaveError(true);
    }
    setReady(true);
  }, []);

  // ── Guardar datos ────────────────────────────────────────────────
  const persist = useCallback((key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setSaveError(false);
    } catch (error) {
      console.error("No se pudo guardar:", error);
      setSaveError(true);
    }
  }, []);

  const setMaterias = useCallback(fn => {
    setMateriasRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      persist("studyplanner_materias", next);
      return next;
    });
  }, [persist]);

  const setTasks = useCallback(fn => {
    setTasksRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      persist("studyplanner_tasks", next);
      return next;
    });
  }, [persist]);

  const setNotes = useCallback(fn => {
    setNotesRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      persist("studyplanner_notes", next);
      return next;
    });
  }, [persist]);

  useEffect(() => {
    if (!ready) return;
    persist("studyplanner_nextIds", { mat: nextMatId, tar: nextTarId, note: nextNoteId });
  }, [nextMatId, nextTarId, nextNoteId, ready, persist]);

  // ── Nav state ─────────────────────────────────────────────────────
  const [year,      setYear]      = useState(today.getFullYear());
  const [month,     setMonth]     = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const [calView,   setCalView]   = useState("month");
  const [selDate,   setSelDate]   = useState(null);
  const [activeTab, setActiveTab] = useState("calendar");

  // ── Form state ────────────────────────────────────────────────────
  const [showMatForm, setShowMatForm] = useState(false);
  const [editingMat,  setEditingMat]  = useState(null);
  const [showTarForm, setShowTarForm] = useState(false);
  const [editingTar,  setEditingTar]  = useState(null);
  const [showNoteForm,setShowNoteForm]= useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [taskFilter,  setTaskFilter]  = useState("pendientes");
  const [noteFilter,  setNoteFilter]  = useState("pendientes");

  const usedColors = materias.map(m=>m.color);

  // ── Materias handlers ─────────────────────────────────────────────
  const saveMat = data => {
    if (editingMat) setMaterias(p=>p.map(m=>m.id===editingMat.id?{...m,...data}:m));
    else { setMaterias(p=>[...p,{id:nextMatId,...data}]); setNextMatId(n=>n+1); }
    setEditingMat(null); setShowMatForm(false);
  };
  const delMat  = id => setMaterias(p=>p.filter(m=>m.id!==id));
  const editMat = m  => { setEditingMat(m); setShowMatForm(true); };

  // ── Tareas handlers ───────────────────────────────────────────────
  const saveTar = data => {
    if (editingTar) setTasks(p=>p.map(t=>t.id===editingTar.id?{...t,...data}:t));
    else { setTasks(p=>[...p,{id:nextTarId,...data}]); setNextTarId(n=>n+1); }
    setEditingTar(null); setShowTarForm(false);
  };
  const delTar    = id => setTasks(p=>p.filter(t=>t.id!==id));
  const editTar   = t  => { setEditingTar(t); setShowTarForm(true); };
  const toggleTar = id => setTasks(p=>p.map(t=>t.id===id?{...t,completada:!t.completada}:t));

  // ── Notas handlers ────────────────────────────────────────────────
  const saveNote = data => {
    if (editingNote) setNotes(p=>p.map(n=>n.id===editingNote.id?{...n,...data}:n));
    else { setNotes(p=>[...p,{id:nextNoteId,...data}]); setNextNoteId(n=>n+1); }
    setEditingNote(null); setShowNoteForm(false);
  };
  const delNote    = id => setNotes(p=>p.filter(n=>n.id!==id));
  const editNote   = n  => { setEditingNote(n); setShowNoteForm(true); };
  const toggleNote = id => setNotes(p=>p.map(n=>n.id===id?{...n,completada:!n.completada}:n));

  // ── Nav helpers ───────────────────────────────────────────────────
  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };
  const prevWeek  = () => setWeekStart(p=>{const d=new Date(p);d.setDate(d.getDate()-7);return d;});
  const nextWeek  = () => setWeekStart(p=>{const d=new Date(p);d.setDate(d.getDate()+7);return d;});
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setWeekStart(getWeekStart(today)); };

  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6);
  const daysInM   = getDaysInMonth(year,month);
  const classDays = Array.from({length:daysInM},(_,i)=>getMateriasForDate(new Date(year,month,i+1),materias).length>0?1:0).reduce((a,b)=>a+b,0);

  const tabBtn = (id,icon,label) => (
    <button onClick={()=>setActiveTab(id)} style={{ padding:"5px 8px", borderRadius:10, border:"none", background:activeTab===id?"#4A6FA5":"transparent", color:activeTab===id?"white":"#9a8f84", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Nunito, sans-serif", display:"flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
      {icon}<span style={{fontSize:9}}>{label}</span>
    </button>
  );

  if (!ready) {
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#FAF7F2 0%,#F0EBE3 50%,#EBF4F7 100%)", fontFamily:"Nunito, sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
        <SEAL_SVG size={64} color="#7EC8D4"/>
        <div style={{ color:"#9a8f84", fontSize:12, fontWeight:700 }}>Cargando tus datos...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#FAF7F2 0%,#F0EBE3 50%,#EBF4F7 100%)", fontFamily:"Nunito, sans-serif" }}>
      {saveError && (
        <div style={{ position:"fixed", top:8, left:"50%", transform:"translateX(-50%)", background:"#E07A5F", color:"white", fontSize:10, fontWeight:700, padding:"5px 12px", borderRadius:20, zIndex:99, boxShadow:"0 3px 10px rgba(0,0,0,0.15)" }}>
          ⚠️ No se pudo guardar el último cambio, revisa tu conexión
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background:"white", borderBottom:"1px solid #e8e0d8", padding:"0 16px", position:"sticky", top:0, zIndex:20, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth:600, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:58, gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
            <SEAL_SVG size={30} color="#7EC8D4"/>
            <div style={{ fontSize:15, fontWeight:900, color:"#2C3E50", lineHeight:1, whiteSpace:"nowrap" }}>StudyPlanner</div>
          </div>
          <div style={{ display:"flex", gap:2, overflowX:"auto" }}>
            {tabBtn("calendar","📅","Inicio")}
            {tabBtn("tareas","📝","Tareas")}
            {tabBtn("notas","🗒️","Notas")}
            {tabBtn("materias","📚","Materias")}
          </div>
        </div>
      </div>

      {/* ══════════ CALENDAR ══════════ */}
      {activeTab==="calendar" && (
        <div style={{ maxWidth:600, margin:"0 auto", padding:"18px 14px 80px" }}>
          <div style={{ display:"flex", gap:5, marginBottom:12, background:"white", borderRadius:13, padding:3, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
            {[{id:"month",label:"📅 Mes"},{id:"week",label:"🗓️ Semana"}].map(v=>(
              <button key={v.id} onClick={()=>setCalView(v.id)} style={{ flex:1, padding:"8px", borderRadius:11, border:"none", background:calView===v.id?"#4A6FA5":"transparent", color:calView===v.id?"white":"#9a8f84", fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"Nunito, sans-serif" }}>{v.label}</button>
            ))}
          </div>

          {calView==="month" ? (
            <div style={{ background:"white", borderRadius:20, padding:"16px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <button onClick={prevMonth} style={{ width:32, height:32, borderRadius:10, border:"none", background:"#f0ebe3", cursor:"pointer", fontSize:15 }}>‹</button>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:18, fontWeight:900, color:"#2C3E50" }}>{MONTHS[month]}</div>
                  <div style={{ fontSize:10, color:"#9a8f84", fontWeight:600 }}>{year}</div>
                </div>
                <button onClick={nextMonth} style={{ width:32, height:32, borderRadius:10, border:"none", background:"#f0ebe3", cursor:"pointer", fontSize:15 }}>›</button>
              </div>
              <CalendarGrid year={year} month={month} materias={materias} tasks={tasks} notes={notes} onDayClick={setSelDate}/>
            </div>
          ) : (
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <button onClick={prevWeek} style={{ width:32, height:32, borderRadius:10, border:"none", background:"white", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", cursor:"pointer", fontSize:15 }}>‹</button>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:14, fontWeight:900, color:"#2C3E50" }}>{weekStart.getDate()} - {weekEnd.getDate()} {MONTHS[weekStart.getMonth()].slice(0,3)}</div>
                  <div style={{ fontSize:9, color:"#9a8f84", fontWeight:600 }}>{weekStart.getFullYear()}</div>
                </div>
                <button onClick={nextWeek} style={{ width:32, height:32, borderRadius:10, border:"none", background:"white", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", cursor:"pointer", fontSize:15 }}>›</button>
              </div>
              <WeekView weekStart={weekStart} materias={materias} tasks={tasks} notes={notes} onDayClick={setSelDate}/>
            </div>
          )}

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            {[
              { label:"Días con clases", v:classDays,                                icon:"📚", c:"#7EC8D4" },
              { label:"Tareas pend.",    v:tasks.filter(t=>!t.completada).length,     icon:"📝", c:"#BDD299" },
              { label:"Notas pend.",     v:notes.filter(n=>!n.completada).length,     icon:"🗒️", c:"#E8A65C" },
            ].map((s,i) => (
              <div key={i} style={{ background:"white", borderRadius:13, padding:"10px 8px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", textAlign:"center" }}>
                <div style={{ fontSize:16 }}>{s.icon}</div>
                <div style={{ fontSize:18, fontWeight:900, color:s.c, lineHeight:1.1 }}>{s.v}</div>
                <div style={{ fontSize:8, color:"#9a8f84", fontWeight:700, marginTop:1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ background:"white", borderRadius:14, padding:"12px 14px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#9a8f84", textTransform:"uppercase", letterSpacing:1, marginBottom:7 }}>Materias</div>
            {materias.length===0 ? (
              <div style={{ fontSize:11, color:"#c0b8ae" }}>Agrega materias para verlas aquí 📚</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {materias.map(m => (
                  <div key={m.id} style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:m.color, flexShrink:0 }}/>
                    <span style={{ fontSize:11, fontWeight:700, color:"#2C3E50", flex:1 }}>{m.nombre}</span>
                    <div style={{ display:"flex", gap:3 }}>
                      {Object.keys(m.dias).map(d => <span key={d} style={{ background:m.color+"30", color:m.color, fontSize:7, fontWeight:800, padding:"1px 4px", borderRadius:20 }}>{d}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {((calView==="month" && (year!==today.getFullYear()||month!==today.getMonth())) ||
            (calView==="week" && dateKey(weekStart)!==dateKey(getWeekStart(today)))) && (
            <button onClick={goToday} style={{ position:"fixed", bottom:26, right:"calc(50% - 290px)", background:"#4A6FA5", color:"white", border:"none", borderRadius:20, padding:"11px 20px", fontSize:12, fontWeight:800, fontFamily:"Nunito, sans-serif", cursor:"pointer", boxShadow:"0 5px 18px rgba(74,111,165,0.35)" }}>📅 Ir a hoy</button>
          )}
        </div>
      )}

      {/* ══════════ TAREAS ══════════ */}
      {activeTab==="tareas" && (
        <div style={{ maxWidth:600, margin:"0 auto", padding:"18px 14px 90px" }}>
          <div style={{ marginBottom:14 }}>
            <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:"#2C3E50" }}>Mis tareas 📝</h1>
            <p style={{ margin:"3px 0 0", fontSize:11, color:"#9a8f84" }}>{tasks.filter(t=>!t.completada).length} pendiente{tasks.filter(t=>!t.completada).length!==1?"s":""}</p>
          </div>

          <div style={{ display:"flex", gap:5, marginBottom:14 }}>
            {["pendientes","completadas","todas"].map(f => (
              <button key={f} onClick={()=>setTaskFilter(f)} style={{ padding:"6px 12px", borderRadius:20, border:"none", background:taskFilter===f?"#4A6FA5":"white", color:taskFilter===f?"white":"#9a8f84", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Nunito, sans-serif", boxShadow:"0 2px 5px rgba(0,0,0,0.06)", textTransform:"capitalize" }}>{f}</button>
            ))}
          </div>

          {showTarForm && (
            <div style={{ marginBottom:14 }}>
              <TareaForm initial={editingTar} materias={materias} onSave={saveTar} onCancel={()=>{setShowTarForm(false);setEditingTar(null);}}/>
            </div>
          )}

          {(() => {
            let f = [...tasks];
            if (taskFilter==="pendientes")  f = f.filter(t=>!t.completada);
            if (taskFilter==="completadas") f = f.filter(t=>t.completada);
            f = f.sort((a,b) => new Date(a.fecha)-new Date(b.fecha));
            if (f.length===0 && !showTarForm) return (
              <div style={{ textAlign:"center", padding:"44px 20px" }}>
                <SEAL_SVG size={80} color="#7EC8D4"/>
                <p style={{ color:"#9a8f84", marginTop:12, fontSize:13, lineHeight:1.6 }}>
                  {taskFilter==="completadas" ? "Aún no completas tareas 🌱" : "¡Sin tareas pendientes! 🌟"}
                </p>
              </div>
            );
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {f.map(t => <TareaCard key={t.id} tarea={t} materia={materias.find(m=>m.id===t.materiaId)} onToggle={toggleTar} onDelete={delTar} onEdit={editTar}/>)}
              </div>
            );
          })()}

          {!showTarForm && (
            <button onClick={()=>{setEditingTar(null);setShowTarForm(true);}} style={{ position:"fixed", bottom:26, right:"calc(50% - 290px)", background:"#4A6FA5", color:"white", border:"none", borderRadius:20, padding:"12px 20px", fontSize:13, fontWeight:800, fontFamily:"Nunito, sans-serif", cursor:"pointer", boxShadow:"0 5px 18px rgba(74,111,165,0.4)", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{fontSize:17}}>+</span> Nueva tarea
            </button>
          )}
        </div>
      )}

      {/* ══════════ NOTAS ══════════ */}
      {activeTab==="notas" && (
        <div style={{ maxWidth:600, margin:"0 auto", padding:"18px 14px 90px" }}>
          <div style={{ marginBottom:14 }}>
            <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:"#2C3E50" }}>Mis notas 🗒️</h1>
            <p style={{ margin:"3px 0 0", fontSize:11, color:"#9a8f84" }}>Recordatorios con fecha, sin depender de una materia</p>
          </div>

          <div style={{ display:"flex", gap:5, marginBottom:14 }}>
            {["pendientes","completadas","todas"].map(f => (
              <button key={f} onClick={()=>setNoteFilter(f)} style={{ padding:"6px 12px", borderRadius:20, border:"none", background:noteFilter===f?"#E8A65C":"white", color:noteFilter===f?"white":"#9a8f84", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Nunito, sans-serif", boxShadow:"0 2px 5px rgba(0,0,0,0.06)", textTransform:"capitalize" }}>{f}</button>
            ))}
          </div>

          {showNoteForm && (
            <div style={{ marginBottom:14 }}>
              <NotaForm initial={editingNote} onSave={saveNote} onCancel={()=>{setShowNoteForm(false);setEditingNote(null);}}/>
            </div>
          )}

          {(() => {
            let f = [...notes];
            if (noteFilter==="pendientes")  f = f.filter(n=>!n.completada);
            if (noteFilter==="completadas") f = f.filter(n=>n.completada);
            f = f.sort((a,b) => new Date(a.fecha)-new Date(b.fecha));
            if (f.length===0 && !showNoteForm) return (
              <div style={{ textAlign:"center", padding:"44px 20px" }}>
                <SEAL_SVG size={80} color="#E8A65C"/>
                <p style={{ color:"#9a8f84", marginTop:12, fontSize:13, lineHeight:1.6 }}>
                  {noteFilter==="completadas" ? "Aún no completas notas 🌱" : "¡Sin notas pendientes! 🌟"}
                </p>
              </div>
            );
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {f.map(n => <NotaCard key={n.id} nota={n} onToggle={toggleNote} onDelete={delNote} onEdit={editNote}/>)}
              </div>
            );
          })()}

          {!showNoteForm && (
            <button onClick={()=>{setEditingNote(null);setShowNoteForm(true);}} style={{ position:"fixed", bottom:26, right:"calc(50% - 290px)", background:"#E8A65C", color:"white", border:"none", borderRadius:20, padding:"12px 20px", fontSize:13, fontWeight:800, fontFamily:"Nunito, sans-serif", cursor:"pointer", boxShadow:"0 5px 18px rgba(232,166,92,0.4)", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{fontSize:17}}>+</span> Nueva nota
            </button>
          )}
        </div>
      )}

      {/* ══════════ MATERIAS ══════════ */}
      {activeTab==="materias" && (
        <div style={{ maxWidth:600, margin:"0 auto", padding:"18px 14px 90px" }}>
          <div style={{ marginBottom:14 }}>
            <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:"#2C3E50" }}>Mis materias 📚</h1>
            <p style={{ margin:"3px 0 0", fontSize:11, color:"#9a8f84" }}>{materias.length} registrada{materias.length!==1?"s":""}</p>
          </div>

          <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto", paddingBottom:3 }}>
            {DAYS_SHORT.map(d => {
              const hoy = materias.filter(m=>m.dias[d]!==undefined);
              return (
                <div key={d} style={{ flexShrink:0, background:"white", borderRadius:11, padding:"6px 8px", textAlign:"center", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", minWidth:40 }}>
                  <div style={{ fontSize:8, color:"#9a8f84", fontWeight:700 }}>{d}</div>
                  <div style={{ fontSize:16, fontWeight:900, color:hoy.length>0?"#4A6FA5":"#ddd" }}>{hoy.length}</div>
                  <div style={{ display:"flex", gap:2, justifyContent:"center", marginTop:1 }}>
                    {hoy.slice(0,3).map(m=><div key={m.id} style={{ width:4, height:4, borderRadius:"50%", background:m.color }}/>)}
                  </div>
                </div>
              );
            })}
          </div>

          {showMatForm && (
            <div style={{ marginBottom:14 }}>
              <MateriaForm initial={editingMat} usedColors={usedColors.filter(c=>c!==editingMat?.color)} onSave={saveMat} onCancel={()=>{setShowMatForm(false);setEditingMat(null);}}/>
            </div>
          )}

          {materias.length===0 && !showMatForm ? (
            <div style={{ textAlign:"center", padding:"44px 20px" }}>
              <SEAL_SVG size={80} color="#7EC8D4"/>
              <p style={{ color:"#9a8f84", marginTop:12, fontSize:13, lineHeight:1.6 }}>¡Aquí vivirán tus materias!<br/><span style={{fontWeight:700}}>Agrega la primera para empezar. 🌟</span></p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {materias.map(m => <MateriaCard key={m.id} materia={m} tareas={tasks} onDelete={delMat} onEdit={editMat}/>)}
            </div>
          )}

          {materias.length>0 && (
            <div style={{ marginTop:16, background:"white", borderRadius:14, padding:"12px 14px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#9a8f84", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Referencia de colores</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {materias.map(m => (
                  <div key={m.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <div style={{ width:9, height:9, borderRadius:"50%", background:m.color }}/>
                    <span style={{ fontSize:10, color:"#5a5047", fontWeight:600 }}>{m.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showMatForm && (
            <button onClick={()=>{setEditingMat(null);setShowMatForm(true);}} style={{ position:"fixed", bottom:26, right:"calc(50% - 290px)", background:"#4A6FA5", color:"white", border:"none", borderRadius:20, padding:"12px 20px", fontSize:13, fontWeight:800, fontFamily:"Nunito, sans-serif", cursor:"pointer", boxShadow:"0 5px 18px rgba(74,111,165,0.4)", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{fontSize:17}}>+</span> Nueva materia
            </button>
          )}
        </div>
      )}

      {/* ── Day detail modal ── */}
      {selDate && <DayDetail date={selDate} materias={materias} tasks={tasks} notes={notes} onClose={()=>setSelDate(null)}/>}
    </div>
  );
}
