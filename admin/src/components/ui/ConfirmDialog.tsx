import { AlertTriangle, Trash2, XCircle } from 'lucide-react';
import { Modal } from './Modal';
import { cn } from '../../lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const icons = {
    danger: <Trash2 className="text-danger" size={24} />,
    warning: <AlertTriangle className="text-warning" size={24} />,
    info: <XCircle className="text-info" size={24} />,
  };

  const buttonClasses = {
    danger: 'bg-danger hover:bg-danger/80',
    warning: 'bg-warning hover:bg-warning/80 text-noir-900',
    info: 'bg-info hover:bg-info/80',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center py-4">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-4',
          variant === 'danger' && 'bg-danger/10',
          variant === 'warning' && 'bg-warning/10',
          variant === 'info' && 'bg-info/10'
        )}>
          {icons[variant]}
        </div>
        <p className="text-noir-300">{message}</p>
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={onClose}
          disabled={loading}
          className="btn-secondary flex-1"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn('btn flex-1 text-white', buttonClasses[variant])}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </Modal>
  );
}

