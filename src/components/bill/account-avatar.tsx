import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccountAvatarProps {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null
  size?: number
  className?: string
}

/** Falls back through: profile photo → first letter of name/email → a generic person glyph
 * when signed out. Kept separate from `DinerAvatar` deliberately — a diner's colored
 * avatar is a paying-party identity inside a bill, this is the app-level account identity,
 * a different concept that shouldn't borrow the diner color palette. */
export function AccountAvatar({ user, size = 36, className }: AccountAvatarProps) {
  const initial = (user?.name?.trim() || user?.email?.trim() || '').charAt(0).toUpperCase()

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-primary',
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {user?.image ? (
        <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : user && initial ? (
        <span className="text-sm font-semibold">{initial}</span>
      ) : (
        <User className="size-[55%]" aria-hidden="true" />
      )}
    </div>
  )
}
