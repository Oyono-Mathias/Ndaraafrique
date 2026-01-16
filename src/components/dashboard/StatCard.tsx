'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  isLoading: boolean;
  description?: string;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, isLoading, description, accentColor }) => (
  <Card className={cn("dark:bg-slate-800/50 dark:border-slate-700/80 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-primary/10", accentColor)}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
      <Icon className="h-4 w-4 text-slate-400" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/4 bg-slate-700" />
      ) : (
        <>
          <div className="text-3xl font-bold text-white">{value}</div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </>
      )}
    </CardContent>
  </Card>
);
