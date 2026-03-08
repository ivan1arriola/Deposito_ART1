import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AppToaster } from "@/components/AppToaster";

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
          {children}
          <AppToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
