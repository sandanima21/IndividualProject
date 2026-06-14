/**
 * StoreContext — Global app state for the customer-facing app.
 *
 * Provides: food list, cart quantities, per-item customizations,
 * authenticated user + JWT token, and role-aware inactivity auto-logout.
 *
 * Persistence strategy:
 *  - cart quantities → localStorage, keyed per user so switching accounts
 *    doesn't mix carts (guest cart lives at 'kukihabun_cart_guest').
 *  - customizations → sessionStorage so they're cleared when the tab closes
 *    (avoids stale spice/avoid choices carrying over to a later visit).
 *  - user + token   → localStorage so the session survives a page refresh.
 */

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { fetchFoodList } from "../service/foodservice";

// Delivery riders stay logged in longer because they keep the app open for hours.
const INACTIVITY_BY_ROLE = {
  DELIVERY: 60 * 60 * 1000,  // 1 hour
  default:  20 * 60 * 1000,  // 20 minutes for regular customers
};

export const StoreContext = createContext(null);

// User-scoped cart key prevents cart bleed between accounts on shared devices.
const cartKey = (userId) => `kukihabun_cart_${userId || 'guest'}`;

export const StoreProvider = ({ children }) => {
  const [foodList, setFoodList] = useState([]);

  // Rehydrate user and token from localStorage on first render.
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("kukihabun_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("kukihabun_token") || null);

  const inactivityTimer = useRef(null);

  // Rehydrate the correct user's cart from localStorage on first render.
  const [quantities, setQuantities] = useState(() => {
    const saved = localStorage.getItem("kukihabun_user");
    const u = saved ? JSON.parse(saved) : null;
    const cart = localStorage.getItem(cartKey(u?.id));
    return cart ? JSON.parse(cart) : {};
  });

  // Keep the cart in localStorage in sync whenever quantities or the logged-in user changes.
  useEffect(() => {
    localStorage.setItem(cartKey(user?.id), JSON.stringify(quantities));
  }, [quantities, user]);

  // ── Auth ─────────────────────────────────────────────────────────────────

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem("kukihabun_user", JSON.stringify(userData));
    localStorage.setItem("kukihabun_token", jwtToken);
    // Swap in this user's saved cart; fall back to empty if they've never ordered.
    const saved = localStorage.getItem(cartKey(userData?.id));
    setQuantities(saved ? JSON.parse(saved) : {});
  };

  const logout = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    // Flush the current cart before clearing auth so the next login can reload it.
    localStorage.setItem(cartKey(user?.id), JSON.stringify(quantities));
    localStorage.removeItem("kukihabun_user");
    localStorage.removeItem("kukihabun_token");
    // Hard redirect instead of navigate() so stale React state (e.g. role-based
    // redirects for DELIVERY users) can't fire after the user object is gone.
    window.location.replace('/');
  }, [user, quantities]);

  // ── Inactivity auto-logout ────────────────────────────────────────────────

  // Listens for any user interaction and resets the timer. The timeout duration
  // depends on role: delivery riders need longer sessions than customers.
  useEffect(() => {
    if (!user) return;
    const timeoutMs = INACTIVITY_BY_ROLE[user.role] ?? INACTIVITY_BY_ROLE.default;

    const resetTimer = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => logout(), timeoutMs);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start the clock immediately on login

    return () => {
      clearTimeout(inactivityTimer.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, logout]);

  // ── Cart operations ───────────────────────────────────────────────────────

  const increaseQty = (foodId) =>
    setQuantities(prev => ({ ...prev, [foodId]: (prev[foodId] || 0) + 1 }));

  const decreaseQty = (foodId) =>
    setQuantities(prev => ({ ...prev, [foodId]: prev[foodId] > 1 ? prev[foodId] - 1 : 0 }));

  const removeItem = (foodId) =>
    setQuantities(prev => ({ ...prev, [foodId]: 0 }));

  const removeFromCart = (foodId) =>
    setQuantities(prev => { const u = { ...prev }; delete u[foodId]; return u; });

  const clearCart = () => setQuantities({});

  // Merge an order's items back into the cart without touching other quantities.
  const reorderItems = (items) =>
    setQuantities(prev => {
      const next = { ...prev };
      items.forEach(item => { next[item.foodId] = (next[item.foodId] || 0) + item.quantity; });
      return next;
    });

  // ── User profile helpers ──────────────────────────────────────────────────

  const updateUserPhone = (phone) => {
    const updated = { ...user, phone, phoneVerified: true };
    setUser(updated);
    localStorage.setItem('kukihabun_user', JSON.stringify(updated));
  };

  const updateUser = (fields) => {
    const updated = { ...user, ...fields };
    setUser(updated);
    localStorage.setItem('kukihabun_user', JSON.stringify(updated));
  };

  // ── Customizations ────────────────────────────────────────────────────────
  // Stored in sessionStorage (not localStorage) so choices don't carry over
  // to a future visit — a user placing a new order should start fresh.

  const [customizations, setCustomizations] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('kukihabun_custom') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    sessionStorage.setItem('kukihabun_custom', JSON.stringify(customizations));
  }, [customizations]);

  const setCustomization = (foodId, key, value) =>
    setCustomizations(prev => ({ ...prev, [foodId]: { ...prev[foodId], [key]: value } }));

  const setSpice = (foodId, level) => setCustomization(foodId, 'spiceLevel', level);

  const toggleAvoid = (foodId, ingredient) =>
    setCustomizations(prev => {
      const current = prev[foodId]?.ingredientsToAvoid || [];
      const updated = current.includes(ingredient)
        ? current.filter(i => i !== ingredient)
        : [...current, ingredient];
      return { ...prev, [foodId]: { ...prev[foodId], ingredientsToAvoid: updated } };
    });

  const clearCustomizations = () => {
    setCustomizations({});
    sessionStorage.removeItem('kukihabun_custom');
  };

  // ── Food list ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchFoodList().then(setFoodList).catch(() => {});
  }, []);

  return (
    <StoreContext.Provider value={{
      foodList, increaseQty, decreaseQty, removeItem,
      quantities, removeFromCart, clearCart, reorderItems, user, token, login, logout, updateUserPhone, updateUser,
      customizations, setSpice, toggleAvoid, clearCustomizations, setCustomization,
    }}>
      {children}
    </StoreContext.Provider>
  );
};
