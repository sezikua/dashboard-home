self.addEventListener("install", (event) => {
  console.log("[sw] install event")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[sw] activate event")
  self.clients.claim()
})
