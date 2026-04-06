export interface Template {
  id: string;
  nome: string;
  corpo: string;
  midia?: string; // base64
  midiaNome?: string;
  stage?: string;
  createdAt: string;
}
