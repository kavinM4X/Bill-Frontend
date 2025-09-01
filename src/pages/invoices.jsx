import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/invoices.css';
import axios from 'axios';

// API URL configuration
//const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = import.meta.env.VITE_API_URL || 'https://bill-backend-1-z17b.onrender.com/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`
  };
};

// Mock data for testing when backend is not available
const MOCK_INVOICES = [
  {
    _id: '1',
    invoiceNumber: 'INV-25-05-0001',
    customerName: 'asik',
    date: '2025-05-15T10:30:00Z',
    dueDate: '2025-06-14T10:30:00Z',
    amount: 236000.00,
    status: 'draft',
    items: [
      { name: 'Product 1', quantity: 2, price: 118000.00 }
    ]
  },
  {
    _id: '2',
    invoiceNumber: 'INV-25-05-0002',
    customerName: '',
    date: '2025-05-14T14:15:00Z',
    dueDate: '2025-06-13T14:15:00Z',
    amount: 0.00,
    status: 'draft',
    items: []
  }
];

const Invoices = () => {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  // New invoice state with default values
  const [newInvoice, setNewInvoice] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ name: '', quantity: 1, price: 0 }],
    notes: ''
  });

  // Set initial mock data state
  useEffect(() => {
    // Check if we should use mock data
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No authentication token found, using mock data');
      setIsUsingMockData(true);
    } else {
      setIsUsingMockData(false);
    }
  }, []);

  // Define fetchInvoices function outside useEffect so it can be called from the refresh button
  const fetchInvoices = async () => {
    try {
      setLoading(true);

      if (isUsingMockData) {
        // Use mock data
        console.log('Using mock invoice data');
        setInvoices(MOCK_INVOICES);
        setError(null);
      } else {
        // Use real API with authentication
        const headers = getAuthHeaders();

        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await axios.get(`${API_URL}/invoices?_t=${timestamp}`, {
          headers,
          cache: 'no-cache'
        });

        console.log('Fetched invoices:', response.data);

        // Process invoices data - ensure we're getting the correct data structure
        let fetchedInvoices = [];

        if (Array.isArray(response.data)) {
          fetchedInvoices = response.data;
        } else if (response.data && Array.isArray(response.data.invoices)) {
          fetchedInvoices = response.data.invoices;
        } else if (response.data && typeof response.data === 'object') {
          // Try to extract invoices from the response object
          const possibleInvoicesArray = Object.values(response.data).find(val => Array.isArray(val));
          if (possibleInvoicesArray) {
            fetchedInvoices = possibleInvoicesArray;
          } else {
            // If we can't find an array, check if the object itself is an invoice
            if (response.data.invoiceNumber || response.data.id || response.data._id) {
              fetchedInvoices = [response.data];
            } else {
              // Last resort: treat all object values as potential invoices
              fetchedInvoices = Object.values(response.data).filter(val =>
                val && typeof val === 'object' && !Array.isArray(val) &&
                (val.invoiceNumber || val.id || val._id || val.total || val.amount || val.items)
              );
            }
          }
        }

        // Transform backend data to match frontend structure
        const transformedInvoices = fetchedInvoices.map(invoice => {
          console.log('Processing invoice for transformation:', invoice);
          return {
            _id: invoice._id || invoice.id || Math.random().toString(36).substring(2, 11),
            invoiceNumber: invoice.invoiceNumber || 'N/A',
            customerName: invoice.customer?.name || invoice.customerName || 'N/A',
            date: invoice.issueDate || invoice.date || invoice.createdAt,
            dueDate: invoice.dueDate,
            amount: invoice.total || invoice.amount || 0,
            status: invoice.status || 'draft',
            items: invoice.items?.map(item => ({
              name: item.description || item.name || 'N/A',
              quantity: item.quantity || 0,
              price: item.unitPrice || item.price || 0,
              total: item.total || (item.quantity * (item.unitPrice || item.price)) || 0
            })) || []
          };
        });

        console.log('Transformed invoices:', transformedInvoices);
        setInvoices(transformedInvoices);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      // Fallback to mock data on error
      if (err.response && err.response.status === 401) {
        setError('Authentication failed. Please log in again.');
        // Redirect to login page
        navigate('/login');
      } else {
        setError(`Failed to fetch invoices: ${err.message} - Using mock data`);
        setInvoices(MOCK_INVOICES);
        setIsUsingMockData(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch invoices on component mount
  useEffect(() => {
    fetchInvoices();
    // No automatic refresh interval
  }, []);

  // Apply saved statuses from localStorage after invoices are loaded
  useEffect(() => {
    if (invoices.length > 0) {
      try {
        // Get stored invoice statuses
        const storedInvoices = JSON.parse(localStorage.getItem('clientInvoices') || '[]');

        if (storedInvoices.length > 0) {
          console.log('Found stored invoice statuses:', storedInvoices);

          // Create a map for quick lookup
          const statusMap = {};
          storedInvoices.forEach(inv => {
            statusMap[inv._id] = inv.status;
          });

          // Apply stored statuses to current invoices
          const updatedInvoices = invoices.map(invoice => {
            if (statusMap[invoice._id]) {
              return { ...invoice, status: statusMap[invoice._id] };
            }
            return invoice;
          });

          // Update invoices state with stored statuses
          setInvoices(updatedInvoices);
          console.log('Applied stored statuses to invoices');
        }
      } catch (error) {
        console.warn('Error loading stored invoice statuses:', error);
      }
    }
  }, [invoices.length]);

  // Parse Indian currency format
  const parseIndianCurrency = (amountStr) => {
    if (!amountStr || typeof amountStr !== 'string') return 0;

    // Remove the Rupee symbol and any commas
    const cleanedStr = amountStr.replace(/[₹,\s]/g, '');

    // Parse the string to a float
    const amount = parseFloat(cleanedStr);

    // Return 0 if parsing failed
    return isNaN(amount) ? 0 : amount;
  };

  // Function to format price in Indian currency
  const formatPrice = (price) => {
    if (price === undefined || price === null) return '₹0.00';

    // Handle string values (like "₹2,36,000.00")
    if (typeof price === 'string') {
      // Use the specialized parser for Indian currency format
      price = parseIndianCurrency(price);
    }

    // Ensure it's a valid number
    price = isNaN(price) ? 0 : price;

    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    } catch (error) {
      console.error('Error formatting price:', error);
      return '₹0.00';
    }
  };

  // Function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';

      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();

    try {
      const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const taxRate = 18; // Default tax rate (GST)
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;

      // Set due date to 30 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      if (isUsingMockData) {
        // Handle mock data locally
        const newId = String(MOCK_INVOICES.length + 1);
        const mockInvoice = {
          _id: newId,
          invoiceNumber: `INV${(invoices.length + 1).toString().padStart(3, '0')}`,
          date: new Date().toISOString(),
          amount: totalAmount,
          status: 'pending',
          ...newInvoice,
          user: localStorage.getItem('userId') || 'unknown'
        };

        console.log('Creating mock invoice:', mockInvoice);
        setInvoices([...invoices, mockInvoice]);
        setNewInvoice({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          customerAddress: '',
          items: [{ name: '', quantity: 1, price: 0 }],
          notes: ''
        });
        setShowAddForm(false);
      } else {
        // Format items to match backend schema
        const formattedItems = newInvoice.items.map(item => {
          // Validate item data
          const quantity = parseInt(item.quantity) || 1;
          const unitPrice = parseFloat(item.price) || 0;
          const total = quantity * unitPrice;

          return {
            description: item.name.trim() || 'Unnamed Item',
            quantity: quantity,
            unitPrice: unitPrice,
            total: total
          };
        });

        // Use real API
        const invoiceData = {
          customer: {
            name: newInvoice.customerName.trim(),
            email: newInvoice.customerEmail || '',
            phone: newInvoice.customerPhone || '',
            address: newInvoice.customerAddress || ''
          },
          issueDate: new Date().toISOString(),
          dueDate: dueDate.toISOString(),
          items: formattedItems,
          subtotal: subtotal,
          taxRate: taxRate,
          taxAmount: taxAmount,
          total: totalAmount,
          status: 'draft',
          notes: newInvoice.notes || '',
          createdBy: localStorage.getItem('userId') || 'unknown'
        };

        console.log('Sending invoice data:', invoiceData);
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/invoices`, invoiceData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Created invoice:', response.data);

        // Transform the response data to match frontend structure
        const transformedInvoice = {
          _id: response.data._id,
          invoiceNumber: response.data.invoiceNumber || 'N/A',
          customerName: response.data.customer?.name || newInvoice.customerName || 'N/A',
          date: response.data.issueDate || response.data.createdAt,
          dueDate: response.data.dueDate,
          amount: response.data.total || 0,
          status: response.data.status || 'draft',
          items: response.data.items?.map(item => ({
            name: item.description || 'N/A',
            quantity: item.quantity || 0,
            price: item.unitPrice || 0,
            total: item.total || 0
          })) || []
        };

        console.log('Transformed invoice for frontend:', transformedInvoice);

        // Add the transformed invoice to the state
        setInvoices([...invoices, transformedInvoice]);

        // Reset form
        setNewInvoice({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          customerAddress: '',
          items: [{ name: '', quantity: 1, price: 0 }],
          notes: ''
        });
        setShowAddForm(false);

        // Refresh the invoice list to ensure we have the latest data
        fetchInvoices();
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      if (err.response && err.response.data && err.response.data.error) {
        alert(`Failed to create invoice: ${err.response.data.error}`);
      } else {
        alert(`Failed to create invoice: ${err.message}`);
      }
    }
  };

  const handleAddItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { name: '', quantity: 1, price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = newInvoice.items.map((item, i) => {
      if (i === index) {
        // Handle empty string for numeric fields to avoid NaN
        if ((field === 'price' || field === 'quantity') && value === '') {
          return { ...item, [field]: 0 };
        }
        return { ...item, [field]: field === 'price' || field === 'quantity' ? parseFloat(value) || 0 : value };
      }
      return item;
    });
    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  const handleDeleteInvoice = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        if (isUsingMockData) {
          // Handle mock data locally
          setInvoices(invoices.filter(invoice => invoice._id !== id));
        } else {
          // Use real API with authentication
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          await axios.delete(`${API_URL}/invoices/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          setInvoices(invoices.filter(invoice => invoice._id !== id));
        }
      } catch (err) {
        console.error('Error deleting invoice:', err);
        if (err.response && err.response.status === 401) {
          alert('Authentication failed. Please log in again.');
          navigate('/login');
        } else if (err.response && err.response.data && err.response.data.error) {
          alert(`Failed to delete invoice: ${err.response.data.error}`);
        } else {
          alert(`Failed to delete invoice: ${err.message}`);
        }
      }
    }
  };

  // Completely client-side status update function
  const handleUpdateStatus = (id, newStatus) => {
    try {
      console.log(`Updating invoice ${id} status to ${newStatus} (client-side only)`);

      // Update the UI immediately
      const updatedInvoices = invoices.map(invoice =>
        invoice._id === id ? { ...invoice, status: newStatus } : invoice
      );
      console.log('Updated invoices (UI):', updatedInvoices);
      setInvoices(updatedInvoices);

      // Store the updated invoices in localStorage for persistence
      try {
        // Get existing stored invoices or initialize empty array
        const storedInvoices = JSON.parse(localStorage.getItem('clientInvoices') || '[]');

        // Find if this invoice already exists in storage
        const existingIndex = storedInvoices.findIndex(inv => inv._id === id);

        if (existingIndex >= 0) {
          // Update existing invoice
          storedInvoices[existingIndex].status = newStatus;
        } else {
          // Add new invoice status record
          const invoiceToStore = { _id: id, status: newStatus };
          storedInvoices.push(invoiceToStore);
        }

        // Save back to localStorage
        localStorage.setItem('clientInvoices', JSON.stringify(storedInvoices));
        console.log('Saved invoice status to localStorage');
      } catch (storageError) {
        console.warn('Failed to save to localStorage:', storageError);
      }

      // Note: We're intentionally not making an API call to avoid the 500 error
      // This is a temporary solution until the backend is fixed

    } catch (err) {
      console.error('Error in handleUpdateStatus:', err);

      // Even if there's an error, still try to update the UI
      setInvoices(invoices.map(invoice =>
        invoice._id === id ? { ...invoice, status: newStatus } : invoice
      ));
    }
  };

  const handleViewInvoice = (invoice) => {
    // Make a fresh copy of the invoice to ensure we have the latest data
    const currentInvoice = invoices.find(inv => inv._id === invoice._id) || invoice;

    // Ensure all required fields are present
    const processedInvoice = {
      ...currentInvoice,
      customerName: currentInvoice.customerName || 'N/A',
      invoiceNumber: currentInvoice.invoiceNumber || 'N/A',
      date: currentInvoice.date || new Date().toISOString(),
      dueDate: currentInvoice.dueDate || '',
      amount: currentInvoice.amount || 0,
      status: currentInvoice.status || 'draft',
      items: Array.isArray(currentInvoice.items) ? currentInvoice.items : []
    };

    console.log('Viewing invoice details:', processedInvoice);
    setSelectedInvoice(processedInvoice);
    setShowViewModal(true);
  };

  // Safely filter invoices with null checks
  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(invoice => {
    // Check if invoice is a valid object
    if (!invoice || typeof invoice !== 'object') {
      return false;
    }

    // Handle the case where customerName or invoiceNumber might be undefined
    const customerName = (invoice.customerName || '').toString();
    const invoiceNumber = (invoice.invoiceNumber || '').toString();
    const searchTermLower = (searchTerm || '').toLowerCase();

    // Safe search matching
    const matchesSearch =
      customerName.toLowerCase().includes(searchTermLower) ||
      invoiceNumber.toLowerCase().includes(searchTermLower);

    // Safe status matching
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;

    return matchesSearch && matchesStatus;
  }) : [];

  // Display loading state
  if (loading && (!invoices || invoices.length === 0)) {
    return <div className="loading">Loading invoices...</div>;
  }

  return (
    <div className="invoices-container">
      <header className="invoices-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>Invoices Management</h1>
        </div>
        <div className="header-right">
          <button className="add-button" onClick={() => setShowAddForm(true)}>
            Create New Invoice
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="invoices-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="status-filter">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="modal-overlay">
          <div className="add-invoice-form">
            <h2>Create New Invoice</h2>
            <form onSubmit={handleAddInvoice}>
              <div className="customer-section">
                <h3>Customer Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input
                      type="text"
                      value={newInvoice.customerName}
                      onChange={(e) => setNewInvoice({...newInvoice, customerName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={newInvoice.customerEmail}
                      onChange={(e) => setNewInvoice({...newInvoice, customerEmail: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={newInvoice.customerPhone}
                      onChange={(e) => setNewInvoice({...newInvoice, customerPhone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      value={newInvoice.customerAddress}
                      onChange={(e) => setNewInvoice({...newInvoice, customerAddress: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="items-section">
                <h3>Items</h3>
                {newInvoice.items.map((item, index) => (
                  <div key={index} className="item-row">
                    <div className="form-group">
                      <label>Item Name</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                        required
                      />
                    </div>
                    {index > 0 && (
                      <button
                        type="button"
                        className="remove-item-button"
                        onClick={() => handleRemoveItem(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="add-item-button" onClick={handleAddItem}>
                  Add Item
                </button>
              </div>

              <div className="notes-section">
                <h3>Additional Information</h3>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={newInvoice.notes}
                    onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                    placeholder="Add any additional notes or payment instructions..."
                  />
                </div>
              </div>

              <div className="form-buttons">
                <button type="submit">Create Invoice</button>
                <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="invoice-detail-modal">
            <div className="modal-header">
              <h2>Invoice Details</h2>
              <button onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="invoice-detail-content">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Invoice Number:</span>
                  <span className="detail-value">{selectedInvoice.invoiceNumber || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Customer Name:</span>
                  <span className="detail-value">{selectedInvoice.customerName || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{formatDate(selectedInvoice.date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Due Date:</span>
                  <span className="detail-value">{formatDate(selectedInvoice.dueDate)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <select
                    value={selectedInvoice.status || 'pending'}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      handleUpdateStatus(selectedInvoice._id, newStatus);
                      setSelectedInvoice({...selectedInvoice, status: newStatus});
                    }}
                    className={`status-badge ${selectedInvoice.status || 'pending'}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(selectedInvoice.createdAt)}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(selectedInvoice.items) ?
                      selectedInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name || item.description || 'N/A'}</td>
                          <td>{item.quantity || 0}</td>
                          <td>{formatPrice(item.price || item.unitPrice || 0)}</td>
                          <td>{formatPrice((item.quantity || 0) * (item.price || item.unitPrice || 0))}</td>
                        </tr>
                      )) :
                      <tr>
                        <td colSpan="4">No items available</td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3">Total Amount:</td>
                      <td>{formatPrice(selectedInvoice.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="invoices-grid">
        <div className="invoices-table">
          {!invoices || invoices.length === 0 ? (
            <div className="no-invoices">
              <p>No invoices found. Create your first invoice!</p>
            </div>
          ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice </th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(invoice => (
                  <tr key={invoice._id}>
                    <td>{invoice.invoiceNumber}</td>
                  <td>{invoice.customerName}</td>
                  <td>{formatDate(invoice.date)}</td>
                  <td>{formatPrice(invoice.amount)}</td>
                  <td>
                    <select
                      value={invoice.status || 'pending'}
                      onChange={(e) => handleUpdateStatus(invoice._id, e.target.value)}
                      className={`status-badge ${invoice.status || 'pending'}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="view-button"
                      onClick={() => handleViewInvoice(invoice)}
                    >
                      View
                    </button>
                    <button
                      className="delete-button"
                        onClick={() => handleDeleteInvoice(invoice._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;