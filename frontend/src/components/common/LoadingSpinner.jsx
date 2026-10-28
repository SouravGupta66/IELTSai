// frontend/src/components/common/LoadingSpinner.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

// size="sm" is used inline inside buttons as a loading substitute for the
// label - it must render compactly, not with the full-page centered layout
// used for md/lg (e.g. a page-level "Loading..." state).
export const LoadingSpinner = ({ message, size = 'md' }) => {
  const icon = <Loader2 className={`${sizes[size] || sizes.md} animate-spin text-indigo-600`} />;

  if (size === 'sm') {
    return icon;
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      {icon}
      {message && <p className="text-gray-500 text-sm">{message}</p>}
    </div>
  );
};
