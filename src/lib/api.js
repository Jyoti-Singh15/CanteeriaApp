import AsyncStorage from '@react-native-async-storage/async-storage';

// Use environment variable, fallback to hardcoded production URL if missing
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://canteeriaapp.onrender.com';

const apiCall = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const token = await AsyncStorage.getItem('userToken');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    // Handle empty responses
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) throw new Error(data.message || 'Server Error');
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Based on your backend menuController.js
export const getMenu = async () => {
  // Using the new /api/products endpoint
  const data = await apiCall('/api/products');
  return data || [];
};

// Based on your backend auth/signup logic
export const signUp = async (userData) => {
  return await apiCall('/api/auth/signup', {
    method: 'POST',
    body: userData,
  });
};

// Based on your backend auth/login logic
export const login = async (credentials) => {
  return await apiCall('/api/auth/login', {
    method: 'POST',
    body: credentials,
  });
};

// Based on your backend orderController.js
export const createOrder = async (orderData) => {
  return await apiCall('/api/orders', {
    method: 'POST',
    body: orderData,
  });
};

export const getUserOrders = async (userId) => {
  return await apiCall(`/api/orders/user/${userId}`);
};