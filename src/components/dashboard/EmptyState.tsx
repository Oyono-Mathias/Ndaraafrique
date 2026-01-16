'use client';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

export const EmptyState = ({ icon: Icon, title, description }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center text-center p-8 h-full text-slate-500">
    <Icon className="w-12 h-12 mb-4" />
    <h3 className="font-semibold text-lg text-slate-300">{title}</h3>
    <p className="text-sm">{description}</p>
  </div>
);
