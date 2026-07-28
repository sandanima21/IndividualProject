import api from './api';

const API_URL = `${import.meta.env.VITE_API_URL}/api/chat`;

export const getConversations = async () => {
  const response = await api.get(`${API_URL}/conversations`);
  return response.data;
};

export const getMessages = async (conversationId) => {
  const response = await api.get(`${API_URL}/${conversationId}`);
  return response.data;
};

export const replyMessage = async (conversationId, content) => {
  const response = await api.post(`${API_URL}/reply`, { conversationId, content });
  return response.data;
};

export const markConversationRead = async (conversationId) => {
  await api.patch(`${API_URL}/${conversationId}/read`);
};

export const replyWithImage = async (conversationId, file, content = '') => {
  const form = new FormData();
  form.append('conversationId', conversationId);
  form.append('file', file);
  if (content) form.append('content', content);
  const response = await api.post(`${API_URL}/reply-image`, form);
  return response.data;
};
