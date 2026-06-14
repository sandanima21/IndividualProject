import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const SANDBOX_JS       = 'https://sandbox.payhere.lk/pay/checkout.js';
const LIVE_JS          = 'https://www.payhere.lk/lib/payhere.js';
const SANDBOX_CHECKOUT = 'https://sandbox.payhere.lk/pay/checkout';
const LIVE_CHECKOUT    = 'https://www.payhere.lk/pay/checkout';

// Set when payment is initiated (cleaned up on cancel/failure)
export const PENDING_PAYMENT_KEY = 'kukihabun_pending_pid';
// Set ONLY on confirmed success — Orders.jsx uses this to call markOrderPaid
export const CONFIRMED_PAYMENT_KEY = 'kukihabun_confirmed_pid';

/**
 * Form-POST redirect to PayHere checkout page.
 * Used as fallback when the JS popup cannot be loaded.
 * The orderId is saved to sessionStorage so Orders.jsx can mark it paid on return.
 */
const formPostPayment = (paymentData) => {
  const action = paymentData.sandbox ? SANDBOX_CHECKOUT : LIVE_CHECKOUT;

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;

  Object.entries(paymentData).forEach(([key, val]) => {
    if (key === 'sandbox') return; // Not a PayHere API field
    const el = document.createElement('input');
    el.type  = 'hidden';
    el.name  = key;
    el.value = String(val);
    form.appendChild(el);
  });

  document.body.appendChild(form);
  form.submit(); // Page navigates away; return is handled in Orders.jsx
};

const PayHereCheckout = ({ paymentData, onSuccess, onDismissed }) => {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Save orderId so Orders.jsx can mark it paid if we fall back to form-POST
    sessionStorage.setItem(PENDING_PAYMENT_KEY, paymentData.order_id);

    const scriptSrc = paymentData.sandbox ? SANDBOX_JS : LIVE_JS;

    const launch = () => {
      const ph = window.payhere;

      if (!ph || typeof ph.startPayment !== 'function') {
        formPostPayment(paymentData);
        return;
      }

      ph.onCompleted = (orderId) => {
        sessionStorage.removeItem(PENDING_PAYMENT_KEY);
        toast.success('Payment successful! Your order is confirmed.');
        onSuccess(orderId);
      };

      ph.onDismissed = () => {
        sessionStorage.removeItem(PENDING_PAYMENT_KEY);
        toast.info('Payment cancelled. Your cart is saved.');
        onDismissed();
      };

      ph.onError = () => {
        toast.info('Redirecting to PayHere checkout...');
        formPostPayment(paymentData);
      };

      try {
        ph.startPayment(paymentData);
      } catch (e) {
        toast.info('Redirecting to PayHere checkout...');
        formPostPayment(paymentData);
      }
    };

    // Script already loaded on a previous attempt
    if (window.payhere) {
      launch();
      return;
    }

    const script = document.createElement('script');
    script.src   = scriptSrc;
    script.async = true;
    script.onload = launch;
    script.onerror = () => {
      toast.info('Redirecting to PayHere checkout...');
      formPostPayment(paymentData);
    };
    document.head.appendChild(script);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

export default PayHereCheckout;
