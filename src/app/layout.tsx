import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { getAppName } from "@/lib/app-name";
import { AppFrame } from "@/components/AppShell";
import { getAppLogoSrc } from "@/lib/s3";
import { SIDEBAR_COOKIE, parseSidebarCollapsed } from "@/lib/sidebar";
import {
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  THEME_COOKIE,
  parseThemePreference,
} from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: getAppName(),
    description: t("description"),
    icons: (() => {
      const logoSrc = getAppLogoSrc();
      return logoSrc
        ? {
            icon: [{ url: logoSrc, type: "image/png" }],
            apple: logoSrc,
          }
        : {
            // Generated install icons (see app/app-icon) when no logo is configured.
            icon: [{ url: "/app-icon/192", type: "image/png", sizes: "192x192" }],
            apple: "/app-icon/apple",
          };
    })(),
  };
}

export async function generateViewport(): Promise<Viewport> {
  const theme = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    // Phone status bar colour: the chosen theme, or both variants when following the device.
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: LIGHT_THEME_COLOR },
            { media: "(prefers-color-scheme: dark)", color: DARK_THEME_COLOR },
          ]
        : theme === "dark"
          ? DARK_THEME_COLOR
          : LIGHT_THEME_COLOR,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages, cookieStore] = await Promise.all([getLocale(), getMessages(), cookies()]);
  const theme = parseThemePreference(cookieStore.get(THEME_COOKIE)?.value);
  const sidebarCollapsed = parseSidebarCollapsed(cookieStore.get(SIDEBAR_COOKIE)?.value);

  return (
    <html
      lang={locale}
      data-theme={theme === "system" ? undefined : theme}
      data-sidebar={sidebarCollapsed ? "collapsed" : undefined}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <AppFrame>{children}</AppFrame>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
