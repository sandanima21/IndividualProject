import axios from 'axios';

const API = 'http://localhost:8080/api/offers';

export const getOffers = () => axios.get(API).then(r => r.data);

export const createOffer = (formData) => axios.post(API, formData).then(r => r.data);

export const deleteOffer = (id) => axios.delete(`${API}/${id}`);
