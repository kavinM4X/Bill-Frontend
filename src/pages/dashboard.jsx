import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../js/app';
import '../css/dashboard.css';

// API URL configuration
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = import.meta.env.VITE_API_URL || 'https://bill-backend-1-z17b.onrender.com/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0
  });

  // State for sales orders and products data
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productsError, setProductsError] = useState(null);

  // Format currency in Indian Rupees
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Fetch sales orders and calculate metrics
  useEffect(() => {
    const fetchSalesOrders = async () => {
      try {
        setLoading(true);

        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          setError('Authentication required');
          setLoading(false);
          return;
        }

        // Fetch sales orders from API
        const response = await axios.get(`${API_URL}/sales-orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Fetched sales orders:', response.data);

        // Extract sales orders from response
        let salesOrders = [];
        if (Array.isArray(response.data)) {
          salesOrders = response.data;
        } else if (response.data && Array.isArray(response.data.salesOrders)) {
          salesOrders = response.data.salesOrders;
        } else if (response.data && typeof response.data === 'object') {
          // Try to extract sales orders from the response object
          const possibleOrdersArray = Object.values(response.data).find(val => Array.isArray(val));
          if (possibleOrdersArray) {
            salesOrders = possibleOrdersArray;
          }
        }

        // Update state with fetched orders
        setRecentOrders(salesOrders);

        // Calculate metrics
        const totalSales = salesOrders.length;

        // Count pending orders (case insensitive)
        const pendingOrders = salesOrders.filter(order => {
          const status = (order.status || '').toLowerCase();
          return status === 'pending' || status === 'processing' || status === 'confirmed';
        }).length;

        // Count completed orders (case insensitive)
        const completedOrders = salesOrders.filter(order => {
          const status = (order.status || '').toLowerCase();
          return status === 'delivered' || status === 'completed';
        }).length;

        // Calculate total revenue
        const totalRevenue = salesOrders.reduce((sum, order) => {
          // Handle different property names for total
          const amount = order.total || order.amount || 0;

          // Handle string values (like "₹2,36,000.00")
          if (typeof amount === 'string') {
            // Remove currency symbols and commas
            const cleanedStr = amount.replace(/[₹,\s]/g, '');
            // Parse the string to a float
            const numericAmount = parseFloat(cleanedStr);
            return sum + (isNaN(numericAmount) ? 0 : numericAmount);
          }

          return sum + (amount || 0);
        }, 0);

        // Update metrics state
        setMetrics({
          totalSales,
          pendingOrders,
          completedOrders,
          totalRevenue
        });

        setError(null);
      } catch (err) {
        console.error('Error fetching sales orders:', err);
        setError('Failed to fetch sales orders');

        // Set default metrics
        setMetrics({
          totalSales: 0,
          pendingOrders: 0,
          completedOrders: 0,
          totalRevenue: 0
        });
      } finally {
        setLoading(false);
      }
    };

    // Fetch products data
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);

        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          setProductsError('Authentication required');
          setProductsLoading(false);
          return;
        }

        // Fetch products from API
        const response = await axios.get(`${API_URL}/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Fetched products:', response.data);

        // Extract products from response
        let products = [];
        if (Array.isArray(response.data)) {
          products = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // Try to extract products from the response object
          const possibleProductsArray = Object.values(response.data).find(val => Array.isArray(val));
          if (possibleProductsArray) {
            products = possibleProductsArray;
          }
        }

        // Sort products by createdAt or _id to get the most recent ones
        products.sort((a, b) => {
          // If createdAt exists, use it
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          // Otherwise try to use _id (MongoDB ObjectIds contain a timestamp)
          return b._id?.localeCompare(a._id) || 0;
        });

        // Update state with fetched products (limit to 5 most recent)
        setRecentProducts(products.slice(0, 5));
        setProductsError(null);
      } catch (err) {
        console.error('Error fetching products:', err);
        setProductsError('Failed to fetch products');
        setRecentProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    // Fetch both sales orders and products
    fetchSalesOrders();
    fetchProducts();
  }, []);

  const handleLogout = () => {
    // Clear authentication token
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    // Redirect to home page
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Business Management System Dashboard</h1>
        </div>
        <div className="user-info">
          <span>Welcome, {user?.name || 'User'}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-grid">
        <Link to="/products" className="dashboard-card">
          <h2>Products</h2>
          <p>Manage your product inventory</p>
        </Link>

        <Link to="/invoices" className="dashboard-card">
          <h2>Invoices</h2>
          <p>View and create invoices</p>
        </Link>

        <Link to="/expenses" className="dashboard-card">
          <h2>Expenses</h2>
          <p>Track your expenses</p>
        </Link>

        <Link to="/reports" className="dashboard-card">
          <h2>Reports</h2>
          <p>View financial reports</p>
        </Link>

        <Link to="/purchase-orders" className="dashboard-card">
          <h2>Purchase Orders</h2>
          <p>Manage purchase orders</p>
        </Link>

        <Link to="/sales-orders" className="dashboard-card">
          <h2>Sales Orders</h2>
          <p>Track sales orders</p>
        </Link>
      </div>

      <div className="metrics-section">
        <div className="section-header">
          <h2>Business Performance</h2>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon sales-icon">📊</div>
            <div className="metric-content">
              <h3>Total Sales</h3>
              <p className="metric-value">{metrics.totalSales}</p>
              <p className="metric-label">Orders</p>
            </div>
          </div>

        <div className="metric-card">
          <div className="metric-icon pending-icon">⏳</div>
          <div className="metric-content">
            <h3>Pending Orders</h3>
            <p className="metric-value">{metrics.pendingOrders}</p>
            <p className="metric-label">Need attention</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon completed-icon">✅</div>
          <div className="metric-content">
            <h3>Completed Orders</h3>
            <p className="metric-value">{metrics.completedOrders}</p>
            <p className="metric-label">Successfully delivered</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon revenue-icon">💰</div>
          <div className="metric-content">
            <h3>Total Revenue</h3>
            <p className="metric-value">{formatCurrency(metrics.totalRevenue)}</p>
            <p className="metric-label">This period</p>
          </div>
        </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Recent Orders Section */}
        <div className="recent-orders">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <button
              className="view-all-button"
              onClick={() => navigate('/sales-orders')}
            >
              View All
            </button>
          </div>
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="loading-cell">Loading orders...</td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data-cell">No sales orders found</td>
                  </tr>
                ) : (
                  recentOrders.slice(0, 5).map(order => (
                    <tr key={order._id || order.id || Math.random().toString(36).substring(2, 11)}>
                      <td>{order.orderNumber || order.id || 'N/A'}</td>
                      <td>{order.customer?.name || order.customerName || 'N/A'}</td>
                      <td>{formatDate(order.orderDate || order.date || order.createdAt)}</td>
                      <td>
                        <span className={`status-badge status-${(order.status || 'pending').toLowerCase()}`}>
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      <td>{formatCurrency(order.total || order.amount || 0)}</td>
                      <td>
                        <button
                          className="view-details-button"
                          onClick={() => navigate(`/sales-orders`, { state: { orderId: order._id || order.id } })}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Products Section */}
        <div className="recent-products">
          <div className="section-header">
            <h2>Recent Products</h2>
            <button
              className="view-all-button"
              onClick={() => navigate('/products')}
            >
              View All
            </button>
          </div>
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {productsLoading ? (
                  <tr>
                    <td colSpan="6" className="loading-cell">Loading products...</td>
                  </tr>
                ) : recentProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data-cell">No products found</td>
                  </tr>
                ) : (
                  recentProducts.map(product => (
                    <tr key={product._id || product.id || Math.random().toString(36).substring(2, 11)}>
                      <td>{product.sku || 'N/A'}</td>
                      <td>{product.name || 'N/A'}</td>
                      <td>{product.category || 'Uncategorized'}</td>
                      <td>{formatCurrency(product.price || 0)}</td>
                      <td>{product.stock || 0}</td>
                      <td>
                        <button
                          className="view-details-button"
                          onClick={() => navigate('/products', { state: { productId: product._id || product.id } })}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;