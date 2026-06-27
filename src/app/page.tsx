import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "24px",
      textAlign: "center"
    }}>
      <main className="glass-card" style={{
        padding: "48px",
        maxWidth: "600px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px"
      }}>
        <h1 className="neon-text-cyan" style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-5xl)",
          fontWeight: 900,
          letterSpacing: "4px"
        }}>
          CHRONOS
        </h1>
        
        <h2 className="neon-text-purple" style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-lg)",
          fontWeight: 600,
          letterSpacing: "2px"
        }}>
          AI TIME GUARDIAN
        </h2>
        
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "var(--text-base)",
          lineHeight: "1.6"
        }}>
          Your AI Time Guardian is online.<br />
          Don't just manage time. Rescue it.
        </p>

        <div style={{
          display: "flex",
          gap: "16px",
          marginTop: "16px",
          width: "100%",
          justifyContent: "center"
        }}>
          <Link href="/login" className="glow-button glow-button--solid" style={{ flex: 1, maxWidth: "200px", display: "inline-flex", justifyContent: "center", alignItems: "center", textDecoration: "none" }}>
            Start System
          </Link>
          <Link href="/login?demo=true" className="glow-button glow-button--purple" style={{ flex: 1, maxWidth: "200px", display: "inline-flex", justifyContent: "center", alignItems: "center", textDecoration: "none" }}>
            Try Demo
          </Link>
        </div>
      </main>
    </div>
  );
}
