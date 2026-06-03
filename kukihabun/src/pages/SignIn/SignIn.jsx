import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../firebase';
import { StoreContext } from '../../context/StoreContext';
import { googleSignIn } from '../../service/authservice';
import { assets } from '../../assets/assets';
import './SignIn.css';

const API = 'http://localhost:8080/api/auth';
const BG  = 'https://wallpapers.com/images/hd/noodles-3840-x-2160-background-agkp9dw91qxqxy8j.jpg';

const validatePassword = (pw) => {
  const errs = [];
  if (pw.length < 8)             errs.push('At least 8 characters');
  if (!/[A-Z]/.test(pw))         errs.push('One uppercase letter');
  if (!/[a-z]/.test(pw))         errs.push('One lowercase letter');
  if (!/[0-9]/.test(pw))         errs.push('One number');
  if (!/[^A-Za-z0-9]/.test(pw))  errs.push('One special character');
  return errs;
};

const formatCountdown = (secs) =>
  `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

/** Normalises raw Sri Lankan input to E.164 (+94...) */
const toE164 = (raw) => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0'))  return '+94' + digits.slice(1);
  if (digits.startsWith('94')) return '+' + digits;
  return '+94' + digits;
};

const Spinner = () => <span className="spinner-border spinner-border-sm me-2" />;

const GoogleBtn = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      width: '100%', padding: '0.6rem 1rem',
      background: '#fff', color: '#3c4043',
      border: 'none', borderRadius: 4,
      fontWeight: 500, fontSize: '0.9rem',
      cursor: 'pointer', fontFamily: 'Roboto, Arial, sans-serif',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    {label}
  </button>
);

const STEPS = ['Email', 'Verify', 'Profile', 'Phone'];

const SignIn = () => {
  const { login } = useContext(StoreContext);
  const navigate   = useNavigate();
  const location   = useLocation();
  const intendedPath = location.state?.from?.pathname;

  // ── Shared ────────────────────────────────────────────────────────────────────
  const [mode, setMode]       = useState('signin');
  const [loading, setLoading] = useState(false);

  // ── Sign-in ───────────────────────────────────────────────────────────────────
  const [loginForm, setLoginForm]   = useState({ email: '', password: '' });
  const [showLoginPw, setShowLoginPw] = useState(false);

  // ── Sign-up multi-step ────────────────────────────────────────────────────────
  // signupStep: 'email' → 'otp' → 'profile' → 'phone'
  const [signupStep, setSignupStep]   = useState('email');
  const [otpEmail, setOtpEmail]       = useState('');
  const [otp, setOtp]                 = useState('');
  const [otpError, setOtpError]       = useState('');
  const [countdown, setCountdown]     = useState(300);
  const [profile, setProfile]         = useState({ name: '', username: '', password: '', confirm: '' });
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwFocused, setPwFocused]     = useState(false);
  const countdownRef = useRef(null);

  // ── Step 4: Phone (Firebase SMS OTP) ─────────────────────────────────────────
  const [signupAuthData, setSignupAuthData] = useState(null);   // stored after account creation
  const [phoneNumber, setPhoneNumber]       = useState('');
  const [phoneOtp, setPhoneOtp]             = useState('');
  const [phoneError, setPhoneError]         = useState('');
  const [phoneOtpSent, setPhoneOtpSent]     = useState(false);
  const [confirmResult, setConfirmResult]   = useState(null);
  const verifierRef = useRef(null);

  // ── Email OTP countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (signupStep !== 'otp') return;
    setCountdown(300);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [signupStep]);

  // ── reCAPTCHA helpers ─────────────────────────────────────────────────────────

  // ── reCAPTCHA lifecycle (phone step only) ────────────────────────────────────
  //
  // Created and rendered exactly once when signupStep becomes 'phone'.
  // render() sets _widgetId on the verifier; signInWithPhoneNumber → verify()
  // skips render() when _widgetId is already set and calls execute() instead.
  // That is the only pattern that prevents "already rendered" permanently.

  useEffect(() => {
    if (signupStep !== 'phone') return;

    const container = document.getElementById('kk-recaptcha');
    if (!container) {
      console.error('[PhoneVerify/SignIn] #kk-recaptcha not found in DOM');
      return;
    }

    const createVerifier = () => {
      const el = document.getElementById('kk-recaptcha');
      if (el) el.innerHTML = '';

      const verifier = new RecaptchaVerifier(auth, 'kk-recaptcha', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          setPhoneError('reCAPTCHA expired — please try again.');
          createVerifier();
        },
        'error-callback': () => {
          setPhoneError('reCAPTCHA timed out — please try again.');
          createVerifier();
        },
      });

      verifierRef.current = verifier;
      verifier.render().catch((err) => {
        console.error('[PhoneVerify/SignIn] render() failed:', err.code ?? err.message);
        setPhoneError('reCAPTCHA failed to load. Please refresh the page.');
      });
    };

    createVerifier();

    return () => {
      try { verifierRef.current?.clear(); } catch (_) {}
      verifierRef.current = null;
      const el = document.getElementById('kk-recaptcha');
      if (el) el.innerHTML = '';
    };
  }, [signupStep]); // re-runs only when signupStep changes

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const finish = (data, isNew = false) => {
    login(
      { id: data.id, name: data.name, email: data.email,
        picture: data.picture, role: data.role, username: data.username,
        mustChangePassword: data.mustChangePassword, isNew,
        phone: data.phone || null, phoneVerified: data.phoneVerified || false },
      data.token
    );
    if (!isNew) toast.success(`Welcome back, ${data.name}!`);
    if (data.mustChangePassword)       navigate('/change-password', { replace: true });
    else if (data.role === 'DELIVERY') navigate('/delivery', { replace: true });
    else if (!isNew && intendedPath && intendedPath !== '/signin')
                                       navigate(intendedPath, { replace: true });
    else                               navigate('/', { replace: true });
  };

  const resetSignup = () => {
    setSignupStep('email');
    setOtpEmail(''); setOtp(''); setOtpError('');
    setProfile({ name: '', username: '', password: '', confirm: '' });
    clearInterval(countdownRef.current);
    setSignupAuthData(null);
    setPhoneNumber(''); setPhoneOtp(''); setPhoneError('');
    setPhoneOtpSent(false); setConfirmResult(null);
    // verifier cleanup handled by the signupStep useEffect when step leaves 'phone'
  };

  // ── Google sign-in ────────────────────────────────────────────────────────────
  const handleGoogle = async (accessToken) => {
    try {
      const data = await googleSignIn(accessToken);
      finish(data, data.newAccount === true);
    } catch (err) {
      if (!err.response) toast.error('Cannot reach server. Is the backend running?');
      else if (err.response.status === 401) toast.error('Google sign-in rejected. Try again.');
      else toast.error(`Google sign-in failed (${err.response.status}).`);
    }
  };

  const googleLogin = () => {
    const params = new URLSearchParams({
      response_type: 'token',
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirect_uri: window.location.origin,
      scope: 'openid email profile',
      prompt: 'select_account',
    });

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'google-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      toast.error('Popup blocked — please allow popups for this site.');
      return;
    }

    const listener = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'GOOGLE_OAUTH') return;
      window.removeEventListener('message', listener);
      handleGoogle(e.data.token);
    };
    window.addEventListener('message', listener);
  };

  // ── Sign-in submit ────────────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      finish((await axios.post(`${API}/login`, {
        usernameOrEmail: loginForm.email,
        password: loginForm.password,
      })).data);
    } catch (err) {
      toast.error(err.response?.status === 401 ? 'Invalid email or password.' : 'Login failed.');
    } finally { setLoading(false); }
  };

  // ── STEP 1: Send email OTP ────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/signup-email`, { email: otpEmail });
      setSignupStep('otp');
      toast.success('OTP sent! Check your inbox.');
    } catch (err) {
      if (err.response?.status === 409) toast.error('Email already registered. Please sign in.');
      else toast.error(err.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally { setLoading(false); }
  };

  // ── STEP 2: Verify email OTP ──────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setOtpError('Please enter the 6-digit code.'); return; }
    if (countdown === 0)  { setOtpError('OTP expired. Please request a new one.'); return; }
    setLoading(true); setOtpError('');
    try {
      await axios.post(`${API}/verify-email`, { email: otpEmail, otp });
      setSignupStep('profile');
      toast.success('Email verified!');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Verification failed.');
    } finally { setLoading(false); }
  };

  // ── STEP 3: Create account — do NOT navigate yet, go to phone step ────────────
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const pwErrors = validatePassword(profile.password);
    if (!profile.username.trim() || profile.username.length < 3) { toast.error('Username must be at least 3 characters.'); return; }
    if (pwErrors.length > 0)                  { toast.error('Password requirements not met.'); return; }
    if (profile.password !== profile.confirm) { toast.error('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const data = (await axios.post(`${API}/signup`, {
        name: profile.name,
        email: otpEmail,
        username: profile.username.trim().toLowerCase(),
        password: profile.password,
      })).data;
      setSignupAuthData(data);   // keep token so step 4 can call /verify-phone
      setSignupStep('phone');
    } catch (err) {
      if (err.response?.status === 409)      toast.error('Email already registered.');
      else if (err.response?.status === 403) toast.error('Email not verified. Please restart signup.');
      else toast.error('Account creation failed. Try again.');
    } finally { setLoading(false); }
  };

  // ── STEP 4a: Send SMS OTP via Firebase ────────────────────────────────────────
  const handlePhoneSend = async () => {
    setPhoneError('');
    const formatted = toE164(phoneNumber);
    if (formatted.length < 12) {
      setPhoneError('Enter a valid 9-digit Sri Lankan phone number.');
      return;
    }
    if (!verifierRef.current) {
      setPhoneError('reCAPTCHA is not ready. Please wait a moment and try again.');
      return;
    }

    console.log('[PhoneVerify/SignIn] signInWithPhoneNumber →', formatted);
    setLoading(true);
    try {
      const result = await signInWithPhoneNumber(auth, formatted, verifierRef.current);
      console.log('[PhoneVerify/SignIn] OTP sent — waiting for user input');
      setConfirmResult(result);
      setPhoneOtpSent(true);
    } catch (e) {
      console.error('[PhoneVerify/SignIn]', e.code, e.message);
      setPhoneError(
        e.code === 'auth/invalid-phone-number'   ? 'Invalid phone number format.' :
        e.code === 'auth/too-many-requests'      ? 'Too many attempts. Try again later.' :
        e.code === 'auth/operation-not-allowed'  ? 'Phone auth is not enabled. Contact support.' :
        e.code === 'auth/invalid-app-credential' ? 'reCAPTCHA validation failed — check Authorized Domains in Firebase Console → Authentication → Settings.' :
        e.code === 'auth/captcha-check-failed'   ? 'reCAPTCHA check failed. Please refresh and retry.' :
        `Could not send SMS (${e.code ?? 'unknown'}).`
      );
    } finally { setLoading(false); }
  };

  // ── STEP 4b: Confirm SMS OTP → save verified phone → finish registration ───────
  const handlePhoneVerify = async () => {
    setPhoneError('');
    if (phoneOtp.length !== 6) { setPhoneError('Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const verifiedPhone = toE164(phoneNumber);
      const credential    = await confirmResult.confirm(phoneOtp);
      const firebaseToken = await credential.user.getIdToken();
      await axios.post(
        `${API}/verify-phone`,
        { phone: verifiedPhone, firebaseToken },
        { headers: { Authorization: `Bearer ${signupAuthData.token}` } }
      );
      // Include the now-verified phone so App.jsx doesn't open a second phone modal
      finish({ ...signupAuthData, phone: verifiedPhone, phoneVerified: true }, true);
    } catch (e) {
      console.error('[PhoneVerify]', e.code, e.message);
      setPhoneError(
        e.code === 'auth/invalid-verification-code' ? 'Wrong code. Please check and try again.' :
        e.code === 'auth/code-expired'              ? 'Code expired. Request a new one.' :
        e.response?.data?.error                     ? e.response.data.error :
        'Verification failed. Please try again.'
      );
    } finally { setLoading(false); }
  };

  // User can skip phone verification (account is already created at this point)
  const handlePhoneSkip = () => finish(signupAuthData, true);

  const pwErrors   = validatePassword(profile.password);
  const timerColor = countdown <= 60 ? '#f47373' : countdown <= 120 ? '#f0a500' : '#c9a84c';
  const timerPct   = (countdown / 300) * 100;
  const stepIndex  = { email: 0, otp: 1, profile: 2, phone: 3 }[signupStep] ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="signin-page" style={{ backgroundImage: `url(${BG})` }}>
      <div className="signin-overlay" />
      <div className="signin-card">

        {/* Logo */}
        <div className="signin-logo">
          <img src={assets.logo} alt="KukiHabun" width={72} height={72} className="rounded-3" />
          <h4 className="mt-2 mb-0 fw-bold text-gold">KukiHabun</h4>
          <p className="small text-muted mb-0">Sri Lanka's finest flavours</p>
        </div>

        {/* ══ SIGN IN ════════════════════════════════════════════════════════════ */}
        {mode === 'signin' && (
          <div className="animate-fade-up">
            <h5 className="text-center fw-bold mb-4" style={{ color: 'var(--gold)' }}>Welcome Back</h5>

            <div className="google-wrap mb-4">
              <GoogleBtn onClick={googleLogin} label="Continue with Google" />
            </div>
            <div className="divider"><span>or continue with email</span></div>

            <form onSubmit={handleSignIn}>
              <input
                type="text" className="signin-input" placeholder="Username or email"
                value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} required
              />
              <div className="pw-wrap">
                <input
                  type={showLoginPw ? 'text' : 'password'} className="signin-input" placeholder="Password"
                  value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} required
                />
                <button type="button" className="pw-toggle" onClick={() => setShowLoginPw(v => !v)}>
                  <i className={`bi ${showLoginPw ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
              <button type="submit" className="signin-btn" disabled={loading}>
                {loading ? <Spinner /> : <i className="bi bi-box-arrow-in-right me-2" />}Sign In
              </button>
            </form>

            <p className="signin-switch">
              Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); resetSignup(); }}>Sign Up</button>
            </p>
          </div>
        )}

        {/* ══ SIGN UP ════════════════════════════════════════════════════════════ */}
        {mode === 'signup' && (
          <div className="animate-fade-up">

            {/* 4-step indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
              {STEPS.map((label, i) => {
                const done   = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700,
                      background: done ? 'var(--gold)' : active ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${done || active ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`,
                      color: done ? '#000' : active ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                    }}>
                      {done ? <i className="bi bi-check-lg" /> : i + 1}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: active ? 'var(--gold)' : 'rgba(255,255,255,0.3)', fontWeight: active ? 700 : 400 }}>
                      {label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div style={{ width: 12, height: 1, background: 'rgba(255,255,255,0.1)', marginLeft: 3 }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Step 1: Email entry ─────────────────────────────────────────── */}
            {signupStep === 'email' && (
              <>
                <h5 className="text-center fw-bold mb-1" style={{ color: 'var(--gold)' }}>Create Account</h5>
                <p className="text-center mb-3" style={{ color: 'rgba(240,236,224,0.5)', fontSize: '0.82rem' }}>
                  Enter your email — we'll send a verification code.
                </p>

                <div className="google-wrap mb-4">
                  <GoogleBtn onClick={googleLogin} label="Sign up with Google" />
                </div>
                <div className="divider"><span>or sign up with email</span></div>

                <form onSubmit={handleSendOtp}>
                  <input
                    type="email" className="signin-input" placeholder="Email address" autoFocus
                    value={otpEmail} onChange={e => setOtpEmail(e.target.value)} required
                  />
                  <button type="submit" className="signin-btn" disabled={loading}>
                    {loading ? <Spinner /> : <i className="bi bi-send-fill me-2" />}Send Verification Code
                  </button>
                </form>

                <p className="signin-switch">
                  Already have an account?{' '}
                  <button onClick={() => setMode('signin')}>Sign In</button>
                </p>
              </>
            )}

            {/* ── Step 2: Email OTP verification ──────────────────────────────── */}
            {signupStep === 'otp' && (
              <>
                <h5 className="text-center fw-bold mb-1" style={{ color: 'var(--gold)' }}>Check Your Email</h5>
                <p className="text-center mb-3" style={{ color: 'rgba(240,236,224,0.5)', fontSize: '0.82rem' }}>
                  We sent a 6-digit code to{' '}
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{otpEmail}</span>
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                  <svg width="88" height="88" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                    <circle
                      cx="44" cy="44" r="38" fill="none"
                      stroke={timerColor} strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 38}`}
                      strokeDashoffset={`${2 * Math.PI * 38 * (1 - timerPct / 100)}`}
                      transform="rotate(-90 44 44)"
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                    />
                    <text x="44" y="48" textAnchor="middle"
                      style={{ fill: timerColor, fontSize: '1.15rem', fontWeight: 800, fontFamily: 'monospace' }}>
                      {formatCountdown(countdown)}
                    </text>
                  </svg>
                  <p style={{ color: 'rgba(240,236,224,0.35)', fontSize: '0.72rem', marginTop: 4 }}>
                    {countdown > 0 ? 'Code expires in' : 'Code expired'}
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp}>
                  <input
                    type="text" inputMode="numeric" maxLength={6} autoFocus
                    className="signin-input" placeholder="• • • • • •"
                    value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                    style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem', fontWeight: 800 }}
                  />
                  {otpError && (
                    <p style={{ color: '#f47373', fontSize: '0.78rem', textAlign: 'center', marginBottom: 8 }}>
                      {otpError}
                    </p>
                  )}
                  <button type="submit" className="signin-btn"
                    disabled={loading || otp.length !== 6 || countdown === 0}>
                    {loading ? <Spinner /> : <i className="bi bi-shield-check-fill me-2" />}Verify Code
                  </button>
                </form>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <button
                    onClick={() => setSignupStep('email')}
                    style={{ background: 'none', border: 'none', color: 'rgba(240,236,224,0.4)', fontSize: '0.78rem', cursor: 'pointer' }}>
                    ← Change email
                  </button>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading || countdown > 240}
                    style={{ background: 'none', border: 'none', fontSize: '0.78rem', cursor: countdown <= 240 ? 'pointer' : 'default',
                      color: countdown <= 240 ? 'var(--gold)' : 'rgba(240,236,224,0.3)' }}>
                    Resend OTP
                  </button>
                </div>
              </>
            )}

            {/* ── Step 3: Name + Password ─────────────────────────────────────── */}
            {signupStep === 'profile' && (
              <>
                <h5 className="text-center fw-bold mb-1" style={{ color: 'var(--gold)' }}>Complete Your Profile</h5>
                <p className="text-center mb-3" style={{ color: 'rgba(240,236,224,0.5)', fontSize: '0.82rem' }}>
                  <i className="bi bi-check-circle-fill me-1" style={{ color: '#4caf50' }} />
                  {otpEmail}
                </p>

                <form onSubmit={handleCreateAccount}>
                  <input
                    className="signin-input" placeholder="Full Name" autoFocus required
                    value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className="signin-input" placeholder="Username (e.g. johndoe, min 3 chars)" required
                    value={profile.username}
                    onChange={e => setProfile(p => ({ ...p, username: e.target.value.replace(/\s/g, '').toLowerCase() }))}
                  />
                  <div className="pw-wrap">
                    <input
                      type={showPw ? 'text' : 'password'} className="signin-input"
                      placeholder="Create Password" required
                      value={profile.password}
                      onChange={e => setProfile(p => ({ ...p, password: e.target.value }))}
                      onFocus={() => setPwFocused(true)}
                      onBlur={() => setPwFocused(false)}
                    />
                    <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                      <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
                    </button>
                  </div>
                  {(pwFocused || profile.password) && (
                    <div className="pw-requirements">
                      {['At least 8 characters','One uppercase letter','One lowercase letter','One number','One special character'].map(rule => (
                        <div key={rule} className={`pw-rule ${!pwErrors.includes(rule) ? 'met' : ''}`}>
                          <i className={`bi ${!pwErrors.includes(rule) ? 'bi-check-circle-fill' : 'bi-circle'} me-1`} />
                          {rule}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pw-wrap">
                    <input
                      type={showConfirm ? 'text' : 'password'} className="signin-input"
                      placeholder="Confirm Password" required
                      value={profile.confirm}
                      onChange={e => setProfile(p => ({ ...p, confirm: e.target.value }))}
                    />
                    <button type="button" className="pw-toggle" onClick={() => setShowConfirm(v => !v)}>
                      <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`} />
                    </button>
                  </div>
                  <button type="submit" className="signin-btn" disabled={loading}>
                    {loading ? <Spinner /> : <i className="bi bi-person-check-fill me-2" />}Create Account
                  </button>
                </form>
              </>
            )}

            {/* ── Step 4: Phone verification (Firebase SMS OTP) ───────────────── */}
            {signupStep === 'phone' && (
              <>
                {!phoneOtpSent ? (
                  /* 4a — Phone number entry */
                  <>
                    <h5 className="text-center fw-bold mb-1" style={{ color: 'var(--gold)' }}>Verify Your Phone</h5>
                    <p className="text-center mb-4" style={{ color: 'rgba(240,236,224,0.5)', fontSize: '0.82rem' }}>
                      We'll send a one-time SMS to confirm your number.
                      <br />
                      <span style={{ fontSize: '0.76rem', color: 'rgba(240,236,224,0.3)' }}>
                        Delivery riders may need to reach you.
                      </span>
                    </p>

                    <div style={{ position: 'relative', marginBottom: '0.9rem' }}>
                      <div style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--gold)', fontWeight: 700, fontSize: '0.9rem', pointerEvents: 'none',
                        borderRight: '1px solid rgba(201,168,76,0.3)', paddingRight: 10,
                      }}>
                        +94
                      </div>
                      <input
                        type="tel" autoFocus
                        className="signin-input"
                        placeholder="77 123 4567"
                        value={phoneNumber}
                        onChange={e => { setPhoneNumber(e.target.value.replace(/\D/g, '')); setPhoneError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handlePhoneSend()}
                        style={{ paddingLeft: '3.6rem' }}
                      />
                    </div>

                    {phoneError && (
                      <p style={{ color: '#f47373', fontSize: '0.78rem', textAlign: 'center', marginBottom: 8 }}>
                        {phoneError}
                      </p>
                    )}

                    <button
                      className="signin-btn"
                      onClick={handlePhoneSend}
                      disabled={loading || phoneNumber.replace(/\D/g, '').length < 7}
                    >
                      {loading ? <Spinner /> : <i className="bi bi-send-fill me-2" />}Send SMS Code
                    </button>

                    <button
                      onClick={handlePhoneSkip}
                      style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none',
                        color: 'rgba(240,236,224,0.35)', fontSize: '0.78rem', cursor: 'pointer' }}>
                      Skip for now →
                    </button>
                  </>
                ) : (
                  /* 4b — OTP code entry */
                  <>
                    <h5 className="text-center fw-bold mb-1" style={{ color: 'var(--gold)' }}>Enter SMS Code</h5>
                    <p className="text-center mb-4" style={{ color: 'rgba(240,236,224,0.5)', fontSize: '0.82rem' }}>
                      Code sent to{' '}
                      <span style={{ color: 'var(--gold)', fontWeight: 600 }}>+94 {phoneNumber}</span>
                    </p>

                    <input
                      type="text" inputMode="numeric" maxLength={6} autoFocus
                      className="signin-input" placeholder="• • • • • •"
                      value={phoneOtp}
                      onChange={e => { setPhoneOtp(e.target.value.replace(/\D/g, '')); setPhoneError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handlePhoneVerify()}
                      style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem', fontWeight: 800 }}
                    />

                    {phoneError && (
                      <p style={{ color: '#f47373', fontSize: '0.78rem', textAlign: 'center', marginBottom: 8 }}>
                        {phoneError}
                      </p>
                    )}

                    <button
                      className="signin-btn"
                      onClick={handlePhoneVerify}
                      disabled={loading || phoneOtp.length !== 6}
                    >
                      {loading ? <Spinner /> : <i className="bi bi-shield-check-fill me-2" />}Verify Phone
                    </button>

                    <button
                      onClick={() => { setPhoneOtpSent(false); setPhoneOtp(''); setPhoneError(''); setConfirmResult(null); }}
                      style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none',
                        color: 'rgba(240,236,224,0.4)', fontSize: '0.78rem', cursor: 'pointer' }}>
                      ← Change number
                    </button>
                  </>
                )}
              </>
            )}

          </div>
        )}

        <p className="signin-legal">
          By continuing, you agree to our{' '}
          <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
