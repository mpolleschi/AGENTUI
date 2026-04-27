import { useState, useEffect } from "react";
import User from "@/entities/User";
import { PianoDeiConti } from "@/entities/PianoDeiConti";
import { MovimentoContabile } from "@/entities/MovimentoContabile";
import { BarChart3, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

const TIPO_ORDER = ["Attivo", "Passivo", "Patrimonio Netto", "Ricavo", "Costo"];

const TIPO_COLORS = {
  "Attivo": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-100 text-blue-700" },
  "Passivo": { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", badge: "bg-red-100 text-red-700" },
  "Ricavo": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", badge: "bg-emerald-100 text-emerald-700" },
  "Costo": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", badge: "bg-orange-100 text-orange-700" },
  "Patrimonio Netto": { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-800", badge: "bg-violet-100 text-violet-700" },
};

export default function BilancioDiVerifica() {
  const [user, setUser] = useState(null);
  const [conti, setConti] = useState([]);
  const [movimenti, setMovimenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("Tutti");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const u = await User.me();
    setUser(u);
    const [c, m] = await Promise.all([
      PianoDeiConti.filter({ createdBy: u.email }, "codice_conto"),
      MovimentoContabile.filter({ createdBy: u.email }, "data_registrazione", 1000),
    ]);
    setConti(c || []);
    setMovimenti(m || []);
    setLoading(false);
  };

  const fmt = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);

  // Calcola saldo per ogni conto
  const contiConSaldo = conti.map(conto => {
    const movConto = movimenti.filter(m => m.codice_conto === conto.codice_conto);
    const totaleDare = movConto.filter(m => m.tipo_movimento === "Dare").reduce((s, m) => s + (m.importo || 0), 0);
    const totaleAvere = movConto.filter(m => m.tipo_movimento === "Avere").reduce((s, m) => s + (m.importo || 0), 0);
    const saldoIniziale = conto.saldo_iniziale || 0;

    // Per Attivo e Costo: saldo = saldo_iniziale + Dare - Avere (saldo debitore)
    // Per Passivo, Ricavo, Patrimonio: saldo = saldo_iniziale + Avere - Dare (saldo creditore)
    let saldo;
    if (conto.tipo === "Attivo" || conto.tipo === "Costo") {
      saldo = saldoIniziale + totaleDare - totaleAvere;
    } else {
      saldo = saldoIniziale + totaleAvere - totaleDare;
    }

    return { ...conto, totaleDare, totaleAvere, saldo };
  });

  const tipiPresenti = TIPO_ORDER.filter(t => contiConSaldo.some(c => c.tipo === t));

  const contiFiltered = filtroTipo === "Tutti"
    ? contiConSaldo
    : contiConSaldo.filter(c => c.tipo === filtroTipo);

  // Totali globali
  const totDare = contiConSaldo.reduce((s, c) => s + c.totaleDare, 0);
  const totAvere = contiConSaldo.reduce((s, c) => s + c.totaleAvere, 0);
  const sbilancio = Math.abs(totDare - totAvere);

  // Totali per sezione bilancio
  const totAttivo = contiConSaldo.filter(c => c.tipo === "Attivo").reduce((s, c) => s + c.saldo, 0);
  const totPassivo = contiConSaldo.filter(c => c.tipo === "Passivo").reduce((s, c) => s + c.saldo, 0);
  const totPatrimonio = contiConSaldo.filter(c => c.tipo === "Patrimonio Netto").reduce((s, c) => s + c.saldo, 0);
  const totRicavi = contiConSaldo.filter(c => c.tipo === "Ricavo").reduce((s, c) => s + c.saldo, 0);
  const totCosti = contiConSaldo.filter(c => c.tipo === "Costo").reduce((s, c) => s + c.saldo, 0);
  const risultatoEsercizio = totRicavi - totCosti;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bilancio di Verifica</h1>
          <p className="text-sm text-gray-500 mt-0.5">Saldi per conto al {new Date().toLocaleDateString("it-IT")}</p>
        </div>
      </div>

      {/* Stato pareggio */}
      {movimenti.length > 0 && (
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 border ${sbilancio < 0.01 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          {sbilancio < 0.01
            ? <><CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /><p className="text-sm text-emerald-800 font-medium">Contabilità in pareggio — Dare ({fmt(totDare)}) = Avere ({fmt(totAvere)}) ✓</p></>
            : <><AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" /><p className="text-sm text-red-800 font-medium">Sbilancio rilevato: {fmt(sbilancio)} — Dare: {fmt(totDare)} / Avere: {fmt(totAvere)}</p></>
          }
        </div>
      )}

      {/* KPI Riepilogo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Attivo", value: fmt(totAttivo), color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
          { label: "Passivo", value: fmt(totPassivo), color: "text-red-700", bg: "bg-red-50 border-red-200" },
          { label: "Patrimonio", value: fmt(totPatrimonio), color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
          { label: "Ricavi", value: fmt(totRicavi), color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Costi", value: fmt(totCosti), color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-3 ${bg}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Risultato esercizio */}
      <div className={`flex items-center gap-4 rounded-xl border p-4 ${risultatoEsercizio >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
        {risultatoEsercizio >= 0
          ? <TrendingUp className="w-6 h-6 text-emerald-600" />
          : <TrendingDown className="w-6 h-6 text-red-600" />
        }
        <div>
          <p className="text-sm font-semibold text-gray-700">Risultato d'Esercizio</p>
          <p className={`text-xl font-bold ${risultatoEsercizio >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {risultatoEsercizio >= 0 ? "Utile" : "Perdita"}: {fmt(Math.abs(risultatoEsercizio))}
          </p>
        </div>
        <div className="ml-auto text-right text-sm text-gray-500">
          <p>Ricavi: {fmt(totRicavi)}</p>
          <p>Costi: {fmt(totCosti)}</p>
        </div>
      </div>

      {/* Filtri tipo */}
      <div className="flex gap-2 flex-wrap">
        {["Tutti", ...tipiPresenti].map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroTipo === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tabella per tipo */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : conti.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BarChart3 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nessun conto configurato</p>
          <p className="text-sm text-gray-400 mt-1">Configura il Piano dei Conti per visualizzare il bilancio</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(filtroTipo === "Tutti" ? tipiPresenti : [filtroTipo]).map(tipo => {
            const contiTipo = contiFiltered.filter(c => c.tipo === tipo);
            if (contiTipo.length === 0) return null;
            const colors = TIPO_COLORS[tipo] || { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-800", badge: "bg-gray-100 text-gray-700" };
            const totSaldoTipo = contiTipo.reduce((s, c) => s + c.saldo, 0);
            const totDareTipo = contiTipo.reduce((s, c) => s + c.totaleDare, 0);
            const totAvereTipo = contiTipo.reduce((s, c) => s + c.totaleAvere, 0);

            return (
              <div key={tipo} className={`rounded-xl border overflow-hidden shadow-sm ${colors.border}`}>
                <div className={`px-4 py-3 flex items-center justify-between ${colors.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.badge}`}>{tipo}</span>
                    <span className="text-sm text-gray-500">{contiTipo.length} conti</span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <span className="text-gray-500">Dare: <strong className="text-blue-700">{fmt(totDareTipo)}</strong></span>
                    <span className="text-gray-500">Avere: <strong className="text-orange-700">{fmt(totAvereTipo)}</strong></span>
                    <span className={`font-bold ${colors.text}`}>Saldo: {fmt(totSaldoTipo)}</span>
                  </div>
                </div>
                <div className="bg-white overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Codice</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Nome Conto</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Categoria</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Saldo Iniziale</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-blue-600">Dare</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-orange-600">Avere</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-700">Saldo Finale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {contiTipo.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{c.codice_conto}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{c.nome_conto}</td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{c.categoria || "—"}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{fmt(c.saldo_iniziale)}</td>
                          <td className="px-4 py-2.5 text-right text-blue-700 font-medium">{c.totaleDare > 0 ? fmt(c.totaleDare) : "—"}</td>
                          <td className="px-4 py-2.5 text-right text-orange-700 font-medium">{c.totaleAvere > 0 ? fmt(c.totaleAvere) : "—"}</td>
                          <td className={`px-4 py-2.5 text-right font-bold ${c.saldo >= 0 ? colors.text : "text-red-600"}`}>
                            {fmt(c.saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}