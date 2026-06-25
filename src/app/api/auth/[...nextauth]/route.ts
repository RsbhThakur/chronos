import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/tasks',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const userId = user.id;
        const userDocRef = adminDb.collection('users').doc(userId);
        const doc = await userDocRef.get();

        if (!doc.exists) {
          // Provision new user
          await userDocRef.set({
            id: userId,
            displayName: user.name || 'Chronos User',
            email: user.email || '',
            photoURL: user.image || '',
            mode: 'student',
            personality: {
              workStyle: 'sprinter',
              motivationType: 'encouragement',
              communicationStyle: 'casual',
              timezone: 'UTC',
              peakHours: [9, 10, 11, 14, 15, 16],
            },
            preferences: {
              gamificationEnabled: true,
              ghostWorkerEnabled: false,
              rescueModeEnabled: false,
              voiceEnabled: false,
              notificationChannels: ['inApp'],
            },
            onboardingCompleted: false,
            createdAt: new Date(),
          });

          // Initialize gamification document
          await userDocRef.collection('gamification').doc('stats').set({
            xp: 0,
            level: 1,
            streak: 0,
            longestStreak: 0,
            badges: [],
            tasksCompletedToday: 0,
            totalTasksCompleted: 0,
          });
        }
      }
      return true;
    },

    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = (account.expires_at || 0) * 1000;
        token.id = user.id;
      }

      // Check if token has expired
      if (Date.now() < (token.expiresAt as number)) {
        return token;
      }

      // Token has expired, refresh it
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id;
        (session as any).accessToken = token.accessToken;
        (session as any).firebaseToken = null;
        (session as any).error = token.error;

        // Generate Firebase custom token for Client SDK authentication
        try {
          const firebaseToken = await adminAuth.createCustomToken(token.id as string);
          (session as any).firebaseToken = firebaseToken;
        } catch (err) {
          console.error('Error creating Firebase custom token:', err);
        }
      }
      return session;
    },
  },
};

async function refreshAccessToken(token: any) {
  try {
    const url = 'https://oauth2.googleapis.com/token';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
