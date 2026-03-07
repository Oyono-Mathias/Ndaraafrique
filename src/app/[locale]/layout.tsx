import { FirebaseClientProvider } from "@/firebase/client-provider";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/app-shell";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { DynamicDesignManager } from "@/components/DynamicDesignManager";
 
/**
 * @fileOverview Layout racine pour les routes internationalisées.
 * Optimisé pour le rendu statique (SSG) sur Vercel.
 */

export function generateStaticParams() {
  return [{locale: 'en'}, {locale: 'fr'}];
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
          <AppShell>
            {children}
          </AppShell>
        </NextIntlClientProvider>
      </RoleProvider>
    </FirebaseClientProvider>
  );
}
