import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestión de Depósito General - Artillería 1",
  description: "Sistema de gestión de depósito general del Grupo de Artillería 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
  openGraph: {
    title: "Gestión de Depósito General - Artillería 1",
    description: "Sistema de gestión de depósito general del Grupo de Artillería 105mm No. 1 \"Brig. Gral. Manuel Oribe\"",
    type: "website",
    locale: "es_UY",
    siteName: "Gestión de Depósito General - Artillería 1",
  },
  twitter: {
    card: "summary",
    title: "Gestión de Depósito General - Artillería 1",
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
