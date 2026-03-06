'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { useUser } from '@/firebase';
import { doc, onSnapshot, getFirestore, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { signOut, getAuth, onIdTokenChanged } from 'firebase/auth';
import type { NdaraUser, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

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

const MASTER_ADMIN_EMAIL = 'salguienow@gmail.com';

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const locale = useLocale();
  const [currentUser, setCurrentUser] = useState<NdaraUser | null>(null);
  const [role, setRole] = useState<UserRole>('student');
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>(['student']);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  const secureSignOut = useCallback(async () => {
    const auth = getAuth();
    if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
    }
    localStorage.removeItem('ndaraafrique-role');
    await signOut(auth);
    // ✅ CEO Request: Redirect to Landing Page with locale prefix
    router.push(`/${locale}`);
  }, [db, router, locale]);

  // 1. GESTION DE LA PRÉSENCE (isOnline)
  useEffect(() => {
    const auth = getAuth();
    
    const handleBeforeUnload = () => {
        if (auth.currentUser) {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() });
        }
    };

    const unsubscribe = onIdTokenChanged(auth, async (authUser) => {
      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
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

  // 2. SYNCHRONISATION DU PROFIL FIRESTORE
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

    const unsubscribe = onSnapshot(userDocRef, async (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data() as NdaraUser;

          if (userData.status === 'suspended') {
            await secureSignOut();
            toast({ variant: 'destructive', title: 'Compte suspendu' });
            return;
          }
          
          const isMasterAdmin = user.email === MASTER_ADMIN_EMAIL || userData.role === 'admin';
          const roles: UserRole[] = ['student'];
          if (isMasterAdmin) roles.push('instructor', 'admin');
          else if (userData.role === 'instructor' || userData.isInstructorApproved) roles.push('instructor');

          const hasRealPhoto = !!userData.profilePictureURL && 
                               !userData.profilePictureURL.includes('api.dicebear.com') && 
                               userData.profilePictureURL.length > 10;
                               
          const isComplete = !!(userData.username && userData.careerGoals?.interestDomain && hasRealPhoto);

          const resolvedUser: NdaraUser = {
              ...userData,
              uid: user.uid,
              email: user.email || '',
              username: userData.username || 'user_' + user.uid.substring(0, 5),
              fullName: userData.fullName || user.displayName || 'Utilisateur Ndara',
              role: isMasterAdmin ? 'admin' : (userData.role || 'student'),
              isProfileComplete: isComplete,
              isOnline: userData.isOnline ?? true
          } as any;
          
          setCurrentUser(resolvedUser);
          setAvailableRoles(roles);
          
          const savedRole = localStorage.getItem('ndaraafrique-role') as UserRole;
          if (savedRole && roles.includes(savedRole)) setRole(savedRole);
          else setRole(resolvedUser.role);

        } else {
            const isMasterAdmin = user.email === MASTER_ADMIN_EMAIL;
            const newUserDoc = {
                uid: user.uid,
                email: user.email || '',
                username: user.displayName?.replace(/\s/g, '_').toLowerCase() || 'user_' + user.uid.substring(0, 5),
                fullName: user.displayName || 'Utilisateur Ndara',
                role: isMasterAdmin ? 'admin' : 'student',
                status: 'active',
                isInstructorApproved: false,
                createdAt: serverTimestamp(),
                isOnline: true,
                lastSeen: serverTimestamp(),
                careerGoals: { currentRole: '', interestDomain: '', mainGoal: '' },
                isProfileComplete: false
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
      const target = newRole === 'admin' ? '/admin' : newRole === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
      router.push(`/${locale}${target}`);
      toast({ title: `Mode ${newRole} activé` });
    }
  }, [availableRoles, router, toast, locale]);
  
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
    <RoleContext.Provider value={value}>
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
