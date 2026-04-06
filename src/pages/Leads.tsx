import { useState } from 'react';
import { Trash2, Send, ChevronDown } from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import { useTemplates } from '../hooks/useTemplates';
import type { Lead } from '../types/lead';
import { STAGES } from '../types/lead';
import { Badge } from '../components/ui/badge';
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
      await dispararMensagem({
        lead_id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email,
        nomeEscola: lead.nomeEscola,
        stage: lead.stage,
        ...(templateId ? { template_id: templateId } : {}),
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

export default function Leads() {
  const { leads, updateLeadStage, deleteLead } = useLeads();
  const [filterStage, setFilterStage] = useState('');
  const [filterOrigem, setFilterOrigem] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [disparoLead, setDisparoLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const filtered = leads.filter((l) => {
    if (filterStage && l.stage !== filterStage) return false;
    if (filterOrigem && l.origem !== filterOrigem) return false;
    if (filterNivel && l.nivelInteresse !== filterNivel) return false;
    return true;
  });

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      deleteLead(id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500">{leads.length} lead(s) cadastrado(s)</p>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <ChevronDown size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">Filtrar por:</span>
        </div>
        <Select
          className="w-44 h-8 text-xs"
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
        >
          <option value="">Todas as etapas</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </Select>
        <Select
          className="w-36 h-8 text-xs"
          value={filterOrigem}
          onChange={(e) => setFilterOrigem(e.target.value)}
        >
          <option value="">Todas as origens</option>
          <option value="sorteio">Sorteio</option>
          <option value="consultor">Consultor</option>
        </Select>
        <Select
          className="w-36 h-8 text-xs"
          value={filterNivel}
          onChange={(e) => setFilterNivel(e.target.value)}
        >
          <option value="">Todos os níveis</option>
          <option value="quente">Quente</option>
          <option value="morno">Morno</option>
          <option value="frio">Frio</option>
        </Select>
        {(filterStage || filterOrigem || filterNivel) && (
          <button
            className="text-xs text-primary-600 hover:underline"
            onClick={() => { setFilterStage(''); setFilterOrigem(''); setFilterNivel(''); }}
          >
            Limpar filtros
          </button>
        )}
        <span className="ml-auto text-xs text-gray-500">{filtered.length} resultado(s)</span>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consultor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Origem</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nível</th>
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
                    </td>
                    <td className="px-4 py-3 text-gray-700">{lead.nomeEscola}</td>
                    <td className="px-4 py-3 text-gray-700">{lead.telefone}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{lead.nomeConsultor || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={lead.origem === 'sorteio' ? 'sorteio' : 'consultor'}>
                        {lead.origem === 'sorteio' ? 'Sorteio' : 'Consultor'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {lead.nivelInteresse ? (
                        <Badge variant={nivelVariant(lead.nivelInteresse)}>
                          {lead.nivelInteresse.charAt(0).toUpperCase() + lead.nivelInteresse.slice(1)}
                        </Badge>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700">{stageLabel(lead.stage)}</span>
                    </td>
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
    </div>
  );
}
