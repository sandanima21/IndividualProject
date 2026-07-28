import api from './api';

const API_URL = `${import.meta.env.VITE_API_URL}/api/orders`;

export const getAllOrders = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await api.patch(`${API_URL}/${orderId}/status`, { status });
  return response.data;
};

export const updateRefundStatus = async (orderId, refundStatus, refundNotes) => {
  const response = await api.patch(`${API_URL}/${orderId}/refund-status`, { refundStatus, refundNotes });
  return response.data;
};

export const processPayhereRefund = async (orderId) => {
  const response = await api.post(`${API_URL}/${orderId}/payhere-refund`);
  return response.data;
};

export const uploadRefundReceipt = async (orderId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`${API_URL}/${orderId}/refund-receipt`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
