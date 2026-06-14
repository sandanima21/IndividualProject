import React, { useEffect, useRef, useState } from 'react';
import { getAllOrders, updateRefundStatus, uploadRefundReceipt, processPayhereRefund } from '../../services/orderService';
import { toast } from 'react-toastify';

const FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all',   label: 'All Time' },
];

const startOf = (key) => {
  const d = new Date();
  if (key === 'today') { d.setHours(0, 0, 0, 0); return d; }
  if (key === 'week')  { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }
  if (key === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  return new Date(0);
};

export const REFUND_STATUS_META = {
  PENDING_REFUND:   { label: 'Pending',   color: '#f4a24e', bg: 'rgba(244,162,78,0.12)',  icon: 'bi-hourglass-split' },
  REFUND_INITIATED: { label: 'In Progress', color: '#4a9eff', bg: 'rgba(74,158,255,0.12)', icon: 'bi-arrow-repeat' },
  REFUNDED:         { label: 'Refunded',    color: '#3ecf8e', bg: 'rgba(62,207,142,0.12)', icon: 'bi-check-circle' },
};

export const RefundStatusBadge = ({ status }) => {
  const meta = REFUND_STATUS_META[status] || REFUND_STATUS_META.PENDING_REFUND;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: meta.bg, color: meta.color, fontSize: '0.7rem', fontWeight: 600 }}>
      <i className={`bi ${meta.icon}`}></i>{meta.label}
    </span>
  );
};

// Status-change modal — REFUNDED archives the order (webhook handles this automatically for PayHere refunds)
const isAutoNote = (note) => !!note?.startsWith('Refund submitted to PayHere at');

