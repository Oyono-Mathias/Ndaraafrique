
'use client';

import type { FormaAfriqueUser } from '@/context/RoleContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare } from 'lucide-react';

interface MemberCardProps {
  member: FormaAfriqueUser;
  onContact: (memberId: string) => void;
  isProcessing: boolean;
}

export function MemberCard({ member, onContact, isProcessing }: MemberCardProps) {
  const handleContactClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onContact(member.uid);
  };

  return (
    <div
      className="text-center p-4 glassmorphism-card rounded-2xl transition-all duration-300 hover:shadow-primary/10 hover:scale-[1.03] flex flex-col justify-between"
      aria-labelledby={`member-name-${member.uid}`}
    >
      <div>
        <Avatar className="mx-auto h-20 w-20 mb-3 border-2 border-primary/20">
          <AvatarImage src={member.profilePictureURL} alt={`Avatar de ${member.username}`} />
          <AvatarFallback className="text-2xl bg-slate-700 text-primary font-semibold">
            {member.username?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <h3 id={`member-name-${member.uid}`} className="font-bold text-sm text-slate-100 truncate">
          @{member.username}
        </h3>
        <p className="text-xs text-slate-400 mb-3 truncate" aria-label={`Domaine d'intérêt: ${member.careerGoals?.interestDomain}`}>
          {member.careerGoals?.interestDomain || 'Apprenant'}
        </p>
      </div>
      <Button
        size="sm"
        onClick={handleContactClick}
        disabled={isProcessing}
        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 w-full mt-2"
        aria-label={`Contacter ${member.username}`}
      >
        {isProcessing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="mr-1.5 h-3.5 w-3.5" />}
        Contacter
      </Button>
    </div>
  );
}
