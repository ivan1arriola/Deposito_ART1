import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AppToaster } from "@/components/AppToaster";
import { MaterialThemeProvider } from "@/components/MaterialThemeProvider";
import { PwaBootstrap } from "@/components/PwaBootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deposito ART1",
  description: "Sistema de gestion de deposito general del Grupo de Artilleria 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
  manifest: "/manifest.webmanifest",
  applicationName: "Deposito ART1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Deposito ART1",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/pwa-icons/android/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icons/android/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/pwa-icons/android/icon-512-maskable.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-icons/ios/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/pwa-icons/android/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "Deposito ART1",
    description: "Sistema de gestion de deposito general del Grupo de Artilleria 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
    type: "website",
    locale: "es_UY",
    siteName: "Deposito ART1",
  },
  twitter: {
    card: "summary",
    title: "Deposito ART1",
    description: "Sistema de gestion de deposito general del Grupo de Artilleria 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
  },
};

export const viewport: Viewport = {
  themeColor: "#66704D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <MaterialThemeProvider>
            <PwaBootstrap />
            {children}
            <AppToaster />
          </MaterialThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
