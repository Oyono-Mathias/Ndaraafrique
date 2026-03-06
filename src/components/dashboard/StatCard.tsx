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
  <Card className={cn(
    "bg-card border-border shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-primary/10 rounded-2xl overflow-hidden",
    accentColor
  )}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-primary opacity-50" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/4 bg-muted" />
      ) : (
        <>
          <div className="text-2xl font-black text-foreground">{value}</div>
          {description && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">{description}</p>}
        </>
      )}
    </CardContent>
  </Card>
);
