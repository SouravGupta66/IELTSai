// frontend/src/components/common/Badge.jsx
import React from 'react';

const styles = {
  topic: 'bg-indigo-50 text-indigo-700',
  band: 'bg-amber-50 text-amber-700',
  success: 'bg-green-50 text-green-700',
  error: 'bg-red-50 text-red-700',
};

export const Badge = ({ children, type = 'topic' }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[type] || styles.topic}`}>
    {children}
  </span>
);