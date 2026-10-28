// frontend/src/components/common/Card.jsx
import React from 'react';

export const Card = ({ children, title, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
    {children}
  </div>
);
