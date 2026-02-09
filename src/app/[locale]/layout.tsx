import { FirebaseClientProvider } from "@/firebase/client-provider";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/app-shell";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
 
export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = await getMessages();
  
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
