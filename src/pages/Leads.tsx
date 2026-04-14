import { useState, useMemo, useRef } from 'react';
import { Trash2, Send, ChevronDown, Filter, X, Upload, Download, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import { useTemplates } from '../hooks/useTemplates';
import type { Lead } from '../types/lead';
import { STAGES } from '../types/lead';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { dispararMensagem } from '../lib/webhook';
import { normalizeName } from '../lib/meta';
import { formatDate } from '../lib/utils';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '../components/ui/dialog';

const RELACAO_OPTIONS = ['Diretor', 'Coordenador', 'Professor', 'Outro'];
const PORTE_OPTIONS = ['Até 100', '100-300', '300-500', '500+'];

// ─── CSV Import ───────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  { key: 'telefone',       label: 'telefone',        required: true,  desc: 'Número com DDD, apenas dígitos (ex: 11999999999)' },
  { key: 'nome',           label: 'nome',             required: true,  desc: 'Nome completo do contato' },
  { key: 'origem',         label: 'origem',           required: true,  desc: 'Texto livre (ex: Evento X, Indicação, sorteio...)' },
  { key: 'email',          label: 'email',            required: false, desc: 'E-mail do contato' },
  { key: 'nome_escola',    label: 'nome_escola',      required: false, desc: 'Nome da escola ou instituição' },
  { key: 'relacao_escola', label: 'relacao_escola',   required: false, desc: 'Diretor | Coordenador | Professor | Outro' },
  { key: 'ja_e_cliente',   label: 'ja_e_cliente',     required: false, desc: 'sim | nao  (padrão: nao)' },
  { key: 'estado',         label: 'estado',           required: false, desc: 'Sigla UF (ex: SP, RJ, MG)' },
  { key: 'cidade',         label: 'cidade',           required: false, desc: 'Nome da cidade' },
  { key: 'porte_alunos',   label: 'porte_alunos',     required: false, desc: 'Até 100 | 100-300 | 300-500 | 500+' },
  { key: 'maior_interesse',label: 'maior_interesse',  required: false, desc: 'agenda_edu | pagamentos | ambos' },
  { key: 'rede_ensino',    label: 'rede_ensino',      required: false, desc: 'Nome da rede de ensino' },
  { key: 'nivel_interesse',label: 'nivel_interesse',  required: false, desc: 'quente | morno | frio' },
  { key: 'nome_consultor', label: 'nome_consultor',   required: false, desc: 'Nome do consultor responsável' },
  { key: 'observacoes',    label: 'observacoes',      required: false, desc: 'Observações gerais' },
  { key: 'stage',          label: 'stage',            required: false, desc: 'novo | contato | aquecimento | proposta | negociacao | convertido | perdido  (padrão: novo)' },
];

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

interface ParsedRow {
  raw: Record<string, string>;
  lead?: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>;
  errors: string[];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.replace(/\r/g, '').trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = parseCSVLine(lines[0], sep).map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line, sep);
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => { raw[h] = (values[i] ?? '').trim(); });

    const errors: string[] = [];
    if (!raw.nome) errors.push('Nome obrigatório');
    if (!raw.telefone) errors.push('Telefone obrigatório');
    if (!raw.origem) errors.push('Origem obrigatória');

    if (errors.length > 0) return { raw, errors };

    const lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
      nome: raw.nome,
      email: raw.email ?? '',
      telefone: raw.telefone,
      nomeEscola: raw.nome_escola ?? '',
      relacaoEscola: raw.relacao_escola ?? '',
      jaECliente: raw.ja_e_cliente?.toLowerCase() === 'sim',
      estado: raw.estado || undefined,
      cidade: raw.cidade || undefined,
      porteAlunos: raw.porte_alunos || undefined,
      maiorInteresse: (raw.maior_interesse as Lead['maiorInteresse']) || undefined,
      redeEnsino: raw.rede_ensino || undefined,
      nivelInteresse: (raw.nivel_interesse as Lead['nivelInteresse']) || undefined,
      nomeConsultor: raw.nome_consultor || undefined,
      observacoes: raw.observacoes || undefined,
      stage: raw.stage || 'novo',
      origem: raw.origem,
    };
    return { raw, lead, errors: [] };
  });
}

