import React from 'react';
import Link from 'next/link';
import { ArrowDown, Clock, Shield, Sparkles, Zap, Calendar, Mic, Users, Heart } from 'lucide-react';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      {/* Dynamic Background Particle Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slow-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(40px, -50px) rotate(180deg); }
        }
        @keyframes float-slow-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-30px, 40px) rotate(-120deg); }
        }
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(10px); opacity: 1; }
        }
        .time-particle {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, var(--neon-cyan-glow) 0%, transparent 70%);
          pointer-events: none;
          z-index: 1;
        }
        .scroll-indicator-container {
          animation: scroll-bounce 2s infinite ease-in-out;
        }
      `}} />

      {/* 1. HERO SECTION (Clean Centered Card + Particles) */}
      <header style={{
        position: 'relative',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 24px'
      }}>
        {/* Floating Background Particles */}
        <div className="time-particle" style={{ width: '300px', height: '300px', top: '15%', left: '10%', animation: 'float-slow-1 25s infinite ease-in-out' }} />
        <div className="time-particle" style={{ width: '400px', height: '400px', bottom: '15%', right: '10%', animation: 'float-slow-2 30s infinite ease-in-out', opacity: 0.7 }} />
        
        <main className="glass-card" style={{
          padding: '56px 48px',
          maxWidth: '600px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          zIndex: 10
        }}>
          <h1 className="neon-text-cyan" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-5xl)',
            fontWeight: 900,
            letterSpacing: '4px',
            lineHeight: '1.1'
          }}>
            CHRONOS
          </h1>
          
          <h2 className="neon-text-purple" style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            letterSpacing: '2px'
          }}>
            AI TIME GUARDIAN
          </h2>
          
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-base)',
            lineHeight: '1.6',
            maxWidth: '400px'
          }}>
            Your AI Time Guardian is online.<br />
            Don't just manage time. Rescue it.
          </p>

          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '16px',
            width: '100%',
            justifyContent: 'center'
          }}>
            <Link href="/login" className="glow-button glow-button--solid" style={{ flex: 1, maxWidth: '200px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none' }}>
              Start System
            </Link>
            <Link href="/login?demo=true" className="glow-button glow-button--purple" style={{ flex: 1, maxWidth: '200px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none' }}>
              Try Demo
            </Link>
          </div>
        </main>

        {/* Scroll Indicator */}
        <div style={{ position: 'absolute', bottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 10, opacity: 0.8 }}>
          <span style={{ fontSize: 'var(--text-xs)', letterSpacing: '2px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Scroll to Explore</span>
          <div className="scroll-indicator-container">
            <ArrowDown size={20} className="neon-text-cyan" />
          </div>
        </div>
      </header>

      {/* 2. PROBLEM STATEMENT */}
      <section style={{ background: 'var(--bg-secondary)', padding: '100px 24px', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container" style={{ maxWidth: '900px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="neon-text-pink" style={{ fontSize: 'clamp(3.5rem, 10vw, 6rem)', fontWeight: 900, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            87%
          </div>
          <h3 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            of professionals regularly miss key project milestones.
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-md)', lineHeight: '1.8', maxWidth: '700px', margin: '0 auto' }}>
            Traditional to-do apps act like static lists. They watch you fail passively. 
            <strong> Chronos is different.</strong> Armed with a suite of specialized AI agents, Chronos actively intervenes to auto-compose rescue plans, draft communication deliverables, and optimize your calendars.
          </p>
        </div>
      </section>

      {/* 3. FEATURES SHOWCASE */}
      <section style={{ padding: '100px 24px' }}>
        <div className="container">
          <h3 className="neon-text-purple" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', textAlign: 'center', marginBottom: '64px', fontWeight: 800 }}>
            Orchestrated Security Modules
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Rescue Mode */}
            <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shield size={24} className="neon-text-pink" />
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Rescue Mode</h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
                Pulses red when deadlines approach, automatically orchestrating compressed recovery plans and pruning non-essential tasks.
              </p>
            </div>

            {/* Ghost Worker */}
            <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles size={24} className="neon-text-cyan" />
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Ghost Worker</h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
                Bypasses blockages by drafting PR feedback, manager sync cards, and project outlines in the background while you focus.
              </p>
            </div>

            {/* Time Warp */}
            <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={24} className="neon-text-purple" />
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Time Warp</h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
                Leverages historical habit data to forecast productivity levels, recommending optimal scheduling timeframes.
              </p>
            </div>

            {/* Smart Decomposition */}
            <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Zap size={24} className="neon-text-green" />
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Smart Decomposition</h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
                Breaks down high-level milestones into sequential, bite-sized tasks structured with time estimates automatically.
              </p>
            </div>

            {/* Voice Assistant */}
            <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mic size={24} className="neon-text-amber" />
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Voice Assistant</h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
                Log habits, complete tasks, and sync timeline schedules hands-free using quick natural language instructions.
              </p>
            </div>

            {/* Calendar Sync */}
            <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={24} className="neon-text-cyan" />
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Calendar Sync</h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
                Bi-directional synchronization with Google Calendar reserves dedicated focus blocks and logs tasks directly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section style={{ background: 'var(--bg-secondary)', padding: '100px 24px', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container">
          <h3 className="neon-text-green" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', textAlign: 'center', marginBottom: '64px', fontWeight: 800 }}>
            Chronos Defense Protocol
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '48px', position: 'relative' }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--neon-green-subtle)', border: '2px solid var(--neon-green)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--neon-green)', boxShadow: '0 0 15px var(--neon-green-glow)' }}>
                1
              </div>
              <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginTop: '8px' }}>Align Persona</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
                Onboard by configuring your peak hours, timezone, motivation preferences, and timezone metrics.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--neon-cyan-subtle)', border: '2px solid var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--neon-cyan)', boxShadow: '0 0 15px var(--neon-cyan-glow)' }}>
                2
              </div>
              <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginTop: '8px' }}>Schedule Focus</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
                Ingest tasks, daily habits, and high-level milestones. Chronos organizes them into priority columns.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--neon-purple-subtle)', border: '2px solid var(--neon-purple)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--neon-purple)', boxShadow: '0 0 15px var(--neon-purple-glow)' }}>
                3
              </div>
              <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginTop: '8px' }}>Active Intervention</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
                Our specialized AI agents orchestrate, draft, and intervene, keeping your productivity rating fully secured.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MODES SHOWCASE */}
      <section style={{ padding: '100px 24px' }}>
        <div className="container">
          <h3 className="neon-text-cyan" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', textAlign: 'center', marginBottom: '16px', fontWeight: 800 }}>
            Tailored Persona Presets
          </h3>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '64px', fontSize: 'var(--text-base)' }}>
            Switch presets in Demo Mode to experience custom-tailored AI communication.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Student */}
            <div className="glass-card" style={{ padding: '32px', borderLeft: '3px solid var(--neon-cyan)' }}>
              <span className="badge badge--cyan" style={{ marginBottom: '16px' }}>🎓 Student Mode</span>
              <h4 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '12px' }}>Arjun Mehta</h4>
              <ul style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', display: 'flex', flexDirection: 'column', gap: '8px', listStyleType: 'none' }}>
                <li>⚡ <strong>Work Style:</strong> Sprinter</li>
                <li>🎯 <strong>Motivation:</strong> Pressure-based</li>
                <li>💬 <strong>Tone:</strong> Casual, emoji-heavy</li>
                <li>🔥 Streak challenges and gamification focus.</li>
              </ul>
            </div>

            {/* Professional */}
            <div className="glass-card" style={{ padding: '32px', borderLeft: '3px solid var(--neon-purple)' }}>
              <span className="badge badge--purple" style={{ marginBottom: '16px' }}>💼 Professional Mode</span>
              <h4 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '12px' }}>Priya Sharma</h4>
              <ul style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', display: 'flex', flexDirection: 'column', gap: '8px', listStyleType: 'none' }}>
                <li>⚡ <strong>Work Style:</strong> Marathoner</li>
                <li>🎯 <strong>Motivation:</strong> Data-driven metrics</li>
                <li>💬 <strong>Tone:</strong> Polished, structured</li>
                <li>📈 Focused on quarterly reports and standup syncs.</li>
              </ul>
            </div>

            {/* Entrepreneur */}
            <div className="glass-card" style={{ padding: '32px', borderLeft: '3px solid var(--neon-pink)' }}>
              <span className="badge badge--pink" style={{ marginBottom: '16px' }}>🚀 Entrepreneur Mode</span>
              <h4 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '12px' }}>Karan Patel</h4>
              <ul style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', display: 'flex', flexDirection: 'column', gap: '8px', listStyleType: 'none' }}>
                <li>⚡ <strong>Work Style:</strong> Mixed hybrid</li>
                <li>🎯 <strong>Motivation:</strong> Encouragement</li>
                <li>💬 <strong>Tone:</strong> Energetic, hustle-driven</li>
                <li>💼 Focused on investor pitches and trademark filings.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--glass-border)', padding: '48px 24px', textAlign: 'center' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            <span>Built with</span> <Heart size={14} className="neon-text-pink" /> <span>and Google AI</span>
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', letterSpacing: '1px' }}>
            POWERED BY GEMINI 2.5 • STACKED WITH NEXT.JS & FIREBASE
          </div>
        </div>
      </footer>
    </div>
  );
}
