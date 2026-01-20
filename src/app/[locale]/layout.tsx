import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "../globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { notFound } from 'next/navigation';

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
  themeColor: '#10b981',
};

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const locales = ['en', 'fr'];

export default function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale)) notFound();
 
  const messages = useMessages();

  return (
    <html lang={locale} className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
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
