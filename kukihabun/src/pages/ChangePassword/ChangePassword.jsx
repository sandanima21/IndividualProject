import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { StoreContext } from '../../context/StoreContext';
import { changePassword } from '../../service/authservice';

const RULES = [
  { label: 'At least 8 characters',    test: pw => pw.length >= 8 },
  { label: 'One uppercase letter',      test: pw => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter',      test: pw => /[a-z]/.test(pw) },
  { label: 'One number',               test: pw => /[0-9]/.test(pw) },
  { label: 'One special character',    test: pw => /[^A-Za-z0-9]/.test(pw) },
];

const ChangePassword = () => {
  const { user, token, login } = useContext(StoreContext);
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) {
    navigate('/signin');
    return null;
  }

  const pwOk = RULES.every(r => r.test(pw));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pwOk) { toast.error('Password does not meet requirements.'); return; }
    if (pw !== confirm) { toast.error('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await changePassword(pw, token);
      // Mark mustChangePassword as false in local state
      const updated = { ...user, mustChangePassword: false };
      login(updated, token);
      toast.success('Password updated! You can now use your new password.');
      if (user.role === 'DELIVERY') navigate('/delivery');
      else navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 18, padding: '2.25rem', width: '100%', maxWidth: 420 }}>

        {/* Icon + heading */}
        <div className="text-center mb-4">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <i className="bi bi-shield-lock-fill" style={{ fontSize: '1.75rem', color: 'var(--gold)' }}></i>
          </div>
          <h5 className="fw-bold mb-1" style={{ color: 'var(--gold)' }}>Create Your Password</h5>
          <p className="small text-muted mb-0">
            Hi <strong style={{ color: '#e0ddd4' }}>{user.name}</strong>, please set a new password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* New password */}
          <div className="mb-3">
            <label className="form-label small">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter new password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(200,196,188,0.5)', cursor: 'pointer', padding: 0 }}>
                <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Password rules */}
          {(focused || pw) && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              {RULES.map(rule => {
                const met = rule.test(pw);
                return (
                  <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: met ? '#3ecf8e' : 'rgba(200,196,188,0.45)', marginBottom: 3 }}>
                    <i className={`bi ${met ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                    {rule.label}
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirm password */}
          <div className="mb-4">
            <label className="form-label small">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                className="form-control"
                placeholder="Re-enter new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                style={{ paddingRight: '2.5rem', borderColor: confirm && confirm !== pw ? '#f47373' : '' }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(200,196,188,0.5)', cursor: 'pointer', padding: 0 }}>
                <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
            {confirm && confirm !== pw && (
              <small style={{ color: '#f47373' }}>Passwords do not match</small>
            )}
          </div>

          <button type="submit" className="btn btn-primary w-100 fw-bold" disabled={loading}
            style={{ padding: '0.65rem', fontSize: '0.95rem' }}>
            {loading
              ? <span className="spinner-border spinner-border-sm me-2"></span>
              : <i className="bi bi-check2-circle me-2"></i>}
            Set Password & Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
