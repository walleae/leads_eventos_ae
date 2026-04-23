import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Send, Users, AlertTriangle, CheckCircle, Link2, MessageCircle,
  ShieldCheck, ChevronDown, ChevronUp, Check, Calendar,
} from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import type { Lead } from '../types/lead';
import { STAGES } from '../types/lead';
import { dispararMensagem } from '../lib/webhook';
import { getTemplateBody, getTemplateHeaderImageUrl } from '../lib/meta';
import type { MetaTemplateFull, MetaTemplateComponent } from '../lib/meta';
import { supabase } from '../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Filtros {
  stages: string[];
  niveis: string[];
  portes: string[];
  relacoes: string[];
  origens: string[];
  interesses: string[];
  jaECliente: '' | 'sim' | 'nao';
  estados: string[];
}

const FILTROS_VAZIOS: Filtros = {
  stages: [], niveis: [], portes: [], relacoes: [],
  origens: [], interesses: [], jaECliente: '', estados: [],
};

// ─── Segmentos pré-definidos ──────────────────────────────────────────────────

interface Segmento {
  id: string;
  label: string;
  filtros: Partial<Filtros>;
}

const SEGMENTOS: Segmento[] = [
  { id: 'quentes',      label: 'Leads quentes 🔴',     filtros: { niveis: ['quente'] } },
  { id: 'mornos',       label: 'Leads mornos 🟡',      filtros: { niveis: ['morno'] } },
  { id: 'frios',        label: 'Leads frios 🔵',        filtros: { niveis: ['frio'] } },
  { id: 'proposta',     label: 'Proposta enviada',     filtros: { stages: ['proposta'] } },
  { id: 'negociacao',   label: 'Em negociação',         filtros: { stages: ['negociacao'] } },
  { id: 'aquecimento',  label: 'Aquecimento',           filtros: { stages: ['aquecimento'] } },
  { id: 'clientes',     label: 'Já é cliente',          filtros: { jaECliente: 'sim' } },
  { id: 'convertidos',  label: 'Convertidos',           filtros: { stages: ['convertido'] } },
  { id: 'novos',        label: 'Novos leads',           filtros: { stages: ['novo'] } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyFiltros(leads: Lead[], f: Filtros): Lead[] {
  return leads.filter((l) => {
    if (f.stages.length    && !f.stages.includes(l.stage))                                        return false;
    if (f.niveis.length    && (!l.nivelInteresse || !f.niveis.includes(l.nivelInteresse)))        return false;
    if (f.portes.length    && (!l.porteAlunos    || !f.portes.includes(l.porteAlunos)))           return false;
    if (f.relacoes.length  && !f.relacoes.includes(l.relacaoEscola))                              return false;
    if (f.origens.length   && !f.origens.includes(l.origem))                                       return false;
    if (f.interesses.length && (!l.maiorInteresse || !f.interesses.includes(l.maiorInteresse)))   return false;
    if (f.jaECliente === 'sim' && !l.jaECliente)                                                    return false;
    if (f.jaECliente === 'nao' && l.jaECliente)                                                     return false;
    if (f.estados.length   && (!l.estado || !f.estados.includes(l.estado)))                        return false;
    return true;
  });
}

// ─── Multi-select genérico ────────────────────────────────────────────────────

interface MultiSelectOption { value: string; label: string; }

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  emptyText?: string;
}

function MultiSelect({ options, selected, onChange, placeholder, emptyText }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };

  const selectedLabels = selected.map(
    (v) => options.find((o) => o.value === v)?.label ?? v
  );

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? selectedLabels[0]
      : `${selected.length} selecionados`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 transition-colors"
      >
        <span className={selected.length > 0 ? 'text-primary-700 font-medium' : 'text-gray-500'}>
          {label}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">{emptyText ?? 'Nenhuma opção'}</p>
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
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300 bg-white'
                    }`}>
                      {checked && <Check size={10} className="text-white" />}
                    </span>
                    <span className={checked ? 'text-primary-700 font-medium' : 'text-gray-700'}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
              {selected.length > 0 && (
                <div className="border-t border-gray-100 px-3 py-2">
                  <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:text-gray-600">
                    Limpar seleção
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

// ─── WhatsApp Preview ─────────────────────────────────────────────────────────

function renderWaText(text: string) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) return <strong key={i}>{part.slice(1, -1)}</strong>;
    if (part.startsWith('_') && part.endsWith('_')) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('~') && part.endsWith('~')) return <s key={i}>{part.slice(1, -1)}</s>;
    return <span key={i}>{part}</span>;
  });
}

function WhatsAppBubble({ components }: { components: MetaTemplateComponent[] }) {
  const body = getTemplateBody(components);
  const imgUrl = getTemplateHeaderImageUrl(components);
  const buttons = components.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
  const footer = components.find((c) => c.type === 'FOOTER')?.text;
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="flex-1 p-4 overflow-y-auto"
      style={{
        background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.12'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"), #ECE5DD`,
      }}
    >
      <div className="flex justify-end">
        <div className="max-w-[85%] w-full">
          <div className="bg-[#DCF8C6] rounded-xl rounded-tr-sm px-3 py-2 shadow-sm">
            {imgUrl && (
              <div className="mb-2 rounded-lg overflow-hidden">
                <img src={imgUrl} alt="Header" className="w-full max-h-48 object-cover" />
              </div>
            )}
            {!imgUrl && components.find((c) => c.type === 'HEADER' && c.format === 'IMAGE') && (
              <div className="mb-2 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-400">Imagem do header</span>
              </div>
            )}
            {body && (
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-snug">
                {renderWaText(body)}
              </p>
            )}
            {footer && (
              <p className="text-xs text-gray-500 mt-1">{footer}</p>
            )}
            <p className="text-right text-[10px] text-gray-500 mt-1">{now} ✓✓</p>
          </div>
          {buttons.length > 0 && (
            <div className="mt-1 space-y-1">
              {buttons.map((btn, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 shadow-sm border border-gray-100"
                >
                  {btn.type === 'URL'
                    ? <Link2 size={12} className="text-[#128C7E]" />
                    : <MessageCircle size={12} className="text-[#128C7E]" />
                  }
                  <span className="text-sm text-[#128C7E] font-medium">{btn.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Disparar() {
  const navigate = useNavigate();
  const location = useLocation();
  const template = location.state?.template as MetaTemplateFull | undefined;
  const supabaseImageUrl = location.state?.imageUrl as string | undefined;

  const { leads } = useLeads();

  const [segmentoIds, setSegmentoIds] = useState<string[]>([]);
  const [origemFilter, setOrigemFilter] = useState<string[]>([]);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [listaOpen, setListaOpen] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [enviadoCount, setEnviadoCount] = useState(0);
  const [modoEnvio, setModoEnvio] = useState<'imediato' | 'agendado'>('imediato');
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [agendadoPara, setAgendadoPara] = useState('');

  useEffect(() => {
    if (!template) navigate('/templates', { replace: true });
  }, [template, navigate]);

  // Limpa exclusões quando o filtro muda
  useEffect(() => {
    setExcludedIds(new Set());
    setConfirmado(false);
  }, [segmentoIds, origemFilter]);

  const todasOrigens = useMemo(() => {
    const set = new Set(leads.map((l) => l.origem).filter(Boolean));
    return Array.from(set).sort();
  }, [leads]);

  const leadsAlvo = useMemo(() => {
    // Filtro por origem
    const base = origemFilter.length > 0
      ? leads.filter((l) => origemFilter.includes(l.origem))
      : leads;

    // Filtro por segmento: OR entre todos os selecionados (vazio = todos)
    if (segmentoIds.length === 0) return base;

    return base.filter((l) =>
      segmentoIds.some((segId) => {
        const seg = SEGMENTOS.find((s) => s.id === segId);
        if (!seg) return false;
        return applyFiltros([l], { ...FILTROS_VAZIOS, ...seg.filtros }).length > 0;
      })
    );
  }, [leads, origemFilter, segmentoIds]);

  // Leads que realmente serão enviados (descontando excluídos manualmente)
  const leadsEnvio = useMemo(
    () => leadsAlvo.filter((l) => !excludedIds.has(l.id)),
    [leadsAlvo, excludedIds]
  );

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setConfirmado(false);
  };

  const reincluirTodos = () => {
    setExcludedIds(new Set());
    setConfirmado(false);
  };

  // Marcar/desmarcar todos os visíveis
  const toggleTodosVisiveis = (visíveis: Lead[]) => {
    const todosChecked = visíveis.every((l) => !excludedIds.has(l.id));
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (todosChecked) {
        visíveis.forEach((l) => next.add(l.id));
      } else {
        visíveis.forEach((l) => next.delete(l.id));
      }
      return next;
    });
    setConfirmado(false);
  };

  if (!template) return null;

  const corpo = getTemplateBody(template.components);
  const stageLabel = (id: string) => STAGES.find((s) => s.id === id)?.title ?? id;

  const handleEnviar = async () => {
    if (!confirmado) return;
    if (modoEnvio === 'agendado') {
      if (!dataAgendamento) {
        setErrorMsg('Selecione uma data e hora para o agendamento.');
        setResult('error');
        return;
      }
      if (new Date(dataAgendamento) <= new Date()) {
        setErrorMsg('A data e hora do agendamento deve ser no futuro.');
        setResult('error');
        return;
      }
    }
    setSending(true);
    const leadsPayload = leadsEnvio.map((l) => ({
      id: l.id,
      nome: l.nome,
      telefone: l.telefone,
      email: l.email,
      nomeEscola: l.nomeEscola,
      stage: l.stage,
      estado: l.estado,
    }));
    try {
      if (modoEnvio === 'imediato') {
        await dispararMensagem({
          template_nome: template.name,
          template_corpo: corpo,
          has_image: template.components.some((c) => c.type === 'HEADER' && c.format === 'IMAGE'),
          image_url: supabaseImageUrl,
          segmento: segmentoIds.join(',') || 'todos',
          telefones: leadsEnvio.map((l) => l.telefone).join(','),
          leads: leadsPayload,
        });
      } else {
        const { error } = await supabase.from('disparos_agendados').insert({
          template_nome: template.name,
          template_corpo: corpo,
          has_image: template.components.some((c) => c.type === 'HEADER' && c.format === 'IMAGE'),
          image_url: supabaseImageUrl ?? null,
          segmento: segmentoIds.join(',') || 'todos',
          leads_json: leadsPayload,
          agendar_para: new Date(dataAgendamento).toISOString(),
        });
        if (error) throw new Error(error.message);
        setAgendadoPara(dataAgendamento);
      }
      setEnviadoCount(leadsEnvio.length);
      setResult('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao processar');
      setResult('error');
    } finally {
      setSending(false);
    }
  };

  if (result === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-white">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          {modoEnvio === 'agendado'
            ? <Calendar size={28} className="text-green-600" />
            : <CheckCircle size={28} className="text-green-600" />}
        </div>
        <div className="text-center">
          {modoEnvio === 'agendado' ? (
            <>
              <p className="text-lg font-bold text-gray-900">Disparo agendado!</p>
              <p className="text-sm text-gray-500 mt-1">
                {enviadoCount} lead{enviadoCount !== 1 ? 's' : ''} receberão o template{' '}
                <strong>{template.name}</strong> em{' '}
                {new Date(agendadoPara).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-gray-900">Disparo enviado com sucesso!</p>
              <p className="text-sm text-gray-500 mt-1">
                {enviadoCount} lead{enviadoCount !== 1 ? 's' : ''} notificado{enviadoCount !== 1 ? 's' : ''} com o template <strong>{template.name}</strong>.
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => navigate('/templates')}
          className="mt-2 px-4 py-2 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
        >
          Voltar para Templates
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/templates')}
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">{template.name}</h1>
          <p className="text-xs text-gray-500">Selecione o público e envie a campanha</p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

          {/* ── Público-alvo ── */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <Users size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">Público-alvo</h2>
            </div>

            <div className="px-5 pb-5 space-y-5 pt-5">
              {/* Origem */}
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-2">Origem</label>
                <MultiSelect
                  options={todasOrigens.map((o) => ({ value: o, label: o }))}
                  selected={origemFilter}
                  onChange={(v) => { setOrigemFilter(v); setConfirmado(false); }}
                  placeholder="Todas as origens"
                  emptyText="Nenhuma origem disponível"
                />
              </div>

              {/* Segmento */}
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-2">Segmento</label>
                <MultiSelect
                  options={SEGMENTOS.map((s) => ({ value: s.id, label: s.label }))}
                  selected={segmentoIds}
                  onChange={(v) => { setSegmentoIds(v); setConfirmado(false); }}
                  placeholder="Todos os segmentos"
                />
              </div>
            </div>
          </section>

          {/* ── Verificações de segurança ── */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">Verificações de segurança</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg">
                <Users size={18} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Leads afetados</p>
                  <p className="text-xl font-bold text-gray-900">{leadsEnvio.length}</p>
                  {excludedIds.size > 0 && (
                    <p className="text-xs text-amber-600">{excludedIds.size} excluído{excludedIds.size !== 1 ? 's' : ''} manualmente</p>
                  )}
                </div>
              </div>

              {leadsEnvio.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-3 border border-red-200 bg-red-50 rounded-lg">
                  <AlertTriangle size={18} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-xs text-red-600 font-medium">Sem leads</p>
                    <p className="text-xs text-red-500">Nenhum lead neste segmento</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 border border-green-200 bg-green-50 rounded-lg">
                  <CheckCircle size={18} className="text-green-500 shrink-0" />
                  <div>
                    <p className="text-xs text-green-600 font-medium">Segmento OK</p>
                    <p className="text-xs text-green-500">{leadsEnvio.length} lead{leadsEnvio.length !== 1 ? 's' : ''} válido{leadsEnvio.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 px-4 py-3 border border-gray-200 rounded-lg">
                <Send size={18} className="text-gray-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Template</p>
                  <p className="text-sm font-medium text-gray-800 truncate" title={template.name}>{template.name}</p>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2.5 mt-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                disabled={leadsEnvio.length === 0}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 accent-primary-600"
              />
              <span className="text-sm text-gray-700">
                {modoEnvio === 'agendado' ? 'Confirmo o agendamento para' : 'Confirmo o envio para'}{' '}
                <strong>{leadsEnvio.length} lead{leadsEnvio.length !== 1 ? 's' : ''}</strong>
                {excludedIds.size > 0 && (
                  <span className="text-gray-400 font-normal"> ({excludedIds.size} excluído{excludedIds.size !== 1 ? 's' : ''})</span>
                )}
              </span>
            </label>
          </section>

          {/* ── Quando enviar ── */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">Quando enviar?</h2>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => { setModoEnvio('imediato'); setConfirmado(false); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  modoEnvio === 'imediato'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Send size={14} />
                Enviar agora
              </button>
              <button
                type="button"
                onClick={() => { setModoEnvio('agendado'); setConfirmado(false); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  modoEnvio === 'agendado'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Calendar size={14} />
                Agendar para depois
              </button>
            </div>

            {modoEnvio === 'agendado' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Data e hora do disparo</label>
                <input
                  type="datetime-local"
                  value={dataAgendamento}
                  onChange={(e) => { setDataAgendamento(e.target.value); setResult(null); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">Horário de Brasília (BRT). O disparo ocorre em até 5 minutos após o horário escolhido.</p>
              </div>
            )}
          </section>

          {/* ── Lista de leads (colapsável + seleção individual) ── */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Cabeçalho da lista */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setListaOpen((o) => !o)}
                className="flex items-center gap-2 hover:text-gray-900 transition-colors"
              >
                {listaOpen ? (
                  <ChevronUp size={14} className="text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {leadsEnvio.length} de {leadsAlvo.length} selecionados
                  {excludedIds.size > 0 && (
                    <span className="ml-1 text-amber-600">({excludedIds.size} excluído{excludedIds.size !== 1 ? 's' : ''})</span>
                  )}
                </span>
              </button>
              <div className="flex items-center gap-3">
                {excludedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={reincluirTodos}
                    className="text-xs text-primary-600 hover:underline font-medium"
                  >
                    Reincluir todos
                  </button>
                )}
                {!listaOpen && leadsAlvo.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {leadsAlvo.length > 200 ? `Clique para ver 200 de ${leadsAlvo.length}` : `Clique para ver ${leadsAlvo.length}`}
                  </span>
                )}
              </div>
            </div>

            {listaOpen && (
              leadsAlvo.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">Nenhum lead neste segmento.</p>
                </div>
              ) : (() => {
                const visiveis = leadsAlvo.slice(0, 200);
                const todosVisivelChecked = visiveis.every((l) => !excludedIds.has(l.id));
                const algunsVisivelChecked = visiveis.some((l) => !excludedIds.has(l.id));
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-white border-b border-gray-100">
                          <th className="px-4 py-2.5 w-10">
                            <input
                              type="checkbox"
                              checked={todosVisivelChecked}
                              ref={(el) => { if (el) el.indeterminate = !todosVisivelChecked && algunsVisivelChecked; }}
                              onChange={() => toggleTodosVisiveis(visiveis)}
                              className="w-3.5 h-3.5 rounded border-gray-300 accent-primary-600 cursor-pointer"
                              title="Marcar/desmarcar todos visíveis"
                            />
                          </th>
                          <th className="text-left px-2 py-2.5 font-semibold text-gray-500">Nome</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Escola</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Telefone</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Origem</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Estado</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Etapa</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {visiveis.map((l) => {
                          const excluido = excludedIds.has(l.id);
                          return (
                            <tr
                              key={l.id}
                              onClick={() => toggleExclude(l.id)}
                              className={`cursor-pointer transition-colors ${excluido ? 'bg-gray-50 opacity-50' : 'hover:bg-blue-50/40'}`}
                            >
                              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={!excluido}
                                  onChange={() => toggleExclude(l.id)}
                                  className="w-3.5 h-3.5 rounded border-gray-300 accent-primary-600 cursor-pointer"
                                />
                              </td>
                              <td className={`px-2 py-2.5 font-medium ${excluido ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{l.nome || '—'}</td>
                              <td className="px-4 py-2.5 text-gray-500">{l.nomeEscola ?? '—'}</td>
                              <td className="px-4 py-2.5 text-gray-500">{l.telefone}</td>
                              <td className="px-4 py-2.5 text-gray-500">{l.origem}</td>
                              <td className="px-4 py-2.5 text-gray-500">{l.estado ?? '—'}</td>
                              <td className="px-4 py-2.5 text-gray-500">{stageLabel(l.stage)}</td>
                              <td className="px-4 py-2.5">
                                {excluido ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-400">
                                    Skip
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                                    OK
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {leadsAlvo.length > 200 && (
                      <p className="text-xs text-gray-400 text-center py-3 border-t border-gray-100">
                        Exibindo 200 de {leadsAlvo.length} leads. Use os filtros de segmento e origem para refinar.
                      </p>
                    )}
                  </div>
                );
              })()
            )}
          </section>

          {/* ── Prévia da mensagem ── */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <Send size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Prévia da mensagem</span>
            </div>
            <div className="p-6 flex justify-center">
              <div
                className="w-full max-w-sm bg-white rounded-xl shadow-md overflow-hidden flex flex-col"
                style={{ minHeight: '400px' }}
              >
                <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                    AE
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Agenda Edu</p>
                    <p className="text-xs text-green-200">online</p>
                  </div>
                </div>
                <WhatsAppBubble components={template.components} />
                <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2">
                  <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-gray-400">
                    Mensagem
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
                    <Send size={14} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="h-20" />
        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        {result === 'error' && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            {errorMsg || 'Erro ao disparar. Tente novamente.'}
          </p>
        )}
        {result !== 'error' && (
          <p className="text-sm text-gray-500">
            {!confirmado
              ? 'Confirme o envio acima para liberar o botão.'
              : modoEnvio === 'agendado' && !dataAgendamento
              ? 'Selecione a data e hora do agendamento.'
              : `Pronto para ${modoEnvio === 'agendado' ? 'agendar' : 'enviar'} para ${leadsEnvio.length} lead${leadsEnvio.length !== 1 ? 's' : ''}.`}
          </p>
        )}
        <button
          onClick={handleEnviar}
          disabled={!confirmado || leadsEnvio.length === 0 || sending || (modoEnvio === 'agendado' && !dataAgendamento)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-pink-500 hover:bg-pink-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
        >
          {modoEnvio === 'agendado' ? <Calendar size={15} /> : <Send size={15} />}
          {sending
            ? (modoEnvio === 'agendado' ? 'Agendando...' : 'Enviando...')
            : modoEnvio === 'agendado'
            ? `Agendar para ${leadsEnvio.length} lead${leadsEnvio.length !== 1 ? 's' : ''}`
            : `Enviar para ${leadsEnvio.length} lead${leadsEnvio.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
