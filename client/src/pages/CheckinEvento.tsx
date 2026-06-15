import { trpc } from "@/lib/trpc";
import { CalendarDays, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearch } from "wouter";

export default function CheckinEvento() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const eventId = Number(params.get("event") ?? "0");
  const token = params.get("token") ?? "";
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const checkin = trpc.events.checkin.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  useEffect(() => {
    if (!eventId || !token) return;
    // Auto check-in sem personId (visitante anônimo)
    if (!submitted && !checkin.isPending && !checkin.isSuccess && !checkin.isError) {
      checkin.mutate({ eventId, token, visitorName: name || undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValid = eventId > 0 && token.length > 0;

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
      {/* Geometria sagrada de fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
        <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <circle cx="400" cy="300" r="200" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="300" cy="300" r="200" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
          <circle cx="500" cy="300" r="200" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl border border-[#1e3a5f]/10 p-8 text-center">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-[#1e3a5f] flex items-center justify-center mx-auto mb-6">
            <CalendarDays className="w-8 h-8 text-[#c9a84c]" />
          </div>

          {!isValid && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold font-display text-[#1e3a5f] mb-2">Link inválido</h1>
              <p className="text-sm text-[#1e3a5f]/60">
                Este link de check-in não é válido ou expirou.
              </p>
            </>
          )}

          {isValid && checkin.isPending && (
            <>
              <Loader2 className="w-12 h-12 text-[#c9a84c] mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-bold font-display text-[#1e3a5f] mb-2">Registrando presença...</h1>
              <p className="text-sm text-[#1e3a5f]/60">Aguarde um momento.</p>
            </>
          )}

          {isValid && checkin.isSuccess && (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold font-display text-[#1e3a5f] mb-2">
                {checkin.data?.alreadyRegistered ? "Presença já confirmada!" : "Presença confirmada!"}
              </h1>
              <p className="text-lg font-semibold text-[#c9a84c] mb-1">{checkin.data?.eventName}</p>
              <p className="text-sm text-[#1e3a5f]/60">
                {checkin.data?.alreadyRegistered
                  ? "Você já havia feito check-in neste evento."
                  : `Check-in realizado em ${new Date(checkin.data?.checkedIn ?? "").toLocaleString("pt-BR")}`}
              </p>
              <div className="mt-6 p-3 bg-[#f5f0e8] rounded-xl">
                <p className="text-xs text-[#1e3a5f]/50">Bem-vindo! Que Deus abençoe sua presença.</p>
              </div>
            </>
          )}

          {isValid && checkin.isError && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold font-display text-[#1e3a5f] mb-2">Erro no check-in</h1>
              <p className="text-sm text-[#1e3a5f]/60 mb-4">
                {(checkin.error as any)?.message ?? "Não foi possível registrar sua presença."}
              </p>
              <button
                onClick={() => checkin.mutate({ eventId, token, visitorName: name || undefined })}
                className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#1e3a5f]/90 transition-colors"
              >
                Tentar novamente
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#1e3a5f]/40 mt-4">
          Plataforma Lampas · Sistema de Gestão para Igrejas
        </p>
      </div>
    </div>
  );
}
