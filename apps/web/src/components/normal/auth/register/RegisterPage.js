'use client';
import React, { useContext, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/context/authContext';
import { useI18n } from '@/context/I18nContext';
import Register from './Register';

const RegisterPage = () => {
  const { user } = useContext(AuthContext);
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace('/home');
  }, [user, router]);

  if (user) {
    return null;
  }

  return (
    <div className="register-wrapper">
      <Link href="/" className="back-button">
        ← {t('common.back')}
      </Link>
      <Register />
    </div>
  );
};

export default RegisterPage;
