import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getAllUsers, deactivateUser, activateUser, deleteUser, registerDelivery } from '../../services/userService';

const EMPTY_DELIVERY = { name: '', email: '', username: '', password: '' };

const Avatar = ({ user }) => (
  user.picture
    ? <img src={user.picture} alt={user.name} width={36} height={36} className="rounded-circle" style={{ objectFit: 'cover' }} referrerPolicy="no-referrer" onError={e => { e.target.style.display = 'none'; }} />
    : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 700, fontSize: '0.9rem' }}>
        {user.name?.charAt(0)?.toUpperCase() || '?'}
      </div>
);

/* ── Delete confirmation modal — replaces the native window.confirm() so the
   warning is actually visible/styled instead of an easy-to-miss browser popup. */
const DeleteUserModal = ({ user, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try { await onConfirm(); } finally { setDeleting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1055, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={deleting ? undefined : onClose}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(244,115,115,0.3)', borderRadius: 18, width: '100%', maxWidth: 420, padding: '1.75rem' }}
        onClick={e => e.stopPropagation()}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0" style={{ color: '#f47373' }}>
            <i className="bi bi-exclamation-triangle me-2"></i>Delete User
          </h5>
          <button className="btn-close btn-close-white" onClick={onClose} disabled={deleting} />
        </div>

        <p className="mb-2">Are you sure you want to delete <strong>{user.name}</strong>?</p>
        {user.role === 'DELIVERY' ? (
          <p className="small mb-4" style={{ color: '#f47373' }}>
            <i className="bi bi-info-circle me-1"></i>Their reviews will also be deleted.
          </p>
        ) : (
          <p className="small text-muted mb-4">This can't be undone.</p>
        )}

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={deleting}>No</button>
          <button type="button" className="btn btn-danger btn-sm px-4" onClick={handleConfirm} disabled={deleting}>
            {deleting
              ? <span className="spinner-border spinner-border-sm me-1" />
              : <i className="bi bi-trash me-1"></i>}
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('customers');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // null | user to confirm-delete

  // Register delivery form
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState(EMPTY_DELIVERY);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const load = async () => {
    try {
      setUsers(await getAllUsers());
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDeactivate = async (user) => {
    try {
      const updated = user.active
        ? await deactivateUser(user.id)
        : await activateUser(user.id);
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      toast.success(user.active ? 'User deactivated.' : 'User activated.');
    } catch (err) {
      const msg = err?.response?.data?.message;
      toast.error(msg || 'Failed to update status.', msg ? { autoClose: 8000 } : undefined);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteUser(deleteTarget.id);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      toast.success('User deleted.');
      setDeleteTarget(null);
    } catch (err) {
      const msg = err?.response?.data?.message;
      toast.error(msg || 'Delete failed.', msg ? { autoClose: 8000 } : undefined);
      // Modal stays open on failure so the admin can see the message and retry/cancel.
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newUser = await registerDelivery(form);
      setUsers(prev => [...prev, newUser]);
      setForm(EMPTY_DELIVERY);
      setShowRegister(false);
      toast.success('Delivery person is registered successfully');
    } catch (err) {
      const msg = err?.response?.data?.message || (typeof err?.response?.data === 'string' ? err.response.data : null);
      toast.error(msg || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const customers = users.filter(u => u.role === 'CUSTOMER');
  const delivery = users.filter(u => u.role === 'DELIVERY');

  const filtered = (list) => list.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const tabStyle = (active) => ({
    background: active ? 'var(--gold)' : 'transparent',
    color: active ? '#000' : 'var(--gold)',
    border: '1px solid var(--gold)',
    borderRadius: 8,
    padding: '6px 20px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  });

  const UserRow = ({ user }) => (
    <tr>
      <td><Avatar user={user} /></td>
      <td className="align-middle fw-semibold">
        {user.name}
        {!user.active && <span className="badge bg-danger ms-2" style={{ fontSize: '0.6rem' }}>INACTIVE</span>}
      </td>
      <td className="align-middle text-muted small">{user.email || '—'}</td>
      <td className="align-middle text-muted small">{user.username || '—'}</td>
      <td className="align-middle text-muted small">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
      </td>
      <td className="align-middle">
        <div className="d-flex gap-1">
          <button
            className={`btn btn-sm ${user.active ? 'btn-outline-warning' : 'btn-outline-success'} px-2`}
            onClick={() => handleDeactivate(user)}
            title={user.active ? 'Deactivate' : 'Activate'}
          >
            <i className={`bi ${user.active ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
          </button>
          <button
            className="btn btn-sm btn-outline-danger px-2"
            onClick={() => setDeleteTarget(user)}
            title="Delete"
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  );

  if (loading) return <div className="py-5 text-center"><div className="spinner-border" style={{ color: 'var(--gold)' }}></div></div>;

  return (
    <div className="py-4 px-3">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-people me-2" style={{ color: 'var(--gold)' }}></i>Users
          {/* Excludes the admin account itself — this count is meant to reflect
              customers + delivery staff, not everyone with a login. */}
          <span className="badge bg-secondary ms-2">{customers.length + delivery.length}</span>
        </h4>
        <div className="d-flex gap-2 flex-wrap">
          <input
            className="form-control form-control-sm"
            placeholder="Search by name or email..."
            style={{ width: 220 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {tab === 'delivery' && (
            <button className="btn btn-primary btn-sm px-3" onClick={() => setShowRegister(v => !v)}>
              <i className="bi bi-person-plus me-1"></i>Register Delivery
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="d-flex gap-2 mb-4">
        <button style={tabStyle(tab === 'customers')} onClick={() => setTab('customers')}>
          <i className="bi bi-people me-1"></i>Customers
          <span className="ms-2 badge rounded-pill" style={{ background: tab === 'customers' ? 'rgba(0,0,0,0.2)' : 'rgba(201,168,76,0.2)', color: tab === 'customers' ? '#000' : 'var(--gold)', fontSize: '0.7rem' }}>
            {customers.length}
          </span>
        </button>
        <button style={tabStyle(tab === 'delivery')} onClick={() => setTab('delivery')}>
          <i className="bi bi-bicycle me-1"></i>Delivery Staff
          <span className="ms-2 badge rounded-pill" style={{ background: tab === 'delivery' ? 'rgba(0,0,0,0.2)' : 'rgba(201,168,76,0.2)', color: tab === 'delivery' ? '#000' : 'var(--gold)', fontSize: '0.7rem' }}>
            {delivery.length}
          </span>
        </button>
      </div>

      {/* Register Delivery Form */}
      {tab === 'delivery' && showRegister && (
        <div className="card mb-4" style={{ border: '1px solid rgba(201,168,76,0.3)', background: '#181818' }}>
          <div className="card-header fw-semibold" style={{ background: 'rgba(201,168,76,0.08)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
            <i className="bi bi-person-plus me-2" style={{ color: 'var(--gold)' }}></i>Register New Delivery Person
          </div>
          <div className="card-body">
            <form onSubmit={handleRegister}>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label small">Full Name *</label>
                  <input className="form-control" placeholder="Kamal Perera" value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Email</label>
                  <input className="form-control" type="email" placeholder="kamal@email.com" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Username *</label>
                  <input className="form-control" placeholder="kamal123" value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Password *</label>
                  <div className="input-group">
                    <input
                      className="form-control"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Initial password"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      required
                    />
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPw(v => !v)}>
                      <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="col-12">
                  <div className="p-3 rounded" style={{ background: 'rgba(62,207,142,0.07)', border: '1px solid rgba(62,207,142,0.2)', fontSize: '0.82rem', color: 'rgba(200,196,188,0.75)' }}>
                    <i className="bi bi-envelope-check me-2" style={{ color: '#3ecf8e' }}></i>
                    A <strong style={{ color: '#3ecf8e' }}>welcome email</strong> with login credentials will be sent automatically. The delivery person must <strong>create a new password</strong> on first login.
                  </div>
                </div>
                <div className="col-12 d-flex gap-2 justify-content-end">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowRegister(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm px-4" disabled={submitting}>
                    {submitting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-person-check me-1"></i>}
                    Register & Send Email
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {(() => {
        const list = filtered(tab === 'customers' ? customers : delivery);
        if (list.length === 0) return (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-person fs-1 d-block mb-2 opacity-25"></i>
            No {tab === 'customers' ? 'customers' : 'delivery staff'}{search ? ' matching your search' : ''}.
          </div>
        );
        return (
          <div className="card">
            <table className="table table-hover mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ width: 50 }}></th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Joined</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(user => <UserRow key={user.id} user={user} />)}
              </tbody>
            </table>
          </div>
        );
      })()}

      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default Users;
