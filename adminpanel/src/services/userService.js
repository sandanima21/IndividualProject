import api from './api';

const BASE = `${import.meta.env.VITE_API_URL}/api/users`;

export const getAllUsers = () => api.get(BASE).then(r => r.data);
export const getUsersByRole = (role) => api.get(`${BASE}/role/${role}`).then(r => r.data);
export const deactivateUser = (id) => api.patch(`${BASE}/${id}/deactivate`).then(r => r.data);
export const activateUser = (id) => api.patch(`${BASE}/${id}/activate`).then(r => r.data);
export const deleteUser = (id) => api.delete(`${BASE}/${id}`);
export const registerDelivery = (data) => api.post(`${BASE}/register-delivery`, data).then(r => r.data);
