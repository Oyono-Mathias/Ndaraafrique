
"use client";

import { useState, useTransition } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { useRouter, usePathname } from '@/navigation';

interface LanguageOption {
    code: string;
    name: string;
    flag: string;
}

const languages: LanguageOption[] = [
    { code: 'fr', name: 'Français', flag: '/flags/fr.svg' },
    { code: 'en', name: 'English', flag: '/flags/gb.svg' },
];

export function LanguageSelector() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const changeLanguage = (lng: string) => {
        startTransition(() => {
          router.replace(
            // @ts-expect-error -- TypeScript will validate that only known `params`
            // are used in combination with a given `pathname`. Since the two will
            // always match for the current route, we can skip runtime checks.
            {pathname, params},
            {locale: lng}
          );
        });
        setIsOpen(false);
    };
    
    const locale = params.locale as string || 'fr';
    const selectedLanguage = languages.find(l => l.code === locale) || languages[0];

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-300 hover:bg-slate-700/50 hover:text-white" aria-label="Changer la langue" disabled={isPending}>
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
                                locale === lang.code ? 'bg-primary/10 text-primary' : 'dark:text-slate-200'
                            )}
                            onClick={() => changeLanguage(lang.code)}
                            disabled={isPending}
                        >
                            <Image src={lang.flag} alt={lang.name} width={20} height={15} className="rounded-sm"/>
                            <span>{lang.name}</span>
                            {locale === lang.code && <Check className="h-4 w-4 ml-auto text-primary"/>}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
