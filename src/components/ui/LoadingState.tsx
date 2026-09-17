interface LoadingStateProps {
  label?: string
  rows?: number
}

/** Estado de carga con spinner + texto, o skeletons. */
export function LoadingState({ label = 'Cargando...', rows = 0 }: LoadingStateProps) {
  if (rows > 0) {
    return (
      <div className="px-gutter py-space-md flex flex-col gap-space-sm" aria-busy="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-space-md animate-pulse h-24"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="px-gutter py-space-lg flex flex-col items-center justify-center gap-space-sm text-center min-h-[120px]">
      <div className="w-9 h-9 rounded-full border-[3px] border-primary-fixed border-t-primary animate-spin" />
      <p className="font-body-md text-body-md text-on-surface-variant">{label}</p>
    </div>
  )
}