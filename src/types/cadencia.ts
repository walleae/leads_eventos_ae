export interface Cadencia {
  id: string;
  nome: string;
  templateNome: string;
  templateCorpo: string;
  hasImage: boolean;
  imageUrl?: string;
  segmentoIds: string[];
  origemIds: string[];
  delayValor: number;
  delayUnidade: 'horas' | 'dias';
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}
