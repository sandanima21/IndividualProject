import axios from 'axios';

const API = `${import.meta.env.VITE_API_URL}/api/reviews`;

export const getAllReviews = () => axios.get(API).then(r => r.data);
