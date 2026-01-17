import {createLocalizedPathnamesNavigation} from 'next-intl/navigation';

export const locales = ['fr', 'en'] as const;
export const localePrefix = 'always';

// The `pathnames` object holds pairs of internal
// and external paths, separated by locale.
export const pathnames = {
  // If all locales use the same path, use the
  // default:
  '/': '/',
  '/dashboard': '/dashboard',

} satisfies Record<string, any>;


export const {Link, redirect, usePathname, useRouter, getPathname} =
  createLocalizedPathnamesNavigation({locales, localePrefix, pathnames});