'use client';

import { useState, useEffect } from 'react';
import {
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  Query,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery.
 * * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} memoizedTargetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean}) | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        let path = "unknown/path";
        if (memoizedTargetRefOrQuery) {
            if ('path' in memoizedTargetRefOrQuery && typeof (memoizedTargetRefOrQuery as any).path === 'string') {
                path = (memoizedTargetRefOrQuery as CollectionReference).path;
            } else if ((memoizedTargetRefOrQuery as any)._query) {
                try {
                    path = (memoizedTargetRefOrQuery as any)._query.path.segments.join('/');
                } catch (e) {
                    path = "unknown/path (complex query)";
                }
            } else {
                path = "unknown/path (complex query)";
            }
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        // DO NOT emit to errorEmitter to prevent global crash boundary if handleable locally
        // errorEmitter.emit('permission-error', contextualError);
        console.warn("Firestore Permission Denied for path:", path, contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}