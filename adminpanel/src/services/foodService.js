import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/foods`;

export const addFood = async (foodData, imageFile) => {
  const formData = new FormData();
  formData.append('food', JSON.stringify(foodData));
  formData.append('file', imageFile);
  try {
    const response = await axios.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateFood = async (foodId, foodData, imageFile) => {
  const formData = new FormData();
  formData.append('food', JSON.stringify(foodData));
  if (imageFile) formData.append('file', imageFile);
  try {
    const response = await axios.put(`${API_URL}/${foodId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getFoodList = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteFood = async (foodId) => {
  try {
    const response = await axios.delete(`${API_URL}/${foodId}`);
    return response.status;
  } catch (error) {
    throw error;
  }
};
