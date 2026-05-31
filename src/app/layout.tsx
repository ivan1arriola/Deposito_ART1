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
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Sistema de Depósito General - Artilleria 1",
  description: "Sistema de gestion de deposito general del Grupo de Artilleria 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
  manifest: "/manifest.webmanifest",
  applicationName: "Sistema de Depósito General - Artilleria 1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sistema de Depósito General - Artilleria 1",
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
    title: "Sistema de Depósito General - Artilleria 1",
    description: "Sistema de gestion de deposito general del Grupo de Artilleria 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
    type: "website",
    locale: "es_UY",
    siteName: "Sistema de Depósito General - Artilleria 1",
  },
  twitter: {
    card: "summary",
    title: "Sistema de Depósito General - Artilleria 1",
    description: "Sistema de gestion de deposito general del Grupo de Artilleria 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#003885",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
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
