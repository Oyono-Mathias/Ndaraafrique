'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: React.ElementType;
  isLoading: boolean;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  sparklineColor?: string;
  sparklinePath?: string;
  accentColor?: string;
}

/**
 * @fileOverview Carte de statistique "Glassmorphism" haute-fidélité (Design Qwen).
 * Supporte désormais une couleur d'accentuation personnalisée via accentColor.
 */
export const StatCard: React.FC<StatCardProps> = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    isLoading, 
    trend, 
    trendType = 'neutral',
    sparklineColor = "#10B981",
    sparklinePath = "M0,40 C20,35 40,45 60,20 C80,5 100,25 120,10 C140,0 160,15 180,5",
    accentColor
}) => {
  return (
    <Card className={cn(
        "bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl rounded-4xl relative overflow-hidden group transition-all active:scale-95",
        accentColor
    )}>
      {/* Decorative Glow */}
      <div className={cn(
        "absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl opacity-10 transition-opacity duration-500 group-hover:opacity-20",
        trendType === 'up' ? "bg-emerald-500" : trendType === 'down' ? "bg-red-500" : "bg-blue-500"
      )} />
      
      <CardContent className="p-6 flex flex-col relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
            trendType === 'up' ? "bg-emerald-500/20 text-emerald-400" : trendType === 'down' ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          
          {!isLoading && trend && (
              <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-1 rounded-full border flex items-center gap-1",
                  trendType === 'up' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                  trendType === 'down' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                  "bg-slate-800 text-slate-400 border-white/5"
              )}>
                  {trendType === 'up' && <TrendingUp size={10} />}
                  {trendType === 'down' && <TrendingDown size={10} />}
                  {trend}
              </span>
          )}
        </div>
        
        <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">{title}</p>
            {isLoading ? (
                <Skeleton className="h-8 w-24 bg-slate-800" />
            ) : (
                <h3 className="text-2xl font-black text-white leading-none">
                    {value} {unit && <span className="text-xs font-bold text-slate-600 uppercase ml-1">{unit}</span>}
                </h3>
            )}
        </div>

        {/* Sparkline Visual */}
        <div className="h-12 w-full mt-4 relative">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <path 
                    d={`${sparklinePath} L180,50 L0,50 Z`} 
                    fill={`${sparklineColor}15`} 
                />
                <path 
                    d={sparklinePath} 
                    fill="none" 
                    stroke={sparklineColor} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                />
            </svg>
        </div>
      </CardContent>
    </Card>
  );
};