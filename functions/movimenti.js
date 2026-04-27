import axios from "npm:axios";

export default async function(ctx) {
  const { body, query, request, env, config, integrations } = ctx;
  const method = request.method;
  const integrationId = integrations["MSSQL Database"];
  const apiKey = config.apiKey;
  const proxyUrl = env.PROXY_INTEGRATION_URL;
  const userEmail = body?.userEmail || query?.userEmail || "";

  if (!userEmail) {
    return new Response(JSON.stringify({ error: "userEmail richiesto" }), { status: 400 });
  }

  const sqlExec = async (sql, params = []) => {
    const res = await axios.post(
      `${proxyUrl}/integrations/sql/execute-query`,
      { integrationId, query: sql, params },
      { headers: { "x-api-key": apiKey } }
    );
    return res.data;
  };

  // Crea tabella se non esiste
  await sqlExec(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MovimentoContabile' AND xtype='U')
    CREATE TABLE MovimentoContabile (
      id NVARCHAR(50) NOT NULL PRIMARY KEY,
      registrazione_id NVARCHAR(50) NOT NULL,
      numero_registrazione NVARCHAR(50) NULL,
      data_registrazione DATE NULL,
      codice_conto NVARCHAR(20) NOT NULL,
      nome_conto NVARCHAR(200) NOT NULL,
      tipo_conto NVARCHAR(20) NULL,
      tipo_movimento NVARCHAR(10) NOT NULL,
      importo DECIMAL(18,2) NOT NULL,
      descrizione_riga NVARCHAR(500) NULL,
      causale NVARCHAR(50) NULL,
      createdBy NVARCHAR(200) NOT NULL,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
      updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  if (method === "GET") {
    const registrazioneId = query?.registrazione_id;
    let result;
    if (registrazioneId) {
      result = await sqlExec(
        "SELECT * FROM MovimentoContabile WHERE registrazione_id=? AND createdBy=? ORDER BY tipo_movimento",
        [registrazioneId, userEmail]
      );
    } else {
      result = await sqlExec(
        "SELECT * FROM MovimentoContabile WHERE createdBy=? ORDER BY data_registrazione ASC",
        [userEmail]
      );
    }
    return result.rows || [];
  }

  if (method === "POST") {
    // Supporta inserimento singolo o array
    const items = Array.isArray(body?.movimenti) ? body.movimenti : [body];
    const inserted = [];
    for (const d of items) {
      const id = `MOV-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      await sqlExec(
        `INSERT INTO MovimentoContabile (id,registrazione_id,numero_registrazione,data_registrazione,codice_conto,nome_conto,tipo_conto,tipo_movimento,importo,descrizione_riga,causale,createdBy)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, d.registrazione_id, d.numero_registrazione||null, d.data_registrazione||null,
         d.codice_conto, d.nome_conto, d.tipo_conto||null, d.tipo_movimento,
         d.importo, d.descrizione_riga||null, d.causale||null, userEmail]
      );
      inserted.push({ id, ...d, createdBy: userEmail });
    }
    return inserted;
  }

  if (method === "DELETE") {
    const id = query?.id || body?.id;
    const registrazioneId = query?.registrazione_id || body?.registrazione_id;
    if (registrazioneId) {
      // Elimina tutti i movimenti di una registrazione
      await sqlExec(
        "DELETE FROM MovimentoContabile WHERE registrazione_id=? AND createdBy=?",
        [registrazioneId, userEmail]
      );
    } else if (id) {
      await sqlExec(
        "DELETE FROM MovimentoContabile WHERE id=? AND createdBy=?",
        [id, userEmail]
      );
    }
    return { success: true };
  }

  return new Response(JSON.stringify({ error: "Metodo non supportato" }), { status: 405 });
}