'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface TrackingEventArgs {
  eventType: 'page_view' | 'cta_click' | 'payment_method_click';
  sessionId: string;
  pageUrl: string;
  metadata?: Record<string, any>;
}

export async function logTrackingEvent(event: TrackingEventArgs) {
    if (!adminDb) {
        // Silently fail if admin DB is not initialized. This can happen during build.
        return;
    }

    try {
        const eventData = {
            ...event,
            timestamp: FieldValue.serverTimestamp(),
        };
        await adminDb.collection('tracking_events').add(eventData);
    } catch (error) {
        console.error("Error logging tracking event:", error);
        // We don't want to throw an error here as it's a background task.
    }
}