function downloadTemplate() {
  const header = CSV_COLUMNS.map((c) => c.key).join(',');
  const example = [
    '11999999999', 'João Silva', 'Evento Abril', 'joao@escola.com',
    'Escola ABC', 'Diretor', 'nao', 'SP', 'São Paulo',
    '100-300', 'agenda_edu', '', 'quente', 'Pedro', '', 'novo',
  ].join(',');
  const blob = new Blob([header + '\n' + example], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_importacao_leads.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface ImportCSVModalProps {
  onClose: () => void;
  onImport: (rows: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<{ inserted: number; failed: number }>;
}

function ImportCSVModal({ onClose, onImport }: ImportCSVModalProps) {
  const [tab, setTab] = useState<'import' | 'guide'>('import');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter((r) => r.errors.length === 0 && r.lead);
  const errorRows = rows.filter((r) => r.errors.length > 0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    const leads = validRows.map((r) => r.lead!);
    if (leads.length === 0) return;
    setImporting(true);
    const res = await onImport(leads);
    setResult(res);
    setImporting(false);
  };

  return (
    <Dialog open onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Importar Leads via CSV</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-6">
        <button
          onClick={() => setTab('import')}
          className={`py-2.5 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'import'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-1.5"><Upload size={14} /> Importar Arquivo</span>
        </button>
        <button
          onClick={() => setTab('guide')}
          className={`py-2.5 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'guide'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-1.5"><FileText size={14} /> Planilha Modelo</span>
        </button>
      </div>

      <DialogBody className="space-y-4">
        {tab === 'import' && (
          <>
            {result ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={22} className="text-green-600" />
                </div>
                <p className="font-semibold text-gray-900 mb-1">Importação concluída</p>
                <p className="text-sm text-gray-600">
                  {result.inserted} lead(s) importado(s) com sucesso
                  {result.failed > 0 && `, ${result.failed} com falha`}.
                </p>
              </div>
            ) : (
              <>
                {/* File pick area */}
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                >
                  <Upload size={28} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    {fileName ? fileName : 'Clique para selecionar um arquivo CSV'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Separador vírgula (,) ou ponto e vírgula (;) · UTF-8</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFile}
                  />
                </div>

                {rows.length > 0 && (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-gray-900">{rows.length}</p>
                        <p className="text-xs text-gray-500">Linhas lidas</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-green-700">{validRows.length}</p>
                        <p className="text-xs text-green-600">Válidas</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${errorRows.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <p className={`text-xl font-bold ${errorRows.length > 0 ? 'text-red-700' : 'text-gray-400'}`}>{errorRows.length}</p>
                        <p className={`text-xs ${errorRows.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>Com erro</p>
                      </div>
                    </div>

                    {/* Preview */}
                    {validRows.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Prévia (primeiros {Math.min(validRows.length, 5)} de {validRows.length})
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-semibold text-gray-500">Nome</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-500">Telefone</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-500">Origem</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-500">Escola</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {validRows.slice(0, 5).map((r, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 text-gray-800">{r.lead!.nome}</td>
                                  <td className="px-3 py-2 text-gray-600">{r.lead!.telefone}</td>
                                  <td className="px-3 py-2 text-gray-600">{r.lead!.origem}</td>
                                  <td className="px-3 py-2 text-gray-600">{r.lead!.nomeEscola || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {errorRows.length > 0 && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <AlertCircle size={14} className="text-red-500" />
                          <p className="text-xs font-semibold text-red-700">{errorRows.length} linha(s) com erro serão ignoradas</p>
                        </div>
                        <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                          {errorRows.slice(0, 10).map((r, i) => (
                            <li key={i} className="text-xs text-red-600">
                              Linha {rows.indexOf(r) + 2}: {r.errors.join(', ')}
                              {r.raw.nome ? ` — "${r.raw.nome}"` : ''}
                            </li>
                          ))}
                          {errorRows.length > 10 && (
                            <li className="text-xs text-red-400">... e mais {errorRows.length - 10} erro(s)</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {tab === 'guide' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              A planilha deve estar no formato <strong>CSV</strong> (separador vírgula ou ponto e vírgula).
              Apenas as colunas marcadas como <span className="text-red-600 font-medium">obrigatórias</span> são necessárias;
              as demais podem ser omitidas ou deixadas em branco.
            </p>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Coluna</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Formato / Valores aceitos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {CSV_COLUMNS.map((col) => (
                    <tr key={col.key} className={col.required ? 'bg-red-50/30' : ''}>
                      <td className="px-3 py-2 font-mono font-medium text-gray-800">{col.label}</td>
                      <td className="px-3 py-2">
                        {col.required ? (
                          <span className="text-red-600 font-semibold">Obrigatório</span>
                        ) : (
                          <span className="text-gray-400">Opcional</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{col.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Dica:</strong> Baixe a planilha modelo abaixo para ter um exemplo com todas as colunas preenchidas corretamente.
            </div>
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        {tab === 'guide' && (
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download size={14} />
            Baixar Planilha Modelo
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onClose}>
          {result ? 'Fechar' : 'Cancelar'}
        </Button>
        {tab === 'import' && !result && (
          <Button
            size="sm"
            onClick={handleImport}
            disabled={validRows.length === 0 || importing}
          >
            <Upload size={14} />
            {importing ? 'Importando...' : `Importar ${validRows.length} lead(s)`}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
const INTERESSE_LABELS: Record<string, string> = {
  agenda_edu: 'Agenda Edu',
  pagamentos: 'Pagamentos',
  ambos: 'Ambos',
};

function nivelVariant(nivel?: string): 'quente' | 'morno' | 'frio' | 'secondary' {
  if (nivel === 'quente') return 'quente';
  if (nivel === 'morno') return 'morno';
  if (nivel === 'frio') return 'frio';
  return 'secondary';
}

function stageLabel(stageId: string) {
  return STAGES.find((s) => s.id === stageId)?.title ?? stageId;
}

interface DisparoModalProps {
  lead: Lead | null;
  onClose: () => void;
}

function DisparoModal({ lead, onClose }: DisparoModalProps) {
  const { templates } = useTemplates();
  const [templateId, setTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  if (!lead) return null;

  const handleDisparo = async () => {
    setLoading(true);
    try {
      const template = templates.find((t) => t.id === templateId);
      await dispararMensagem({
        lead_id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email,
        nomeEscola: lead.nomeEscola,
        stage: lead.stage,
        ...(template ? {
          template_id: template.id,
          template_nome: normalizeName(template.nome),
          has_image: !!template.midia,
          image_url: template.midia ?? undefined,
        } : {}),
      });
      setResult('success');
    } catch {
      setResult('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Disparar Mensagem</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogBody className="space-y-4">
        {result === 'success' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send size={20} className="text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-700">Mensagem disparada com sucesso!</p>
          </div>
        ) : result === 'error' ? (
          <p className="text-sm text-red-600 text-center">Erro ao disparar mensagem.</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Disparar mensagem para <strong>{lead.nome}</strong> ({lead.telefone})
            </p>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Template (opcional)</label>
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Sem template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </Select>
            </div>
          </>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        {!result && (
          <Button size="sm" onClick={handleDisparo} disabled={loading}>
            <Send size={14} />
            {loading ? 'Enviando...' : 'Disparar'}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}

interface EditStageModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSave: (id: string, stage: string) => void;
}

function EditStageModal({ lead, onClose, onSave }: EditStageModalProps) {
  const [stage, setStage] = useState(lead?.stage ?? 'novo');
  if (!lead) return null;
  return (
    <Dialog open onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Mover Etapa</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogBody>
        <p className="text-sm text-gray-600 mb-3">{lead.nome}</p>
        <Select value={stage} onChange={(e) => setStage(e.target.value)}>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </Select>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={() => { onSave(lead.id, stage); onClose(); }}>Salvar</Button>
      </DialogFooter>
    </Dialog>
  );
}

interface Filters {
  origem: string;
  porte: string;
  estado: string;
  jaECliente: string;
  maiorInteresse: string;
  nivelInteresse: string;
  consultor: string;
  relacao: string;
  stage: string;
}

const EMPTY_FILTERS: Filters = {
  origem: '',
  porte: '',
  estado: '',
  jaECliente: '',
  maiorInteresse: '',
  nivelInteresse: '',
  consultor: '',
  relacao: '',
  stage: '',
};

export default function Leads() {
  const { leads, updateLeadStage, deleteLead, importLeads } = useLeads();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [disparoLead, setDisparoLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Derive unique consultors and states from data
  const consultores = useMemo(() => {
    const set = new Set(leads.map((l) => l.nomeConsultor).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [leads]);

  const estados = useMemo(() => {
    const set = new Set(leads.map((l) => l.estado).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [leads]);

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const activeCount = Object.values(filters).filter(Boolean).length;

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filters.origem && l.origem !== filters.origem) return false;
      if (filters.porte && l.porteAlunos !== filters.porte) return false;
      if (filters.estado && l.estado !== filters.estado) return false;
      if (filters.jaECliente !== '') {
        const val = filters.jaECliente === 'sim';
        if (l.jaECliente !== val) return false;
      }
      if (filters.maiorInteresse && l.maiorInteresse !== filters.maiorInteresse) return false;
      if (filters.nivelInteresse && l.nivelInteresse !== filters.nivelInteresse) return false;
      if (filters.consultor && l.nomeConsultor !== filters.consultor) return false;
      if (filters.relacao && l.relacaoEscola !== filters.relacao) return false;
      if (filters.stage && l.stage !== filters.stage) return false;
      return true;
    });
  }, [leads, filters]);

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      deleteLead(id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Base de Leads</h1>
          <p className="text-sm text-gray-500">{leads.length} lead(s) cadastrado(s)</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
          <Upload size={14} />
          Importar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Filtros</span>
          {activeCount > 0 && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="ml-auto flex items-center gap-1 text-xs text-primary-600 hover:underline"
            >
              <X size={12} />
              Limpar {activeCount} filtro(s)
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <Select
            className="h-8 text-xs"
            value={filters.origem}
            onChange={(e) => setFilter('origem', e.target.value)}
          >
            <option value="">Formulário de origem</option>
            <option value="sorteio">Sorteio</option>
            <option value="consultor">Consultor</option>
          </Select>

          <Select
            className="h-8 text-xs"
            value={filters.relacao}
            onChange={(e) => setFilter('relacao', e.target.value)}
          >
            <option value="">Relação com a escola</option>
            {RELACAO_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>

          <Select
            className="h-8 text-xs"
            value={filters.porte}
            onChange={(e) => setFilter('porte', e.target.value)}
          >
            <option value="">Porte de alunos</option>
            {PORTE_OPTIONS.map((p) => (
              <option key={p} value={p}>{p} alunos</option>
            ))}
          </Select>

          <Select
            className="h-8 text-xs"
            value={filters.estado}
            onChange={(e) => setFilter('estado', e.target.value)}
          >
            <option value="">Estado</option>
            {estados.length > 0
              ? estados.map((e) => <option key={e} value={e}>{e}</option>)
              : null}
          </Select>

          <Select
            className="h-8 text-xs"
            value={filters.jaECliente}
            onChange={(e) => setFilter('jaECliente', e.target.value)}
          >
            <option value="">Já é cliente?</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </Select>

          <Select
            className="h-8 text-xs"
            value={filters.maiorInteresse}
            onChange={(e) => setFilter('maiorInteresse', e.target.value)}
          >
            <option value="">Maior interesse</option>
            <option value="agenda_edu">Agenda Edu</option>
            <option value="pagamentos">Pagamentos</option>
            <option value="ambos">Ambos</option>
          </Select>

          <Select
            className="h-8 text-xs"
            value={filters.nivelInteresse}
            onChange={(e) => setFilter('nivelInteresse', e.target.value)}
          >
            <option value="">Nível de interesse</option>
            <option value="quente">Quente</option>
            <option value="morno">Morno</option>
            <option value="frio">Frio</option>
          </Select>

          <Select
            className="h-8 text-xs"
            value={filters.consultor}
            onChange={(e) => setFilter('consultor', e.target.value)}
          >
            <option value="">Consultor</option>
            {consultores.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>

          <Select
            className="h-8 text-xs"
            value={filters.stage}
            onChange={(e) => setFilter('stage', e.target.value)}
          >
            <option value="">Etapa do funil</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </Select>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filtered.length} resultado(s)</p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p className="text-sm">Nenhum lead encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Escola</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Relação</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Porte</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Interesse</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nível</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consultor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Origem</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Etapa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{lead.nome}</p>
                      <p className="text-xs text-gray-500">{lead.email}</p>
                      <p className="text-xs text-gray-500">{lead.telefone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{lead.nomeEscola}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{lead.relacaoEscola || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{lead.porteAlunos || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{lead.estado || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={lead.jaECliente ? 'sim' : 'nao'}>
                        {lead.jaECliente ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {lead.maiorInteresse ? INTERESSE_LABELS[lead.maiorInteresse] : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {lead.nivelInteresse ? (
                        <Badge variant={nivelVariant(lead.nivelInteresse)}>
                          {lead.nivelInteresse.charAt(0).toUpperCase() + lead.nivelInteresse.slice(1)}
                        </Badge>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{lead.nomeConsultor || '—'}</td>
                    <td className="px-4 py-3">
                      {lead.origem === 'sorteio' || lead.origem === 'consultor' ? (
                        <Badge variant={lead.origem === 'sorteio' ? 'sorteio' : 'consultor'}>
                          {lead.origem === 'sorteio' ? 'Sorteio' : 'Consultor'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{lead.origem}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{stageLabel(lead.stage)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(lead.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditLead(lead)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Mover etapa"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={() => setDisparoLead(lead)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Disparar mensagem"
                        >
                          <Send size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DisparoModal lead={disparoLead} onClose={() => setDisparoLead(null)} />
      <EditStageModal
        lead={editLead}
        onClose={() => setEditLead(null)}
        onSave={updateLeadStage}
      />
      {showImport && (
        <ImportCSVModal
          onClose={() => setShowImport(false)}
          onImport={importLeads}
        />
      )}
    </div>
  );
}
