// frontend/src/components/common/ErrorMessage.jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export const ErrorMessage = ({ message, onRetry }) => (
  <div className="rounded-2xl shadow-sm border border-gray-100 p-6 border-l-4 border-l-red-500 bg-red-50">
    <div className="flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-red-800 font-medium">{message}</p>
        {onRetry && (
          <Button variant="danger" size="sm" onClick={onRetry} className="mt-3">
            Try Again
          </Button>
        )}
      </div>
    </div>
  </div>
);