import { useState } from 'react';
import { Plus, Send, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '../hooks/useTemplates';
import { Button } from '../components/ui/button';
import { getTemplateBody } from '../lib/meta';
import type { MetaTemplateFull } from '../lib/meta';
import { formatDate } from '../lib/utils';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const META_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  APPROVED:   { label: 'Aprovado',    className: 'bg-green-100 text-green-700' },
  PENDING:    { label: 'Pendente',    className: 'bg-yellow-100 text-yellow-700' },
  IN_REVIEW:  { label: 'Em revisão',  className: 'bg-blue-100 text-blue-700' },
  REJECTED:   { label: 'Rejeitado',   className: 'bg-red-100 text-red-700' },
  DISABLED:   { label: 'Desativado',  className: 'bg-gray-100 text-gray-600' },
  PAUSED:     { label: 'Pausado',     className: 'bg-orange-100 text-orange-700' },
  IN_APPEAL:  { label: 'Em recurso',  className: 'bg-purple-100 text-purple-700' },
  LIMIT_EXCEEDED: { label: 'Limite excedido', className: 'bg-red-100 text-red-700' },
};

function MetaStatusBadge({ status }: { status: string }) {
  const cfg = META_STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
};

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Templates() {
  const { templates, deleteTemplate, metaTemplates, metaLoading, refetchMeta } = useTemplates();
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template local?')) return;
    setDeletingId(id);
    await deleteTemplate(id);
    setDeletingId(null);
  };

  const handleDisparar = (tmpl: MetaTemplateFull, imageUrl?: string) => {
    navigate('/disparar', { state: { template: tmpl, imageUrl } });
  };

  // Merge: local templates indexed by normalized name
  const localByName = new Map(templates.map((t) => {
    const norm = t.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return [norm, t];
  }));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Templates de Mensagem</h1>
          <p className="text-sm text-gray-500">
            Todos os templates cadastrados no WhatsApp Business
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refetchMeta} disabled={metaLoading}>
            <RefreshCw size={16} className={metaLoading ? 'animate-spin' : ''} />
            {metaLoading ? 'Carregando...' : 'Atualizar da Meta'}
          </Button>
          <Button onClick={() => navigate('/templates/novo')}>
            <Plus size={16} />
            Novo Template
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {metaLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <RefreshCw size={24} className="text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500">Buscando templates da Meta...</p>
          </div>
        ) : metaTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <Send size={24} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Nenhum template encontrado na Meta</p>
            <Button onClick={() => navigate('/templates/novo')} variant="outline" size="sm">
              <Plus size={14} />
              Criar primeiro template
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prévia do corpo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Idioma</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metaTemplates.map((t) => {
                  const body = getTemplateBody(t.components);
                  const local = localByName.get(t.name);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{t.name}</p>
                        {local?.createdAt && (
                          <p className="text-xs text-gray-400 mt-0.5">Local: {formatDate(local.createdAt)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600 max-w-xs truncate">
                          {body ? (body.length > 80 ? body.slice(0, 80) + '…' : body) : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <MetaStatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {CATEGORY_LABELS[t.category] ?? t.category}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{t.language}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDisparar(t, local?.midia)}
                            disabled={t.status !== 'APPROVED'}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={t.status !== 'APPROVED' ? 'Template não aprovado' : 'Disparar'}
                          >
                            <Send size={14} />
                          </button>
                          {local && (
                            <>
                              <button
                                onClick={() => navigate(`/templates/novo?edit=${local.id}`)}
                                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                title="Editar local"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(local.id)}
                                disabled={deletingId === local.id}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Excluir local"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
