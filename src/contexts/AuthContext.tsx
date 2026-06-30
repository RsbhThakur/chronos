'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { auth as clientAuth, db as clientDb } from '@/lib/firebase';
import { signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '@/types';
import { useDemo } from '@/hooks/useDemo';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  signIn: () => Promise<void>;
  signInGuest: () => Promise<void>;
  signOut: (callbackUrl?: string) => Promise<void>;
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

  const { isDemo: demoActive, demoUser, startDemo: triggerDemo, exitDemo: triggerExit } = useDemo();

  // Load demo mode state from localStorage on init
  useEffect(() => {
    const persistedDemo = localStorage.getItem('chronos_demo_mode') === 'true';
    if (persistedDemo) {
      setIsDemo(true);
      setLoading(false);
    }
  }, []);

  // Sync isDemo and user profile when demo state changes
  useEffect(() => {
    if (demoActive && demoUser) {
      setIsDemo(true);
      setUser(demoUser);
      setLoading(false);
    }
  }, [demoActive, demoUser]);

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

  // 2. React to refresh token expiration error
  useEffect(() => {
    if (session && (session as any).error === 'RefreshAccessTokenError') {
      console.warn('OAuth refresh token expired or revoked. Redirecting to sign-in page with session_expired error.');
      signOut('/login?error=session_expired');
    }
  }, [session]);

  // Redirect authenticated or demo users away from /login
  useEffect(() => {
    if (!loading && pathname === '/login') {
      if (user) {
        if (user.onboardingCompleted) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } else if (isDemo) {
        router.push('/dashboard');
      }
    }
  }, [user, isDemo, loading, pathname, router]);

  // 3. Listen to Firebase Auth state change and fetch Firestore profile real-time
  useEffect(() => {
    if (isDemo) return;

    let unsubSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(clientAuth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(clientDb, 'users', firebaseUser.uid);
        
        // Clean up any existing snapshot listener
        if (unsubSnapshot) unsubSnapshot();

        unsubSnapshot = onSnapshot(docRef, (docSnap) => {
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
          setLoading(false);
        }, (err) => {
          console.error('Failed to subscribe to user profile in Firestore:', err);
          setLoading(false);
        });
      } else {
        if (unsubSnapshot) unsubSnapshot();
        if (status !== 'loading') {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [status, router, pathname, isDemo]);

  // Callbacks
  const signIn = async () => {
    localStorage.removeItem('chronos_demo_mode');
    setIsDemo(false);
    setLoading(true);
    await nextAuthSignIn('google');
  };

  const signInGuest = async () => {
    localStorage.removeItem('chronos_demo_mode');
    setIsDemo(false);
    setLoading(true);
    await nextAuthSignIn('guest');
  };

  const signOut = async (callbackUrl = '/login') => {
    localStorage.removeItem('chronos_demo_mode');
    localStorage.removeItem('chronos_demo_mode_persona');
    if (demoActive) {
      triggerExit();
      return;
    }
    setIsDemo(false);
    setUser(null);
    setLoading(true);
    if (clientAuth.currentUser) {
      try {
        await firebaseSignOut(clientAuth);
      } catch (err) {
        console.error('Error in firebaseSignOut during custom redirect:', err);
      }
    }
    await nextAuthSignOut({ callbackUrl });
  };

  const startDemo = () => {
    triggerDemo('student');
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
        signInGuest,
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
