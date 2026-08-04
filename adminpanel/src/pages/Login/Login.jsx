import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../../assets/assets';

const API = `${import.meta.env.VITE_API_URL}/api/auth`;

const validatePassword = (pw) => {
  const errs = [];
  if (pw.length < 8)             errs.push('At least 8 characters');
  if (!/[A-Z]/.test(pw))         errs.push('One uppercase letter');
  if (!/[a-z]/.test(pw))         errs.push('One lowercase letter');
  if (!/[0-9]/.test(pw))         errs.push('One number');
  if (!/[^A-Za-z0-9]/.test(pw))  errs.push('One special character');
  return errs;
};

const Login = ({ onLogin }) => {
  const [view, setView] = useState('login'); // 'login' | 'forgot'
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  // ── Forgot password ──────────────────────────────────────────────────────────
  const [forgotStep, setForgotStep] = useState('email'); // 'email' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPw, setResetPw] = useState({ password: '', confirm: '' });

  const resetForgot = () => {
    setForgotStep('email');
    setForgotEmail(''); setResetOtp('');
    setResetPw({ password: '', confirm: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/login`, {
        usernameOrEmail: form.username,
        password: form.password,
      });
      if (data.role !== 'ADMIN') {
        toast.error('Access denied. Admin credentials only.');
        return;
      }
      onLogin(data);
    } catch (err) {
      toast.error(err.response?.status === 401 ? 'Invalid username or password.' : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/forgot-password`, { email: forgotEmail });
      setForgotStep('reset');
      toast.success('Reset code sent! Check your inbox.');
    } catch (err) {
      toast.error(err.response?.status === 404
        ? 'No account found with that email.'
        : err.response?.data?.error || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  // Deliberately does NOT call onLogin() with this response — this backend endpoint is
  // role-agnostic (any of customer/delivery/admin can reset via the same email lookup), so
  // auto-login here would bypass handleSubmit's `data.role !== 'ADMIN'` gate above and could
  // sign a non-admin account straight into the admin panel. Bounce back to the normal login
  // form instead and let its existing role check do the actual sign-in.
  const handleReset = async (e) => {
    e.preventDefault();
    const pwErrors = validatePassword(resetPw.password);
    if (resetOtp.length !== 6)                { toast.error('Enter the 6-digit code.'); return; }
    if (pwErrors.length > 0)                  { toast.error('Password must be 8+ chars with upper, lower, number, and special character.'); return; }
    if (resetPw.password !== resetPw.confirm) { toast.error('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/reset-password`, { email: forgotEmail, otp: resetOtp, newPassword: resetPw.password });
      toast.success('Password reset! Please sign in.');
      setView('login');
      resetForgot();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0c0c0c 0%, #16120a 100%)',
    }}>
      <div style={{
        width: 380, background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.25)',
        borderRadius: 20, padding: '2.5rem 2rem', boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>
        <div className="text-center mb-4">
          <img src={assets.logo} alt="KukiHabun" style={{ width: 64, height: 64, borderRadius: 14, marginBottom: 10 }} />
          <h4 className="fw-bold" style={{ color: 'var(--gold)' }}>KukiHabun Admin</h4>
          <p className="small text-muted mb-0">{view === 'login' ? 'Sign in to continue' : 'Reset your password'}</p>
        </div>

        {view === 'login' ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <input
                className="form-control"
                placeholder="Username"
                autoFocus
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                required
              />
            </div>
            <div className="mb-3">
              <input
                type="password"
                className="form-control"
                placeholder="Password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <div className="text-end mb-3">
              <button
                type="button"
                className="btn btn-link p-0"
                style={{ color: 'var(--gold)', fontSize: '0.82rem', textDecoration: 'none' }}
                onClick={() => { setView('forgot'); resetForgot(); }}
              >
                Forgot password?
              </button>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100 fw-semibold"
              style={{ padding: '0.7rem' }}
              disabled={loading}
            >
              {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              Sign In
            </button>
          </form>
        ) : forgotStep === 'email' ? (
          <form onSubmit={handleForgotEmail}>
            <p className="small text-muted text-center mb-3">
              Enter your admin account email — we'll send a reset code.
            </p>
            <div className="mb-3">
              <input
                type="email"
                className="form-control"
                placeholder="Email address"
                autoFocus
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 fw-semibold mb-3" style={{ padding: '0.7rem' }} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              Send Reset Code
            </button>
            <button type="button" className="btn btn-link w-100 p-0" style={{ color: 'rgba(240,236,224,0.5)', fontSize: '0.82rem', textDecoration: 'none' }}
              onClick={() => setView('login')}>
              ← Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <p className="small text-muted text-center mb-3">
              Enter the 6-digit code sent to <strong style={{ color: 'var(--gold)' }}>{forgotEmail}</strong>.
            </p>
            <div className="mb-3">
              <input
                type="text" inputMode="numeric" maxLength={6} autoFocus
                className="form-control text-center"
                style={{ letterSpacing: '0.5em', fontWeight: 700 }}
                placeholder="••••••"
                value={resetOtp}
                onChange={e => setResetOtp(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <div className="mb-3">
              <input
                type="password"
                className="form-control"
                placeholder="New password"
                value={resetPw.password}
                onChange={e => setResetPw(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <div className="mb-3">
              <input
                type="password"
                className="form-control"
                placeholder="Confirm new password"
                value={resetPw.confirm}
                onChange={e => setResetPw(p => ({ ...p, confirm: e.target.value }))}
                required
              />
            </div>
            <p className="small mb-3" style={{ color: 'rgba(240,236,224,0.4)' }}>
              8+ chars · uppercase · lowercase · number · special char
            </p>
            <button type="submit" className="btn btn-primary w-100 fw-semibold mb-3" style={{ padding: '0.7rem' }} disabled={loading || resetOtp.length !== 6}>
              {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              Reset Password
            </button>
            <div className="d-flex justify-content-between">
              <button type="button" className="btn btn-link p-0" style={{ color: 'rgba(240,236,224,0.5)', fontSize: '0.78rem', textDecoration: 'none' }}
                onClick={() => setForgotStep('email')}>
                ← Change email
              </button>
              <button type="button" className="btn btn-link p-0" style={{ color: 'var(--gold)', fontSize: '0.78rem', textDecoration: 'none' }}
                onClick={handleForgotEmail} disabled={loading}>
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
