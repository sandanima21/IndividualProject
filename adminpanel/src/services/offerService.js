import api from './api';

const API = `${import.meta.env.VITE_API_URL}/api/offers`;

export const getOffers = () => api.get(API).then(r => r.data);

export const createOffer = (formData) => api.post(API, formData).then(r => r.data);

export const deleteOffer = (id) => api.delete(`${API}/${id}`);
