import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead } from '../types/lead';

// ─── DB ↔ App mapping ────────────────────────────────────────────────────────

function dbToLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    nome: row.nome as string,
    email: row.email as string,
    telefone: row.telefone as string,
    nomeEscola: row.nome_escola as string,
    relacaoEscola: row.relacao_escola as string,
    jaECliente: row.ja_e_cliente as boolean,
    estado: (row.estado as string | null) ?? undefined,
    cidade: (row.cidade as string | null) ?? undefined,
    porteAlunos: (row.porte_alunos as string | null) ?? undefined,
    maiorInteresse: (row.maior_interesse as Lead['maiorInteresse']) ?? undefined,
    redeEnsino: (row.rede_ensino as string | null) ?? undefined,
    nivelInteresse: (row.nivel_interesse as Lead['nivelInteresse']) ?? undefined,
    nomeConsultor: (row.nome_consultor as string | null) ?? undefined,
    observacoes: (row.observacoes as string | null) ?? undefined,
    stage: row.stage as string,
    origem: row.origem as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function leadToDb(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    nome: lead.nome,
    email: lead.email,
    telefone: lead.telefone,
    nome_escola: lead.nomeEscola,
    relacao_escola: lead.relacaoEscola,
    ja_e_cliente: lead.jaECliente,
    estado: lead.estado ?? null,
    cidade: lead.cidade ?? null,
    porte_alunos: lead.porteAlunos ?? null,
    maior_interesse: lead.maiorInteresse ?? null,
    rede_ensino: lead.redeEnsino ?? null,
    nivel_interesse: lead.nivelInteresse ?? null,
    nome_consultor: lead.nomeConsultor ?? null,
    observacoes: lead.observacoes ?? null,
    stage: lead.stage,
    origem: lead.origem,
  };
}

function partialLeadToDb(updates: Partial<Lead>): Record<string, unknown> {
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.nome !== undefined) db.nome = updates.nome;
  if (updates.email !== undefined) db.email = updates.email;
  if (updates.telefone !== undefined) db.telefone = updates.telefone;
  if (updates.nomeEscola !== undefined) db.nome_escola = updates.nomeEscola;
  if (updates.relacaoEscola !== undefined) db.relacao_escola = updates.relacaoEscola;
  if (updates.jaECliente !== undefined) db.ja_e_cliente = updates.jaECliente;
  if (updates.estado !== undefined) db.estado = updates.estado ?? null;
  if (updates.cidade !== undefined) db.cidade = updates.cidade ?? null;
  if (updates.porteAlunos !== undefined) db.porte_alunos = updates.porteAlunos ?? null;
  if (updates.maiorInteresse !== undefined) db.maior_interesse = updates.maiorInteresse ?? null;
  if (updates.redeEnsino !== undefined) db.rede_ensino = updates.redeEnsino ?? null;
  if (updates.nivelInteresse !== undefined) db.nivel_interesse = updates.nivelInteresse ?? null;
  if (updates.nomeConsultor !== undefined) db.nome_consultor = updates.nomeConsultor ?? null;
  if (updates.observacoes !== undefined) db.observacoes = updates.observacoes ?? null;
  if (updates.stage !== undefined) db.stage = updates.stage;
  if (updates.origem !== undefined) db.origem = updates.origem;
  return db;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    setLoading(true);
    const PAGE = 1000;
    const all: Lead[] = [];
    let from = 0;

    // Pagina até buscar todos os registros (Supabase limita 1000/página por padrão)
    while (true) {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1);

      if (error) {
        console.error('useLeads fetchLeads error:', error.message);
        break;
      }
      if (!data || data.length === 0) break;

      all.push(...data.map((row) => dbToLead(row as Record<string, unknown>)));
      if (data.length < PAGE) break; // última página
      from += PAGE;
    }

    setLeads(all);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const saveLead = async (
    leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Lead | null> => {
    const { data, error } = await supabase
      .from('leads')
      .insert([leadToDb(leadData)])
      .select()
      .single();
    if (error || !data) {
      console.error('useLeads saveLead error:', error?.message);
      return null;
    }
    const lead = dbToLead(data as Record<string, unknown>);
    setLeads((prev) => [lead, ...prev]);
    return lead;
  };

  const updateLead = async (id: string, updates: Partial<Lead>): Promise<void> => {
    const dbUpdates = partialLeadToDb(updates);
    const { error } = await supabase.from('leads').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('useLeads updateLead error:', error.message);
      return;
    }
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, ...updates, updatedAt: dbUpdates.updated_at as string }
          : l
      )
    );
  };

  const updateLeadStage = async (id: string, stage: string): Promise<void> => {
    await updateLead(id, { stage });
  };

  const deleteLead = async (id: string): Promise<void> => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      console.error('useLeads deleteLead error:', error.message);
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const importLeads = async (
    rows: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<{ inserted: number; failed: number }> => {
    const BATCH = 500; // evita estourar o limite de payload do PostgREST
    let totalInserted = 0;
    let totalFailed = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map(leadToDb);
      const { data, error } = await supabase
        .from('leads')
        .insert(batch)
        .select();

      if (error) {
        console.error(`importLeads batch ${i / BATCH + 1} error:`, error.message);
        totalFailed += batch.length;
        continue;
      }

      const inserted = data?.length ?? 0;
      totalInserted += inserted;
      totalFailed += batch.length - inserted;

      if (data) {
        const newLeads = data.map((row) => dbToLead(row as Record<string, unknown>));
        setLeads((prev) => [...newLeads, ...prev]);
      }
    }

    return { inserted: totalInserted, failed: totalFailed };
  };

  return { leads, loading, saveLead, updateLead, updateLeadStage, deleteLead, importLeads, refetch: fetchLeads };
}
