import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campero ERP",
  description: "Contabilidad y remuneraciones internas — Sociedad Agrícola e Inversiones Campero Limitada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
