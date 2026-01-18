
'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface TrackingEvent {
  eventType: 'page_view' | 'cta_click' | 'payment_method_click';
  sessionId: string;
  pageUrl: string;
  metadata?: Record<string, any>;
}

export async function logTrackingEvent(event: TrackingEvent): Promise<{ success: boolean; error?: string }> {
  // Gracefully fail if the admin SDK is not initialized
  if (!adminDb) {
    console.warn("logTrackingEvent skipped: Firebase Admin SDK not initialized.");
    return { success: true }; // Return success to not block client flow
  }

  try {
    const eventRef = adminDb.collection('tracking_events').doc();
    await eventRef.set({
      ...event,
      timestamp: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error logging tracking event:', error);
    // We don't return an error to the client to avoid blocking user flow
    return { success: false, error: 'Internal server error.' };
  }
}
