'use client';

import { NdaraUser } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
    Mail, 
    Phone, 
    Calendar, 
    Globe, 
    Briefcase, 
    User, 
    MapPin, 
    Wallet, 
    Landmark, 
    Clock, 
    ShieldCheck,
    Quote
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UserDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: NdaraUser | null;
}

const DetailItem = ({ icon: Icon, label, value, color = "text-primary" }: { icon: any, label: string, value?: string, color?: string }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-xl border border-white/5">
            <div className="p-2 bg-slate-900 rounded-lg">
                <Icon className={cn("h-4 w-4", color)} />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">{label}</p>
                <p className="text-sm font-bold text-white leading-tight">{value}</p>
            </div>
        </div>
    );
};

const BalanceCard = ({ label, value, icon: Icon, color, subLabel }: { label: string, value: number, icon: any, color: string, subLabel?: string }) => (
    <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-inner">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg", color.replace('text', 'bg').concat('/10'), color)}>
            <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-lg font-black text-white leading-none">
                {value.toLocaleString('fr-FR')} <span className="text-[10px] opacity-50">XOF</span>
            </p>
            {subLabel && <p className="text-[8px] text-slate-600 font-bold uppercase mt-1 tracking-tighter">{subLabel}</p>}
        </div>
    </div>
);

export function UserDetailsModal({ isOpen, onOpenChange, user }: UserDetailsModalProps) {
  if (!user) return null;

  const createdAt = (user.createdAt as any)?.toDate?.() || null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 p-0 overflow-hidden rounded-[2.5rem]">
        <div className="grain-overlay opacity-[0.03]" />
        
        <DialogHeader className="p-8 pb-6 bg-slate-800/30 border-b border-white/5 relative z-10">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-slate-900 shadow-2xl">
                  <AvatarImage src={user.profilePictureURL} className="object-cover" />
                  <AvatarFallback className="text-3xl bg-slate-800 text-slate-500 font-bold uppercase">{user.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                {user.isOnline && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full border-4 border-slate-900 animate-pulse shadow-lg" />
                )}
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">{user.fullName}</DialogTitle>
              <DialogDescription className="text-primary font-bold text-xs uppercase tracking-[0.2em] mt-1">@{user.username}</DialogDescription>
            </div>
            <div className="flex gap-2">
                <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="font-black text-[9px] uppercase border-none px-3">{user.role}</Badge>
                <Badge className={cn(
                    "font-black text-[9px] uppercase border-none px-3",
                    user.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>{user.status}</Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] p-8 relative z-10">
          <div className="space-y-8">
            
            {/* --- FINANCES SECTION --- */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Landmark className="h-4 w-4 text-primary" />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">État des Soldes</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    <BalanceCard 
                        label="Solde Principal" 
                        value={user.balance} 
                        icon={Wallet} 
                        color="text-primary" 
                        subLabel="Fonds disponibles pour achats"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <BalanceCard 
                            label="Commissions" 
                            value={user.affiliateBalance || 0} 
                            icon={BadgeEuroIcon} 
                            color="text-emerald-400" 
                            subLabel="Prêt au retrait"
                        />
                        <BalanceCard 
                            label="Séquestre" 
                            value={user.pendingAffiliateBalance || 0} 
                            icon={Clock} 
                            color="text-amber-500" 
                            subLabel="Gelé (Audit 14j)"
                        />
                    </div>
                </div>
            </div>

            {/* --- CONTACT & IDENTITY --- */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <User className="h-4 w-4 text-primary" />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Identité & Contact</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailItem icon={Mail} label="Email" value={user.email} />
                    <DetailItem icon={Phone} label="WhatsApp" value={user.phoneNumber || '---'} color="text-emerald-500" />
                    <DetailItem icon={MapPin} label="Pays" value={user.countryName} color="text-orange-400" />
                    <DetailItem icon={Briefcase} label="Expertise" value={user.careerGoals?.interestDomain} color="text-blue-400" />
                </div>
            </div>
            
            {user.bio && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Quote className="h-4 w-4 text-primary" />
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Biographie</h3>
                    </div>
                    <div className="p-6 bg-slate-950/50 rounded-3xl border border-white/5 shadow-inner">
                        <p className="text-sm text-slate-400 italic leading-relaxed font-serif">"{user.bio}"</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-4 opacity-30">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ndara ID: {user.uid.substring(0,16)}</span>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 pt-4 bg-slate-950/50 border-t border-white/5">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full rounded-2xl border-white/10 h-14 font-black uppercase text-xs tracking-widest text-slate-400 hover:text-white transition-all active:scale-95 shadow-xl">
            Fermer le dossier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BadgeEuroIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
        </svg>
    );
}
