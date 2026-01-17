
import type { Metadata, Viewport } from "next";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/toaster";
import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getMessages} from 'next-intl/server';
import { notFound } from "next/navigation";

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

export function generateStaticParams() {
  return [{locale: 'fr'}, {locale: 'en'}];
}

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  let messages;
  try {
    messages = await getMessages();
  } catch (error) {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <FirebaseClientProvider>
        <RoleProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </RoleProvider>
      </FirebaseClientProvider>
    </NextIntlClientProvider>
  );
}
