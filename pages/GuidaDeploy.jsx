import { useState } from "react";
import {
  Github, Download, Terminal, Globe, Database,
  CheckCircle, Copy, ChevronDown, ChevronRight, AlertCircle, Info
} from "lucide-react";

const steps = [
  {
    id: 1,
    icon: Github,
    color: "bg-gray-800",
    title: "Scarica il codice da GitHub",
    desc: "Una volta risolto il bug GitHub su AgentUI, clona il repository sul tuo PC",
    commands: [
      { label: "Clona il repo", cmd: "git clone https://github.com/TUO-UTENTE/TUO-REPO.git" },
      { label: "Entra nella cartella", cmd: "cd TUO-REPO" },
      { label: "Installa le dipendenze", cmd: "npm install" },
    ],
    notes: []
  },
  {
    id: 2,
    icon: Terminal,
    color: "bg-violet-600",
    title: "Configura il base path (vite.config.js)",
    desc: "Se pubblichi in una sottocartella (es. /contaplus/) devi impostare il base. Se pubblichi nella root del dominio, lascia '/'.",
    commands: [],
    code: `// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',          // <-- '/' se root del dominio
                      // '/contaplus/' se sottocartella
  build: {
    outDir: 'dist',   // cartella output della build
  }
})`,
    notes: [
      "Se il sito è https://tuodominio.com → base: '/'",
      "Se il sito è https://tuodominio.com/contaplus/ → base: '/contaplus/'"
    ]
  },
  {
    id: 3,
    icon: Terminal,
    color: "bg-blue-600",
    title: "Esegui la Build",
    desc: "Genera i file statici ottimizzati nella cartella /dist",
    commands: [
      { label: "Build produzione", cmd: "npm run build" },
      { label: "Anteprima locale (opzionale)", cmd: "npm run preview" },
    ],
    notes: [
      "Al termine troverai la cartella /dist con index.html e gli asset",
      "La cartella /dist è quella da caricare su smarterasp.net"
    ]
  },
  {
    id: 4,
    icon: Globe,
    color: "bg-emerald-600",
    title: "Pubblica su smarterasp.net",
    desc: "Carica il contenuto della cartella /dist tramite FTP o File Manager del pannello",
    commands: [
      { label: "Cartella da caricare", cmd: "dist/  →  public_html/ (o wwwroot/)" },
    ],
    notes: [
      "Carica TUTTO il contenuto di /dist (non la cartella stessa)",
      "Su smarterasp.net la root web è solitamente /wwwroot o /public_html",
      "Puoi usare FileZilla (FTP) oppure il File Manager del pannello di controllo"
    ]
  },
  {
    id: 5,
    icon: Globe,
    color: "bg-amber-600",
    title: "Configura il rewrite per React Router (web.config)",
    desc: "React usa il routing lato client — IIS deve reindirizzare tutte le URL a index.html. Scegli la versione in base a dove pubblichi.",
    commands: [],
    code: `<?xml version="1.0" encoding="UTF-8"?>
<!-- ✅ VERSIONE ROOT DEL DOMINIO (es. https://tuodominio.com) -->
<!-- Salva come web.config nella stessa cartella di index.html -->
<configuration>
  <system.webServer>

    <!-- Abilita il modulo URL Rewrite (già presente su smarterasp.net) -->
    <rewrite>
      <rules>
        <rule name="React Router SPA" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <!-- Non riscrivere file fisici (js, css, immagini) -->
            <add input="{REQUEST_FILENAME}" matchType="IsFile"      negate="true" />
            <!-- Non riscrivere cartelle fisiche -->
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <!-- Tutto il resto → index.html (React gestisce il routing) -->
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>

    <!-- Pagina di errore personalizzata (opzionale ma consigliata) -->
    <httpErrors errorMode="Custom" existingResponse="Replace">
      <remove statusCode="404" />
      <error statusCode="404" path="/index.html" responseMode="ExecuteURL" />
    </httpErrors>

  </system.webServer>
</configuration>

<!-- -------------------------------------------------------
  ✅ VERSIONE SOTTOCARTELLA (es. https://tuodominio.com/contaplus/)
  Cambia solo la riga <action>:
  <action type="Rewrite" url="/contaplus/index.html" />
  E aggiungi nelle conditions:
  <add input="{REQUEST_URI}" pattern="^/contaplus" />
------------------------------------------------------- -->`,
    notes: [
      "⚠️ Il modulo URL Rewrite è già installato su smarterasp.net (IIS) — non serve installarlo",
      "Senza web.config: refresh della pagina = errore 404 da IIS",
      "Il file va messo nella root del sito (stessa cartella di index.html)",
      "Se usi HTTPS, smarterasp.net gestisce il certificato SSL dal pannello — non serve configurarlo nel web.config",
      "Se hai un dominio personalizzato, configuralo prima nel pannello smarterasp.net"
    ]
  },
  {
    id: 6,
    icon: Database,
    color: "bg-red-600",
    title: "Crea il Database MSSQL",
    desc: "Dal pannello smarterasp.net crea il DB ed esegui lo script SQL",
    commands: [
      { label: "File schema già pronto", cmd: "contaplus_schema.md  (nel progetto)" },
    ],
    notes: [
      "Pannello smarterasp.net → Database → SQL Server → Crea nuovo DB",
      "Apri il Query Editor e incolla il contenuto di contaplus_schema.md",
      "Esegui prima la tabella Registrazione, poi MovimentoContabile, poi PianoDeiConti",
      "Salva le credenziali DB (server, nome, utente, password)"
    ]
  }
];

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative mt-3">
      <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{code}</pre>
      <button onClick={copy} className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors">
        {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function CommandLine({ cmd, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2 mt-2">
      <span className="text-gray-500 text-xs min-w-fit">{label}:</span>
      <code className="text-green-400 text-xs flex-1 font-mono">{cmd}</code>
      <button onClick={copy} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
        {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function GuidaDeploy() {
  const [open, setOpen] = useState({ 1: true });
  const toggle = (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guida al Deploy</h1>
          <p className="text-sm text-gray-500 mt-0.5">Da GitHub → Build → smarterasp.net</p>
        </div>
      </div>

      {/* Alert prerequisiti */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Prerequisiti sul tuo PC</p>
          <ul className="space-y-0.5 text-xs">
            <li>✓ <strong>Node.js</strong> v18+ installato — <a href="https://nodejs.org" target="_blank" className="underline">nodejs.org</a></li>
            <li>✓ <strong>Git</strong> installato — <a href="https://git-scm.com" target="_blank" className="underline">git-scm.com</a></li>
            <li>✓ <strong>FileZilla</strong> (opzionale, per FTP) — <a href="https://filezilla-project.org" target="_blank" className="underline">filezilla-project.org</a></li>
          </ul>
        </div>
      </div>

      {/* Steps */}
      {steps.map(step => {
        const Icon = step.icon;
        const isOpen = open[step.id];
        return (
          <div key={step.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggle(step.id)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className={`w-8 h-8 ${step.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">STEP {step.id}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
              </div>
              {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>

            {isOpen && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-sm text-gray-600 mt-3 mb-2">{step.desc}</p>

                {step.commands?.map((c, i) => (
                  <CommandLine key={i} cmd={c.cmd} label={c.label} />
                ))}

                {step.code && <CodeBlock code={step.code} />}

                {step.notes?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {step.notes.map((n, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                        <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>{n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Riepilogo finale */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <p className="font-bold text-emerald-800">Riepilogo file da caricare su smarterasp.net</p>
        </div>
        <div className="space-y-1 text-sm text-emerald-700 font-mono">
          <p>wwwroot/</p>
          <p className="pl-4">├── index.html</p>
          <p className="pl-4">├── web.config  ← <span className="font-sans text-xs text-emerald-600">IMPORTANTE per React Router</span></p>
          <p className="pl-4">├── assets/</p>
          <p className="pl-8">├── index-[hash].js</p>
          <p className="pl-8">└── index-[hash].css</p>
        </div>
      </div>
    </div>
  );
}