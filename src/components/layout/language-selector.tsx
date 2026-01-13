
"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import Image from 'next/image';
import { useRole } from '@/context/RoleContext';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface LanguageOption {
    code: string;
    name: string;
    flag: string;
}

const languages: LanguageOption[] = [
    { code: 'fr', name: 'Français', flag: '/flags/fr.svg' },
    { code: 'en', name: 'English', flag: '/flags/gb.svg' },
    { code: 'sg', name: 'Sango', flag: '/flags/cf.svg' },
];

export function LanguageSelector() {
    const { i18n } = useTranslation();
    const { user } = useRole();
    const db = getFirestore();
    const [isOpen, setIsOpen] = useState(false);

    const changeLanguage = async (lng: string) => {
        await i18n.changeLanguage(lng);
        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                await updateDoc(userDocRef, { preferredLanguage: lng });
            } catch (error) {
                console.error("Failed to save language preference:", error);
            }
        }
        setIsOpen(false); // Close popover on selection
    };

    const selectedLanguage = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-300 hover:bg-slate-700/50 hover:text-white" aria-label="Changer la langue">
                     <Image src={selectedLanguage.flag} alt={selectedLanguage.name} width={24} height={18} className="rounded-sm"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1 dark:bg-slate-800 dark:border-slate-700">
                <div className="space-y-1">
                    {languages.map((lang) => (
                        <Button
                            key={lang.code}
                            variant="ghost"
                            className={cn(
                                "w-full justify-start gap-3 pl-3 h-9",
                                i18n.language.startsWith(lang.code) ? 'bg-primary/10 text-primary' : 'dark:text-slate-200'
                            )}
                            onClick={() => changeLanguage(lang.code)}
                        >
                            <Image src={lang.flag} alt={lang.name} width={20} height={15} className="rounded-sm"/>
                            <span>{lang.name}</span>
                            {i18n.language.startsWith(lang.code) && <Check className="h-4 w-4 ml-auto text-primary"/>}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
