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
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Registrazione' AND xtype='U')
    CREATE TABLE Registrazione (
      id NVARCHAR(50) NOT NULL PRIMARY KEY,
      numero_registrazione NVARCHAR(50) NULL,
      data_registrazione DATE NOT NULL,
      descrizione NVARCHAR(500) NOT NULL,
      causale NVARCHAR(50) NOT NULL,
      stato NVARCHAR(20) NOT NULL DEFAULT 'Bozza',
      totale_dare DECIMAL(18,2) NOT NULL DEFAULT 0,
      totale_avere DECIMAL(18,2) NOT NULL DEFAULT 0,
      note NVARCHAR(1000) NULL,
      documento_riferimento NVARCHAR(100) NULL,
      createdBy NVARCHAR(200) NOT NULL,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
      updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  if (method === "GET") {
    const result = await sqlExec(
      "SELECT * FROM Registrazione WHERE createdBy = ? ORDER BY data_registrazione DESC",
      [userEmail]
    );
    return result.rows || [];
  }

  if (method === "POST") {
    const d = body;
    const id = `REG-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const numero = d.numero_registrazione || `REG-${Date.now()}`;
    await sqlExec(
      `INSERT INTO Registrazione (id,numero_registrazione,data_registrazione,descrizione,causale,stato,totale_dare,totale_avere,note,documento_riferimento,createdBy)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, numero, d.data_registrazione, d.descrizione, d.causale,
       d.stato||"Bozza", d.totale_dare||0, d.totale_avere||0,
       d.note||null, d.documento_riferimento||null, userEmail]
    );
    return { id, numero_registrazione: numero, ...d, createdBy: userEmail };
  }

  if (method === "PUT") {
    const d = body;
    await sqlExec(
      `UPDATE Registrazione SET numero_registrazione=?,data_registrazione=?,descrizione=?,causale=?,
       stato=?,totale_dare=?,totale_avere=?,note=?,documento_riferimento=?,updatedAt=GETDATE()
       WHERE id=? AND createdBy=?`,
      [d.numero_registrazione, d.data_registrazione, d.descrizione, d.causale,
       d.stato, d.totale_dare||0, d.totale_avere||0,
       d.note||null, d.documento_riferimento||null, d.id, userEmail]
    );
    return { success: true };
  }

  if (method === "DELETE") {
    const id = query?.id || body?.id;
    await sqlExec("DELETE FROM Registrazione WHERE id=? AND createdBy=?", [id, userEmail]);
    return { success: true };
  }

  return new Response(JSON.stringify({ error: "Metodo non supportato" }), { status: 405 });
}