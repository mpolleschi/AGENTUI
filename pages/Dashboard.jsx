import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import User from "@/entities/User";
import { PianoDeiConti } from "@/entities/PianoDeiConti";
import { Registrazione } from "@/entities/Registrazione";
import { MovimentoContabile } from "@/entities/MovimentoContabile";
import {
  BookOpen, FileText, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle, Clock, ArrowRight, Plus
} from "lucide-react";
import * as RechartsPrimitive from "recharts";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [conti, setConti] = useState([]);
  const [registrazioni, setRegistrazioni] = useState([]);
  const [movimenti, setMovimenti] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const u = await User.me();
    setUser(u);
    const [c, r, m] = await Promise.all([
      PianoDeiConti.filter({ createdBy: u.email }),
      Registrazione.filter({ createdBy: u.email }, "-data_registrazione", 50),
      MovimentoContabile.filter({ createdBy: u.email }, "-createdAt", 200),
    ]);
    setConti(c || []);
    setRegistrazioni(r || []);
    setMovimenti(m || []);
    setLoading(false);
  };

  const now = new Date();
  const meseCorrente = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const regMese = registrazioni.filter(r => r.data_registrazione?.startsWith(meseCorrente));
  const totaleDare = movimenti.reduce((s, m) => m.tipo_movimento === "Dare" ? s + (m.importo || 0) : s, 0);
  const totaleAvere = movimenti.reduce((s, m) => m.tipo_movimento === "Avere" ? s + (m.importo || 0) : s, 0);
  const sbilancio = Math.abs(totaleDare - totaleAvere);

  // Dati per grafico per tipo conto
  const tipiConto = ["Attivo", "Passivo", "Ricavo", "Costo", "Patrimonio Netto"];
  const chartData = tipiConto.map(tipo => {
    const contiTipo = conti.filter(c => c.tipo === tipo);
    const movTipo = movimenti.filter(m => contiTipo.some(c => c.codice_conto === m.codice_conto));
    const dare = movTipo.filter(m => m.tipo_movimento === "Dare").reduce((s, m) => s + (m.importo || 0), 0);
    const avere = movTipo.filter(m => m.tipo_movimento === "Avere").reduce((s, m) => s + (m.importo || 0), 0);
    return { tipo: tipo.replace(" Netto", ""), dare, avere };
  }).filter(d => d.dare > 0 || d.avere > 0);

  const fmt = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);

  const kpis = [
    { label: "Conti Attivi", value: conti.filter(c => c.attivo !== false).length, icon: BookOpen, color: "bg-blue-500", sub: `su ${conti.length} totali` },
    { label: "Registrazioni of Mese", value: regMese.length, icon: FileText, color: "bg-violet-500", sub: `${registrazioni.filter(r => r.stato === "Confermata").length} confermate` },
    { label: "Totale Dare", value: fmt(totaleDare), icon: TrendingUp, color: "bg-emerald-500", sub: "movimenti dare" },
    { label: "Totale Avere", value: fmt(totaleAvere), icon: TrendingDown, color: "bg-orange-500", sub: "movimenti avere" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Benvenuto, <span className="font-medium text-gray-700">{user?.fullName || user?.email}</span>
          </p>
        </div>
        <Link
          to={createPageUrl("PrimaNota")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuova Registrazione
        </Link>
      </div>

      {/* Sbilancio alert */}
      {sbilancio > 0.01 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Attenzione:</span> Sbilancio rilevato di {fmt(sbilancio)} — verificare le registrazioni.
          </p>
        </div>
      )}
      {sbilancio <= 0.01 && movimenti.length > 0 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">Contabilità in pareggio — Dare = Avere ✓</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
              <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Grafico */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Movimenti per Tipo Conto</h2>
            <RechartsPrimitive.ResponsiveContainer width="100%" height={220}>
              <RechartsPrimitive.BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <RechartsPrimitive.XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                <RechartsPrimitive.YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                <RechartsPrimitive.Bar dataKey="dare" name="Dare" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <RechartsPrimitive.Bar dataKey="avere" name="Avere" fill="#f97316" radius={[4, 4, 0, 0]} />
                <RechartsPrimitive.Legend />
              </RechartsPrimitive.BarChart>
            </RechartsPrimitive.ResponsiveContainer>
          </div>
        )}

        {/* Ultime registrazioni */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Ultime Registrazioni</h2>
            <Link to={createPageUrl("PrimaNota")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Vedi tutte <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {registrazioni.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nessuna registrazione ancora</p>
              <Link to={createPageUrl("PrimaNota")} className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                Crea la prima registrazione
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {registrazioni.slice(0, 6).map(r => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    r.stato === "Confermata" ? "bg-emerald-400" :
                    r.stato === "Annullata" ? "bg-red-400" : "bg-amber-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.descrizione}</p>
                    <p className="text-xs text-gray-400">{r.data_registrazione} · {r.causale}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-700">{fmt(r.totale_dare)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      r.stato === "Confermata" ? "bg-emerald-100 text-emerald-700" :
                      r.stato === "Annullata" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>{r.stato}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Piano dei Conti", page: "PianoDeiConti", icon: BookOpen, desc: `${conti.length} conti` },
          { label: "Prima Nota", page: "PrimaNota", icon: FileText, desc: `${registrazioni.length} registrazioni` },
          { label: "Libro Giornale", page: "LibroGiornale", icon: Clock, desc: `${movimenti.length} movimenti` },
          { label: "Bilancio Verifica", page: "BilancioDiVerifica", icon: CheckCircle, desc: "Saldi conti" },
        ].map(({ label, page, icon: Icon, desc }) => (
          <Link
            key={page}
            to={createPageUrl(page)}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <Icon className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-gray-800">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}