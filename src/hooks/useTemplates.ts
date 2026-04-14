import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Template, TemplateButton } from '../types/template';
import { fetchMetaTemplates, normalizeName } from '../lib/meta';
import type { MetaTemplateFull } from '../lib/meta';

// ─── DB ↔ App mapping ────────────────────────────────────────────────────────

function dbToTemplate(row: Record<string, unknown>): Template {
  return {
    id: row.id as string,
    nome: row.nome as string,
    corpo: row.corpo as string,
    midia: (row.midia_url as string | null) ?? undefined,
    midiaNome: (row.midia_nome as string | null) ?? undefined,
    botoes: (row.botoes as TemplateButton[] | null) ?? undefined,
    stage: (row.stage as string | null) ?? undefined,
    createdAt: row.created_at as string,
    metaId: (row.meta_id as string | null) ?? undefined,
    metaStatus: (row.meta_status as string | null) ?? undefined,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplateFull[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTemplates(data.map((row) => dbToTemplate(row as Record<string, unknown>)));
    } else if (error) {
      console.error('useTemplates fetch error:', error.message);
    }
    setLoading(false);
  };

  const loadMetaTemplates = async () => {
    setMetaLoading(true);
    try {
      const list = await fetchMetaTemplates();
      setMetaTemplates(list);
    } catch (err) {
      console.error('useTemplates meta fetch error:', err);
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    loadMetaTemplates();
  }, []);

  const saveTemplate = async (data: Omit<Template, 'id' | 'createdAt'>): Promise<Template | null> => {
    const { data: row, error } = await supabase
      .from('templates')
      .insert([{
        nome: data.nome,
        corpo: data.corpo,
        midia_url: data.midia ?? null,
        midia_nome: data.midiaNome ?? null,
        botoes: data.botoes ?? null,
        stage: data.stage ?? null,
      }])
      .select()
      .single();
    if (error || !row) {
      console.error('useTemplates saveTemplate error:', error?.message);
      return null;
    }
    const template = dbToTemplate(row as Record<string, unknown>);
    setTemplates((prev) => [template, ...prev]);
    return template;
  };

  const updateTemplate = async (id: string, data: Partial<Template>): Promise<void> => {
    const updates: Record<string, unknown> = {};
    if (data.nome !== undefined) updates.nome = data.nome;
    if (data.corpo !== undefined) updates.corpo = data.corpo;
    if (data.midia !== undefined) updates.midia_url = data.midia ?? null;
    if (data.midiaNome !== undefined) updates.midia_nome = data.midiaNome ?? null;
    if (data.botoes !== undefined) updates.botoes = data.botoes ?? null;
    if (data.stage !== undefined) updates.stage = data.stage ?? null;

    const { error } = await supabase.from('templates').update(updates).eq('id', id);
    if (error) {
      console.error('useTemplates updateTemplate error:', error.message);
      return;
    }
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  };

  const deleteTemplate = async (id: string): Promise<void> => {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) {
      console.error('useTemplates deleteTemplate error:', error.message);
      return;
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const syncMetaStatuses = async (): Promise<void> => {
    const metaTemplates = await fetchMetaTemplates();
    const byName = new Map(metaTemplates.map((t) => [t.name, t]));

    const updates = templates
      .map((t) => {
        const meta = byName.get(normalizeName(t.nome));
        if (!meta) return null;
        return { id: t.id, meta_id: meta.id, meta_status: meta.status };
      })
      .filter(Boolean) as { id: string; meta_id: string; meta_status: string }[];

    await Promise.all(
      updates.map(({ id, meta_id, meta_status }) =>
        supabase.from('templates').update({ meta_id, meta_status }).eq('id', id)
      )
    );

    setTemplates((prev) =>
      prev.map((t) => {
        const upd = updates.find((u) => u.id === t.id);
        return upd ? { ...t, metaId: upd.meta_id, metaStatus: upd.meta_status } : t;
      })
    );
  };

  return { templates, loading, metaTemplates, metaLoading, saveTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates, syncMetaStatuses, refetchMeta: loadMetaTemplates };
}
