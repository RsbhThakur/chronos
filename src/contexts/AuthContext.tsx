'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { auth as clientAuth, db as clientDb } from '@/lib/firebase';
import { signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  startDemo: () => void;
  googleAccessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: UserProfile = {
  id: 'demo-user',
  displayName: 'Neon Rider (Demo)',
  email: 'demo@chronos.ai',
  photoURL: '/vercel.svg',
  mode: 'professional',
  personality: {
    workStyle: 'mixed',
    motivationType: 'data-driven',
    communicationStyle: 'casual',
    timezone: 'UTC',
    peakHours: [9, 10, 11, 14, 15, 16],
  },
  preferences: {
    gamificationEnabled: true,
    ghostWorkerEnabled: true,
    rescueModeEnabled: true,
    voiceEnabled: true,
    notificationChannels: ['inApp'],
  },
  onboardingCompleted: true,
  createdAt: new Date(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  // Load demo mode state from localStorage on init
  useEffect(() => {
    const persistedDemo = localStorage.getItem('chronos_demo_mode') === 'true';
    if (persistedDemo) {
      setIsDemo(true);
      setUser(DEMO_USER);
      setLoading(false);
    }
  }, []);

  // 1. Sync NextAuth session with Firebase Client Auth via Custom Token
  useEffect(() => {
    if (isDemo) return;

    const syncFirebase = async () => {
      const firebaseToken = (session as any)?.firebaseToken;
      if (status === 'authenticated' && firebaseToken) {
        if (clientAuth.currentUser?.uid !== session.user?.id) {
          try {
            await signInWithCustomToken(clientAuth, firebaseToken);
          } catch (err) {
            console.error('Firebase Auth custom token sync failed:', err);
          }
        }
      } else if (status === 'unauthenticated') {
        if (clientAuth.currentUser) {
          try {
            await firebaseSignOut(clientAuth);
          } catch (err) {
            console.error('Firebase Auth sign out failed:', err);
          }
        }
        setUser(null);
        setLoading(false);
      }
    };

    syncFirebase();
  }, [session, status, isDemo]);

  // 2. Listen to Firebase Auth state change and fetch Firestore profile
  useEffect(() => {
    if (isDemo) return;

    const unsubscribe = onAuthStateChanged(clientAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const docRef = doc(clientDb, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            const profile: UserProfile = {
              id: docSnap.id,
              displayName: profileData.displayName || '',
              email: profileData.email || '',
              photoURL: profileData.photoURL || '',
              mode: profileData.mode || 'student',
              personality: profileData.personality || {
                workStyle: 'sprinter',
                motivationType: 'encouragement',
                communicationStyle: 'casual',
                timezone: 'UTC',
                peakHours: [],
              },
              preferences: profileData.preferences || {
                gamificationEnabled: true,
                ghostWorkerEnabled: false,
                rescueModeEnabled: false,
                voiceEnabled: false,
                notificationChannels: [],
              },
              onboardingCompleted: !!profileData.onboardingCompleted,
              createdAt: profileData.createdAt?.toDate ? profileData.createdAt.toDate() : new Date(profileData.createdAt || Date.now()),
            };

            setUser(profile);

            // Onboarding redirection logic
            if (!profile.onboardingCompleted && pathname !== '/onboarding') {
              router.push('/onboarding');
            }
          } else {
            console.warn('User profile document not found in Firestore.');
            setUser(null);
          }
        } catch (err) {
          console.error('Failed to fetch user profile from Firestore:', err);
        } finally {
          setLoading(false);
        }
      } else {
        if (status !== 'loading') {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [status, router, pathname, isDemo]);

  // Callbacks
  const signIn = async () => {
    localStorage.removeItem('chronos_demo_mode');
    setIsDemo(false);
    setLoading(true);
    await nextAuthSignIn('google');
  };

  const signOut = async () => {
    localStorage.removeItem('chronos_demo_mode');
    setIsDemo(false);
    setUser(null);
    setLoading(true);
    if (clientAuth.currentUser) {
      await firebaseSignOut(clientAuth);
    }
    await nextAuthSignOut();
  };

  const startDemo = () => {
    localStorage.setItem('chronos_demo_mode', 'true');
    setIsDemo(true);
    setUser(DEMO_USER);
    setLoading(false);
    router.push('/dashboard');
  };

  const googleAccessToken = (session as any)?.accessToken || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemo,
        signIn,
        signOut,
        startDemo,
        googleAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
