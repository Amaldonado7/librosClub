import React from 'react';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/" />;
  }

  return children;
};

// Validación de las props
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired, // Validación de children como un nodo
};

export default ProtectedRoute;
