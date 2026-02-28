'use client'

import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'

import { cn } from '@/lib/utils'

function ScrollArea({
  className,
  children,
  showHorizontalScrollbar = true,
  showVerticalScrollbar = true,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  showHorizontalScrollbar?: boolean
  showVerticalScrollbar?: boolean
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {showHorizontalScrollbar ? <ScrollBar orientation="horizontal" /> : null}
      {showVerticalScrollbar ? <ScrollBar orientation="vertical" /> : null}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none p-px transition-colors select-none',
        orientation === 'vertical' &&
          'h-full w-3.5 md:w-2.5 pl-1 border-l border-l-transparent',
        orientation === 'horizontal' &&
          'h-3.5 md:h-2.5 flex-col pt-1 border-t border-t-transparent',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={cn(
          'bg-border/85 relative rounded-full',
          orientation === 'vertical' && 'flex-1 min-h-[38px]',
          orientation === 'horizontal' && 'flex-1 min-w-[38px]',
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
