import { useState, useEffect } from 'react';
import {
    TrendingUp,
    Gamepad2,
    Activity,
    Trophy,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';

interface UserStats {
    userId: string;
    totalGames: number;
    winRate: number;
    averageAccuracy: number;
    recentGames: number;
}

const Dashboard = () => {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiClient.get<UserStats>('/users/stats');
                setStats(data);
            } catch (err) {
                setError('Failed to load statistics');
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const StatCard = ({
        title,
        value,
        icon,
        colorClass,
        loading: isLoading,
    }: {
        title: string;
        value: string | number;
        icon: React.ReactNode;
        colorClass: string;
        loading?: boolean;
    }) => (
        <div className="bg-card text-card-foreground rounded-xl border shadow-card p-6 card-hover">
            <div className="flex items-center gap-4 mb-4">
                <div className={cn("p-2 rounded-lg", colorClass)}>
                    {icon}
                </div>
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    {title}
                </h3>
            </div>
            {isLoading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : (
                <div className="text-3xl font-bold tracking-tight">
                    {value}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back! Here's an overview of your chess performance.
                </p>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                <StatCard
                    title="Total Games"
                    value={stats?.totalGames ?? 0}
                    icon={<Gamepad2 size={24} className="text-blue-500" />}
                    colorClass="bg-blue-500/10 text-blue-500"
                    loading={loading}
                />
                <StatCard
                    title="Win Rate"
                    value={`${stats?.winRate ?? 0}%`}
                    icon={<Trophy size={24} className="text-yellow-500" />}
                    colorClass="bg-yellow-500/10 text-yellow-500"
                    loading={loading}
                />
                <StatCard
                    title="Avg Accuracy"
                    value={`${stats?.averageAccuracy ?? 0}%`}
                    icon={<Activity size={24} className="text-green-500" />}
                    colorClass="bg-green-500/10 text-green-500"
                    loading={loading}
                />
                <StatCard
                    title="Recent Games"
                    value={stats?.recentGames ?? 0}
                    icon={<TrendingUp size={24} className="text-orange-500" />}
                    colorClass="bg-orange-500/10 text-orange-500"
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <div className="md:col-span-2 bg-card rounded-xl border shadow-card p-6">
                    <h3 className="text-lg font-semibold mb-6">Rating Progression</h3>
                    <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
                        <p className="text-muted-foreground">Chart will be displayed here</p>
                    </div>
                </div>

                <div className="bg-card rounded-xl border shadow-card p-6">
                    <h3 className="text-lg font-semibold mb-6">Recent Activity</h3>
                    <div className="space-y-6">
                        {[1, 2, 3, 4, 5].map((item) => (
                            <div key={item} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Game analyzed #{item}</span>
                                    <span className="text-muted-foreground">Just now</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-full animate-float" style={{ animationDuration: '3s' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
