import api from "./api";

const API_URL = `${import.meta.env.VITE_API_URL}/api/foods`;

export const addFood = async (foodData, imageFile) => {
  const formData = new FormData();
  formData.append('food', JSON.stringify(foodData));
  formData.append('file', imageFile);
  const response = await api.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data;
};

export const updateFood = async (foodId, foodData, imageFile) => {
  const formData = new FormData();
  formData.append('food', JSON.stringify(foodData));
  if (imageFile) formData.append('file', imageFile);
  const response = await api.put(`${API_URL}/${foodId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data;
};

export const getFoodList = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

export const deleteFood = async (foodId) => {
  const response = await api.delete(`${API_URL}/${foodId}`);
  return response.status;
};
