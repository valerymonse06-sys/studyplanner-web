if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(registration => {
        console.log(
          "StudyPlanner: Service Worker registrado.",
          registration.scope
        );
      })
      .catch(error => {
        console.error(
          "StudyPlanner: Error registrando Service Worker:",
          error
        );
      });
  });
}
