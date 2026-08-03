import { Me, PeoplesTwo } from '@icon-park/react'
import { cn } from '@/lib/utils'
import type { Diner } from '@/lib/store/types'
import { DINER_COLOR_CLASSES, initialsFromName } from './diner-display'

interface DinerAvatarProps {
  diner: Diner
  defaultPosition?: number
  className?: string
  /** The circle's diameter in px — default matches the base `size-9` (36px). Icon glyphs need
   * an explicit pixel size (IconPark sizes via a `size` prop, not CSS), unlike the plain text
   * glyph this replaced, which just inherited the container's font size. */
  size?: number
}

/** A small, friendly person/couple glyph per paying party — a single figure for `partySize`
 * 1, two figures together for anything more (exact headcount is already shown separately via
 * the party-size badge, so the glyph itself only needs to distinguish "one" from "more than
 * one"). Falls back to the previous colored-initials treatment if `partySize` is somehow not a
 * valid positive number (e.g. corrupted persisted state from an older version). */
export function DinerAvatar({ diner, defaultPosition, className, size = 36 }: DinerAvatarProps) {
  const hasValidPartySize = Number.isFinite(diner.partySize) && diner.partySize > 0
  const iconSize = Math.round(size * 0.78)
  const PersonIcon = diner.partySize >= 2 ? PeoplesTwo : Me

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full text-sm font-medium shadow-sm',
        DINER_COLOR_CLASSES[diner.color],
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {hasValidPartySize ? (
        <PersonIcon size={iconSize} theme="outline" />
      ) : diner.name ? (
        initialsFromName(diner.name)
      ) : (
        String(defaultPosition ?? '•')
      )}
    </div>
  )
}
