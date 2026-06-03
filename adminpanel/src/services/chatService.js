import axios from 'axios';

const API_URL = 'http://localhost:8080/api/chat';

export const getConversations = async () => {
  const response = await axios.get(`${API_URL}/conversations`);
  return response.data;
};

export const getMessages = async (conversationId) => {
  const response = await axios.get(`${API_URL}/${conversationId}`);
  return response.data;
};

export const replyMessage = async (conversationId, content) => {
  const response = await axios.post(`${API_URL}/reply`, { conversationId, content });
  return response.data;
};

export const replyWithImage = async (conversationId, file, content = '') => {
  const form = new FormData();
  form.append('conversationId', conversationId);
  form.append('file', file);
  if (content) form.append('content', content);
  const response = await axios.post(`${API_URL}/reply-image`, form);
  return response.data;
};
