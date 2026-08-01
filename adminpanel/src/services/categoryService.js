import api from "./api";

const API_URL = `${import.meta.env.VITE_API_URL}/api/categories`;

export const getCategoryList = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

export const addCategory = async (name, imageFile) => {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', imageFile);
  const response = await api.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data;
};

export const updateCategory = async (id, name, imageFile) => {
  const formData = new FormData();
  formData.append('name', name);
  if (imageFile) formData.append('file', imageFile);
  const response = await api.put(`${API_URL}/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`${API_URL}/${id}`);
  return response.status;
};
