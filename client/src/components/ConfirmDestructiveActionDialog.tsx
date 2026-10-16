import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ReactNode } from "react";

type ConfirmDestructiveActionDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDestructiveActionDialog({
  open,
  title,
  description,
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  pendingLabel = "Processando…",
  pending = false,
  onOpenChange,
  onCancel,
  onConfirm,
}: ConfirmDestructiveActionDialogProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && pending) return;
    onOpenChange(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[calc(100%-1.5rem)] gap-5 p-5 sm:max-w-lg sm:p-6">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-navy">{title}</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-1 -mb-1 gap-2 border-t-0 bg-transparent pt-1 sm:mx-0 sm:mb-0 sm:border-t-0 sm:bg-transparent sm:pt-1">
          <AlertDialogCancel
            type="button"
            disabled={pending}
            onClick={() => {
              if (!pending) onCancel();
            }}
            className="min-h-11 w-full sm:w-auto"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              if (!pending) onConfirm();
            }}
            className="min-h-11 w-full bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600 sm:w-auto"
          >
            {pending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type { ConfirmDestructiveActionDialogProps };
