'use client';
import React from 'react';
import Link from 'next/link';
import {Heart, ListMusic } from 'lucide-react';
import { Menu } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import MiniPlayer from './MiniPlayer';
import './BottomBar.css';

const BottomBar = () => {
  const { t } = useI18n();
  return (
    <div className="bottom-bar">
      <div className="bottom-bar-container">
        <div className="bottom-navigation">
          <Link href="/home" className="menu-btn">
            <Menu size={22} />     
          </Link>
          <Link href="/favorites" className="nav-item">
            <Heart size={22} />
            <span>{t('nav.favorites')}</span>
          </Link>
          <Link href="/playlist" className="nav-item">
            <ListMusic size={22} />
            <span>{t('nav.playlist')}</span>
          </Link>
        </div>
        <div className="bottom-player">
          <MiniPlayer />
        </div>
      </div>
    </div>
  );
};

export default BottomBar;
