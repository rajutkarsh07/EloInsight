import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Eye, Edit, Trash2, RotateCcw, Plus, Mail, ShieldCheck, ShieldX } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusBadge } from '../components/ui/Badge';
import { usersApi } from '../services/api';
import type { User } from '../types';
import { formatDate, cn } from '../lib/utils';

export function Users() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersApi.getAll({ page, limit: 10, search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeleteDialog(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Failed to delete user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => 
      usersApi.update(id, data),
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditModal(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'username',
      header: 'Username',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-orange-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {row.original.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-noir-100">{row.original.username}</p>
            <p className="text-xs text-noir-500">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'emailVerified',
      header: 'Email Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.emailVerified ? (
            <>
              <ShieldCheck className="text-success" size={16} />
              <span className="text-success text-sm">Verified</span>
            </>
          ) : (
            <>
              <ShieldX className="text-warning" size={16} />
              <span className="text-warning text-sm">Unverified</span>
            </>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.isActive.toString()} />
      ),
    },
    {
      accessorKey: '_count.games',
      header: 'Games',
      cell: ({ row }) => (
        <span className="text-noir-300">{row.original._count?.games || 0}</span>
      ),
    },
    {
      accessorKey: '_count.linkedAccounts',
      header: 'Linked Accounts',
      cell: ({ row }) => (
        <span className="text-noir-300">{row.original._count?.linkedAccounts || 0}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-noir-400 text-sm">{formatDate(row.original.createdAt)}</span>
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
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setDropdownOpen(null)} 
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-noir-800 border border-noir-700 rounded-lg shadow-xl z-50 py-1">
                <button
                  onClick={() => {
                    setSelectedUser(row.original);
                    setShowEditModal(true);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-noir-200 hover:bg-noir-700 flex items-center gap-2"
                >
                  <Edit size={16} /> Edit User
                </button>
                <button
                  onClick={() => {
                    updateMutation.mutate({
                      id: row.original.id,
                      data: { isActive: !row.original.isActive },
                    });
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-noir-200 hover:bg-noir-700 flex items-center gap-2"
                >
                  <RotateCcw size={16} /> 
                  {row.original.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => {
                    setSelectedUser(row.original);
                    setShowDeleteDialog(true);
                    setDropdownOpen(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete User
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
      <Header title="Users" subtitle="Manage user accounts" />
      
      <div className="p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-sm"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus size={18} /> Add User
          </button>
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

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        title="Edit User"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowEditModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedUser) {
                  updateMutation.mutate({
                    id: selectedUser.id,
                    data: selectedUser,
                  });
                }
              }}
              className="btn-primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                value={selectedUser.username}
                onChange={(e) =>
                  setSelectedUser({ ...selectedUser, username: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={selectedUser.email}
                onChange={(e) =>
                  setSelectedUser({ ...selectedUser, email: e.target.value })
                }
                className="input"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUser.emailVerified}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, emailVerified: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-noir-600 bg-noir-800 text-accent focus:ring-accent"
                />
                <span className="text-sm text-noir-200">Email Verified</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUser.isActive}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-noir-600 bg-noir-800 text-accent focus:ring-accent"
                />
                <span className="text-sm text-noir-200">Active</span>
              </label>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create User"
        size="lg"
      >
        <CreateUserForm onClose={() => setShowCreateModal(false)} />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedUser(null);
        }}
        onConfirm={() => {
          if (selectedUser) {
            deleteMutation.mutate(selectedUser.id);
          }
        }}
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.username}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    emailVerified: false,
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to create user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Username</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="input"
          required
        />
      </div>
      <div>
        <label className="label">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="input"
          required
        />
      </div>
      <div>
        <label className="label">Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="input"
          required
          minLength={8}
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.emailVerified}
          onChange={(e) => setFormData({ ...formData, emailVerified: e.target.checked })}
          className="w-4 h-4 rounded border-noir-600 bg-noir-800 text-accent focus:ring-accent"
        />
        <span className="text-sm text-noir-200">Mark email as verified</span>
      </label>
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

