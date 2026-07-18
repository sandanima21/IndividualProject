/**
 * Orders — customer order list and live delivery tracker.
 *
 * Two tabs:
 *  "Active"  — PAID orders that haven't been DELIVERED or CANCELLED yet.
 *  "History" — DELIVERED orders, with review and reorder actions.
 *
 * Status updates arrive via WebSocket (/topic/order-status/{userId}).
 * A 30-second polling fallback ensures the list stays fresh if the socket drops.
 *
 * PayHere recovery (handled in load()):
 *  Step 1 — explicit: CONFIRMED_PAYMENT_KEY is set when onCompleted fires.
 *  Step 2 — fallback: PENDING_PAYMENT_KEY survives a closed popup and is used
 *            to call markOrderPaid in case onCompleted never fired (PayHere sandbox quirk).
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { StoreContext } from '../../context/StoreContext';
import { getMyOrders, cancelOrder, submitDeliveryReview, getDeliveryReviewByOrder, markOrderPaid } from '../../service/orderservice';
import { addReview } from '../../service/reviewservice';
import { toast } from 'react-toastify';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PENDING_PAYMENT_KEY, CONFIRMED_PAYMENT_KEY } from '../../components/PayHereCheckout/PayHereCheckout';
import './Orders.css';

// Parse backend LocalDateTime (no timezone suffix) as UTC, display in Sri Lanka time (UTC+5:30)
const toSLDate = ts => new Date(ts + 'Z').toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' });
const toSLDateTime = ts => new Date(ts + 'Z').toLocaleString('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const REFUND_STATUS_META = {
  PENDING_REFUND:   { label: 'Refund Pending',   color: '#f4a24e', bg: 'rgba(244,162,78,0.12)',  icon: 'bi-hourglass-split' },
  REFUND_INITIATED: { label: 'Refund Initiated',  color: '#4a9eff', bg: 'rgba(74,158,255,0.12)', icon: 'bi-arrow-repeat'   },
  REFUNDED:         { label: 'Refunded',           color: '#3ecf8e', bg: 'rgba(62,207,142,0.12)', icon: 'bi-check-circle'   },
  REFUND_FAILED:    { label: 'Refund Failed',      color: '#f87171', bg: 'rgba(248,113,113,0.12)',icon: 'bi-x-circle'       },
};

// Restaurant fixed coordinates (from Contact Us map)
const RESTAURANT_LAT = 6.844176631120501;
const RESTAURANT_LNG = 80.03913846950536;

const CancelButton = ({ orderId, token, onCancelled }) => {
  const [showModal, setShowModal] = useState(false);
  const [cancelling, setCancelling]   = useState(false);
  const [bankName, setBankName]       = useState('');
  const [bankBranch, setBankBranch]   = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const handleConfirm = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      toast.error('Please fill in all required bank details.');
      return;
    }
    setCancelling(true);
    try {
      await cancelOrder(orderId, token, {
        bankName: bankName.trim(),
        bankBranch: bankBranch.trim(),
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolder.trim(),
      });
      toast.success('Order cancelled. Refund will be processed within 2–4 business days.');
      setShowModal(false);
      onCancelled();
    } catch {
      toast.error('Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <button className="cancel-order-btn" onClick={() => setShowModal(true)}>
        <i className="bi bi-x-circle-fill"></i>Cancel Order
      </button>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => !cancelling && setShowModal(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', width: 420, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-0 fw-bold">Cancel Order</h6>
                <small className="text-muted">Provide your bank details to receive the refund</small>
              </div>
              {!cancelling && (
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(200,196,188,0.5)', cursor: 'pointer', fontSize: '1.2rem' }}>
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>

            {/* Warning */}
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>
                <i className="bi bi-exclamation-triangle me-2"></i>This action cannot be undone.
              </div>
              <div style={{ fontSize: '0.74rem', color: 'rgba(200,196,188,0.55)', marginTop: 4 }}>
                Refunds are processed manually within 2–4 business days via bank transfer.
              </div>
            </div>

            {/* Bank details form */}
            <div style={{ fontSize: '0.72rem', color: 'rgba(200,196,188,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Bank Details for Refund
            </div>

            <div className="mb-3">
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Bank Name <span style={{ color: '#f87171' }}>*</span></label>
              <input className="form-control form-control-sm" placeholder="e.g. Commercial Bank of Ceylon"
                value={bankName} onChange={e => setBankName(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Branch <span style={{ color: 'rgba(200,196,188,0.35)', fontWeight: 400 }}>(optional)</span></label>
              <input className="form-control form-control-sm" placeholder="e.g. Kandy Main Branch"
                value={bankBranch} onChange={e => setBankBranch(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Account Number <span style={{ color: '#f87171' }}>*</span></label>
              <input className="form-control form-control-sm" placeholder="Your account number"
                value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Account Holder Name <span style={{ color: '#f87171' }}>*</span></label>
              <input className="form-control form-control-sm" placeholder="Name as it appears on your account"
                value={accountHolder} onChange={e => setAccountHolder(e.target.value)} />
            </div>

            <div className="d-flex gap-2 justify-content-end">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowModal(false)} disabled={cancelling}>
                Keep Order
              </button>
              <button className="btn btn-sm" disabled={cancelling}
                style={{ background: '#f87171', border: 'none', color: '#fff', fontWeight: 600 }}
                onClick={handleConfirm}>
                {cancelling && <span className="spinner-border spinner-border-sm me-1"></span>}
                Cancel & Request Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const restaurantIcon = L.divIcon({
  html: '<div style="background:#c9a84c;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🍛</div>',
  iconSize: [32, 32], iconAnchor: [16, 16], className: '',
});
const riderIcon = L.divIcon({
  html: '<div style="background:#3ecf8e;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🛵</div>',
  iconSize: [34, 34], iconAnchor: [17, 17], className: '',
});
const destIcon = L.divIcon({
  html: '<div style="background:#4a9eff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🏠</div>',
  iconSize: [32, 32], iconAnchor: [16, 32], className: '',
});

/**
 * Fetches a driving route polyline from OSRM.
 * Memoised by stringified lat/lng to avoid refetching on every render.
 * The result is null until the request resolves, so callers should guard before rendering.
 */
const useOsrmRoute = (from, to) => {
  const [route, setRoute] = useState(null);
  const fromKey = from ? `${from.lat.toFixed(3)},${from.lng.toFixed(3)}` : null;
  const toKey = to ? `${to.lat.toFixed(3)},${to.lng.toFixed(3)}` : null;
  const fromRef = useRef(from);
  const toRef = useRef(to);
  fromRef.current = from;
  toRef.current = to;
  useEffect(() => {
    if (!fromKey || !toKey) { setRoute(null); return; }
    const f = fromRef.current;
    const t = toRef.current;
    const ctrl = new AbortController();
    fetch(`https://router.project-osrm.org/route/v1/driving/${f.lng},${f.lat};${t.lng},${t.lat}?overview=full&geometries=geojson`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => {
        if (d.routes?.[0]?.geometry?.coordinates)
          setRoute(d.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [fromKey, toKey]);
  return route;
};

const DeliveryTracker = ({ order }) => {
  const [driverPos, setDriverPos] = useState(
    order.deliveryPersonCurrentLat
      ? { lat: order.deliveryPersonCurrentLat, lng: order.deliveryPersonCurrentLng }
      : null
  );
  const [etaMinutes, setEtaMinutes] = useState(null);
  const stompRef = useRef(null);
  const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
  const destination = order.deliveryLat && order.deliveryLng
    ? { lat: order.deliveryLat, lng: order.deliveryLng } : null;
  const route = useOsrmRoute(driverPos, destination);

  // Fetch initial tracking snapshot
  useEffect(() => {
    if (!isOutForDelivery || !order.deliveryPersonId) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/tracking/order/${order.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.latitude && d.longitude) setDriverPos({ lat: d.latitude, lng: d.longitude });
        if (d.etaMinutes != null) setEtaMinutes(d.etaMinutes);
      })
      .catch(() => {});
  }, [order.id, order.deliveryPersonId, isOutForDelivery]);

  useEffect(() => {
    if (!isOutForDelivery || !order.deliveryPersonId) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_URL}/ws`),
      onConnect: () => {
        client.subscribe(`/topic/order/${order.id}/tracking`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.lat != null && data.lng != null) setDriverPos({ lat: data.lat, lng: data.lng });
          if (data.etaMinutes != null) setEtaMinutes(data.etaMinutes);
        });
      },
    });
    client.activate();
    stompRef.current = client;
    return () => client.deactivate();
  }, [order.id, order.deliveryPersonId, isOutForDelivery]);

  const hasDestination = !!destination;
  const center = driverPos
    ? [driverPos.lat, driverPos.lng]
    : hasDestination
    ? [order.deliveryLat, order.deliveryLng]
    : [RESTAURANT_LAT, RESTAURANT_LNG];

  return (
    <div className="mt-3">
      <div className="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
        <small className="fw-semibold">
          <i className={`bi ${isOutForDelivery ? 'bi-broadcast text-success' : 'bi-shop text-warning'} me-1`}></i>
          {isOutForDelivery && driverPos ? 'Live: Rider location' : isOutForDelivery ? 'Order is on the way' : 'Your order is ready — awaiting pickup from restaurant'}
        </small>
        {isOutForDelivery && etaMinutes != null && (
          <span className="badge" style={{ background: 'rgba(62,207,142,0.15)', color: '#3ecf8e', fontSize: '0.75rem', padding: '4px 10px', borderRadius: 20 }}>
            <i className="bi bi-clock me-1"></i>ETA ~{etaMinutes} min
          </span>
        )}
      </div>
      <div style={{ height: 220, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[RESTAURANT_LAT, RESTAURANT_LNG]} icon={restaurantIcon}>
            <Popup>KukiHabun Restaurant</Popup>
          </Marker>
          {isOutForDelivery && driverPos && (
            <Marker position={[driverPos.lat, driverPos.lng]} icon={riderIcon}>
              <Popup>Your delivery rider{etaMinutes != null ? ` · ETA ~${etaMinutes} min` : ''}</Popup>
            </Marker>
          )}
          {hasDestination && (
            <Marker position={[order.deliveryLat, order.deliveryLng]} icon={destIcon}>
              <Popup>Your delivery address</Popup>
            </Marker>
          )}
          {route && route.length > 1 && (
            <Polyline positions={route} pathOptions={{ color: '#3ecf8e', weight: 4, opacity: 0.75, dashArray: '8,6' }} />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

const STATUS_STEPS = [
  { key: 'PENDING',          icon: 'bi-clock-history',   label: 'Pending'    },
  { key: 'CONFIRMED',        icon: 'bi-check-circle',    label: 'Confirmed'  },
  { key: 'COOKING',          icon: 'bi-fire',            label: 'Cooking'    },
  { key: 'READY',            icon: 'bi-bag-check',       label: 'Ready'      },
  { key: 'OUT_FOR_DELIVERY', icon: 'bi-bicycle',         label: 'On the Way' },
  { key: 'DELIVERED',        icon: 'bi-house-check-fill',label: 'Delivered'  },
];

const TAKEAWAY_STATUS_STEPS = [
  { key: 'PENDING',   icon: 'bi-clock-history',  label: 'Pending'   },
  { key: 'CONFIRMED', icon: 'bi-check-circle',   label: 'Confirmed' },
  { key: 'COOKING',   icon: 'bi-fire',           label: 'Cooking'   },
  { key: 'READY',     icon: 'bi-bag-check',      label: 'Ready'     },
  { key: 'DELIVERED', icon: 'bi-bag-heart-fill', label: 'Picked Up' },
];

const statusColor = {
  PENDING: 'secondary',
  CONFIRMED: 'primary',
  COOKING: 'warning',
  READY: 'success',
  DELIVERED: 'dark',
};

const ReviewModal = ({ item, orderId, token, onDone }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await addReview({ foodId: item.foodId, orderId, rating, comment }, token);
      toast.success('Review submitted!');
      onDone();
    } catch (e) {
      toast.error(e.response?.status === 409 ? 'Already reviewed this item.' : 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal fade" id={`reviewModal-${item.foodId}-${orderId}`} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title">Review: {item.foodName}</h6>
            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Rating</label>
              <div className="d-flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <i
                    key={n}
                    className={`bi ${n <= rating ? 'bi-star-fill text-warning' : 'bi-star'} fs-4`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setRating(n)}
                  />
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Comment</label>
              <textarea className="form-control" rows="3" value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting && <span className="spinner-border spinner-border-sm me-2"></span>}Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeliveryReviewModal = ({ orderId, token, onDone }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitDeliveryReview({ orderId, rating, comment }, token);
      toast.success('Delivery review submitted!');
      onDone();
    } catch (e) {
      toast.error(e.response?.status === 409 ? 'You already reviewed this delivery.' : 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal fade" id={`drModal-${orderId}`} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title"><i className="bi bi-bicycle me-2" style={{ color: '#a78bfa' }}></i>Rate Your Delivery</h6>
            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Rating</label>
              <div className="d-flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <i key={n}
                    className={`bi ${n <= rating ? 'bi-star-fill text-warning' : 'bi-star'} fs-4`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setRating(n)}
                  />
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Comment <span className="text-muted">(optional)</span></label>
              <textarea className="form-control" rows="3" value={comment} onChange={e => setComment(e.target.value)} placeholder="How was your delivery experience?" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting && <span className="spinner-border spinner-border-sm me-2"></span>}Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;
  return (
    <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.6)' }} tabIndex="-1" onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h6 className="modal-title mb-0">Order Details</h6>
              <small style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{order.displayId || `#${order.id.slice(-6).toUpperCase()}`}</small>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {/* Meta */}
            <div className="d-flex justify-content-between mb-3 flex-wrap gap-2">
              <span className="badge bg-secondary">{order.status}</span>
              <small className="text-muted">{toSLDateTime(order.createdAt)}</small>
            </div>

            {/* Items */}
            <h6 className="mb-2" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(240,236,224,0.5)' }}>Items</h6>
            {(order.items ?? []).map(item => (
              <div key={item.foodId} className="d-flex align-items-center gap-3 mb-2">
                <img src={item.foodImageUrl} alt={item.foodName} style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                <div className="flex-fill">
                  <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{item.foodName} × {item.quantity}</div>
                  {item.spiceLevel && <small className="text-muted d-block">Spice: {item.spiceLevel}</small>}
                  {item.ingredientsToAvoid?.length > 0 && <small className="text-danger d-block">Avoid: {item.ingredientsToAvoid.join(', ')}</small>}
                  {item.customOptions && Object.entries(item.customOptions).map(([k, v]) => (
                    <small key={k} className="text-muted d-block">{k}: {v}</small>
                  ))}
                </div>
                <span className="fw-semibold" style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Rs.{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}

            <hr />

            {/* Pricing */}
            <div className="d-flex justify-content-between mb-1 small">
              <span className="text-muted">Subtotal</span><span>Rs.{order.subtotal?.toFixed(2)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">Delivery fee</span><span>Rs.{order.deliveryFee?.toFixed(2)}</span>
              </div>
            )}
            <div className="d-flex justify-content-between fw-bold mt-2">
              <span>Total</span><span>Rs.{order.total?.toFixed(2)}</span>
            </div>

            <hr />

            {/* Delivery info */}
            <h6 className="mb-2" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(240,236,224,0.5)' }}>
              {order.orderType === 'delivery' ? 'Delivery Info' : 'Take-away Info'}
            </h6>
            {order.orderType === 'delivery' ? (
              <div className="small">
                <div><i className="bi bi-geo-alt me-1 text-muted"></i>{order.deliveryAddress}</div>
                {order.mobileNumber && <div className="mt-1"><i className="bi bi-telephone me-1 text-muted"></i>{order.mobileNumber}</div>}
              </div>
            ) : (
              <div className="small"><i className="bi bi-telephone me-1 text-muted"></i>{order.mobileNumber}</div>
            )}

            {/* Payment */}
            <div className="d-flex justify-content-between align-items-center mt-3 small">
              <span className="text-muted">Payment</span>
              <span className={`badge ${order.paymentStatus === 'PAID' ? 'bg-success' : order.paymentStatus === 'REFUNDED' ? 'bg-info' : 'bg-warning text-dark'}`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// statusFilter: 'active' = non-delivered, 'delivered' = DELIVERED only, undefined = all
const Orders = ({ embedded = false, maxItems = null, statusFilter }) => {
  const { user, token, reorderItems, clearCart } = useContext(StoreContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(
    searchParams.get('tab') === 'history' ? 'history' :
    searchParams.get('tab') === 'cancelled' ? 'cancelled' : 'active'
  );
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewedOrders, setReviewedOrders] = useState(new Set());
  const [detailsOrder, setDetailsOrder] = useState(null);
  // Tracks order IDs whose review status has already been fetched, so polling
  // doesn't re-issue the same 404 request every 30 s for unreviewed orders.
  const checkedReviewsRef = useRef(new Set());

  // Handle return from PayHere form-POST checkout (just clean the URL — load() does the real work)
  useEffect(() => {
    const orderId    = searchParams.get('order_id');
    const statusCode = searchParams.get('status_code');

    if (!orderId) return;

    if (statusCode === '2') {
      // Confirmed success from PayHere — set the confirmed key so load() can mark it paid
      const pendingId = sessionStorage.getItem(PENDING_PAYMENT_KEY);
      if (pendingId) sessionStorage.setItem(CONFIRMED_PAYMENT_KEY, pendingId);
      sessionStorage.removeItem(PENDING_PAYMENT_KEY);
      navigate('/orders', { replace: true });
    } else if (statusCode === '-1' || statusCode === '-2') {
      // Payment cancelled/failed — clean up and go back to cart
      sessionStorage.removeItem(PENDING_PAYMENT_KEY);
      sessionStorage.removeItem(CONFIRMED_PAYMENT_KEY);
      sessionStorage.removeItem('kukihabun_pending_offer');
      toast.info('Payment was not completed. Your cart is still saved.');
      navigate('/cart', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    if (!token) return;
    try {
      // ── PayHere recovery ─────────────────────────────────────────────────
      // PayHere has two completion paths and each is handled independently:

      // Step 1 — Explicit confirmation.
      // CONFIRMED_PAYMENT_KEY is set either by Cart's onCompleted callback or by
      // the form-POST return URL handler above (status_code=2). This is the
      // authoritative success signal and is processed first.
      const confirmedId = sessionStorage.getItem(CONFIRMED_PAYMENT_KEY);
      if (confirmedId) {
        try {
          await markOrderPaid(confirmedId, token);
          toast.success('Payment confirmed! Your order is placed.');
          clearCart();
        } catch { /* already marked, or a transient backend error — keep going */ }
        sessionStorage.removeItem(CONFIRMED_PAYMENT_KEY);
        sessionStorage.removeItem('kukihabun_pending_offer');
      }

      // Step 2 — Fallback (popup closed without onCompleted firing).
      // This is common in PayHere sandbox: the popup closes but the callback
      // never fires. PENDING_PAYMENT_KEY is set before the popup opens and only
      // cleared by the explicit success path. If it's still here, assume payment
      // went through and attempt to mark the order paid.
      const pendingId = sessionStorage.getItem(PENDING_PAYMENT_KEY);
      if (pendingId && pendingId !== confirmedId) {
        try {
          await markOrderPaid(pendingId, token);
          toast.success('Payment confirmed! Your order is placed.');
          clearCart();
        } catch { /* order may not exist or is already paid — proceed regardless */ }
        sessionStorage.removeItem(PENDING_PAYMENT_KEY);
        sessionStorage.removeItem('kukihabun_pending_offer');
      }

      const data = await getMyOrders(token);
      setOrders(data);
      // Only fetch review status for orders not yet checked — avoids a 404 request
      // every 30 s for orders that simply haven't been reviewed yet.
      const unchecked = data.filter(
        o => o.status === 'DELIVERED' && o.orderType === 'delivery' &&
             !checkedReviewsRef.current.has(o.id)
      );
      if (unchecked.length > 0) {
        const checks = await Promise.allSettled(
          unchecked.map(o => getDeliveryReviewByOrder(o.id))
        );
        setReviewedOrders(prev => {
          const next = new Set(prev);
          unchecked.forEach((o, i) => {
            checkedReviewsRef.current.add(o.id);
            if (checks[i].status === 'fulfilled' && checks[i].value !== null) next.add(o.id);
          });
          return next;
        });
      }
    } catch {
      toast.error('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // 30-second polling as a fallback for when WebSocket events are missed
    // (e.g. brief connection drops, Safari restrictions).
    const poll = setInterval(load, 30_000);
    return () => clearInterval(poll);
  }, [token]);

  // ── Real-time updates ─────────────────────────────────────────────────────
  // WebSocket delivers status changes instantly (e.g. CONFIRMED → COOKING).
  // The subscription is per-user so only this customer's orders are pushed.
  // Merges the updated order into the existing list without a full refetch.
  useEffect(() => {
    if (!user?.id) return;
    let failures = 0;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_URL}/ws`),
      reconnectDelay: 8000,
      onConnect: () => {
        failures = 0;
        client.subscribe(`/topic/order-status/${user.id}`, (msg) => {
          const updated = JSON.parse(msg.body);
          setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
        });
      },
      onWebSocketClose: () => {
        failures += 1;
        if (failures >= 5) client.deactivate(); // stop retrying after 5 consecutive failures
      },
    });
    client.activate();
    return () => client.deactivate();
  }, [user?.id]);

  if (!user) {
    return (
      <div className={embedded ? 'py-3 text-center' : 'container py-5 text-center'}>
        <i className="bi bi-lock fs-1 text-muted"></i>
        <p className="mt-3">Please sign in to view your orders.</p>
      </div>
    );
  }

  if (loading) return <div className={embedded ? 'py-3 text-center' : 'container py-5 text-center'}><div className="spinner-border"></div></div>;

  const effectiveFilter = embedded ? statusFilter :
    tab === 'history' ? 'delivered' :
    tab === 'cancelled' ? 'cancelled' : 'active';
  const isHistory = effectiveFilter === 'delivered';
  const isCancelled = effectiveFilter === 'cancelled';

  const filteredByStatus = effectiveFilter === 'active'
    ? orders.filter(o =>
        o.paymentStatus === 'PAID' &&
        o.status !== 'CANCELLED' &&
        o.status !== 'DELIVERED'
      )
    : effectiveFilter === 'delivered'
      ? orders.filter(o => o.status === 'DELIVERED')
      : effectiveFilter === 'cancelled'
        ? orders.filter(o => o.status === 'CANCELLED')
        : orders;
  const displayOrders = maxItems ? filteredByStatus.slice(0, maxItems) : filteredByStatus;

  const cancelledCount = orders.filter(o => o.status === 'CANCELLED').length;

  // Always show live data in the details modal
  const liveDetailsOrder = detailsOrder ? orders.find(o => o.id === detailsOrder.id) ?? detailsOrder : null;

  const handleOrderAgain = (order) => {
    reorderItems(order.items);
    navigate('/cart');
  };

  const inner = (
    <>
      {displayOrders.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-bag-x fs-1 text-muted"></i>
          <p className="mt-3 text-muted">{isHistory ? 'No order history yet.' : isCancelled ? 'No cancelled orders.' : 'No active orders.'}</p>
          {!isCancelled && <Link to="/explore" className="btn btn-primary mt-2">Start Ordering</Link>}
        </div>
      ) : isCancelled ? (
        displayOrders.map(order => {
          const refundMeta = REFUND_STATUS_META[order.refundStatus] || { label: 'Processing', color: '#9ca3af', bg: 'rgba(100,100,100,0.12)', icon: 'bi-hourglass' };
          return (
            <div key={order.id} className="card mb-3" style={{ borderColor: 'rgba(248,113,113,0.25)', opacity: 0.9 }}>
              <div className="card-header d-flex justify-content-between align-items-center" style={{ background: 'rgba(248,113,113,0.05)' }}>
                <div>
                  <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                    <span style={{ color: '#f87171', fontFamily: 'monospace', fontSize: '0.82rem', marginRight: 6 }}>{order.displayId || `#${order.id.slice(-6).toUpperCase()}`}</span>
                    {order.orderType === 'delivery' ? '🚚 Delivery' : '🛍 Take-away'}
                  </span>
                  <span className="badge ms-2" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>Cancelled</span>
                </div>
                <small className="text-muted">{toSLDate(order.createdAt)}</small>
              </div>
              <div className="card-body">
                {(order.items ?? []).map(item => (
                  <div key={item.foodId} className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-3">
                      <img src={item.foodImageUrl} alt={item.foodName} style={{ width: 50, height: 40, objectFit: 'cover', borderRadius: 6, opacity: 0.7 }} />
                      <div>
                        <div className="fw-semibold" style={{ opacity: 0.8 }}>{item.foodName} × {item.quantity}</div>
                      </div>
                    </div>
                    <span style={{ opacity: 0.7 }}>Rs.{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <hr />
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: refundMeta.bg, color: refundMeta.color, fontSize: '0.78rem', fontWeight: 600 }}>
                      <i className={`bi ${refundMeta.icon}`}></i>
                      {refundMeta.label}
                    </div>
                    {order.refundStatus === 'PENDING_REFUND' || order.refundStatus == null ? (
                      <div className="mt-1" style={{ fontSize: '0.72rem', color: 'rgba(200,196,188,0.45)' }}>
                        <i className="bi bi-info-circle me-1"></i>Refunds are processed within 2–4 business days.
                      </div>
                    ) : null}
                    {/* Bank details summary */}
                    {order.refundBankName && (
                      <div className="mt-2" style={{ fontSize: '0.72rem', color: 'rgba(200,196,188,0.45)', lineHeight: 1.6 }}>
                        <i className="bi bi-bank me-1"></i>
                        {order.refundBankName}{order.refundBankBranch ? ` · ${order.refundBankBranch}` : ''}
                        {order.refundAccountNumber && <span className="ms-2" style={{ fontFamily: 'monospace' }}>{order.refundAccountNumber}</span>}
                      </div>
                    )}
                  </div>

                  {/* Admin-uploaded receipt */}
                  {order.refundReceiptUrl && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.4)', marginBottom: 4 }}>Refund Receipt</div>
                      <img
                        src={order.refundReceiptUrl}
                        alt="Refund receipt"
                        onClick={() => window.open(order.refundReceiptUrl, '_blank')}
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(62,207,142,0.3)', cursor: 'pointer' }}
                      />
                      <div style={{ fontSize: '0.65rem', color: '#3ecf8e', marginTop: 3 }}>
                        <i className="bi bi-check-circle me-1"></i>Tap to view
                      </div>
                    </div>
                  )}

                  <strong style={{ opacity: 0.8 }}>Total: Rs.{order.total?.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        displayOrders.map(order => (
          <div key={order.id} className="card mb-4 shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center flex-wrap gap-2">
                <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--gold)', fontFamily: 'monospace', fontSize: '0.82rem', marginRight: 6 }}>{order.displayId || `#${order.id.slice(-6).toUpperCase()}`}</span>
                  {order.orderType === 'delivery' ? '🚚 Delivery' : '🛍 Take-away'}
                </span>
                {order.status === 'DELIVERED' && order.orderType === 'takeaway' ? (
                  <span style={{
                    background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.45)',
                    color: 'var(--gold)', fontWeight: 700, fontSize: '0.72rem',
                    borderRadius: 20, padding: '2px 10px', letterSpacing: '0.03em',
                  }}>
                    <i className="bi bi-bag-heart-fill me-1"></i>You take that
                  </span>
                ) : order.status === 'DELIVERED' && order.orderType === 'delivery' ? (
                  <span className="badge bg-success ms-1">Delivered</span>
                ) : (
                  <span className={`badge bg-${statusColor[order.status]} ms-1`}>
                    {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                  </span>
                )}
              </div>
              <small className="text-muted">{toSLDate(order.createdAt)}</small>
            </div>

            {/* Status tracker — only for active orders */}
            {!isHistory && (() => {
              const steps = order.orderType === 'takeaway' ? TAKEAWAY_STATUS_STEPS : STATUS_STEPS;
              const stepIndex = steps.findIndex(s => s.key === order.status);
              return (
                <div className="card-body border-bottom pb-3">
                  <div className="order-tracker d-flex justify-content-between">
                    {steps.map((step, i) => {
                      const done   = i <= stepIndex;
                      const active = i === stepIndex;
                      return (
                        <div key={step.key} className="tracker-step">
                          <div className={`tracker-dot${done ? ' done' : ''}${active ? ' active' : ''}`}>
                            <i className={`bi ${step.icon}`}></i>
                          </div>
                          <span className={`tracker-label${done ? ' done' : ''}`}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="card-body">
              {(order.items ?? []).map(item => (
                <div key={item.foodId} className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-3">
                    <img src={item.foodImageUrl} alt={item.foodName} style={{ width: 50, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                    <div>
                      <div className="fw-semibold">{item.foodName} × {item.quantity}</div>
                      {item.spiceLevel && <small className="text-muted d-block">Spice: {item.spiceLevel}</small>}
                      {item.ingredientsToAvoid?.length > 0 && (
                        <small className="text-danger d-block">Avoid: {item.ingredientsToAvoid.join(', ')}</small>
                      )}
                      {item.customOptions && Object.entries(item.customOptions).map(([k, v]) => (
                        <small key={k} className="text-muted d-block">{k}: {v}</small>
                      ))}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span>Rs.{(item.price * item.quantity).toFixed(2)}</span>
                    {isHistory && (
                      <>
                        <button
                          className="btn btn-sm btn-outline-warning"
                          data-bs-toggle="modal"
                          data-bs-target={`#reviewModal-${item.foodId}-${order.id}`}
                        >
                          <i className="bi bi-star me-1"></i>Review
                        </button>
                        <ReviewModal item={item} orderId={order.id} token={token} onDone={load} />
                      </>
                    )}
                  </div>
                </div>
              ))}

              <hr />
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span className="text-muted small">{order.orderType === 'delivery' ? `Delivery to: ${order.deliveryAddress}` : `Take-away · ${order.mobileNumber}`}</span>
                <div className="d-flex align-items-center gap-3">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => setDetailsOrder(order)}
                  >
                    <i className="bi bi-receipt me-1"></i>Details
                  </button>
                  {!isHistory && order.status === 'PENDING' && (
                    <CancelButton orderId={order.id} token={token} onCancelled={load} />
                  )}
                  {isHistory && (
                    <>
                      {order.orderType === 'delivery' && order.deliveryPersonId && !reviewedOrders.has(order.id) && (
                        <>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
                            data-bs-toggle="modal"
                            data-bs-target={`#drModal-${order.id}`}
                          >
                            <i className="bi bi-bicycle me-1"></i>Rate Delivery
                          </button>
                          <DeliveryReviewModal orderId={order.id} token={token} onDone={load} />
                        </>
                      )}
                      {order.orderType === 'delivery' && reviewedOrders.has(order.id) && (
                        <span className="small text-muted"><i className="bi bi-check-circle me-1 text-success"></i>Delivery rated</span>
                      )}
                      <button className="btn btn-sm btn-primary" onClick={() => handleOrderAgain(order)}>
                        <i className="bi bi-arrow-clockwise me-1"></i>Order Again
                      </button>
                    </>
                  )}
                  <div className="text-end">
                    <strong>Total: Rs.{order.total.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Rider info card — shown when rider has been assigned */}
              {!isHistory && order.orderType === 'delivery' && order.status === 'OUT_FOR_DELIVERY' && order.deliveryPersonId && (
                <div className="d-flex align-items-center gap-3 p-3 rounded-3 mb-3"
                  style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)' }}>
                  {order.deliveryPersonPicture
                    ? <img src={order.deliveryPersonPicture} alt="Rider" width={46} height={46} className="rounded-circle flex-shrink-0" style={{ objectFit: 'cover', border: '2px solid rgba(167,139,250,0.5)' }} />
                    : <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.3rem', border: '2px solid rgba(167,139,250,0.3)' }}>🛵</div>
                  }
                  <div className="flex-fill">
                    <div className="small fw-semibold" style={{ color: '#a78bfa' }}>
                      <i className="bi bi-bicycle me-1"></i>Your Delivery Rider
                    </div>
                    <div className="fw-semibold">{order.deliveryPersonName || 'Rider'}</div>
                  </div>
                  {order.deliveryPersonPhone && (
                    <a href={`tel:${order.deliveryPersonPhone}`}
                      className="btn btn-sm fw-semibold flex-shrink-0"
                      style={{ background: 'rgba(62,207,142,0.12)', color: '#3ecf8e', border: '1px solid rgba(62,207,142,0.3)', borderRadius: 8 }}>
                      <i className="bi bi-telephone-fill me-1"></i>{order.deliveryPersonPhone}
                    </a>
                  )}
                </div>
              )}

              {!isHistory && order.orderType === 'delivery' && ['READY', 'OUT_FOR_DELIVERY'].includes(order.status) && (
                <DeliveryTracker order={order} />
              )}
            </div>
          </div>
        ))
      )}
    </>
  );

  if (embedded) return (
    <>
      <div>{inner}</div>
      {liveDetailsOrder && <OrderDetailsModal order={liveDetailsOrder} onClose={() => setDetailsOrder(null)} />}
    </>
  );

  return (
    <>
      <div className="container py-5">
        <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
          <button
            className={`btn btn-sm ${tab === 'active' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTab('active')}
          >
            <i className="bi bi-bag-check me-1"></i>Active Orders
          </button>
          <button
            className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTab('history')}
          >
            <i className="bi bi-clock-history me-1"></i>History
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: tab === 'cancelled' ? 'rgba(248,113,113,0.15)' : 'transparent',
              color: tab === 'cancelled' ? '#f87171' : 'rgba(240,236,224,0.5)',
              border: `1px solid ${tab === 'cancelled' ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.15)'}`,
            }}
            onClick={() => setTab('cancelled')}
          >
            <i className="bi bi-x-circle me-1"></i>Cancelled
            {cancelledCount > 0 && (
              <span className="ms-1 badge" style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', fontSize: '0.65rem', borderRadius: 20 }}>
                {cancelledCount}
              </span>
            )}
          </button>
        </div>
        {inner}
      </div>
      {liveDetailsOrder && <OrderDetailsModal order={liveDetailsOrder} onClose={() => setDetailsOrder(null)} />}
    </>
  );
};

export default Orders;
