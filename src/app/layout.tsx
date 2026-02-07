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
  creator: "Ndara Afrique",
  publisher: "Ndara Afrique",
  manifest: "/manifest.json",
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
        url: "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?q=80&w=1200&h=630&auto=format&fit=crop",
        width: 1200,
        height: 630,
        alt: "Ndara Afrique - Apprenez. Construisez. Prospérez.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ndara Afrique",
    description: "Le futur de la formation en ligne pour les talents africains.",
    images: ["https://images.unsplash.com/photo-1531545514256-b1400bc00f31?q=80&w=1200&h=630&auto=format&fit=crop"],
    creator: "@ndaraafrique",
  },
  robots: {
    index: true,
    follow: true,
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
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
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
