
'use server';

// import { adminDb } from '@/firebase/admin';
// import { FieldValue } from 'firebase-admin/firestore';

interface RefundAndRevokeParams {
  userId: string;
  courseId: string;
  ticketId: string;
}

export async function refundAndRevokeAccess(params: RefundAndRevokeParams): Promise<{ success: boolean; error?: string }> {
    console.warn("refundAndRevokeAccess is disabled because Admin SDK is not configured.");
    return { success: false, error: "La fonction de remboursement est temporairement désactivée." };
}
