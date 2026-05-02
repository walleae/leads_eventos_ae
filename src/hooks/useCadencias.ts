import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Cadencia } from '../types/cadencia';

function dbToCadencia(row: Record<string, unknown>): Cadencia {
  return {
    id: row.id as string,
    nome: row.nome as string,
    templateNome: row.template_nome as string,
    templateCorpo: row.template_corpo as string,
    hasImage: row.has_image as boolean,
    imageUrl: (row.image_url as string | null) ?? undefined,
    segmentoIds: (row.segmento_ids as string[]) ?? [],
    origemIds: (row.origem_ids as string[]) ?? [],
    delayValor: (row.delay_valor as number) ?? 1,
    delayUnidade: (row.delay_unidade as 'horas' | 'dias') ?? 'dias',
    ativo: row.ativo as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useCadencias() {
  const [cadencias, setCadencias] = useState<Cadencia[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCadencias = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cadencias')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setCadencias(data.map((row) => dbToCadencia(row as Record<string, unknown>)));
    } else if (error) {
      console.error('useCadencias fetch error:', error.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCadencias(); }, []);

  const saveCadencia = async (data: Omit<Cadencia, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cadencia | null> => {
    const { data: row, error } = await supabase
      .from('cadencias')
      .insert([{
        nome: data.nome,
        template_nome: data.templateNome,
        template_corpo: data.templateCorpo,
        has_image: data.hasImage,
        image_url: data.imageUrl ?? null,
        segmento_ids: data.segmentoIds,
        origem_ids: data.origemIds,
        delay_valor: data.delayValor,
        delay_unidade: data.delayUnidade,
        ativo: data.ativo,
      }])
      .select()
      .single();
    if (error || !row) {
      console.error('useCadencias save error:', error?.message);
      return null;
    }
    const cadencia = dbToCadencia(row as Record<string, unknown>);
    setCadencias((prev) => [cadencia, ...prev]);
    return cadencia;
  };

  const updateCadencia = async (id: string, data: Partial<Omit<Cadencia, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.nome !== undefined)          updates.nome = data.nome;
    if (data.templateNome !== undefined)  updates.template_nome = data.templateNome;
    if (data.templateCorpo !== undefined) updates.template_corpo = data.templateCorpo;
    if (data.hasImage !== undefined)      updates.has_image = data.hasImage;
    if (data.imageUrl !== undefined)      updates.image_url = data.imageUrl ?? null;
    if (data.segmentoIds !== undefined)   updates.segmento_ids = data.segmentoIds;
    if (data.origemIds !== undefined)     updates.origem_ids = data.origemIds;
    if (data.delayValor !== undefined)    updates.delay_valor = data.delayValor;
    if (data.delayUnidade !== undefined)  updates.delay_unidade = data.delayUnidade;
    if (data.ativo !== undefined)         updates.ativo = data.ativo;

    const { error } = await supabase.from('cadencias').update(updates).eq('id', id);
    if (error) { console.error('useCadencias update error:', error.message); return; }
    setCadencias((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const deleteCadencia = async (id: string): Promise<void> => {
    const { error } = await supabase.from('cadencias').delete().eq('id', id);
    if (error) { console.error('useCadencias delete error:', error.message); return; }
    setCadencias((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleAtivo = async (id: string): Promise<void> => {
    const cadencia = cadencias.find((c) => c.id === id);
    if (!cadencia) return;
    await updateCadencia(id, { ativo: !cadencia.ativo });
  };

  return { cadencias, loading, saveCadencia, updateCadencia, deleteCadencia, toggleAtivo, refetch: fetchCadencias };
}
