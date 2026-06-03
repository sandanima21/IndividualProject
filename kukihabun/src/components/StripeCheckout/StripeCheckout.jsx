import React, { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';

const CheckoutForm = ({ onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setErrorMsg('');

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setErrorMsg(error.message);
      toast.error('Payment failed: ' + error.message);
      setPaying(false);
    } else {
      toast.success('Payment successful! Your order is confirmed.');
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {errorMsg && (
        <div className="alert alert-danger mt-3 py-2 small">{errorMsg}</div>
      )}
      <div className="d-flex gap-2 mt-4">
        <button type="submit" className="btn btn-primary flex-fill" disabled={paying || !stripe}>
          {paying && <span className="spinner-border spinner-border-sm me-2" />}
          {paying ? 'Processing...' : 'Pay Now'}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={paying}>
          Cancel
        </button>
      </div>
      <p className="text-muted text-center mt-3 small">
        <i className="bi bi-lock-fill me-1" />
        Secured by Stripe · Test mode active
      </p>
    </form>
  );
};

const StripeCheckout = ({ clientSecret, publishableKey, amount, currency, onSuccess, onClose }) => {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: { colorPrimary: '#c8a951' },
    },
  };

  return (
    <div
      className="modal d-block"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-credit-card me-2" />
              Complete Payment
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="alert alert-info py-2 mb-3 small">
              <i className="bi bi-info-circle me-1" />
              <strong>
                {currency} {amount?.toFixed(2)}
              </strong>{' '}
              will be charged to your card.
            </div>
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm onSuccess={onSuccess} onClose={onClose} />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;
