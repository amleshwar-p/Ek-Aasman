import { ImageResponse } from 'next/og';

// The picture WhatsApp, Instagram and others show when someone shares the link.
// Drawn once at build time. No counts or names on it, so it never shows anything that isn't real.
export const alt = 'Ek Aasmaan: one Diwali night sky for all of India';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TITLE = 'एक आसमान';
const EYEBROW = 'DIWALI 2026 · 6 TO 10 NOVEMBER';
const TAG = 'Ek Bharat. Ek Aasmaan.';
const LINE = 'Light diyas, burst crackers and send your name up in a rocket, with all of India.';

// Google Fonts sends a TTF (which the image renderer needs) when asked from a server, trimmed to `text`.
async function font(family: string, text: string) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`Could not load font ${family}`);
  return (await fetch(url)).arrayBuffer();
}

// a firework burst: a soft glow with sparks around it
function Burst({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const sparks = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2, d = r * (0.62 + (i % 3) * 0.12);
    return <div key={i} style={{ position: 'absolute', left: x + Math.cos(a) * d - 3, top: y + Math.sin(a) * d - 3, width: 6, height: 6, borderRadius: 3, background: color, boxShadow: `0 0 12px 3px ${color}` }} />;
  });
  return (
    <>
      <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundImage: `radial-gradient(circle, ${color}55 0%, ${color}00 70%)` }} />
      {sparks}
    </>
  );
}

const STARS = [[60, 60], [330, 40], [420, 300], [880, 50], [1140, 70], [260, 330], [960, 310], [1170, 260], [40, 300], [760, 30]];
const ROOFS = [60, 110, 80, 140, 95, 125, 70, 150, 105, 85, 135, 80, 115, 150, 90, 110];

export default async function Image() {
  const [tiro, mukta, muktaBold] = await Promise.all([
    font('Tiro+Devanagari+Hindi', TITLE + TAG),
    font('Mukta:wght@500', LINE + EYEBROW),
    font('Mukta:wght@700', EYEBROW)
  ]);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden',
        backgroundImage: 'linear-gradient(180deg, #07060F 0%, #140C24 60%, #2A1430 100%)', fontFamily: 'Mukta', color: '#F3ECE0' }}>
        {STARS.map(([x, y], i) => <div key={i} style={{ position: 'absolute', left: x, top: y, width: 3, height: 3, borderRadius: 2, background: '#FFF3DE', opacity: 0.7 }} />)}
        {/* fireworks at the sides, so the centre (what a square crop keeps) stays readable */}
        <Burst x={150} y={190} r={105} color="#FF8DA3" />
        <Burst x={1050} y={170} r={115} color="#F6A93B" />
        <Burst x={1095} y={385} r={55} color="#FFD99A" />

        {/* rooftops along the bottom, with a string of diya lights */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 190, display: 'flex', alignItems: 'flex-end' }}>
          {ROOFS.map((h, i) => <div key={i} style={{ width: 75, height: h, background: i % 2 ? '#0D0918' : '#110C1E', borderTop: '1px solid rgba(255,236,210,.08)' }} />)}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 34, display: 'flex', justifyContent: 'space-around' }}>
          {Array.from({ length: 24 }, (_, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: '#FFD99A', boxShadow: '0 0 14px 4px rgba(246,169,59,.85)' }} />)}
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, top: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#F6A93B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 13.5h17c0 3.3-3.8 5.5-8.5 5.5s-8.5-2.2-8.5-5.5z" />
              <path d="M12 4.5c1.7 1.9 2.4 3.3 2.4 4.5a2.4 2.4 0 0 1-4.8 0c0-1.2.7-2.6 2.4-4.5z" />
            </svg>
            <div style={{ fontFamily: 'Mukta Bold', fontSize: 24, letterSpacing: 4, color: '#FFD99A' }}>{EYEBROW}</div>
          </div>
          <div style={{ fontFamily: 'Tiro', fontSize: 128, lineHeight: 1.1, marginTop: 10, whiteSpace: 'nowrap', color: '#FFF3DE', textShadow: '0 0 40px rgba(246,169,59,.45)' }}>{TITLE}</div>
          <div style={{ fontFamily: 'Tiro', fontSize: 38, color: '#D0C6DB', marginTop: -2 }}>{TAG}</div>
          <div style={{ fontSize: 28, lineHeight: 1.4, color: '#D0C6DB', marginTop: 18, maxWidth: 720 }}>{LINE}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Tiro', data: tiro, style: 'normal', weight: 400 },
        { name: 'Mukta', data: mukta, style: 'normal', weight: 500 },
        { name: 'Mukta Bold', data: muktaBold, style: 'normal', weight: 700 }
      ]
    }
  );
}
