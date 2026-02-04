
'use client'
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RedirectMesDevoirs() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/student/devoirs');
    }, [router]);

    return null;
}
