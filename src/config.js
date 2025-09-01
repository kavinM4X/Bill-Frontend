// Configuration for the frontend application

// API URL - Change this to your production URL when deploying
//const API_URL = 'http://localhost:5000/api';
const API_URL = 'https://bill-backend-1-z17b.onrender.com/api';


// Other configuration options
const CONFIG = {
  // Application name
  APP_NAME: 'BillWell',
  
  // Default currency
  CURRENCY: 'INR',
  
  // Default date format
  DATE_FORMAT: 'DD MMM YYYY',
  
  // Default pagination limit
  DEFAULT_PAGE_LIMIT: 10,
  
  // Token storage key
  TOKEN_KEY: 'token',
  
  // User storage key
  USER_KEY: 'user',
  
  // API endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: `${API_URL}/auth/login`,
      REGISTER: `${API_URL}/auth/register`,
      ME: `${API_URL}/auth/me`,
      UPDATE_PROFILE: `${API_URL}/auth/me`,
    },
    PRODUCTS: {
      BASE: `${API_URL}/products`,
      BY_ID: (id) => `${API_URL}/products/${id}`,
    },
    INVOICES: {
      BASE: `${API_URL}/invoices`,
      BY_ID: (id) => `${API_URL}/invoices/${id}`,
      UPDATE_STATUS: (id) => `${API_URL}/invoices/${id}/status`,
    },
    EXPENSES: {
      BASE: `${API_URL}/expenses`,
      BY_ID: (id) => `${API_URL}/expenses/${id}`,
    },
    SALES_ORDERS: {
      BASE: `${API_URL}/sales-orders`,
      BY_ID: (id) => `${API_URL}/sales-orders/${id}`,
    },
    PURCHASE_ORDERS: {
      BASE: `${API_URL}/purchase-orders`,
      BY_ID: (id) => `${API_URL}/purchase-orders/${id}`,
    },
    REPORTS: {
      BASE: `${API_URL}/reports`,
    },
  },
};

export default CONFIG;
export { API_URL };
