'use client'

import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'

/** A password field with an eye button that shows or hides what was typed. */
export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  const t = useTranslations('Account')
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pe-11" />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        // Keeps focus (and the keyboard) on the field while toggling.
        onMouseDown={(e) => e.preventDefault()}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        aria-pressed={visible}
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
      >
        {visible ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
      </button>
    </div>
  )
}