const RefundActionModal = ({ order, onSave, onClose }) => {
  const [selectedStatus, setSelectedStatus] = useState(order.refundStatus || 'PENDING_REFUND');
  const [notes, setNotes] = useState(isAutoNote(order.refundNotes) ? '' : (order.refundNotes || ''));
  const [saving, setSaving] = useState(false);

  const willArchive = selectedStatus === 'REFUNDED';

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(order.id, selectedStatus, notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 16, padding: '1.5rem', width: 400, maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Update Refund Status</div>
            <div style={{ fontSize: '0.72rem', color: '#f87171', fontFamily: 'monospace', marginTop: 2 }}>
              {order.displayId || `#${order.id?.slice(-6).toUpperCase()}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(200,196,188,0.5)', cursor: 'pointer', fontSize: '1.2rem' }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'rgba(200,196,188,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'block' }}>
            Refund Status
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(REFUND_STATUS_META).map(([key, meta]) => (
              <button key={key}
                onClick={() => setSelectedStatus(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  background: selectedStatus === key ? meta.bg : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedStatus === key ? meta.color : 'rgba(255,255,255,0.08)'}`,
                  color: selectedStatus === key ? meta.color : 'rgba(200,196,188,0.6)',
                  fontWeight: selectedStatus === key ? 600 : 400,
                  fontSize: '0.83rem', transition: 'all 0.15s',
                }}>
                <i className={`bi ${meta.icon}`}></i>
                {meta.label}
                {selectedStatus === key && <i className="bi bi-check2 ms-auto"></i>}
              </button>
            ))}
          </div>
        </div>

        {/* Archive notice — only shown when manually marking REFUNDED */}
        {willArchive && (
          <div style={{ background: 'rgba(62,207,142,0.07)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: '1rem', fontSize: '0.75rem', color: '#3ecf8e' }}>
            <i className="bi bi-archive me-2"></i>
            This order will move to <strong>History → Refunded</strong>.
          </div>
        )}

        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'rgba(200,196,188,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block' }}>
            Notes <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea className="form-control" rows={3}
            placeholder="e.g. Transfer completed via Commercial Bank…"
            value={notes} onChange={e => setNotes(e.target.value)}
            style={{ fontSize: '0.83rem', resize: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-sm btn-outline-secondary" style={{ fontSize: '0.8rem' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-sm btn-primary" style={{ fontSize: '0.8rem' }}>
            {saving && <span className="spinner-border spinner-border-sm me-1"></span>}
            {willArchive ? 'Save & Archive' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Expanded row detail: bank details + PayHere action + receipt upload
const ExpandedDetail = ({ order, onReceiptUploaded }) => {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const handlePayhereRefund = async () => {
    setSubmittingRefund(true);
    try {
      await processPayhereRefund(order.id);
      toast.success('Refund submitted to PayHere. Status updated to In Progress.');
      onReceiptUploaded();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'PayHere refund request failed.';
      toast.error(msg);
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadRefundReceipt(order.id, file);
      toast.success('Receipt uploaded.');
      onReceiptUploaded();
    } catch {
      toast.error('Failed to upload receipt.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <tr style={{ background: '#111' }}>
      <td colSpan={8} style={{ padding: '0 12px 12px 12px' }}>
        <div style={{ borderRadius: '0 0 10px 10px', padding: '14px 16px', background: '#161616', borderTop: '1px solid rgba(255,255,255,0.04)' }}>

          {/* Section label */}
          <div style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Customer &amp; Payment Details
          </div>

          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginBottom: 3 }}>Name</div>
              <div style={{ fontSize: '0.83rem', fontWeight: 600 }}>{order.userName}</div>
            </div>
            {order.userEmail && (
              <div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginBottom: 3 }}>Email</div>
                <a href={`mailto:${order.userEmail}`} style={{ fontSize: '0.83rem', color: '#74aaff', textDecoration: 'none' }}>{order.userEmail}</a>
              </div>
            )}
            {order.mobileNumber && (
              <div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginBottom: 3 }}>Phone</div>
                <a href={`tel:${order.mobileNumber}`} style={{ fontSize: '0.83rem', color: '#3ecf8e', textDecoration: 'none' }}>
                  <i className="bi bi-telephone me-1"></i>{order.mobileNumber}
                </a>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginBottom: 3 }}>Refund Amount</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f87171' }}>Rs.{order.total?.toFixed(2)}</div>
            </div>
            {order.payherePaymentId && (
              <div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginBottom: 3 }}>PayHere Txn ID</div>
                <code style={{ fontSize: '0.8rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '2px 8px', borderRadius: 4, userSelect: 'all' }}>
                  {order.payherePaymentId}
                </code>
              </div>
            )}
            {order.paymentTime && (
              <div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginBottom: 3 }}>Payment Date</div>
                <div style={{ fontSize: '0.83rem' }}>
                  {new Date(order.paymentTime).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </div>

          {/* Bank details */}
          {order.refundBankName ? (
            <>
              <div style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                Customer Bank Details (for transfer)
              </div>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', padding: '10px 14px', background: 'rgba(244,162,78,0.06)', border: '1px solid rgba(244,162,78,0.15)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginBottom: 3 }}>Bank</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{order.refundBankName}</div>
                </div>
                {order.refundBankBranch && (
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginBottom: 3 }}>Branch</div>
                    <div style={{ fontSize: '0.85rem' }}>{order.refundBankBranch}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginBottom: 3 }}>Account Number</div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', userSelect: 'all' }}>{order.refundAccountNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginBottom: 3 }}>Account Holder</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{order.refundAccountHolderName}</div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'rgba(200,196,188,0.3)', fontStyle: 'italic' }}>
              <i className="bi bi-info-circle me-1"></i>Customer did not provide bank details.
            </div>
          )}

          {/* PayHere refund action */}
          <div style={{ marginTop: 16, marginBottom: 4 }}>
            {order.refundStatus === 'REFUND_INITIATED' ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', fontSize: '0.78rem', color: '#4a9eff' }}>
                <i className="bi bi-check2-circle"></i>
                Refund in progress · processing (up to 5–10 business days)
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={handlePayhereRefund}
                  disabled={submittingRefund}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 18px',
                    borderRadius: 8, border: '1px solid rgba(62,207,142,0.4)',
                    background: 'rgba(62,207,142,0.12)', color: '#3ecf8e',
                    fontSize: '0.8rem', fontWeight: 700, cursor: submittingRefund ? 'default' : 'pointer',
                    opacity: submittingRefund ? 0.6 : 1,
                  }}>
                  {submittingRefund
                    ? <><span className="spinner-border spinner-border-sm"></span> Submitting to PayHere…</>
                    : <><i className="bi bi-arrow-counterclockwise"></i> Process Refund via PayHere</>}
                </button>
              </div>
            )}
          </div>

          {/* Receipt upload */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            {order.refundReceiptUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={order.refundReceiptUrl} alt="Receipt" onClick={() => window.open(order.refundReceiptUrl, '_blank')}
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(62,207,142,0.3)', cursor: 'pointer' }} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#3ecf8e', fontWeight: 600 }}>
                    <i className="bi bi-check-circle me-1"></i>Receipt uploaded
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, cursor: 'pointer', fontSize: '0.7rem', color: 'rgba(200,196,188,0.5)', textDecoration: 'underline' }}>
                    Replace
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
                  </label>
                </div>
              </div>
            ) : (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 7, cursor: uploading ? 'default' : 'pointer', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)', color: '#74aaff', fontSize: '0.75rem', fontWeight: 600 }}>
                {uploading
                  ? <><span className="spinner-border spinner-border-sm"></span> Uploading…</>
                  : <><i className="bi bi-upload"></i> Upload Refund Receipt</>}
                <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
              </label>
            )}
            <div style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.35)' }}>
              Customer will see this in their order history.
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

