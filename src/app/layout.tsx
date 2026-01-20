// This is the root layout that applies to all routes.
// We're keeping it simple to allow `next-intl` to manage the `<html>` and `<body>`
// tags within the localized layout at `app/[locale]/layout.tsx`.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
