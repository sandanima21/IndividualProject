import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/reviews`;

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const addReview = async (reviewData, token) => {
    const response = await axios.post(API_URL, reviewData, authHeader(token));
    return response.data;
};

export const updateReview = async (reviewId, reviewData, token) => {
    const response = await axios.put(`${API_URL}/${reviewId}`, reviewData, authHeader(token));
    return response.data;
};

export const getReviewsByFood = async (foodId) => {
    const response = await axios.get(`${API_URL}/food/${foodId}`);
    return response.data;
};

export const getReviewsByUser = async (userId, token) => {
    const response = await axios.get(`${API_URL}/user/${userId}`, authHeader(token));
    return response.data;
};
