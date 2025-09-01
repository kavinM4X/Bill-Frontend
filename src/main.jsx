import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RootLayout from './js/RootLayout';
import Welcome from './pages/welcome';
import Dashboard from './pages/dashboard';
import Products from './pages/products';
import Invoices from './pages/invoices';
import Expenses from './pages/expenses';
import Reports from './pages/reports';
import PurchaseOrders from './pages/purchase_orders';
import SalesOrders from './pages/sales_orders';
import Login from './pages/login';
import Admin from './admin';
import Register from './pages/register';
import './css/styles.css';

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <Welcome />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/admin",
        element: <Admin />,
      },
      {
        path: "/products",
        element: <Products />,
      },
      {
        path: "/invoices",
        element: <Invoices />,
      },
      {
        path: "/expenses",
        element: <Expenses />,
      },
      {
        path: "/reports",
        element: <Reports />,
      },
      {
        path: "/purchase-orders",
        element: <PurchaseOrders />,
      },
      {
        path: "/sales-orders",
        element: <SalesOrders />,
      },
    ]
  }
], {
  future: {
    v7_normalizeFormMethod: true,
    v7_prependBasename: true
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