export const RefundedTable = ({ orders, onRefresh }) => {
  const [editingOrder, setEditingOrder] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const handleSave = async (orderId, refundStatus, notes) => {
    try {
      await updateRefundStatus(orderId, refundStatus, notes);
      toast.success('Refund status updated.');
      onRefresh();
    } catch {
      toast.error('Failed to update refund status.');
      throw new Error('failed');
    }
  };

  if (orders.length === 0) return (
    <div className="text-center py-5 text-muted">
      <i className="bi bi-check2-circle" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
      <p className="mt-3 small">No refunds in this category.</p>
    </div>
  );

  return (
    <>
      {editingOrder && (
        <RefundActionModal order={editingOrder} onSave={handleSave} onClose={() => setEditingOrder(null)} />
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
          <thead>
            <tr style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <th style={{ paddingBottom: 8, paddingLeft: 12 }}>Order ID</th>
              <th style={{ paddingBottom: 8 }}>Customer</th>
              <th style={{ paddingBottom: 8 }}>Items</th>
              <th style={{ paddingBottom: 8 }}>Amount</th>
              <th style={{ paddingBottom: 8 }}>Bank Details</th>
              <th style={{ paddingBottom: 8 }}>Refund Status</th>
              <th style={{ paddingBottom: 8 }}>Date</th>
              <th style={{ paddingBottom: 8, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const expanded = expandedId === order.id;
              const hasBankDetails = !!order.refundBankName;
              return (
                <React.Fragment key={order.id}>
                  <tr style={{ background: '#1a1a1a', cursor: 'pointer' }}
                    onClick={() => setExpandedId(expanded ? null : order.id)}>

                    <td style={{ padding: '10px 12px', borderRadius: expanded ? '10px 0 0 0' : '10px 0 0 10px', color: '#f87171', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      <i className={`bi bi-chevron-${expanded ? 'up' : 'down'} me-1`} style={{ fontSize: '0.6rem', opacity: 0.5 }}></i>
                      {order.displayId || `#${order.id.slice(-6).toUpperCase()}`}
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{order.userName}</div>
                      {order.userEmail && <div style={{ fontSize: '0.7rem', color: 'rgba(200,196,188,0.45)' }}>{order.userEmail}</div>}
                    </td>

                    <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'rgba(200,196,188,0.6)', maxWidth: 160 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {order.items?.map(i => `${i.foodName} ×${i.quantity}`).join(' · ')}
                      </span>
                    </td>

                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f87171', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      Rs.{order.total?.toFixed(2)}
                    </td>

                    {/* Bank details preview */}
                    <td style={{ padding: '10px 12px' }}>
                      {hasBankDetails ? (
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{order.refundBankName}</div>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.5)', fontFamily: 'monospace' }}>{order.refundAccountNumber}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'rgba(200,196,188,0.25)' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <div>
                        <RefundStatusBadge status={order.refundStatus} />
                        {order.refundNotes && !isAutoNote(order.refundNotes) && (
                          <div style={{ fontSize: '0.65rem', color: 'rgba(200,196,188,0.4)', marginTop: 3, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.refundNotes}>
                            {order.refundNotes}
                          </div>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'rgba(200,196,188,0.45)', whiteSpace: 'nowrap' }}>
                      {new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                      <div style={{ fontSize: '0.68rem' }}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>

                    <td style={{ padding: '10px 12px', borderRadius: expanded ? '0 10px 0 0' : '0 10px 10px 0', textAlign: 'center' }}
                      onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditingOrder(order)}
                        style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', borderRadius: 7, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <i className="bi bi-pencil-square"></i>Update
                      </button>
                    </td>
                  </tr>

                  {expanded && (
                    <ExpandedDetail order={order} onReceiptUploaded={onRefresh} />
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, bg }) => (
  <div className="col-6 col-xl-3">
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.2rem 1.4rem', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`bi ${icon}`} style={{ color, fontSize: '1.2rem' }}></i>
      </div>
      <div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  </div>
);

// ── Main Refunds page — shows only in-progress refunds (Pending + Initiated) ──
const Refunds = () => {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = () => {
    getAllOrders()
      .then(orders => setAllOrders(orders))
      .catch(() => toast.error('Failed to load refunds.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const cutoff = startOf(filter);

  const matchesSearch = (o) =>
    !search ||
    o.userName?.toLowerCase().includes(search.toLowerCase()) ||
    o.id?.includes(search) ||
    o.displayId?.toLowerCase().includes(search.toLowerCase());

  // Only show PENDING_REFUND and REFUND_INITIATED — completed ones go to History
  const inProgressOrders = allOrders.filter(o =>
    o.paymentStatus === 'REFUNDED' &&
    (!o.refundStatus || o.refundStatus === 'PENDING_REFUND' || o.refundStatus === 'REFUND_INITIATED') &&
    new Date(o.createdAt) >= cutoff &&
    matchesSearch(o) &&
    (statusFilter === 'all' || (statusFilter === 'PENDING_REFUND' && (!o.refundStatus || o.refundStatus === 'PENDING_REFUND')) || o.refundStatus === statusFilter)
  );

  const totalAmount    = inProgressOrders.reduce((s, o) => s + (o.total || 0), 0);
  const pendingCount   = inProgressOrders.filter(o => !o.refundStatus || o.refundStatus === 'PENDING_REFUND').length;
  const initiatedCount = inProgressOrders.filter(o => o.refundStatus === 'REFUND_INITIATED').length;
  const withBankCount  = inProgressOrders.filter(o => o.refundBankName).length;

  if (loading) return (
    <div className="py-5 text-center">
      <div className="spinner-border" style={{ color: 'var(--gold)', width: 40, height: 40 }}></div>
      <div className="small text-muted mt-3">Loading refunds…</div>
    </div>
  );

  return (
    <div className="py-4 px-3">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h4 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-arrow-counterclockwise" style={{ color: '#f87171' }}></i>
            Refunds
          </h4>
          <small className="text-muted">Pending and in-progress customer refunds · Completed refunds appear in History</small>
        </div>

        <div className="d-flex gap-2 flex-wrap align-items-center">
          <div className="d-flex gap-1">
            {FILTERS.map(f => (
              <button key={f.key} className="btn btn-sm"
                style={{
                  borderRadius: 50, fontWeight: 600, fontSize: '0.75rem',
                  background: filter === f.key ? 'var(--gold)' : 'rgba(201,168,76,0.1)',
                  color: filter === f.key ? '#000' : 'var(--gold)',
                  border: '1px solid rgba(201,168,76,0.3)', padding: '3px 12px',
                }}
                onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="position-relative">
            <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(201,168,76,0.5)', fontSize: '0.82rem', pointerEvents: 'none' }}></i>
            <input className="form-control form-control-sm" placeholder="Search name or order ID…"
              style={{ width: 200, paddingLeft: '2.1rem' }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        <StatCard icon="bi-currency-exchange" label="Amount Pending"  value={`Rs.${totalAmount.toFixed(2)}`} color="#f87171" bg="rgba(248,113,113,0.12)" />
        <StatCard icon="bi-hourglass-split"   label="Awaiting Action" value={pendingCount}                   color="#f4a24e" bg="rgba(244,162,78,0.12)"  />
        <StatCard icon="bi-arrow-repeat"      label="In Progress"    value={initiatedCount}                 color="#4a9eff" bg="rgba(74,158,255,0.12)"  />
        <StatCard icon="bi-bank"              label="Bank Details"   value={withBankCount}                  color="#3ecf8e" bg="rgba(62,207,142,0.12)"  />
      </div>

      {/* Status filter pills — only in-progress statuses */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all',             label: 'All Pending' },
          { key: 'PENDING_REFUND',  label: 'Awaiting Action', color: '#f4a24e', border: 'rgba(244,162,78,0.3)'   },
          { key: 'REFUND_INITIATED',label: 'In Progress',     color: '#4a9eff', border: 'rgba(74,158,255,0.3)'   },
        ].map(s => (
          <button key={s.key} className="btn btn-sm"
            style={{
              borderRadius: 50, fontWeight: 600, fontSize: '0.75rem', padding: '4px 14px',
              background: statusFilter === s.key ? (s.border ? s.border.replace('0.3)', '0.12)') : 'rgba(255,255,255,0.06)') : 'rgba(255,255,255,0.03)',
              color: statusFilter === s.key ? (s.color || 'rgba(200,196,188,0.7)') : 'rgba(200,196,188,0.45)',
              border: `1px solid ${statusFilter === s.key ? (s.border || 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.08)'}`,
            }}
            onClick={() => setStatusFilter(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      <RefundedTable orders={inProgressOrders} onRefresh={loadData} />
    </div>
  );
};

export default Refunds;
