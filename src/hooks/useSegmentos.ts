import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Segmento } from '../types/segmento';

function dbToSegmento(row: Record<string, unknown>): Segmento {
  return {
    id: row.id as string,
    label: row.label as string,
    cadenciaAtiva: row.cadencia_ativa as boolean,
  };
}

export function useSegmentos() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSegmentos = async () => {
    setLoading(true);

    // Busca origens únicas dos leads
    const { data: leadsData } = await supabase
      .from('leads')
      .select('origem')
      .not('origem', 'is', null);

    const origensUnicas = [...new Set(
      (leadsData ?? []).map((l) => l.origem as string).filter(Boolean)
    )].sort();

    // Busca segmentos já cadastrados
    const { data: segData, error } = await supabase
      .from('segmentos')
      .select('*')
      .order('label');

    if (error) {
      console.error('useSegmentos fetch error:', error.message);
      setLoading(false);
      return;
    }

    const segMap = new Map((segData ?? []).map((s) => [s.id as string, s]));

    // Auto-registra origens novas que ainda não estão na tabela
    const novas = origensUnicas.filter((o) => !segMap.has(o));
    if (novas.length > 0) {
      await supabase.from('segmentos').insert(
        novas.map((o) => ({ id: o, label: o, cadencia_ativa: false }))
      );
    }

    // Re-busca após possível insert
    const { data: final } = await supabase
      .from('segmentos')
      .select('*')
      .order('label');

    setSegmentos((final ?? []).map((row) => dbToSegmento(row as Record<string, unknown>)));
    setLoading(false);
  };

  useEffect(() => { fetchSegmentos(); }, []);

  const toggleCadenciaAtiva = async (id: string): Promise<void> => {
    const seg = segmentos.find((s) => s.id === id);
    if (!seg) return;
    const novoValor = !seg.cadenciaAtiva;
    const { error } = await supabase
      .from('segmentos')
      .update({ cadencia_ativa: novoValor })
      .eq('id', id);
    if (error) { console.error('useSegmentos toggle error:', error.message); return; }
    setSegmentos((prev) => prev.map((s) => s.id === id ? { ...s, cadenciaAtiva: novoValor } : s));
  };

  return { segmentos, loading, toggleCadenciaAtiva, refetch: fetchSegmentos };
}
