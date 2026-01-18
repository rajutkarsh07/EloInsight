import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, XCircle, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusBadge } from '../components/ui/Badge';
import { analysisJobsApi } from '../services/api';
import type { AnalysisJob } from '../types';
import { formatDate, formatRelativeTime } from '../lib/utils';

export function AnalysisJobs() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState<AnalysisJob | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['analysis-jobs', page, statusFilter],
    queryFn: () => analysisJobsApi.getAll({
      page,
      limit: 10,
      status: statusFilter || undefined,
    }),
  });

  const cancelMutation = useMutation({
    mutationFn: analysisJobsApi.cancel,
    onSuccess: () => {
      toast.success('Job cancelled');
      queryClient.invalidateQueries({ queryKey: ['analysis-jobs'] });
      setShowCancelDialog(false);
      setSelectedJob(null);
    },
    onError: () => {
      toast.error('Failed to cancel job');
    },
  });

  const retryMutation = useMutation({
    mutationFn: analysisJobsApi.retry,
    onSuccess: () => {
      toast.success('Job requeued');
      queryClient.invalidateQueries({ queryKey: ['analysis-jobs'] });
    },
    onError: () => {
      toast.error('Failed to retry job');
    },
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: number }) =>
      analysisJobsApi.updatePriority(id, priority),
    onSuccess: () => {
      toast.success('Priority updated');
      queryClient.invalidateQueries({ queryKey: ['analysis-jobs'] });
    },
    onError: () => {
      toast.error('Failed to update priority');
    },
  });

  const columns: ColumnDef<AnalysisJob>[] = [
    {
      accessorKey: 'id',
      header: 'Job ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-noir-400">
          {row.original.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => (
        <span className="text-noir-200">
          {row.original.user?.username || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm text-noir-300 w-6 text-center">
            {row.original.priority}
          </span>
          <div className="flex flex-col">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (row.original.priority < 10) {
                  priorityMutation.mutate({
                    id: row.original.id,
                    priority: row.original.priority + 1,
                  });
                }
              }}
              disabled={row.original.priority >= 10 || row.original.status !== 'QUEUED'}
              className="p-0.5 hover:bg-noir-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowUp size={12} className="text-noir-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (row.original.priority > 1) {
                  priorityMutation.mutate({
                    id: row.original.id,
                    priority: row.original.priority - 1,
                  });
                }
              }}
              disabled={row.original.priority <= 1 || row.original.status !== 'QUEUED'}
              className="p-0.5 hover:bg-noir-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowDown size={12} className="text-noir-400" />
            </button>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'depth',
      header: 'Depth',
      cell: ({ row }) => (
        <span className="text-noir-300">{row.original.depth}</span>
      ),
    },
    {
      accessorKey: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const total = row.original.totalPositions || 0;
        const analyzed = row.original.analyzedPositions;
        const percent = total > 0 ? Math.round((analyzed / total) * 100) : 0;

        return (
          <div className="w-24">
            <div className="flex justify-between text-xs text-noir-400 mb-1">
              <span>{analyzed}</span>
              <span>{total || '?'}</span>
            </div>
            <div className="h-1.5 bg-noir-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-noir-400 text-sm">{formatRelativeTime(row.original.createdAt)}</span>
      ),
    },
    {
      accessorKey: 'errorMessage',
      header: 'Error',
      cell: ({ row }) => (
        row.original.errorMessage ? (
          <span className="text-danger text-xs truncate max-w-[150px] block" title={row.original.errorMessage}>
            {row.original.errorMessage.slice(0, 30)}...
          </span>
        ) : (
          <span className="text-noir-600">-</span>
        )
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen(dropdownOpen === row.original.id ? null : row.original.id);
            }}
            className="p-1.5 rounded-lg hover:bg-noir-700 text-noir-400 hover:text-noir-200 transition-colors"
          >
            <MoreHorizontal size={18} />
          </button>
          {dropdownOpen === row.original.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(null)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-noir-800 border border-noir-700 rounded-lg shadow-xl z-50 py-1">
                {row.original.status === 'FAILED' && (
                  <button
                    onClick={() => {
                      retryMutation.mutate(row.original.id);
                      setDropdownOpen(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-noir-200 hover:bg-noir-700 flex items-center gap-2"
                  >
                    <RotateCcw size={16} /> Retry
                  </button>
                )}
                {(row.original.status === 'QUEUED' || row.original.status === 'RUNNING') && (
                  <button
                    onClick={() => {
                      setSelectedJob(row.original);
                      setShowCancelDialog(true);
                      setDropdownOpen(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 flex items-center gap-2"
                  >
                    <XCircle size={16} /> Cancel
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-enter">
      <Header title="Analysis Jobs" subtitle="Manage game analysis queue" />
      
      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Status</option>
            <option value="QUEUED">Queued</option>
            <option value="RUNNING">Running</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'].map((status) => (
            <div key={status} className="bg-noir-900/50 border border-noir-800 rounded-lg p-4">
              <p className="text-xs text-noir-500 uppercase">{status}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {data?.data.filter(j => j.status === status).length || 0}
              </p>
            </div>
          ))}
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          totalCount={data?.meta.total}
          currentPage={page}
          onPageChange={setPage}
          pageSize={10}
        />
      </div>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => {
          setShowCancelDialog(false);
          setSelectedJob(null);
        }}
        onConfirm={() => {
          if (selectedJob) {
            cancelMutation.mutate(selectedJob.id);
          }
        }}
        title="Cancel Job"
        message="Are you sure you want to cancel this analysis job?"
        confirmText="Cancel Job"
        variant="warning"
        loading={cancelMutation.isPending}
      />
    </div>
  );
}

