import api from './api';

const API = `${import.meta.env.VITE_API_URL}/api/reviews`;

export const getAllReviews = () => api.get(API).then(r => r.data);
