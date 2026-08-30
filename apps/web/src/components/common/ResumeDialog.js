'use client';
import React from 'react';
import { useI18n } from '@/context/I18nContext';
import './ResumeDialog.css';

const ResumeDialog = ({ position, onResume, onDismiss }) => {
  const { t } = useI18n();
  console.log('ResumeDialog renderizado con:', { position, hasSong: !!position?.song });
  
  if (!position || !position.song) {
    console.log('ResumeDialog: No se muestra - falta position o song');
    return null;
  }

  const { song, progress } = position;
  console.log('ResumeDialog: Mostrando diálogo para:', song.title);

  return (
    <div className="resume-dialog-overlay">
      <div className="resume-dialog">
        <div className="resume-dialog-header">
          <h3>{t('player.resumeTitle')}</h3>
        </div>
        
        <div className="resume-dialog-content">
          <div className="resume-song-info">
            {song.coverUrl && (
              <img 
                src={song.coverUrl} 
                alt={song.title} 
                className="resume-song-cover"
              />
            )}
            <div className="resume-song-details">
              <p className="resume-song-title">{song.title}</p>
              <p className="resume-song-artist">{song.artist}</p>
              <p className="resume-song-progress">{t('player.resumeProgress', { p: progress })}</p>
            </div>
          </div>

          <div className="resume-progress-bar">
            <div 
              className="resume-progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="resume-dialog-actions">
          <button 
            className="resume-btn resume-btn-dismiss"
            onClick={() => {
              console.log('🔴 Botón EMPEZAR DE NUEVO clickeado');
              onDismiss();
            }}
          >
            {t('player.restart')}
          </button>
          <button 
            className="resume-btn resume-btn-resume"
            onClick={() => {
              console.log('🟢 Botón CONTINUAR clickeado');
              onResume();
            }}
          >
            {t('player.resume')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeDialog;
