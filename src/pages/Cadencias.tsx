import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock, Plus, Pencil, Trash2, Power, PowerOff,
  ChevronDown, Check, Calendar, AlertTriangle,
} from 'lucide-react';
import { useCadencias } from '../hooks/useCadencias';
import { useTemplates } from '../hooks/useTemplates';
import { useLeads } from '../hooks/useLeads';
import type { Cadencia } from '../types/cadencia';
import { DIAS_SEMANA } from '../types/cadencia';
import { getTemplateBody, getTemplateHeaderImageUrl } from '../lib/meta';
import type { MetaTemplateFull } from '../lib/meta';

// ─── Constantes ───────────────────────────────────────────────────────────────

const SEGMENTOS = [
  { id: 'quentes',     label: 'Leads quentes' },
  { id: 'mornos',     label: 'Leads mornos' },
  { id: 'frios',      label: 'Leads frios' },
  { id: 'proposta',   label: 'Proposta enviada' },
  { id: 'negociacao', label: 'Em negociação' },
  { id: 'aquecimento',label: 'Aquecimento' },
  { id: 'clientes',   label: 'Já é cliente' },
  { id: 'convertidos',label: 'Convertidos' },
  { id: 'novos',      label: 'Novos leads' },
];

const HORAS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}));

// ─── Multi-select genérico ────────────────────────────────────────────────────

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}

