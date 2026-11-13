import React, { useEffect, useMemo, useRef, useState } from 'react';

const WEDDING_DATE = new Date('2026-11-25T14:00:00+05:30');
const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=Tulips+Lawns+%26+Resort+Dhapewada+Nagpur';
const LOOP_MUSIC = true;

function Ornament({ className = '' }) {
  return <div className={`ornament ${className}`} aria-hidden="true"><span>✦</span><i>❧</i><span>✦</span></div>;
}

function Countdown() {
  const getTime = () => {
    const diff = Math.max(0, WEDDING_DATE.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };
  const [time, setTime] = useState(getTime);
  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="countdown" aria-label="Countdown to the wedding">
    {Object.entries(time).map(([label, value]) => <div className="count-box" key={label}>
      <strong>{String(value).padStart(2, '0')}</strong><span>{label}</span>
    </div>)}
  </div>;
}

function RSVPModal({ onClose }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot: real guests leave this empty.
  const [startedAt] = useState(() => Date.now());

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (website) return; // Silently ignore automated form fills.
    if (Date.now() - startedAt < 2500) {
      setError('Please take a moment to write your wishes, then try again.');
      return;
    }

    setSending(true);
    try {
      const payload = new URLSearchParams({
        name: name.trim(),
        wishes: note.trim(),
        website,
        elapsed: String(Date.now() - startedAt)
      });

      // Apps Script's ContentService response is cross-origin/opaque in browsers.
      // no-cors permits a simple form-encoded POST without a preflight request.
      await fetch('https://script.google.com/macros/s/AKfycbylO2g0q6f2-pSx6r4LhIpi0kHWUiY3JtPWLVCPKEnhfceqLvdDe4euiAiu9cl1ckYo/exec', {
        method: 'POST',
        mode: 'no-cors',
        body: payload
      });

      setSubmitted(true);
    } catch (err) {
      setError('We could not send your wishes. Please check your internet connection and try again.');
    } finally {
      setSending(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="rsvp-modal" role="dialog" aria-modal="true" aria-labelledby="rsvp-title">
      <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
      {!submitted ? <>
        <p className="eyebrow">A little note from you</p>
        <h2 id="rsvp-title">Send Your Wishes</h2>
        <p className="muted">Leave a heartfelt message for Dipti and Sunny.</p>
        <form onSubmit={submit} className="rsvp-form">
          <label>Your name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" /></label>
          <label>Your wishes<textarea required maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Write your wishes for the couple..." rows="4" /></label>
          <div className="rsvp-trap" aria-hidden="true">
            <label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary full" type="submit" disabled={sending}>
            {sending ? 'Sending your wishes…' : 'Send my wishes'}
          </button>
        </form>
        <p className="form-note">Your message will be added to the couple's private wedding wishes sheet.</p>
      </> : <>
        <p className="eyebrow">With gratitude</p>
        <h2>Thank you for your wishes!</h2>
        <p className="muted">Your message has been submitted. Thank you for being part of Dipti and Sunny's celebration.</p>
        <div className="response-preview">
          <strong>{name}</strong>
          <em>“{note}”</em>
        </div>
        <button className="button button-primary full" onClick={onClose}>Close</button>
      </>}
    </div>
  </div>;
}

function App() {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [musicNeedsTap, setMusicNeedsTap] = useState(false);
  const musicRef = useRef(null);
  const [entered, setEntered] = useState(false); // New state for the welcome screen
  const [isOpening, setIsOpening] = useState(false);
  const [resumeMusicAfterVideo, setResumeMusicAfterVideo] = useState(false);

  // Background music.
  // 1. Try to autoplay on load.
  // 2. If the browser blocks it, retry on the visitor's first real interaction.
  // 3. React state mirrors the audio element's real events, so the button
  //    label can never drift out of sync with what is actually playing.
  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;

    audio.volume = 0.55;

    // touchstart is deliberately NOT listed: browsers don't treat it as a
    // user gesture, so play() would be rejected again.
    const RETRY_EVENTS = ['pointerup', 'touchend', 'click', 'keydown', 'scroll', 'wheel', 'touchmove'];
    let attempting = false;
    let waiting = false;
    

    const tryPlay = async () => {
      if (attempting || !audio.paused) return;
      attempting = true;
      try {
        await audio.play();
      } catch (error) {
        if (error.name === 'NotAllowedError') {
          setMusicNeedsTap(true); // autoplay blocked: wait for a gesture
        } else if (error.name !== 'AbortError') {
          console.warn('Wedding music could not be played:', error, audio.src);
        }
      } finally {
        attempting = false;
      }
    };

    const onInteraction = (event) => {
      // The music button handles its own clicks via toggleMusic.
      if (event.target instanceof Element && event.target.closest('.music-toggle')) return;
      tryPlay();
    };

    const stopWaitingForInteraction = () => {
      if (!waiting) return;
      waiting = false;
      RETRY_EVENTS.forEach((type) => document.removeEventListener(type, onInteraction, true));
    };

    // Music is really playing: sync UI and stop listening for retries.
    // Because the listeners are gone after this, pausing never restarts it,
    // and a finished track is never restarted automatically.
    const handlePlaying = () => {
      setMusicOn(true);
      setMusicNeedsTap(false);
      stopWaitingForInteraction();
    };
    const handleStopped = () => setMusicOn(false);

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handleStopped);
    audio.addEventListener('ended', handleStopped);

    RETRY_EVENTS.forEach((type) => document.addEventListener(type, onInteraction, true));
    waiting = true;

    tryPlay(); // autoplay attempt on page load

    return () => {
      stopWaitingForInteraction();
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handleStopped);
      audio.removeEventListener('ended', handleStopped);
    };
  }, []);

  useEffect(() => {
  if (videoOpen || !resumeMusicAfterVideo) return;

  const audio = musicRef.current;
  if (!audio) return;

  audio.play()
    .then(() => {
      setMusicOn(true);
      setMusicNeedsTap(false);
      setResumeMusicAfterVideo(false);
    })
    .catch((error) => {
      console.warn("Could not resume background music:", error);
      setMusicNeedsTap(true);
    });
}, [videoOpen, resumeMusicAfterVideo]);

  // Fade sections and cards in as visitors scroll down the invitation.
  useEffect(() => {
    const items = document.querySelectorAll(
      '.section, .countdown-section, .blessing-band, .finale, .event-card, .family-card, .noddy-card, .venue-panel, .paper-card, .photo-frame'
    );
    items.forEach((item) => item.classList.add('reveal-on-scroll'));

    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  
async function enterSite() {
  if (isOpening || entered) return;

  setIsOpening(true);

  const audio = musicRef.current;
  if (audio && audio.paused) {
    try {
      await audio.play();
    } catch (error) {
      console.warn('Audio play failed:', error);
    }
  }

  // Allow the opening animation to finish before revealing the website.
  window.setTimeout(() => {
    setEntered(true);
  }, 1100);
}


  async function toggleMusic() {
    const audio = musicRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        setMusicNeedsTap(true);
      } else {
        console.warn('Wedding music could not be played:', error);
      }
    }
  }

  const nav = [
    ['The Couple', '#couple'], ['Our Invitation', '#invitation'],
    ['Celebrations', '#celebrations'], ['Family', '#family'], ['Venue', '#venue']
  ];

  return <div className="site-shell">
    {!entered && (
      <div
  className={`welcome-overlay ${isOpening ? 'is-opening' : ''}`}
  onClick={enterSite}
>
        <div className="welcome-content">
          <div className="hero-monogram">D<span>/</span>S</div>
          <p>Tap anywhere to open</p>
        </div>
      </div>
    )}
    <div className="topline"><span>॥ जय झूलेलाल ॥</span><span>॥ श्री गणेशाय नमः ॥</span></div>
    <header className="site-header">
      <a className="brand" href="#home" aria-label="Dipti and Sunny home"><span className="brand-mark">D<span>/</span>S</span><span className="brand-caption">A WEDDING CELEBRATION</span></a>
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button>
      <nav className={menuOpen ? 'nav open' : 'nav'}>
        {nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        <button className="nav-rsvp" onClick={() => {setRsvpOpen(true);setMenuOpen(false);}}>RSVP</button>
      </nav>
    </header>

    <main>
      <section className="hero" id="home">
        <div className="hero-wash"></div>
        <div className="hero-flower flower-left">✿</div><div className="hero-flower flower-right">❀</div>
        <div className="hero-content">
          <p className="eyebrow">With the blessings of our families</p>
          <div className="hero-monogram">D<span>/</span>S</div>
          <Ornament />
          <p className="script-kicker">Together with their families</p>
          <h1><span>Dipti</span><i>Weds</i><span>Sunny</span></h1>
          <p className="hero-date">Wednesday · 25th November 2026</p>
          <p className="hero-place">Nagpur, Maharashtra</p>
          <div className="hero-actions">
  <button
    className="button button-primary"
    onClick={() => setVideoOpen(true)}
  >
    ▶ Watch Invitation Video
  </button>
</div>

<a
  className="scroll-cue"
  href="#countdown"
  aria-label="Scroll to see more"
>
  <span>Scroll to see more</span>
  <span className="scroll-cue-icon" aria-hidden="true">
    <i />
  </span>
</a>
          <div className="hero-bottom-note">Your presence is our blessing</div>
        </div>
        <div className="hero-side-note">A DAY TO CHERISH · A LIFETIME TOGETHER</div>
      </section>

      <section className="countdown-section" id="countdown">
        <p className="eyebrow">The celebration begins in</p>
        <div className="countdown-date-highlight">
          <span className="date-label">SAVE THE DATE</span>
          <strong>Wednesday, 25 November 2026</strong>
        </div>
        <Countdown />
      </section>

      <section className="section couple-section" id="couple">
        <div className="section-inner split">
          <div className="couple-copy">
            <p className="eyebrow">Two families · One beautiful beginning</p>
            <h2>A new chapter<br/><em>begins with love.</em></h2>
            <Ornament />
            <p className="body-copy">With joyful hearts and the blessings of our loved ones, we invite you to celebrate as Dipti and Sunny begin their beautiful journey together.</p>
            <p className="small-caps">The Dalwani & Somyani Families</p>
          </div>
          <div className="photo-frame couple-frame">
            <img
              className="couple-photo"
              src={`${import.meta.env.BASE_URL}assets/couple.jpeg`}
              alt="Dipti and Sunny"
              loading="lazy"
            />
            <span className="frame-caption">A promise · A celebration · Forever</span>
          </div>
        </div>
      </section>

      <section className="blessing-band">
        <div className="blessing-item"><span className="deity-symbol">ॐ</span><p>॥ जय झूलेलाल ॥</p><small>May we be blessed</small></div>
        <div className="blessing-divider"></div>
        <div className="blessing-item"><span className="deity-symbol">श्री</span><p>॥ श्री गणेशाय नमः ॥</p><small>May all beginnings be auspicious</small></div>
      </section>

      <section className="section invitation-section" id="invitation">
        <div className="paper-card">
          <div className="paper-flower paper-flower-a">❀</div><div className="paper-flower paper-flower-b">✿</div>
          <p className="eyebrow">Your presence is our blessing</p>
          <h2 className="script-heading">A heartfelt invitation</h2>
          <Ornament />
          <p className="invitation-text">With the divine blessings of God, in loving memories of</p>
          <p className="memorial-names">Late Shri Lalchand Dalwani<br/>and Late Shri Dr. Anand Dalwani</p>
          <p className="invitation-text">and with the blessings of <strong>Smt. Usha L. Dalwani</strong>,</p>
          <p className="invitation-text">we cordially invite you and your family to grace the auspicious wedding ceremony of our beloved daughter</p>
          <div className="invitation-couple"><span>Dipti</span><i>Weds</i><span>Sunny</span></div>
          <div className="parents-grid">
            <p><small>BRIDE</small>D/o Smt. Vidya & Shri Deepak Dalwani</p>
            <p><small>GROOM</small>S/o Smt. Jayshree & Shri Harish Somyani</p>
          </div>
          <p className="paper-footer">With love, blessings & warm wishes</p>
        </div>
      </section>

      <section className="section events-section" id="celebrations">
        <div className="section-heading">
          <p className="eyebrow">Save the date</p>
          <h2>The Wedding <em>Celebrations</em></h2>
          <p className="body-copy">A day filled with rituals, laughter, blessings and memories.</p>
        </div>
        <div className="event-grid">
          <article className="event-card">
            <div className="event-icon">✧</div><p className="event-label">The arrival</p><h3>Baraat</h3><p className="event-time">2:00 PM</p><span className="event-rule"></span><p className="event-description">Join us as the celebrations begin with joy and music.</p>
          </article>
          <article className="event-card featured">
            <div className="event-icon">❀</div><p className="event-label">The wedding celebration</p><h3>Reception & Pheras</h3><p className="event-time">3:00 PM Onwards</p><span className="event-rule"></span><p className="event-description">Bless the couple as they begin their journey together.</p>
          </article>
        </div>
        <p className="event-date">Wednesday, 25th November 2026</p>
      </section>

      <section className="section family-section" id="family">
        <div className="section-heading">
          <p className="eyebrow">Surrounded by love</p><h2>Our <em>People</em></h2>
          <p className="body-copy">A celebration made beautiful by the people who have been part of our journey.</p>
        </div>
        <div className="family-columns">
          <div className="family-card">
            <span className="family-icon">❧</span><h3>With Love & Warm Wishes</h3>
            <ul>
              <li>Deepak & Vidya Dalwani</li>
              <li>Harish & Shraddha Dalwani</li>
              <li>Kamal & Roshani Mukhi</li>
              <li>Pravesh & Jiya Parvani</li>
              <li>Shubham & Jiya Dalwani</li>
              <li>and family</li>
            </ul>
          </div>
          <div className="family-card welcome-card">
            <span className="family-icon">♡</span><h3>A Warm Welcome From</h3>
            <p className="family-names">Tejas, Mahek, Mohit & Raavya</p>
            <div className="raavya-quote">“Meri Masi ki shaadi mein jarur jarur aanaaa!”</div>
            <p className="quote-credit">— Aapki chhoti si Raavya</p>
            <img
              className="raavya-photo"
              src={`${import.meta.env.BASE_URL}assets/raavya.jpeg`}
              alt="Raavya"
              loading="lazy"
            />
          </div>
        </div>
        <div className="noddy-card">
          <div className="noddy-photo">
            <img src={`${import.meta.env.BASE_URL}assets/noddy.jpeg`} alt="Noddy" loading="lazy" />
          </div>
          <div><p className="eyebrow">A place forever in our hearts</p><h3>The paws that walked beside us</h3><p className="noddy-line">Will forever remain in our hearts.</p><span className="quote-credit">— Noddy</span></div>
        </div>
        <p className="closing-line">Your presence with your family will be our pride and joy.</p>
      </section>

      <section className="section venue-section" id="venue">
        <div className="venue-panel">
          <div className="venue-copy">
            <p className="eyebrow">We can't wait to celebrate with you</p>
            <h2>Awaiting to <em>welcome you.</em></h2>
            <h3>Tulips Lawns & Resort</h3>
            <p>Dhapewada, Nagpur</p>
            <p className="venue-date">Wednesday, 25th November 2026<br/>Baraat · 2:00 PM<br/>Reception & Pheras · 3:00 PM Onwards</p>
            <a className="button button-primary" href={MAP_URL} target="_blank" rel="noreferrer">Get Directions ↗</a>
          </div>
          <div className="map-art"><div className="map-pin">✦</div><span>TULIPS LAWNS<br/>& RESORT</span><small>DHAPEWADA · NAGPUR</small></div>
        </div>
      </section>

      <section className="finale">
        <div className="finale-inner"><div className="hero-monogram">D<span>/</span>S</div><Ornament/>
          <p className="script-kicker">With love and gratitude</p><h2>We look forward<br/>to celebrating with you.</h2>
          <p>Your presence with your family will be our pride and joy.</p>
          <div className="finale-actions"><button className="button button-primary" onClick={() => setRsvpOpen(true)}>Send your wishes</button><a className="button button-outline" href="#home">Back to top ↑</a></div>
          <small>Dipti & Sunny · 25 November 2026</small>
        </div>
      </section>
    </main>

    <footer className="site-footer"><span>Made with love for Dipti & Sunny</span><span>॥ जय झूलेलाल ॥</span></footer>

        <audio
      ref={musicRef}
      src={`${import.meta.env.BASE_URL}assets/music.mp3`}
      loop={LOOP_MUSIC}
      preload="auto"
    />
    <button
  className="music-toggle"
  onClick={toggleMusic}
  aria-label={musicOn ? 'Pause wedding music' : 'Play wedding music'}
  aria-pressed={musicOn}
  title={musicOn ? 'Turn wedding music off' : 'Turn wedding music on'}
>
  {musicOn ? '♫ Pause music' : musicNeedsTap ? '♫ Play music' : '♫ Music off'}
</button>

{videoOpen && (
  <div
    className="modal-backdrop video-backdrop"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) {
        setVideoOpen(false);
      }
    }}
  >
    <div className="video-modal">
      <button
        className="modal-close"
        onClick={() => setVideoOpen(false)}
        aria-label="Close video"
      >
        ×
      </button>

      <video
        className="wedding-video-player"
        src={`${import.meta.env.BASE_URL}assets/wedding-video.mp4`}
        controls
        autoPlay
        playsInline
        preload="metadata"
        onPlay={() => {
          const backgroundMusic = musicRef.current;

          if (backgroundMusic && !backgroundMusic.paused) {
            setResumeMusicAfterVideo(true);
            backgroundMusic.pause();
            setMusicOn(false);
          }
        }}
      >
        Your browser does not support video playback.
      </video>
    </div>
  </div>
)}
    {rsvpOpen && <RSVPModal onClose={() => setRsvpOpen(false)} />}
  </div>;
}

export default App;