import { useState, useEffect } from "react";
import User from "@/entities/User";
import { PianoDeiConti } from "@/entities/PianoDeiConti";
import {
  Plus, Search, Edit2, Trash2, BookOpen,
  ChevronDown, X, Check, Filter
} from "lucide-react";

const TIPI = ["Tutti", "Attivo", "Passivo", "Ricavo", "Costo", "Patrimonio Netto"];
const TIPI_CONTO = ["Attivo", "Passivo", "Ricavo", "Costo", "Patrimonio Netto"];

const COLORI_TIPO = {
  "Attivo": "bg-blue-100 text-blue-700",
  "Passivo": "bg-red-100 text-red-700",
  "Ricavo": "bg-emerald-100 text-emerald-700",
  "Costo": "bg-orange-100 text-orange-700",
  "Patrimonio Netto": "bg-violet-100 text-violet-700",
};

const emptyForm = {
  codice_conto: "", nome_conto: "", tipo: "Attivo",
  categoria: "", sottocategoria: "", descrizione: "",
  saldo_iniziale: 0, attivo: true
};

export default function PianoDeiContiPage() {
  const [user, setUser] = useState(null);
  const [conti, setConti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Tutti");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const u = await User.me();
    setUser(u);
    const data = await PianoDeiConti.filter({ createdBy: u.email }, "codice_conto");
    setConti(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (conto) => {
    setEditing(conto);
    setForm({
      codice_conto: conto.codice_conto || "",
      nome_conto: conto.nome_conto || "",
      tipo: conto.tipo || "Attivo",
      categoria: conto.categoria || "",
      sottocategoria: conto.sottocategoria || "",
      descrizione: conto.descrizione || "",
      saldo_iniziale: conto.saldo_iniziale || 0,
      attivo: conto.attivo !== false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.codice_conto || !form.nome_conto) return;
    setSaving(true);
    if (editing) {
      await PianoDeiConti.update(editing.id, form);
    } else {
      await PianoDeiConti.create(form);
    }
    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await PianoDeiConti.delete(id);
    setDeleteConfirm(null);
    loadData();
  };

  const filtered = conti.filter(c => {
    const matchTipo = filtroTipo === "Tutti" || c.tipo === filtroTipo;
    const matchSearch = !search ||
      c.codice_conto?.toLowerCase().includes(search.toLowerCase()) ||
      c.nome_conto?.toLowerCase().includes(search.toLowerCase()) ||
      c.categoria?.toLowerCase().includes(search.toLowerCase());
    return matchTipo && matchSearch;
  });

  const fmt = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Piano dei Conti</h1>
          <p className="text-sm text-gray-500 mt-0.5">{conti.length} conti configurati</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuovo Conto
        </button>
      </div>

      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per codice, nome, categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TIPI.map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtroTipo === t
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabella */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nessun conto trovato</p>
          <p className="text-sm text-gray-400 mt-1">Crea il primo conto contabile</p>
          <button onClick={openCreate} className="mt-4 text-sm text-blue-600 hover:underline">
            + Aggiungi conto
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Codice</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nome Conto</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Categoria</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Saldo Iniziale</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Stato</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-700">{c.codice_conto}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.nome_conto}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COLORI_TIPO[c.tipo] || "bg-gray-100 text-gray-600"}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.categoria || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">{fmt(c.saldo_iniziale)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.attivo !== false ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {c.attivo !== false ? <><Check className="w-3 h-3" />Attivo</> : "Inattivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crea/Modifica */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "Modifica Conto" : "Nuovo Conto"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Codice Conto *</label>
                  <input
                    type="text"
                    value={form.codice_conto}
                    onChange={e => setForm({ ...form, codice_conto: e.target.value })}
                    placeholder="es. 1001"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo *</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm({ ...form, tipo: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPI_CONTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome Conto *</label>
                <input
                  type="text"
                  value={form.nome_conto}
                  onChange={e => setForm({ ...form, nome_conto: e.target.value })}
                  placeholder="es. Cassa, Banca, Crediti v/clienti"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={form.categoria}
                    onChange={e => setForm({ ...form, categoria: e.target.value })}
                    placeholder="es. Liquidità"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sottocategoria</label>
                  <input
                    type="text"
                    value={form.sottocategoria}
                    onChange={e => setForm({ ...form, sottocategoria: e.target.value })}
                    placeholder="es. Cassa contanti"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Saldo Iniziale (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.saldo_iniziale}
                  onChange={e => setForm({ ...form, saldo_iniziale: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descrizione</label>
                <textarea
                  value={form.descrizione}
                  onChange={e => setForm({ ...form, descrizione: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attivo"
                  checked={form.attivo}
                  onChange={e => setForm({ ...form, attivo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="attivo" className="text-sm text-gray-700">Conto attivo</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.codice_conto || !form.nome_conto}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Salvataggio..." : editing ? "Aggiorna" : "Crea Conto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Elimina Conto</h3>
            <p className="text-sm text-gray-500 mb-5">Sei sicuro di voler eliminare questo conto? L'operazione non è reversibile.</p>
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