import { useState } from 'react';
import { Plus, Send, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '../hooks/useTemplates';
import type { Template } from '../types/template';
import { STAGES } from '../types/lead';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { dispararMensagem } from '../lib/webhook';
import { formatDate } from '../lib/utils';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '../components/ui/dialog';

interface DisparoTemplateModalProps {
  template: Template | null;
  onClose: () => void;
}

function DisparoTemplateModal({ template, onClose }: DisparoTemplateModalProps) {
  const [stageFiltro, setStageFiltro] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  if (!template) return null;

  const handleDisparo = async () => {
    setLoading(true);
    try {
      await dispararMensagem({
        template_id: template.id,
        template_nome: template.nome,
        corpo: template.corpo,
        stage_filtro: stageFiltro || undefined,
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
        <DialogTitle>Disparar Template</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogBody className="space-y-4">
        {result === 'success' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send size={20} className="text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-700">Template disparado com sucesso!</p>
          </div>
        ) : result === 'error' ? (
          <p className="text-sm text-red-600 text-center">Erro ao disparar template.</p>
        ) : (
          <>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Template</p>
              <p className="text-sm font-medium text-gray-900">{template.nome}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Prévia</p>
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded line-clamp-3">{template.corpo}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Filtrar por etapa (opcional)
              </label>
              <Select value={stageFiltro} onChange={(e) => setStageFiltro(e.target.value)}>
                <option value="">Todos os leads</option>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
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

export default function Templates() {
  const { templates, deleteTemplate } = useTemplates();
  const navigate = useNavigate();
  const [disparoTemplate, setDisparoTemplate] = useState<Template | null>(null);

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      deleteTemplate(id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Templates de Mensagem</h1>
          <p className="text-sm text-gray-500">
            Gerencie seus templates e dispare campanhas via WhatsApp
          </p>
        </div>
        <Button onClick={() => navigate('/templates/novo')}>
          <Plus size={16} />
          Novo Template
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <Send size={24} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Nenhum template criado ainda</p>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prévia</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Etapa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Criado em</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templates.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.nome}</p>
                      {t.midiaNome && (
                        <p className="text-xs text-gray-400 mt-0.5">📎 {t.midiaNome}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 max-w-xs truncate">
                        {t.corpo.substring(0, 60)}{t.corpo.length > 60 ? '...' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {t.stage ? (STAGES.find((s) => s.id === t.stage)?.title ?? t.stage) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDisparoTemplate(t)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Disparar"
                        >
                          <Send size={14} />
                        </button>
                        <button
                          onClick={() => navigate(`/templates/novo?edit=${t.id}`)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
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

      <DisparoTemplateModal template={disparoTemplate} onClose={() => setDisparoTemplate(null)} />
    </div>
  );
}
