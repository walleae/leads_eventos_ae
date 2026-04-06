import { useState } from 'react';
import type { Template } from '../types/template';
import { generateId } from '../lib/utils';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>(() => {
    const stored = localStorage.getItem('leads_templates');
    return stored ? JSON.parse(stored) : [];
  });

  const persist = (updated: Template[]) => {
    setTemplates(updated);
    localStorage.setItem('leads_templates', JSON.stringify(updated));
  };

  const saveTemplate = (data: Omit<Template, 'id' | 'createdAt'>): Template => {
    const template: Template = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    persist([...templates, template]);
    return template;
  };

  const updateTemplate = (id: string, data: Partial<Template>): void => {
    persist(templates.map((t) => (t.id === id ? { ...t, ...data } : t)));
  };

  const deleteTemplate = (id: string): void => {
    persist(templates.filter((t) => t.id !== id));
  };

  return { templates, saveTemplate, updateTemplate, deleteTemplate };
}
