import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, XCircle, RotateCcw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusBadge, PlatformBadge } from '../components/ui/Badge';
import { syncJobsApi } from '../services/api';
import type { SyncJob } from '../types';
import { formatDate, formatRelativeTime } from '../lib/utils';

export function SyncJobs() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState<SyncJob | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sync-jobs', page, statusFilter],
    queryFn: () => syncJobsApi.getAll({
      page,
      limit: 10,
      status: statusFilter || undefined,
    }),
  });

  const cancelMutation = useMutation({
    mutationFn: syncJobsApi.cancel,
    onSuccess: () => {
      toast.success('Sync job cancelled');
      queryClient.invalidateQueries({ queryKey: ['sync-jobs'] });
      setShowCancelDialog(false);
      setSelectedJob(null);
    },
    onError: () => {
      toast.error('Failed to cancel job');
    },
  });

  const retryMutation = useMutation({
    mutationFn: syncJobsApi.retry,
    onSuccess: () => {
      toast.success('Sync job requeued');
      queryClient.invalidateQueries({ queryKey: ['sync-jobs'] });
    },
    onError: () => {
      toast.error('Failed to retry job');
    },
  });

  const columns: ColumnDef<SyncJob>[] = [
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
      accessorKey: 'platform',
      header: 'Platform',
      cell: ({ row }) => (
        <PlatformBadge platform={row.original.linkedAccount?.platform || 'MANUAL'} />
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const total = row.original.totalGames || 0;
        const processed = row.original.processedGames;
        const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

        return (
          <div className="w-32">
            <div className="flex justify-between text-xs text-noir-400 mb-1">
              <span>{processed} processed</span>
              <span>{total || '?'} total</span>
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
      accessorKey: 'newGames',
      header: 'New Games',
      cell: ({ row }) => (
        <span className="text-success">{row.original.newGames}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-noir-400 text-sm">{formatRelativeTime(row.original.createdAt)}</span>
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
                <button
                  onClick={() => {
                    setSelectedJob(row.original);
                    setShowViewModal(true);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-noir-200 hover:bg-noir-700 flex items-center gap-2"
                >
                  <Eye size={16} /> View Details
                </button>
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
      <Header title="Sync Jobs" subtitle="Manage game synchronization jobs" />
      
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

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedJob(null);
        }}
        title="Sync Job Details"
        size="lg"
      >
        {selectedJob && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-noir-500">Job ID</p>
                <p className="font-mono text-sm text-noir-300">{selectedJob.id}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500">Status</p>
                <StatusBadge status={selectedJob.status} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-noir-500">User</p>
                <p className="text-noir-200">{selectedJob.user?.username || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500">Platform</p>
                <PlatformBadge platform={selectedJob.linkedAccount?.platform || 'MANUAL'} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-noir-800/50 rounded-lg p-3">
                <p className="text-xs text-noir-500">Total Games</p>
                <p className="text-xl font-bold text-white">{selectedJob.totalGames || '-'}</p>
              </div>
              <div className="bg-noir-800/50 rounded-lg p-3">
                <p className="text-xs text-noir-500">Processed</p>
                <p className="text-xl font-bold text-white">{selectedJob.processedGames}</p>
              </div>
              <div className="bg-success/10 rounded-lg p-3">
                <p className="text-xs text-success">New Games</p>
                <p className="text-xl font-bold text-success">{selectedJob.newGames}</p>
              </div>
              <div className="bg-noir-800/50 rounded-lg p-3">
                <p className="text-xs text-noir-500">Skipped</p>
                <p className="text-xl font-bold text-noir-400">{selectedJob.skippedGames}</p>
              </div>
            </div>
            {selectedJob.errorMessage && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                <p className="text-xs text-danger mb-1">Error Message</p>
                <p className="text-sm text-danger/80">{selectedJob.errorMessage}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-noir-500">Created At</p>
                <p className="text-noir-400">{formatDate(selectedJob.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500">Started At</p>
                <p className="text-noir-400">{selectedJob.startedAt ? formatDate(selectedJob.startedAt) : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500">Completed At</p>
                <p className="text-noir-400">{selectedJob.completedAt ? formatDate(selectedJob.completedAt) : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500">Retry Count</p>
                <p className="text-noir-400">{selectedJob.retryCount}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

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
        title="Cancel Sync Job"
        message="Are you sure you want to cancel this sync job?"
        confirmText="Cancel Job"
        variant="warning"
        loading={cancelMutation.isPending}
      />
    </div>
  );
}

