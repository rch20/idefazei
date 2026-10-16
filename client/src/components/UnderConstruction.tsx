import { Construction } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface UnderConstructionProps {
  title: string;
  description?: string;
}

export default function UnderConstruction({ title, description }: UnderConstructionProps) {
  const [, navigate] = useLocation();

  return (
    <section className="mx-auto flex min-h-[45vh] max-w-2xl items-center justify-center p-4 sm:p-6" aria-labelledby="under-construction-title">
      <div className="card-sacred w-full p-8 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50" aria-hidden="true">
          <Construction className="h-8 w-8 text-amber-500" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Em construção</p>
        <h2 id="under-construction-title" className="mt-2 font-display text-2xl font-semibold text-navy">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {description ?? "Esta área está sendo preparada. Ela ficará disponível assim que a construção for concluída."}
        </p>
        <Button type="button" variant="outline" className="mt-6 border-gold/40 text-navy hover:bg-gold/5" onClick={() => navigate("/app/inicio")}>
          Voltar ao início
        </Button>
      </div>
    </section>
  );
}
