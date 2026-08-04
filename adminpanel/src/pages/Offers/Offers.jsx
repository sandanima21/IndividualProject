import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const API = `${import.meta.env.VITE_API_URL}/api/offers`;
const EMPTY = { title: '', description: '', startDate: '', endDate: '', price: '' };

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// "yyyy-MM-ddTHH:mm" in local time — matches datetime-local's value format, so it can be
// used directly as a `min` attribute and compared lexicographically against form values.
const nowLocalString = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const validatePrice = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return 'Price is required.';
  if (!/^\d+(\.\d{1,2})?$/.test(String(raw))) return 'Enter a valid amount (numbers only).';
  if (Number(raw) <= 0) return 'Price must be greater than 0.';
  return '';
};

const statusBadge = (offer) => {
  const now = new Date();
  const start = offer.startDate ? new Date(offer.startDate) : null;
  const end = offer.endDate ? new Date(offer.endDate) : null;
  if (end && end < now) return { label: 'Expired', color: '#f87171', bg: 'rgba(248,113,113,0.12)' };
  if (start && start > now) return { label: 'Scheduled', color: '#f4b942', bg: 'rgba(244,185,66,0.12)' };
  return { label: 'Active', color: '#3ecf8e', bg: 'rgba(62,207,142,0.12)' };
};

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [priceError, setPriceError] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const res = await api.get(`${API}/all`);
      setOffers(res.data);
    } catch { toast.error('Failed to load offers.'); }
  };

  useEffect(() => { load(); }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const resetForm = () => {
    setForm(EMPTY);
    clearImage();
    setEditingId(null);
    setPriceError('');
    setStartDateError('');
    setEndDateError('');
  };

  const startEdit = (offer) => {
    setEditingId(offer.id);
    setForm({
      title: offer.title || '',
      description: offer.description || '',
      startDate: offer.startDate ? offer.startDate.slice(0, 16) : '',
      endDate: offer.endDate ? offer.endDate.slice(0, 16) : '',
      price: offer.price != null ? String(offer.price) : '',
    });
    setImagePreview(offer.imageUrl || null);
    setImageFile(null);
    setPriceError('');
    setStartDateError('');
    setEndDateError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePriceChange = (e) => {
    const value = e.target.value;
    setForm(p => ({ ...p, price: value }));
    setPriceError(validatePrice(value));
  };

  const handleStartDateChange = (e) => {
    const value = e.target.value;
    setForm(p => ({ ...p, startDate: value }));
    setStartDateError(value && value < nowLocalString() ? 'Start date cannot be in the past.' : '');
    if (form.endDate) {
      setEndDateError(value && form.endDate <= value ? 'End date must be after start date.' : '');
    }
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    setForm(p => ({ ...p, endDate: value }));
    if (value && value < nowLocalString()) {
      setEndDateError('End date cannot be in the past.');
    } else if (value && form.startDate && value <= form.startDate) {
      setEndDateError('End date must be after start date.');
    } else {
      setEndDateError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.warning('Title and description are required.');
      return;
    }
    const priceErr = validatePrice(form.price);
    if (priceErr) { setPriceError(priceErr); toast.error(priceErr); return; }
    if (form.startDate && form.startDate < nowLocalString()) {
      setStartDateError('Start date cannot be in the past.');
      toast.warning('Start date cannot be in the past.');
      return;
    }
    if (form.startDate && form.endDate && new Date(form.startDate) >= new Date(form.endDate)) {
      setEndDateError('End date must be after start date.');
      toast.warning('End date must be after start date.');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      if (form.startDate) fd.append('startDate', new Date(form.startDate).toISOString().slice(0, 19));
      if (form.endDate)   fd.append('endDate',   new Date(form.endDate).toISOString().slice(0, 19));
      fd.append('price', form.price);
      if (imageFile)      fd.append('file', imageFile);

      if (editingId) {
        await api.put(`${API}/${editingId}`, fd);
        toast.success('Offer updated!');
      } else {
        await api.post(API, fd);
        toast.success('Offer created!');
      }
      resetForm();
      load();
    } catch {
      toast.error(editingId ? 'Failed to update offer.' : 'Failed to create offer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this offer?')) return;
    setDeletingId(id);
    try {
      await api.delete(`${API}/${id}`);
      toast.success('Offer deleted.');
      setOffers(prev => prev.filter(o => o.id !== id));
      if (editingId === id) resetForm();
    } catch {
      toast.error('Failed to delete offer.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="py-4 px-3">
      <h4 className="mb-4 fw-bold d-flex align-items-center gap-2">
        <i className="bi bi-tag" style={{ color: 'var(--gold)' }}></i>
        Offers
      </h4>

      <div className="row g-4">
        {/* ── Create / Edit form ── */}
        <div className="col-lg-4">
          <div style={{ background: '#1a1a1a', border: `1px solid ${editingId ? 'rgba(74,158,255,0.35)' : 'rgba(201,168,76,0.2)'}`, borderRadius: 16, padding: '1.5rem' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0" style={{ color: editingId ? '#74aaff' : 'var(--gold)' }}>
                {editingId ? <><i className="bi bi-pencil me-2"></i>Edit Offer</> : <><i className="bi bi-plus-circle me-2"></i>Create New Offer</>}
              </h6>
              {editingId && (
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
                  <i className="bi bi-x"></i> Cancel
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small">Title *</label>
                <input className="form-control" placeholder="e.g. Free Delivery Weekend"
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label small">Description *</label>
                <textarea className="form-control" rows="3" placeholder="Describe the offer..."
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label small">Price *</label>
                <div className="input-group">
                  <span className="input-group-text" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--gold)' }}>Rs.</span>
                  <input type="number" min="0.01" step="0.01" className={`form-control${priceError ? ' is-invalid' : ''}`} placeholder="e.g. 450.00"
                    value={form.price} onChange={handlePriceChange}
                    onBlur={() => setPriceError(validatePrice(form.price))} required />
                </div>
                {priceError
                  ? <div className="text-danger small mt-1">{priceError}</div>
                  : <div className="form-text" style={{ color: 'rgba(200,196,188,0.4)', fontSize: '0.72rem' }}>
                      Customers see an "Order Now" button that opens the cart.
                    </div>}
              </div>
              <div className="mb-3">
                <label className="form-label small">Show From <span className="text-muted">(optional)</span></label>
                <input type="datetime-local" className={`form-control${startDateError ? ' is-invalid' : ''}`}
                  min={nowLocalString()}
                  value={form.startDate} onChange={handleStartDateChange} />
                {startDateError && <div className="text-danger small mt-1">{startDateError}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small">Hide After <span className="text-muted">(optional)</span></label>
                <input type="datetime-local" className={`form-control${endDateError ? ' is-invalid' : ''}`}
                  min={form.startDate || nowLocalString()}
                  value={form.endDate} onChange={handleEndDateChange} />
                {endDateError && <div className="text-danger small mt-1">{endDateError}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label small">Banner Image <span className="text-muted">(optional)</span></label>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                {imagePreview ? (
                  <div className="position-relative" style={{ borderRadius: 10, overflow: 'hidden' }}>
                    <img src={imagePreview} alt="preview" style={{ width: '100%', height: 130, objectFit: 'cover' }} />
                    <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" onClick={clearImage}>
                      <i className="bi bi-x"></i>
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn btn-sm btn-outline-secondary w-100"
                    style={{ borderStyle: 'dashed', borderColor: 'rgba(201,168,76,0.3)', color: 'rgba(201,168,76,0.6)', height: 80 }}
                    onClick={() => fileRef.current?.click()}>
                    <i className="bi bi-image me-2"></i>Upload Image
                  </button>
                )}
              </div>

              <button className="btn btn-primary w-100 fw-semibold" type="submit"
                disabled={saving || !!priceError || !!startDateError || !!endDateError}>
                {saving ? <span className="spinner-border spinner-border-sm me-2"></span>
                        : <i className={`bi ${editingId ? 'bi-check-circle' : 'bi-plus-circle'} me-2`}></i>}
                {editingId ? 'Save Changes' : 'Create Offer'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Offers list ── */}
        <div className="col-lg-8">
          {offers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-tag" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
              <p className="mt-3 small">No offers yet. Create one to display it on the customer home page.</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {offers.map(offer => {
                const badge = statusBadge(offer);
                return (
                  <div key={offer.id} style={{
                    background: editingId === offer.id ? 'rgba(74,158,255,0.05)' : '#1a1a1a',
                    border: `1px solid ${editingId === offer.id ? 'rgba(74,158,255,0.35)' : 'rgba(201,168,76,0.15)'}`,
                    borderRadius: 14, overflow: 'hidden', display: 'flex'
                  }}>
                    {offer.imageUrl && (
                      <img src={offer.imageUrl} alt={offer.title} style={{ width: 110, objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ padding: '1rem 1.2rem', flex: 1, minWidth: 0 }}>
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <div className="fw-bold" style={{ color: '#fff' }}>{offer.title}</div>
                            <span style={{ background: badge.bg, color: badge.color, borderRadius: 6, padding: '1px 8px', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="small text-muted" style={{ marginBottom: 4, lineHeight: 1.5 }}>{offer.description}</div>
                          {offer.price != null && (
                            <div className="small fw-bold mb-1" style={{ color: 'var(--gold)' }}>
                              <i className="bi bi-tag me-1"></i>Rs.{offer.price.toFixed(2)}
                            </div>
                          )}
                          <div style={{ fontSize: '0.7rem', color: 'rgba(200,196,188,0.4)', display: 'flex', gap: 12 }}>
                            {offer.startDate && <span><i className="bi bi-play-circle me-1"></i>{fmtDate(offer.startDate)}</span>}
                            {offer.endDate   && <span><i className="bi bi-stop-circle me-1"></i>{fmtDate(offer.endDate)}</span>}
                            {!offer.startDate && !offer.endDate && <span className="text-muted">Always visible</span>}
                          </div>
                        </div>
                        <div className="d-flex gap-1 flex-shrink-0">
                          <button className="btn btn-sm btn-outline-primary"
                            onClick={() => startEdit(offer)}
                            style={{ borderRadius: 8 }}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(offer.id)} disabled={deletingId === offer.id}
                            style={{ borderRadius: 8 }}>
                            {deletingId === offer.id
                              ? <span className="spinner-border spinner-border-sm"></span>
                              : <i className="bi bi-trash"></i>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Offers;
