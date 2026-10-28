// frontend/src/components/layout/Navbar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mic, PenLine, Headphones, BookOpen, BarChart3 } from 'lucide-react';

const navItems = [
  { path: '/speaking', label: 'Speaking', icon: Mic },
  { path: '/writing', label: 'Writing', icon: PenLine },
  { path: '/listening', label: 'Listening', icon: Headphones },
  { path: '/reading', label: 'Reading', icon: BookOpen },
];

export const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">IELTS AI</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === path
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};