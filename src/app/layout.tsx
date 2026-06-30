import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chronos — AI Time Guardian",
  description: "Your AI-powered productivity companion that rescues you from missed deadlines",
};

export const dynamic = 'force-dynamic';

import Providers from "@/components/providers/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable}`} data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__FIREBASE_CONFIG__ = {
              apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}",
              authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}",
              projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}",
              storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''}",
              messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}",
              appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}",
              vapidKey: "${process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ''}"
            };`
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
