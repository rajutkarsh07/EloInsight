import { cn } from '../../lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span className={cn(variantClasses[variant], className)}>
      {children}
    </span>
  );
}

// Preset badges for common status types
export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; variant: BadgeVariant }> = {
    // Job status
    QUEUED: { label: 'Queued', variant: 'neutral' },
    RUNNING: { label: 'Running', variant: 'info' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    FAILED: { label: 'Failed', variant: 'danger' },
    CANCELLED: { label: 'Cancelled', variant: 'warning' },
    // Analysis status
    PENDING: { label: 'Pending', variant: 'neutral' },
    PROCESSING: { label: 'Processing', variant: 'info' },
    // Boolean status
    true: { label: 'Active', variant: 'success' },
    false: { label: 'Inactive', variant: 'danger' },
  };

  const config = statusMap[status] || { label: status, variant: 'neutral' as BadgeVariant };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PlatformBadge({ platform }: { platform: string }) {
  const platformMap: Record<string, { label: string; color: string }> = {
    CHESS_COM: { label: 'Chess.com', color: 'bg-green-500/10 text-green-400' },
    LICHESS: { label: 'Lichess', color: 'bg-purple-500/10 text-purple-400' },
    GOOGLE: { label: 'Google', color: 'bg-blue-500/10 text-blue-400' },
    MANUAL: { label: 'Manual', color: 'bg-noir-600/50 text-noir-300' },
  };

  const config = platformMap[platform] || { label: platform, color: 'bg-noir-600/50 text-noir-300' };

  return (
    <span className={cn('badge', config.color)}>
      {config.label}
    </span>
  );
}

