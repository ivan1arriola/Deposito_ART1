import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AppToaster } from "@/components/AppToaster";
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
  description: "Sistema de gestión de depósito general del Grupo de Artillería 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
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
      { url: "/assets/logo-deposito.png", sizes: "512x512", type: "image/png" },
      { url: "/assets/logo-deposito.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/assets/logo-deposito.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Deposito ART1",
    description: "Sistema de gestión de depósito general del Grupo de Artillería 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
    type: "website",
    locale: "es_UY",
    siteName: "Deposito ART1",
  },
  twitter: {
    card: "summary",
    title: "Deposito ART1",
    description: "Sistema de gestión de depósito general del Grupo de Artillería 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <PwaBootstrap />
          {children}
          <AppToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
