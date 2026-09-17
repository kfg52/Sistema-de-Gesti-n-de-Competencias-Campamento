import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="px-gutter py-space-lg flex flex-col items-center text-center gap-space-sm">
      <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
        <span className="material-symbols-outlined text-[30px]">{icon}</span>
      </div>
      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">{title}</h3>
      {description ? (
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">{description}</p>
      ) : null}
      {action ? <div className="pt-space-xs w-full max-w-xs">{action}</div> : null}
    </div>
  )
}