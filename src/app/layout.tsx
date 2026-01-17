
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

// This metadata is a fallback. The specific metadata is in [locale]/layout.tsx
export const metadata: Metadata = {
  title: "Ndara Afrique",
  description: "L'excellence par le savoir.",
};

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark" style={{ colorScheme: 'dark' }}>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
