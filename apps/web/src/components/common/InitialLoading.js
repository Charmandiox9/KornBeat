'use client';
import React, { useContext } from 'react';
import { useI18n } from '@/context/I18nContext';
import './InitialLoading.css';

const InitialLoading = () => {
  const { t } = useI18n();
  return (
    <div className="loading-screen">
      <div className="spinner-large"></div>
      <p>{t('auth.initialLoading')}</p>
    </div>
  );
};

export default InitialLoading;
