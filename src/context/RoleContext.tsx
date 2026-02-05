'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { useUser } from '@/firebase';
import { doc, onSnapshot, getFirestore, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { onIdTokenChanged, signOut, getAuth } from 'firebase/auth';
import type { NdaraUser, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface RoleContextType {
  role: UserRole;
  setRole: Dispatch<SetStateAction<UserRole>>;
  availableRoles: UserRole[];
  setAvailableRoles: Dispatch<SetStateAction<UserRole[]>>;
  switchRole: (newRole: UserRole) => void;
  secureSignOut: () => Promise<void>;
  loading: boolean;
  currentUser: NdaraUser | null;
  user: any;
  isUserLoading: boolean;
  setCurrentUser: React.Dispatch<React.SetStateAction<NdaraUser | null>>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<NdaraUser | null>(null);
  const [role, setRole] = useState<UserRole>('student');
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>(['student']);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  const secureSignOut = useCallback(async () => {
    const auth = getAuth();
    if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(console.error);
    }
    await signOut(auth);
    router.push('/login');
  }, [db, router]);

  useEffect(() => {
    const auth = getAuth();
    const handleBeforeUnload = () => {
        if (auth.currentUser) {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() });
        }
    };
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true });
        window.addEventListener('beforeunload', handleBeforeUnload);
      } else {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    });

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        unsubscribe();
    };
  }, [db]);

  useEffect(() => {
    if (isUserLoading) {
      setLoading(true);
      return;
    }
    
    if (!user) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);

    // LISTENER TEMPS RÉEL : On lit les données, on n'écrit jamais ici pour éviter les boucles d'écrasement.
    const unsubscribe = onSnapshot(userDocRef, async (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data() as NdaraUser;

          if (userData.status === 'suspended') {
            await secureSignOut();
            toast({
                variant: 'destructive',
                title: 'Compte suspendu',
                description: 'Votre compte a été suspendu.',
                duration: Infinity,
            });
            setLoading(false);
            return;
          }
          
          const roles: UserRole[] = ['student'];
          if (userData.role === 'instructor' || userData.role === 'admin') {
              roles.push('instructor');
          }
           if (userData.role === 'admin') {
              roles.push('admin');
          }

          let finalPermissions: { [key: string]: boolean } = {};
          if (userData.role) {
            try {
              const roleDocRef = doc(db, 'roles', userData.role);
              const roleDocSnap = await getDoc(roleDocRef);
              if (roleDocSnap.exists()) {
                  finalPermissions = roleDocSnap.data().permissions || {};
              }
            } catch (e) {
              console.error("Could not fetch role document:", e);
            }
          }

          if (userData.permissions) {
              finalPermissions = { ...finalPermissions, ...userData.permissions };
          }

          // Logique de complétion alignée sur le formulaire
          const isComplete = !!(userData.username && userData.careerGoals?.interestDomain && userData.fullName);

          // Résolution de l'utilisateur avec fallbacks en mémoire
          const resolvedUser: NdaraUser = {
              ...userData,
              uid: user.uid,
              email: user.email || '',
              username: userData.username || 'user_' + user.uid.substring(0, 5),
              fullName: userData.fullName || user.displayName || 'Utilisateur Ndara',
              profilePictureURL: userData.profilePictureURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userData.fullName || 'A')}`,
              status: userData.status || 'active',
              isProfileComplete: isComplete,
              permissions: finalPermissions,
              careerGoals: {
                  currentRole: userData.careerGoals?.currentRole || '',
                  interestDomain: userData.careerGoals?.interestDomain || '',
                  mainGoal: userData.careerGoals?.mainGoal || '',
              }
          } as any;
          
          setCurrentUser(resolvedUser);
          setAvailableRoles(roles);
          
          const lastRole = localStorage.getItem('ndaraafrique-role') as UserRole;
          const newRole = (lastRole && roles.includes(lastRole)) ? lastRole : (userData.role || 'student');
          setRole(newRole);

        } else {
            // Création initiale si le document n'existe pas
            const newUserDoc = {
                uid: user.uid,
                email: user.email || '',
                username: user.displayName?.replace(/\s/g, '_').toLowerCase() || 'user_' + user.uid.substring(0, 5),
                fullName: user.displayName || 'Utilisateur Ndara',
                role: 'student',
                status: 'active',
                isInstructorApproved: false,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                isOnline: true,
                lastSeen: serverTimestamp(),
                profilePictureURL: user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'A')}`,
                isProfileComplete: false,
                careerGoals: { currentRole: '', interestDomain: '', mainGoal: '' },
            };
            await setDoc(userDocRef, newUserDoc);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isUserLoading, db, secureSignOut, toast]);

  const switchRole = useCallback((newRole: UserRole) => {
    if (availableRoles.includes(newRole)) {
      setRole(newRole);
      localStorage.setItem('ndaraafrique-role', newRole);
       if (newRole === 'admin') router.push('/admin');
       else if (newRole === 'instructor') router.push('/instructor/dashboard');
       else router.push('/student/dashboard');
    }
  }, [availableRoles, router]);
  
  const value = useMemo(() => ({
    role,
    setRole,
    availableRoles,
    setAvailableRoles,
    switchRole,
    secureSignOut,
    loading: isUserLoading || loading,
    currentUser,
    user,
    isUserLoading,
    setCurrentUser,
  }), [role, availableRoles, switchRole, secureSignOut, isUserLoading, loading, currentUser, user]);

  return (
    <RoleContext.Provider value={value as any}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
