
'use client'
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegisterPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/login?tab=register');
    }, [router]);

    return null;
}
