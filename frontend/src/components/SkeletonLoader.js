import React from 'react';
import '../styles/SkeletonLoader.css';

const SkeletonLoader = ({ count = 5 }) => {
  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-song-card">
          <div className="skeleton-cover"></div>
          <div className="skeleton-info">
            <div className="skeleton-title"></div>
            <div className="skeleton-artist"></div>
          </div>
          <div className="skeleton-duration"></div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
