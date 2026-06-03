import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const statusColor = { PENDING: 'secondary', SUCCESS: 'success', FAILED: 'danger', REFUNDED: 'warning', CANCELLED: 'dark' };

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:8080/api/payments')
      .then(r => setPayments(r.data))
      .catch(() => toast.error('Failed to load payments.'))
      .finally(() => setLoading(false));
  }, []);

  const total = payments.filter(p => p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0);

  if (loading) return <div className="py-5 text-center"><div className="spinner-border"></div></div>;

  return (
    <div className="py-4 px-3">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-credit-card me-2 text-success"></i>Payments
        </h4>
        <div className="card px-4 py-2">
          <small className="text-muted">Total Received</small>
          <div className="fw-bold text-success">Rs.{total.toFixed(2)}</div>
        </div>
      </div>

      {payments.length === 0 ? (
        <p className="text-muted text-center py-5">No payments yet.</p>
      ) : (
        <div className="card">
          <table className="table table-hover mb-0">
            <thead className="table-dark">
              <tr>
                <th>Payment ID</th>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Paid At</th>
                <th>Cancelable Until</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="small align-middle">{p.payHerePaymentId || '—'}</td>
                  <td className="small align-middle text-muted">#{p.orderId?.slice(-8).toUpperCase()}</td>
                  <td className="align-middle fw-semibold">Rs.{p.amount?.toFixed(2)}</td>
                  <td className="align-middle small">{p.method || '—'}</td>
                  <td className="align-middle">
                    <span className={`badge bg-${statusColor[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="align-middle small text-muted">
                    {p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}
                  </td>
                  <td className="align-middle small text-muted">
                    {p.cancelableUntil ? new Date(p.cancelableUntil).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Payments;
