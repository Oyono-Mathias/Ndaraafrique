
'use client';

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  // This layout wrapper ensures a consistent background and structure for all instructor pages.
  // The individual pages will provide their own headers and content.
  return (
    <div className="min-h-full">
      {children}
    </div>
  );
}
