'use client';

import { NdaraUser } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Calendar, Globe, Briefcase, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: NdaraUser | null;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: any, label: string, value?: string }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="p-2 bg-slate-900 rounded-lg">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">{label}</p>
                <p className="text-sm font-bold text-white leading-tight">{value}</p>
            </div>
        </div>
    );
};

export function UserDetailsModal({ isOpen, onOpenChange, user }: UserDetailsModalProps) {
  if (!user) return null;

  const createdAt = (user.createdAt as any)?.toDate?.() || null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-slate-800/30 border-b border-white/5">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="h-24 w-24 border-4 border-slate-900 shadow-2xl">
              <AvatarImage src={user.profilePictureURL} className="object-cover" />
              <AvatarFallback className="text-3xl bg-slate-800 text-slate-500 font-bold">{user.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">{user.fullName}</DialogTitle>
              <DialogDescription className="text-primary font-bold text-xs uppercase tracking-[0.2em] mt-1">@{user.username}</DialogDescription>
            </div>
            <div className="flex gap-2">
                <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="font-black text-[9px] uppercase border-none">{user.role}</Badge>
                <Badge variant={user.status === 'active' ? 'success' : 'warning'} className="font-black text-[9px] uppercase border-none">{user.status}</Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] p-6">
          <div className="grid gap-3">
            <DetailItem icon={Mail} label="Email" value={user.email} />
            <DetailItem icon={Phone} label="Téléphone" value={user.phoneNumber || 'Non renseigné'} />
            <DetailItem icon={Briefcase} label="Domaine" value={user.careerGoals?.interestDomain || 'Non défini'} />
            <DetailItem icon={MapPin} label="Pays" value={user.countryName || 'Non spécifié'} />
            <DetailItem icon={Globe} label="Langue" value={user.preferredLanguage === 'fr' ? 'Français' : 'English'} />
            <DetailItem icon={Calendar} label="Membre depuis" value={createdAt ? format(createdAt, 'dd MMMM yyyy', { locale: fr }) : 'Inconnu'} />
            
            {user.bio && (
                <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest mb-2">Biographie</p>
                    <p className="text-xs text-slate-400 italic leading-relaxed">"{user.bio}"</p>
                </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full rounded-xl border-slate-800 h-12 font-bold uppercase text-[10px] tracking-widest">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}