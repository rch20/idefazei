import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";
import { toast } from "sonner";

interface PlaceholderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
}

export default function Placeholder({ title, description, icon: Icon = Construction }: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-navy">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="card-sacred p-16 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
          <Icon className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-navy text-lg font-display">{title}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Este módulo está em desenvolvimento e será disponibilizado em breve.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => toast.info("Funcionalidade em desenvolvimento")}
          className="border-gold/40 text-navy hover:bg-gold/5"
        >
          Notificar quando disponível
        </Button>
      </div>
    </div>
  );
}
