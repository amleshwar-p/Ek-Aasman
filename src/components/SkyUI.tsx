'use client';
import { useEffect } from 'react';
import { CITIES, STATES } from '@/lib/india';

// All the page markup. The 3D engine (src/sky/engine.js) finds these elements by id and drives them;
// React renders them once and leaves them alone.
export default function SkyUI() {
  useEffect(() => {
    import('@/sky/engine').then((m) => m.startSky());
  }, []);
  return (
    <>
      <canvas id="scene" role="img" aria-label="An Indian city on Diwali, following Indian time from day to night. Click the sky to launch fireworks. In Sky view, drag to fly around the city."></canvas>
      <div className="vignette" aria-hidden="true"></div>
      <div className="labels" id="labels" aria-hidden="true"><div className="pin" id="pin">Your home</div></div>
      <div className="veil" id="veil" aria-hidden="true"></div>
      
      <div className="ui">
        <header className="bar">
          <div className="bar-left">
            <div className="brand">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 13.5h17c0 3.3-3.8 5.5-8.5 5.5s-8.5-2.2-8.5-5.5z"/><path d="M12 4.5c1.7 1.9 2.4 3.3 2.4 4.5a2.4 2.4 0 0 1-4.8 0c0-1.2.7-2.6 2.4-4.5z"/></svg>
              <span className="txt">Ek Aasmaan</span><span className="dev hide-md" lang="hi">एक आसमान</span>
            </div>
            <span className="online"><span className="dot"></span><b id="onlineN">–</b><span className="w">online now</span></span>
          </div>
          <div className="bar-right">
            <div className="hud hit" id="hud" hidden>
              <span><b id="hudPts">0</b> pts</span><span className="sep rank"></span>
              <span className="rank">Rank <b id="hudRank">#1,212</b></span>
            </div>
            <div className="seg hit" role="group" aria-label="Camera view">
              <button type="button" id="vRoof" aria-pressed="true" aria-label="Rooftop view">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/></svg><span className="lb">Rooftop</span></button>
              <button type="button" id="vSky" aria-pressed="false" aria-label="Sky view: fly around the city">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 13 12.5-7 2 3.5L5 16.5z"/><path d="m15.5 6 2.5-1.4 2 3.5-2.5 1.4"/><path d="M10 15.5 8 21M11 15l3 6"/></svg><span className="lb">Sky view</span></button>
            </div>
            <button className="chip hit" id="btnRanks" type="button" hidden>Ranks</button>
            <button className="chip hit" id="btnKit" type="button" hidden>My kit</button>
            <button className="chip chip--warm hit" id="btnDecor" type="button" aria-label="Decorate: rangoli and home">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M12 3c1.5 2 1.5 4 0 6-1.5-2-1.5-4 0-6zM12 15c1.5 2 1.5 4 0 6-1.5-2-1.5-4 0-6zM3 12c2-1.5 4-1.5 6 0-2 1.5-4 1.5-6 0zM15 12c2-1.5 4-1.5 6 0-2 1.5-4 1.5-6 0z"/></svg><span className="lb">Decorate</span></button>
            <button className="chip chip--warm chip--test hit" id="btnTime" type="button" aria-expanded="false" aria-controls="timepop" aria-label="Daylight test: change the time of day">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg><span className="lb">Daylight</span></button>
            <button className="chip hit" id="btnSound" type="button" aria-pressed="true" aria-label="Sound on">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path id="sndWave" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>
            </button>
            <button className="chip chip--solid hit" id="btnSignin" type="button">Join</button>
          </div>
        </header>
      
        <main className="stage">
          <section className="hero" id="hero" aria-labelledby="heroTitle">
            <p className="eyebrow">Diwali 2026 · 6 to 10 November</p>
            <h1 id="heroTitle" lang="hi">एक आसमान</h1>
            <p className="tag">Ek Bharat. Ek Aasmaan.</p>
            <p className="lede">One night sky for all of India. Light diyas, burst crackers, draw your rangoli and send your name up in a rocket, right alongside everyone else.</p>
            <div className="cta">
              <button className="btn btn--primary hit" id="btnStart" type="button">Open my free kit</button>
              <button className="btn btn--ghost hit" id="btnMahadeep" type="button">Watch the Mahadeep moment</button>
            </div>
            <p className="fine">Free for everyone. Rockets every 30 seconds, crackers every 45 seconds.</p>
            <p className="fine only-sm">Every 1 lakh lights = 100 real diyas for families and mandirs. <button className="linkbtn hit" type="button" data-support>How it works</button></p>
          </section>
      
          <aside className="live hit" id="live" aria-label="Live across India">
            <div className="live-head"><span className="dot"></span>Lights across India</div>
            <div className="live-num" id="liveNum">–</div>
            <div className="live-sub">Next shagun goal: <b id="goalN">51,000</b></div>
            <div className="meter"><span id="goalBar"></span></div>
            <div className="pledge">
              <p id="pledgeTxt">Every <b>1,00,000 lights</b> here becomes <b>100 real diyas</b> for families and mandirs.</p>
              <div className="meter"><span id="pledgeBar"></span></div>
              <button className="linkbtn" type="button" data-support>How it works and how to help</button>
            </div>
            <div className="feed-head">In the sky now</div>
            <ol className="feed" id="feed" aria-live="polite"></ol>
          </aside>
        </main>
      
        <footer className="foot">
          <div className="center">
            <div className="hint" id="hint">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v4"/></svg>
              <span id="hintText">Click anywhere in the sky to send up a rocket</span>
            </div>
            <nav className="dock hit" id="dock" aria-label="Your crackers" hidden></nav>
          </div>
          <div className="countdown" id="countdown">Mahadeep moment in <b id="cd">–</b><span>8 Nov · all of India lights one diya together</span></div>
        </footer>
      </div>
      
      <div className="timepop" id="timepop" hidden role="dialog" aria-label="Time of day test controls">
        <p className="tp-h">Test · time of day (IST)</p>
        <div className="tp-now"><b id="tpClock">--:--</b><span id="tpMode">Live</span></div>
        <div className="tp-sun" id="tpSun">Sun: –</div>
        <input type="range" id="tpSlider" min="0" max="1439" step="1" defaultValue="720" aria-label="Time of day in India" />
        <div className="tp-btns" role="group" aria-label="Presets">
          <button type="button" data-t="live" aria-pressed="true">Live</button>
          <button type="button" data-t="450" aria-pressed="false">7:30 am</button>
          <button type="button" data-t="750" aria-pressed="false">12:30 pm</button>
          <button type="button" data-t="1050" aria-pressed="false">5:30 pm</button>
          <button type="button" data-t="1260" aria-pressed="false">9 pm</button>
        </div>
        <button type="button" className="btn btn--ghost" id="tpPlay" style={{ height: '44px', fontSize: '15px' }}>Play the sunset (4:45 to 7:15 pm)</button>
      </div>
      
      <div className="combo" id="combo" aria-hidden="true">Combo ×1.5</div>
      <div className="moment" id="moment" aria-live="polite"><div className="big" lang="hi">महादीप</div><p>8 November, 6:29 pm. Everyone lights one diya in the same second.</p></div>
      <div className="toast" id="toast" role="status"></div>
      <div className="nudge" id="nudge" hidden role="status">
        <p>You've added 10 lights to India's sky. Every 1 lakh lights becomes 100 real diyas for families and mandirs.</p>
        <div className="nudge-row"><button className="linkbtn" type="button" data-support>See how it works</button>
          <button className="iconbtn sm" id="nudgeX" type="button" aria-label="Dismiss"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      </div>
      <div className="scrim" id="scrim"></div>
      <aside className="drawer" id="drawer" aria-hidden="true" inert>
        <div className="dr-head"><h2 id="drTitle">Ranks</h2><button className="iconbtn" id="drClose" type="button" aria-label="Close panel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
        <div id="drContent" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}></div>
      </aside>
      
      <div className="joinwrap" id="join" hidden role="dialog" aria-modal="true" aria-labelledby="joinTitle">
        <form className="join" id="joinForm" noValidate>
          <button className="iconbtn x" id="joinX" type="button" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
          <p className="eyebrow">Join the sky</p>
          <h2 id="joinTitle">Who is lighting up tonight?</h2>
          <p className="para" style={{ margin: 0 }}>No sign-up. Your name goes on your named rockets and the leaderboard, and your city adds to its total.</p>
          <div className="field"><label htmlFor="jName">Your name</label><input id="jName" name="name" type="text" maxLength={20} autoComplete="given-name" required placeholder="Aditya" /></div>
          <div className="row2">
            <div className="field"><label htmlFor="jCity">City</label><input id="jCity" name="city" type="text" maxLength={30} list="cityList" autoComplete="address-level2" required placeholder="Kanpur" /></div>
            <div className="field"><label htmlFor="jState">State</label><select id="jState" name="state" required><option value="">Choose</option>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <datalist id="cityList">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
          <p className="msg err" id="joinErr" role="alert"></p>
          <button className="btn btn--primary" id="joinGo" type="submit">Open my free kit</button>
          <p className="note" style={{ margin: 0 }}>We keep only your name, city and state. No email, no phone number. <a href="/privacy" target="_blank" style={{ color: 'var(--marigold-soft)' }}>Privacy</a></p>
        </form>
      </div>
      
      <div className="studio" id="studio" hidden role="dialog" aria-modal="true" aria-labelledby="stTitle">
        <div className="st-wrap">
          <header className="st-head">
            <div><p className="eyebrow">Decorate</p><h2 id="stTitle">Draw your rangoli</h2></div>
            <div className="st-head-r">
              <div className="st-tabs" role="tablist" aria-label="Decorate">
                <button type="button" role="tab" id="tabRg" aria-selected="true" aria-controls="stRangoli">Rangoli</button>
                <button type="button" role="tab" id="tabHome" aria-selected="false" aria-controls="stHome">My home</button>
              </div>
              <button className="iconbtn" id="stClose" type="button" aria-label="Close and go back to the sky"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>
          </header>
      
          <div className="st-body" id="stRangoli" role="tabpanel" aria-labelledby="tabRg">
            <div className="st-stage">
              <div className="st-canvas">
                <canvas id="rgBg" width="1024" height="1024" aria-hidden="true"></canvas>
                <canvas id="rgArt" width="1024" height="1024" aria-hidden="true"></canvas>
                <canvas id="rgGuide" width="1024" height="1024" role="img" aria-label="Rangoli drawing area. Drag to draw; every stroke is mirrored around the centre."></canvas>
              </div>
            </div>
            <div className="st-tools">
              <div className="tg"><h3>Tool</h3>
                <div className="tools" role="group" aria-label="Tool">
                  <button type="button" className="tool" data-tool="powder" aria-pressed="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20c3 0 4-2 5-4l9-9a2 2 0 0 0-3-3l-9 9c-2 1-4 2-4 5"/><circle cx="17" cy="17" r=".6"/><circle cx="20" cy="14" r=".6"/><circle cx="14" cy="20" r=".6"/></svg>Powder</button>
                  <button type="button" className="tool" data-tool="ring" aria-pressed="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1"/></svg>Ring</button>
                  <button type="button" className="tool" data-tool="petal" aria-pressed="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M12 21C7 16 7 8 12 3c5 5 5 13 0 18z"/><path d="M12 7v10"/></svg>Petals</button>
                  <button type="button" className="tool" data-tool="dots" aria-pressed="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6" cy="6" r="1.6"/><circle cx="12" cy="6" r="1.6"/><circle cx="18" cy="6" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/><circle cx="6" cy="18" r="1.6"/><circle cx="12" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/></svg>Dots</button>
                  <button type="button" className="tool" data-tool="diya" aria-pressed="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 13.5h17c0 3.3-3.8 5.5-8.5 5.5s-8.5-2.2-8.5-5.5z"/><path d="M12 4.5c1.7 1.9 2.4 3.3 2.4 4.5a2.4 2.4 0 0 1-4.8 0c0-1.2.7-2.6 2.4-4.5z"/></svg>Diya</button>
                  <button type="button" className="tool" data-tool="erase" aria-pressed="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="m7 21-4-4 11-11 7 7-8 8z"/><path d="M7 21h13M9 11l7 7"/></svg>Erase</button>
                </div>
              </div>
              <div className="tg"><h3 id="colLbl">Colour</h3><div className="sws" id="sws" role="group" aria-labelledby="colLbl"></div></div>
              <div className="tg"><h3><label htmlFor="rgSize">Size</label></h3><input type="range" id="rgSize" min="6" max="48" defaultValue="18" /></div>
              <div className="tg"><h3 id="symLbl">Mirror around the centre</h3>
                <div className="chips" id="symChips" role="group" aria-labelledby="symLbl"></div>
              </div>
              <div className="tg"><h3>Start from a pattern</h3><div className="patterns" id="patterns"></div></div>
              <div className="st-actions">
                <button type="button" className="btn btn--ghost" id="rgUndo">Undo</button>
                <button type="button" className="btn btn--ghost" id="rgClear">Clear</button>
              </div>
              <div className="st-place">
                <button type="button" className="btn btn--primary" id="rgPlace">Place on my terrace · +15 pts</button>
                <p>It appears on your terrace floor. Anyone flying past your home in Sky view sees it too.</p>
              </div>
            </div>
          </div>
      
          <div className="st-body" id="stHome" role="tabpanel" aria-labelledby="tabHome" hidden>
            <div style={{ display: 'grid', gap: '22px', gridColumn: '1 / -1' }}>
              <p className="home-note">Your changes show straight away on your terrace and on your house in Sky view. Switch to Daylight to see the paint.</p>
              <div className="home-grid">
                <div className="opt" role="group" aria-labelledby="hLights"><h3 className="tp-h" id="hLights">Fairy lights</h3><div id="optLights" style={{ display: 'grid', gap: '6px' }}></div></div>
                <div className="opt" role="group" aria-labelledby="hKandil"><h3 className="tp-h" id="hKandil">Akash kandil</h3><div id="optKandil" style={{ display: 'grid', gap: '6px' }}></div></div>
                <div className="opt" role="group" aria-labelledby="hPaint"><h3 className="tp-h" id="hPaint">House paint</h3><div id="optPaint" style={{ display: 'grid', gap: '6px' }}></div></div>
                <div className="opt" role="group" aria-labelledby="hGar"><h3 className="tp-h" id="hGar">Parapet garland</h3><div id="optGar" style={{ display: 'grid', gap: '6px' }}></div></div>
              </div>
              <div><button type="button" className="btn btn--primary" id="homeDone">See it on my terrace</button></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
