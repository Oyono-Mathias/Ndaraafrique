import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/providers";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Ndara Afrique - Plateforme d'E-learning Pan-Africaine",
    template: "%s | Ndara Afrique"
  },
  description: "Apprenez les compétences du futur avec des experts africains. Formations en AgriTech, Développement Web, IA et Entrepreneuriat. Accès par Mobile Money.",
  keywords: ["e-learning afrique", "formation en ligne", "apprendre le code", "agritech", "intelligence artificielle", "ndara afrique", "mathias oyono"],
  authors: [{ name: "Mathias Oyono" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://ndara-afrique.app",
    siteName: "Ndara Afrique",
    title: "Ndara Afrique - L'excellence par le savoir",
    description: "Rejoignez la révolution de l'éducation en Afrique. Des cours de haute qualité accessibles partout.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&h=630&auto=format&fit=crop",
        width: 1200,
        height: 630,
        alt: "Étudiants africains collaborant sur Ndara Afrique",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}