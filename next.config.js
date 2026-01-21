const withNextIntl = require('next-intl/plugin')(
  './src/i18n.ts'
);
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration options for Next.js can be placed here.
};
 
module.exports = withNextIntl(nextConfig);
