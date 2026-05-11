import { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, Send, X, Upload, Download, FileText, AlertCircle, CheckCircle2, Pencil, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import { useTemplates } from '../hooks/useTemplates';
import type { Lead } from '../types/lead';
import { STAGES } from '../types/lead';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  { key: 'nome',           label: 'nome',             required: false, desc: 'Nome completo do contato' },
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
  onImport: (rows: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<{ inserted: number; failed: number; errors: string[] }>;
}

function ImportCSVModal({ onClose, onImport }: ImportCSVModalProps) {
  const [tab, setTab] = useState<'import' | 'guide'>('import');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number; errors: string[] } | null>(null);
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
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
        <button
          onClick={() => setTab('import')}
          className={`py-2.5 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'import'
              ? 'border-primary-600 text-primary-700 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span className="flex items-center gap-1.5"><Upload size={14} /> Importar Arquivo</span>
        </button>
        <button
          onClick={() => setTab('guide')}
          className={`py-2.5 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'guide'
              ? 'border-primary-600 text-primary-700 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={22} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Importação concluída</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {result.inserted} lead(s) importado(s) com sucesso
                  {result.failed > 0 && `, ${result.failed} com falha`}.
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-3 text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 max-h-32 overflow-y-auto">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Detalhes dos erros:</p>
                    {result.errors.map((err, idx) => (
                      <p key={idx} className="text-xs text-red-600 dark:text-red-400">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* File pick area */}
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                >
                  <Upload size={28} className="mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {fileName ? fileName : 'Clique para selecionar um arquivo CSV'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Separador vírgula (,) ou ponto e vírgula (;) · UTF-8</p>
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
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{rows.length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Linhas lidas</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-green-700 dark:text-green-400">{validRows.length}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Válidas</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${errorRows.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                        <p className={`text-xl font-bold ${errorRows.length > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>{errorRows.length}</p>
                        <p className={`text-xs ${errorRows.length > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>Com erro</p>
                      </div>
                    </div>

                    {/* Preview */}
                    {validRows.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          Prévia (primeiros {Math.min(validRows.length, 5)} de {validRows.length})
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                <th className="text-left px-3 py-2 font-semibold text-gray-500 dark:text-gray-400">Nome</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-500 dark:text-gray-400">Telefone</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-500 dark:text-gray-400">Origem</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-500 dark:text-gray-400">Escola</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {validRows.slice(0, 5).map((r, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{r.lead!.nome}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.lead!.telefone}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.lead!.origem}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.lead!.nomeEscola || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {errorRows.length > 0 && (
                      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <AlertCircle size={14} className="text-red-500 dark:text-red-400" />
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400">{errorRows.length} linha(s) com erro serão ignoradas</p>
                        </div>
                        <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                          {errorRows.slice(0, 10).map((r, i) => (
                            <li key={i} className="text-xs text-red-600 dark:text-red-400">
                              Linha {rows.indexOf(r) + 2}: {r.errors.join(', ')}
                              {r.raw.nome ? ` — "${r.raw.nome}"` : ''}
                            </li>
                          ))}
                          {errorRows.length > 10 && (
                            <li className="text-xs text-red-400 dark:text-red-500">... e mais {errorRows.length - 10} erro(s)</li>
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
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A planilha deve estar no formato <strong>CSV</strong> (separador vírgula ou ponto e vírgula).
              Apenas as colunas marcadas como <span className="text-red-600 font-medium">obrigatórias</span> são necessárias;
              as demais podem ser omitidas ou deixadas em branco.
            </p>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Coluna</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Formato / Valores aceitos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {CSV_COLUMNS.map((col) => (
                    <tr key={col.key} className={col.required ? 'bg-red-50/30 dark:bg-red-900/10' : ''}>
                      <td className="px-3 py-2 font-mono font-medium text-gray-800 dark:text-gray-200">{col.label}</td>
                      <td className="px-3 py-2">
                        {col.required ? (
                          <span className="text-red-600 font-semibold">Obrigatório</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Opcional</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{col.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
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
        primeiro_nome: lead.nome?.split(' ')[0] ?? '',
        telefone: lead.telefone,
        email: lead.email,
        nomeEscola: lead.nomeEscola,
        stage: lead.stage,
        ...(template ? {
          template_id: template.id,
          template_nome: normalizeName(template.nome),
          media_type: template.midia?.toLowerCase().endsWith('.pdf') ? 'document' : template.midia ? 'image' : 'text',
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
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Template (opcional)</label>
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

type LeadFormData = Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY_LEAD_FORM: LeadFormData = {
  nome: '',
  email: '',
  telefone: '',
  nomeEscola: '',
  relacaoEscola: '',
  jaECliente: false,
  estado: '',
  cidade: '',
  porteAlunos: '',
  maiorInteresse: undefined,
  redeEnsino: '',
  nivelInteresse: undefined,
  nomeConsultor: '',
  observacoes: '',
  stage: 'novo',
  origem: '',
};

interface LeadFormModalProps {
  lead?: Lead | null;
  onClose: () => void;
  onSave: (data: LeadFormData, id?: string) => Promise<void>;
}

function LeadFormModal({ lead, onClose, onSave }: LeadFormModalProps) {
  const isEdit = !!lead;
  const [form, setForm] = useState<LeadFormData>(
    lead
      ? {
          nome: lead.nome ?? '',
          email: lead.email ?? '',
          telefone: lead.telefone ?? '',
          nomeEscola: lead.nomeEscola ?? '',
          relacaoEscola: lead.relacaoEscola ?? '',
          jaECliente: lead.jaECliente ?? false,
          estado: lead.estado ?? '',
          cidade: lead.cidade ?? '',
          porteAlunos: lead.porteAlunos ?? '',
          maiorInteresse: lead.maiorInteresse,
          redeEnsino: lead.redeEnsino ?? '',
          nivelInteresse: lead.nivelInteresse,
          nomeConsultor: lead.nomeConsultor ?? '',
          observacoes: lead.observacoes ?? '',
          stage: lead.stage ?? 'novo',
          origem: lead.origem ?? '',
        }
      : { ...EMPTY_LEAD_FORM }
  );
  const [saving, setSaving] = useState(false);

  const set = (key: keyof LeadFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.telefone || !form.origem) return;
    setSaving(true);
    await onSave(
      {
        ...form,
        estado: form.estado || undefined,
        cidade: form.cidade || undefined,
        porteAlunos: form.porteAlunos || undefined,
        redeEnsino: form.redeEnsino || undefined,
        nomeConsultor: form.nomeConsultor || undefined,
        observacoes: form.observacoes || undefined,
      },
      lead?.id
    );
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Nome</label>
            <Input
              placeholder="Nome completo"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
              Telefone <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="11999999999"
              value={form.telefone}
              onChange={(e) => set('telefone', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">E-mail</label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
              Origem <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Ex: Evento Abril, Sorteio..."
              value={form.origem}
              onChange={(e) => set('origem', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Nome da Escola</label>
            <Input
              placeholder="Escola ABC"
              value={form.nomeEscola}
              onChange={(e) => set('nomeEscola', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Relação com a Escola</label>
            <Select value={form.relacaoEscola} onChange={(e) => set('relacaoEscola', e.target.value)}>
              <option value="">Selecionar...</option>
              {RELACAO_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Estado</label>
            <Input
              placeholder="SP"
              value={form.estado}
              onChange={(e) => set('estado', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Cidade</label>
            <Input
              placeholder="São Paulo"
              value={form.cidade}
              onChange={(e) => set('cidade', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Porte de Alunos</label>
            <Select value={form.porteAlunos} onChange={(e) => set('porteAlunos', e.target.value)}>
              <option value="">Selecionar...</option>
              {PORTE_OPTIONS.map((p) => <option key={p} value={p}>{p} alunos</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Rede de Ensino</label>
            <Input
              placeholder="Rede XYZ"
              value={form.redeEnsino}
              onChange={(e) => set('redeEnsino', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Maior Interesse</label>
            <Select
              value={form.maiorInteresse ?? ''}
              onChange={(e) => set('maiorInteresse', (e.target.value as Lead['maiorInteresse']) || undefined)}
            >
              <option value="">Selecionar...</option>
              <option value="agenda_edu">Agenda Edu</option>
              <option value="pagamentos">Pagamentos</option>
              <option value="ambos">Ambos</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Nível de Interesse</label>
            <Select
              value={form.nivelInteresse ?? ''}
              onChange={(e) => set('nivelInteresse', (e.target.value as Lead['nivelInteresse']) || undefined)}
            >
              <option value="">Selecionar...</option>
              <option value="quente">Quente</option>
              <option value="morno">Morno</option>
              <option value="frio">Frio</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Consultor</label>
            <Input
              placeholder="Nome do consultor"
              value={form.nomeConsultor}
              onChange={(e) => set('nomeConsultor', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Já é cliente?</label>
            <Select
              value={form.jaECliente ? 'sim' : 'nao'}
              onChange={(e) => set('jaECliente', e.target.value === 'sim')}
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Etapa do Funil</label>
            <Select value={form.stage} onChange={(e) => set('stage', e.target.value)}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Observações</label>
          <textarea
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Observações adicionais..."
            value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)}
          />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !form.telefone || !form.origem}
        >
          {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Lead'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

interface Filters {
  busca: string;
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
  busca: '',
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

// ─── Definições estáticas de filtros ─────────────────────────────────────────

const STATIC_FILTER_DEFS: Record<string, { label: string; options: { value: string; label: string }[] }> = {
  origem: {
    label: 'Origem',
    options: [
      { value: 'sorteio', label: 'Sorteio' },
      { value: 'consultor', label: 'Consultor' },
    ],
  },
  relacao: {
    label: 'Relação',
    options: RELACAO_OPTIONS.map((r) => ({ value: r, label: r })),
  },
  porte: {
    label: 'Porte',
    options: PORTE_OPTIONS.map((p) => ({ value: p, label: `${p} alunos` })),
  },
  jaECliente: {
    label: 'Cliente?',
    options: [
      { value: 'sim', label: 'Sim' },
      { value: 'nao', label: 'Não' },
    ],
  },
  maiorInteresse: {
    label: 'Interesse',
    options: [
      { value: 'agenda_edu', label: 'Agenda Edu' },
      { value: 'pagamentos', label: 'Pagamentos' },
      { value: 'ambos', label: 'Ambos' },
    ],
  },
  nivelInteresse: {
    label: 'Nível',
    options: [
      { value: 'quente', label: 'Quente' },
      { value: 'morno', label: 'Morno' },
      { value: 'frio', label: 'Frio' },
    ],
  },
  stage: {
    label: 'Etapa',
    options: STAGES.map((s) => ({ value: s.id, label: s.title })),
  },
};

// ─── FilterBar component ──────────────────────────────────────────────────────

interface FilterBarProps {
  filters: Filters;
  onSet: (key: keyof Filters, value: string) => void;
  onClear: () => void;
  estados: string[];
  consultores: string[];
  totalResult: number;
}

function FilterBar({ filters, onSet, onClear, estados, consultores, totalResult }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setStep(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Merge dynamic options into filter defs
  const filterDefs = useMemo<Record<string, { label: string; options: { value: string; label: string }[] }>>(() => ({
    ...STATIC_FILTER_DEFS,
    estado: { label: 'Estado', options: estados.map((e) => ({ value: e, label: e })) },
    consultor: { label: 'Consultor', options: consultores.map((c) => ({ value: c, label: c })) },
  }), [estados, consultores]);

  // Filters that are categorical (not busca)
  const categoricalKeys = Object.keys(filterDefs) as (keyof Filters)[];

  // Active categorical filters
  const activeChips = categoricalKeys.filter((k) => filters[k]);

  // Available filters to add (those not yet active)
  const availableKeys = categoricalKeys.filter((k) => !filters[k] && filterDefs[k].options.length > 0);

  const getValueLabel = (key: string, value: string) => {
    return filterDefs[key]?.options.find((o) => o.value === value)?.label ?? value;
  };

  const handleSelectCategory = (key: string) => {
    if (filterDefs[key].options.length === 1) {
      onSet(key as keyof Filters, filterDefs[key].options[0].value);
      setOpen(false);
      setStep(null);
    } else {
      setStep(key);
    }
  };

  const handleSelectValue = (key: string, value: string) => {
    onSet(key as keyof Filters, value);
    setOpen(false);
    setStep(null);
  };

  const hasAnyFilter = filters.busca || activeChips.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
      {/* Search + chips + add-filter row */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Busca por nome */}
        <div className="relative flex-shrink-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={filters.busca}
            onChange={(e) => onSet('busca', e.target.value)}
            placeholder="Nome ou telefone..."
            className="h-7 pl-7 pr-3 w-48 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Active filter chips */}
        {activeChips.map((key) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 text-xs text-primary-700 dark:text-primary-300 font-medium"
          >
            <span className="text-primary-500 dark:text-primary-400">{filterDefs[key]?.label}:</span>
            {getValueLabel(key, filters[key])}
            <button
              onClick={() => onSet(key, '')}
              className="ml-0.5 text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        ))}

        {/* Add filter dropdown */}
        {availableKeys.length > 0 && (
          <div ref={ref} className="relative">
            <button
              onClick={() => { setOpen((o) => !o); setStep(null); }}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <Plus size={11} />
              Adicionar filtro
            </button>

            {open && (
              <div className="absolute left-0 top-full mt-1 z-40 min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                {step === null ? (
                  /* Category list */
                  <>
                    <p className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                      Filtrar por
                    </p>
                    {availableKeys.map((key) => (
                      <button
                        key={key}
                        onClick={() => handleSelectCategory(key)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {filterDefs[key].label}
                        <ChevronRight size={13} className="text-gray-400" />
                      </button>
                    ))}
                  </>
                ) : (
                  /* Options for selected category */
                  <>
                    <button
                      onClick={() => setStep(null)}
                      className="flex items-center gap-1 w-full px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 transition-colors"
                    >
                      <ChevronLeft size={12} />
                      {filterDefs[step].label}
                    </button>
                    {filterDefs[step].options.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectValue(step, opt.value)}
                        className="flex w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Clear all */}
        {hasAnyFilter && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 h-7 px-2 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <X size={11} />
            Limpar
          </button>
        )}

        {/* Result count — pushed to the right */}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {totalResult} resultado{totalResult !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

export default function Leads() {
  const { leads, saveLead, updateLead, deleteLead, importLeads } = useLeads();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [disparoLead, setDisparoLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const handleSaveLead = async (data: LeadFormData, id?: string) => {
    if (id) {
      await updateLead(id, data);
    } else {
      await saveLead(data);
    }
  };

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

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filters.busca) {
        const busca = filters.busca.toLowerCase();
        const nome = (l.nome ?? '').toLowerCase();
        const tel = (l.telefone ?? '').replace(/\D/g, '');
        const buscaTel = filters.busca.replace(/\D/g, '');
        if (!nome.includes(busca) && !tel.includes(buscaTel)) return false;
      }
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
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Base de Leads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{leads.length} lead(s) cadastrado(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
            <Upload size={14} />
            Importar CSV
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onSet={setFilter}
        onClear={() => setFilters(EMPTY_FILTERS)}
        estados={estados}
        consultores={consultores}
        totalResult={filtered.length}
      />

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p className="text-sm">Nenhum lead encontrado</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Escola</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Relação</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Porte</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Interesse</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nível</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Consultor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Origem</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Etapa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{lead.nome}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{lead.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{lead.telefone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{lead.nomeEscola}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{lead.relacaoEscola || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{lead.porteAlunos || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{lead.estado || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={lead.jaECliente ? 'sim' : 'nao'}>
                        {lead.jaECliente ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {lead.maiorInteresse ? INTERESSE_LABELS[lead.maiorInteresse] : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {lead.nivelInteresse ? (
                        <Badge variant={nivelVariant(lead.nivelInteresse)}>
                          {lead.nivelInteresse.charAt(0).toUpperCase() + lead.nivelInteresse.slice(1)}
                        </Badge>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{lead.nomeConsultor || '—'}</td>
                    <td className="px-4 py-3">
                      {lead.origem === 'sorteio' || lead.origem === 'consultor' ? (
                        <Badge variant={lead.origem === 'sorteio' ? 'sorteio' : 'consultor'}>
                          {lead.origem === 'sorteio' ? 'Sorteio' : 'Consultor'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{lead.origem}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{stageLabel(lead.stage)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatDate(lead.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditLead(lead)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                          title="Editar lead"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDisparoLead(lead)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Disparar mensagem"
                        >
                          <Send size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
      {editLead && (
        <LeadFormModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSave={handleSaveLead}
        />
      )}
      {showCreate && (
        <LeadFormModal
          onClose={() => setShowCreate(false)}
          onSave={handleSaveLead}
        />
      )}
      {showImport && (
        <ImportCSVModal
          onClose={() => setShowImport(false)}
          onImport={importLeads}
        />
      )}
    </div>
  );
}
