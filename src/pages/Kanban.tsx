import { useState, useCallback } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Send, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../hooks/useLeads';
import { useTemplates } from '../hooks/useTemplates';
import type { Lead } from '../types/lead';
import { STAGES } from '../types/lead';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { dispararMensagem } from '../lib/webhook';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '../components/ui/dialog';
import { Select } from '../components/ui/select';
import { formatDate } from '../lib/utils';

function nivelVariant(nivel?: string): 'quente' | 'morno' | 'frio' | 'secondary' {
  if (nivel === 'quente') return 'quente';
  if (nivel === 'morno') return 'morno';
  if (nivel === 'frio') return 'frio';
  return 'secondary';
}

function nivelLabel(nivel?: string) {
  if (!nivel) return '—';
  return nivel.charAt(0).toUpperCase() + nivel.slice(1);
}

interface KanbanCardProps {
  lead: Lead;
  onView: (lead: Lead) => void;
  onDisparo: (lead: Lead) => void;
}

function KanbanCard({ lead, onView, onDisparo }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{lead.nome}</p>
        {lead.nivelInteresse && (
          <Badge variant={nivelVariant(lead.nivelInteresse)} className="shrink-0">
            {nivelLabel(lead.nivelInteresse)}
          </Badge>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2 truncate">{lead.nomeEscola}</p>
      <div className="flex items-center gap-1.5 mb-3">
        <Badge variant={lead.origem === 'sorteio' ? 'sorteio' : 'consultor'}>
          {lead.origem === 'sorteio' ? 'Sorteio' : 'Consultor'}
        </Badge>
        {lead.jaECliente && (
          <Badge variant="success">Cliente</Badge>
        )}
      </div>
      <div className="flex gap-1.5">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onView(lead); }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          <Eye size={12} />
          Ver
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDisparo(lead); }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 px-2 py-1 rounded hover:bg-green-50 transition-colors"
        >
          <Send size={12} />
          Disparar
        </button>
      </div>
    </div>
  );
}

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateStage: (id: string, stage: string) => void;
}

function LeadDetailModal({ lead, onClose, onUpdateStage }: LeadDetailModalProps) {
  const [selectedStage, setSelectedStage] = useState(lead?.stage ?? 'novo');

  if (!lead) return null;

  const handleSave = () => {
    onUpdateStage(lead.id, selectedStage);
    onClose();
  };

  const row = (label: string, value?: string | boolean | null) => {
    if (value === undefined || value === null || value === '') return null;
    const display = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value;
    return (
      <div className="flex gap-2">
        <span className="text-xs font-medium text-gray-500 w-36 shrink-0">{label}</span>
        <span className="text-xs text-gray-900">{display}</span>
      </div>
    );
  };

  return (
    <Dialog open onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <div>
          <DialogTitle>{lead.nome}</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">{lead.nomeEscola}</p>
        </div>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogBody className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {row('E-mail', lead.email)}
          {row('Telefone', lead.telefone)}
          {row('Relação', lead.relacaoEscola)}
          {row('Já é cliente', lead.jaECliente)}
          {row('Estado', lead.estado)}
          {row('Cidade', lead.cidade)}
          {row('Porte de alunos', lead.porteAlunos)}
          {row('Maior interesse', lead.maiorInteresse?.replace('_', ' '))}
          {row('Rede de ensino', lead.redeEnsino)}
          {row('Nível', lead.nivelInteresse)}
          {row('Consultor', lead.nomeConsultor)}
          {row('Origem', lead.origem)}
          {row('Criado em', formatDate(lead.createdAt))}
        </div>
        {lead.observacoes && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Observações</p>
            <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">{lead.observacoes}</p>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Mover para etapa</label>
          <Select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </Select>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        <Button size="sm" onClick={handleSave}>Salvar etapa</Button>
      </DialogFooter>
    </Dialog>
  );
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
            <p className="text-xs text-gray-500 mt-1">Lead: {lead.nome}</p>
          </div>
        ) : result === 'error' ? (
          <div className="text-center py-4">
            <p className="text-sm font-medium text-red-600">Erro ao disparar mensagem.</p>
            <p className="text-xs text-gray-500 mt-1">Verifique sua conexão e tente novamente.</p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Disparar mensagem para <strong>{lead.nome}</strong> ({lead.telefone})
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Template (opcional)
              </label>
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

export default function Kanban() {
  const { leads, updateLeadStage } = useLeads();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [disparoLead, setDisparoLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getLeadsByStage = useCallback(
    (stageId: string) => leads.filter((l) => l.stage === stageId),
    [leads]
  );

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent) => {};

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a stage column
    const targetStage = STAGES.find((s) => s.id === overId);
    if (targetStage) {
      updateLeadStage(leadId, targetStage.id);
      return;
    }

    // Check if dropped on another lead card - find that card's stage
    const overLead = leads.find((l) => l.id === overId);
    if (overLead && overLead.stage !== leads.find((l) => l.id === leadId)?.stage) {
      updateLeadStage(leadId, overLead.stage);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kanban de Leads</h1>
          <p className="text-sm text-gray-500">{leads.length} leads no funil</p>
        </div>
        <Button onClick={() => navigate('/form/consultor')}>
          <Plus size={16} />
          Novo Lead
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-6 h-full min-h-0">
            {STAGES.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <div key={stage.id} className="kanban-column">
                  {/* Column Header */}
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: stage.color }}
                  >
                    <span>{stage.title}</span>
                    <span className="bg-white/25 rounded-full px-1.5 py-0.5 text-xs">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Drop zone */}
                  <SortableContext
                    id={stage.id}
                    items={stageLeads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div
                      id={stage.id}
                      className="flex flex-col gap-2 flex-1 min-h-[120px] rounded-lg p-2 bg-gray-100/60"
                    >
                      {stageLeads.map((lead) => (
                        <KanbanCard
                          key={lead.id}
                          lead={lead}
                          onView={setViewLead}
                          onDisparo={setDisparoLead}
                        />
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="flex items-center justify-center h-16 text-xs text-gray-400">
                          Sem leads
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-xl rotate-2 w-[280px]">
                <p className="text-sm font-semibold text-gray-900">{activeLead.nome}</p>
                <p className="text-xs text-gray-500">{activeLead.nomeEscola}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      <LeadDetailModal
        lead={viewLead}
        onClose={() => setViewLead(null)}
        onUpdateStage={updateLeadStage}
      />
      <DisparoModal lead={disparoLead} onClose={() => setDisparoLead(null)} />
    </div>
  );
}
