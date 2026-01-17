
import { redirect } from 'next/navigation';

// This is the new root page, which will just redirect to the
// default locale.
export default function RootPage() {
  redirect('/fr');
}
