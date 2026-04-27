import { useState, useEffect } from "react";
import User from "@/entities/User";
import { Registrazione } from "@/entities/Registrazione";
import { MovimentoContabile } from "@/entities/MovimentoContabile";
import { PianoDeiConti } from "@/entities/PianoDeiConti";
import {
  Plus, Search, Edit2, Trash2, Eye, FileText,
  X, Check, AlertCircle, ChevronDown
} from "lucide-react";

const CAUSALI = ["Acquisto", "Vendita", "Pagamento", "Incasso", "Giroconto", "Stipendio", "Ammortamento", "Rettifica", "Apertura", "Chiusura", "Altro"];
const STATI = ["Tutti", "Bozza", "Confermata", "Annullata"];

const emptyRiga = { codice_conto: "", nome_conto: "", tipo_conto: "", tipo_movimento: "Dare", importo: "", descrizione_riga: "" };

export default function PrimaNota() {
  const [user, setUser] = useState(null);
  const [registrazioni, setRegistrazioni] = useState([]);
  const [conti, setConti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState("Tutti");
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [detailMovimenti, setDetailMovimenti] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    data_registrazione: new Date().toISOString().split("T")[0],
    descrizione: "", causale: "Acquisto", stato: "Bozza",
    documento_riferimento: "", note: ""
  });
  const [righe, setRighe] = useState([
    { ...emptyRiga, tipo_movimento: "Dare" },
    { ...emptyRiga, tipo_movimento: "Avere" }
  ]);
  const [contoSearch, setContoSearch] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const u = await User.me();
    setUser(u);
    const [r, c] = await Promise.all([
      Registrazione.filter({ createdBy: u.email }, "-data_registrazione", 100),
      PianoDeiConti.filter({ createdBy: u.email }, "codice_conto"),
    ]);
    setRegistrazioni(r || []);
    setConti(c || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      data_registrazione: new Date().toISOString().split("T")[0],
      descrizione: "", causale: "Acquisto", stato: "Bozza",
      documento_riferimento: "", note: ""
    });
    setRighe([
      { ...emptyRiga, tipo_movimento: "Dare" },
      { ...emptyRiga, tipo_movimento: "Avere" }
    ]);
    setContoSearch({});
    setShowModal(true);
  };

  const openDetail = async (reg) => {
    setShowDetail(reg);
    const movs = await MovimentoContabile.filter({ registrazione_id: reg.id });
    setDetailMovimenti(movs || []);
  };

  const updateRiga = (idx, field, value) => {
    const newRighe = [...righe];
    newRighe[idx] = { ...newRighe[idx], [field]: value };
    if (field === "codice_conto") {
      const conto = conti.find(c => c.codice_conto === value || c.nome_conto.toLowerCase().includes(value.toLowerCase()));
      if (conto) {
        newRighe[idx].nome_conto = conto.nome_conto;
        newRighe[idx].tipo_conto = conto.tipo;
      }
    }
    setRighe(newRighe);
  };

  const selectConto = (idx, conto) => {
    const newRighe = [...righe];
    newRighe[idx] = {
      ...newRighe[idx],
      codice_conto: conto.codice_conto,
      nome_conto: conto.nome_conto,
      tipo_conto: conto.tipo
    };
    setRighe(newRighe);
    setContoSearch({ ...contoSearch, [idx]: "" });
  };

  const addRiga = (tipo) => setRighe([...righe, { ...emptyRiga, tipo_movimento: tipo }]);
  const removeRiga = (idx) => setRighe(righe.filter((_, i) => i !== idx));

  const totaleDare = righe.filter(r => r.tipo_movimento === "Dare").reduce((s, r) => s + (parseFloat(r.importo) || 0), 0);
  const totaleAvere = righe.filter(r => r.tipo_movimento === "Avere").reduce((s, r) => s + (parseFloat(r.importo) || 0), 0);
  const inPausa = Math.abs(totaleDare - totaleAvere) < 0.01;

  const handleSave = async (stato) => {
    if (!form.descrizione || !form.data_registrazione) return;
    setSaving(true);
    const righeValide = righe.filter(r => r.codice_conto && r.importo > 0);
    const regData = {
      ...form,
      stato: stato || form.stato,
      totale_dare: totaleDare,
      totale_avere: totaleAvere,
      numero_registrazione: editing?.numero_registrazione || `REG-${Date.now()}`,
    };
    let regId;
    if (editing) {
      await Registrazione.update(editing.id, regData);
      regId = editing.id;
      const oldMovs = await MovimentoContabile.filter({ registrazione_id: editing.id });
      await Promise.all((oldMovs || []).map(m => MovimentoContabile.delete(m.id)));
    } else {
      const created = await Registrazione.create(regData);
      regId = created.id;
    }
    await Promise.all(righeValide.map(r => MovimentoContabile.create({
      registrazione_id: regId,
      numero_registrazione: regData.numero_registrazione,
      data_registrazione: form.data_registrazione,
      codice_conto: r.codice_conto,
      nome_conto: r.nome_conto,
      tipo_conto: r.tipo_conto,
      tipo_movimento: r.tipo_movimento,
      importo: parseFloat(r.importo),
      descrizione_riga: r.descrizione_riga,
      causale: form.causale,
    })));
    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async (id) => {
    const movs = await MovimentoContabile.filter({ registrazione_id: id });
    await Promise.all((movs || []).map(m => MovimentoContabile.delete(m.id)));
    await Registrazione.delete(id);
    setDeleteConfirm(null);
    loadData();
  };

  const fmt = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);

  const filtered = registrazioni.filter(r => {
    const matchStato = filtroStato === "Tutti" || r.stato === filtroStato;
    const matchSearch = !search ||
      r.descrizione?.toLowerCase().includes(search.toLowerCase()) ||
      r.numero_registrazione?.toLowerCase().includes(search.toLowerCase()) ||
      r.causale?.toLowerCase().includes(search.toLowerCase());
    return matchStato && matchSearch;
  });

  const statoColor = { "Confermata": "bg-emerald-100 text-emerald-700", "Annullata": "bg-red-100 text-red-700", "Bozza": "bg-amber-100 text-amber-700" };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prima Nota</h1>
          <p className="text-sm text-gray-500 mt-0.5">{registrazioni.length} registrazioni totali</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />Nuova Registrazione
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Cerca registrazione..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2">
          {STATI.map(s => (
            <button key={s} onClick={() => setFiltroStato(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroStato === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nessuna registrazione trovata</p>
          <button onClick={openCreate} className="mt-4 text-sm text-blue-600 hover:underline">+ Crea prima registrazione</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">N°</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Descrizione</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Causale</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Dare</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Avere</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Stato</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.numero_registrazione}</td>
                    <td className="px-4 py-3 text-gray-700">{r.data_registrazione}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{r.descrizione}</td>
                    <td className="px-4 py-3 text-gray-500">{r.causale}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">{fmt(r.totale_dare)}</td>
                    <td className="px-4 py-3 text-right font-medium text-orange-700">{fmt(r.totale_avere)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statoColor[r.stato] || "bg-gray-100 text-gray-600"}`}>{r.stato}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openDetail(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuova Registrazione */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">Nuova Registrazione</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Testata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Data *</label>
                  <input type="date" value={form.data_registrazione} onChange={e => setForm({ ...form, data_registrazione: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Causale *</label>
                  <select value={form.causale} onChange={e => setForm({ ...form, causale: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CAUSALI.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descrizione *</label>
                <input type="text" value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })}
                  placeholder="es. Acquisto materiali da Fornitore XYZ"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Doc. Riferimento</label>
                  <input type="text" value={form.documento_riferimento} onChange={e => setForm({ ...form, documento_riferimento: e.target.value })}
                    placeholder="es. FT-2024-001"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Note</label>
                  <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Righe */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700">Righe Contabili</h3>
                  <div className="flex gap-2">
                    <button onClick={() => addRiga("Dare")} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium">+ Dare</button>
                    <button onClick={() => addRiga("Avere")} className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 font-medium">+ Avere</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {righe.map((riga, idx) => (
                    <div key={idx} className={`border rounded-lg p-3 ${riga.tipo_movimento === "Dare" ? "border-blue-200 bg-blue-50/30" : "border-orange-200 bg-orange-50/30"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riga.tipo_movimento === "Dare" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                          {riga.tipo_movimento}
                        </span>
                        <select value={riga.tipo_movimento} onChange={e => updateRiga(idx, "tipo_movimento", e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none">
                          <option value="Dare">Dare</option>
                          <option value="Avere">Avere</option>
                        </select>
                        {righe.length > 2 && (
                          <button onClick={() => removeRiga(idx)} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <input type="text" placeholder="Codice conto" value={contoSearch[idx] !== undefined ? contoSearch[idx] : riga.codice_conto}
                            onChange={e => { setContoSearch({ ...contoSearch, [idx]: e.target.value }); updateRiga(idx, "codice_conto", e.target.value); }}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          {contoSearch[idx] && conti.filter(c =>
                            c.codice_conto.includes(contoSearch[idx]) || c.nome_conto.toLowerCase().includes(contoSearch[idx].toLowerCase())
                          ).length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-32 overflow-y-auto">
                              {conti.filter(c =>
                                c.codice_conto.includes(contoSearch[idx]) || c.nome_conto.toLowerCase().includes(contoSearch[idx].toLowerCase())
                              ).slice(0, 5).map(c => (
                                <button key={c.id} onClick={() => selectConto(idx, c)}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2">
                                  <span className="font-mono text-gray-500">{c.codice_conto}</span>
                                  <span className="text-gray-800">{c.nome_conto}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input type="text" placeholder="Nome conto" value={riga.nome_conto} readOnly
                          className="border border-gray-200 rounded px-2 py-1.5 text-xs bg-gray-50 text-gray-600" />
                        <input type="number" placeholder="Importo €" step="0.01" value={riga.importo}
                          onChange={e => updateRiga(idx, "importo", e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <input type="text" placeholder="Descrizione riga (opzionale)" value={riga.descrizione_riga}
                        onChange={e => updateRiga(idx, "descrizione_riga", e.target.value)}
                        className="mt-2 w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>

                {/* Totali */}
                <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div className="flex gap-6 text-sm">
                    <span>Dare: <strong className="text-blue-700">{fmt(totaleDare)}</strong></span>
                    <span>Avere: <strong className="text-orange-700">{fmt(totaleAvere)}</strong></span>
                  </div>
                  {inPausa ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold"><Check className="w-4 h-4" />In pareggio</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-600 font-semibold"><AlertCircle className="w-4 h-4" />Sbilancio: {fmt(Math.abs(totaleDare - totaleAvere))}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Annulla</button>
              <button onClick={() => handleSave("Bozza")} disabled={saving || !form.descrizione}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50">
                Salva Bozza
              </button>
              <button onClick={() => handleSave("Confermata")} disabled={saving || !form.descrizione || !inPausa}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors">
                {saving ? "Salvataggio..." : "Conferma"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{showDetail.descrizione}</h2>
                <p className="text-xs text-gray-500">{showDetail.numero_registrazione} · {showDetail.data_registrazione} · {showDetail.causale}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs font-semibold text-gray-500">Conto</th>
                    <th className="text-right py-2 text-xs font-semibold text-blue-600">Dare</th>
                    <th className="text-right py-2 text-xs font-semibold text-orange-600">Avere</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailMovimenti.map(m => (
                    <tr key={m.id}>
                      <td className="py-2">
                        <span className="font-mono text-xs text-gray-500 mr-2">{m.codice_conto}</span>
                        <span className="text-gray-800">{m.nome_conto}</span>
                        {m.descrizione_riga && <p className="text-xs text-gray-400">{m.descrizione_riga}</p>}
                      </td>
                      <td className="py-2 text-right font-medium text-blue-700">{m.tipo_movimento === "Dare" ? fmt(m.importo) : ""}</td>
                      <td className="py-2 text-right font-medium text-orange-700">{m.tipo_movimento === "Avere" ? fmt(m.importo) : ""}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td className="py-2 font-bold text-gray-700">Totale</td>
                    <td className="py-2 text-right font-bold text-blue-700">{fmt(showDetail.totale_dare)}</td>
                    <td className="py-2 text-right font-bold text-orange-700">{fmt(showDetail.totale_avere)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Elimina Registrazione</h3>
            <p className="text-sm text-gray-500 mb-5">Verranno eliminati anche tutti i movimenti collegati. Continuare?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Annulla</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}