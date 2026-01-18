import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Eye, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusBadge, PlatformBadge } from '../components/ui/Badge';
import { gamesApi } from '../services/api';
import type { Game } from '../types';
import { formatDate, truncate } from '../lib/utils';

// Helper to safely format decimal values (Prisma returns Decimal as string)
const formatDecimal = (value: number | string | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '-' : num.toFixed(decimals);
};

export function Games() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    platform: '',
    analysisStatus: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['games', page, filters],
    queryFn: () => gamesApi.getAll({
      page,
      limit: 10,
      platform: filters.platform || undefined,
      analysisStatus: filters.analysisStatus || undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: gamesApi.delete,
    onSuccess: () => {
      toast.success('Game deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['games'] });
      setShowDeleteDialog(false);
      setSelectedGame(null);
    },
    onError: () => {
      toast.error('Failed to delete game');
    },
  });

  const requeueMutation = useMutation({
    mutationFn: gamesApi.requeueAnalysis,
    onSuccess: () => {
      toast.success('Analysis requeued successfully');
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
    onError: () => {
      toast.error('Failed to requeue analysis');
    },
  });

  const getResultDisplay = (result: string) => {
    switch (result) {
      case 'WHITE_WIN': return { label: '1-0', color: 'text-white' };
      case 'BLACK_WIN': return { label: '0-1', color: 'text-noir-100' };
      case 'DRAW': return { label: '½-½', color: 'text-noir-400' };
      default: return { label: '*', color: 'text-noir-500' };
    }
  };

  const columns: ColumnDef<Game>[] = [
    {
      accessorKey: 'players',
      header: 'Players',
      cell: ({ row }) => (
        <div className="min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="text-white">♔</span>
            <span className="text-noir-100">{row.original.whitePlayer}</span>
            {row.original.whiteRating && (
              <span className="text-xs text-noir-500">({row.original.whiteRating})</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-noir-600">♚</span>
            <span className="text-noir-300">{row.original.blackPlayer}</span>
            {row.original.blackRating && (
              <span className="text-xs text-noir-500">({row.original.blackRating})</span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'result',
      header: 'Result',
      cell: ({ row }) => {
        const result = getResultDisplay(row.original.result);
        return (
          <span className={`font-mono font-bold ${result.color}`}>
            {result.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'platform',
      header: 'Platform',
      cell: ({ row }) => <PlatformBadge platform={row.original.platform} />,
    },
    {
      accessorKey: 'timeClass',
      header: 'Time Class',
      cell: ({ row }) => (
        <span className="text-noir-300 capitalize text-sm">
          {row.original.timeClass?.toLowerCase() || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'openingName',
      header: 'Opening',
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <span className="text-noir-300 text-sm" title={row.original.openingName || undefined}>
            {row.original.openingEco && (
              <span className="text-accent mr-1">{row.original.openingEco}</span>
            )}
            {truncate(row.original.openingName || 'Unknown', 25)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'analysisStatus',
      header: 'Analysis',
      cell: ({ row }) => <StatusBadge status={row.original.analysisStatus} />,
    },
    {
      accessorKey: 'playedAt',
      header: 'Played',
      cell: ({ row }) => (
        <span className="text-noir-400 text-sm">{formatDate(row.original.playedAt)}</span>
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
                    setSelectedGame(row.original);
                    setShowViewModal(true);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-noir-200 hover:bg-noir-700 flex items-center gap-2"
                >
                  <Eye size={16} /> View Details
                </button>
                {row.original.analysisStatus !== 'PROCESSING' && (
                  <button
                    onClick={() => {
                      requeueMutation.mutate(row.original.id);
                      setDropdownOpen(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-noir-200 hover:bg-noir-700 flex items-center gap-2"
                  >
                    <RefreshCw size={16} /> Requeue Analysis
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedGame(row.original);
                    setShowDeleteDialog(true);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete Game
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
      <Header title="Games" subtitle="Manage chess games" />
      
      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={filters.platform}
            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
            className="input w-40"
          >
            <option value="">All Platforms</option>
            <option value="CHESS_COM">Chess.com</option>
            <option value="LICHESS">Lichess</option>
            <option value="MANUAL">Manual</option>
          </select>
          <select
            value={filters.analysisStatus}
            onChange={(e) => setFilters({ ...filters, analysisStatus: e.target.value })}
            className="input w-40"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="QUEUED">Queued</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
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
          setSelectedGame(null);
        }}
        title="Game Details"
        size="xl"
      >
        {selectedGame && (
          <div className="space-y-6">
            {/* Players Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-noir-800/50 rounded-lg p-4">
                <p className="text-xs text-noir-500 mb-1">White</p>
                <p className="text-lg font-medium text-white">{selectedGame.whitePlayer}</p>
                {selectedGame.whiteRating && (
                  <p className="text-sm text-noir-400">Rating: {selectedGame.whiteRating}</p>
                )}
              </div>
              <div className="bg-noir-800/50 rounded-lg p-4">
                <p className="text-xs text-noir-500 mb-1">Black</p>
                <p className="text-lg font-medium text-noir-100">{selectedGame.blackPlayer}</p>
                {selectedGame.blackRating && (
                  <p className="text-sm text-noir-400">Rating: {selectedGame.blackRating}</p>
                )}
              </div>
            </div>

            {/* Game Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-noir-500 mb-1">Result</p>
                <p className="text-lg font-mono font-bold">{getResultDisplay(selectedGame.result).label}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500 mb-1">Time Control</p>
                <p className="text-noir-200">{selectedGame.timeControl || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500 mb-1">Time Class</p>
                <p className="text-noir-200 capitalize">{selectedGame.timeClass?.toLowerCase() || '-'}</p>
              </div>
            </div>

            {/* Opening */}
            <div>
              <p className="text-xs text-noir-500 mb-1">Opening</p>
              <p className="text-noir-200">
                {selectedGame.openingEco && (
                  <span className="text-accent mr-2">{selectedGame.openingEco}</span>
                )}
                {selectedGame.openingName || 'Unknown'}
              </p>
            </div>

            {/* PGN */}
            <div>
              <p className="text-xs text-noir-500 mb-2">PGN</p>
              <div className="bg-noir-950 rounded-lg p-4 font-mono text-sm text-noir-300 max-h-48 overflow-y-auto scrollbar-thin">
                {selectedGame.pgn}
              </div>
            </div>

            {/* Analysis Info */}
            {selectedGame.analysis && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-xs text-noir-500 mb-1">White Accuracy</p>
                  <p className="text-2xl font-bold text-white">
                    {formatDecimal(selectedGame.analysis.accuracyWhite)}%
                  </p>
                </div>
                <div className="bg-noir-700/30 rounded-lg p-4">
                  <p className="text-xs text-noir-500 mb-1">Black Accuracy</p>
                  <p className="text-2xl font-bold text-noir-100">
                    {formatDecimal(selectedGame.analysis.accuracyBlack)}%
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-noir-500">Platform</p>
                <PlatformBadge platform={selectedGame.platform} />
              </div>
              <div>
                <p className="text-xs text-noir-500">External ID</p>
                <p className="text-noir-400 font-mono">{selectedGame.externalId || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500">Played At</p>
                <p className="text-noir-400">{formatDate(selectedGame.playedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500">Analysis Status</p>
                <StatusBadge status={selectedGame.analysisStatus} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedGame(null);
        }}
        onConfirm={() => {
          if (selectedGame) {
            deleteMutation.mutate(selectedGame.id);
          }
        }}
        title="Delete Game"
        message="Are you sure you want to delete this game? This will also remove all associated analysis data."
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

