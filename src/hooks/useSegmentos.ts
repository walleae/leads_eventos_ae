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
    const { data, error } = await supabase
      .from('segmentos')
      .select('*')
      .order('label');
    if (!error && data) {
      setSegmentos(data.map((row) => dbToSegmento(row as Record<string, unknown>)));
    } else if (error) {
      console.error('useSegmentos fetch error:', error.message);
    }
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

  return { segmentos, loading, toggleCadenciaAtiva };
}
