import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, LayoutDashboard, Gamepad2, LogOut, User, X, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
        { text: 'Games', icon: <Gamepad2 size={20} />, path: '/games' },
        { text: 'Analysis', icon: <BarChart3 size={20} />, path: '/analysis' },
        { text: 'Settings', icon: <SettingsIcon size={20} />, path: '/settings' },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
            {/* Mobile Header */}
            <header className="fixed top-0 left-0 right-0 h-16 border-b bg-background/80 backdrop-blur-md z-40 lg:hidden px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-xl tracking-tight">EloInsight</span>
                </div>
                {/* Theme toggle removed - Dark mode enforced */}
            </header>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 bottom-0 z-50 w-64 bg-card border-r transition-transform duration-300 lg:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-full flex flex-col">
                    <div className="h-16 flex items-center justify-between px-6 border-b">
                        <div className="flex items-center gap-2 text-primary font-extrabold text-2xl tracking-tighter">
                            <span>♟️</span>
                            <span>EloInsight</span>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 hover:bg-accent rounded-md"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setSidebarOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}
                                >
                                    {item.icon}
                                    {item.text}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t space-y-2">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                <User size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user?.username || 'User'}</p>
                                <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <LogOut size={18} />
                            Log Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen transition-all duration-300">
                <div className="container mx-auto p-4 lg:p-8 max-w-7xl animate-fade-in-up">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
