import { useState } from 'react';
import { Settings, Copy, Check, Key, Globe, Code2 } from 'lucide-react';

function useBaseUrl() {
  return typeof window !== 'undefined' ? window.location.origin : 'https://seu-dominio.vercel.app';
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      title="Copiar"
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors shrink-0"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

interface CodeBlockProps {
  code: string;
}

function CodeBlock({ code }: CodeBlockProps) {
  return (
    <div className="relative group">
      <div className="absolute top-2.5 right-2.5 z-10">
        <CopyButton text={code} />
      </div>
      <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 text-xs rounded-xl p-4 pr-24 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

export default function Configuracoes() {
  const baseUrl = useBaseUrl();
  const [apiKey, setApiKey] = useState('');

  const keyPlaceholder = apiKey || 'SUA_API_KEY';

  const curlDoc = `curl -X GET "${baseUrl}/api/leads" \\
  -H "x-api-key: ${keyPlaceholder}"`;

  const curlMinimo = `curl -X POST "${baseUrl}/api/leads" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${keyPlaceholder}" \\
  -d '{
    "telefone": "11999999999",
    "origem": "feira_sp_2025"
  }'`;

  const curlCompleto = `curl -X POST "${baseUrl}/api/leads" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${keyPlaceholder}" \\
  -d '{
    "telefone": "11999999999",
    "origem": "feira_sp_2025",
    "nome": "João Silva",
    "email": "joao@escola.com",
    "nome_escola": "Escola Exemplo",
    "relacao_escola": "diretor",
    "ja_e_cliente": false,
    "estado": "SP",
    "cidade": "São Paulo",
    "porte_alunos": "100-500",
    "maior_interesse": "agenda",
    "rede_ensino": "privada",
    "nivel_interesse": "quente",
    "nome_consultor": "Maria",
    "observacoes": "Veio pelo estande B12",
    "stage": "novo"
  }'`;

  const respostaSucesso = `{
  "ok": true,
  "lead": {
    "id": "uuid-gerado",
    "telefone": "11999999999",
    "origem": "feira_sp_2025",
    "nome": "João Silva",
    "stage": "novo",
    "created_at": "2025-05-02T14:00:00Z",
    ...
  }
}`;

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-gray-400 dark:text-gray-500" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Integrações e documentação da API</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">

        {/* Seção: API */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Code2 size={18} className="text-primary-600 dark:text-primary-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Integração via API</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Use o endpoint abaixo para criar leads diretamente de outros sistemas, como formulários, eventos ou automações.
          </p>

          {/* URL base + API Key */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">URL base</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-gray-700 dark:text-gray-300 break-all flex-1">{baseUrl}</code>
                <CopyButton text={baseUrl} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Key size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">API Key</span>
              </div>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole aqui sua LEADS_API_KEY"
                className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                Configure <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">LEADS_API_KEY</code> nas env vars do Vercel
              </p>
            </div>
          </div>

          {/* Campos */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-3">Campos</h3>
            <div className="space-y-1.5">
              {[
                { campo: 'telefone', tipo: 'string', obrigatorio: true, desc: 'Número do WhatsApp' },
                { campo: 'origem', tipo: 'string', obrigatorio: true, desc: 'Identificador do evento/canal' },
                { campo: 'nome', tipo: 'string', obrigatorio: false, desc: 'Nome do contato' },
                { campo: 'email', tipo: 'string', obrigatorio: false, desc: 'E-mail' },
                { campo: 'nome_escola', tipo: 'string', obrigatorio: false, desc: 'Nome da escola' },
                { campo: 'relacao_escola', tipo: 'string', obrigatorio: false, desc: 'diretor / coordenador / professor / outro' },
                { campo: 'ja_e_cliente', tipo: 'boolean', obrigatorio: false, desc: 'Padrão: false' },
                { campo: 'estado', tipo: 'string', obrigatorio: false, desc: 'UF (ex: SP)' },
                { campo: 'cidade', tipo: 'string', obrigatorio: false, desc: 'Cidade' },
                { campo: 'porte_alunos', tipo: 'string', obrigatorio: false, desc: 'Faixa de alunos' },
                { campo: 'nivel_interesse', tipo: 'string', obrigatorio: false, desc: 'quente / morno / frio' },
                { campo: 'nome_consultor', tipo: 'string', obrigatorio: false, desc: 'Consultor responsável' },
                { campo: 'observacoes', tipo: 'string', obrigatorio: false, desc: 'Anotações livres' },
                { campo: 'stage', tipo: 'string', obrigatorio: false, desc: 'Etapa no kanban. Padrão: novo' },
              ].map(({ campo, tipo, obrigatorio, desc }) => (
                <div key={campo} className="flex items-center gap-3 text-xs py-1 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <code className="w-32 shrink-0 text-primary-700 dark:text-primary-400 font-medium">{campo}</code>
                  <span className="w-14 shrink-0 text-gray-400 dark:text-gray-500">{tipo}</span>
                  <span className={`w-20 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-center ${
                    obrigatorio
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {obrigatorio ? 'obrigatório' : 'opcional'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exemplos de requisição */}
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                Ver documentação completa
              </p>
              <CodeBlock code={curlDoc} />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                Criar lead — campos mínimos
              </p>
              <CodeBlock code={curlMinimo} />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                Criar lead — todos os campos
              </p>
              <CodeBlock code={curlCompleto} />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                Resposta de sucesso (HTTP 201)
              </p>
              <CodeBlock code={respostaSucesso} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
