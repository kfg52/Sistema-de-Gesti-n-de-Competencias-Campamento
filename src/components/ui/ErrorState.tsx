interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = '⚠️ No pudimos completar la operación. Intenta nuevamente.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="px-gutter py-space-lg flex flex-col items-center text-center gap-space-sm">
      <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-error">
        <span className="material-symbols-outlined text-[26px]">error_outline</span>
      </div>
      <p className="font-body-md text-body-md text-on-surface font-medium max-w-xs">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-space-xs px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold shadow-sm active:scale-95 transition-all"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  )
}