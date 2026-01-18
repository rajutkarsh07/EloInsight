import { useQuery } from '@tanstack/react-query';
import { Users, Gamepad2, BarChart3, Cpu, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Header } from '../components/Layout/Header';
import { StatsCard } from '../components/ui/StatsCard';
import { dashboardApi } from '../services/api';
import { formatRelativeTime } from '../lib/utils';

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: activity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: dashboardApi.getRecentActivity,
  });

  return (
    <div className="page-enter">
      <Header title="Dashboard" subtitle="Overview of your EloInsight platform" />
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Users"
            value={isLoading ? '...' : stats?.totalUsers || 0}
            icon={<Users size={24} />}
            change={12}
            changeLabel="vs last month"
            trend="up"
          />
          <StatsCard
            title="Total Games"
            value={isLoading ? '...' : stats?.totalGames || 0}
            icon={<Gamepad2 size={24} />}
            change={8}
            changeLabel="vs last month"
            trend="up"
          />
          <StatsCard
            title="Analyses Completed"
            value={isLoading ? '...' : stats?.totalAnalyses || 0}
            icon={<BarChart3 size={24} />}
            change={24}
            changeLabel="vs last month"
            trend="up"
          />
          <StatsCard
            title="Pending Jobs"
            value={isLoading ? '...' : stats?.pendingJobs || 0}
            icon={<Cpu size={24} />}
            trend="neutral"
          />
        </div>

        {/* Activity & Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Stats */}
          <div className="lg:col-span-2 glass-card">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Weekly Activity</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-noir-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <TrendingUp className="text-success" size={20} />
                  </div>
                  <span className="text-sm text-noir-400">Games This Week</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {isLoading ? '...' : stats?.gamesThisWeek || 0}
                </p>
              </div>
              <div className="bg-noir-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-info/10 rounded-lg">
                    <BarChart3 className="text-info" size={20} />
                  </div>
                  <span className="text-sm text-noir-400">Analyses This Week</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {isLoading ? '...' : stats?.analysesThisWeek || 0}
                </p>
              </div>
              <div className="bg-noir-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Users className="text-accent" size={20} />
                  </div>
                  <span className="text-sm text-noir-400">Active Users</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {isLoading ? '...' : stats?.activeUsers || 0}
                </p>
              </div>
              <div className="bg-noir-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <Clock className="text-warning" size={20} />
                  </div>
                  <span className="text-sm text-noir-400">Avg. Analysis Time</span>
                </div>
                <p className="text-2xl font-bold text-white">2.3s</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {activity?.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    item.type === 'analysis' ? 'bg-success/10' : 
                    item.type === 'user' ? 'bg-info/10' : 'bg-accent/10'
                  }`}>
                    {item.type === 'analysis' ? (
                      <CheckCircle className="text-success" size={16} />
                    ) : item.type === 'user' ? (
                      <Users className="text-info" size={16} />
                    ) : (
                      <Gamepad2 className="text-accent" size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-noir-200 truncate">{item.message}</p>
                    <p className="text-xs text-noir-500">{formatRelativeTime(item.timestamp)}</p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-noir-500">
                  <AlertCircle className="mx-auto mb-2" size={24} />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="glass-card">
          <h3 className="text-lg font-display font-semibold text-white mb-4">System Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 bg-noir-800/50 rounded-xl p-4">
              <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-medium text-noir-200">API Gateway</p>
                <p className="text-xs text-noir-500">Healthy</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-noir-800/50 rounded-xl p-4">
              <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-medium text-noir-200">Analysis Service</p>
                <p className="text-xs text-noir-500">Healthy</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-noir-800/50 rounded-xl p-4">
              <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-medium text-noir-200">Game Sync Service</p>
                <p className="text-xs text-noir-500">Healthy</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-noir-800/50 rounded-xl p-4">
              <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-medium text-noir-200">Database</p>
                <p className="text-xs text-noir-500">Connected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

