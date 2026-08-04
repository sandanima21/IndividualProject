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
import { fetchCategoryList } from "../service/categoryservice";

// Delivery riders stay logged in longer because they keep the app open for hours.
const INACTIVITY_BY_ROLE = {
  DELIVERY: 60 * 60 * 1000,  // 1 hour
  default:  20 * 60 * 1000,  // 20 minutes for regular customers
};

export const StoreContext = createContext(null);

// User-scoped cart key prevents cart bleed between accounts on shared devices.
const cartKey = (userId) => `kukihabun_cart_${userId || 'guest'}`;
const portionsKey = (userId) => `kukihabun_cart_portions_${userId || 'guest'}`;

// Composite cart line key. Foods without a portion keep the plain food id as their
// key (identical to before portions existed — zero behaviour change for them). A
// portion selection gets its own key so the same food can have multiple simultaneous
// cart lines (e.g. one Small + one Large of the same dish).
export const lineKey = (foodId, portionName) => portionName ? `${foodId}::${portionName}` : foodId;
const baseFoodId = (key) => key.split('::')[0];

export const StoreProvider = ({ children }) => {
  const [foodList, setFoodList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);

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

  // Selected portion (name + price) per cart line key — only present for lines that
  // came from a food with portions. Persisted the same way as quantities since it's
  // needed to price the cart correctly across a page refresh.
  const [selectedPortions, setSelectedPortions] = useState(() => {
    const saved = localStorage.getItem("kukihabun_user");
    const u = saved ? JSON.parse(saved) : null;
    const stored = localStorage.getItem(portionsKey(u?.id));
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    localStorage.setItem(portionsKey(user?.id), JSON.stringify(selectedPortions));
  }, [selectedPortions, user]);

  // ── Auth ─────────────────────────────────────────────────────────────────

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem("kukihabun_user", JSON.stringify(userData));
    localStorage.setItem("kukihabun_token", jwtToken);
    // Swap in this user's saved cart; fall back to empty if they've never ordered.
    const saved = localStorage.getItem(cartKey(userData?.id));
    setQuantities(saved ? JSON.parse(saved) : {});
    const savedPortions = localStorage.getItem(portionsKey(userData?.id));
    setSelectedPortions(savedPortions ? JSON.parse(savedPortions) : {});
  };

  const logout = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    // Flush the current cart before clearing auth so the next login can reload it.
    localStorage.setItem(cartKey(user?.id), JSON.stringify(quantities));
    localStorage.setItem(portionsKey(user?.id), JSON.stringify(selectedPortions));
    localStorage.removeItem("kukihabun_user");
    localStorage.removeItem("kukihabun_token");
    // Hard redirect instead of navigate() so stale React state (e.g. role-based
    // redirects for DELIVERY users) can't fire after the user object is gone.
    window.location.replace('/');
  }, [user, quantities, selectedPortions]);

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
  // `key` below is a cart line key from lineKey() — a plain food id for foods without
  // a portion (unchanged from before portions existed), or `${foodId}::${portionName}`
  // for a specific portion line. `customizations` stays keyed by the plain food id
  // (spice/avoid choices apply to the dish regardless of which portion), so it's only
  // cleared once *no* line — of any portion — for that food remains in the cart.

  const clearFoodCustomizationIfOrphaned = (nextQuantities, key) => {
    const foodId = baseFoodId(key);
    const stillHasLine = Object.entries(nextQuantities).some(([k, q]) => q > 0 && baseFoodId(k) === foodId);
    if (!stillHasLine) {
      setCustomizations(prev => { const u = { ...prev }; delete u[foodId]; return u; });
    }
  };

  // Adds one unit of a specific portion of a food as its own cart line — the same
  // food can have multiple simultaneous lines this way (e.g. 1x Small + 1x Large).
  const addPortionToCart = (foodId, portion) => {
    const key = lineKey(foodId, portion.name);
    setQuantities(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    setSelectedPortions(prev => ({ ...prev, [key]: { name: portion.name, price: portion.price } }));
  };

  const increaseQty = (key) =>
    setQuantities(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));

  // Dropping to zero via "-" is how most of the UI removes an item (FoodItem card,
  // FoodDetails, the Cart quantity stepper). It must clear the saved customization
  // too, same as removeFromCart below — otherwise a later "add without customizing"
  // silently inherits the old selection, since customizations outlive a single cart
  // membership.
  const decreaseQty = (key) => {
    const nextQty = quantities[key] > 1 ? quantities[key] - 1 : 0;
    const nextQuantities = { ...quantities, [key]: nextQty };
    setQuantities(nextQuantities);
    if (nextQty === 0) {
      setSelectedPortions(prev => { const u = { ...prev }; delete u[key]; return u; });
      clearFoodCustomizationIfOrphaned(nextQuantities, key);
    }
  };

  const removeItem = (key) => {
    const nextQuantities = { ...quantities, [key]: 0 };
    setQuantities(nextQuantities);
    setSelectedPortions(prev => { const u = { ...prev }; delete u[key]; return u; });
    clearFoodCustomizationIfOrphaned(nextQuantities, key);
  };

  // Also drops any saved customization for this food — otherwise a later, unrelated
  // "add without customizing" re-add would silently inherit the old selection, since
  // customizations outlive a single cart membership.
  const removeFromCart = (key) => {
    const nextQuantities = { ...quantities }; delete nextQuantities[key];
    setQuantities(nextQuantities);
    setSelectedPortions(prev => { const u = { ...prev }; delete u[key]; return u; });
    clearFoodCustomizationIfOrphaned(nextQuantities, key);
  };

  const clearCart = () => { setQuantities({}); setSelectedPortions({}); };

  // Merge an order's items back into the cart without touching other quantities.
  // item.portionName/price come from the order response (backend already resolved
  // the real price at order time), so a reordered portion line prices correctly
  // even if that portion's price has since changed on the food itself.
  const reorderItems = (items) => {
    setQuantities(prev => {
      const next = { ...prev };
      items.forEach(item => {
        const key = lineKey(item.foodId, item.portionName);
        next[key] = (next[key] || 0) + item.quantity;
      });
      return next;
    });
    const portioned = items.filter(i => i.portionName);
    if (portioned.length > 0) {
      setSelectedPortions(prev => {
        const next = { ...prev };
        portioned.forEach(item => {
          next[lineKey(item.foodId, item.portionName)] = { name: item.portionName, price: item.price };
        });
        return next;
      });
    }
  };

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

  useEffect(() => {
    fetchCategoryList().then(setCategoryList).catch(() => {});
  }, []);

  return (
    <StoreContext.Provider value={{
      foodList, categoryList, increaseQty, decreaseQty, removeItem,
      quantities, removeFromCart, clearCart, reorderItems, user, token, login, logout, updateUserPhone, updateUser,
      customizations, setSpice, toggleAvoid, clearCustomizations, setCustomization,
      selectedPortions, addPortionToCart,
    }}>
      {children}
    </StoreContext.Provider>
  );
};
