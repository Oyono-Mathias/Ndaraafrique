
'use client'
import { useRouter } from "next-intl/navigation";
import { useEffect } from "react";

export default function ObsoleteMesFormationsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/student/mes-formations');
    }, [router]);

    return null;
}
