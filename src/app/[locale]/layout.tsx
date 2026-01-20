
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/app-shell";
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { notFound } from 'next/navigation';

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

  // The <html> and <body> tags are now in the root layout `app/layout.tsx`.
  // This component just provides the context wrappers.
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <FirebaseClientProvider>
        <RoleProvider>
          <AppShell>{children}</AppShell>
        </RoleProvider>
      </FirebaseClientProvider>
    </NextIntlClientProvider>
  );
}
