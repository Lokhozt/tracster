// TRACker service worker. Its only job: receive what Android's share sheet sends to the app
// ("Share → TRACker", see share_target in the manifest) and keep it on the phone until the
// /share page uploads it. Nothing else is cached or intercepted.

const SHARE_CACHE = "tracster-share-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(receiveShare(event.request));
  }
});

async function receiveShare(request) {
  const form = await request.formData();
  const cache = await caches.open(SHARE_CACHE);
  // One share at a time: a new one replaces what was waiting.
  for (const key of await cache.keys()) {
    await cache.delete(key);
  }
  const file = form.getAll("media").find((entry) => entry instanceof File && entry.size > 0);
  if (file) {
    await cache.put(
      "/shared/file",
      new Response(file, {
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name || "video"),
        },
      }),
    );
  }
  const details = {
    title: String(form.get("title") || ""),
    text: String(form.get("text") || ""),
    url: String(form.get("url") || ""),
    hasFile: Boolean(file),
    receivedAt: Date.now(),
  };
  await cache.put("/shared/details", new Response(JSON.stringify(details)));
  return Response.redirect("/share", 303);
}
