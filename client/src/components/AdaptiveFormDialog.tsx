import * as React from "react";
import { cn } from "@/lib/utils";
import { DialogContent, DialogFooter } from "@/components/ui/dialog";

/**
 * Conteúdo para formulários longos: tela cheia abaixo de sm e modal centralizado
 * em telas maiores. O uso é opt-in para não transformar confirmações curtas em
 * telas inteiras.
 */
export function AdaptiveFormDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        "inset-0 z-[200] h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-none border-0 p-0 shadow-none",
        "sm:inset-auto sm:top-[50%] sm:left-[50%] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:gap-4 sm:overflow-y-auto sm:rounded-lg sm:border sm:p-6 sm:shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

export function AdaptiveFormDialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain touch-manipulation px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
        "sm:overflow-visible sm:px-0 sm:py-0 sm:pb-0",
        className,
      )}
      {...props}
    />
  );
}

export function AdaptiveFormDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  return (
    <DialogFooter
      className={cn(
        "sticky bottom-0 z-10 shrink-0 gap-2 border-t border-border/60 bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 [scrollbar-gutter:stable] [&>button]:min-h-11 [&>button]:w-full",
        "sm:px-0 sm:pb-0 sm:pt-3 sm:[&>button]:min-h-10 sm:[&>button]:w-auto",
        className,
      )}
      {...props}
    />
  );
}

export const adaptiveFormDialogHeaderClassName =
  "shrink-0 border-b border-border/70 px-4 py-4 pr-14 sm:border-0 sm:px-0 sm:py-0 sm:pr-8";
