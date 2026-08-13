self.addEventListener("install", (event) => {
  console.log("Service Worker installing.");
  // cache files here if needed
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated.");
});

self.addEventListener("fetch", (event) => {
  // basic fetch handling
  event.respondWith(fetch(event.request));
});
