import type { LucideIcon } from 'lucide-react'

export function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <h2 className="flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      <Icon className="size-3.5" />
      {title}
    </h2>
  )
}
