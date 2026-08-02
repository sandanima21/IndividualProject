import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

export const googleSignIn = async (accessToken) => {
    const response = await axios.post(`${API_URL}/google`, { accessToken });
    return response.data;
};

export const changePassword = async (newPassword, token, phone) => {
    const response = await axios.post(
        `${API_URL}/change-password`,
        { newPassword, ...(phone ? { phone } : {}) },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};
