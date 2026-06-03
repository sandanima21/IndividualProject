import { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../firebase';
import axios from 'axios';

const API = 'http://localhost:8080/api/auth';

const toE164 = (raw) => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0'))  return '+94' + digits.slice(1);
  if (digits.startsWith('94')) return '+' + digits;
  return '+94' + digits;
};

// ─────────────────────────────────────────────────────────────────────────────

const PhoneVerificationModal = ({ token, onVerified, onSkip }) => {
  const [step, setStep]             = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone]           = useState('');
  const [otp, setOtp]               = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [visible, setVisible]       = useState(false);

  const verifierRef = useRef(null);

  // ── Fade-in ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  // ── RecaptchaVerifier lifecycle ───────────────────────────────────────────
  //
  // Rules:
  //  1. Created exactly once on mount.
  //  2. render() called exactly once here — sets _widgetId on the verifier.
  //  3. signInWithPhoneNumber → verify() checks _widgetId first. Because it
  //     is already set, verify() calls grecaptcha.execute() to fetch a fresh
  //     token WITHOUT calling render() again. This is how "already rendered"
  //     is permanently prevented.
  //  4. The same verifier instance is reused for every OTP send attempt.
  //  5. Cleanup runs only when the modal actually unmounts.

  useEffect(() => {
    const container = document.getElementById('kk-recaptcha');
    if (!container) {
      console.error('[PhoneVerify] #kk-recaptcha not found — add <div id="kk-recaptcha"></div> outside #root in index.html');
      return;
    }

    console.log('[PhoneVerify] Mount — creating RecaptchaVerifier');

    const createVerifier = () => {
      const el = document.getElementById('kk-recaptcha');
      if (el) el.innerHTML = '';

      const verifier = new RecaptchaVerifier(auth, 'kk-recaptcha', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          setError('reCAPTCHA expired — please try again.');
          createVerifier();
        },
        'error-callback': () => {
          setError('reCAPTCHA timed out — please try again.');
          createVerifier();
        },
      });

      verifierRef.current = verifier;
      verifier.render().catch((err) => {
        console.error('[PhoneVerify] render() failed:', err.code ?? err.message);
        setError('reCAPTCHA failed to load. Please refresh the page.');
      });
    };

    createVerifier();

    return () => {
      console.log('[PhoneVerify] Unmount — clearing RecaptchaVerifier');
      try { v.clear(); } catch (_) {}
      verifierRef.current = null;
      const el = document.getElementById('kk-recaptcha');
      if (el) el.innerHTML = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────

  const handleSend = async () => {
    setError('');
    const formatted = toE164(phone);
    if (formatted.length < 12) {
      setError('Enter a valid 9-digit Sri Lankan phone number.');
      return;
    }
    if (!verifierRef.current) {
      setError('reCAPTCHA is not ready. Please wait a moment and try again.');
      return;
    }

    console.log('[PhoneVerify] signInWithPhoneNumber →', formatted);
    setLoading(true);
    try {
      const result = await signInWithPhoneNumber(auth, formatted, verifierRef.current);
      console.log('[PhoneVerify] OTP sent — waiting for user input');
      setConfirmResult(result);
      setStep('otp');
    } catch (e) {
      console.error('[PhoneVerify] OTP send error:', e.code, e.message);
      setError(
        e.code === 'auth/invalid-phone-number'   ? 'Invalid phone number format.' :
        e.code === 'auth/too-many-requests'      ? 'Too many attempts. Please try again later.' :
        e.code === 'auth/operation-not-allowed'  ? 'Phone auth is not enabled in Firebase Console.' :
        e.code === 'auth/invalid-app-credential' ? 'reCAPTCHA validation failed — check Authorized Domains in Firebase Console → Authentication → Settings.' :
        e.code === 'auth/captcha-check-failed'   ? 'reCAPTCHA check failed. Please refresh and retry.' :
        `Could not send OTP (${e.code ?? 'unknown'}).`
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Confirm OTP → get Firebase token → call backend ──────────────

  const handleVerify = async () => {
    setError('');
    if (otp.length !== 6) { setError('Enter the 6-digit code.'); return; }

    console.log('[PhoneVerify] confirmResult.confirm() →', otp);
    setLoading(true);
    try {
      const credential    = await confirmResult.confirm(otp);
      const firebaseToken = await credential.user.getIdToken();
      console.log('[PhoneVerify] Firebase OTP confirmed — calling backend');

      await axios.post(
        `${API}/verify-phone`,
        { phone: toE164(phone), firebaseToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('[PhoneVerify] Backend accepted — invoking onVerified');
      onVerified(toE164(phone));
    } catch (e) {
      console.error('[PhoneVerify] OTP confirm error:', e.code, e.message);
      setError(
        e.code === 'auth/invalid-verification-code' ? 'Wrong code. Please check and try again.' :
        e.code === 'auth/code-expired'              ? 'Code expired. Please request a new one.' :
        e.response?.data?.error                     ? e.response.data.error :
        'Verification failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Dismiss ───────────────────────────────────────────────────────────────

  const handleSkip = () => {
    setVisible(false);
    setTimeout(onSkip, 280);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleSkip}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(6px)',
          transition: 'opacity 0.28s',
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Modal card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', left: '50%', top: '50%', zIndex: 2001,
          transform: visible ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-44%) scale(0.93)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease',
          width: '92%', maxWidth: 400,
          background: 'linear-gradient(145deg,#1a1a1a 0%,#161008 100%)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: 24,
          padding: '2.2rem 2rem',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          textAlign: 'center',
        }}
      >
        {/* Animated icon */}
        <div style={{
          width: 76, height: 76, borderRadius: '50%', margin: '0 auto 1.2rem',
          background: 'radial-gradient(circle,rgba(201,168,76,0.2) 0%,rgba(201,168,76,0.05) 70%)',
          border: '2px solid rgba(201,168,76,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.2rem',
          animation: step === 'otp' ? 'pulse-gold 2s infinite' : 'bounce-phone 1.8s infinite',
        }}>
          {step === 'phone' ? '📱' : '🔐'}
        </div>

        {/* ── Phone entry ──────────────────────────────────────────────────── */}
        {step === 'phone' && (
          <>
            <p style={{ color:'var(--gold)', fontWeight:700, letterSpacing:'0.16em', fontSize:'0.68rem', textTransform:'uppercase', marginBottom:8 }}>
              One Last Step
            </p>
            <h3 style={{ fontWeight:800, fontSize:'1.35rem', marginBottom:8, color:'#fff', lineHeight:1.25 }}>
              Verify Your Phone
            </h3>
            <p style={{ color:'rgba(240,236,224,0.55)', fontSize:'0.83rem', lineHeight:1.65, marginBottom:'1.8rem' }}>
              We'll send a quick OTP to confirm your number. You'll only need to do this once.
            </p>

            <div style={{ position:'relative', marginBottom:'0.9rem' }}>
              <div style={{
                position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                color:'var(--gold)', fontWeight:700, fontSize:'0.9rem', pointerEvents:'none',
                borderRight:'1px solid rgba(201,168,76,0.3)', paddingRight:10,
              }}>
                +94
              </div>
              <input
                type="tel"
                autoFocus
                placeholder="77 123 4567"
                value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g,'')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                style={{
                  width:'100%', padding:'0.75rem 1rem 0.75rem 3.5rem',
                  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(201,168,76,0.25)',
                  borderRadius:12, color:'#f0ece0', fontSize:'1.05rem', fontWeight:600,
                  outline:'none', letterSpacing:'0.06em', boxSizing:'border-box',
                  transition:'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.7)')}
                onBlur={e  => (e.target.style.borderColor = 'rgba(201,168,76,0.25)')}
              />
            </div>

            {error && <p style={{ color:'#f47373', fontSize:'0.78rem', marginBottom:'0.7rem' }}>{error}</p>}

            <button
              onClick={handleSend}
              disabled={loading || phone.length < 7}
              style={{
                width:'100%', padding:'0.8rem', borderRadius:12, border:'none',
                background: phone.length >= 7 ? 'var(--gold)' : 'rgba(201,168,76,0.25)',
                color:       phone.length >= 7 ? '#000'       : 'rgba(201,168,76,0.4)',
                fontWeight:700, fontSize:'0.95rem',
                cursor: phone.length >= 7 ? 'pointer' : 'not-allowed',
                transition:'all 0.2s', marginBottom:'0.75rem',
              }}
            >
              {loading
                ? <span className="spinner-border spinner-border-sm" />
                : <><i className="bi bi-send-fill me-2" style={{ fontSize:'0.85rem' }} />Send OTP</>}
            </button>

            <button
              onClick={handleSkip}
              style={{ background:'none', border:'none', color:'rgba(240,236,224,0.35)', fontSize:'0.78rem', cursor:'pointer', padding:4 }}
            >
              Skip for now →
            </button>
          </>
        )}

        {/* ── OTP entry ────────────────────────────────────────────────────── */}
        {step === 'otp' && (
          <>
            <p style={{ color:'var(--gold)', fontWeight:700, letterSpacing:'0.16em', fontSize:'0.68rem', textTransform:'uppercase', marginBottom:8 }}>
              Almost Done
            </p>
            <h3 style={{ fontWeight:800, fontSize:'1.35rem', marginBottom:8, color:'#fff', lineHeight:1.25 }}>
              Enter Your Code
            </h3>
            <p style={{ color:'rgba(240,236,224,0.55)', fontSize:'0.83rem', lineHeight:1.65, marginBottom:'1.8rem' }}>
              OTP sent to{' '}
              <span style={{ color:'var(--gold)', fontWeight:600 }}>+94 {phone}</span>
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="• • • • • •"
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g,'')); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              style={{
                width:'100%', padding:'0.85rem 1rem', marginBottom:'0.9rem',
                background:'rgba(255,255,255,0.05)', border:'1px solid rgba(201,168,76,0.25)',
                borderRadius:12, color:'#f0ece0', fontSize:'1.7rem', fontWeight:800,
                textAlign:'center', letterSpacing:'0.5em', outline:'none',
                boxSizing:'border-box', transition:'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.7)')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(201,168,76,0.25)')}
            />

            {error && <p style={{ color:'#f47373', fontSize:'0.78rem', marginBottom:'0.7rem' }}>{error}</p>}

            <button
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              style={{
                width:'100%', padding:'0.8rem', borderRadius:12, border:'none',
                background: otp.length === 6 ? 'var(--gold)' : 'rgba(201,168,76,0.25)',
                color:       otp.length === 6 ? '#000'       : 'rgba(201,168,76,0.4)',
                fontWeight:700, fontSize:'0.95rem',
                cursor: otp.length === 6 ? 'pointer' : 'not-allowed',
                transition:'all 0.2s', marginBottom:'0.75rem',
              }}
            >
              {loading
                ? <span className="spinner-border spinner-border-sm" />
                : <><i className="bi bi-shield-check-fill me-2" style={{ fontSize:'0.85rem' }} />Verify</>}
            </button>

            <button
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              style={{ background:'none', border:'none', color:'rgba(240,236,224,0.35)', fontSize:'0.78rem', cursor:'pointer', padding:4 }}
            >
              ← Change number
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes bounce-phone {
          0%,100% { transform: translateY(0) rotate(0deg); }
          25%      { transform: translateY(-8px) rotate(-6deg); }
          75%      { transform: translateY(-4px) rotate(4deg); }
        }
        @keyframes pulse-gold {
          0%,100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); }
          50%      { box-shadow: 0 0 0 12px rgba(201,168,76,0); }
        }
      `}</style>
    </>
  );
};

export default PhoneVerificationModal;
