
'use client';

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
}

export const SectionHeader = ({ title, className, children }: SectionHeaderProps) => (
  <div className={cn("flex items-center justify-between", className)}>
    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
    {children}
  </div>
);
