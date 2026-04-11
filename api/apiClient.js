import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Create axios instance
const api = axios.create({ baseURL: API_URL });

// Attach token to every request automatically
api.interceptors.request.use(async (config) => {
  const stored = await AsyncStorage.getItem('user');
  if (stored) {
    const user = JSON.parse(stored);
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default api;
