import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset="calc(env(safe-area-inset-top) + 1rem)"
      mobileOffset="calc(env(safe-area-inset-top) + 1rem)"
      richColors
      closeButton
      className="toaster group z-[9999]"
      toastOptions={{
        duration: 7000,
        classNames: {
          toast: "!bg-white !text-slate-900 !border-slate-200 !shadow-2xl",
          title: "!text-slate-900 !font-semibold",
          description: "!text-slate-700",
          error: "!bg-white !text-red-900 !border-red-300",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
