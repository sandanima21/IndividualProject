import axios from "axios";

const API_URL = "http://localhost:8080/api/reviews";

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const addReview = async (reviewData, token) => {
    const response = await axios.post(API_URL, reviewData, authHeader(token));
    return response.data;
};

export const getReviewsByFood = async (foodId) => {
    const response = await axios.get(`${API_URL}/food/${foodId}`);
    return response.data;
};
