import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";

export default function NotificationPreferencesSettings({ churchId }: { churchId: number }) {
  const utils = trpc.useUtils();
  const query = trpc.notifications.preferences.useQuery({ churchId });
  const setPreference = trpc.notifications.setPreference.useMutation({
    onSuccess: () => {
      void utils.notifications.preferences.invalidate({ churchId });
      toast.success("Preferência salva.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.isError || !query.data) {
    return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">Não foi possível carregar os avisos do sistema.</p>;
  }

  const groups = Array.from(new Set(query.data.map((item) => item.group)));
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy">Avisos do sistema</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Escolha quais avisos o Ide Fazei envia no sino e no celular das pessoas desta igreja. Tudo começa ligado, e a mudança vale na hora.
        </p>
      </div>
      {groups.map((group) => (
        <Card key={group} className="border-border">
          <CardContent className="p-0">
            <h3 className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-navy/60">{group}</h3>
            <ul className="divide-y divide-border">
              {query.data.filter((item) => item.group === group).map((item) => (
                <li key={item.type} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={item.active}
                    disabled={setPreference.isPending}
                    aria-label={`${item.label}: ${item.active ? "ligado" : "desligado"}`}
                    onCheckedChange={(active) => setPreference.mutate({ churchId, eventType: item.type, active })}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
