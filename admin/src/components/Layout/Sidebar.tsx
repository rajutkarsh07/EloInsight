import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  BarChart3,
  Link,
  RefreshCw,
  Cpu,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Games', href: '/games', icon: Gamepad2 },
  { name: 'Analysis', href: '/analysis', icon: BarChart3 },
  { name: 'Linked Accounts', href: '/linked-accounts', icon: Link },
  { name: 'Sync Jobs', href: '/sync-jobs', icon: RefreshCw },
  { name: 'Analysis Jobs', href: '/analysis-jobs', icon: Cpu },
];

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  };

  return (
    <div
      className={cn(
        'h-screen flex flex-col bg-noir-900 border-r border-noir-800 transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-noir-800">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-accent to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="font-display font-semibold text-lg text-white">
              EloInsight
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-accent to-orange-500 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-lg">E</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-noir-800 text-noir-400 hover:text-noir-200 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Admin badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-noir-800">
          <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-accent">ADMIN PANEL</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200',
                isActive
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'text-noir-400 hover:text-noir-100 hover:bg-noir-800/50',
                collapsed && 'justify-center'
              )}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="px-3 py-4 border-t border-noir-800 space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200',
                isActive
                  ? 'bg-noir-800 text-noir-100'
                  : 'text-noir-400 hover:text-noir-100 hover:bg-noir-800/50',
                collapsed && 'justify-center'
              )}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
        
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200',
            'text-danger/80 hover:text-danger hover:bg-danger/10',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

