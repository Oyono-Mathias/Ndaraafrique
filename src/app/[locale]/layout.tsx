
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/app-shell";
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { getMessages } from 'next-intl/server';
 
export default function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = useMessages();
  
  return (
    <FirebaseClientProvider>
      <RoleProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppShell>
            {children}
          </AppShell>
        </NextIntlClientProvider>
      </RoleProvider>
    </FirebaseClientProvider>
  );
}

    