export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  nomeEscola: string;
  relacaoEscola: string; // Diretor, Coordenador, Professor, Outro
  jaECliente: boolean;
  estado?: string;
  cidade?: string;
  porteAlunos?: string; // "Até 100", "100-300", "300-500", "500+"
  maiorInteresse?: 'agenda_edu' | 'pagamentos' | 'ambos';
  redeEnsino?: string;
  nivelInteresse?: 'quente' | 'morno' | 'frio';
  nomeConsultor?: string;
  observacoes?: string;
  stage: string;
  origem: string;
  createdAt: string;
  updatedAt: string;
}

export type KanbanStage = {
  id: string;
  title: string;
  color: string;
};

export const STAGES: KanbanStage[] = [
  { id: 'novo', title: 'Novo Lead', color: '#6366f1' },
  { id: 'contato', title: 'Contato Realizado', color: '#3b82f6' },
  { id: 'aquecimento', title: 'Aquecimento', color: '#f59e0b' },
  { id: 'proposta', title: 'Proposta Enviada', color: '#8b5cf6' },
  { id: 'negociacao', title: 'Negociação', color: '#ec4899' },
  { id: 'convertido', title: 'Convertido', color: '#22c55e' },
  { id: 'perdido', title: 'Perdido', color: '#ef4444' },
];
