const WHATSAPP_HOSTS = new Set([
  "wa.me",
  "api.whatsapp.com",
  "chat.whatsapp.com",
  "web.whatsapp.com",
  "whatsapp.com",
  "www.whatsapp.com",
]);

export function isWhatsAppUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    return false;
  }

  if (!WHATSAPP_HOSTS.has(url.hostname.toLowerCase())) {
    return false;
  }

  const path = url.pathname.replace(/\/+$/, "");
  return path.length > 1 || url.search.length > 1;
}
