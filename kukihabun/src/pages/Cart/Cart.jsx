/**
 * Cart — checkout page.
 *
 * Key flows:
 *  1. Address → geocode (via Nominatim) → road distance (via OSRM, Haversine fallback)
 *     → delivery fee shown in real time.
 *  2. Map pin → reverse geocode → address field auto-filled.
 *  3. "Place Order" → backend order created → PayHere popup launched.
 *  4. On PayHere success, order is marked PAID and the user is sent to /orders.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import './Cart.css';
import { StoreContext } from '../../context/StoreContext';

const OFFER_KEY = 'kukihabun_pending_offer';
import { Link, useNavigate } from 'react-router-dom';
import { placeOrder, initiatePayment, markOrderPaid } from '../../service/orderservice';
import PhoneVerificationModal from '../../components/PhoneVerification/PhoneVerificationModal';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import PayHereCheckout, { PENDING_PAYMENT_KEY, CONFIRMED_PAYMENT_KEY } from '../../components/PayHereCheckout/PayHereCheckout';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const NOMINATIM = 'https://nominatim.openstreetmap.org';

/**
 * City-first geocoding, restricted to Sri Lanka (countrycodes=lk).
 *
 * Why city-first? Sending a full Sri Lankan address ("213/6, Puwakwatta Road, Meegoda")
 * to Nominatim often returns no results because local road names aren't mapped.
 * Splitting by comma and trying from the rightmost token (city/town) leftward
 * gives Nominatim the best chance of finding a recognisable place name first.
 */
const geocodeAddressSL = async (address) => {
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const query = parts.slice(i).join(', ');
    try {
      const res = await fetch(
        `${NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&countrycodes=lk&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { /* try next suffix */ }
  }
  return null;
};

// Autocomplete suggestions — Sri Lanka only
const fetchSuggestions = async (query, signal) => {
  try {
    const res = await fetch(
      `${NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&countrycodes=lk&limit=5`,
      { headers: { 'Accept-Language': 'en' }, signal }
    );
    const data = await res.json();
    return data.map(d => ({ label: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) }));
  } catch { return []; }
};

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: { 'Accept-Language': 'en' },
    });
    const data = await res.json();
    return data.display_name || null;
  } catch { return null; }
};

// Straight-line (as-the-crow-flies) distance — shown immediately while OSRM loads.
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Road distance via the public OSRM routing server.
 * Falls back to Haversine if OSRM is unavailable or returns an error.
 * The caller shows Haversine immediately (fast) then replaces it with OSRM
 * (accurate) once the request completes — giving the user instant feedback.
 */
const getRoadDistanceKm = async (lat1, lng1, lat2, lng2, signal) => {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`,
      { signal }
    );
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      return { km: data.routes[0].distance / 1000, durationSec: data.routes[0].duration, isRoad: true };
    }
  } catch { /* fallback */ }
  return { km: haversineKm(lat1, lng1, lat2, lng2), durationSec: null, isRoad: false };
};

const MapViewUpdater = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 15, { duration: 1 });
  }, [lat, lng]);
  return null;
};

const LocationPicker = ({ onPick, disabled }) => {
  useMapEvents({
    async click(e) {
      if (disabled) return;
      const { lat, lng } = e.latlng;
      onPick(lat, lng, null);
      const address = await reverseGeocode(lat, lng);
      onPick(lat, lng, address);
    }
  });
  return null;
};

// Restaurant coordinates (Meegoda) — must match the Contact page map pin.
const RESTAURANT_LAT = 6.8442;
const RESTAURANT_LNG = 80.0391;

// Pricing: flat Rs.100 covers the first kilometre; every km after that adds Rs.50.
const calcDeliveryFee = (km) => {
  if (!km || km <= 1) return 100;
  return 100 + Math.ceil(km - 1) * 50;
};

