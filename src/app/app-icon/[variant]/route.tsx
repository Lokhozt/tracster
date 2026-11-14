import { ImageResponse } from "next/og";
import { getAppName } from "@/lib/app-name";

/**
 * Install icons for the web app manifest and iOS home screen, generated from the app name so
 * no binary assets are needed. `maskable` keeps the mark inside Android's 80% safe zone.
 */
const ICON_VARIANTS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
  apple: { size: 180, maskable: true },
} as const;

type IconVariant = keyof typeof ICON_VARIANTS;

function isIconVariant(value: string): value is IconVariant {
  return value in ICON_VARIANTS;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ variant: string }> },
): Promise<Response> {
  const { variant } = await params;
  if (!isIconVariant(variant)) {
    return new Response("Not found", { status: 404 });
  }
  const { size, maskable } = ICON_VARIANTS[variant];
  const initial = getAppName().trim().charAt(0).toLocaleUpperCase() || "T";
  // Maskable icons are cropped by the OS, so they fill the square; others get rounded corners.
  const markScale = maskable ? 0.5 : 0.62;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1917",
          borderRadius: maskable ? 0 : size * 0.22,
          color: "#ffffff",
          fontSize: size * markScale,
          fontWeight: 700,
          position: "relative",
        }}
      >
        {initial}
        <div
          style={{
            position: "absolute",
            width: size * (maskable ? 0.09 : 0.11),
            height: size * (maskable ? 0.09 : 0.11),
            borderRadius: "50%",
            background: "#f59e0b",
            right: size * (maskable ? 0.27 : 0.17),
            bottom: size * (maskable ? 0.27 : 0.17),
          }}
        />
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
