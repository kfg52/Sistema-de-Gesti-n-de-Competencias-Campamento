import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'

interface ComingSoonProps {
  title: string
  description: string
  icon?: string
  phase?: string
  actionLabel?: string
  actionTo?: string
}

/** Página genérica para funcionalidades de fases posteriores. */
export function ComingSoon({
  title,
  description,
  icon = 'construction',
  phase,
  actionLabel,
  actionTo,
}: ComingSoonProps) {
  return (
    <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md pt-space-sm">
      <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-md flex flex-col gap-space-xs shadow-sm">
        {phase ? (
          <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-label-badge text-label-badge uppercase tracking-wider font-extrabold">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            {phase}
          </span>
        ) : null}
        <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface font-extrabold tracking-tight">
          {title}
        </h1>
      </div>

      <EmptyState
        icon={icon}
        title="Disponible próximamente"
        description={description}
        action={
          actionLabel && actionTo ? (
            <Link
              to={actionTo}
              className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold"
            >
              {actionLabel}
            </Link>
          ) : undefined
        }
      />
    </div>
  )
}