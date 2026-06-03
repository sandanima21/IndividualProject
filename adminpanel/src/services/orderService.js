import axios from 'axios';

const API_URL = 'http://localhost:8080/api/orders';

export const getAllOrders = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await axios.patch(`${API_URL}/${orderId}/status`, { status });
  return response.data;
};
