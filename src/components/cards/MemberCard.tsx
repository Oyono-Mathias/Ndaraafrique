'use client';

import type { NdaraUser } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare } from 'lucide-react';

interface MemberCardProps {
  member: NdaraUser;
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
      className="text-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700/80 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1.5 flex flex-col justify-between"
      aria-labelledby={`member-name-${member.uid}`}
    >
      <div>
        <Avatar className="mx-auto h-24 w-24 mb-4 border-4 border-slate-700">
          <AvatarImage src={member.profilePictureURL} alt={`Avatar de ${member.fullName}`} />
          <AvatarFallback className="text-3xl bg-slate-700 text-primary font-semibold">
            {member.fullName?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <h3 id={`member-name-${member.uid}`} className="font-bold text-lg text-slate-100 truncate">
          {member.fullName}
        </h3>
        <p className="text-sm text-primary mb-4 truncate" aria-label={`Domaine d'intérêt: ${member.careerGoals?.interestDomain}`}>
          {member.careerGoals?.interestDomain || 'Apprenant'}
        </p>
      </div>
      <Button
        onClick={handleContactClick}
        disabled={isProcessing}
        className="w-full"
        aria-label={`Contacter ${member.fullName}`}
      >
        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
        Contacter
      </Button>
    </div>
  );
}