function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} selecionados`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 transition-colors"
      >
        <span className={selected.length > 0 ? 'text-primary-700 font-medium' : 'text-gray-400'}>
          {label}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">Nenhuma opção</p>
          ) : (
            <>
              {options.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                      {checked && <Check size={10} className="text-white" />}
                    </span>
                    <span className={checked ? 'text-primary-700 font-medium' : 'text-gray-700'}>{opt.label}</span>
                  </button>
                );
              })}
              {selected.length > 0 && (
                <div className="border-t border-gray-100 px-3 py-2">
                  <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:text-gray-600">
                    Limpar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Formatação de dias ───────────────────────────────────────────────────────

function formatDias(dias: number[]): string {
  if (dias.length === 7) return 'Todos os dias';
  if (dias.length === 0) return 'Nenhum dia';
  const sorted = [...dias].sort((a, b) => {
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.indexOf(a) - order.indexOf(b);
  });
  return sorted.map((d) => DIAS_SEMANA.find((x) => x.value === d)?.label ?? d).join(', ');
}

function formatUltimaExecucao(iso?: string): string {
  if (!iso) return 'Nunca executado';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Modal de criação/edição ───────────────────────────────────────────────────

interface FormState {
  nome: string;
  templateNome: string;
  segmentoIds: string[];
  origemIds: string[];
  diasSemana: number[];
  horario: number;
}

const FORM_INICIAL: FormState = {
  nome: '',
  templateNome: '',
  segmentoIds: [],
  origemIds: [],
  diasSemana: [1, 2, 3, 4, 5],
  horario: 9,
};

interface ModalProps {
  cadencia: Cadencia | null;
  metaTemplates: MetaTemplateFull[];
  todasOrigens: string[];
  onSave: (data: FormState) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function CadenciaModal({ cadencia, metaTemplates, todasOrigens, onSave, onClose, saving }: ModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    cadencia
      ? {
          nome: cadencia.nome,
          templateNome: cadencia.templateNome,
          segmentoIds: cadencia.segmentoIds,
          origemIds: cadencia.origemIds,
          diasSemana: cadencia.diasSemana,
          horario: cadencia.horario,
        }
      : FORM_INICIAL
  );

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const toggleDia = (d: number) =>
    set('diasSemana', form.diasSemana.includes(d) ? form.diasSemana.filter((x) => x !== d) : [...form.diasSemana, d]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  const isValid = form.nome.trim() && form.templateNome && form.diasSemana.length > 0;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {cadencia ? 'Editar cadência' : 'Nova cadência'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Configure o agendamento automático</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Nome */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">Nome da cadência</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              placeholder="Ex: Follow-up leads quentes – seg/qua/sex"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Template */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">Template</label>
            <select
              value={form.templateNome}
              onChange={(e) => set('templateNome', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Selecione um template</option>
              {metaTemplates.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} {t.status !== 'APPROVED' ? `(${t.status})` : ''}
                </option>
              ))}
            </select>
            {metaTemplates.length === 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={12} /> Nenhum template Meta carregado
              </p>
            )}
          </div>

          {/* Dias da semana */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-2">Dias da semana</label>
            <div className="flex gap-2 flex-wrap">
              {DIAS_SEMANA.map(({ value, label }) => {
                const active = form.diasSemana.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDia(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {form.diasSemana.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Selecione ao menos um dia</p>
            )}
          </div>

          {/* Horário */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">
              Horário (horário de Brasília)
            </label>
            <select
              value={form.horario}
              onChange={(e) => set('horario', Number(e.target.value))}
              className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {HORAS.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>

          {/* Segmentos */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">Segmento</label>
            <MultiSelect
              options={SEGMENTOS.map((s) => ({ value: s.id, label: s.label }))}
              selected={form.segmentoIds}
              onChange={(v) => set('segmentoIds', v)}
              placeholder="Todos os segmentos"
            />
          </div>

          {/* Origem */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">Origem</label>
            <MultiSelect
              options={todasOrigens.map((o) => ({ value: o, label: o }))}
              selected={form.origemIds}
              onChange={(v) => set('origemIds', v)}
              placeholder="Todas as origens"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={(e) => { e.preventDefault(); if (isValid) onSave(form); }}
            disabled={!isValid || saving}
            className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Salvando…' : cadencia ? 'Salvar alterações' : 'Criar cadência'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de cadência ─────────────────────────────────────────────────────────

interface CardProps {
  cadencia: Cadencia;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function CadenciaCard({ cadencia, onEdit, onDelete, onToggle }: CardProps) {
  const segLabels = cadencia.segmentoIds.length > 0
    ? cadencia.segmentoIds.map((id) => SEGMENTOS.find((s) => s.id === id)?.label ?? id).join(', ')
    : 'Todos os segmentos';

  const origemLabel = cadencia.origemIds.length > 0
    ? cadencia.origemIds.join(', ')
    : 'Todas as origens';

  return (
    <div className={`bg-white rounded-xl border ${cadencia.ativo ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-5 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
            cadencia.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {cadencia.ativo ? 'Ativo' : 'Pausado'}
          </span>
          <h3 className="text-sm font-bold text-gray-900 truncate">{cadencia.nome}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            title={cadencia.ativo ? 'Pausar' : 'Ativar'}
            className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
          >
            {cadencia.ativo ? <PowerOff size={15} /> : <Power size={15} />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="shrink-0 text-gray-400" />
          <span className="font-medium text-gray-700">{formatDias(cadencia.diasSemana)}</span>
          <span>·</span>
          <Clock size={12} className="shrink-0 text-gray-400" />
          <span className="font-medium text-gray-700">{String(cadencia.horario).padStart(2, '0')}:00 BRT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Template:</span>
          <span className="font-medium text-gray-700 truncate">{cadencia.templateNome}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Segmento:</span>
          <span className="truncate">{segLabels}</span>
        </div>
        {cadencia.origemIds.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">Origem:</span>
            <span className="truncate">{origemLabel}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-gray-400">Última execução:</span>
          <span>{formatUltimaExecucao(cadencia.ultimaExecucao)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Cadencias() {
  const { cadencias, loading, saveCadencia, updateCadencia, deleteCadencia, toggleAtivo } = useCadencias();
  const { metaTemplates, metaLoading } = useTemplates();
  const { leads } = useLeads();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cadencia | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const todasOrigens = useMemo(() => {
    const set = new Set(leads.map((l) => l.origem).filter(Boolean));
    return Array.from(set).sort();
  }, [leads]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Cadencia) => { setEditing(c); setModalOpen(true); };

  const handleSave = async (form: {
    nome: string; templateNome: string; segmentoIds: string[];
    origemIds: string[]; diasSemana: number[]; horario: number;
  }) => {
    setSaving(true);
    const template = metaTemplates.find((t) => t.name === form.templateNome);
    const templateCorpo = template ? getTemplateBody(template.components) : '';
    const hasImage = template
      ? template.components.some((c) => c.type === 'HEADER' && c.format === 'IMAGE')
      : false;
    const imageUrl = template ? getTemplateHeaderImageUrl(template.components) : undefined;

    if (editing) {
      await updateCadencia(editing.id, {
        nome: form.nome,
        templateNome: form.templateNome,
        templateCorpo,
        hasImage,
        imageUrl,
        segmentoIds: form.segmentoIds,
        origemIds: form.origemIds,
        diasSemana: form.diasSemana,
        horario: form.horario,
      });
    } else {
      await saveCadencia({
        nome: form.nome,
        templateNome: form.templateNome,
        templateCorpo,
        hasImage,
        imageUrl,
        segmentoIds: form.segmentoIds,
        origemIds: form.origemIds,
        diasSemana: form.diasSemana,
        horario: form.horario,
        ativo: true,
      });
    }
    setSaving(false);
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteCadencia(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Cadências</h1>
            <p className="text-sm text-gray-500 mt-0.5">Disparos automáticos agendados por dia e hora</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nova cadência
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Info sobre o cron */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
          <Clock size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            As cadências são executadas automaticamente a cada hora cheia (horário de Brasília) pelo servidor.
            O template e os filtros de segmento/origem são aplicados no momento do disparo.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cadencias.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">Nenhuma cadência configurada</p>
            <p className="text-xs text-gray-400 mt-1 mb-5">Crie uma para automatizar seus disparos</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
            >
              <Plus size={15} />
              Criar primeira cadência
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cadencias.map((c) => (
              <CadenciaCard
                key={c.id}
                cadencia={c}
                onEdit={() => openEdit(c)}
                onToggle={() => toggleAtivo(c.id)}
                onDelete={() => setDeleteConfirm(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modalOpen && (
        <CadenciaModal
          cadencia={editing}
          metaTemplates={metaTemplates}
          todasOrigens={todasOrigens}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          saving={saving || metaLoading}
        />
      )}

      {/* Confirm delete */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">Excluir cadência?</p>
            <p className="text-xs text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
