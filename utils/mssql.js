import axios from "axios";

// Helper centralizzato per chiamate alle API MSSQL backend
// Tutte le funzioni richiedono userEmail per isolamento utente

export const mssql = {
  // ── PIANO DEI CONTI ──────────────────────────────────────
  conti: {
    list: (email) =>
      axios.get(`/api/conti?userEmail=${encodeURIComponent(email)}`).then(r => r.data),
    create: (email, data) =>
      axios.post("/api/conti", { ...data, userEmail: email }).then(r => r.data),
    update: (email, id, data) =>
      axios.put("/api/conti", { ...data, id, userEmail: email }).then(r => r.data),
    delete: (email, id) =>
      axios.delete(`/api/conti?id=${id}&userEmail=${encodeURIComponent(email)}`).then(r => r.data),
  },

  // ── REGISTRAZIONI ────────────────────────────────────────
  registrazioni: {
    list: (email) =>
      axios.get(`/api/registrazioni?userEmail=${encodeURIComponent(email)}`).then(r => r.data),
    create: (email, data) =>
      axios.post("/api/registrazioni", { ...data, userEmail: email }).then(r => r.data),
    update: (email, id, data) =>
      axios.put("/api/registrazioni", { ...data, id, userEmail: email }).then(r => r.data),
    delete: (email, id) =>
      axios.delete(`/api/registrazioni?id=${id}&userEmail=${encodeURIComponent(email)}`).then(r => r.data),
  },

  // ── MOVIMENTI CONTABILI ──────────────────────────────────
  movimenti: {
    list: (email) =>
      axios.get(`/api/movimenti?userEmail=${encodeURIComponent(email)}`).then(r => r.data),
    listByRegistrazione: (email, registrazioneId) =>
      axios.get(`/api/movimenti?userEmail=${encodeURIComponent(email)}&registrazione_id=${registrazioneId}`).then(r => r.data),
    createBulk: (email, movimenti) =>
      axios.post("/api/movimenti", { movimenti, userEmail: email }).then(r => r.data),
    deleteByRegistrazione: (email, registrazioneId) =>
      axios.delete(`/api/movimenti?registrazione_id=${registrazioneId}&userEmail=${encodeURIComponent(email)}`).then(r => r.data),
    delete: (email, id) =>
      axios.delete(`/api/movimenti?id=${id}&userEmail=${encodeURIComponent(email)}`).then(r => r.data),
  },
};