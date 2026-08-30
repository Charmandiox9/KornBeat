'use client';
import React, { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/context/authContext';
import Login from './Login';

const LoginPage = () => {
  const { user } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace('/home');
  }, [user, router]);

  if (user) {
    return null;
  }

  return (
    <div className="login-wrapper">
      <Login />
    </div>
  );
};

export default LoginPage;
