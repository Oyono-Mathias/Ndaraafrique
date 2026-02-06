'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { useUser } from '@/firebase';
import { doc, onSnapshot, getFirestore, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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
    localStorage.removeItem('ndaraafrique-role');
    await signOut(auth);
    router.push('/login');
  }, [db, router]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true });
      }
    });
    return () => unsubscribe();
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
          if (userData.role === 'instructor' || userData.isInstructorApproved || userData.role === 'admin') {
              roles.push('instructor');
          }
          if (userData.role === 'admin') {
              roles.push('admin');
          }

          const isComplete = !!(userData.username && userData.careerGoals?.interestDomain && userData.fullName);

          const resolvedUser: NdaraUser = {
              ...userData,
              uid: user.uid,
              email: user.email || '',
              username: userData.username || 'user_' + user.uid.substring(0, 5),
              fullName: userData.fullName || user.displayName || 'Utilisateur Ndara',
              profilePictureURL: userData.profilePictureURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userData.fullName || 'A')}`,
              status: userData.status || 'active',
              isProfileComplete: isComplete,
          } as any;
          
          setCurrentUser(resolvedUser);
          setAvailableRoles(roles);
          
          // Gestion de la persistance du mode actif via localStorage (survit au refresh)
          const savedRole = localStorage.getItem('ndaraafrique-role') as UserRole;
          if (savedRole && roles.includes(savedRole)) {
              setRole(savedRole);
          } else {
              setRole(userData.role || 'student');
              localStorage.setItem('ndaraafrique-role', userData.role || 'student');
          }

        } else {
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
            setRole('student');
            localStorage.setItem('ndaraafrique-role', 'student');
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
      
      toast({
          title: `Mode ${newRole === 'instructor' ? 'Formateur' : newRole === 'admin' ? 'Administrateur' : 'Étudiant'} activé`,
      });

      if (newRole === 'admin') router.push('/admin');
      else if (newRole === 'instructor') router.push('/instructor/dashboard');
      else router.push('/student/dashboard');
    }
  }, [availableRoles, router, toast]);
  
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
