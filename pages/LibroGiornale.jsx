import { useState, useEffect } from "react";
import User from "@/entities/User";
import { MovimentoContabile } from "@/entities/MovimentoContabile";
import { Search, List, Filter, Download } from "lucide-react";

export default function LibroGiornale() {
  const [user, setUser] = useState(null);
  const [movimenti, setMovimenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Tutti");
  const [dataInizio, setDataInizio] = useState("");
  const [dataFine, setDataFine] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const u = await User.me();
    setUser(u);
    const data = await MovimentoContabile.filter({ createdBy: u.email }, "data_registrazione", 500);
    setMovimenti(data || []);
    setLoading(false);
  };

  const fmt = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);

  const filtered = movimenti.filter(m => {
    const matchTipo = filtroTipo === "Tutti" || m.tipo_movimento === filtroTipo;
    const matchSearch = !search ||
      m.nome_conto?.toLowerCase().includes(search.toLowerCase()) ||
      m.codice_conto?.toLowerCase().includes(search.toLowerCase()) ||
      m.descrizione_riga?.toLowerCase().includes(search.toLowerCase()) ||
      m.numero_registrazione?.toLowerCase().includes(search.toLowerCase());
    const matchDataInizio = !dataInizio || m.data_registrazione >= dataInizio;
    const matchDataFine = !dataFine || m.data_registrazione <= dataFine;
    return matchTipo && matchSearch && matchDataInizio && matchDataFine;
  });

  const totaleDare = filtered.filter(m => m.tipo_movimento === "Dare").reduce((s, m) => s + (m.importo || 0), 0);
  const totaleAvere = filtered.filter(m => m.tipo_movimento === "Avere").reduce((s, m) => s + (m.importo || 0), 0);
  const sbilancio = Math.abs(totaleDare - totaleAvere);

  const TIPO_COLORS = {
    "Dare": "bg-blue-100 text-blue-700",
    "Avere": "bg-orange-100 text-orange-700",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Libro Giornale</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} movimenti visualizzati</p>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Cerca conto, descrizione..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Da</label>
            <input type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">A</label>
            <input type="date" value={dataFine} onChange={e => setDataFine(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            {["Tutti", "Dare", "Avere"].map(t => (
              <button key={t} onClick={() => setFiltroTipo(t)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filtroTipo === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t}
              </button>
            ))}
          </div>
          {(search || dataInizio || dataFine || filtroTipo !== "Tutti") && (
            <button onClick={() => { setSearch(""); setDataInizio(""); setDataFine(""); setFiltroTipo("Tutti"); }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              Reset filtri
            </button>
          )}
        </div>
      </div>

      {/* Totali */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Totale Dare</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{fmt(totaleDare)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Totale Avere</p>
          <p className="text-xl font-bold text-orange-700 mt-1">{fmt(totaleAvere)}</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${sbilancio < 0.01 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sbilancio</p>
          <p className={`text-xl font-bold mt-1 ${sbilancio < 0.01 ? "text-emerald-700" : "text-red-700"}`}>
            {sbilancio < 0.01 ? "✓ Pareggio" : fmt(sbilancio)}
          </p>
        </div>
      </div>

      {/* Tabella */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <List className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nessun movimento trovato</p>
          <p className="text-sm text-gray-400 mt-1">Crea registrazioni dalla sezione Prima Nota</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">N° Reg.</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Conto</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Descrizione</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Tipo</th>
                  <th className="text-right px-4 py-3 font-semibold text-blue-600 text-xs uppercase tracking-wide">Dare</th>
                  <th className="text-right px-4 py-3 font-semibold text-orange-600 text-xs uppercase tracking-wide">Avere</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(m => (
                  <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${m.tipo_movimento === "Dare" ? "border-l-2 border-l-blue-300" : "border-l-2 border-l-orange-300"}`}>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{m.data_registrazione}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{m.numero_registrazione}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-gray-500 mr-1">{m.codice_conto}</span>
                      <span className="font-medium text-gray-800">{m.nome_conto}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">{m.descrizione_riga || m.causale || "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[m.tipo_movimento]}`}>{m.tipo_movimento}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-blue-700">
                      {m.tipo_movimento === "Dare" ? fmt(m.importo) : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-orange-700">
                      {m.tipo_movimento === "Avere" ? fmt(m.importo) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={5} className="px-4 py-3 font-bold text-gray-700 text-sm">Totali</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{fmt(totaleDare)}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-700">{fmt(totaleAvere)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}