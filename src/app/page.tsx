import { redirect } from 'next/navigation';
import { locales } from '@/navigation';

// This is the new root page, which will just redirect to the
// default locale. We can get the default locale from our
// navigation configuration.
export default function RootPage() {
  const defaultLocale = locales[0]; // 'fr'
  redirect(`/${defaultLocale}`);
}
