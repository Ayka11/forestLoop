import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { toggleVariants, type ToggleVariants } from "./toggle-variants"

import { cn } from "@/lib/utils"


type ToggleProps = React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & ToggleVariants

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  ToggleProps
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle }
