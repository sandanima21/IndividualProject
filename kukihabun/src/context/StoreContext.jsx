import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { fetchFoodList } from "../service/foodservice";

const INACTIVITY_BY_ROLE = {
  DELIVERY: 60 * 60 * 1000,  // 1 hour
  default:  20 * 60 * 1000,  // 20 minutes (customers)
};

export const StoreContext = createContext(null);

const cartKey = (userId) => `kukihabun_cart_${userId || 'guest'}`;

export const StoreProvider = ({ children }) => {
  const [foodList, setFoodList] = useState([]);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("kukihabun_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("kukihabun_token") || null);

  // Load quantities from the user-specific cart key
  const inactivityTimer = useRef(null);

  const [quantities, setQuantities] = useState(() => {
    const saved = localStorage.getItem("kukihabun_user");
    const u = saved ? JSON.parse(saved) : null;
    const cart = localStorage.getItem(cartKey(u?.id));
    return cart ? JSON.parse(cart) : {};
  });

  // Persist cart whenever quantities or user changes
  useEffect(() => {
    localStorage.setItem(cartKey(user?.id), JSON.stringify(quantities));
  }, [quantities, user]);

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem("kukihabun_user", JSON.stringify(userData));
    localStorage.setItem("kukihabun_token", jwtToken);
    // Load this user's saved cart
    const saved = localStorage.getItem(cartKey(userData?.id));
    setQuantities(saved ? JSON.parse(saved) : {});
  };

  const logout = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    localStorage.setItem(cartKey(user?.id), JSON.stringify(quantities));
    localStorage.removeItem("kukihabun_user");
    localStorage.removeItem("kukihabun_token");
    // Hard redirect ensures no stale React state causes an unwanted bounce (e.g. DELIVERY role)
    window.location.replace('/');
  }, [user, quantities]);

  // Role-aware inactivity auto-logout
  useEffect(() => {
    if (!user) return;
    const timeoutMs = INACTIVITY_BY_ROLE[user.role] ?? INACTIVITY_BY_ROLE.default;

    const resetTimer = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => logout(), timeoutMs);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, logout]);

  const increaseQty = (foodId) =>
    setQuantities(prev => ({ ...prev, [foodId]: (prev[foodId] || 0) + 1 }));

  const decreaseQty = (foodId) =>
    setQuantities(prev => ({ ...prev, [foodId]: prev[foodId] > 1 ? prev[foodId] - 1 : 0 }));

  const removeItem = (foodId) =>
    setQuantities(prev => ({ ...prev, [foodId]: 0 }));

  const removeFromCart = (foodId) =>
    setQuantities(prev => { const u = { ...prev }; delete u[foodId]; return u; });

  const clearCart = () => setQuantities({});

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

  const reorderItems = (items) =>
    setQuantities(prev => {
      const next = { ...prev };
      items.forEach(item => { next[item.foodId] = (next[item.foodId] || 0) + item.quantity; });
      return next;
    });

  // Per-item customizations — persisted in sessionStorage so they survive navigation
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
