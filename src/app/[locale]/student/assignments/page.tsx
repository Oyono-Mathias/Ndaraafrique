
'use client';

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * @fileOverview Redirection de la route anglaise vers la route française unifiée 'devoirs'.
 */
export default function RedirectAssignments() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/student/devoirs');
    }, [router]);

    return null;
}
