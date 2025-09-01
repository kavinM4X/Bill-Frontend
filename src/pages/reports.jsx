import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';
import '../css/reports.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// API URL
//const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = import.meta.env.VITE_API_URL || 'https://bill-backend-1-z17b.onrender.com/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`
  };
};

const Reports = () => {
  const navigate = useNavigate();

  // Add state for data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add state for each module's data
  const [expensesData, setExpensesData] = useState(null);
  const [productsData, setProductsData] = useState(null);
  const [invoicesData, setInvoicesData] = useState(null);
  const [purchaseOrdersData, setPurchaseOrdersData] = useState(null);
  const [salesOrdersData, setSalesOrdersData] = useState(null);

  // Add state for selected year (default to current year)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Add state for PDF display
  const [showPDF, setShowPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const modalRef = useRef(null);

  // Function to prepare data for the combined business overview pie chart
  const prepareCombinedChartData = () => {
    // Initialize with default empty data
    const data = {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 2,
        hoverOffset: 15
      }]
    };

    // Define vibrant colors for better visual distinction
    const colors = {
      expenses: {
        bg: 'rgba(255, 99, 132, 0.8)',
        border: 'rgba(255, 99, 132, 1)'
      },
      products: {
        bg: 'rgba(54, 162, 235, 0.8)',
        border: 'rgba(54, 162, 235, 1)'
      },
      revenue: {
        bg: 'rgba(46, 204, 113, 0.8)', // Green color for invoices/revenue
        border: 'rgba(46, 204, 113, 1)'
      },
      purchaseOrders: {
        bg: 'rgba(255, 159, 64, 0.8)',
        border: 'rgba(255, 159, 64, 1)'
      },
      salesOrders: {
        bg: 'rgba(153, 102, 255, 0.8)',
        border: 'rgba(153, 102, 255, 1)'
      }
    };

    // Only add data if it's available
    if (!loading) {
      // Add expenses data
      if (expensesData && expensesData.summary) {
        const expenseAmount = expensesData.summary.totalExpenses || 0;
        if (expenseAmount > 0) {
          data.labels.push('Total Expenses');
          data.datasets[0].data.push(expenseAmount);
          data.datasets[0].backgroundColor.push(colors.expenses.bg);
          data.datasets[0].borderColor.push(colors.expenses.border);
        }
      }

      // Add products data (stock value)
      if (productsData) {
        const stockValue = productsData.totalStockValue || 0;
        if (stockValue > 0) {
          data.labels.push('Product Inventory Value');
          data.datasets[0].data.push(stockValue);
          data.datasets[0].backgroundColor.push(colors.products.bg);
          data.datasets[0].borderColor.push(colors.products.border);
        }
      }

      // Add invoices data (revenue)
      if (invoicesData) {
        // Log the invoice data for debugging
        console.log('Invoice data for chart:', invoicesData);

        // Get the revenue amount, ensuring it's a valid number
        let revenueAmount = invoicesData.totalRevenue || 0;

        // If it's a string (like "₹590.00"), convert it to a number
        if (typeof revenueAmount === 'string') {
          // Remove currency symbols and other non-numeric characters
          revenueAmount = parseFloat(revenueAmount.replace(/[^\d.-]/g, ''));
        }

        // Ensure it's a valid number
        revenueAmount = isNaN(revenueAmount) ? 0 : revenueAmount;

        console.log('Processed revenue amount:', revenueAmount);

        if (revenueAmount > 0) {
          data.labels.push('Invoice Revenue');
          data.datasets[0].data.push(revenueAmount);
          data.datasets[0].backgroundColor.push(colors.revenue.bg);
          data.datasets[0].borderColor.push(colors.revenue.border);
        }
      }

      // Add purchase orders data
      if (purchaseOrdersData) {
        const purchaseAmount = purchaseOrdersData.totalAmount || 0;
        if (purchaseAmount > 0) {
          data.labels.push('Purchase Orders Value');
          data.datasets[0].data.push(purchaseAmount);
          data.datasets[0].backgroundColor.push(colors.purchaseOrders.bg);
          data.datasets[0].borderColor.push(colors.purchaseOrders.border);
        }
      }

      // Add sales orders data
      if (salesOrdersData) {
        const salesAmount = salesOrdersData.totalAmount || 0;
        if (salesAmount > 0) {
          data.labels.push('Sales Orders Value');
          data.datasets[0].data.push(salesAmount);
          data.datasets[0].backgroundColor.push(colors.salesOrders.bg);
          data.datasets[0].borderColor.push(colors.salesOrders.border);
        }
      }
    }

    // If no data is available, add placeholder data
    if (data.labels.length === 0) {
      data.labels = ['No Data Available'];
      data.datasets[0].data = [100];
      data.datasets[0].backgroundColor = ['rgba(200, 200, 200, 0.8)'];
      data.datasets[0].borderColor = ['rgba(200, 200, 200, 1)'];
    }

    return data;
  };

  // Format currency with proper spacing
  const formatCurrency = (amount, forPDF = false) => {
    // Handle string values (like "₹590.00")
    if (typeof amount === 'string') {
      // Remove currency symbols and other non-numeric characters
      amount = parseFloat(amount.replace(/[^\d.-]/g, ''));
    }

    // Ensure it's a valid number
    amount = isNaN(amount) ? 0 : amount;

    if (forPDF) {
      // For PDF, use a custom formatter to avoid spacing issues
      // Format the number manually for Indian Rupees
      const absAmount = Math.abs(amount);
      const sign = amount < 0 ? '-' : '';

      // Convert to string with 2 decimal places
      let numStr = absAmount.toFixed(2);

      // Split into integer and decimal parts
      const parts = numStr.split('.');
      const intPart = parts[0];
      const decPart = parts[1];

      // Format integer part with commas for thousands (Indian format)
      let formattedInt = '';
      let count = 0;

      // Process from right to left
      for (let i = intPart.length - 1; i >= 0; i--) {
        count++;
        formattedInt = intPart[i] + formattedInt;

        // Add comma after first 3 digits, then after every 2 digits (Indian format)
        if (count === 3 && i !== 0) {
          formattedInt = ',' + formattedInt;
        } else if (count > 3 && (count - 3) % 2 === 0 && i !== 0) {
          formattedInt = ',' + formattedInt;
        }
      }

      // Combine all parts with the Rupee symbol
      return `₹${sign}${formattedInt}.${decPart}`;
    } else {
      // For normal display, use Intl.NumberFormat
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }
  };

  // Fetch data for all modules
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data from all modules in parallel
        await Promise.all([
          fetchExpenseData(),
          fetchProductsData(),
          fetchInvoicesData(),
          fetchPurchaseOrdersData(),
          fetchSalesOrdersData()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(`Failed to fetch data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Fetch expense data
  const fetchExpenseData = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_URL}/expenses`,
        { headers }
      );

      // Process expense data
      const expenses = Array.isArray(response.data) ? response.data : [];

      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

      // Group by category
      const categoryMap = {};
      expenses.forEach(expense => {
        const category = expense.category || 'Uncategorized';
        if (!categoryMap[category]) {
          categoryMap[category] = 0;
        }
        categoryMap[category] += (expense.amount || 0);
      });

      // Find max category
      let maxCategory = 'None';
      let maxAmount = 0;
      Object.entries(categoryMap).forEach(([category, amount]) => {
        if (amount > maxAmount) {
          maxCategory = category;
          maxAmount = amount;
        }
      });

      // Set expense data
      setExpensesData({
        expenses,
        summary: {
          totalExpenses,
          maxExpenseCategory: maxCategory,
          maxCategoryAmount: maxAmount,
          avgExpense: totalExpenses / (expenses.length || 1)
        }
      });
    } catch (error) {
      console.error('Error fetching expense data:', error);
      // Use mock data as fallback
      setExpensesData({
        expenses: [],
        summary: {
          totalExpenses: 0,
          maxExpenseCategory: 'None',
          maxCategoryAmount: 0,
          avgExpense: 0
        }
      });
    }
  };

  // Fetch products data
  const fetchProductsData = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_URL}/products`, { headers });

      // Process products data
      const products = Array.isArray(response.data) ? response.data : [];

      // Calculate total products
      const totalProducts = products.length;

      // Calculate total stock value
      const totalStockValue = products.reduce((sum, product) =>
        sum + (product.price * product.stock || 0), 0);

      // Group by category
      const categoryMap = {};
      products.forEach(product => {
        const category = product.category || 'Uncategorized';
        if (!categoryMap[category]) {
          categoryMap[category] = {
            count: 0,
            value: 0
          };
        }
        categoryMap[category].count += 1;
        categoryMap[category].value += (product.price * product.stock || 0);
      });

      // Convert to array for charts
      const categoriesData = Object.entries(categoryMap).map(([category, data]) => ({
        category,
        count: data.count,
        value: data.value
      }));

      // Find low stock products
      const lowStockProducts = products.filter(product => product.stock < 5);

      // Set products data
      setProductsData({
        products,
        totalProducts,
        totalStockValue,
        categoriesData,
        lowStockProducts
      });
    } catch (error) {
      console.error('Error fetching products data:', error);
      // Use mock data as fallback
      setProductsData({
        products: [],
        totalProducts: 0,
        totalStockValue: 0,
        categoriesData: [],
        lowStockProducts: []
      });
    }
  };

  // Fetch invoices data
  const fetchInvoicesData = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_URL}/invoices`, { headers });
      console.log('Raw invoice data:', response.data);

      // Process invoices data - ensure we're getting the correct data structure
      let invoices = [];
      if (Array.isArray(response.data)) {
        invoices = response.data;
      } else if (response.data && Array.isArray(response.data.invoices)) {
        invoices = response.data.invoices;
      } else if (response.data && typeof response.data === 'object') {
        // Try to extract invoices from the response object
        const possibleInvoicesArray = Object.values(response.data).find(val => Array.isArray(val));
        if (possibleInvoicesArray) {
          invoices = possibleInvoicesArray;
        }
      }

      console.log('Processed invoices array:', invoices);

      // Filter out invalid invoices and ensure all have proper amount values
      const validInvoices = invoices.filter(invoice => invoice && typeof invoice === 'object');

      // Debug each invoice
      validInvoices.forEach((invoice, index) => {
        // Calculate total from items if available
        let itemsTotal = 0;
        if (invoice.items && Array.isArray(invoice.items)) {
          itemsTotal = invoice.items.reduce((sum, item) => {
            const quantity = item.quantity || 1;
            const price = item.price || item.unitPrice || 0;
            const discount = item.discount || 0;
            const tax = item.tax || 0;

            let itemTotal = quantity * price;
            // Apply discount if any
            itemTotal = itemTotal - (itemTotal * (discount / 100));
            // Apply tax if any
            itemTotal = itemTotal + (itemTotal * (tax / 100));

            return sum + itemTotal;
          }, 0);
        }

        console.log(`Invoice ${index + 1}:`, {
          number: invoice.invoiceNumber || invoice.number || invoice.id || invoice._id || 'N/A',
          customer: invoice.customer?.name || invoice.customerName || 'N/A',
          date: invoice.issueDate || invoice.date || invoice.createdAt || 'N/A',
          amount: invoice.total || invoice.amount || invoice.value || itemsTotal || 0,
          status: invoice.status || 'unknown',
          hasItems: invoice.items ? invoice.items.length : 0
        });
      });

      // Calculate total invoices
      const totalInvoices = validInvoices.length;

      // Calculate total revenue - check multiple possible field names for amount
      const totalRevenue = validInvoices.reduce((sum, invoice) => {
        // Try to get amount from various possible fields
        let amount = 0;

        // Direct amount fields
        if (invoice.total !== undefined) amount = invoice.total;
        else if (invoice.amount !== undefined) amount = invoice.amount;
        else if (invoice.value !== undefined) amount = invoice.value;

        // Calculate from items if no direct amount and items exist
        else if (invoice.items && Array.isArray(invoice.items)) {
          amount = invoice.items.reduce((itemSum, item) => {
            const quantity = item.quantity || 1;
            const price = item.price || item.unitPrice || 0;
            const discount = item.discount || 0;
            const tax = item.tax || 0;

            let itemTotal = quantity * price;
            // Apply discount if any
            itemTotal = itemTotal - (itemTotal * (discount / 100));
            // Apply tax if any
            itemTotal = itemTotal + (itemTotal * (tax / 100));

            return itemSum + itemTotal;
          }, 0);
        }

        // Convert string amounts to numbers if needed
        const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
        return sum + (isNaN(numericAmount) ? 0 : numericAmount);
      }, 0);

      console.log('Total revenue calculated:', totalRevenue);

      // Count paid and unpaid invoices - check for various status values
      const paidStatuses = ['paid', 'Paid', 'completed', 'Completed', 'settled', 'Settled'];
      const paidInvoices = validInvoices.filter(invoice => {
        const status = invoice.status || '';
        return paidStatuses.includes(status.toLowerCase());
      }).length;

      const unpaidInvoices = validInvoices.filter(invoice => {
        const status = invoice.status || '';
        return !paidStatuses.includes(status.toLowerCase());
      }).length;

      // Calculate paid and unpaid amounts
      const paidAmount = validInvoices
        .filter(invoice => {
          const status = invoice.status || '';
          return paidStatuses.includes(status.toLowerCase());
        })
        .reduce((sum, invoice) => {
          // Get amount using the same logic as totalRevenue calculation
          let amount = 0;

          // Direct amount fields
          if (invoice.total !== undefined) amount = invoice.total;
          else if (invoice.amount !== undefined) amount = invoice.amount;
          else if (invoice.value !== undefined) amount = invoice.value;

          // Calculate from items if no direct amount and items exist
          else if (invoice.items && Array.isArray(invoice.items)) {
            amount = invoice.items.reduce((itemSum, item) => {
              const quantity = item.quantity || 1;
              const price = item.price || item.unitPrice || 0;
              const discount = item.discount || 0;
              const tax = item.tax || 0;

              let itemTotal = quantity * price;
              // Apply discount if any
              itemTotal = itemTotal - (itemTotal * (discount / 100));
              // Apply tax if any
              itemTotal = itemTotal + (itemTotal * (tax / 100));

              return itemSum + itemTotal;
            }, 0);
          }

          const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
          return sum + (isNaN(numericAmount) ? 0 : numericAmount);
        }, 0);

      const unpaidAmount = validInvoices
        .filter(invoice => {
          const status = invoice.status || '';
          return !paidStatuses.includes(status.toLowerCase());
        })
        .reduce((sum, invoice) => {
          // Get amount using the same logic as totalRevenue calculation
          let amount = 0;

          // Direct amount fields
          if (invoice.total !== undefined) amount = invoice.total;
          else if (invoice.amount !== undefined) amount = invoice.amount;
          else if (invoice.value !== undefined) amount = invoice.value;

          // Calculate from items if no direct amount and items exist
          else if (invoice.items && Array.isArray(invoice.items)) {
            amount = invoice.items.reduce((itemSum, item) => {
              const quantity = item.quantity || 1;
              const price = item.price || item.unitPrice || 0;
              const discount = item.discount || 0;
              const tax = item.tax || 0;

              let itemTotal = quantity * price;
              // Apply discount if any
              itemTotal = itemTotal - (itemTotal * (discount / 100));
              // Apply tax if any
              itemTotal = itemTotal + (itemTotal * (tax / 100));

              return itemSum + itemTotal;
            }, 0);
          }

          const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
          return sum + (isNaN(numericAmount) ? 0 : numericAmount);
        }, 0);

      // Group by month for the selected year
      const monthlyData = Array(12).fill(0);
      validInvoices.forEach(invoice => {
        // Handle different date formats
        let invoiceDate;
        if (invoice.issueDate) {
          invoiceDate = new Date(invoice.issueDate);
        } else if (invoice.date) {
          invoiceDate = new Date(invoice.date);
        } else if (invoice.createdAt) {
          invoiceDate = new Date(invoice.createdAt);
        } else if (invoice.created) {
          invoiceDate = new Date(invoice.created);
        } else {
          // Skip if no valid date
          return;
        }

        if (!isNaN(invoiceDate.getTime()) && invoiceDate.getFullYear() === selectedYear) {
          const month = invoiceDate.getMonth();

          // Get amount using the same logic as totalRevenue calculation
          let amount = 0;

          // Direct amount fields
          if (invoice.total !== undefined) amount = invoice.total;
          else if (invoice.amount !== undefined) amount = invoice.amount;
          else if (invoice.value !== undefined) amount = invoice.value;

          // Calculate from items if no direct amount and items exist
          else if (invoice.items && Array.isArray(invoice.items)) {
            amount = invoice.items.reduce((itemSum, item) => {
              const quantity = item.quantity || 1;
              const price = item.price || item.unitPrice || 0;
              const discount = item.discount || 0;
              const tax = item.tax || 0;

              let itemTotal = quantity * price;
              // Apply discount if any
              itemTotal = itemTotal - (itemTotal * (discount / 100));
              // Apply tax if any
              itemTotal = itemTotal + (itemTotal * (tax / 100));

              return itemSum + itemTotal;
            }, 0);
          }

          const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
          monthlyData[month] += (isNaN(numericAmount) ? 0 : numericAmount);
        }
      });

      // Set invoices data
      setInvoicesData({
        invoices: validInvoices,
        totalInvoices,
        totalRevenue,
        paidInvoices,
        unpaidInvoices,
        paidAmount,
        unpaidAmount,
        monthlyData
      });

      console.log('Final invoice data set:', {
        totalInvoices,
        totalRevenue,
        paidInvoices,
        unpaidInvoices
      });
    } catch (error) {
      console.error('Error fetching invoices data:', error);
      // Use mock data as fallback
      setInvoicesData({
        invoices: [],
        totalInvoices: 0,
        totalRevenue: 0,
        paidInvoices: 0,
        unpaidInvoices: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        monthlyData: Array(12).fill(0)
      });
    }
  };

  // Fetch purchase orders data
  const fetchPurchaseOrdersData = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_URL}/purchase-orders`, { headers });

      // Process purchase orders data
      const purchaseOrders = Array.isArray(response.data) ? response.data : [];

      // Calculate total purchase orders
      const totalPurchaseOrders = purchaseOrders.length;

      // Calculate total amount
      const totalAmount = purchaseOrders.reduce((sum, po) =>
        sum + (po.total || 0), 0);

      // Group by status
      const statusMap = {};
      purchaseOrders.forEach(po => {
        const status = po.status || 'pending';
        if (!statusMap[status]) {
          statusMap[status] = {
            count: 0,
            amount: 0
          };
        }
        statusMap[status].count += 1;
        statusMap[status].amount += (po.total || 0);
      });

      // Convert to array for charts
      const statusData = Object.entries(statusMap).map(([status, data]) => ({
        status,
        count: data.count,
        amount: data.amount
      }));

      // Group by vendor
      const vendorMap = {};
      purchaseOrders.forEach(po => {
        const vendorName = po.vendor?.name || 'Unknown';
        if (!vendorMap[vendorName]) {
          vendorMap[vendorName] = {
            count: 0,
            amount: 0
          };
        }
        vendorMap[vendorName].count += 1;
        vendorMap[vendorName].amount += (po.total || 0);
      });

      // Convert to array and sort by amount
      const vendorData = Object.entries(vendorMap)
        .map(([vendor, data]) => ({
          vendor,
          count: data.count,
          amount: data.amount
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5); // Top 5 vendors

      // Set purchase orders data
      setPurchaseOrdersData({
        purchaseOrders,
        totalPurchaseOrders,
        totalAmount,
        statusData,
        vendorData
      });
    } catch (error) {
      console.error('Error fetching purchase orders data:', error);
      // Use mock data as fallback
      setPurchaseOrdersData({
        purchaseOrders: [],
        totalPurchaseOrders: 0,
        totalAmount: 0,
        statusData: [],
        vendorData: []
      });
    }
  };

  // Fetch sales orders data
  const fetchSalesOrdersData = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_URL}/sales-orders`, { headers });

      // Process sales orders data
      const salesOrders = Array.isArray(response.data.salesOrders)
        ? response.data.salesOrders
        : Array.isArray(response.data)
          ? response.data
          : [];

      // Calculate total sales orders
      const totalSalesOrders = salesOrders.length;

      // Calculate total amount
      const totalAmount = salesOrders.reduce((sum, so) =>
        sum + (so.total || 0), 0);

      // Group by status
      const statusMap = {};
      salesOrders.forEach(so => {
        const status = so.status || 'pending';
        if (!statusMap[status]) {
          statusMap[status] = {
            count: 0,
            amount: 0
          };
        }
        statusMap[status].count += 1;
        statusMap[status].amount += (so.total || 0);
      });

      // Convert to array for charts
      const statusData = Object.entries(statusMap).map(([status, data]) => ({
        status,
        count: data.count,
        amount: data.amount
      }));

      // Group by customer
      const customerMap = {};
      salesOrders.forEach(so => {
        const customerName = so.customer?.name || 'Unknown';
        if (!customerMap[customerName]) {
          customerMap[customerName] = {
            count: 0,
            amount: 0
          };
        }
        customerMap[customerName].count += 1;
        customerMap[customerName].amount += (so.total || 0);
      });

      // Convert to array and sort by amount
      const customerData = Object.entries(customerMap)
        .map(([customer, data]) => ({
          customer,
          count: data.count,
          amount: data.amount
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5); // Top 5 customers

      // Set sales orders data
      setSalesOrdersData({
        salesOrders,
        totalSalesOrders,
        totalAmount,
        statusData,
        customerData
      });
    } catch (error) {
      console.error('Error fetching sales orders data:', error);
      // Use mock data as fallback
      setSalesOrdersData({
        salesOrders: [],
        totalSalesOrders: 0,
        totalAmount: 0,
        statusData: [],
        customerData: []
      });
    }
  };

  // Close modal when clicking outside
  const handleClickOutside = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      setShowPDF(false);
    }
  };

  // Cleanup URL when modal closes
  useEffect(() => {
    if (!showPDF && pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }
  }, [showPDF, pdfUrl]);

  // Export report as PDF
  const exportPDF = () => {
    try {
      // Create a new PDF document with better quality
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15; // Margin from edges

      // Helper functions for drawing
      const lineY = (y) => doc.line(margin, y, pageWidth - margin, y);

      const text = (str, x, y, font = 'normal', size = 12, align = 'left', color = '#000000') => {
        doc.setFont('helvetica', font);
        doc.setFontSize(size);
        doc.setTextColor(color);
        doc.text(str, x, y, { align });
      };

      // Add a colored header background
      doc.setFillColor(52, 152, 219); // Blue color
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Header text in white
      text('Business Management System', pageWidth / 2, 15, 'bold', 24, 'center', '#FFFFFF');
      text('Business Overview Report', pageWidth / 2, 25, 'bold', 16, 'center', '#FFFFFF');

      // Add company logo placeholder
      // doc.addImage(logoBase64, 'PNG', 15, 10, 20, 20);

      // Report Date with better formatting
      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Add a light gray box for the date
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, 45, pageWidth - (margin * 2), 10, 2, 2, 'F');
      text(`Generated on: ${formattedDate}`, pageWidth / 2, 52, 'normal', 10, 'center', '#555555');

      // Start content position
      let y = 65;

      // Add title for business metrics
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(margin, y - 5, pageWidth - (margin * 2), 10, 2, 2, 'F');
      text('Business Metrics Overview', pageWidth / 2, y, 'bold', 14, 'center', '#333333');
      y += 15;

      // Add data table for the combined chart with better styling
      doc.setFillColor(52, 152, 219, 0.1); // Light blue background
      doc.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');

      // Table headers
      ['Metric', 'Amount', 'Percentage'].forEach((t, i) => {
        const xPos = [margin + 5, pageWidth / 2 - 20, pageWidth - margin - 40][i];
        text(t, xPos, y, 'bold', 12, 'left', '#333333');
      });

      y += 5;
      lineY(y);
      y += 10;

      // Get combined data
      const combinedData = prepareCombinedChartData();

      // Skip the placeholder data if that's all we have
      if (combinedData.labels.length === 1 && combinedData.labels[0] === 'No Data Available') {
        doc.setFillColor(255, 240, 240);
        doc.roundedRect(margin, y - 5, pageWidth - (margin * 2), 10, 2, 2, 'F');
        text('No financial data available', pageWidth / 2, y, 'italic', 12, 'center', '#CC0000');
        y += 20;
      } else {
        const totalValue = combinedData.datasets[0].data.reduce((a, b) => a + b, 0);

        // Add each metric to the table with alternating row colors
        combinedData.labels.forEach((label, index) => {
          // Alternating row background
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');
          }

          const value = combinedData.datasets[0].data[index];
          const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) + '%' : '0%';

          // Get the color from the chart for this item
          const bgColor = combinedData.datasets[0].backgroundColor[index];
          // Extract RGB values from rgba string
          const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          const textColor = rgbMatch ? `rgb(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]})` : '#333333';

          // Add a colored dot before the label
          doc.setFillColor(textColor);
          doc.circle(margin + 2, y - 1, 1.5, 'F');

          // Add the text with the same color as the chart segment
          text(label, margin + 5, y, 'normal', 10, 'left', textColor);
          text(formatCurrency(value, true), pageWidth / 2 - 20, y, 'normal', 10, 'left', textColor);
          text(percentage, pageWidth - margin - 40, y, 'normal', 10, 'left', textColor);

          y += 10;
        });

        // Add total row with bold styling
        y += 2;
        doc.setFillColor(230, 230, 230);
        doc.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');
        lineY(y - 6);

        text('TOTAL', margin + 5, y, 'bold', 11, 'left');
        text(formatCurrency(totalValue, true), pageWidth / 2 - 20, y, 'bold', 11, 'left');
        text('100%', pageWidth - margin - 40, y, 'bold', 11, 'left');

        lineY(y + 5);
      }

      y += 15;

      // Function to add a section with consistent styling
      const addSection = (title, data, dataColor = '#333333') => {
        // Check if we need a new page
        if (y > pageHeight - 50) {
          doc.addPage();
          y = 20;
        }

        // Section title with background
        doc.setFillColor(230, 230, 230);
        doc.roundedRect(margin, y - 5, pageWidth - (margin * 2), 10, 2, 2, 'F');
        text(title, margin + 5, y, 'bold', 12, 'left', '#333333');
        y += 15;

        // Add data items
        Object.entries(data).forEach(([key, value], index) => {
          // Alternating background for rows
          if (index % 2 === 0) {
            doc.setFillColor(248, 248, 248);
            doc.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');
          }

          // Format value if it's a number and looks like currency
          let displayValue = value;
          if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
            // Check if the key suggests this is a monetary value
            if (key.toLowerCase().includes('amount') ||
                key.toLowerCase().includes('revenue') ||
                key.toLowerCase().includes('expense') ||
                key.toLowerCase().includes('value') ||
                key.toLowerCase().includes('total')) {
              displayValue = formatCurrency(value, true);
            }
          }

          text(`${key}:`, margin + 5, y, 'normal', 10, 'left');
          text(`${displayValue}`, margin + 80, y, 'bold', 10, 'left', dataColor);

          y += 10;
        });

        y += 10; // Add space after section
      };

      // Add sections for each module with better organization

      // Expenses Section
      if (expensesData && expensesData.summary) {
        const expenseData = {
          'Total Expenses': expensesData.summary.totalExpenses,
          'Highest Category': expensesData.summary.maxExpenseCategory,
          'Highest Amount': expensesData.summary.maxCategoryAmount,
          'Average Expense': expensesData.summary.avgExpense
        };
        addSection('Expense Summary', expenseData, '#e74c3c'); // Red color for expenses
      }

      // Products Section
      if (productsData) {
        const productData = {
          'Total Products': productsData.totalProducts,
          'Stock Value': productsData.totalStockValue,
          'Low Stock Items': productsData.lowStockProducts.length
        };
        addSection('Product Summary', productData, '#3498db'); // Blue color for products
      }

      // Invoices Section
      if (invoicesData) {
        const invoiceData = {
          'Total Invoices': invoicesData.totalInvoices,
          'Total Revenue': invoicesData.totalRevenue,
          'Paid Invoices': `${invoicesData.paidInvoices} (${formatCurrency(invoicesData.paidAmount, true)})`,
          'Unpaid Invoices': `${invoicesData.unpaidInvoices} (${formatCurrency(invoicesData.unpaidAmount, true)})`
        };
        addSection('Invoice Summary', invoiceData, '#2ecc71'); // Green color for revenue
      }

      // Purchase Orders Section
      if (purchaseOrdersData) {
        const poData = {
          'Total Purchase Orders': purchaseOrdersData.totalPurchaseOrders,
          'Total Amount': purchaseOrdersData.totalAmount
        };
        addSection('Purchase Order Summary', poData, '#f39c12'); // Orange for purchase orders
      }

      // Sales Orders Section
      if (salesOrdersData) {
        const soData = {
          'Total Sales Orders': salesOrdersData.totalSalesOrders,
          'Total Amount': salesOrdersData.totalAmount
        };
        addSection('Sales Order Summary', soData, '#9b59b6'); // Purple for sales orders
      }

      // Add footer with company info
      const addFooter = () => {
        const footerY = pageHeight - 15;
        doc.setFillColor(240, 240, 240);
        doc.rect(0, footerY - 10, pageWidth, 20, 'F');

        text('Business Management System', pageWidth / 2, footerY, 'normal', 8, 'center', '#555555');
        text('Generated by  Business Management System Reports Module', pageWidth / 2, footerY + 5, 'normal', 8, 'center', '#555555');
      };

      // Add page numbers and footer to all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Add footer
        addFooter();

        // Add page numbers
        text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 20, 'normal', 8, 'right', '#555555');
      }

      // Generate PDF blob and create URL
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setShowPDF(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  // Display loading state
  if (loading) {
    return <div className="loading">Loading report data...</div>;
  }

  return (
    <div className="reports-container">
      <header className="reports-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>Business Reports</h1>
        </div>
        <div className="header-right">
          <button className="export-button" onClick={exportPDF}>
            Export PDF
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="unified-reports-content">
        {/* Combined Business Overview Chart */}
        <div className="report-section">
          <h2 className="section-title">Financial Performance Overview</h2>

          <div className="chart-section combined-chart">
            <h2>Business Financial Metrics</h2>
            <div className="chart-wrapper">
              <Pie
                data={prepareCombinedChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '15%', // Makes it slightly donut-like for better appearance
                  radius: '85%', // Makes the chart slightly larger
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        font: {
                          size: 16,
                          weight: 'bold'
                        },
                        padding: 20,
                        usePointStyle: true, // Uses circle instead of rectangle for legend
                        pointStyle: 'circle',
                        generateLabels: function(chart) {
                          // Get the default legend items
                          const original = ChartJS.overrides.pie.plugins.legend.labels.generateLabels(chart);

                          // For each item, add the value to the label
                          original.forEach((item, index) => {
                            const value = chart.data.datasets[0].data[index];
                            const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);

                            // Format the value as currency
                            const formattedValue = formatCurrency(value);

                            // Update the text to include the value
                            item.text = `${item.text}: ${formattedValue} (${percentage}%)`;

                            // Make invoice/revenue label green
                            if (item.text.includes('Invoice Revenue')) {
                              item.fillStyle = 'rgba(46, 204, 113, 1)';
                              // Bold is handled via CSS
                            }
                          });

                          return original;
                        }
                      }
                    },
                    title: {
                      display: true,
                      text: 'Financial Overview',
                      font: {
                        size: 20,
                        weight: 'bold'
                      },
                      padding: {
                        top: 10,
                        bottom: 20
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      titleFont: {
                        size: 16,
                        weight: 'bold'
                      },
                      bodyFont: {
                        size: 14
                      },
                      padding: 12,
                      cornerRadius: 6,
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                      }
                    },

                  },
                  animation: {
                    animateScale: true,
                    animateRotate: true
                  }
                }}
              />
            </div>

            {/* Financial values display outside the chart */}
            <div className="financial-values-container">
              {!loading && (() => {
                const data = prepareCombinedChartData();

                // If no data or only placeholder, show a message
                if (data.labels.length === 0 || (data.labels.length === 1 && data.labels[0] === 'No Data Available')) {
                  return (
                    <div className="no-financial-data">
                      <p>No financial data available</p>
                    </div>
                  );
                }

                // Otherwise, map and display the data
                return data.labels.map((label, index) => {
                  const value = data.datasets[0].data[index];
                  const bgColor = data.datasets[0].backgroundColor[index];

                  // Special styling for invoice revenue (green)
                  const isInvoice = label.includes('Invoice');

                  return (
                    <div
                      key={label}
                      className="financial-value-item"
                      style={{
                        borderLeft: `4px solid ${bgColor}`,
                        backgroundColor: isInvoice ? 'rgba(46, 204, 113, 0.1)' : 'transparent',
                        fontWeight: isInvoice ? 'bold' : 'normal'
                      }}
                    >
                      <span className="value-label">{label}:</span>
                      <span
                        className="value-amount"
                        style={{
                          color: isInvoice ? 'rgba(46, 204, 113, 1)' : 'inherit'
                        }}
                      >
                        {formatCurrency(value)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      {showPDF && (
        <div className="pdf-modal-overlay" onClick={handleClickOutside}>
          <div className="pdf-modal" ref={modalRef}>
            <div className="pdf-modal-header">
              <h2>Business Report</h2>
              <button className="close-button" onClick={() => setShowPDF(false)}>×</button>
            </div>
            <div className="pdf-modal-content">
              <iframe src={pdfUrl} title="Business Report PDF" />
            </div>
            <div className="pdf-modal-footer">
              <a href={pdfUrl} download="business report.pdf" className="download-button">
                Download PDF
              </a>
              <button className="close-button" onClick={() => setShowPDF(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;