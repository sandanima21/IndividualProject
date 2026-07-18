import React, { useEffect, useRef, useState } from 'react';
import './Orders.css';
import { toast } from 'react-toastify';
import { getAllOrders, updateOrderStatus } from '../../services/orderService';
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

const restaurantIcon = L.divIcon({ className: '', html: '<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🍛</div>', iconSize: [32, 32], iconAnchor: [16, 32] });
const riderIcon      = L.divIcon({ className: '', html: '<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🛵</div>', iconSize: [32, 32], iconAnchor: [16, 32] });
const destIcon       = L.divIcon({ className: '', html: '<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🏠</div>', iconSize: [32, 32], iconAnchor: [16, 32] });

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

/* ─── Live Track Modal ─── */
const LiveTrackModal = ({ order, onClose }) => {
  const [riderPos, setRiderPos] = useState(
    order.deliveryPersonCurrentLat
      ? { lat: order.deliveryPersonCurrentLat, lng: order.deliveryPersonCurrentLng }
      : null
  );
  const [etaMinutes, setEtaMinutes] = useState(null);
  const stompRef = useRef(null);

  const RESTAURANT_LAT = order.restaurantLat || 6.844176631120501;
  const RESTAURANT_LNG = order.restaurantLng || 80.03913846950536;
  const destination = order.deliveryLat && order.deliveryLng
    ? { lat: order.deliveryLat, lng: order.deliveryLng } : null;
  const route = useOsrmRoute(riderPos, destination);

  // Fetch initial tracking snapshot
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/tracking/order/${order.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.latitude && d.longitude) setRiderPos({ lat: d.latitude, lng: d.longitude });
        if (d.etaMinutes != null) setEtaMinutes(d.etaMinutes);
      })
      .catch(() => {});
  }, [order.id]);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_URL}/ws`),
      onConnect: () => {
        client.subscribe(`/topic/order/${order.id}/tracking`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.lat != null && data.lng != null) setRiderPos({ lat: data.lat, lng: data.lng });
          if (data.etaMinutes != null) setEtaMinutes(data.etaMinutes);
        });
      },
    });
    client.activate();
    stompRef.current = client;
    return () => client.deactivate();
  }, [order.id]);

  const center = riderPos
    ? [riderPos.lat, riderPos.lng]
    : [RESTAURANT_LAT, RESTAURANT_LNG];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 18, width: '100%', maxWidth: 600, padding: '1.5rem' }}
        onClick={e => e.stopPropagation()}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0" style={{ color: '#a78bfa' }}>
            <i className="bi bi-broadcast me-2"></i>
            Live Track — {order.displayId || '#' + order.id.slice(-6).toUpperCase()}
          </h6>
          <button className="btn-close btn-close-white" onClick={onClose} />
        </div>
        <div className="mb-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <small className="text-muted">
            <i className="bi bi-person me-1"></i>{order.userName}
            {order.deliveryAddress && <> &middot; <i className="bi bi-geo-alt me-1"></i>{order.deliveryAddress}</>}
          </small>
          {etaMinutes != null && (
            <span className="badge" style={{ background: 'rgba(62,207,142,0.15)', color: '#3ecf8e', fontSize: '0.75rem', padding: '4px 12px', borderRadius: 20 }}>
              <i className="bi bi-clock me-1"></i>ETA ~{etaMinutes} min
            </span>
          )}
        </div>
        {!riderPos && (
          <div className="alert alert-warning py-2 small mb-2">
            <i className="bi bi-broadcast me-1"></i>
            Waiting for rider to share location…
          </div>
        )}
        <div style={{ height: 380, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(167,139,250,0.2)' }}>
          <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[RESTAURANT_LAT, RESTAURANT_LNG]} icon={restaurantIcon}>
              <Popup>KukiHabun (pickup)</Popup>
            </Marker>
            {riderPos && (
              <Marker position={[riderPos.lat, riderPos.lng]} icon={riderIcon}>
                <Popup>Delivery rider{etaMinutes != null ? ` · ETA ~${etaMinutes} min` : ''}</Popup>
              </Marker>
            )}
            {destination && (
              <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
                <Popup>{order.deliveryAddress || 'Delivery address'}</Popup>
              </Marker>
            )}
            {route && route.length > 1 && (
              <Polyline positions={route} pathOptions={{ color: '#a78bfa', weight: 4, opacity: 0.8, dashArray: '8,6' }} />
            )}
          </MapContainer>
        </div>
        <div className="mt-2 d-flex gap-3 small text-muted">
          <span>🍛 Restaurant</span>
          <span>🛵 Rider</span>
          <span>🏠 Customer</span>
          {route && <span style={{ color: '#a78bfa' }}>━ Route</span>}
        </div>
      </div>
    </div>
  );
};

const COLUMNS = [
  { key: 'PENDING',          displayKeys: ['PENDING'],          label: 'Pending',              icon: 'bi-clock-history',  color: '#f87171', bg: 'rgba(248,113,113,0.14)',  riderOnly: false },
  { key: 'CONFIRMED',        displayKeys: ['CONFIRMED'],        label: 'Confirmed',            icon: 'bi-check-circle',   color: '#f4a24e', bg: 'rgba(244,162,78,0.14)',   riderOnly: false },
  { key: 'COOKING',          displayKeys: ['COOKING'],          label: 'Preparing',            icon: 'bi-fire',           color: '#ffc107', bg: 'rgba(255,193,7,0.14)',    riderOnly: false },
  { key: 'READY',            displayKeys: ['READY'],            label: 'Ready',                icon: 'bi-bag-check',      color: '#4a9eff', bg: 'rgba(74,158,255,0.14)',   riderOnly: false },
  { key: 'OUT_FOR_DELIVERY', displayKeys: ['OUT_FOR_DELIVERY'], label: 'Out for Delivery',     icon: 'bi-bicycle',        color: '#a78bfa', bg: 'rgba(167,139,250,0.14)', riderOnly: false },
  { key: 'DELIVERED',        displayKeys: ['DELIVERED'],        label: 'Delivered / Picked Up', icon: 'bi-check2-all',    color: '#3ecf8e', bg: 'rgba(62,207,142,0.14)',   riderOnly: false },
];

/* ─── Order detail modal ─── */
const DetailModal = ({ order, onClose, onStatusMove }) => {
  if (!order) return null;
  const col = COLUMNS.find(c => c.displayKeys.includes(order.status)) || COLUMNS[0];
  const isDelivery = order.orderType === 'delivery';
  // Admin can move delivery orders: CONFIRMED → COOKING → READY only (rider handles OUT_FOR_DELIVERY and DELIVERED)
  // Admin can move pickup orders: CONFIRMED → COOKING → READY → DELIVERED (skip OUT_FOR_DELIVERY)
  const nextColIdx = COLUMNS.findIndex((c, i) =>
    i > COLUMNS.findIndex(c2 => c2.key === col.key) &&
    c.key !== 'OUT_FOR_DELIVERY' &&
    (!isDelivery || c.key !== 'DELIVERED'));
  const nextCol = nextColIdx !== -1 ? COLUMNS[nextColIdx] : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1055, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}
        onClick={e => e.stopPropagation()}>

        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <span style={{ fontSize: '0.72rem', color: 'rgba(200,196,188,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Order</span>
            <h5 className="fw-bold mb-0" style={{ color: 'var(--gold)', letterSpacing: '0.05em' }}>#{order.displayId || order.id.slice(-6).toUpperCase()}</h5>
            <small className="text-muted">{new Date(order.createdAt).toLocaleString()}</small>
          </div>
          <button className="btn-close btn-close-white" onClick={onClose} />
        </div>

        {/* Status + type */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <span className="badge px-3 py-2 rounded-pill" style={{ background: col.bg, color: col.color, fontSize: '0.78rem' }}>
            <i className={`bi ${col.icon} me-1`}></i>{col.label}
          </span>
          <span className="badge px-3 py-2 rounded-pill" style={{ background: order.orderType === 'delivery' ? 'rgba(74,158,255,0.15)' : 'rgba(100,100,100,0.2)', color: order.orderType === 'delivery' ? '#74aaff' : '#9ca3af', fontSize: '0.78rem' }}>
            {order.orderType === 'delivery' ? '🚚 Delivery' : '🛍 Takeaway'}
          </span>
          <span className="badge px-3 py-2 rounded-pill" style={{ background: order.paymentStatus === 'PAID' ? 'rgba(62,207,142,0.15)' : 'rgba(244,115,115,0.15)', color: order.paymentStatus === 'PAID' ? '#3ecf8e' : '#f47373', fontSize: '0.78rem' }}>
            {order.paymentStatus === 'PAID' ? '✓ Paid' : '⏳ Unpaid'}
          </span>
        </div>

        {/* Customer */}
        <div className="mb-3 p-3 rounded-3" style={{ background: '#212121', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Customer</div>
          <div className="fw-semibold">{order.userName}</div>
          {order.userEmail && <div className="small text-muted">{order.userEmail}</div>}
          {order.mobileNumber && <div className="small text-muted"><i className="bi bi-telephone me-1"></i>{order.mobileNumber}</div>}
        </div>

        {/* Delivery address */}
        {order.orderType === 'delivery' && order.deliveryAddress && (
          <div className="mb-3 p-3 rounded-3" style={{ background: '#212121', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Delivery Address</div>
            <div><i className="bi bi-geo-alt me-2" style={{ color: 'var(--gold)' }}></i>{order.deliveryAddress}</div>
            {order.deliveryFee != null && <div className="small text-muted mt-1">Fee: Rs.{order.deliveryFee?.toFixed(2)}</div>}
          </div>
        )}

        {/* Items */}
        <div className="mb-4">
          <div style={{ fontSize: '0.68rem', color: 'rgba(200,196,188,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Order Items</div>
          <div className="d-flex flex-column gap-2">
            {order.items.map((item, i) => (
              <div key={i} className="d-flex align-items-center gap-3 p-2 rounded-3" style={{ background: '#212121', border: '1px solid rgba(255,255,255,0.06)' }}>
                {item.foodImageUrl && <img src={item.foodImageUrl} alt="" style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 7 }} />}
                <div className="flex-fill">
                  <div className="fw-semibold small">{item.foodName}</div>
                  {item.spiceLevel && <span className="badge bg-warning text-dark me-1" style={{ fontSize: '0.62rem' }}>🌶 {item.spiceLevel}</span>}
                  {item.ingredientsToAvoid?.length > 0 && <span className="badge bg-danger me-1" style={{ fontSize: '0.62rem' }}>No: {item.ingredientsToAvoid.join(', ')}</span>}
                  {item.customOptions && Object.entries(item.customOptions).map(([k, v]) => (
                    <span key={k} className="badge me-1" style={{ background: 'rgba(74,158,255,0.15)', color: '#74aaff', fontSize: '0.62rem' }}>{k}: {v}</span>
                  ))}
                </div>
                <div className="text-end flex-shrink-0">
                  <div className="small text-muted">×{item.quantity}</div>
                  <div className="small fw-bold" style={{ color: 'var(--gold)' }}>Rs.{(item.price * item.quantity).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="d-flex justify-content-between align-items-center p-3 rounded-3 mb-4" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
          <span className="fw-bold">Total</span>
          <span className="fw-bold fs-5" style={{ color: 'var(--gold)' }}>Rs.{order.total?.toFixed(2)}</span>
        </div>

        {/* Actions */}
        <div className="d-flex gap-2">
          {nextCol && (
            <button className="btn btn-primary flex-fill" style={{ fontWeight: 600 }}
              onClick={() => { onStatusMove(order.id, nextCol.key); onClose(); }}>
              <i className={`bi ${nextCol.icon} me-2`}></i>Move to {nextCol.label}
            </button>
          )}
          {order.status === 'PENDING' && (
            <button className="btn btn-outline-danger px-3"
              onClick={() => { onStatusMove(order.id, 'CANCELLED'); onClose(); }}
              title="Cancel order">
              <i className="bi bi-x-circle"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Kanban card ─── */
const OrderCard = ({ order, onDragStart, onDragEnd, onClick, isDragging, onLiveTrack }) => {
  const col = COLUMNS.find(c => c.displayKeys.includes(order.status)) || COLUMNS[0];
  const itemsSummary = order.items.map(i => `${i.foodName} ×${i.quantity}`).join(' · ');

  return (
    <div
      className={`kanban-card${isDragging ? ' is-dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {/* Top row: ID + badges */}
      <div className="d-flex align-items-center justify-content-between mb-1">
        <span className="kanban-card-id">#{order.displayId || order.id.slice(-6).toUpperCase()}</span>
        <div className="d-flex gap-1">
          {order.paymentStatus === 'PAID'
            ? <span className="badge" style={{ background: 'rgba(62,207,142,0.15)', color: '#3ecf8e', fontSize: '0.6rem', padding: '2px 6px' }}>PAID</span>
            : <span className="badge" style={{ background: 'rgba(244,115,115,0.12)', color: '#f47373', fontSize: '0.6rem', padding: '2px 6px' }}>UNPAID</span>}
          <span className="badge" style={{ background: order.orderType === 'delivery' ? 'rgba(74,158,255,0.12)' : 'rgba(100,100,100,0.15)', color: order.orderType === 'delivery' ? '#74aaff' : '#9ca3af', fontSize: '0.6rem', padding: '2px 6px' }}>
            {order.orderType === 'delivery' ? '🚚' : '🛍'}
          </span>
        </div>
      </div>

      {/* Customer name */}
      <div className="kanban-card-name">{order.userName}</div>

      {/* Items */}
      <div className="kanban-card-items">{itemsSummary}</div>

      {/* Footer: price + time + live track */}
      <div className="kanban-card-footer">
        <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.85rem' }}>
          Rs.{order.total?.toFixed(2)}
        </span>
        <div className="d-flex align-items-center gap-2">
          {order.status === 'OUT_FOR_DELIVERY' && (
            <button
              className="btn btn-sm py-0 px-1"
              style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', fontSize: '0.65rem', borderRadius: 6 }}
              onClick={e => { e.stopPropagation(); onLiveTrack(order); }}
              title="Live track rider"
            >
              <i className="bi bi-broadcast me-1"></i>Track
            </button>
          )}
          <span style={{ color: 'rgba(200,196,188,0.4)', fontSize: '0.7rem' }}>
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Orders component ─── */
const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState(null);
  const [liveTrackOrder, setLiveTrackOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [dragOverCol, setDragOverCol] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragOrder = useRef(null);

  useEffect(() => {
    getAllOrders()
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => { toast.error('Failed to load orders.'); setLoading(false); });

    const iv = setInterval(() =>
      getAllOrders().then(setOrders).catch(() => {}),
      20_000
    );
    return () => clearInterval(iv);
  }, []);

  const handleStatusMove = async (orderId, status) => {
    try {
      const updated = await updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      toast.success(`Moved to ${COLUMNS.find(c => c.key === status)?.label || status}`);
    } catch {
      toast.error('Status update failed.');
    }
  };

  const handleDragStart = (order) => {
    dragOrder.current = order;
    setDraggingId(order.id);
  };

  const handleDragEnd = () => {
    dragOrder.current = null;
    setDraggingId(null);
    setDragOverCol(null);
  };

  const handleDrop = (colKey) => {
    const order = dragOrder.current;
    if (!order) return;
    // OUT_FOR_DELIVERY is exclusively the rider's action
    if (colKey === 'OUT_FOR_DELIVERY') {
      toast.warning('Only the delivery rider can move an order to Out for Delivery.');
      setDragOverCol(null);
      return;
    }
    // DELIVERED for delivery orders is also the rider's action
    if (colKey === 'DELIVERED' && order.orderType === 'delivery') {
      toast.warning('For delivery orders, only the rider can mark as Delivered.');
      setDragOverCol(null);
      return;
    }
    const currentCol = COLUMNS.find(c => c.displayKeys.includes(order.status));
    if (currentCol?.key !== colKey) {
      handleStatusMove(order.id, colKey);
    }
    setDragOverCol(null);
  };

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);

  const colOrders = (col) => orders.filter(o => {
    if (!col.displayKeys.includes(o.status)) return false;
    if (o.paymentStatus !== 'PAID') return false;
    // Delivered column: today only — compare by updatedAt (delivery time), not createdAt,
    // so an order placed yesterday but delivered today stays visible until midnight.
    if (col.key === 'DELIVERED' && new Date(o.updatedAt || o.createdAt) < todayStart) return false;
    if (search && !o.userName?.toLowerCase().includes(search.toLowerCase()) && !o.id.includes(search)) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="py-5 text-center">
        <div className="spinner-border" style={{ color: 'var(--gold)', width: 40, height: 40 }}></div>
        <div className="small text-muted mt-3">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="py-4 px-3">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h4 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-kanban" style={{ color: 'var(--gold)' }}></i>
            Orders
            <span className="badge rounded-pill" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', fontSize: '0.75rem' }}>
              {orders.filter(o => o.paymentStatus === 'PAID' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length}
            </span>
          </h4>
          <small className="text-muted">Drag cards between columns to update status</small>
        </div>
        <div className="position-relative">
          <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(201,168,76,0.5)', fontSize: '0.82rem', pointerEvents: 'none' }}></i>
          <input
            className="form-control form-control-sm"
            placeholder="Search by name or ID..."
            style={{ width: 220, paddingLeft: '2.1rem' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Kanban board */}
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const cards = colOrders(col);
          const isOver = dragOverCol === col.key;
          return (
            <div
              key={col.key}
              className={`kanban-column${isOver ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(col.key)}
            >
              {/* Column header */}
              <div className="kanban-col-header">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: col.color, flexShrink: 0 }}></span>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: col.color }}>{col.label}</span>
                  </div>
                  <span className="kanban-col-count" style={{ background: col.bg, color: col.color }}>{cards.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div className="kanban-col-body">
                {cards.length === 0
                  ? <div className="kanban-empty-drop"><span>Drop orders here</span></div>
                  : cards.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        isDragging={draggingId === order.id}
                        onDragStart={() => handleDragStart(order)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setDetailOrder(order)}
                        onLiveTrack={setLiveTrackOrder}
                      />
                    ))
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      <DetailModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onStatusMove={handleStatusMove}
      />

      {/* Live track modal */}
      {liveTrackOrder && (
        <LiveTrackModal order={liveTrackOrder} onClose={() => setLiveTrackOrder(null)} />
      )}
    </div>
  );
};

export default Orders;
