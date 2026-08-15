'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'neutral';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'neutral',
  onConfirm,
  onCancel,
  submitting = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, submitting, onCancel]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  const isDestructive = variant === 'destructive';

  const modal = (
    <>
      {/* Everything below the global header */}
      <div
        className="fixed left-0 right-0 top-[52px] bottom-0 z-[9998] bg-black/45 backdrop-blur-[2px]"
        onClick={submitting ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Modal positioning layer */}
      <div
        className="fixed left-0 right-0 top-[52px] bottom-0 z-[9999] flex items-center justify-center px-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div
          className="pointer-events-auto w-full max-w-[500px] rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-7 shadow-2xl fade-up"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Icon + title */}
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isDestructive
                  ? 'bg-[var(--peach)] text-[var(--peach-ink)]'
                  : 'bg-[var(--mint)] text-[var(--mint-ink)]'
              }`}
            >
              {isDestructive ? (
                <AlertTriangle size={20} />
              ) : (
                <HelpCircle size={20} />
              )}
            </div>

            <div className="min-w-0 pt-1">
              <h3
                id="confirm-dialog-title"
                className="font-display text-xl font-semibold leading-tight text-[var(--ink)]"
              >
                {title}
              </h3>
            </div>
          </div>

          {/* Message */}
          <p className="mt-5 text-sm leading-6 text-[var(--ink-dim)]">
            {message}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 mt-7">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="btn-ghost px-4 py-2.5 text-sm disabled:opacity-50 cursor-pointer"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className={`px-4 py-2.5 text-sm rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer ${
                isDestructive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'btn-primary'
              }`}
            >
              {submitting ? 'Working...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}