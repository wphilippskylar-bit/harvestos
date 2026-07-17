import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harvest OS — Aiyahuta Craft Farm",
  description: "Farm operations, sales channels, and goal tracking — built for microgreens, ready to scale.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
