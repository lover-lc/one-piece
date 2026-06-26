import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type AppCardProps = {
  title: string
  description: string
  to: string
  icon: React.ReactNode
  stats: { label: string; value: number | string }[]
  accentColor?: string
}

export default function AppCard({
  title,
  description,
  to,
  icon,
  stats,
  accentColor = '#2c3e50',
}: AppCardProps) {
  return (
    <Link
      to={to}
      className="block rounded-card border border-bg-hover bg-bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex size-12 items-center justify-center rounded-card text-white"
          style={{ backgroundColor: accentColor }}
        >
          {icon}
        </div>
        <ChevronRight className="size-5 shrink-0 text-text-tertiary" />
      </div>

      <h2 className="mt-4 text-lg font-medium text-text">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>

      <div className="mt-4 flex gap-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xl font-medium text-text">{stat.value}</p>
            <p className="text-xs text-text-secondary">{stat.label}</p>
          </div>
        ))}
      </div>
    </Link>
  )
}
