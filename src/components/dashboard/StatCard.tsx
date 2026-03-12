'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  isLoading: boolean;
  accentColor?: string;
  description?: string;
}

/**
 * @fileOverview Carte de statistique style "Fintech Vintage" (Design Qwen).
 */
export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, isLoading, accentColor }) => {
  const isEmerald = title.toLowerCase().includes('certificat');
  
  return (
    <Card className={cn(
      "bg-slate-900 border-white/5 shadow-2xl rounded-[2rem] flex flex-col justify-between h-32 relative overflow-hidden group transition-all active:scale-95",
      accentColor
    )}>
      {/* Decorative Glow */}
      <div className={cn(
        "absolute -right-4 -top-4 w-20 h-20 rounded-full blur-xl transition-opacity duration-500",
        isEmerald ? "bg-emerald-500/10 group-hover:bg-emerald-500/20" : "bg-blue-500/10 group-hover:bg-blue-500/20"
      )} />
      
      <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
        <div>
          <div className={cn(
            "p-2 rounded-lg w-fit mb-2",
            isEmerald ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-400"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{title}</p>
        </div>
        
        {isLoading ? (
          <Skeleton className="h-8 w-12 bg-slate-800" />
        ) : (
          <p className="text-3xl font-black text-white leading-none">{value.padStart(2, '0')}</p>
        )}
      </CardContent>
    </Card>
  );
};
