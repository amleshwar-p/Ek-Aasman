import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy · Ek Aasmaan' };

export default function Privacy() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px max(16px, env(safe-area-inset-left, 0px)) 64px', color: 'var(--ink)', overflow: 'auto', height: '100%', lineHeight: 1.6 }}>
      <p className="eyebrow">Ek Aasmaan</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 40, margin: '0 0 16px' }}>Privacy</h1>
      <p>Ek Aasmaan is a free Diwali project. There are no accounts, no payments and no ads.</p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>What we keep</h2>
      <ul>
        <li>The name, city and state you type when you join. Your name appears on the leaderboard and on any named rocket you send.</li>
        <li>Your points and how many lights you added, so the leaderboards and the India-wide counter work.</li>
        <li>A random id stored in your browser, used to count how many people are online. It is not linked to you.</li>
      </ul>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>What we don&apos;t keep</h2>
      <p>No email, phone number, password, location or contacts. We don&apos;t sell or share anything.</p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>How long</h2>
      <p>We keep it only for Diwali 2026. Once the celebrations end and the totals are announced, we delete it.</p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>Questions or removal</h2>
      <p>Write to <a href="mailto:amleshwar.pa@gmail.com" style={{ color: 'var(--marigold-soft)' }}>amleshwar.pa@gmail.com</a> and we will remove your name.</p>
      <p style={{ marginTop: 32 }}><a href="/" style={{ color: 'var(--marigold-soft)' }}>Back to the sky</a></p>
    </main>
  );
}
