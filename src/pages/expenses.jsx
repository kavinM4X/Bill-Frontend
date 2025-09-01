import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../js/app';
import { useNavigate } from 'react-router-dom';
import '../css/expenses.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

// Register the plugin with jsPDF
jsPDF.API.autoTable = autoTable;

// API URL configuration
//const API_URL = 'http://localhost:5000/api';
const API_URL = 'https://bill-backend-1-z17b.onrender.com/api';

const Expenses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const expenseCategories = [
    'Office Supplies',
    'Utilities',
    'Rent',
    'Salaries',
    'Marketing',
    'Travel',
    'Equipment',
    'Maintenance',
    'Others'
  ];

  const [newExpense, setNewExpense] = useState({
    description: '',
    category: '',
    amount: '',
    date: '',
    paymentMethod: '',
    receipt: '',
    notes: ''
  });

  // Fetch expenses from API
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);

        // Add authentication token
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          navigate('/login');
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const response = await axios.get(`${API_URL}/expenses`, { headers });
        console.log('Fetched expenses:', response.data);

        if (Array.isArray(response.data)) {
          setExpenses(response.data);
          setError(null);
        } else {
          console.error('Invalid response format:', response.data);
          setExpenses([]);
          setError('Invalid data format received from server');
        }
      } catch (err) {
        console.error('Error fetching expenses:', err);
        if (err.response && err.response.status === 401) {
          setError('Authentication failed. Please log in again.');
          navigate('/login');
        } else {
          setError(`Failed to fetch expenses: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [navigate]);

  // Function to format price in Indian currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Function to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleEditExpense = (expense) => {
    setNewExpense({
      // Use title as description if available, otherwise use description
      description: expense.title || expense.description || '',
      category: expense.category || '',
      amount: expense.amount ? expense.amount.toString() : '0',
      date: expense.date ? expense.date.split('T')[0] : '',
      paymentMethod: expense.paymentMethod || '',
      receipt: expense.receipt || '',
      notes: expense.notes || ''
    });
    setEditingId(expense._id);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Map frontend fields to backend expected fields
      const expenseData = {
        title: newExpense.description, // Map description to title as required by backend
        description: newExpense.description,
        category: newExpense.category,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date,
        paymentMethod: newExpense.paymentMethod,
        receipt: newExpense.receipt,
        notes: newExpense.notes,
        user: user?._id
      };

      // Add authentication token
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (isEditing) {
        // Update existing expense
        const response = await axios.put(
          `${API_URL}/expenses/${editingId}`,
          expenseData,
          { headers }
        );

        setExpenses(expenses.map(expense =>
          expense._id === editingId ? response.data : expense
        ));
        setIsEditing(false);
        setEditingId(null);
      } else {
        // Add new expense
        const response = await axios.post(
          `${API_URL}/expenses`,
          expenseData,
          { headers }
        );

        setExpenses([...expenses, response.data]);
      }

      setNewExpense({
        description: '',
        category: '',
        amount: '',
        date: '',
        paymentMethod: '',
        receipt: '',
        notes: ''
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error saving expense:', err);
      if (err.response && err.response.data && err.response.data.error) {
        alert(`Failed to save expense: ${err.response.data.error}`);
      } else {
        alert(`Failed to save expense: ${err.message}`);
      }
    }
  };

  const handleCancel = () => {
    setNewExpense({
      description: '',
      category: '',
      amount: '',
      date: '',
      paymentMethod: '',
      receipt: '',
      notes: ''
    });
    setShowAddForm(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        // Add authentication token
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Authentication token not found. Please log in again.');
          navigate('/login');
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        await axios.delete(`${API_URL}/expenses/${id}`, { headers });
        setExpenses(expenses.filter(expense => expense._id !== id));
      } catch (err) {
        console.error('Error deleting expense:', err);
        if (err.response && err.response.status === 401) {
          alert('Authentication failed. Please log in again.');
          navigate('/login');
        } else if (err.response && err.response.data && err.response.data.error) {
          alert(`Failed to delete expense: ${err.response.data.error}`);
        } else {
          alert(`Failed to delete expense: ${err.message}`);
        }
      }
    }
  };

  // Calculate total expenses
  const calculateTotal = (expenseList) => {
    return expenseList.reduce((total, expense) => total + expense.amount, 0);
  };

  // Filter expenses based on search, category, and month
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
    const matchesMonth = selectedMonth === 'all' || expense.date.startsWith(selectedMonth);
    return matchesSearch && matchesCategory && matchesMonth;
  });

  // Generate months for filter
  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthYear = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      months.push({ value: monthYear, label: monthName });
    }
    return months;
  };

  // Download expenses as PDF
  const downloadExpensesPDF = () => {
    try {
      if (filteredExpenses.length === 0) {
        alert('No expenses to export. Please add some expenses first.');
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape' });
      const lineY = (y) => doc.line(20, y, 280, y);

      const text = (str, x, y, font = 'normal', size = 12) => {
        doc.setFont('helvetica', font);
        doc.setFontSize(size);
        doc.text(str, x, y);
      };

      // Header
      text('BillWell', 150, 20, 'bold', 20);
      text('Expenses Report', 150, 30, 'bold', 16);

      // Table Headers
      let y = 50;
      lineY(y); y += 10;
      ['Date', 'Description', 'Category', 'Amount', 'Payment Method'].forEach((t, i) =>
        text(t, [20, 60, 120, 180, 240][i], y, 'bold')
      );

      // Table Content
      doc.setFont('helvetica', 'normal');
      filteredExpenses.forEach(expense => {
        y += 10;
        if (y > 180) { doc.addPage(); y = 20; }
        [formatDate(expense.date), expense.description, expense.category, formatPrice(expense.amount), expense.paymentMethod].forEach((val, i) =>
          text(val.toString().replace('₹', ''), [20, 60, 120, 180, 240][i], y)
        );
      });

      // Total
      y += 20; lineY(y); y += 10;
      text('Total Expenses:', 180, y, 'bold');
      text(formatPrice(calculateTotal(filteredExpenses)).replace('₹', ''), 240, y, 'bold');

      // Footer
      const timestamp = new Date().toLocaleString('en-IN');
      text(`Generated: ${timestamp}`, 150, 190, 'normal', 10, 'center');

      doc.save('expenses.pdf');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Could not generate PDF. Please try again.');
    }
  };

  // Display loading state
  if (loading && expenses.length === 0) {
    return <div className="loading">Loading expenses...</div>;
  }

  return (
    <div className="expenses-container">
      <header className="expenses-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>Expenses Management</h1>
        </div>
        <div className="header-actions">
          <button className="download-button" onClick={downloadExpensesPDF}>
            Download PDF
          </button>
          <button className="add-button" onClick={() => setShowAddForm(true)}>
            Add New Expense
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="expenses-summary">
        <div className="summary-card">
          <h3>Total Expenses</h3>
          <p className="amount">{formatPrice(calculateTotal(filteredExpenses))}</p>
        </div>
      </div>

      <div className="expenses-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="category-filter">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {expenseCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="month-filter">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            {generateMonthOptions().map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="modal-overlay">
          <div className="add-expense-form">
            <h2>{isEditing ? 'Edit Expense' : 'Add New Expense'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  required
                >
                  <option value="">Select Category</option>
                  {expenseCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={newExpense.paymentMethod}
                  onChange={(e) => setNewExpense({...newExpense, paymentMethod: e.target.value})}
                  required
                >
                  <option value="">Select Payment Method</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Online Payment">Online Payment</option>
                </select>
              </div>

              <div className="form-group">
                <label>Receipt Number</label>
                <input
                  type="text"
                  value={newExpense.receipt}
                  onChange={(e) => setNewExpense({...newExpense, receipt: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-buttons">
                <button type="submit">{isEditing ? 'Update Expense' : 'Add Expense'}</button>
                <button type="button" onClick={handleCancel}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="expenses-grid">
        <div className="expenses-table">
          {expenses.length === 0 ? (
            <div className="no-expenses">
              <p>No expenses found. Add your first expense!</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(expense => (
                  <tr key={expense._id}>
                    <td>{formatDate(expense.date)}</td>
                    <td>{expense.description}</td>
                    <td>{expense.category}</td>
                    <td>{formatPrice(expense.amount)}</td>
                    <td>{expense.paymentMethod}</td>
                    <td>
                      <button
                        className="edit-button"
                        onClick={() => handleEditExpense(expense)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteExpense(expense._id)}
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

export default Expenses;