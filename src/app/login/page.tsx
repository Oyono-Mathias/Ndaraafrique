
import { Suspense } from 'react';
import LoginClient from './login-client';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Connexion | Ndara Afrique',
  description: 'Connectez-vous à votre compte ou créez-en un nouveau pour commencer à apprendre.',
};


export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginClient />
    </Suspense>
  );
}
