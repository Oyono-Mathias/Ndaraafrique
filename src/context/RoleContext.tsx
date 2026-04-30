'use client';

/**
 * @fileOverview RoleProvider Ndara Afrique.
 * ✅ GÉOLOCALISATION : Détection automatique du pays via IP.
 * ✅ SYNC : Filet de sécurité pour créer le document Firestore si manquant.
 * ✅ SÉCURITÉ : Expulsion immédiate des utilisateurs suspendus ou supprimés.
 */

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
    router.push(`/${locale}/login`);
  }, [db, router, locale]);

  const detectGeoLocation = useCallback(async (userId: string) => {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.country_name && data.country) {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                countryName: data.country_name,
                countryCode: data.country
            });
        }
    } catch (e) {
        console.warn("Geolocation auto-detect failed.");
    }
  }, [db]);

  useEffect(() => {
    const auth = getAuth();
    
    const handleBeforeUnload = () => {
        if (auth.currentUser) {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
        }
    };

    const unsubscribe = onIdTokenChanged(auth, async (authUser) => {
      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
        await setDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
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

    const unsubscribe = onSnapshot(userDocRef, async (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data() as NdaraUser;

          // 🛡️ SÉCURITÉ : Expulsion si suspendu ou supprimé
          if (userData.status === 'suspended' || userData.status === 'deleted' || userData.restrictions?.canAccessPlatform === false) {
            console.warn(`[SECURITY] Accès bloqué pour l'utilisateur ${user.uid} (Status: ${userData.status})`);
            await secureSignOut();
            toast({ 
                variant: 'destructive', 
                title: 'Accès révoqué', 
                description: userData.status === 'deleted' ? 'Ce compte n\'existe plus.' : (userData.statusReason || 'Votre compte est suspendu.')
            });
            return;
          }

          if (!userData.countryCode || !userData.countryName) {
              detectGeoLocation(user.uid);
          }
          
          const isMasterAdmin = user.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() || userData.role === 'admin';
          
          const roles: UserRole[] = ['student'];
          if (isMasterAdmin) {
              roles.push('instructor', 'admin');
          } else if (userData.role === 'instructor' || userData.isInstructorApproved) {
              roles.push('instructor');
          }

          let priorityRole: UserRole = 'student';
          if (roles.includes('admin')) priorityRole = 'admin';
          else if (roles.includes('instructor')) priorityRole = 'instructor';

          const ndaraUser: NdaraUser = {
            ...userData,
            uid: user.uid,
            email: user.email || '',
            username: userData.username || user.displayName?.replace(/\s/g, '_').toLowerCase() || 'user' + user.uid.substring(0,5),
            fullName: userData.fullName || user.displayName || 'Utilisateur Ndara',
            availableRoles: roles,
            profilePictureURL: user.photoURL || userData.profilePictureURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userData.fullName || 'A')}`,
            status: userData.status || 'active',
            isProfileComplete: !!(userData.username && userData.careerGoals?.interestDomain),
          };
          
          setCurrentUser(ndaraUser);
          setAvailableRoles(roles);
          
          const savedRole = localStorage.getItem('ndaraafrique-role') as UserRole;
          if (savedRole && roles.includes(savedRole)) {
              setRole(savedRole);
          } else {
              setRole(priorityRole);
              localStorage.setItem('ndaraafrique-role', priorityRole);
          }

        } else {
            // ✅ FILET DE SÉCURITÉ : Création du profil Firestore s'il manque (ex: login Google rapide)
            console.log(`[AUTH_SYNC] Création du document manquant pour l'utilisateur ${user.uid}`);
            
            const isMasterAdmin = user.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
            const newUserDoc: Omit<NdaraUser, 'availableRoles'> = {
                uid: user.uid,
                email: user.email || '',
                username: user.displayName?.replace(/\s/g, '_').toLowerCase() || 'user_' + user.uid.substring(0, 5),
                fullName: user.displayName || 'Utilisateur Ndara',
                role: isMasterAdmin ? 'admin' : 'student',
                status: 'active',
                isInstructorApproved: isMasterAdmin,
                createdAt: serverTimestamp(),
                isProfileComplete: false,
                preferredLanguage: locale as 'fr' | 'en' | 'sg',
                isOnline: true,
                lastSeen: serverTimestamp(),
                balance: 0,
                affiliateBalance: 0,
                pendingAffiliateBalance: 0,
                aiCredits: 5, // Bonus de bienvenue
                hasAIAccess: false,
                affiliateStats: { clicks: 0, registrations: 0, sales: 0, earnings: 0 },
                restrictions: {
                    canWithdraw: true,
                    canSendMessage: true,
                    canBuyCourse: true,
                    canSellCourse: true,
                    canAccessPlatform: true
                }
            };
            await setDoc(userDocRef, newUserDoc).catch(() => {});
            detectGeoLocation(user.uid);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isUserLoading, db, secureSignOut, toast, locale, detectGeoLocation]);

  const switchRole = useCallback((newRole: UserRole) => {
    if (availableRoles.includes(newRole)) {
      setRole(newRole);
      localStorage.setItem('ndaraafrique-role', newRole);
      
      const target = newRole === 'admin' 
        ? '/admin' 
        : newRole === 'instructor' 
            ? '/instructor/dashboard' 
            : '/student/dashboard';
      
      router.push(`/${locale}${target}`);
      
      toast({ title: `Mode ${newRole.toUpperCase()} activé` });
    } else {
        toast({ 
            variant: 'destructive', 
            title: "Accès refusé", 
            description: "Vous n'avez pas les autorisations pour ce mode." 
        });
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
