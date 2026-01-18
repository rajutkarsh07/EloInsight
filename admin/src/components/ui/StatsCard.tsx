import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  className,
}: StatsCardProps) {
  const trendColors = {
    up: 'text-success',
    down: 'text-danger',
    neutral: 'text-noir-400',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn('glass-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-noir-400">{title}</p>
          <p className="text-3xl font-display font-bold text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 mt-2 text-sm', trend && trendColors[trend])}>
              <TrendIcon size={16} />
              <span>
                {change > 0 ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-noir-500 ml-1">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="p-3 bg-accent/10 rounded-xl text-accent">
          {icon}
        </div>
      </div>
    </div>
  );
}

