
'use client';

import i18n from '@/i18n';
import { ReactNode } from 'react';

// This provider is no longer used in the root layout to prevent build errors.
// i18next is initialized directly and react-i18next hooks will pick it up automatically.
// This file can be kept for testing purposes or if a provider is needed in a different context.
export function I18nProvider({ children }: { children: ReactNode }) {
  // In a non-Next.js 13+ app, you would wrap children with I18nextProvider here.
  // For this project structure, we simply return the children.
  return <>{children}</>;
}
