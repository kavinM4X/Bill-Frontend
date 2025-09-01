import React from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from './app';

const RootLayout = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

export default RootLayout; 