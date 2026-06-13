import { useState } from "react";
import ChurchLayout from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Calendar, Users, Clock, ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const CHURCH_ID = 1;

export default function Escalas() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: scales = [], isLoading } = trpc.schedules.list.useQuery({
    churchId: CHURCH_ID,
    month: currentMonth,
    year: currentYear,
  });

  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const formatDate = (day: number) =>
    `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const hasScale = (day: number) => {
    const dateStr = formatDate(day);
    return scales.some((s) => {
      const d = new Date(s.scheduledDate);
      const sd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return sd === dateStr;
    });
  };

  const selectedScales = selectedDate
    ? scales.filter((s) => {
        const d = new Date(s.scheduledDate);
        const sd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return sd === selectedDate;
      })
    : [];

  const uniqueDates = new Set(
    scales.map((s) => {
      const d = new Date(s.scheduledDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })
  );

  return (
    <ChurchLayout>
      <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">Escalas</h1>
            <p className="text-sm text-muted-foreground mt-1">Escalonamento de voluntários e ministérios</p>
          </div>
          <Button
            className="bg-navy text-white hover:bg-navy-light gap-2"
            onClick={() => toast.info("Criação de escala em breve!")}
          >
            + Nova Escala
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 card-sacred p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors">
                <ChevronLeft className="w-5 h-5 text-navy" />
              </button>
              <h2 className="font-display font-semibold text-navy">
                {MONTHS[currentMonth - 1]} {currentYear}
              </h2>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors">
                <ChevronRight className="w-5 h-5 text-navy" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDate(day);
                const todayStr = today.toISOString().split("T")[0];
                const isToday = dateStr === todayStr;
                const isSelected = selectedDate === dateStr;
                const hasEvent = hasScale(day);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`
                      aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all
                      ${isSelected ? "bg-navy text-white" : isToday ? "bg-gold/20 text-navy font-bold" : "hover:bg-muted text-foreground"}
                    `}
                  >
                    {day}
                    {hasEvent && (
                      <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-gold"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <div className="card-sacred p-4">
              <h3 className="font-semibold text-navy text-sm mb-3">Resumo do Mês</h3>
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-muted rounded" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { label: "Cultos Escalados", value: uniqueDates.size, icon: Calendar },
                    { label: "Escalas no Mês", value: scales.length, icon: Users },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                      </div>
                      <span className="font-bold text-navy text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-sacred p-4">
              <h3 className="font-semibold text-navy text-sm mb-3">
                {selectedDate
                  ? `Escala — ${new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`
                  : "Selecione uma data"}
              </h3>
              {!selectedDate ? (
                <p className="text-xs text-muted-foreground">Clique em um dia no calendário para ver as escalas.</p>
              ) : selectedScales.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma escala para este dia.</p>
              ) : (
                <div className="space-y-2">
                  {selectedScales.map((scale) => (
                    <div key={scale.id} className="p-2 rounded-lg bg-muted/50 border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">Min. {scale.ministryId}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(scale.scheduledDate).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-navy">Pessoa #{scale.personId}</p>
                      {scale.role && <p className="text-xs text-muted-foreground">{scale.role}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ChurchLayout>
  );
}
