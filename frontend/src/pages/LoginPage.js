import React, { useContext } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import Login from '../components/Login';

const LoginPage = () => {
  const { user } = useContext(AuthContext);
  
  if (user) {
    return <Navigate to="/principal" replace />;
  }

  return (
    <div className="login-wrapper">
      <Login />
    </div>
  );
};

export default LoginPage;