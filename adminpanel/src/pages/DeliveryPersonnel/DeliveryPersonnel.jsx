import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = `${import.meta.env.VITE_API_URL}/api/auth`;

const DeliveryPersonnel = () => {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', username: '' });
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const load = () => {
    axios.get(`${API}/delivery/personnel`)
      .then(r => setPersonnel(r.data))
      .catch(() => toast.error('Failed to load delivery personnel.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleField = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/delivery/register`, form);
      setPersonnel(prev => [...prev, res.data]);
      toast.success(`Delivery person registered. Share User ID with them to set their password.`);
      setForm({ name: '', email: '', username: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.');
    } finally { setSubmitting(false); }
  };

  const copyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('User ID copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="py-4 px-3">
      <h4 className="mb-4 fw-bold">
        <i className="bi bi-truck me-2 text-primary"></i>Delivery Personnel
      </h4>

      <div className="row g-4">
        {/* Register form */}
        <div className="col-md-4">
          <div className="card p-4">
            <h6 className="fw-bold mb-3"><i className="bi bi-person-plus me-2"></i>Register Delivery Person</h6>
            <form onSubmit={handleAdd}>
              <div className="mb-3">
                <label className="form-label small">Full Name</label>
                <input name="name" className="form-control form-control-sm" placeholder="e.g. Kasun Perera" value={form.name} onChange={handleField} required />
              </div>
              <div className="mb-3">
                <label className="form-label small">Email</label>
                <input name="email" type="email" className="form-control form-control-sm" placeholder="kasun@example.com" value={form.email} onChange={handleField} required />
              </div>
              <div className="mb-4">
                <label className="form-label small">Username</label>
                <input name="username" className="form-control form-control-sm" placeholder="kasun_delivery" value={form.username} onChange={handleField} required />
              </div>
              <button type="submit" className="btn btn-primary w-100 btn-sm" disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-person-check me-1"></i>}
                Register
              </button>
            </form>
            <div className="alert alert-info mt-3 small py-2 mb-0">
              <i className="bi bi-info-circle me-1"></i>
              After registration, copy the <strong>User ID</strong> and share it with the delivery person.
              They use it to set their own password.
            </div>
          </div>
        </div>

        {/* Personnel list */}
        <div className="col-md-8">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border"></div></div>
          ) : personnel.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-truck fs-1 d-block mb-2"></i>
              No delivery personnel registered yet.
            </div>
          ) : (
            <div className="card">
              <table className="table table-hover mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Password</th>
                    <th>User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {personnel.map(p => (
                    <tr key={p.id}>
                      <td className="align-middle fw-semibold">{p.name}</td>
                      <td className="align-middle text-muted small">{p.username}</td>
                      <td className="align-middle text-muted small">{p.email}</td>
                      <td className="align-middle">
                        <span className={`badge ${p.passwordSet ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {p.passwordSet ? 'Set' : 'Pending'}
                        </span>
                      </td>
                      <td className="align-middle">
                        <div className="d-flex align-items-center gap-2">
                          <code className="small" style={{ fontSize: '0.7rem' }}>{p.id?.slice(-10)}</code>
                          <button
                            className={`btn btn-xs btn-sm py-0 px-2 ${copiedId === p.id ? 'btn-success' : 'btn-outline-secondary'}`}
                            style={{ fontSize: '0.7rem' }}
                            onClick={() => copyId(p.id)}
                          >
                            <i className={`bi ${copiedId === p.id ? 'bi-check' : 'bi-clipboard'}`}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryPersonnel;
