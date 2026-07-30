import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-transparent bg-muted/70 px-3.5 py-2 text-base transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:border-transparent focus-visible:bg-card focus-visible:shadow-soft focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-50 aria-invalid:border-destructive/50 aria-invalid:bg-destructive/5 aria-invalid:ring-4 aria-invalid:ring-destructive/15 md:text-sm dark:bg-white/6 dark:focus-visible:bg-white/10 dark:disabled:bg-white/4 dark:aria-invalid:border-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
