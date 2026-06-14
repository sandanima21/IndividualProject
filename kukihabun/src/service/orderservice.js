import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/orders`;
const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const placeOrder = (orderData, token) =>
    axios.post(API_URL, orderData, authHeader(token)).then(r => r.data);

export const getMyOrders = (token) =>
    axios.get(`${API_URL}/my`, authHeader(token)).then(r => r.data);

export const getAllOrders = () =>
    axios.get(API_URL).then(r => r.data);

export const updateOrderStatus = (orderId, status) =>
    axios.patch(`${API_URL}/${orderId}/status`, { status }).then(r => r.data);

// Mark order as PAID after successful Stripe payment (no Stripe API call — Stripe.js already verified it)
export const markOrderPaid = (orderId, token) =>
    axios.post(`${API_URL}/${orderId}/mark-paid`, {}, authHeader(token)).then(r => r.data);

// Delete a PENDING+UNPAID order (user cancelled the Stripe modal — cart stays intact)
export const cancelPendingOrder = (orderId, token) =>
    axios.delete(`${API_URL}/${orderId}/cancel-pending`, authHeader(token));

// Cancel a PAID+PENDING order — bankDetails are saved so admin can process the manual transfer
export const cancelOrder = (orderId, token, bankDetails) =>
    axios.post(`${import.meta.env.VITE_API_URL}/api/payments/cancel/${orderId}`, bankDetails ?? {}, authHeader(token)).then(r => r.data);

// PayHere payment initiation — returns hash + all params needed by payhere.startPayment()
export const initiatePayment = (orderId, token) =>
    axios.post(`${import.meta.env.VITE_API_URL}/api/payments/initiate/${orderId}`, {}, authHeader(token)).then(r => r.data);

export const sendOtp = (phone, token) =>
    axios.post(`${import.meta.env.VITE_API_URL}/api/otp/send`, { phone }, authHeader(token)).then(r => r.data);

export const verifyOtp = (phone, code, token) =>
    axios.post(`${import.meta.env.VITE_API_URL}/api/otp/verify`, { phone, code }, authHeader(token)).then(r => r.data);

// Delivery reviews
export const submitDeliveryReview = (data, token) =>
    axios.post(`${import.meta.env.VITE_API_URL}/api/delivery-reviews`, data, authHeader(token)).then(r => r.data);

export const getDeliveryReviewByOrder = (orderId) =>
    axios.get(`${import.meta.env.VITE_API_URL}/api/delivery-reviews/order/${orderId}`)
        .then(r => r.data)
        .catch(err => err.response?.status === 404 ? null : Promise.reject(err));
