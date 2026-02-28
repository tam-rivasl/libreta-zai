'use client'

import { ToastAction } from '@/components/ui/toast'
import { toast } from '@/hooks/use-toast'

interface ConfirmDeleteToastOptions {
  itemLabel: string
  onConfirm: () => Promise<void> | void
}

export function confirmDeleteToast({ itemLabel, onConfirm }: ConfirmDeleteToastOptions) {
  let confirmed = false

  const { dismiss } = toast({
    variant: 'destructive',
    title: 'Confirmar eliminación',
    description: `Se eliminará ${itemLabel}. Esta acción no se puede deshacer.`,
    action: (
      <ToastAction
        altText="Confirmar eliminación"
        onClick={async () => {
          if (confirmed) return
          confirmed = true
          await onConfirm()
          dismiss()
        }}
      >
        Eliminar
      </ToastAction>
    ),
  })

  return dismiss
}
