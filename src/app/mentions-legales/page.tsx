
'use client';

import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LegalPage() {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const fetchLegalContent = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
          const settings = docSnap.data();
          setContent(settings.legal?.privacyPolicy || 'Contenu non disponible.');
        } else {
          setContent('Contenu non disponible.');
        }
      } catch (error) {
        console.error("Failed to fetch legal content:", error);
        setContent("Erreur lors du chargement du contenu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLegalContent();
  }, [db]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Mentions Légales & Politique de Confidentialité</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full bg-slate-700" />
              <Skeleton className="h-4 w-full bg-slate-700" />
              <Skeleton className="h-4 w-3/4 bg-slate-700" />
            </div>
          ) : (
            <div 
              className="prose dark:prose-invert max-w-none text-slate-300" 
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
