
"use client";

import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import Image from 'next/image';
import { useRole } from '@/context/RoleContext';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';

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

    const changeLanguage = async (lng: string) => {
        // Change language instantly via i18next
        await i18n.changeLanguage(lng);
        
        // If user is logged in, save preference to their profile
        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                await updateDoc(userDocRef, {
                    preferredLanguage: lng
                });
            } catch (error) {
                console.error("Failed to save language preference:", error);
            }
        }
    };

    const selectedLanguage = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2 text-slate-300 hover:bg-slate-700/50 hover:text-white">
                    <Image src={selectedLanguage.flag} alt={selectedLanguage.name} width={20} height={15} className="rounded-sm"/>
                    <span className="hidden md:inline text-sm">{selectedLanguage.code.toUpperCase()}</span>
                    <Globe className="h-4 w-4 md:hidden" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className="flex items-center gap-2 cursor-pointer dark:focus:bg-slate-700 dark:text-white"
                    >
                        <Image src={lang.flag} alt={lang.name} width={20} height={15} className="rounded-sm"/>
                        <span>{lang.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
