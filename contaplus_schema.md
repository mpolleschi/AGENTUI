# Schema MSSQL - ContaPlus
## Da eseguire nel pannello SQL di smarterasp.net

```sql
-- ============================================
-- ContaPlus - Schema MSSQL per smarterasp.net
-- ============================================

-- 1. PIANO DEI CONTI
CREATE TABLE PianoDeiConti (
    id              NVARCHAR(50)    NOT NULL PRIMARY KEY,
    codice_conto    NVARCHAR(20)    NOT NULL,
    nome_conto      NVARCHAR(200)   NOT NULL,
    tipo            NVARCHAR(20)    NOT NULL CHECK (tipo IN ('Attivo','Passivo','Ricavo','Costo','Patrimonio Netto')),
    categoria       NVARCHAR(100)   NULL,
    sottocategoria  NVARCHAR(100)   NULL,
    descrizione     NVARCHAR(500)   NULL,
    attivo          BIT             NOT NULL DEFAULT 1,
    saldo_iniziale  DECIMAL(18,2)   NOT NULL DEFAULT 0,
    createdBy       NVARCHAR(200)   NOT NULL,
    createdAt       DATETIME2       NOT NULL DEFAULT GETDATE(),
    updatedAt       DATETIME2       NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_PianoDeiConti_createdBy ON PianoDeiConti(createdBy);
CREATE INDEX IX_PianoDeiConti_codice    ON PianoDeiConti(codice_conto);

-- 2. REGISTRAZIONI (testata prima nota)
CREATE TABLE Registrazione (
    id                    NVARCHAR(50)    NOT NULL PRIMARY KEY,
    numero_registrazione  NVARCHAR(50)    NULL,
    data_registrazione    DATE            NOT NULL,
    descrizione           NVARCHAR(500)   NOT NULL,
    causale               NVARCHAR(50)    NOT NULL CHECK (causale IN ('Acquisto','Vendita','Pagamento','Incasso','Giroconto','Stipendio','Ammortamento','Rettifica','Apertura','Chiusura','Altro')),
    stato                 NVARCHAR(20)    NOT NULL DEFAULT 'Bozza' CHECK (stato IN ('Bozza','Confermata','Annullata')),
    totale_dare           DECIMAL(18,2)   NOT NULL DEFAULT 0,
    totale_avere          DECIMAL(18,2)   NOT NULL DEFAULT 0,
    note                  NVARCHAR(1000)  NULL,
    documento_riferimento NVARCHAR(100)   NULL,
    createdBy             NVARCHAR(200)   NOT NULL,
    createdAt             DATETIME2       NOT NULL DEFAULT GETDATE(),
    updatedAt             DATETIME2       NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_Registrazione_createdBy ON Registrazione(createdBy);
CREATE INDEX IX_Registrazione_data      ON Registrazione(data_registrazione);

-- 3. MOVIMENTI CONTABILI (righe dare/avere)
CREATE TABLE MovimentoContabile (
    id                   NVARCHAR(50)    NOT NULL PRIMARY KEY,
    registrazione_id     NVARCHAR(50)    NOT NULL,
    numero_registrazione NVARCHAR(50)    NULL,
    data_registrazione   DATE            NULL,
    codice_conto         NVARCHAR(20)    NOT NULL,
    nome_conto           NVARCHAR(200)   NOT NULL,
    tipo_conto           NVARCHAR(20)    NULL CHECK (tipo_conto IN ('Attivo','Passivo','Ricavo','Costo','Patrimonio Netto')),
    tipo_movimento       NVARCHAR(10)    NOT NULL CHECK (tipo_movimento IN ('Dare','Avere')),
    importo              DECIMAL(18,2)   NOT NULL,
    descrizione_riga     NVARCHAR(500)   NULL,
    causale              NVARCHAR(50)    NULL,
    createdBy            NVARCHAR(200)   NOT NULL,
    createdAt            DATETIME2       NOT NULL DEFAULT GETDATE(),
    updatedAt            DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Movimento_Registrazione FOREIGN KEY (registrazione_id)
        REFERENCES Registrazione(id)
);
CREATE INDEX IX_MovimentoContabile_createdBy     ON MovimentoContabile(createdBy);
CREATE INDEX IX_MovimentoContabile_registrazione ON MovimentoContabile(registrazione_id);
CREATE INDEX IX_MovimentoContabile_conto         ON MovimentoContabile(codice_conto);
```

## Note
- **createdBy** = email utente → garantisce isolamento dati tra utenti
- **id** = NVARCHAR(50) → compatibile con gli ID generati dall'app
- Ordine di esecuzione: prima `Registrazione`, poi `MovimentoContabile` (per la FK)
- Testato su SQL Server 2016+