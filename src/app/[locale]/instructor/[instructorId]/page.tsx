'use client';

import { redirect, useParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * @fileOverview Route obsolète redirigeant vers la nouvelle route SEO [slug].
 * Cette redirection résout le conflit de noms de paramètres dynamiques dans Next.js.
 */
export default function InstructorIdRedirect() {
    const params = useParams();
    const instructorId = params.instructorId as string;
    const locale = params.locale as string;

    useEffect(() => {
        if (instructorId) {
            redirect(`/${locale}/instructor/${instructorId}`);
        }
    }, [instructorId, locale]);

    return null;
}
