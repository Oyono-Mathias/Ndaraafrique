import { FirebaseClientProvider } from "@/firebase/client-provider";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/app-shell";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { DynamicDesignManager } from "@/components/DynamicDesignManager";
import { ToastProvider } from "@/components/ToastProvider";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
 
/**
 * @fileOverview Layout racine pour les routes internationalisées.
 * Optimisé pour le rendu statique (SSG) sur Vercel.
 * ✅ RÉSOLU : Support du Français, Anglais et Sango.
 */

export function generateStaticParams() {
  return [{locale: 'en'}, {locale: 'fr'}, {locale: 'sg'}];
}

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // ✅ Correction critique pour permettre le rendu statique (SSG)
  unstable_setRequestLocale(locale);
  
  const messages = await getMessages();
  
  return (
    <FirebaseClientProvider>
      <RoleProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DynamicDesignManager />
          <ToastProvider />
          <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-slate-950">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <AppShell>
              {children}
            </AppShell>
          </Suspense>
        </NextIntlClientProvider>
      </RoleProvider>
    </FirebaseClientProvider>
  );
}
