'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface TrackingEventArgs {
  eventType: 'page_view' | 'cta_click' | 'payment_method_click';
  sessionId: string;
  pageUrl: string;
  metadata?: Record<string, any>;
}

export async function logTrackingEvent(event: TrackingEventArgs) {
    try {
        const db = getAdminDb();
        const eventData = {
            ...event,
            timestamp: FieldValue.serverTimestamp(),
        };
        await db.collection('tracking_events').add(eventData);
    } catch (error) {
        console.error("Error logging tracking event:", error);
    }
}
