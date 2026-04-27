import axios from "npm:axios";

export default async function(ctx) {
  const { body, query, request, env, config, integrations } = ctx;
  const method = request.method;
  const integrationId = integrations["MSSQL Database"];
  const apiKey = config.apiKey;
  const proxyUrl = env.PROXY_INTEGRATION_URL;

  // Recupera utente autenticato
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key");
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

  // Assicura che la tabella esista
  await sqlExec(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PianoDeiConti' AND xtype='U')
    CREATE TABLE PianoDeiConti (
      id NVARCHAR(50) NOT NULL PRIMARY KEY,
      codice_conto NVARCHAR(20) NOT NULL,
      nome_conto NVARCHAR(200) NOT NULL,
      tipo NVARCHAR(20) NOT NULL,
      categoria NVARCHAR(100) NULL,
      sottocategoria NVARCHAR(100) NULL,
      descrizione NVARCHAR(500) NULL,
      attivo BIT NOT NULL DEFAULT 1,
      saldo_iniziale DECIMAL(18,2) NOT NULL DEFAULT 0,
      createdBy NVARCHAR(200) NOT NULL,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
      updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  if (method === "GET") {
    const result = await sqlExec(
      "SELECT * FROM PianoDeiConti WHERE createdBy = ? ORDER BY codice_conto",
      [userEmail]
    );
    return result.rows || [];
  }

  if (method === "POST") {
    const d = body;
    const id = `PDC-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    await sqlExec(
      `INSERT INTO PianoDeiConti (id,codice_conto,nome_conto,tipo,categoria,sottocategoria,descrizione,attivo,saldo_iniziale,createdBy)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, d.codice_conto, d.nome_conto, d.tipo, d.categoria||null, d.sottocategoria||null,
       d.descrizione||null, d.attivo!==false?1:0, d.saldo_iniziale||0, userEmail]
    );
    return { id, ...d, createdBy: userEmail };
  }

  if (method === "PUT") {
    const d = body;
    await sqlExec(
      `UPDATE PianoDeiConti SET codice_conto=?,nome_conto=?,tipo=?,categoria=?,sottocategoria=?,
       descrizione=?,attivo=?,saldo_iniziale=?,updatedAt=GETDATE()
       WHERE id=? AND createdBy=?`,
      [d.codice_conto, d.nome_conto, d.tipo, d.categoria||null, d.sottocategoria||null,
       d.descrizione||null, d.attivo!==false?1:0, d.saldo_iniziale||0, d.id, userEmail]
    );
    return { success: true };
  }

  if (method === "DELETE") {
    const id = query?.id || body?.id;
    await sqlExec(
      "DELETE FROM PianoDeiConti WHERE id=? AND createdBy=?",
      [id, userEmail]
    );
    return { success: true };
  }

  return new Response(JSON.stringify({ error: "Metodo non supportato" }), { status: 405 });
}