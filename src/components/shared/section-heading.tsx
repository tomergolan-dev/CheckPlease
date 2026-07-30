import type { LucideIcon } from 'lucide-react'
import type { DinerColorToken } from '@/lib/store/palette'
import { IconBadge } from './icon-badge'

export function SectionHeading({
  icon,
  title,
  tone,
}: {
  icon: LucideIcon
  title: string
  tone: DinerColorToken
}) {
  return (
    <h2 className="flex items-center gap-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      <IconBadge icon={icon} tone={tone} size="sm" />
      {title}
    </h2>
  )
}
