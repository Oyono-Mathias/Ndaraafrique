
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Footer() {
  const pathname = usePathname();
  const isChatPage = pathname.startsWith('/messages/');
  
  if (isChatPage) {
    return null;
  }

  return (
    <footer className="mt-auto border-t bg-card text-card-foreground">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
        <div className="text-center sm:text-left">
           <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FormaAfrique. Tous droits réservés.
          </p>
           <p className="text-xs text-muted-foreground mt-1">
            Apprendre un métier en Afrique n'a jamais été aussi simple. Formation en ligne au Cameroun et ailleurs, payable par Orange Money et MTN MoMo.
          </p>
        </div>
        <nav className="flex gap-4 sm:gap-6">
          <Link href="/mentions-legales" className="text-sm text-muted-foreground hover:text-primary">
            Mentions Légales
          </Link>
          <Link href="/cgu" className="text-sm text-muted-foreground hover:text-primary">
            CGU
          </Link>
        </nav>
      </div>
    </footer>
  );
}
