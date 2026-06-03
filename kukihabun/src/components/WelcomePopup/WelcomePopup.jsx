import React, { useEffect, useState } from 'react';
import './WelcomePopup.css';

const DISHES = ['🍛', '🍜', '🥘', '🍲', '🫕', '🍱'];

const WelcomePopup = ({ user, onDone }) => {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('stay'), 80);
    const t2 = setTimeout(() => setPhase('exit'), 4000);
    const t3 = setTimeout(() => onDone?.(), 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const isNew = user?.isNew;

  return (
    <div className={`wlc-overlay wlc-${phase}`} onClick={onDone}>
      <div className="wlc-bg-glow" />

      {/* Floating food particles */}
      {DISHES.map((d, i) => (
        <span key={i} className="wlc-float" style={{ '--i': i }}>{d}</span>
      ))}

      <div className="wlc-card" onClick={e => e.stopPropagation()}>
        {/* Burst ring */}
        <div className="wlc-ring">
          <div className="wlc-ring-inner">
            <span className="wlc-ring-emoji">🍛</span>
          </div>
        </div>

        <h2 className="wlc-heading">
          {isNew ? 'Welcome,' : 'Welcome back,'}<br />
          <span className="wlc-name">{firstName}!</span>
        </h2>

        {isNew ? (
          <>
            <p className="wlc-sub">You're officially part of the KukiHabun family.</p>
            <p className="wlc-tagline">Authentic Sri Lankan flavours, delivered with love ❤️</p>
          </>
        ) : (
          <p className="wlc-sub">Great to see you again! Ready to order?</p>
        )}

        <div className="wlc-strip">
          {[...DISHES, ...DISHES, ...DISHES].map((d, i) => <span key={i}>{d}</span>)}
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup;
