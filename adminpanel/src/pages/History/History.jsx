import React, { useEffect, useState } from 'react';
import { getAllOrders } from '../../services/orderService';
import { getAllReviews } from '../../services/reviewService';
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

const StatCard = ({ icon, label, value, color, bg }) => (
  <div className="col-12 col-sm-6 col-xl-3">
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.4rem 1.6rem', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`bi ${icon}`} style={{ color, fontSize: '1.3rem' }}></i>
      </div>
      <div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(200,196,188,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  </div>
);

const StarRating = ({ rating }) => (
  <span style={{ color: '#f4b942', fontSize: '0.8rem', letterSpacing: 1 }}>
    {[1,2,3,4,5].map(n => (
      <i key={n} className={`bi ${n <= rating ? 'bi-star-fill' : 'bi-star'}`}></i>
    ))}
  </span>
);

const OrderRow = ({ order, reviewsForOrder }) => {
  const [expanded, setExpanded] = useState(false);
  const hasReviews = reviewsForOrder.length > 0;

  return (
    <>
      <tr
        style={{ background: '#1a1a1a', cursor: hasReviews ? 'pointer' : 'default' }}
        onClick={() => hasReviews && setExpanded(e => !e)}
      >
        <td style={{ padding: '10px 12px', borderRadius: '10px 0 0 10px', color: 'var(--gold)', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'monospace' }}>
          {order.displayId || `#${order.id.slice(-6).toUpperCase()}`}
        </td>
        <td style={{ padding: '10px 12px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{order.userName}</div>
          {order.userEmail && <div style={{ fontSize: '0.7rem', color: 'rgba(200,196,188,0.45)' }}>{order.userEmail}</div>}
        </td>
        <td style={{ padding: '10px 12px' }}>
          <span className="badge px-2 py-1" style={{
            background: order.orderType === 'delivery' ? 'rgba(74,158,255,0.12)' : 'rgba(100,100,100,0.15)',
            color: order.orderType === 'delivery' ? '#74aaff' : '#9ca3af',
            fontSize: '0.65rem', borderRadius: 6,
          }}>
            {order.orderType === 'delivery' ? '🚚 Delivery' : '🛍 Takeaway'}
          </span>
        </td>
        <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'rgba(200,196,188,0.6)', maxWidth: 200 }}>
          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {order.items?.map(i => `${i.foodName} ×${i.quantity}`).join(' · ')}
          </span>
        </td>
        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--gold)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
          Rs.{order.total?.toFixed(2)}
        </td>
        <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'rgba(200,196,188,0.45)', whiteSpace: 'nowrap' }}>
          {new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
          <div style={{ fontSize: '0.68rem' }}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </td>
        <td style={{ padding: '10px 12px', borderRadius: '0 10px 10px 0', textAlign: 'center' }}>
          {hasReviews ? (
            <span style={{ color: '#f4b942', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="bi bi-star-fill"></i>{reviewsForOrder.length}
              <i className={`bi bi-chevron-${expanded ? 'up' : 'down'} ms-1`} style={{ fontSize: '0.65rem' }}></i>
            </span>
          ) : (
            <span style={{ color: 'rgba(200,196,188,0.25)', fontSize: '0.7rem' }}>—</span>
          )}
        </td>
      </tr>
      {expanded && hasReviews && (
        <tr>
          <td colSpan={7} style={{ padding: '0 12px 12px 12px', background: '#111' }}>
            <div style={{ borderRadius: 10, padding: '12px 16px', background: '#1e1e1e', marginTop: 2 }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(200,196,188,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                Customer Reviews
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviewsForOrder.map(r => (
                  <div key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--gold)', fontWeight: 700, fontSize: '0.8rem' }}>
                      {r.userName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{r.userName}</span>
                        <StarRating rating={r.rating} />
                        <span style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.35)', marginLeft: 'auto' }}>
                          {r.foodName || order.items?.find(i => i.foodId === r.foodId)?.foodName || ''}
                        </span>
                      </div>
                      {r.comment && (
                        <div style={{ fontSize: '0.78rem', color: 'rgba(200,196,188,0.6)', lineHeight: 1.5 }}>{r.comment}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const RefundedTable = ({ orders }) => {
  if (orders.length === 0) return (
    <div className="text-center py-5 text-muted">
      <i className="bi bi-cash-coin" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
      <p className="mt-3 small">No refunded orders found.</p>
    </div>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
        <thead>
          <tr style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <th style={{ paddingBottom: 8, paddingLeft: 12 }}>Order ID</th>
            <th style={{ paddingBottom: 8 }}>Customer</th>
            <th style={{ paddingBottom: 8 }}>Type</th>
            <th style={{ paddingBottom: 8 }}>Items</th>
            <th style={{ paddingBottom: 8 }}>Refunded</th>
            <th style={{ paddingBottom: 8 }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id} style={{ background: '#1a1a1a' }}>
              <td style={{ padding: '10px 12px', borderRadius: '10px 0 0 10px', color: '#f87171', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'monospace' }}>
                {order.displayId || `#${order.id.slice(-6).toUpperCase()}`}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{order.userName}</div>
                {order.userEmail && <div style={{ fontSize: '0.7rem', color: 'rgba(200,196,188,0.45)' }}>{order.userEmail}</div>}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <span className="badge px-2 py-1" style={{
                  background: order.orderType === 'delivery' ? 'rgba(74,158,255,0.12)' : 'rgba(100,100,100,0.15)',
                  color: order.orderType === 'delivery' ? '#74aaff' : '#9ca3af',
                  fontSize: '0.65rem', borderRadius: 6,
                }}>
                  {order.orderType === 'delivery' ? '🚚 Delivery' : '🛍 Takeaway'}
                </span>
              </td>
              <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'rgba(200,196,188,0.6)', maxWidth: 200 }}>
                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {order.items?.map(i => `${i.foodName} ×${i.quantity}`).join(' · ')}
                </span>
              </td>
              <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f87171', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                Rs.{order.total?.toFixed(2)}
              </td>
              <td style={{ padding: '10px 12px', borderRadius: '0 10px 10px 0', fontSize: '0.75rem', color: 'rgba(200,196,188,0.45)', whiteSpace: 'nowrap' }}>
                {new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                <div style={{ fontSize: '0.68rem' }}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const History = () => {
  const [allOrders, setAllOrders] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('delivered');

  useEffect(() => {
    Promise.all([getAllOrders(), getAllReviews()])
      .then(([orders, reviews]) => {
        setAllOrders(orders);
        setAllReviews(reviews);
      })
      .catch(() => toast.error('Failed to load history.'))
      .finally(() => setLoading(false));
  }, []);

  const cutoff = startOf(filter);
  const matchesSearch = (o) =>
    !search ||
    o.userName?.toLowerCase().includes(search.toLowerCase()) ||
    o.id.includes(search);

  const deliveredOrders = allOrders.filter(o =>
    o.status === 'DELIVERED' &&
    o.paymentStatus === 'PAID' &&
    new Date(o.createdAt) >= cutoff &&
    matchesSearch(o)
  );

  const refundedOrders = allOrders.filter(o =>
    o.paymentStatus === 'REFUNDED' &&
    new Date(o.createdAt) >= cutoff &&
    matchesSearch(o)
  );

  const reviewsByOrder = allReviews.reduce((acc, r) => {
    if (!r.orderId) return acc;
    if (!acc[r.orderId]) acc[r.orderId] = [];
    acc[r.orderId].push(r);
    return acc;
  }, {});

  const totalRevenue = deliveredOrders.reduce((s, o) => s + (o.total || 0), 0);
  const deliveryRevenue = deliveredOrders.filter(o => o.orderType === 'delivery').reduce((s, o) => s + (o.deliveryFee || 0), 0);
  const avgOrder = deliveredOrders.length ? totalRevenue / deliveredOrders.length : 0;
  const deliveryCount = deliveredOrders.filter(o => o.orderType === 'delivery').length;

  if (loading) return (
    <div className="py-5 text-center">
      <div className="spinner-border" style={{ color: 'var(--gold)', width: 40, height: 40 }}></div>
      <div className="small text-muted mt-3">Loading history...</div>
    </div>
  );

  return (
    <div className="py-4 px-3">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h4 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-clock-history" style={{ color: 'var(--gold)' }}></i>
            History
          </h4>
          <small className="text-muted">Past delivered and refunded orders</small>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <div className="d-flex gap-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className="btn btn-sm"
                style={{
                  borderRadius: 50,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  background: filter === f.key ? 'var(--gold)' : 'rgba(201,168,76,0.1)',
                  color: filter === f.key ? '#000' : 'var(--gold)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  padding: '3px 12px',
                }}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="position-relative">
            <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(201,168,76,0.5)', fontSize: '0.82rem', pointerEvents: 'none' }}></i>
            <input
              className="form-control form-control-sm"
              placeholder="Search by name or ID..."
              style={{ width: 200, paddingLeft: '2.1rem' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="d-flex gap-2 mb-4">
        <button
          className="btn btn-sm"
          style={{
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.8rem',
            background: section === 'delivered' ? 'rgba(62,207,142,0.15)' : 'rgba(255,255,255,0.04)',
            color: section === 'delivered' ? '#3ecf8e' : 'rgba(200,196,188,0.5)',
            border: `1px solid ${section === 'delivered' ? 'rgba(62,207,142,0.3)' : 'rgba(255,255,255,0.08)'}`,
            padding: '5px 16px',
          }}
          onClick={() => setSection('delivered')}
        >
          <i className="bi bi-check2-circle me-2"></i>
          Delivered
          <span className="ms-2 badge" style={{ background: 'rgba(62,207,142,0.2)', color: '#3ecf8e', fontSize: '0.7rem', borderRadius: 50 }}>
            {deliveredOrders.length}
          </span>
        </button>
        <button
          className="btn btn-sm"
          style={{
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.8rem',
            background: section === 'refunded' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.04)',
            color: section === 'refunded' ? '#f87171' : 'rgba(200,196,188,0.5)',
            border: `1px solid ${section === 'refunded' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`,
            padding: '5px 16px',
          }}
          onClick={() => setSection('refunded')}
        >
          <i className="bi bi-arrow-counterclockwise me-2"></i>
          Refunded
          <span className="ms-2 badge" style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', fontSize: '0.7rem', borderRadius: 50 }}>
            {refundedOrders.length}
          </span>
        </button>
      </div>

      {section === 'delivered' && (
        <>
          {/* Stats */}
          <div className="row g-3 mb-4">
            <StatCard icon="bi-currency-exchange" label="Total Revenue"     value={`Rs.${totalRevenue.toFixed(2)}`}    color="var(--gold)"  bg="rgba(201,168,76,0.12)" />
            <StatCard icon="bi-check2-all"         label="Orders Delivered" value={deliveredOrders.length}              color="#3ecf8e"      bg="rgba(62,207,142,0.12)" />
            <StatCard icon="bi-graph-up"           label="Average Order"    value={`Rs.${avgOrder.toFixed(2)}`}        color="#4a9eff"      bg="rgba(74,158,255,0.12)" />
            <StatCard icon="bi-truck"              label="Delivery Revenue" value={`Rs.${deliveryRevenue.toFixed(2)}`} color="#f4a24e"      bg="rgba(244,162,78,0.12)" />
          </div>

          {deliveredOrders.length > 0 && (
            <div className="mb-4 d-flex gap-3 flex-wrap">
              <span className="badge px-3 py-2" style={{ background: 'rgba(74,158,255,0.12)', color: '#74aaff', borderRadius: 50, fontSize: '0.76rem' }}>
                <i className="bi bi-truck me-1"></i>{deliveryCount} Delivery
              </span>
              <span className="badge px-3 py-2" style={{ background: 'rgba(100,100,100,0.15)', color: '#9ca3af', borderRadius: 50, fontSize: '0.76rem' }}>
                <i className="bi bi-bag me-1"></i>{deliveredOrders.length - deliveryCount} Takeaway
              </span>
              <span className="badge px-3 py-2" style={{ background: 'rgba(244,180,66,0.12)', color: '#f4b942', borderRadius: 50, fontSize: '0.76rem' }}>
                <i className="bi bi-star-fill me-1"></i>{allReviews.filter(r => deliveredOrders.some(o => o.id === r.orderId)).length} Reviews
              </span>
            </div>
          )}

          {deliveredOrders.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
              <p className="mt-3 small">No delivered orders for this period.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.35)', marginBottom: 8 }}>
                <i className="bi bi-info-circle me-1"></i>Click rows with reviews to expand
              </div>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                <thead>
                  <tr style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <th style={{ paddingBottom: 8, paddingLeft: 12 }}>Order ID</th>
                    <th style={{ paddingBottom: 8 }}>Customer</th>
                    <th style={{ paddingBottom: 8 }}>Type</th>
                    <th style={{ paddingBottom: 8 }}>Items</th>
                    <th style={{ paddingBottom: 8 }}>Total</th>
                    <th style={{ paddingBottom: 8 }}>Date</th>
                    <th style={{ paddingBottom: 8, textAlign: 'center' }}>Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveredOrders.map(order => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      reviewsForOrder={reviewsByOrder[order.id] || []}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {section === 'refunded' && (
        <>
          <div className="mb-4" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: 600 }}>
              <i className="bi bi-info-circle me-2"></i>
              Total refunded: <strong>Rs.{refundedOrders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)}</strong>
              <span className="ms-3 text-muted" style={{ fontWeight: 400, fontSize: '0.75rem' }}>({refundedOrders.length} orders)</span>
            </div>
          </div>
          <RefundedTable orders={refundedOrders} />
        </>
      )}
    </div>
  );
};

export default History;
