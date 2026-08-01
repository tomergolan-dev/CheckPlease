import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DinerColorToken } from '@/lib/store/palette'

const SIZE_CLASSES = { sm: 'size-6', md: 'size-9', lg: 'size-11' } as const
const ICON_SIZE_CLASSES = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' } as const

/**
 * A separate, much quieter palette than the diner-identity gradient — section headings and
 * empty states are supportive iconography, not a personal identity, so they stay flat and
 * muted rather than vivid. Reuses the diner color-token names purely for a stable, familiar
 * per-section tone (people=blue, dishes=amber, summary=violet), not the same color values.
 */
const SECTION_TONE_CLASSES: Record<DinerColorToken, string> = {
  blue: 'bg-[#eaf3f8] text-[#4a7d99]',
  green: 'bg-[#eef4e8] text-[#5c7a45]',
  amber: 'bg-[#faf1de] text-[#a67a1f]',
  rose: 'bg-[#f9ecea] text-[#a15850]',
  violet: 'bg-[#f0ecf7] text-[#6d5a96]',
  teal: 'bg-[#e9f4f1] text-[#3f8073]',
  orange: 'bg-[#faf0e4] text-[#a66a2f]',
  pink: 'bg-[#faedf1] text-[#a3547a]',
}

export function IconBadge({
  icon: Icon,
  tone,
  size = 'md',
  className,
  iconClassName,
}: {
  icon: LucideIcon
  tone: DinerColorToken
  size?: keyof typeof SIZE_CLASSES
  className?: string
  iconClassName?: string
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        SIZE_CLASSES[size],
        SECTION_TONE_CLASSES[tone],
        className
      )}
    >
      <Icon className={cn(ICON_SIZE_CLASSES[size], iconClassName)} />
    </span>
  )
}
