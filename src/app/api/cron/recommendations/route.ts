import { NextResponse } from 'next/server';
import { updateAllRecommendations } from '@/services/recommendationService';

/**
 * @fileOverview Route API pour déclencher la mise à jour quotidienne des recommandations.
 * Sécurisée par une clé secrète CRON.
 */

export async function GET(req: Request) {
  // Vérification de la clé secrète (Configurable dans Vercel/Firebase)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const count = await updateAllRecommendations();
    return NextResponse.json({ 
        success: true, 
        message: `Recommandations mises à jour pour ${count} utilisateurs.`,
        timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("CRON_RECOMMENDATION_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
