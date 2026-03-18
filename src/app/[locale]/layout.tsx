
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/app-shell";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, unstable_setRequestLocale, getTranslations } from 'next-intl/server';
import { DynamicDesignManager } from "@/components/DynamicDesignManager";
import { ToastProvider } from "@/components/ToastProvider";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Metadata } from 'next';
 
/**
 * @fileOverview Layout racine pour les routes internationalisées.
 * ✅ i18n : Métadonnées dynamiques en FR, EN et SG.
 */

export function generateStaticParams() {
  return [{locale: 'en'}, {locale: 'fr'}, {locale: 'sg'}];
}

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'Common' });
  const tHero = await getTranslations({ locale, namespace: 'Landing.hero' });

  return {
    title: {
      default: `${t('site_name')} | ${tHero('title').replace('<br />', ' ')}`,
      template: `%s | ${t('site_name')}`
    },
    description: tHero('subtitle'),
    alternates: {
      languages: {
        'fr': '/fr',
        'en': '/en',
        'sg': '/sg',
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
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
