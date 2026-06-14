import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/chat`;

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const sendMessage = async (content, token) => {
    const response = await axios.post(`${API_URL}/send`, { content }, authHeader(token));
    return response.data;
};

export const sendMessageWithImage = async (file, content = '', token) => {
    const form = new FormData();
    form.append('file', file);
    if (content) form.append('content', content);
    const response = await axios.post(`${API_URL}/send-image`, form, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const getMessages = async (conversationId, token) => {
    const response = await axios.get(`${API_URL}/${conversationId}`, authHeader(token));
    return response.data;
};

export const getConversations = async () => {
    const response = await axios.get(`${API_URL}/conversations`);
    return response.data;
};

export const replyMessage = async (conversationId, content) => {
    const response = await axios.post(`${API_URL}/reply`, { conversationId, content });
    return response.data;
};
