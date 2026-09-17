import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[55] bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-gutter"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-xl p-space-lg w-full max-w-sm flex flex-col shadow-xl max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-space-md">
            {title}
          </h3>
        ) : null}
        {children}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

/**
 * Diálogo de confirmación de resultados/operaciones sensibles.
 * Uso proyectado en registro de resultados (doc §21).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">{message}</p>
      <div className="flex gap-space-sm">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-lg bg-surface-container-high text-on-surface font-label-lg text-label-lg font-bold transition-all active:scale-[0.98]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`flex-1 h-11 rounded-lg font-label-lg text-label-lg font-bold text-on-primary transition-all active:scale-[0.98] ${
            danger ? 'bg-error' : 'bg-primary hover:bg-primary-dark'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}