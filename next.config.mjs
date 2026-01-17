
import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  // You can add other Next.js configuration options here if needed.
};
 
export default withNextIntl(nextConfig);
