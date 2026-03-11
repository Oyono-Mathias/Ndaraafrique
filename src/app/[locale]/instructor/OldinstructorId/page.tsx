'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * @fileOverview Route obsolète redirigeant vers la nouvelle route SEO [slug].
 * ✅ RÉSOLU : Utilisation de router.replace au lieu de redirect dans useEffect.
 */
export default function InstructorIdRedirect() {
    const router = useRouter();
    const params = useParams();
    const instructorId = params.slug as string || params.instructorId as string;
    const locale = params.locale as string;

    useEffect(() => {
        if (instructorId && locale) {
            router.replace(`/${locale}/instructor/${instructorId}`);
        }
    }, [instructorId, locale, router]);

    return null;
}
