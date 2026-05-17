'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: React.ElementType;
  isLoading: boolean;
  accentColor?: string;
}

/**
 * @fileOverview Carte de statistique Glassmorphism (Design Qwen High-Fidelity).
 */
export const StatCard: React.FC<StatCardProps> = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    isLoading, 
    accentColor = "bg-primary/20 text-primary"
}) => {
  return (
    <Card className="glass rounded-[2rem] border-white/5 transition-all active:scale-95 shadow-xl overflow-hidden group">
      <CardContent className="p-5 flex flex-col relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            accentColor
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{title}</span>
        </div>
        
        {isLoading ? (
            <Skeleton className="h-8 w-16 bg-slate-800" />
        ) : (
            <h3 className="text-3xl font-black text-white tracking-tighter leading-none">
                {value}
                {unit && <span className="text-xs font-bold text-slate-600 uppercase ml-1">{unit}</span>}
            </h3>
        )}
      </CardContent>
    </Card>
  );
};