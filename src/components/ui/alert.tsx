import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#/lib/utils"

/**
 * Each variant only sets --alert-tone; the tint, border and icon tile are all
 * mixed from it, so every tone has the same weight. The icon passed as the
 * first child is drawn inside a tinted tile.
 */
const alertVariants = cva(
  [
    "group/alert relative grid w-full items-start gap-x-3 gap-y-0.5 rounded-xl border px-4 py-3 text-left text-sm text-card-foreground",
    "border-[color-mix(in_oklab,var(--alert-tone)_24%,var(--border))] bg-[color-mix(in_oklab,var(--alert-tone)_7%,var(--card))]",
    "has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:has-data-[slot=alert-action]:sm:grid-cols-[auto_1fr_auto]",
    "*:[svg]:row-span-2 *:[svg]:box-content *:[svg]:rounded-lg *:[svg]:p-2 *:[svg]:text-(--alert-tone) *:[svg]:bg-[color-mix(in_oklab,var(--alert-tone)_16%,transparent)] *:[svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "[--alert-tone:var(--muted-foreground)]",
        info: "[--alert-tone:var(--info)]",
        warning: "[--alert-tone:var(--warning)]",
        success: "[--alert-tone:var(--success)]",
        destructive: "[--alert-tone:var(--destructive)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        // Nudged down so a one-line title sits level with the middle of the icon tile.
        "leading-5 font-medium group-has-[>svg]/alert:col-start-2 group-has-[>svg]/alert:pt-1.5 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-muted-foreground group-has-[>svg]/alert:col-start-2 md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

/** A button that resolves the alert: at the right edge, or below the text on phones. */
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "mt-2 flex flex-wrap items-center gap-2 group-has-[>svg]/alert:col-start-2 sm:col-start-3! sm:row-span-2 sm:row-start-1 sm:mt-0 sm:self-center",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
