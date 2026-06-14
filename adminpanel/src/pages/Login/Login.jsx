import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Login = ({ onLogin }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
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
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🍛</div>
          <h4 className="fw-bold" style={{ color: 'var(--gold)' }}>KukiHabun Admin</h4>
          <p className="small text-muted mb-0">Sign in to continue</p>
        </div>
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
          <div className="mb-4">
            <input
              type="password"
              className="form-control"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
            />
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
      </div>
    </div>
  );
};

export default Login;
