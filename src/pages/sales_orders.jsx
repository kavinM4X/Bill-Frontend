import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../js/app';
import axios from 'axios';
import { salesOrdersAPI } from '../services/api';
import '../css/sales_orders.css';

// API configuration
//const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = import.meta.env.VITE_API_URL || 'https://bill-backend-1-z17b.onrender.com/api';

const SalesOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSO, setSelectedSO] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format today's date for min attribute
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize newSO with today's date
  const [newSO, setNewSO] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryDate: getTodayString(),
    items: [{ name: '', quantity: '', price: '', tax: 18, total: 0, product: null }],
    billingAddress: '',
    shippingAddress: '',
    paymentTerms: '',
    notes: ''
  });

  // State for products
  const [products, setProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);

  // Status options for sales orders (lowercase to match backend enum)
  const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  const paymentStatusOptions = ['pending', 'partial', 'paid', 'refunded'];

  // Display versions with capitalized first letter
  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Format currency in Indian Rupees
  const formatCurrency = (amount) => {
    // Handle NaN, undefined, or null values
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '₹0.00';
    }

    // Handle string values (like "₹2,36,000.00")
    if (typeof amount === 'string') {
      // Remove currency symbols and commas
      const cleanedStr = amount.replace(/[₹,\s]/g, '');
      // Parse the string to a float
      amount = parseFloat(cleanedStr);

      // Check again for NaN after parsing
      if (isNaN(amount)) {
        return '₹0.00';
      }
    }

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

  // Calculate total amount including tax
  const calculateItemTotal = (item) => {
    const subtotal = item.quantity * item.price;
    const taxAmount = (subtotal * item.tax) / 100;
    return subtotal + taxAmount;
  };

  // Calculate order total
  const calculateOrderTotal = (items) => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  // Handle adding new item to SO
  const handleAddItem = () => {
    setNewSO({
      ...newSO,
      items: [...newSO.items, { name: '', quantity: '', price: '', tax: 18, total: 0, product: null }]
    });
  };

  // Handle removing item from SO
  const handleRemoveItem = (index) => {
    const updatedItems = newSO.items.filter((_, i) => i !== index);
    setNewSO({
      ...newSO,
      items: updatedItems
    });
  };

  // Handle item change in form
  const handleItemChange = (index, field, value) => {
    const updatedItems = newSO.items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'price') {
          updatedItem.total = calculateItemTotal(updatedItem);
        }
        return updatedItem;
      }
      return item;
    });

    setNewSO({
      ...newSO,
      items: updatedItems
    });
  };

  // Handle product selection for an item
  const handleProductSelect = (product, index) => {
    const updatedItems = newSO.items.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          name: product.name,
          description: product.description || product.name,
          price: product.price,
          product: product._id, // Store the product ID reference
          quantity: item.quantity || 1 // Keep existing quantity or default to 1
        };
      }
      return item;
    });

    setNewSO({
      ...newSO,
      items: updatedItems
    });

    // Close the product search modal
    setShowProductSearch(false);
    setSelectedItemIndex(null);
    setProductSearchTerm('');
  };

  // Open product search modal for a specific item
  const openProductSearch = (index) => {
    setSelectedItemIndex(index);
    setShowProductSearch(true);
    fetchProducts(); // Refresh the product list
  };

  // Fetch sales orders
  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter !== 'all') params.dateRange = dateFilter;

      const response = await salesOrdersAPI.getAll(params);
      setSalesOrders(response.data.salesOrders);
      setError(null);
    } catch (err) {
      console.error('Error fetching sales orders:', err);
      setError('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch products
  const fetchProducts = async (search = '') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await axios.get(`${API_URL}/products`, {
        params: { search },
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Products fetched:', response.data);
      setProducts(response.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSalesOrders();
  }, [searchTerm, statusFilter, dateFilter]);

  // Handle status change
  const handleStatusChange = async (soId, newStatus) => {
    try {
      console.log(`Updating status for order ${soId} to ${newStatus}`);

      // Convert status to lowercase to match backend enum values
      const status = newStatus.toLowerCase();

      // Validate status
      const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }

      await salesOrdersAPI.updateStatus(soId, status);
      console.log(`Status updated successfully to ${status}`);

      fetchSalesOrders(); // Refresh the list
    } catch (err) {
      console.error('Error updating status:', err);

      // Log detailed error information
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        console.error('Error response headers:', err.response.headers);
        setError(`Failed to update status: ${err.response.data?.error || err.response.statusText || err.message}`);
      } else {
        setError(`Failed to update status: ${err.message}`);
      }
    }
  };

  // Handle payment status change
  const handlePaymentStatusChange = async (soId, newStatus) => {
    try {
      console.log(`Updating payment status for order ${soId} to ${newStatus}`);

      // Convert status to lowercase to match backend enum values
      const paymentStatus = newStatus.toLowerCase();

      // Validate payment status
      const validPaymentStatuses = ['pending', 'partial', 'paid', 'refunded'];
      if (!validPaymentStatuses.includes(paymentStatus)) {
        throw new Error(`Invalid payment status: ${paymentStatus}. Must be one of: ${validPaymentStatuses.join(', ')}`);
      }

      await salesOrdersAPI.updatePaymentStatus(soId, paymentStatus);
      console.log(`Payment status updated successfully to ${paymentStatus}`);

      fetchSalesOrders(); // Refresh the list
    } catch (err) {
      console.error('Error updating payment status:', err);

      // Log detailed error information
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        console.error('Error response headers:', err.response.headers);
        setError(`Failed to update payment status: ${err.response.data?.error || err.response.statusText || err.message}`);
      } else {
        setError(`Failed to update payment status: ${err.message}`);
      }
    }
  };

  // Handle delete sales order
  const handleDeleteSalesOrder = async (soId) => {
    if (window.confirm('Are you sure you want to delete this sales order?')) {
      try {
        console.log(`Deleting sales order ${soId}`);

        await salesOrdersAPI.cancel(soId);
        console.log('Sales order deleted successfully');

        // Refresh the list after deletion
        fetchSalesOrders();

        setError(null);
      } catch (err) {
        console.error('Error deleting sales order:', err);

        // Log detailed error information
        if (err.response) {
          console.error('Error response data:', err.response.data);
          console.error('Error response status:', err.response.status);
          console.error('Error response headers:', err.response.headers);
          setError(`Failed to delete sales order: ${err.response.data?.error || err.response.statusText || err.message}`);
        } else {
          setError(`Failed to delete sales order: ${err.message}`);
        }
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate items
      if (newSO.items.length === 0) {
        throw new Error('At least one item is required');
      }

      // Generate a unique order number
      const orderNumber = `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Process items and validate numbers
      const items = newSO.items.map(item => {
        const quantity = parseFloat(item.quantity);
        const price = parseFloat(item.price);
        const tax = parseFloat(item.tax);

        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity for item: ${item.name}`);
        }
        if (isNaN(price) || price < 0) {
          throw new Error(`Invalid price for item: ${item.name}`);
        }
        if (isNaN(tax) || tax < 0 || tax > 100) {
          throw new Error(`Invalid tax percentage for item: ${item.name}`);
        }

        // Calculate item total
        const itemTotal = quantity * price;

        return {
          name: item.name.trim(),
          description: item.description || item.name.trim(),
          quantity,
          unitPrice: price,  // Changed from price to unitPrice as required by the model
          tax: tax,  // Include the tax rate for each item
          taxRate: tax,  // Include as taxRate as well for compatibility
          total: itemTotal,
          product: item.product || null  // Include product reference if available
        };
      });

      // Calculate order subtotal
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);

      // Calculate tax amount
      const taxRate = 18; // Default GST rate
      const taxAmount = (subtotal * taxRate) / 100;

      // Calculate order total
      const total = subtotal + taxAmount;

      // Create sales order object with all required fields
      const newSalesOrder = {
        orderNumber,
        customer: {
          name: newSO.customerName.trim(),
          email: newSO.customerEmail.trim(),
          phone: newSO.customerPhone.trim(),
          address: newSO.billingAddress.trim()
        },
        orderDate: new Date().toISOString(),
        deliveryDate: newSO.deliveryDate,
        status: 'pending',
        paymentStatus: 'pending',
        items,
        subtotal,
        taxRate,
        taxAmount,
        shippingCost: 0,
        total,
        billingAddress: newSO.billingAddress.trim(),
        shippingAddress: newSO.shippingAddress.trim(),
        notes: newSO.notes.trim(),
        createdBy: user?._id
      };

      console.log('Submitting sales order:', newSalesOrder);

      // Send to backend using the API service (which already handles authentication)
      const response = await salesOrdersAPI.create(newSalesOrder);
      console.log('Sales order created successfully:', response.data);

      setShowAddForm(false);
      fetchSalesOrders(); // Refresh the list
      setError(null);
      alert('Sales order created successfully!');
    } catch (err) {
      console.error('Error creating sales order:', err);

      // Log detailed error information
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        console.error('Error response headers:', err.response.headers);
        setError(`Server error: ${err.response.data?.error || err.response.statusText || err.message}`);
      } else if (err.request) {
        // The request was made but no response was received
        console.error('Error request:', err.request);
        setError('No response received from server. Please check your network connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', err.message);
        setError(`Error: ${err.message}`);
      }
    }
  };

  // Copy shipping address from billing address
  const copyBillingAddress = () => {
    setNewSO({
      ...newSO,
      shippingAddress: newSO.billingAddress
    });
  };

  // Filter sales orders
  const filteredSOs = salesOrders.filter(so => {
    // Safely access properties with fallbacks
    const orderId = so.orderNumber || so.id || '';
    const customerName = so.customer?.name || so.customerName || '';
    const customerEmail = so.customer?.email || so.customerEmail || '';
    const status = so.status || 'pending';
    const orderDate = so.orderDate || new Date().toISOString();

    // Case-insensitive search
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      orderId.toString().toLowerCase().includes(searchTermLower) ||
      customerName.toLowerCase().includes(searchTermLower) ||
      customerEmail.toLowerCase().includes(searchTermLower);

    const matchesStatus = statusFilter === 'all' || status.toLowerCase() === statusFilter.toLowerCase();

    const matchesDate = dateFilter === 'all' || (() => {
      const soDate = new Date(orderDate);
      const today = new Date();
      switch(dateFilter) {
        case 'today':
          return soDate.toDateString() === today.toDateString();
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(today.getDate() - 7);
          return soDate >= weekAgo;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(today.getMonth() - 1);
          return soDate >= monthAgo;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="sales-orders-container">
      {error && <div className="error-message">{error}</div>}

      <header className="so-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>Sales Orders</h1>
        </div>
        <div className="header-actions">
          <button className="add-button" onClick={() => setShowAddForm(true)}>
            Create New Order
          </button>
        </div>
      </header>

      <div className="so-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by Order ID, Customer, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading sales orders...</div>
      ) : (
        <div className="so-grid">
          <table className="so-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Order Date</th>
                <th>Delivery Date</th>
                <th>Status</th>
                <th>Payment Status</th>
                <th>Total Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSOs.map(so => (
                <tr key={so._id || so.id}>
                  <td>{so.orderNumber || so.id || 'N/A'}</td>
                  <td>
                    <div>{so.customer?.name || so.customerName || 'N/A'}</div>
                    <div className="customer-email">{so.customer?.email || so.customerEmail || 'N/A'}</div>
                  </td>
                  <td>{formatDate(so.orderDate)}</td>
                  <td>{formatDate(so.deliveryDate)}</td>
                  <td>
                    <select
                      value={so.status || 'pending'}
                      onChange={(e) => handleStatusChange(so._id || so.id, e.target.value)}
                      className={`status-${(so.status || 'pending').toLowerCase()}`}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{formatStatus(status)}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={so.paymentStatus || 'pending'}
                      onChange={(e) => handlePaymentStatusChange(so._id || so.id, e.target.value)}
                      className={`payment-status-${(so.paymentStatus || 'pending').toLowerCase()}`}
                    >
                      {paymentStatusOptions.map(status => (
                        <option key={status} value={status}>{formatStatus(status)}</option>
                      ))}
                    </select>
                  </td>
                  <td>{formatCurrency(so.total || 0)}</td>
                  <td>
                    <button
                      className="view-button"
                      onClick={() => {
                        // Create a normalized version of the sales order for the modal
                        const normalizedSO = {
                          id: so._id || so.id,
                          orderNumber: so.orderNumber || so.id,
                          customerName: so.customer?.name || so.customerName || 'N/A',
                          customerEmail: so.customer?.email || so.customerEmail || 'N/A',
                          customerPhone: so.customer?.phone || so.customerPhone || 'N/A',
                          orderDate: so.orderDate || new Date().toISOString(),
                          deliveryDate: so.deliveryDate || new Date().toISOString(),
                          status: so.status || 'pending',
                          paymentStatus: so.paymentStatus || 'pending',
                          items: (so.items || []).map(item => ({
                            name: item.name || item.description || 'N/A',
                            quantity: item.quantity || 0,
                            price: item.price || item.unitPrice || 0,
                            tax: item.tax || item.taxRate || so.taxRate || 18, // Default to order taxRate or 18%
                            total: item.total || 0
                          })),
                          total: so.total || 0,
                          taxRate: so.taxRate || 18, // Default tax rate
                          billingAddress: so.billingAddress || so.customer?.address || 'N/A',
                          shippingAddress: so.shippingAddress || 'N/A',
                          paymentTerms: so.paymentTerms || 'N/A',
                          notes: so.notes || ''
                        };
                        setSelectedSO(normalizedSO);
                        setShowDetailModal(true);
                      }}
                    >
                      View Details
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteSalesOrder(so._id || so.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add SO Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="add-so-form">
            <h2>Create New Sales Order</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Customer Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input
                      type="text"
                      value={newSO.customerName}
                      onChange={(e) => setNewSO({...newSO, customerName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={newSO.customerEmail}
                      onChange={(e) => setNewSO({...newSO, customerEmail: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={newSO.customerPhone}
                      onChange={(e) => setNewSO({...newSO, customerPhone: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Order Details</h3>
                <div className="form-group">
                  <label>Delivery Date</label>
                  <input
                    type="date"
                    value={newSO.deliveryDate}
                    min={getTodayString()}
                    onChange={(e) => setNewSO({...newSO, deliveryDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Items</label>
                  <div className="items-header">
                    <span>Item Name</span>
                    <span>Quantity</span>
                    <span>Price</span>
                    <span>Tax (%)</span>
                    <span>Total</span>
                    <span></span>
                  </div>
                  {newSO.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-name-field">
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="select-product-btn"
                          onClick={() => openProductSearch(index)}
                        >
                          Select Product
                        </button>
                      </div>
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Tax %"
                        value={item.tax}
                        onChange={(e) => handleItemChange(index, 'tax', parseFloat(e.target.value))}
                        required
                      />
                      <span className="item-total">
                        {formatCurrency(calculateItemTotal(item))}
                      </span>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="remove-item"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={handleAddItem} className="add-item">
                    Add Item
                  </button>
                  <div className="order-total">
                    Total Amount: {formatCurrency(calculateOrderTotal(newSO.items))}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Billing & Shipping</h3>
                <div className="form-group">
                  <label>Billing Address</label>
                  <textarea
                    value={newSO.billingAddress}
                    onChange={(e) => setNewSO({...newSO, billingAddress: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="shipping-header">
                    <label>Shipping Address</label>
                    <button type="button" onClick={copyBillingAddress} className="copy-address">
                      Copy Billing Address
                    </button>
                  </div>
                  <textarea
                    value={newSO.shippingAddress}
                    onChange={(e) => setNewSO({...newSO, shippingAddress: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Payment Terms</label>
                  <input
                    type="text"
                    value={newSO.paymentTerms}
                    onChange={(e) => setNewSO({...newSO, paymentTerms: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={newSO.notes}
                    onChange={(e) => setNewSO({...newSO, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-buttons">
                <button type="submit">Create Order</button>
                <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Search Modal */}
      {showProductSearch && (
        <div className="modal-overlay">
          <div className="product-search-modal">
            <div className="modal-header">
              <h2>Select Product</h2>
              <button className="close-button" onClick={() => setShowProductSearch(false)}>×</button>
            </div>
            <div className="product-search-content">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    fetchProducts(e.target.value);
                  }}
                />
              </div>
              <div className="products-list">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>SKU</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product._id}>
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{formatCurrency(product.price)}</td>
                        <td>{product.stock}</td>
                        <td>
                          <button
                            type="button"
                            className="select-btn"
                            onClick={() => handleProductSelect(product, selectedItemIndex)}
                            disabled={product.stock <= 0}
                          >
                            {product.stock > 0 ? 'Select' : 'Out of Stock'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan="5" className="no-products">No products found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSO && (
        <div className="modal-overlay">
          <div className="so-detail-modal">
            <div className="modal-header">
              <h2>Sales Order Details</h2>
              <div className="modal-actions">
                <button
                  className="delete-button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this sales order?')) {
                      handleDeleteSalesOrder(selectedSO.id);
                      setShowDetailModal(false);
                    }
                  }}
                >
                  Delete
                </button>
                <button onClick={() => setShowDetailModal(false)}>×</button>
              </div>
            </div>
            <div className="modal-content">
              <div className="so-detail-section">
                <h3>Customer Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Order ID:</label>
                    <span>{selectedSO.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Customer:</label>
                    <span>{selectedSO.customerName}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedSO.customerEmail}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{selectedSO.customerPhone}</span>
                  </div>
                </div>
              </div>

              <div className="so-detail-section">
                <h3>Order Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Order Date:</label>
                    <span>{formatDate(selectedSO.orderDate)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Delivery Date:</label>
                    <span>{formatDate(selectedSO.deliveryDate)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={`status-${selectedSO.status.toLowerCase()}`}>
                      {selectedSO.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Payment Status:</label>
                    <span className={`payment-status-${selectedSO.paymentStatus.toLowerCase()}`}>
                      {selectedSO.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="so-detail-section">
                <h3>Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Tax</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSO.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name || item.description || 'N/A'}</td>
                        <td>{item.quantity || 0}</td>
                        <td>{formatCurrency(item.price || item.unitPrice || 0)}</td>
                        <td>{(item.tax || item.taxRate || selectedSO.taxRate || 18)}%</td>
                        <td>{formatCurrency(item.total || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4">Total Amount:</td>
                      <td>{formatCurrency(selectedSO.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="so-detail-section">
                <h3>Additional Information</h3>
                <div className="detail-grid">
                  <div className="detail-item full-width">
                    <label>Billing Address:</label>
                    <span>{selectedSO.billingAddress}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>Shipping Address:</label>
                    <span>{selectedSO.shippingAddress}</span>
                  </div>
                  <div className="detail-item">
                    <label>Payment Terms:</label>
                    <span>{selectedSO.paymentTerms}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>Notes:</label>
                    <span>{selectedSO.notes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrders;