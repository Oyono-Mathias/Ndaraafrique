'use server';

import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Enregistre les événements de comportement utilisateur pour calculer les KPIs.
 */

interface TrackingEventArgs {
  eventType: 'page_view' | 'cta_click' | 'payment_method_click' | 'affiliate_click';
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

        // Si c'est un clic d'affiliation, on incrémente aussi le compteur de l'utilisateur CIBLE (l'ambassadeur)
        if (event.eventType === 'affiliate_click' && event.metadata?.affiliateId) {
            const userRef = db.collection('users').doc(event.metadata.affiliateId);
            await userRef.update({
                'affiliateStats.clicks': FieldValue.increment(1)
            });
        }
    } catch (error) {
        console.error("Error logging tracking event:", error);
    }
}