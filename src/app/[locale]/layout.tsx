import type { Metadata, Viewport } from "next";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/toaster";
import "../globals.css";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';

export const metadata: Metadata = {
  title: "Ndara Afrique - L'excellence par le savoir",
  description: "Apprenez des compétences d'avenir avec des cours conçus par des experts locaux. Payez facilement par Mobile Money.",
  keywords: ['formation en ligne', 'e-learning afrique', 'compétences numériques', 'cours en français', 'udemy afrique'],
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#007bff',
};

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export function generateStaticParams() {
  return [{locale: 'fr'}, {locale: 'en'}, {locale: 'sg'}, {locale: 'ln'}, {locale: 'ar'}];
}

export default async function RootLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" style={{ colorScheme: 'dark' }}>
       <body className={cn("min-h-screen bg-background font-sans antialiased page-transition", fontSans.variable)}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <FirebaseClientProvider>
            <RoleProvider>
              <AppShell>{children}</AppShell>
              <Toaster />
            </RoleProvider>
          </FirebaseClientProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
