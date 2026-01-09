
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { verifyMonerooTransaction } from '@/app/actions/monerooActions';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { sendEnrollmentEmails } from '@/lib/emails';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';

export default function VerifyPaymentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const transactionId = searchParams.get('transaction_id');
    const db = getFirestore();

    const [status, setStatus] = useState('Vérification du paiement en cours...');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!transactionId) {
            setError('ID de transaction manquant. Redirection...');
            setTimeout(() => router.push('/dashboard'), 3000);
            return;
        }

        const verifyAndEnroll = async () => {
            try {
                const result = await verifyMonerooTransaction(transactionId);

                if (!result.success || !result.data) {
                    throw new Error(result.error || 'La vérification du paiement a échoué.');
                }
                
                setStatus('Paiement validé ! Inscription au cours...');

                const metadata = result.data.metadata;
                if (!metadata?.userId || !metadata?.courseId || !metadata?.instructorId) {
                    throw new Error('Données de transaction incomplètes pour finaliser l\'inscription.');
                }

                // Create enrollment
                const enrollmentId = `${metadata.userId}_${metadata.courseId}`;
                const enrollmentRef = doc(db, 'enrollments', enrollmentId);
                await setDoc(enrollmentRef, {
                    studentId: metadata.userId,
                    courseId: metadata.courseId,
                    instructorId: metadata.instructorId,
                    enrollmentDate: serverTimestamp(),
                    progress: 0,
                }, { merge: true });

                // Send emails
                setStatus('Envoi des e-mails de confirmation...');
                const studentDoc = await getDoc(doc(db, 'users', metadata.userId));
                const instructorDoc = await getDoc(doc(db, 'users', metadata.instructorId));
                const courseDoc = await getDoc(doc(db, 'courses', metadata.courseId));

                if (studentDoc.exists() && instructorDoc.exists() && courseDoc.exists()) {
                     await sendEnrollmentEmails(
                        studentDoc.data() as FormaAfriqueUser,
                        { id: courseDoc.id, ...courseDoc.data() } as Course,
                        instructorDoc.data() as FormaAfriqueUser
                    );
                } else {
                     console.warn("Could not send emails: one or more documents not found.");
                }

                setStatus('Inscription réussie ! Vous allez être redirigé...');
                router.push(`/payment/success?courseId=${metadata.courseId}`);

            } catch (err: any) {
                setError(err.message || 'Une erreur critique est survenue.');
                console.error("Verification/Enrollment failed:", err);
                setTimeout(() => router.push('/dashboard'), 5000);
            }
        };

        verifyAndEnroll();

    }, [transactionId, router, db]);

    return (
        <div className="flex flex-col justify-center items-center h-screen gap-4 text-center p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">{status}</h2>
            {error && (
                <p className="text-destructive max-w-md">{error}</p>
            )}
        </div>
    );
}
