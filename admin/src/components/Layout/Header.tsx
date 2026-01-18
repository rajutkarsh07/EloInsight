import { Bell, Search, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="h-16 border-b border-noir-800 bg-noir-950/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-display font-semibold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-noir-400">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-noir-500" size={18} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-64 pl-10 pr-4 py-2 bg-noir-900 border border-noir-700 rounded-lg',
              'text-sm text-noir-100 placeholder-noir-500',
              'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
              'transition-all duration-200'
            )}
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-noir-800 text-noir-400 hover:text-noir-200 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full"></span>
        </button>

        {/* User menu */}
        <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-noir-800 transition-colors">
          <div className="w-8 h-8 bg-gradient-to-br from-accent to-orange-500 rounded-full flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <span className="text-sm font-medium text-noir-200">Admin</span>
        </button>
      </div>
    </header>
  );
}

