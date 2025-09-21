// API Configuration for WiseBook ERP
export const addressIpApi = process.env.NODE_ENV === 'production'
  ? 'https://api.wisebook.tech'
  : 'http://127.0.0.1:8888';

// Authenticated headers helper
export const authenticated_header = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
};

// API endpoints
export const API_ENDPOINTS = {
  FUND_CALLS: '/accounting/fund-call/',
  ACCOUNTS: '/accounting/account/',
  AUTH: '/auth/',
  USERS: '/users/',
} as const;

export default {
  addressIpApi,
  authenticated_header,
  API_ENDPOINTS,
};