import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface HistoricoDisparo {
  id: string;
  created_at: string;
  template_nome: string;
  segmento: string;
  total_leads: number;
  leads_json: LeadSnapshot[];
  tipo: 'imediato' | 'agendado';
  status: 'enviado' | 'erro';
  agendado_para: string | null;
  enviado_em: string;
}

export interface LeadSnapshot {
  id?: string;
  nome?: string;
  telefone?: string;
  email?: string;
  nomeEscola?: string;
  stage?: string;
  estado?: string;
}

export function useHistorico() {
  const [historico, setHistorico] = useState<HistoricoDisparo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('historico_disparos')
        .select('*')
        .order('enviado_em', { ascending: false })
        .limit(200);
      setHistorico((data as HistoricoDisparo[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return { historico, loading };
}
