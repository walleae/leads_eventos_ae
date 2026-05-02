import { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Plus, Pencil, Trash2, Power, PowerOff, ChevronDown, Check, AlertTriangle, Timer } from 'lucide-react';
import { useCadencias } from '../hooks/useCadencias';
import { useSegmentos } from '../hooks/useSegmentos';
import { useTemplates } from '../hooks/useTemplates';
import { useLeads } from '../hooks/useLeads';
import type { Cadencia } from '../types/cadencia';
import { getTemplateBody, getTemplateHeaderImageUrl } from '../lib/meta';
import type { MetaTemplateFull } from '../lib/meta';

// ─── Multi-select genérico ────────────────────────────────────────────────────

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}

function MultiSelect({ options, selected, onChange, placeholder, disabled }: MultiSelectProps) {
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
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected.length > 0 ? 'text-primary-700 dark:text-primary-400 font-medium' : 'text-gray-400 dark:text-gray-500'}>
          {label}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Nenhuma opção disponível</p>
          ) : (
            <>
              {options.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700'}`}>
                      {checked && <Check size={10} className="text-white" />}
                    </span>
                    <span className={checked ? 'text-primary-700 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-200'}>{opt.label}</span>
                  </button>
                );
              })}
              {selected.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-600 px-3 py-2">
                  <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
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

// ─── Modal de criação/edição ───────────────────────────────────────────────────

interface FormState {
  nome: string;
  templateNome: string;
  segmentoIds: string[];
  origemIds: string[];
  delayValor: number;
  delayUnidade: 'horas' | 'dias';
}

const FORM_INICIAL: FormState = {
  nome: '',
  templateNome: '',
  segmentoIds: [],
  origemIds: [],
  delayValor: 1,
  delayUnidade: 'dias',
};

interface ModalProps {
  cadencia: Cadencia | null;
  metaTemplates: MetaTemplateFull[];
  segmentosAtivos: { value: string; label: string }[];
  todasOrigens: string[];
  onSave: (data: FormState) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function CadenciaModal({ cadencia, metaTemplates, segmentosAtivos, todasOrigens, onSave, onClose, saving }: ModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    cadencia
      ? {
          nome: cadencia.nome,
          templateNome: cadencia.templateNome,
          segmentoIds: cadencia.segmentoIds,
          origemIds: cadencia.origemIds,
          delayValor: cadencia.delayValor,
          delayUnidade: cadencia.delayUnidade,
        }
      : FORM_INICIAL
  );

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const isValid = form.nome.trim() && form.templateNome && form.delayValor >= 1;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {cadencia ? 'Editar cadência' : 'Nova cadência'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Disparo automático baseado no tempo desde a criação do lead
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (isValid) onSave(form); }} className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Nome */}
          <div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 block mb-1.5">Nome da cadência</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              placeholder="Ex: Boas-vindas 2h após cadastro"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Template */}
          <div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 block mb-1.5">Template</label>
            <select
              value={form.templateNome}
              onChange={(e) => set('templateNome', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
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

          {/* Delay */}
          <div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 block mb-1.5">
              Enviar após a criação do lead
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={form.delayValor}
                onChange={(e) => set('delayValor', Math.max(1, Number(e.target.value)))}
                className="w-24 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={form.delayUnidade}
                onChange={(e) => set('delayUnidade', e.target.value as 'horas' | 'dias')}
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="horas">hora(s)</option>
                <option value="dias">dia(s)</option>
              </select>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              O disparo ocorre uma única vez por lead, {form.delayValor} {form.delayUnidade === 'horas' ? `hora${form.delayValor > 1 ? 's' : ''}` : `dia${form.delayValor > 1 ? 's' : ''}`} após a criação.
            </p>
          </div>

          {/* Segmentos */}
          <div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 block mb-1.5">
              Segmento
              {segmentosAtivos.length === 0 && (
                <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                  — ative segmentos na tela de Segmentos
                </span>
              )}
            </label>
            <MultiSelect
              options={segmentosAtivos}
              selected={form.segmentoIds}
              onChange={(v) => set('segmentoIds', v)}
              placeholder="Todos os segmentos ativos"
              disabled={segmentosAtivos.length === 0}
            />
          </div>

          {/* Origem */}
          <div>
            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 block mb-1.5">Origem</label>
            <MultiSelect
              options={todasOrigens.map((o) => ({ value: o, label: o }))}
              selected={form.origemIds}
              onChange={(v) => set('origemIds', v)}
              placeholder="Todas as origens"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { if (isValid) onSave(form); }}
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
  segmentoLabels: Map<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function CadenciaCard({ cadencia, segmentoLabels, onEdit, onDelete, onToggle }: CardProps) {
  const segLabels = cadencia.segmentoIds.length > 0
    ? cadencia.segmentoIds.map((id) => segmentoLabels.get(id) ?? id).join(', ')
    : 'Todos os segmentos';

  const origemLabel = cadencia.origemIds.length > 0
    ? cadencia.origemIds.join(', ')
    : 'Todas as origens';

  const delayLabel = `${cadencia.delayValor} ${cadencia.delayUnidade === 'horas'
    ? `hora${cadencia.delayValor > 1 ? 's' : ''}`
    : `dia${cadencia.delayValor > 1 ? 's' : ''}`} após criação`;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${cadencia.ativo ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-700 opacity-60'} p-5 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
            cadencia.ativo ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            {cadencia.ativo ? 'Ativo' : 'Pausado'}
          </span>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{cadencia.nome}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToggle} title={cadencia.ativo ? 'Pausar' : 'Ativar'}
            className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
            {cadencia.ativo ? <PowerOff size={15} /> : <Power size={15} />}
          </button>
          <button onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
            <Pencil size={15} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <Timer size={12} className="shrink-0 text-gray-400 dark:text-gray-500" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">{delayLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 dark:text-gray-500">Template:</span>
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{cadencia.templateNome}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 dark:text-gray-500">Segmento:</span>
          <span className="truncate">{segLabels}</span>
        </div>
        {cadencia.origemIds.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 dark:text-gray-500">Origem:</span>
            <span className="truncate">{origemLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Cadencias() {
  const { cadencias, loading, saveCadencia, updateCadencia, deleteCadencia, toggleAtivo } = useCadencias();
  const { segmentos } = useSegmentos();
  const { metaTemplates, metaLoading } = useTemplates();
  const { leads } = useLeads();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cadencia | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const segmentosAtivos = useMemo(
    () => segmentos.filter((s) => s.cadenciaAtiva).map((s) => ({ value: s.id, label: s.label })),
    [segmentos]
  );

  const segmentoLabels = useMemo(
    () => new Map(segmentos.map((s) => [s.id, s.label])),
    [segmentos]
  );

  const todasOrigens = useMemo(() => {
    const set = new Set(leads.map((l) => l.origem).filter(Boolean));
    return Array.from(set).sort();
  }, [leads]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Cadencia) => { setEditing(c); setModalOpen(true); };

  const handleSave = async (form: FormState) => {
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
        delayValor: form.delayValor,
        delayUnidade: form.delayUnidade,
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
        delayValor: form.delayValor,
        delayUnidade: form.delayUnidade,
        ativo: true,
      });
    }
    setSaving(false);
    setModalOpen(false);
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cadências</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Disparos automáticos baseados no tempo desde a criação do lead
            </p>
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

      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
          <Clock size={16} className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Cada cadência dispara <strong>uma única vez por lead</strong>, no delay configurado após a criação.
            O cron roda a cada hora e processa os leads elegíveis automaticamente.
          </p>
        </div>

        {segmentosAtivos.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Nenhum segmento com cadência ativa. Vá em <strong>Segmentos</strong> e ative os segmentos desejados.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cadencias.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Timer size={24} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nenhuma cadência configurada</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-5">Crie uma para automatizar seus disparos</p>
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
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
                segmentoLabels={segmentoLabels}
                onEdit={() => openEdit(c)}
                onToggle={() => toggleAtivo(c.id)}
                onDelete={() => setDeleteConfirm(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <CadenciaModal
          cadencia={editing}
          metaTemplates={metaTemplates}
          segmentosAtivos={segmentosAtivos}
          todasOrigens={todasOrigens}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          saving={saving || metaLoading}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500 dark:text-red-400" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Excluir cadência?</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={async () => { await deleteCadencia(deleteConfirm); setDeleteConfirm(null); }}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FormState {
  nome: string;
  templateNome: string;
  segmentoIds: string[];
  origemIds: string[];
  delayValor: number;
  delayUnidade: 'horas' | 'dias';
}
