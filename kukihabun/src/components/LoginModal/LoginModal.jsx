import { useContext, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { StoreContext } from '../../context/StoreContext';
import { googleSignIn } from '../../service/authservice';
import './LoginModal.css';
import { assets } from '../../assets/assets';
import axios from 'axios';

const API = `${import.meta.env.VITE_API_URL}/api/auth`;

const LoginModal = ({ onLoginSuccess }) => {
  const { login } = useContext(StoreContext);
  const closeRef = useRef(null);
  const [tab, setTab] = useState('google');      // 'google' | 'manual'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'setpassword'
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [deliveryUserId, setDeliveryUserId] = useState('');

  const handleField = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const data = await googleSignIn(credentialResponse.credential);
      doLogin(data);
    } catch {
      toast.error('Google sign in failed. Please try again.');
    }
  };

  const doLogin = (data) => {
    login({ id: data.id, name: data.name, email: data.email, picture: data.picture, role: data.role, username: data.username }, data.token);
    toast.success(`Welcome, ${data.name}!`);
    closeRef.current?.click();
    onLoginSuccess?.(data);
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/login`, { usernameOrEmail: form.username, password: form.password });
      doLogin(res.data);
    } catch (err) {
      toast.error(err.response?.status === 401 ? 'Invalid credentials.' : 'Login failed.');
    } finally { setLoading(false); }
  };

  const handleManualSignup = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/signup`, { name: form.name, email: form.email, username: form.username, password: form.password });
      doLogin(res.data);
    } catch (err) {
      toast.error(err.response?.status === 409 ? 'Email or username already taken.' : 'Signup failed.');
    } finally { setLoading(false); }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/set-password`, { userId: deliveryUserId, password: form.password });
      doLogin(res.data);
    } catch {
      toast.error('Failed to set password. Check your user ID.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal fade" id="loginModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content kuki-modal">
          <div className="modal-header border-0 pb-0">
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" ref={closeRef} />
          </div>

          <div className="modal-body px-4 pb-4 pt-2 text-center">
            {/* Logo */}
            <div className="modal-logo mb-3">
              <img src={assets.logo} alt="KukiHabun" width={64} height={64} className="rounded-3" />
              <h5 className="modal-brand-name mt-2 mb-0">KukiHabun</h5>
              <p className="modal-brand-tagline">Sign in to start ordering</p>
            </div>

            {/* Tabs */}
            <div className="modal-tabs mb-4">
              <button className={`modal-tab ${tab === 'google' ? 'active' : ''}`} onClick={() => setTab('google')}>
                <i className="bi bi-google me-1"></i>Google
              </button>
              <button className={`modal-tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
                <i className="bi bi-person-lock me-1"></i>Manual
              </button>
            </div>

            {tab === 'google' && (
              <div className="animate-fade-up">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google sign in cancelled.')}
                  useOneTap shape="rectangular" theme="filled_black" size="large"
                  text="continue_with" logo_alignment="left"
                />
                <p className="text-muted mt-3 small">Use your Google account for quick access</p>
              </div>
            )}

            {tab === 'manual' && (
              <div className="animate-fade-up">
                {/* Sub-tabs */}
                <div className="d-flex justify-content-center gap-3 mb-3">
                  {['login', 'signup', 'setpassword'].map(m => (
                    <button
                      key={m}
                      className={`manual-sub-tab ${authMode === m ? 'active' : ''}`}
                      onClick={() => setAuthMode(m)}
                    >
                      {m === 'login' ? 'Sign In' : m === 'signup' ? 'Sign Up' : 'Set Password'}
                    </button>
                  ))}
                </div>

                {authMode === 'login' && (
                  <form onSubmit={handleManualLogin}>
                    <div className="mb-3 text-start">
                      <input name="username" className="form-control kuki-input" placeholder="Username or Email" value={form.username} onChange={handleField} required />
                    </div>
                    <div className="mb-3 text-start">
                      <input name="password" type="password" className="form-control kuki-input" placeholder="Password" value={form.password} onChange={handleField} required />
                    </div>
                    <button type="submit" className="btn btn-primary w-100 kuki-submit-btn" disabled={loading}>
                      {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-box-arrow-in-right me-2" />}
                      Sign In
                    </button>
                  </form>
                )}

                {authMode === 'signup' && (
                  <form onSubmit={handleManualSignup}>
                    <div className="mb-2 text-start">
                      <input name="name" className="form-control kuki-input" placeholder="Full Name" value={form.name} onChange={handleField} required />
                    </div>
                    <div className="mb-2 text-start">
                      <input name="email" type="email" className="form-control kuki-input" placeholder="Email" value={form.email} onChange={handleField} required />
                    </div>
                    <div className="mb-2 text-start">
                      <input name="username" className="form-control kuki-input" placeholder="Username" value={form.username} onChange={handleField} required />
                    </div>
                    <div className="mb-2 text-start">
                      <input name="password" type="password" className="form-control kuki-input" placeholder="Password" value={form.password} onChange={handleField} required />
                    </div>
                    <div className="mb-3 text-start">
                      <input name="confirmPassword" type="password" className="form-control kuki-input" placeholder="Confirm Password" value={form.confirmPassword} onChange={handleField} required />
                    </div>
                    <button type="submit" className="btn btn-primary w-100 kuki-submit-btn" disabled={loading}>
                      {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-person-plus me-2" />}
                      Create Account
                    </button>
                  </form>
                )}

                {authMode === 'setpassword' && (
                  <form onSubmit={handleSetPassword}>
                    <p className="small text-muted mb-3">Delivery personnel: enter the User ID provided by admin, then set your password.</p>
                    <div className="mb-2 text-start">
                      <input className="form-control kuki-input" placeholder="Your User ID (from admin)" value={deliveryUserId} onChange={e => setDeliveryUserId(e.target.value)} required />
                    </div>
                    <div className="mb-2 text-start">
                      <input name="password" type="password" className="form-control kuki-input" placeholder="New Password" value={form.password} onChange={handleField} required />
                    </div>
                    <div className="mb-3 text-start">
                      <input name="confirmPassword" type="password" className="form-control kuki-input" placeholder="Confirm Password" value={form.confirmPassword} onChange={handleField} required />
                    </div>
                    <button type="submit" className="btn btn-primary w-100 kuki-submit-btn" disabled={loading}>
                      {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-key me-2" />}
                      Set Password & Login
                    </button>
                  </form>
                )}
              </div>
            )}

            <p className="mt-3 small" style={{ color: 'var(--text-muted)' }}>
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-gold text-decoration-none">Terms</a>{' '}and{' '}
              <a href="/privacy" className="text-gold text-decoration-none">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
