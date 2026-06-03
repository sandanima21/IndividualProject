import axios from 'axios';

const API = 'http://localhost:8080/api/reviews';

export const getAllReviews = () => axios.get(API).then(r => r.data);
