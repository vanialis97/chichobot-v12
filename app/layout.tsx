import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ChichoBot · Infraestructura",
  description: "Asistente técnico de manuales de Infraestructura",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
