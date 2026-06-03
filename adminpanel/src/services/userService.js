import axios from 'axios';

const BASE = 'http://localhost:8080/api/users';

export const getAllUsers = () => axios.get(BASE).then(r => r.data);
export const getUsersByRole = (role) => axios.get(`${BASE}/role/${role}`).then(r => r.data);
export const deactivateUser = (id) => axios.patch(`${BASE}/${id}/deactivate`).then(r => r.data);
export const activateUser = (id) => axios.patch(`${BASE}/${id}/activate`).then(r => r.data);
export const deleteUser = (id) => axios.delete(`${BASE}/${id}`);
export const registerDelivery = (data) => axios.post(`${BASE}/register-delivery`, data).then(r => r.data);
