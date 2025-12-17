self.addEventListener("install", (event) => {
  console.log("[sw] install event");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[sw] activate event");
  self.clients.claim();
});

// Placeholder push handler. Real notification logic will be added later.
self.addEventListener("push", (event) => {
  console.log("[sw] push event received", event.data ? event.data.text() : null);
  // TODO: In the future, show notifications here using event.waitUntil(...) and self.registration.showNotification(...)
});
