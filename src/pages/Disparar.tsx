import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Send, Users, AlertTriangle, CheckCircle, Link2, MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import type { Lead } from '../types/lead';
import { STAGES } from '../types/lead';
import { dispararMensagem } from '../lib/webhook';
import { getTemplateBody, getTemplateHeaderImageUrl } from '../lib/meta';
import type { MetaTemplateFull, MetaTemplateComponent } from '../lib/meta';

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
  { id: 'todos',        label: 'Todos os leads',       filtros: {} },
  { id: 'quentes',      label: 'Leads quentes 🔴',     filtros: { niveis: ['quente'] } },
  { id: 'mornos',       label: 'Leads mornos 🟡',      filtros: { niveis: ['morno'] } },
  { id: 'frios',        label: 'Leads frios 🔵',        filtros: { niveis: ['frio'] } },
  { id: 'proposta',     label: 'Proposta enviada',     filtros: { stages: ['proposta'] } },
  { id: 'negociacao',   label: 'Em negociação',         filtros: { stages: ['negociacao'] } },
  { id: 'aquecimento',  label: 'Aquecimento',           filtros: { stages: ['aquecimento'] } },
  { id: 'clientes',     label: 'Já é cliente',          filtros: { jaECliente: 'sim' } },
  { id: 'sorteio',      label: 'Origem: sorteio',       filtros: { origens: ['sorteio'] } },
  { id: 'consultor',    label: 'Origem: consultor',     filtros: { origens: ['consultor'] } },
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

  const [segmentoId, setSegmentoId] = useState<string>('todos');
  const [confirmado, setConfirmado] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // redirect se não tem template
  useEffect(() => {
    if (!template) navigate('/templates', { replace: true });
  }, [template, navigate]);

  const filtros: Filtros = useMemo(() => {
    const seg = SEGMENTOS.find((s) => s.id === segmentoId);
    if (!seg) return FILTROS_VAZIOS;
    return { ...FILTROS_VAZIOS, ...seg.filtros };
  }, [segmentoId]);

  const leadsAlvo = useMemo(() => applyFiltros(leads, filtros), [leads, filtros]);

  if (!template) return null;

  const corpo = getTemplateBody(template.components);

  const stageLabel = (id: string) => STAGES.find((s) => s.id === id)?.title ?? id;

  const handleEnviar = async () => {
    if (!confirmado) return;
    setSending(true);
    try {
      await dispararMensagem({
        template_nome: template.name,
        template_corpo: corpo,
        has_image: template.components.some((c) => c.type === 'HEADER' && c.format === 'IMAGE'),
        image_url: supabaseImageUrl,
        segmento: segmentoId,
        telefones: leadsAlvo.map((l) => l.telefone).join(','),
        leads: leadsAlvo.map((l) => ({
          id: l.id,
          nome: l.nome,
          telefone: l.telefone,
          email: l.email,
          nomeEscola: l.nomeEscola,
          stage: l.stage,
          estado: l.estado,
        })),
      });
      setResult('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao disparar');
      setResult('error');
    } finally {
      setSending(false);
    }
  };

  if (result === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-white">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">Disparo enviado com sucesso!</p>
          <p className="text-sm text-gray-500 mt-1">
            {leadsAlvo.length} lead{leadsAlvo.length !== 1 ? 's' : ''} notificado{leadsAlvo.length !== 1 ? 's' : ''} com o template <strong>{template.name}</strong>.
          </p>
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
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">Público-alvo</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">Selecione um segmento de leads para o disparo.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {SEGMENTOS.map((seg) => {
                const count = applyFiltros(leads, { ...FILTROS_VAZIOS, ...seg.filtros }).length;
                const selected = segmentoId === seg.id;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => { setSegmentoId(seg.id); setConfirmado(false); }}
                    className={`text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{seg.label}</span>
                    <span className={`text-xs mt-0.5 block ${selected ? 'text-primary-500' : 'text-gray-400'}`}>
                      {count} lead{count !== 1 ? 's' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Verificações de segurança ── */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">Verificações de segurança</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Contatos afetados */}
              <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg">
                <Users size={18} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Leads afetados</p>
                  <p className="text-xl font-bold text-gray-900">{leadsAlvo.length}</p>
                </div>
              </div>

              {/* Aviso se zero */}
              {leadsAlvo.length === 0 ? (
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
                    <p className="text-xs text-green-500">{leadsAlvo.length} lead{leadsAlvo.length !== 1 ? 's' : ''} válido{leadsAlvo.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}

              {/* Template */}
              <div className="flex items-start gap-3 px-4 py-3 border border-gray-200 rounded-lg">
                <Send size={18} className="text-gray-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Template</p>
                  <p className="text-sm font-medium text-gray-800 truncate" title={template.name}>{template.name}</p>
                </div>
              </div>
            </div>

            {/* Confirmação */}
            <label className="flex items-center gap-2.5 mt-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                disabled={leadsAlvo.length === 0}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 accent-primary-600"
              />
              <span className="text-sm text-gray-700">
                Confirmo o envio para <strong>{leadsAlvo.length} lead{leadsAlvo.length !== 1 ? 's' : ''}</strong>
              </span>
            </label>
          </section>

          {/* ── Lista de leads ── */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {leadsAlvo.length} de {leads.length} leads selecionados
              </span>
              <span className="text-xs text-gray-400">
                {leadsAlvo.length > 100 ? `Exibindo 100 de ${leadsAlvo.length}` : `Exibindo ${leadsAlvo.length}`}
              </span>
            </div>

            {leadsAlvo.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400">Nenhum lead neste segmento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Nome</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Escola</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Telefone</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Estado</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Etapa</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leadsAlvo.slice(0, 100).map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{l.nome}</td>
                        <td className="px-4 py-2.5 text-gray-500">{l.nomeEscola ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{l.telefone}</td>
                        <td className="px-4 py-2.5 text-gray-500">{l.estado ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{stageLabel(l.stage)}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                            OK
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                {/* WA header */}
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
                {/* WA input bar */}
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

          {/* Espaço para o sticky footer */}
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
              : `Pronto para enviar para ${leadsAlvo.length} lead${leadsAlvo.length !== 1 ? 's' : ''}.`}
          </p>
        )}
        <button
          onClick={handleEnviar}
          disabled={!confirmado || leadsAlvo.length === 0 || sending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-pink-500 hover:bg-pink-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
        >
          <Send size={15} />
          {sending ? 'Enviando...' : `Enviar para ${leadsAlvo.length} lead${leadsAlvo.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
