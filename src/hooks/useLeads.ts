import { useState } from 'react';
import type { Lead } from '../types/lead';
import { generateId } from '../lib/utils';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const stored = localStorage.getItem('leads_eventos');
    return stored ? JSON.parse(stored) : [];
  });

  const persist = (updated: Lead[]) => {
    setLeads(updated);
    localStorage.setItem('leads_eventos', JSON.stringify(updated));
  };

  const saveLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead => {
    const now = new Date().toISOString();
    const lead: Lead = {
      ...leadData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    persist([...leads, lead]);
    return lead;
  };

  const updateLead = (id: string, updates: Partial<Lead>): void => {
    const updated = leads.map((l) =>
      l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
    );
    persist(updated);
  };

  const updateLeadStage = (id: string, stage: string): void => {
    updateLead(id, { stage });
  };

  const deleteLead = (id: string): void => {
    persist(leads.filter((l) => l.id !== id));
  };

  return { leads, saveLead, updateLead, updateLeadStage, deleteLead };
}