const Cart = () => {
  const { foodList, increaseQty, decreaseQty, removeFromCart, clearCart, quantities, user, token, logout, updateUserPhone,
          customizations, setSpice, toggleAvoid, clearCustomizations } = useContext(StoreContext);
  const navigate = useNavigate();

  const [pendingOffer] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(OFFER_KEY)) || null; } catch { return null; }
  });
  const [orderType, setOrderType] = useState('delivery');
  const [mobileNumber, setMobileNumber] = useState(() => user?.phone || '');
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState(null);
  const [deliveryLng, setDeliveryLng] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState(null); // { km, durationSec, isRoad }
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [pendingAddress, setPendingAddress] = useState(null);
  // customizations from StoreContext (shared with FoodDetails)
  const [placing, setPlacing] = useState(false);
  const [payhereData, setPayhereData] = useState(null);
  const pendingCartItems = useRef([]);
  const pendingOrderId = useRef(null);
  // A ref (not state) guards against double-click submissions because React state
  // updates are async — a second click can read stale `placing = false` before the
  // first async call has set it to true.
  const placingRef = useRef(false);
  const geocodeTimer = useRef(null);
  const suggestTimer = useRef(null);
  const suggestAbort = useRef(null);
  const roadAbort = useRef(null);

  const cartItems = foodList.filter(food => quantities[food.id] > 0);
  const foodSubtotal = cartItems.reduce((acc, food) => acc + food.price * quantities[food.id], 0);
  const offerSubtotal = pendingOffer?.price ?? 0;
  const subtotal = foodSubtotal + offerSubtotal;
  const distKm = distanceInfo?.km ?? null;
  const deliveryFee = orderType === 'delivery' && subtotal > 0 ? calcDeliveryFee(distKm) : 0;
  const total = subtotal + deliveryFee;

  // ── Address autocomplete ──────────────────────────────────────────────────
  // Debounced 500ms; aborted if the user types again before the request resolves.
  // Suppressed when `locationConfirmed` is true (user already accepted a map pin).
  useEffect(() => {
    if (!deliveryAddress || deliveryAddress.length < 3 || locationConfirmed) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    clearTimeout(suggestTimer.current);
    if (suggestAbort.current) suggestAbort.current.abort();
    suggestTimer.current = setTimeout(async () => {
      const ac = new AbortController();
      suggestAbort.current = ac;
      const results = await fetchSuggestions(deliveryAddress, ac.signal);
      if (!ac.signal.aborted) {
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }
    }, 500);
    return () => clearTimeout(suggestTimer.current);
  }, [deliveryAddress, locationConfirmed]);

  // ── Fallback geocode ──────────────────────────────────────────────────────
  // Runs city-first geocoding when the user types a free-form address without
  // selecting an autocomplete suggestion. Skipped if a map pin is already confirmed.
  useEffect(() => {
    if (!deliveryAddress || deliveryAddress.length < 5 || locationConfirmed) return;
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true);
      const result = await geocodeAddressSL(deliveryAddress);
      if (result && !locationConfirmed) { setDeliveryLat(result.lat); setDeliveryLng(result.lng); }
      setGeocoding(false);
    }, 1200);
    return () => clearTimeout(geocodeTimer.current);
  }, [deliveryAddress, locationConfirmed]);

  // ── Distance calculation ──────────────────────────────────────────────────
  // Shows Haversine immediately (instant) then upgrades to OSRM road distance
  // when the async call resolves. Previous OSRM requests are aborted on each
  // coordinate change so only the latest result is used.
  useEffect(() => {
    if (!deliveryLat || !deliveryLng) { setDistanceInfo(null); return; }
    if (roadAbort.current) roadAbort.current.abort();
    const ac = new AbortController();
    roadAbort.current = ac;
    setDistanceInfo({ km: haversineKm(RESTAURANT_LAT, RESTAURANT_LNG, deliveryLat, deliveryLng), durationSec: null, isRoad: false });
    getRoadDistanceKm(RESTAURANT_LAT, RESTAURANT_LNG, deliveryLat, deliveryLng, ac.signal)
      .then(info => { if (!ac.signal.aborted) setDistanceInfo(info); });
    return () => ac.abort();
  }, [deliveryLat, deliveryLng]);

  const handleSuggestionSelect = (s) => {
    setDeliveryAddress(s.label);
    setDeliveryLat(s.lat);
    setDeliveryLng(s.lng);
    setSuggestions([]);
    setShowSuggestions(false);
    setLocationConfirmed(false);
    setPendingAddress(null);
  };

  const handleMapPick = (lat, lng, address) => {
    setDeliveryLat(lat);
    setDeliveryLng(lng);
    setLocationConfirmed(false);
    if (address) setPendingAddress(address);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleConfirmLocation = () => {
    if (pendingAddress) setDeliveryAddress(pendingAddress);
    setLocationConfirmed(true);
    setPendingAddress(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };


  const now = new Date();
  const timeInMinutes = now.getHours() * 60 + now.getMinutes();
  const OPEN_TIME  = 10 * 60;  // 10:00 AM
  const CLOSE_TIME = 22 * 60 + 30;  // 10:30 PM
  const isOpen = timeInMinutes >= OPEN_TIME && timeInMinutes < CLOSE_TIME;

  const handleCheckout = async () => {
    if (!isOpen) {
      toast.error("We're closed right now. Orders are accepted from 10:00 AM to 10:30 PM.", { autoClose: 6000 });
      return;
    }

    // Ref-based guard prevents duplicate orders from rapid clicks (state updates are async)
    if (placingRef.current || !user) {
      if (!user) toast.warning('Please sign in to place an order.');
      return;
    }
    placingRef.current = true;
    setPlacing(true);
    try {
      const items = cartItems.map(food => {
        const { spiceLevel = null, ingredientsToAvoid = [], ...customOptions } = customizations[food.id] || {};
        return {
          foodId: food.id,
          quantity: quantities[food.id],
          spiceLevel,
          ingredientsToAvoid,
          customOptions: Object.keys(customOptions).length > 0 ? customOptions : null,
        };
      });
      const order = await placeOrder({
        items, orderType, deliveryAddress, deliveryLat, deliveryLng, deliveryFee,
        mobileNumber: user?.phone || mobileNumber,
        offerId:       pendingOffer?.id       ?? null,
        offerTitle:    pendingOffer?.title    ?? null,
        offerPrice:    pendingOffer?.price    ?? null,
        offerImageUrl: pendingOffer?.imageUrl ?? null,
      }, token);
      const payData = await initiatePayment(order.id, token);
      pendingCartItems.current = [...cartItems];
      pendingOrderId.current = order.id;
      setPayhereData(payData);
    } catch (err) {
      if (err?.response?.status === 401) {
        toast.error('Your session has expired. Please sign in again.');
        logout();
      } else {
        toast.error('Failed to place order. Please try again.');
      }
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  };

  // ── PayHere payment result handlers ──────────────────────────────────────

  const handlePaymentSuccess = async () => {
    // PayHere onCompleted fired — set CONFIRMED_PAYMENT_KEY so that if markOrderPaid
    // fails here, Orders.jsx will retry it on next load (recovery step 1).
    if (pendingOrderId.current) {
      sessionStorage.setItem(CONFIRMED_PAYMENT_KEY, pendingOrderId.current);
      try {
        await markOrderPaid(pendingOrderId.current, token);
        sessionStorage.removeItem(CONFIRMED_PAYMENT_KEY);
        clearCart();
      } catch { /* keep CONFIRMED_PAYMENT_KEY so Orders.jsx load() can retry */ }
    }
    sessionStorage.removeItem(PENDING_PAYMENT_KEY);
    clearCustomizations();
    sessionStorage.removeItem(OFFER_KEY);
    pendingOrderId.current = null;
    setPayhereData(null);
    navigate('/orders');
  };

  const handlePaymentClose = () => {
    // Popup closed without a confirmed callback.
    // We intentionally do NOT clear PENDING_PAYMENT_KEY here.
    // If payment actually succeeded (common in PayHere sandbox where onCompleted
    // doesn't always fire), Orders.jsx will find the key on next load and call
    // markOrderPaid as a recovery step. If the user genuinely cancelled, the order
    // stays UNPAID and won't show in active orders — no harm done.
    pendingOrderId.current = null;
    setPayhereData(null);
  };

  const distanceLabel = (() => {
    if (!distanceInfo) return 'Click map to pin location — or pick a suggestion';
    const km = distanceInfo.km.toFixed(1);
    const fee = calcDeliveryFee(distanceInfo.km);
    if (distanceInfo.isRoad) {
      const minutes = Math.ceil(distanceInfo.durationSec / 60) + 10;
      return `${km} km by road · Est. ${minutes} min · Fee: Rs.${fee}`;
    }
    const minutes = Math.ceil((distanceInfo.km / 25) * 60) + 10;
    return `~${km} km · Est. ${minutes} min · Fee: Rs.${fee}`;
  })();

  return (
    <div className="container py-5">
      {payhereData && (
        <PayHereCheckout
          paymentData={payhereData}
          onSuccess={handlePaymentSuccess}
          onDismissed={handlePaymentClose}
        />
      )}
      <h1 className="mb-5">Your Shopping Cart</h1>
      <div className="row">
        <div className="col-lg-8">
          {/* Pending offer card */}
          {pendingOffer && (
            <div className="card mb-3" style={{ border: '1px solid rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.04)' }}>
              <div className="card-body d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                    🏷️
                  </div>
                  <div>
                    <div className="fw-semibold">{pendingOffer.title}</div>
                    <small className="text-muted">Special Offer</small>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <strong style={{ color: 'var(--gold)' }}>Rs.{Number(pendingOffer.price).toFixed(2)}</strong>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => { sessionStorage.removeItem(OFFER_KEY); window.location.reload(); }}>
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {cartItems.length === 0 && !pendingOffer ? (
            <div className="text-center py-5">
              <i className="bi bi-cart-x fs-1 text-muted"></i>
              <p className="mt-3 text-muted">Your cart is empty. Start adding some delicious food!</p>
              <Link to="/explore" className="btn btn-primary mt-2">Explore Menu</Link>
            </div>
          ) : cartItems.length > 0 ? (
            cartItems.map(food => (
              <div key={food.id} className="card mb-3">
                <div className="card-body">
                  {/* Mobile-first flex row: image | name | controls */}
                  <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
                    <img src={food.imageUrl} alt={food.name} className="rounded flex-shrink-0"
                      style={{ width: 64, height: 56, objectFit: 'cover' }} />
                    <div className="flex-fill" style={{ minWidth: 0 }}>
                      <h6 className="mb-0 text-truncate">{food.name}</h6>
                      <small className="text-muted">{food.category}</small>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
                      <div className="input-group input-group-sm" style={{ width: 'auto' }}>
                        <button className="btn btn-outline-secondary" onClick={() => decreaseQty(food.id)}>-</button>
                        <input type="text" className="form-control text-center" value={quantities[food.id]} readOnly style={{ width: 42 }} />
                        <button className="btn btn-outline-secondary" onClick={() => increaseQty(food.id)}>+</button>
                      </div>
                      <strong style={{ minWidth: 72, textAlign: 'right', whiteSpace: 'nowrap' }}>Rs.{(food.price * quantities[food.id]).toFixed(2)}</strong>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => removeFromCart(food.id)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>

                  {(food.customizationOptions?.customizables?.length > 0 ||
                    food.customizationOptions?.spiceLevels?.length > 0 ||
                    food.customizationOptions?.ingredientsToAvoid?.length > 0) && (
                    <div className="border-top pt-3">
                      <small className="fw-semibold text-muted d-block mb-2"><i className="bi bi-sliders me-1"></i>Customize (optional)</small>
                      <div className="row g-2">
                        {food.customizationOptions?.customizables?.map(c => (
                          <div key={c.thing} className="col-md-6">
                            <label className="form-label small mb-1">{c.thing}</label>
                            <div className="d-flex flex-wrap gap-1">
                              {c.options.map(opt => (
                                <button key={opt} type="button"
                                  className={`btn btn-sm ${customizations[food.id]?.[c.thing] === opt ? 'btn-primary' : 'btn-outline-secondary'}`}
                                  onClick={() => setCustomization(food.id, c.thing, opt)}>
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        {food.customizationOptions?.spiceLevels?.length > 0 && (
                          <div className="col-md-6">
                            <label className="form-label small mb-1">Spice Level</label>
                            <div className="d-flex flex-wrap gap-1">
                              {food.customizationOptions.spiceLevels.map(level => (
                                <button key={level} type="button"
                                  className={`btn btn-sm ${customizations[food.id]?.spiceLevel === level ? 'btn-warning' : 'btn-outline-secondary'}`}
                                  onClick={() => setSpice(food.id, level)}>
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {food.customizationOptions?.ingredientsToAvoid?.length > 0 && (
                          <div className="col-md-6">
                            <label className="form-label small mb-1">Avoid Ingredients</label>
                            <div className="d-flex flex-wrap gap-1">
                              {food.customizationOptions.ingredientsToAvoid.map(ing => (
                                <button key={ing} type="button"
                                  className={`btn btn-sm ${(customizations[food.id]?.ingredientsToAvoid || []).includes(ing) ? 'btn-danger' : 'btn-outline-secondary'}`}
                                  onClick={() => toggleAvoid(food.id, ing)}>
                                  {ing}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : null}
          {cartItems.length > 0 && (
            <Link to="/" className="btn btn-outline-primary mt-2">
              <i className="bi bi-arrow-left me-2"></i>Continue Shopping
            </Link>
          )}
        </div>

        <div className="col-lg-4" style={{ alignSelf: 'flex-start', position: 'sticky', top: '1.5rem' }}>
          <div className="card cart-summary">
            <div className="card-body">
              <h5 className="card-title mb-4">Order Summary</h5>

              <div className="btn-group w-100 mb-4" role="group">
                <button type="button" className={`btn ${orderType === 'takeaway' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setOrderType('takeaway')}>
                  Take-away
                </button>
                <button type="button" className={`btn ${orderType === 'delivery' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setOrderType('delivery')}>
                  Delivery
                </button>
              </div>

              {(orderType === 'takeaway' || orderType === 'delivery') && (
                <div className="mb-3">
                  <label className="form-label">Mobile Number</label>
                  {user?.phone ? (
                    <div className="d-flex align-items-center justify-content-between p-2 rounded" style={{ background: 'rgba(62,207,142,0.07)', border: '1px solid rgba(62,207,142,0.25)' }}>
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-check-circle-fill" style={{ color: '#3ecf8e', fontSize: '0.85rem' }}></i>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.phone}</span>
                        <span style={{ color: '#3ecf8e', fontSize: '0.7rem', fontWeight: 600 }}>Verified</span>
                      </div>
                      <button type="button" className="btn btn-link btn-sm p-0" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} onClick={() => setShowChangePhone(true)}>
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 rounded text-center" style={{ background: 'rgba(244,115,115,0.07)', border: '1px solid rgba(244,115,115,0.25)' }}>
                      <p className="mb-2 small" style={{ color: '#f47373' }}>
                        <i className="bi bi-exclamation-triangle me-1"></i>Phone number not verified
                      </p>
                      <button type="button" className="btn btn-sm btn-primary" style={{ borderRadius: 50 }} onClick={() => setShowChangePhone(true)}>
                        <i className="bi bi-phone me-1"></i>Verify Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {showChangePhone && (
                <PhoneVerificationModal
                  token={token}
                  onVerified={(phone) => { updateUserPhone(phone); setMobileNumber(phone); setShowChangePhone(false); }}
                  onSkip={() => setShowChangePhone(false)}
                />
              )}

              {orderType === 'delivery' && (
                <div className="mb-3">
                  <label className="form-label">
                    Delivery Address <span className="text-danger">*</span>
                    {geocoding && <span className="spinner-border spinner-border-sm ms-2" style={{ width: 12, height: 12, borderWidth: 2 }} />}
                  </label>
                  <div className="position-relative">
                    <textarea
                      className="form-control mb-1"
                      rows="2"
                      placeholder="e.g. 213/6, Puwakwatta Road, Meegoda"
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    />
                    {showSuggestions && (
                      <ul className="list-group position-absolute w-100" style={{ zIndex: 9999, top: '100%', maxHeight: 200, overflowY: 'auto', borderRadius: 6 }}>
                        {suggestions.map((s, i) => (
                          <li
                            key={i}
                            className="list-group-item list-group-item-action py-2 px-3"
                            style={{ fontSize: '0.8rem', cursor: 'pointer', background: '#1e1e1e', color: '#f0ece0', border: '1px solid rgba(201,168,76,0.2)' }}
                            onMouseDown={() => handleSuggestionSelect(s)}
                          >
                            <i className="bi bi-geo-alt me-2" style={{ color: 'var(--gold)' }}></i>
                            {s.label.length > 75 ? s.label.slice(0, 75) + '…' : s.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <small style={{ color: 'var(--gold)' }}>
                    <i className="bi bi-pin-map me-1"></i>
                    {distanceLabel}
                  </small>
                  <div style={{ position: 'relative', height: 220, borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
                    <MapContainer
                      center={[RESTAURANT_LAT, RESTAURANT_LNG]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapViewUpdater lat={deliveryLat} lng={deliveryLng} />
                      <LocationPicker onPick={handleMapPick} disabled={locationConfirmed} />
                      {deliveryLat && <Marker position={[deliveryLat, deliveryLng]} />}
                    </MapContainer>
                    {locationConfirmed && (
                      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1000, background: 'rgba(62,207,142,0.9)', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, pointerEvents: 'none' }}>
                        <i className="bi bi-check-circle-fill me-1"></i>Location Confirmed
                      </div>
                    )}
                  </div>
                  {/* Confirm / Change Location buttons */}
                  {deliveryLat && !locationConfirmed && (
                    <button
                      type="button"
                      className="btn btn-sm w-100 mt-2 fw-semibold"
                      style={{ background: 'var(--gold)', color: '#000', border: 'none' }}
                      onClick={handleConfirmLocation}
                    >
                      <i className="bi bi-pin-map-fill me-2"></i>Confirm This Location
                    </button>
                  )}
                  {locationConfirmed && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary w-100 mt-2"
                      onClick={() => { setLocationConfirmed(false); setDeliveryLat(null); setDeliveryLng(null); setPendingAddress(null); }}
                    >
                      <i className="bi bi-pencil me-1"></i>Change Location
                    </button>
                  )}
                </div>
              )}

              {/* Offer line item in summary */}
              {pendingOffer?.price != null && (
                <div className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3"
                  style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-tag-fill" style={{ color: 'var(--gold)', fontSize: '0.8rem' }}></i>
                    <span className="small fw-semibold" style={{ color: 'var(--gold)' }}>{pendingOffer.title}</span>
                  </div>
                  <span className="fw-semibold" style={{ color: 'var(--gold)' }}>Rs.{Number(pendingOffer.price).toFixed(2)}</span>
                </div>
              )}
              {foodSubtotal > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <span>Items</span><span>Rs.{foodSubtotal.toFixed(2)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span><span>Rs.{subtotal.toFixed(2)}</span>
              </div>
              {orderType === 'delivery' && (
                <div className="d-flex justify-content-between mb-2">
                  <span>Delivery Fee</span><span>Rs.{deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <hr />
              <div className="d-flex justify-content-between mb-4">
                <strong>Total</strong><strong>Rs.{total.toFixed(2)}</strong>
              </div>

              <button
                className="btn btn-primary w-100"
                disabled={
                  !isOpen ||
                  (cartItems.length === 0 && !pendingOffer) || placing || !user?.phone ||
                  (orderType === 'delivery' && !deliveryAddress && !deliveryLat)
                }
                onClick={handleCheckout}
              >
                {placing && <span className="spinner-border spinner-border-sm me-2"></span>}
                Place Order
              </button>

              {!isOpen && (
                <p className="text-center mt-2 small" style={{ color: '#f47373' }}>
                  <i className="bi bi-clock me-1"></i>Orders accepted 10:00 AM – 10:30 PM only.
                </p>
              )}
              {!user && (
                <p className="text-muted text-center mt-2 small">
                  <i className="bi bi-info-circle me-1"></i>Sign in required to place an order.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
