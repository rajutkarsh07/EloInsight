import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { analysisApi } from '../services/api';
import type { Analysis as AnalysisType } from '../types';
import { formatDate } from '../lib/utils';

export function Analysis() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisType | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['analysis', page],
    queryFn: () => analysisApi.getAll({ page, limit: 10 }),
  });

  const deleteMutation = useMutation({
    mutationFn: analysisApi.delete,
    onSuccess: () => {
      toast.success('Analysis deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['analysis'] });
      setShowDeleteDialog(false);
      setSelectedAnalysis(null);
    },
    onError: () => {
      toast.error('Failed to delete analysis');
    },
  });

  const getAccuracyColor = (accuracy: number | null) => {
    if (accuracy === null) return 'text-noir-500';
    if (accuracy >= 90) return 'text-success';
    if (accuracy >= 70) return 'text-warning';
    return 'text-danger';
  };

  const columns: ColumnDef<AnalysisType>[] = [
    {
      accessorKey: 'id',
      header: 'Analysis ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-noir-400">
          {row.original.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      accessorKey: 'gameId',
      header: 'Game ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-noir-400">
          {row.original.gameId.slice(0, 8)}...
        </span>
      ),
    },
    {
      accessorKey: 'accuracy',
      header: 'Accuracy (W/B)',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className={`font-mono ${getAccuracyColor(row.original.accuracyWhite)}`}>
            {row.original.accuracyWhite?.toFixed(1) || '-'}%
          </span>
          <span className="text-noir-600">/</span>
          <span className={`font-mono ${getAccuracyColor(row.original.accuracyBlack)}`}>
            {row.original.accuracyBlack?.toFixed(1) || '-'}%
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'blunders',
      header: 'Blunders (W/B)',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white">{row.original.blundersWhite}</span>
          <span className="text-noir-600">/</span>
          <span className="text-noir-300">{row.original.blundersBlack}</span>
        </div>
      ),
    },
    {
      accessorKey: 'mistakes',
      header: 'Mistakes (W/B)',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white">{row.original.mistakesWhite}</span>
          <span className="text-noir-600">/</span>
          <span className="text-noir-300">{row.original.mistakesBlack}</span>
        </div>
      ),
    },
    {
      accessorKey: 'analysisDepth',
      header: 'Depth',
      cell: ({ row }) => (
        <span className="text-noir-300">{row.original.analysisDepth}</span>
      ),
    },
    {
      accessorKey: 'analyzedAt',
      header: 'Analyzed',
      cell: ({ row }) => (
        <span className="text-noir-400 text-sm">{formatDate(row.original.analyzedAt)}</span>
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
                    setSelectedAnalysis(row.original);
                    setShowViewModal(true);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-noir-200 hover:bg-noir-700 flex items-center gap-2"
                >
                  <Eye size={16} /> View Details
                </button>
                <button
                  onClick={() => {
                    setSelectedAnalysis(row.original);
                    setShowDeleteDialog(true);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete
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
      <Header title="Analysis" subtitle="View and manage game analyses" />
      
      <div className="p-6">
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
          setSelectedAnalysis(null);
        }}
        title="Analysis Details"
        size="lg"
      >
        {selectedAnalysis && (
          <div className="space-y-6">
            {/* Accuracy Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-6 text-center">
                <p className="text-sm text-noir-500 mb-2">White Accuracy</p>
                <p className={`text-4xl font-bold ${getAccuracyColor(selectedAnalysis.accuracyWhite)}`}>
                  {selectedAnalysis.accuracyWhite?.toFixed(1) || '-'}%
                </p>
                {selectedAnalysis.performanceRatingWhite && (
                  <p className="text-sm text-noir-400 mt-2">
                    Performance: {selectedAnalysis.performanceRatingWhite}
                  </p>
                )}
              </div>
              <div className="bg-noir-700/30 rounded-xl p-6 text-center">
                <p className="text-sm text-noir-500 mb-2">Black Accuracy</p>
                <p className={`text-4xl font-bold ${getAccuracyColor(selectedAnalysis.accuracyBlack)}`}>
                  {selectedAnalysis.accuracyBlack?.toFixed(1) || '-'}%
                </p>
                {selectedAnalysis.performanceRatingBlack && (
                  <p className="text-sm text-noir-400 mt-2">
                    Performance: {selectedAnalysis.performanceRatingBlack}
                  </p>
                )}
              </div>
            </div>

            {/* Move Classifications */}
            <div>
              <h4 className="text-sm font-medium text-noir-400 mb-3">Move Classifications</h4>
              <div className="grid grid-cols-2 gap-3">
                {/* White */}
                <div className="bg-noir-800/50 rounded-lg p-4">
                  <p className="text-xs text-noir-500 mb-3">White</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">✨ Brilliant</span>
                      <span>{selectedAnalysis.brilliantMovesWhite}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-success">✓ Good</span>
                      <span>{selectedAnalysis.goodMovesWhite}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">📖 Book</span>
                      <span>{selectedAnalysis.bookMovesWhite}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warning">?! Inaccuracy</span>
                      <span>{selectedAnalysis.inaccuraciesWhite}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-400">? Mistake</span>
                      <span>{selectedAnalysis.mistakesWhite}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-danger">?? Blunder</span>
                      <span>{selectedAnalysis.blundersWhite}</span>
                    </div>
                  </div>
                </div>
                {/* Black */}
                <div className="bg-noir-800/50 rounded-lg p-4">
                  <p className="text-xs text-noir-500 mb-3">Black</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">✨ Brilliant</span>
                      <span>{selectedAnalysis.brilliantMovesBlack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-success">✓ Good</span>
                      <span>{selectedAnalysis.goodMovesBlack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">📖 Book</span>
                      <span>{selectedAnalysis.bookMovesBlack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warning">?! Inaccuracy</span>
                      <span>{selectedAnalysis.inaccuraciesBlack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-400">? Mistake</span>
                      <span>{selectedAnalysis.mistakesBlack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-danger">?? Blunder</span>
                      <span>{selectedAnalysis.blundersBlack}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ACPL */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-noir-800/50 rounded-lg p-4">
                <p className="text-xs text-noir-500 mb-1">White ACPL</p>
                <p className="text-xl font-bold text-white">
                  {selectedAnalysis.acplWhite?.toFixed(2) || '-'}
                </p>
              </div>
              <div className="bg-noir-800/50 rounded-lg p-4">
                <p className="text-xs text-noir-500 mb-1">Black ACPL</p>
                <p className="text-xl font-bold text-noir-200">
                  {selectedAnalysis.acplBlack?.toFixed(2) || '-'}
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-noir-500">Depth</p>
                <p className="text-noir-300">{selectedAnalysis.analysisDepth}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500">Engine Version</p>
                <p className="text-noir-300">{selectedAnalysis.engineVersion || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-noir-500">Total Positions</p>
                <p className="text-noir-300">{selectedAnalysis.totalPositions || '-'}</p>
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
          setSelectedAnalysis(null);
        }}
        onConfirm={() => {
          if (selectedAnalysis) {
            deleteMutation.mutate(selectedAnalysis.id);
          }
        }}
        title="Delete Analysis"
        message="Are you sure you want to delete this analysis? The game will be marked as pending for re-analysis."
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

