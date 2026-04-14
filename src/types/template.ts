export type TemplateButtonType = 'url' | 'quick_reply';

export interface TemplateButton {
  type: TemplateButtonType;
  text: string;
  url?: string; // só para type === 'url'
}

export interface Template {
  id: string;
  nome: string;
  corpo: string;
  midia?: string;
  midiaNome?: string;
  botoes?: TemplateButton[];
  stage?: string;
  createdAt: string;
  metaId?: string;
  metaStatus?: string;
}
