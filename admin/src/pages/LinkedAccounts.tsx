import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusBadge, PlatformBadge } from '../components/ui/Badge';
import { linkedAccountsApi } from '../services/api';
import type { LinkedAccount } from '../types';
import { formatDate, formatRelativeTime } from '../lib/utils';

export function LinkedAccounts() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<LinkedAccount | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['linked-accounts', page, platformFilter],
    queryFn: () => linkedAccountsApi.getAll({
      page,
      limit: 10,
      platform: platformFilter || undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: linkedAccountsApi.delete,
    onSuccess: () => {
      toast.success('Account unlinked successfully');
      queryClient.invalidateQueries({ queryKey: ['linked-accounts'] });
      setShowDeleteDialog(false);
      setSelectedAccount(null);
    },
    onError: () => {
      toast.error('Failed to unlink account');
    },
  });

  const toggleSyncMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      linkedAccountsApi.toggleSync(id, enabled),
    onSuccess: () => {
      toast.success('Sync status updated');
      queryClient.invalidateQueries({ queryKey: ['linked-accounts'] });
    },
    onError: () => {
      toast.error('Failed to update sync status');
    },
  });

  const columns: ColumnDef<LinkedAccount>[] = [
    {
      accessorKey: 'platformUsername',
      header: 'Account',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.avatarUrl ? (
            <img
              src={row.original.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-noir-700 flex items-center justify-center">
              <span className="text-xs font-bold text-noir-400">
                {row.original.platformUsername.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-medium text-noir-100">{row.original.platformUsername}</p>
            {row.original.platformUserId && (
              <p className="text-xs text-noir-500 font-mono">{row.original.platformUserId}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'platform',
      header: 'Platform',
      cell: ({ row }) => <PlatformBadge platform={row.original.platform} />,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.isActive.toString()} />,
    },
    {
      accessorKey: 'syncEnabled',
      header: 'Sync',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.syncEnabled ? (
            <span className="flex items-center gap-1 text-success text-sm">
              <Power size={14} /> Enabled
            </span>
          ) : (
            <span className="flex items-center gap-1 text-noir-500 text-sm">
              <PowerOff size={14} /> Disabled
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'lastSyncAt',
      header: 'Last Sync',
      cell: ({ row }) => (
        <span className="text-noir-400 text-sm">
          {row.original.lastSyncAt ? formatRelativeTime(row.original.lastSyncAt) : 'Never'}
        </span>
      ),
    },
    {
      accessorKey: 'linkedAt',
      header: 'Linked',
      cell: ({ row }) => (
        <span className="text-noir-400 text-sm">{formatDate(row.original.linkedAt)}</span>
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
              <div className="absolute right-0 top-full mt-1 w-48 bg-noir-800 border border-noir-700 rounded-lg shadow-xl z-50 py-1">
                <button
                  onClick={() => {
                    toggleSyncMutation.mutate({
                      id: row.original.id,
                      enabled: !row.original.syncEnabled,
                    });
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-noir-200 hover:bg-noir-700 flex items-center gap-2"
                >
                  {row.original.syncEnabled ? (
                    <>
                      <PowerOff size={16} /> Disable Sync
                    </>
                  ) : (
                    <>
                      <Power size={16} /> Enable Sync
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedAccount(row.original);
                    setShowDeleteDialog(true);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 flex items-center gap-2"
                >
                  <Trash2 size={16} /> Unlink Account
                </button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-enter">
      <Header title="Linked Accounts" subtitle="Manage user platform connections" />
      
      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Platforms</option>
            <option value="CHESS_COM">Chess.com</option>
            <option value="LICHESS">Lichess</option>
            <option value="GOOGLE">Google</option>
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedAccount(null);
        }}
        onConfirm={() => {
          if (selectedAccount) {
            deleteMutation.mutate(selectedAccount.id);
          }
        }}
        title="Unlink Account"
        message={`Are you sure you want to unlink "${selectedAccount?.platformUsername}" from ${selectedAccount?.platform}? This will not delete any synced games.`}
        confirmText="Unlink"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

