
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { LanguageSelector } from '@/components/layout/language-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addToWaitlist } from '@/app/actions/waitlistActions';
import { Facebook, Twitter } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useTranslation } from 'react-i18next';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const waitlistSchema = z.object({
  email: z.string().email({ message: 'Veuillez entrer une adresse e-mail valide.' }),
});

const CountdownCard = ({ value, unit }: { value: number, unit: string }) => (
    <div className="text-center">
        <div className="p-4 md:p-6 bg-slate-800/50 border border-slate-700/80 rounded-2xl shadow-lg backdrop-blur-sm">
            <span className="text-4xl md:text-6xl font-bold text-white tracking-tighter">{value.toString().padStart(2, '0')}</span>
        </div>
        <p className="text-xs md:text-sm text-slate-400 mt-2 uppercase tracking-widest">{unit}</p>
    </div>
);

const useCountdown = (targetDate: Date) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;

            if (distance < 0) {
                clearInterval(timer);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            } else {
                setTimeLeft({
                    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((distance % (1000 * 60)) / 1000),
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    return timeLeft;
};

export default function LaunchPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const launchDate = new Date('2024-12-01T00:00:00');
    const timeLeft = useCountdown(launchDate);

    const form = useForm({
        resolver: zodResolver(waitlistSchema),
        defaultValues: { email: '' },
    });

    const onSubmit = async (data: { email: string }) => {
        const result = await addToWaitlist(data.email);
        if (result.success) {
            toast({
                title: t('waitlist_success_title'),
                description: t('waitlist_success_desc'),
            });
            form.reset();
        } else {
            toast({
                variant: 'destructive',
                title: t('error_title'),
                description: result.error,
            });
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#0f172a] text-white overflow-hidden">
             <div className="absolute top-4 right-4 z-10">
                <LanguageSelector />
            </div>

            <main className="flex flex-col items-center text-center z-10 w-full max-w-4xl mx-auto">
                 <div className="relative mb-6">
                    <Image
                        src="/icon.svg"
                        alt="Ndara Afrique Logo"
                        width={100}
                        height={100}
                        className="animate-[logoPulse_3s_ease-in-out_infinite]"
                        priority
                    />
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[logoSheen_3s_ease-in-out_infinite] mix-blend-soft-light"></div>
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight !leading-tight max-w-2xl mx-auto">
                    {t('coming_soon_title')} <br /> <span className="text-primary">{t('coming_soon_subtitle')}</span>
                </h1>

                <div className="grid grid-cols-4 gap-2 md:gap-4 my-8 md:my-12">
                    <CountdownCard value={timeLeft.days} unit={t('countdown_days')} />
                    <CountdownCard value={timeLeft.hours} unit={t('countdown_hours')} />
                    <CountdownCard value={timeLeft.minutes} unit={t('countdown_minutes')} />
                    <CountdownCard value={timeLeft.seconds} unit={t('countdown_seconds')} />
                </div>
                
                <p className="max-w-xl mx-auto text-base md:text-lg text-slate-300">
                    {t('coming_soon_desc')}
                </p>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-lg mx-auto">
                       <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder={t('email_placeholder')}
                                            {...field}
                                            className="h-14 text-base bg-slate-800/50 border-slate-700 backdrop-blur-sm focus:border-primary focus:ring-primary/20"
                                        />
                                    </FormControl>
                                     <FormMessage className="text-left"/>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" size="lg" className="h-14 text-base w-full sm:w-auto shrink-0" disabled={form.formState.isSubmitting}>
                            {t('notify_me_btn')}
                        </Button>
                    </form>
                </Form>
            </main>

            <footer className="absolute bottom-6 text-center z-10">
                <div className="flex items-center justify-center gap-6">
                    <Link href="#" className="text-slate-400 hover:text-primary transition-colors"><Facebook className="h-6 w-6" /></Link>
                    <Link href="#" className="text-slate-400 hover:text-primary transition-colors"><WhatsAppIcon className="h-6 w-6" /></Link>
                    <Link href="#" className="text-slate-400 hover:text-primary transition-colors"><Twitter className="h-6 w-6" /></Link>
                </div>
            </footer>
        </div>
    );
}

