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
    background_color: "#fafaf9",
    theme_color: "#ffffff",
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
