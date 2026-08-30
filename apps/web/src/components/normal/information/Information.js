'use client';
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useI18n } from '@/context/I18nContext';
import { useReveal, staggerIn } from '@/lib/animations';
import './Information.css';

const Information = () => {
  const { t } = useI18n();
  const mainRef = useReveal();
  const sectionsRef = useRef(null);

  useEffect(() => {
    if (sectionsRef.current) {
      staggerIn(sectionsRef.current, '.info-section', { step: 120 });
    }
  }, [t]);

  return (
    <div className="information-container">
      <Link href="/" className="back-button">
        ← {t('common.back')}
      </Link>
      <div className="information-content" ref={mainRef}>
        <h1>{t('info.title')}</h1>
        <div className="info-sections" ref={sectionsRef}>
          <section className="info-section">
            <h2>{t('info.what')}</h2>
            <p>{t('info.whatDesc')}</p>
          </section>

          <section className="info-section">
            <h2>{t('info.features')}</h2>
            <ul>
              <li>{t('info.f1')}</li>
              <li>{t('info.f2')}</li>
              <li>{t('info.f3')}</li>
              <li>{t('info.f4')}</li>
            </ul>
          </section>

          <section className="info-section">
            <h2>{t('info.mission')}</h2>
            <p>{t('info.missionDesc')}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Information;
