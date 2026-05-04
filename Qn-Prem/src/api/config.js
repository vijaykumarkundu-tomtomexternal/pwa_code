import axios from 'axios';

// "https://cytranslate.azure-api.net"
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||  'http://172.191.176.69:5070';


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
