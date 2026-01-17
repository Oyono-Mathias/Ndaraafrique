"use client";

import { useState, useTransition } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Check, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from '@/navigation';
import { useLocale } from 'next-intl';

interface LanguageOption {
    code: string;
    name: string;
}

const languages: LanguageOption[] = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' },
];

export function LanguageSelector() {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const changeLanguage = (lng: string) => {
        startTransition(() => {
          router.replace(pathname, {locale: lng});
        });
        setIsOpen(false);
    };
    
    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-300 hover:bg-slate-700/50 hover:text-white" aria-label="Changer la langue" disabled={isPending}>
                     <Languages className="h-5 w-5" />
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
                            <span>{lang.name}</span>
                            {locale === lang.code && <Check className="h-4 w-4 ml-auto text-primary"/>}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
