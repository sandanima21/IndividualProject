import React, { useEffect, useState } from 'react';
import './WelcomeOverlay.css';

const DISHES = ['🍛', '🍜', '🥘', '🍲', '🫕'];

const WelcomeOverlay = ({ name, onDone }) => {
  const [phase, setPhase] = useState('enter'); // enter → show → exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 100);
    const t2 = setTimeout(() => setPhase('exit'), 3800);
    const t3 = setTimeout(onDone, 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const firstName = name?.split(' ')[0] || 'there';

  return (
    <div className={`welcome-overlay welcome-${phase}`}>
      <div className="welcome-content">
        {/* Floating dish emojis */}
        {DISHES.map((d, i) => (
          <span key={i} className="welcome-float" style={{ '--i': i }}>{d}</span>
        ))}

        {/* Logo burst */}
        <div className="welcome-logo-ring">
          <div className="welcome-logo-inner">🍛</div>
        </div>

        <h1 className="welcome-heading">Welcome,<br /><span>{firstName}!</span></h1>
        <p className="welcome-sub">You're part of the KukiHabun family now.</p>
        <p className="welcome-tagline">Authentic Sri Lankan flavours, delivered with love.</p>

        {/* Animated food strip */}
        <div className="welcome-strip">
          {[...DISHES, ...DISHES, ...DISHES].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeOverlay;
