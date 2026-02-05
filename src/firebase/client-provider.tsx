'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  // Activation de la persistence hors-ligne pour Firestore sur navigateur
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const db = getFirestore(firebaseServices.firebaseApp);
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a time.
          console.warn('Firestore persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
          // The current browser does not support all of the features required to enable persistence
          console.warn('Firestore persistence failed: Browser not supported');
        }
      });
    }
  }, [firebaseServices.firebaseApp]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
