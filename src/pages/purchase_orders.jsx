import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../js/app';
import '../css/purchase_orders.css';
import axios from 'axios';

// API configuration
//const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = import.meta.env.VITE_API_URL || 'https://bill-backend-1-z17b.onrender.com/api';

// Configure axios with auth token
axios.defaults.baseURL = API_URL;
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const SAMPLE_PURCHASE_ORDERS = [
  {
    id: 'PO-2024-001',
    vendorName: 'Tech Solutions Inc.',
    vendorEmail: 'sales@techsolutions.com',
    vendorPhone: '(555) 123-4567',
    vendorAddress: '123 Tech Street, Silicon Valley, CA 94025',
    orderDate: '2024-03-01',
    deliveryDate: '2024-03-15',
    status: 'Pending',
    items: [
      {
        id: 1,
        description: 'Dell XPS 15 Laptop',
        quantity: 2,
        unitPrice: 1499.99,
        total: 2999.98
      }
    ],
    subtotal: 2999.98,
    tax: 299.99,
    total: 3299.97
  },
  {
    id: 'PO-2024-002',
    vendorName: 'Office Supplies Co.',
    vendorEmail: 'orders@officesupplies.com',
    vendorPhone: '(555) 987-6543',
    vendorAddress: '456 Supply Drive, Business Park, NY 10001',
    orderDate: '2024-03-02',
    deliveryDate: '2024-03-10',
    status: 'Approved',
    items: [
      {
        id: 1,
        description: 'Premium Office Chair',
        quantity: 5,
        unitPrice: 299.99,
        total: 1499.95
      },
      {
        id: 2,
        description: 'Standing Desk',
        quantity: 3,
        unitPrice: 599.99,
        total: 1799.97
      }
    ],
    subtotal: 3299.92,
    tax: 329.99,
    total: 3629.91
  }
];

const PurchaseOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [purchaseOrders, setPurchaseOrders] = useState(SAMPLE_PURCHASE_ORDERS); // Initialize with sample data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Updated new PO structure
  const [newPO, setNewPO] = useState({
    vendorName: '',
    vendorEmail: '',
    vendorPhone: '',
    vendorAddress: '',
    deliveryDate: '',
    items: [{
      id: 1,
      name: '',
      description: '',
      quantity: '',
      unitPrice: '',
      total: 0
    }],
    shippingAddress: '',
    billingAddress: '',
    paymentMethod: '',
    notes: '',
    gstRate: 18, // Add default GST rate
    subtotal: 0, // Initialize subtotal
    tax: 0 // Initialize tax
  });

  // Status options for purchase orders
  const statusOptions = ['Pending', 'Approved', 'Shipped', 'Delivered', 'Cancelled'];

  // Map for converting between frontend and backend status formats
  const statusMap = {
    // Frontend to backend (lowercase)
    'Pending': 'pending',
    'Approved': 'approved',
    'Shipped': 'shipped',
    'Delivered': 'delivered',
    'Cancelled': 'cancelled',
    // Backend to frontend (capitalized)
    'pending': 'Pending',
    'approved': 'Approved',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled'
  };

  // Fetch purchase orders
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (dateFilter !== 'all') params.append('dateRange', dateFilter);

        // Log the request
        console.log(`Fetching purchase orders with params: ${params.toString()}`);

        const response = await axios.get(`${API_URL}/purchase-orders?${params.toString()}`);

        // Log the response
        console.log('Fetched purchase orders:', response.data);
        setPurchaseOrders(response.data.purchaseOrders);
      } catch (err) {
        console.error('Error fetching purchase orders:', err);
        setError(err.response?.data?.error || 'Failed to fetch purchase orders');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, [searchTerm, statusFilter, dateFilter]);

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

  // Handle submit new PO
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validate items
      if (newPO.items.length === 0) {
        throw new Error('At least one item is required');
      }

      // Validate delivery date
      const deliveryDate = new Date(newPO.deliveryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deliveryDate < today) {
        throw new Error('Delivery date cannot be in the past');
      }

      // Calculate totals
      const items = newPO.items.map((item, index) => ({
        id: index + 1,
        name: item.name?.trim() || '',
        description: item.description?.trim() || item.name?.trim() || 'Item ' + (index + 1),
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        total: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
      }));

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const gstRate = parseFloat(newPO.gstRate) || 0;
      const tax = (subtotal * gstRate) / 100;
      const total = subtotal + tax;

      // Create new PO object
      const purchaseOrderData = {
        vendor: {
          name: newPO.vendorName.trim(),
          email: newPO.vendorEmail.trim(),
          phone: newPO.vendorPhone.trim(),
          address: newPO.vendorAddress.trim()
        },
        deliveryDate: newPO.deliveryDate,
        items,
        shippingAddress: newPO.shippingAddress.trim(),
        billingAddress: newPO.billingAddress.trim(),
        paymentMethod: newPO.paymentMethod,
        notes: newPO.notes.trim(),
        gstRate,
        subtotal,
        tax,
        total,
        createdBy: user?._id
      };

      // Log the data being sent
      console.log('Submitting purchase order data:', purchaseOrderData);

      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Send to backend with authentication
      const response = await axios.post(
        `${API_URL}/purchase-orders`,
        purchaseOrderData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log the response
      console.log('Purchase order created successfully:', response.data);

      // Add to purchase orders list
      setPurchaseOrders(prevOrders => [...prevOrders, response.data]);

      // Reset form
      setNewPO({
        vendorName: '',
        vendorEmail: '',
        vendorPhone: '',
        vendorAddress: '',
        deliveryDate: '',
        items: [{
          id: 1,
          name: '',
          description: '',
          quantity: '',
          unitPrice: '',
          total: 0
        }],
        shippingAddress: '',
        billingAddress: '',
        paymentMethod: '',
        notes: '',
        gstRate: 18,
        subtotal: 0,
        tax: 0
      });

      setShowAddForm(false);
      alert('Purchase Order created successfully!');
    } catch (error) {
      console.error('Error creating purchase order:', error);

      // Log detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        alert(`Server error: ${error.response.data?.error || error.response.statusText || error.message}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        alert('No response received from server. Please check your network connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        alert(`Error: ${error.message}`);
      }
    }
  };

  // Handle status change
  const handleStatusChange = async (poId, newStatus) => {
    try {
      // Convert frontend status (capitalized) to backend status (lowercase)
      const backendStatus = statusMap[newStatus] || newStatus.toLowerCase();

      console.log(`Updating status for PO ${poId} to ${backendStatus}`);

      await axios.patch(`/purchase-orders/${poId}/status`, { status: backendStatus });

      setPurchaseOrders(prevOrders =>
        prevOrders.map(order =>
          (order._id === poId || order.id === poId) ? { ...order, status: backendStatus } : order
        )
      );

      // If we're updating the currently selected PO, update that too
      if (selectedPO && (selectedPO._id === poId || selectedPO.id === poId)) {
        setSelectedPO({...selectedPO, status: backendStatus});
      }

    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  // Handle delete/cancel PO
  const handleDelete = async (poId) => {
    if (!window.confirm('Are you sure you want to cancel this purchase order?')) {
      return;
    }

    try {
      await axios.delete(`/purchase-orders/${poId}`);
      setPurchaseOrders(prevOrders =>
        prevOrders.map(order =>
          order._id === poId ? { ...order, status: 'Cancelled' } : order
        )
      );
      alert('Purchase order cancelled successfully');
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      alert(error.response?.data?.error || 'Failed to cancel purchase order');
    }
  };

  // Handle view PO details
  const handleViewPO = async (po) => {
    try {
      let poData;

      if (typeof po === 'string') {
        // If po is an ID, fetch the data
        const response = await axios.get(`/purchase-orders/${po}`);
        poData = response.data;
      } else {
        // If po is already an object
        poData = po;

        // If we have an ID but not the full details, fetch them
        if ((poData._id || poData.id) && (!poData.orderNumber || !poData.vendor)) {
          try {
            const response = await axios.get(`/purchase-orders/${poData._id || poData.id}`);
            poData = { ...poData, ...response.data };
            console.log('Fetched additional PO details:', response.data);
          } catch (err) {
            console.warn('Could not fetch additional PO details:', err);
            // Continue with what we have
          }
        }
      }

      // Ensure status is properly formatted
      if (poData.status && typeof poData.status === 'string') {
        // Keep the original status but ensure we have a display version
        poData.displayStatus = statusMap[poData.status] ||
          (poData.status.charAt(0).toUpperCase() + poData.status.slice(1).toLowerCase());
      }

      // Ensure we have a valid tax/GST rate
      const taxRate = parseFloat(poData.taxRate || poData.gstRate || 18);
      setSelectedPO({
        ...poData,
        taxRate: taxRate,
        gstRate: taxRate
      });
      setEditedGstRate(taxRate);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching purchase order details:', error);
      alert(error.response?.data?.error || 'Failed to fetch purchase order details');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilter = (event) => {
    setStatusFilter(event.target.value);
  };

  // Add new state for tracking GST rate changes
  const [editedGstRate, setEditedGstRate] = useState(18);

  // Add function to handle GST rate change
  const handleGstRateChange = (rate, poId) => {
    const updatedRate = parseFloat(rate);
    if (isNaN(updatedRate) || updatedRate < 0 || updatedRate > 100) return;

    setEditedGstRate(updatedRate);

    // Update the selected PO with new GST rate and recalculate totals
    if (selectedPO) {
      const subtotal = selectedPO.subtotal || 0;
      const newTax = (subtotal * updatedRate) / 100;
      const newTotal = subtotal + newTax;

      setSelectedPO({
        ...selectedPO,
        tax: newTax,
        total: newTotal,
        gstRate: updatedRate,
        taxRate: updatedRate // Add this for compatibility
      });

      // Update the PO in the main list
      setPurchaseOrders(purchaseOrders.map(po =>
        (po._id === poId || po.id === poId) ? {
          ...po,
          tax: newTax,
          total: newTotal,
          gstRate: updatedRate,
          taxRate: updatedRate // Add this for compatibility
        } : po
      ));
    }
  };

  // Filter purchase orders
  const filteredPOs = purchaseOrders?.filter(po => {
    if (!po) return false;

    const vendorName = po.vendor?.name || po.vendorName || '';
    const matchesSearch =
      po.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;

    // Updated date filter with proper timezone handling
    const matchesDate = dateFilter === 'all' || (() => {
      if (!po.orderDate) return false;
      const poDate = new Date(po.orderDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch(dateFilter) {
        case 'today':
          return poDate.toDateString() === today.toDateString();
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return poDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          return poDate >= monthAgo;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesDate;
  }) || [];

  // Function to format price in Indian currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Add these new functions
  const handleAddItem = () => {
    setNewPO(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: prev.items.length + 1,
          name: '',
          description: '',
          quantity: '',
          unitPrice: '',
          total: 0
        }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    setNewPO(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setNewPO(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };

      // Calculate item total if quantity or unit price changes
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? value : updatedItems[index].quantity;
        const unitPrice = field === 'unitPrice' ? value : updatedItems[index].unitPrice;
        updatedItems[index].total = parseFloat(quantity || 0) * parseFloat(unitPrice || 0);
      }

      // Calculate order subtotal and total
      const subtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const tax = (subtotal * (parseFloat(prev.gstRate) || 0)) / 100;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total: subtotal + tax
      };
    });
  };

  return (
    <div className="purchase-orders-container">
      <div className="po-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBack}>
            ← Back
          </button>
          <h1>Purchase Orders</h1>
        </div>
        <div className="header-actions">
          <button className="add-button" onClick={() => setShowAddForm(true)}>
            + New Purchase Order
          </button>
        </div>
      </div>

      <div className="po-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by PO ID or vendor..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="filter-group">
          <select value={statusFilter} onChange={handleStatusFilter}>
            <option value="all">All Status</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table View */}
      <div className="po-grid">
        <table className="po-table">
          <thead>
            <tr>
              <th>PO ID</th>
              <th>Vendor</th>
              <th>Order Date</th>
              <th>Delivery Date</th>
              <th>Status</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.map((po, index) => (
              <tr key={po._id || po.id || `po-${index}`}>
                <td>{po.orderNumber || po.id || 'N/A'}</td>
                <td>{po.vendor?.name || po.vendorName || 'N/A'}</td>
                <td>{formatDate(po.orderDate)}</td>
                <td>{formatDate(po.deliveryDate)}</td>
                <td>
                  <div className="status-container">
                    <span className={`status-badge status-${po.status?.toLowerCase() || 'pending'}`}>
                      {po.status?.charAt(0).toUpperCase() + po.status?.slice(1).toLowerCase() || 'Pending'}
                    </span>
                  </div>
                </td>
                <td>{formatCurrency(po.total)}</td>
                <td className="action-buttons">
                  <button
                    className="view-button"
                    onClick={() => handleViewPO(po)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card View (Mobile) */}
      <div className="po-card-view">
        {filteredPOs.map((po, index) => (
          <div key={po._id || po.id || `po-card-${index}`} className="po-card">
            <div className="po-card-header">
              <h3>{po.orderNumber || po.id || 'N/A'}</h3>
              <div className="status-container">
                <span className={`status-badge status-${po.status?.toLowerCase() || 'pending'}`}>
                  {po.status?.charAt(0).toUpperCase() + po.status?.slice(1).toLowerCase() || 'Pending'}
                </span>
              </div>
            </div>
            <div className="po-card-content">
              <div className="po-card-field">
                <label>Vendor</label>
                <span>{po.vendor?.name || po.vendorName || 'N/A'}</span>
              </div>
              <div className="po-card-field">
                <label>Order Date</label>
                <span>{po.orderDate}</span>
              </div>
              <div className="po-card-field">
                <label>Delivery Date</label>
                <span>{po.deliveryDate}</span>
              </div>
              <div className="po-card-field">
                <label>Total</label>
                <span>${po.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="po-card-actions">
              <button className="view-button" onClick={() => handleViewPO(po)}>
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="add-po-form">
            <div className="modal-header">
              <h2>New Purchase Order</h2>
              <button onClick={() => setShowAddForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Vendor Information</h3>
                <div className="form-group">
                  <label>Vendor Name *</label>
                  <input
                    type="text"
                    value={newPO.vendorName}
                    onChange={(e) => setNewPO({...newPO, vendorName: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Vendor Email *</label>
                  <input
                    type="email"
                    value={newPO.vendorEmail}
                    onChange={(e) => setNewPO({...newPO, vendorEmail: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Vendor Phone *</label>
                  <input
                    type="tel"
                    value={newPO.vendorPhone}
                    onChange={(e) => setNewPO({...newPO, vendorPhone: e.target.value})}
                    pattern="[0-9+\-\s]+"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Vendor Address *</label>
                  <textarea
                    value={newPO.vendorAddress}
                    onChange={(e) => setNewPO({...newPO, vendorAddress: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Order Details</h3>
                <div className="form-group">
                  <label>Delivery Date *</label>
                  <input
                    type="date"
                    value={newPO.deliveryDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewPO({...newPO, deliveryDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Items *</label>
                  {newPO.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Quantity"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                        required
                      />
                      <span className="item-total">
                        {formatCurrency(item.total)}
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
                </div>
              </div>

              <div className="form-section">
                <h3>Billing Information</h3>
                <div className="form-group">
                  <label>Shipping Address *</label>
                  <textarea
                    value={newPO.shippingAddress}
                    onChange={(e) => setNewPO({...newPO, shippingAddress: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Billing Address *</label>
                  <textarea
                    value={newPO.billingAddress}
                    onChange={(e) => setNewPO({...newPO, billingAddress: e.target.value})}
                    required
                  />
                </div>



                <div className="form-group">
                  <label>Payment Method *</label>
                  <select
                    value={newPO.paymentMethod}
                    onChange={(e) => setNewPO({...newPO, paymentMethod: e.target.value})}
                    required
                  >
                    <option value="">Select Payment Method</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h3>Additional Information</h3>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={newPO.notes}
                    onChange={(e) => setNewPO({...newPO, notes: e.target.value})}
                    placeholder="Add any additional notes or special instructions"
                  />
                </div>
              </div>

              <div className="form-summary">
                <div className="summary-item">
                  <label>Subtotal:</label>
                  <span>{formatCurrency(newPO.subtotal || 0)}</span>
                </div>
                <div className="summary-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label>GST Rate:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      style={{ width: '70px', padding: '4px' }}
                      value={newPO.gstRate}
                      onChange={(e) => setNewPO({...newPO, gstRate: e.target.value})}
                    />
                    <span>%</span>
                  </div>
                  <span>{formatCurrency(((newPO.subtotal || 0) * (parseFloat(newPO.gstRate) || 0)) / 100)}</span>
                </div>
                <div className="summary-item total">
                  <label>Total:</label>
                  <span>{formatCurrency((newPO.subtotal || 0) + ((newPO.subtotal || 0) * (parseFloat(newPO.gstRate) || 0)) / 100)}</span>
                </div>
              </div>

              <div className="form-buttons">
                <button type="submit">Create PO</button>
                <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPO && (
        <div className="modal-overlay">
          <div className="po-detail-modal">
            <div className="modal-header">
              <h2>Purchase Order Details</h2>
              <button className="close-button" onClick={() => setShowDetailModal(false)}>&times;</button>
            </div>

            <div className="po-detail-content">
              <div className="po-detail-section">
                <h3>Vendor Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Name:</label>
                    <span>{selectedPO.vendor?.name || selectedPO.vendorName || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedPO.vendor?.email || selectedPO.vendorEmail || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{selectedPO.vendor?.phone || selectedPO.vendorPhone || 'N/A'}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>Address:</label>
                    <span>{selectedPO.vendor?.address || selectedPO.vendorAddress || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="po-detail-section">
                <h3>Order Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>PO Number:</label>
                    <span>{selectedPO.orderNumber || selectedPO.id || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Order Date:</label>
                    <span>{formatDate(selectedPO.orderDate)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Delivery Date:</label>
                    <span>{formatDate(selectedPO.deliveryDate)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <div className="status-control">
                      <select
                        value={statusMap[selectedPO.status] || selectedPO.status}
                        onChange={(e) => handleStatusChange(selectedPO._id || selectedPO.id, e.target.value)}
                        className={`status-select status-${selectedPO.status?.toLowerCase() || 'pending'}`}
                      >
                        {statusOptions.map((status, index) => (
                          <option key={`status-${index}-${status}`} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Payment Method:</label>
                    <span>{selectedPO.paymentMethod || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="po-detail-section">
                <h3>Address Information</h3>
                <div className="detail-grid">
                  <div className="detail-item full-width">
                    <label>Shipping Address:</label>
                    <span>{selectedPO.shippingAddress || 'N/A'}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>Billing Address:</label>
                    <span>{selectedPO.billingAddress || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="po-detail-section">
                <h3>Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPO.items.map((item, index) => (
                      <tr key={`item-${index}-${item.name || item.description || index}`}>
                        <td>{item.description || item.name || `Item ${index + 1}`}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" align="right"><strong>Subtotal:</strong></td>
                      <td>{formatCurrency(selectedPO.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan="3" align="right">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                          <strong>Tax Rate:</strong>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            style={{ width: '70px', padding: '4px' }}
                            value={editedGstRate}
                            onChange={(e) => handleGstRateChange(e.target.value, selectedPO.id)}
                          />
                          <span>%</span>
                        </div>
                      </td>
                      <td>{formatCurrency((selectedPO.subtotal || 0) * (editedGstRate || 0) / 100)}</td>
                    </tr>
                    <tr>
                      <td colSpan="3" align="right"><strong>Total:</strong></td>
                      <td>{formatCurrency((selectedPO.subtotal || 0) + ((selectedPO.subtotal || 0) * (editedGstRate || 0) / 100))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {selectedPO.notes && (
                <div className="po-detail-section">
                  <h3>Additional Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item full-width">
                      <label>Notes:</label>
                      <span>{selectedPO.notes}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button
                  className="close-button"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;