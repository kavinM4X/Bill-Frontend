import React, { useState, useEffect } from 'react';
import { useAuth } from '../js/app';
import { useNavigate } from 'react-router-dom';
import '../css/products.css';

const Products = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    price: '',
    stock: ''
  });

  const categories = ['All', 'Electronics', 'Clothing', 'Books', 'Office Supplies', 'Other'];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    console.log('Current user:', user);

    fetch('https://bill-backend-1-z17b.onrender.com/api/products', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          console.error('Failed to fetch products:', res.status);
          return [];
        }
      })
      .then(data => {
        console.log('Products data from API:', data);
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error('Products data is not an array:', data);
          setProducts([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching products:', error);
        setProducts([]);
      });
  }, [navigate]);

  // Function to format price in Indian currency format
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      if (isEditing) {
        // Update existing product
        const response = await fetch(`https://bill-backend-1-z17b.onrender.com/api/products/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ...newProduct, price: parseFloat(newProduct.price), stock: parseInt(newProduct.stock) })
        });

        if (!response.ok) {
          throw new Error(`Failed to update product: ${response.status}`);
        }
      } else {
        // Add new product
        const response = await fetch('https://bill-backend-1-z17b.onrender.com/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ...newProduct, price: parseFloat(newProduct.price), stock: parseInt(newProduct.stock) })
        });

        if (!response.ok) {
          throw new Error(`Failed to add product: ${response.status}`);
        }
      }

      // Refresh product list
      //const productsResponse = await fetch('http://localhost:5000/api/products', {
      //  headers: { 'Authorization': `Bearer ${token}` }
      //});
      const API_URL = import.meta.env.VITE_API_URL || 'https://bill-backend-1-z17b.onrender.com/api';

      const productsResponse = await fetch(`${API_URL}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (productsResponse.ok) {
        const data = await productsResponse.json();
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error('Products data is not an array:', data);
          setProducts([]);
        }
      } else {
        console.error('Failed to fetch products after add/update:', productsResponse.status);
      }

      setNewProduct({ name: '', category: '', price: '', stock: '' });
      setShowAddForm(false);
      setIsEditing(false);
      setEditingId(null);
    } catch (error) {
      console.error('Error in handleAddProduct:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleEditProduct = (product) => {
    setNewProduct({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString()
    });
    setEditingId(product._id);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        //const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        const response = await fetch(`https://bill-backend-1-z17b.onrender.com/api/products/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error(`Failed to delete product: ${response.status}`);
        }

        // Refresh product list
        //const productsResponse = await fetch('http://localhost:5000/api/products', {
        const API_URL = 'https://bill-backend-1-z17b.onrender.com/api';
        const productsResponse = await fetch(`${API_URL}/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (productsResponse.ok) {
          const data = await productsResponse.json();
          if (Array.isArray(data)) {
            setProducts(data);
          } else {
            console.error('Products data is not an array:', data);
            setProducts([]);
          }
        } else {
          console.error('Failed to fetch products after delete:', productsResponse.status);
        }
      } catch (error) {
        console.error('Error in handleDeleteProduct:', error);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleCancel = () => {
    setNewProduct({ name: '', category: '', price: '', stock: '' });
    setShowAddForm(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory.toLowerCase() === 'all' ||
                           product.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="products-container">
      <header className="products-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBack}>
            ← Back to Dashboard
          </button>
          <h1>Products Management</h1>
        </div>
        <button className="add-button" onClick={() => setShowAddForm(true)}>
          Add New Product
        </button>
      </header>

      <div className="products-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="category-filter">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(category => (
              <option key={category} value={category.toLowerCase()}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="modal-overlay">
          <div className="add-product-form">
            <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={handleAddProduct}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.slice(1).map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Stock</label>
                <input
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                  required
                />
              </div>

              <div className="form-buttons">
                <button type="submit">{isEditing ? 'Update Product' : 'Add Product'}</button>
                <button type="button" onClick={handleCancel}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="products-grid">
        <div className="products-table">
          <table>
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
              {filteredProducts.map(product => (
                <tr key={product._id}>
                  <td>{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>{product.stock}</td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={() => handleEditProduct(product)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteProduct(product._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Products;