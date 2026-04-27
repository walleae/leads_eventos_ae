import { useState } from 'react';
import { History, ChevronDown, ChevronUp, Download, Search, CheckCircle, AlertTriangle, Clock, Send } from 'lucide-react';
import { useHistorico, type HistoricoDisparo } from '../hooks/useHistorico';
import { STAGES } from '../types/lead';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function stageLabel(id?: string) {
  if (!id) return '—';
  return STAGES.find((s) => s.id === id)?.title ?? id;
}

function segmentoLabel(seg: string) {
  if (!seg || seg === 'todos') return 'Todos';
  return seg.split(',').join(', ');
}

function downloadCSV(disparo: HistoricoDisparo) {
  const headers = ['nome', 'telefone', 'email', 'nomeEscola', 'estado', 'stage'];
  const rows = disparo.leads_json.map((l) => [
    l.nome ?? '',
    l.telefone ?? '',
    l.email ?? '',
    l.nomeEscola ?? '',
    l.estado ?? '',
    stageLabel(l.stage),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date(disparo.enviado_em).toISOString().slice(0, 10);
  a.download = `disparo_${disparo.template_nome}_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Row expandível ───────────────────────────────────────────────────────────

function HistoricoRow({ disparo }: { disparo: HistoricoDisparo }) {
  const [expanded, setExpanded] = useState(false);
  const [busca, setBusca] = useState('');

  const leads = disparo.leads_json ?? [];
  const leadsFiltered = busca
    ? leads.filter((l) =>
        (l.nome ?? '').toLowerCase().includes(busca.toLowerCase()) ||
        (l.telefone ?? '').includes(busca)
      )
    : leads;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Cabeçalho da linha */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
      >
        {/* Status icon */}
        <div className="shrink-0">
          {disparo.status === 'enviado' ? (
            <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
          ) : (
            <AlertTriangle size={16} className="text-red-500 dark:text-red-400" />
          )}
        </div>

        {/* Data/hora */}
        <div className="w-36 shrink-0">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{formatDateTime(disparo.enviado_em)}</p>
        </div>

        {/* Template */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{disparo.template_nome}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{segmentoLabel(disparo.segmento)}</p>
        </div>

        {/* Tipo badge */}
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
          disparo.tipo === 'agendado'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {disparo.tipo === 'agendado' ? <Clock size={10} /> : <Send size={10} />}
          {disparo.tipo === 'agendado' ? 'Agendado' : 'Imediato'}
        </span>

        {/* Total leads */}
        <div className="shrink-0 w-20 text-right">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{disparo.total_leads}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">leads</p>
        </div>

        {/* Download */}
        <button
          onClick={(e) => { e.stopPropagation(); downloadCSV(disparo); }}
          title="Baixar CSV"
          className="shrink-0 p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
        >
          <Download size={14} />
        </button>

        {/* Expand chevron */}
        <div className="shrink-0 text-gray-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Painel expandido com lista de leads */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar leads..."
                className="h-7 pl-7 pr-3 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {leadsFiltered.length} de {leads.length} leads
            </span>
            <button
              onClick={() => downloadCSV(disparo)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <Download size={12} />
              Baixar planilha
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="px-4 pb-4 text-xs text-gray-400 dark:text-gray-500">
              Nenhum dado de leads armazenado neste disparo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-2 font-semibold text-gray-500 dark:text-gray-400">Nome</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-500 dark:text-gray-400">Telefone</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-500 dark:text-gray-400">Escola</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-500 dark:text-gray-400">Estado</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-500 dark:text-gray-400">Etapa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {leadsFiltered.slice(0, 200).map((lead, i) => (
                    <tr key={lead.id ?? i} className="hover:bg-white dark:hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{lead.nome || '—'}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{lead.telefone || '—'}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{lead.nomeEscola || '—'}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{lead.estado || '—'}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{stageLabel(lead.stage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leadsFiltered.length > 200 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2 border-t border-gray-100 dark:border-gray-700">
                  Exibindo 200 de {leadsFiltered.length}. Use "Baixar planilha" para ver todos.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Historico() {
  const { historico, loading } = useHistorico();
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'imediato' | 'agendado'>('todos');

  const filtered = historico.filter((d) => {
    if (tipoFiltro !== 'todos' && d.tipo !== tipoFiltro) return false;
    if (busca) {
      const b = busca.toLowerCase();
      if (!d.template_nome.toLowerCase().includes(b) && !d.segmento.toLowerCase().includes(b)) return false;
    }
    return true;
  });

  const totalLeads = filtered.reduce((acc, d) => acc + d.total_leads, 0);
  const totalEnviados = filtered.filter((d) => d.status === 'enviado').length;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <History size={20} className="text-primary-600" />
              Histórico de Disparos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Todos os disparos realizados — imediatos e agendados
            </p>
          </div>

          {/* Stats */}
          {!loading && historico.length > 0 && (
            <div className="flex items-center gap-5 text-right">
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{filtered.length}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">disparos</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{totalEnviados}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">com sucesso</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalLeads.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">mensagens enviadas</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-2.5 flex items-center gap-3">
        {/* Busca por template */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por template..."
            className="h-8 pl-7 pr-3 w-52 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Filtro por tipo */}
        <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs">
          {(['todos', 'imediato', 'agendado'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                tipoFiltro === t
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {t === 'todos' ? 'Todos' : t === 'imediato' ? 'Imediatos' : 'Agendados'}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : historico.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <History size={24} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nenhum disparo registrado</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Os disparos aparecerão aqui após serem realizados.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">
            Nenhum resultado para os filtros aplicados.
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl mx-auto">
            {filtered.map((d) => (
              <HistoricoRow key={d.id} disparo={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
