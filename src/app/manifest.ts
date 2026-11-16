import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { getAppName } from "@/lib/app-name";

/** Makes the app installable ("Install app" / "Add to Home screen") with its own icon. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("Metadata");
  const appName = getAppName();
  return {
    name: appName,
    short_name: appName,
    description: t("description"),
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Installed app: Android paints the system navigation-bar area (and the splash screen)
    // with these fixed colours, whatever the page's light/dark theme. The app's aubergine ink
    // blends with dark mode and reads as a base strip under the tab bar in light mode; the top
    // status bar still follows the page's theme-color meta.
    // Android's share sheet: "Share → TRACker" sends a video, photo, audio or link to /share
    // (the service worker in public/sw.js keeps the file on the phone, see /share).
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [{ name: "media", accept: ["video/*", "image/*", "audio/*"] }],
      },
    },
    background_color: "#231b33",
    theme_color: "#231b33",
    icons: [
      { src: "/api/static/180.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/api/static/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/static/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/api/static/512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
