import { supabase } from './supabase';
import type { TemplateButton } from '../types/template';

const WABA_ID = import.meta.env.VITE_META_WABA_ID as string;
const ACCESS_TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN as string;

// ─── Variáveis de template ────────────────────────────────────────────────────

export const VARIAVEIS_DISPONIVEIS = [
  { key: 'nome',       label: 'Nome',           campo: 'nome',          exemplo: 'João Silva'       },
  { key: 'nomeEscola', label: 'Nome da escola',  campo: 'nomeEscola',    exemplo: 'Escola ABC'       },
  { key: 'email',      label: 'E-mail',          campo: 'email',         exemplo: 'joao@escola.com'  },
  { key: 'cidade',     label: 'Cidade',          campo: 'cidade',        exemplo: 'São Paulo'        },
  { key: 'estado',     label: 'Estado',          campo: 'estado',        exemplo: 'SP'               },
  { key: 'consultor',  label: 'Consultor',       campo: 'nomeConsultor', exemplo: 'Pedro'            },
] as const;

const EXEMPLOS_MAP: Record<string, string> = Object.fromEntries(
  VARIAVEIS_DISPONIVEIS.map((v) => [v.key, v.exemplo])
);

/** Preview: substitui {{varName}} por valores de exemplo */
export function renderCorpoComExemplos(corpo: string): string {
  return corpo.replace(/\{\{([a-zA-Z]+)\}\}/g, (match, key) => EXEMPLOS_MAP[key] ?? match);
}

/** Converte {{nome}} → {{1}} para a Meta API e retorna os exemplos na ordem */
export function converterVariaveisParaMeta(corpo: string): { corpo: string; exemplos: string[] } {
  const seenVars: string[] = [];
  const converted = corpo.replace(/\{\{([a-zA-Z]+)\}\}/g, (match, key) => {
    if (!(key in EXEMPLOS_MAP)) return match;
    const idx = seenVars.indexOf(key);
    if (idx >= 0) return `{{${idx + 1}}}`;
    seenVars.push(key);
    return `{{${seenVars.length}}}`;
  });
  return { corpo: converted, exemplos: seenVars.map((k) => EXEMPLOS_MAP[k]) };
}
// Em dev usa proxy Vite; em produção usa Vercel serverless proxy (sem CORS)
const GRAPH_BASE = import.meta.env.DEV ? '/api/graph' : '/api/meta-proxy';

/** Normaliza o nome do template: lowercase, sem acentos, underscores */
export function normalizeName(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 512);
}

/** Upload para Supabase Storage — retorna URL pública para preview e n8n */
export async function uploadImageToSupabase(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('template-images')
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Erro no upload da imagem: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('template-images')
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Upload para o Meta em chunks de 4MB — suporta arquivos grandes (imagens e PDFs).
 * Passo 1: POST /app/uploads → upload_session_id
 * Passo 2: POST /<session_id> em partes via file_offset → handle no último chunk
 */
async function uploadImageToMeta(file: File): Promise<string> {
  const CHUNK = 4 * 1024 * 1024; // 4MB — abaixo do limite do proxy Vercel

  // Passo 1: criar sessão
  const sessionRes = await fetch(
    `${GRAPH_BASE}/v19.0/app/uploads?file_length=${file.size}&file_type=${encodeURIComponent(file.type)}&file_name=${encodeURIComponent(file.name)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
  if (!sessionRes.ok) {
    const err = await sessionRes.json().catch(() => ({}));
    throw new Error(`Erro ao criar sessão de upload Meta: ${err.error?.message ?? sessionRes.statusText}`);
  }
  const { id: uploadSessionId } = await sessionRes.json();

  // Passo 2: enviar em chunks
  let handle: string | undefined;
  let offset = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK);
    const uploadRes = await fetch(`${GRAPH_BASE}/v19.0/${uploadSessionId}`, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${ACCESS_TOKEN}`,
        'Content-Type': file.type,
        file_offset: String(offset),
      },
      body: chunk,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(`Erro ao enviar chunk (offset ${offset}): ${err.error?.message ?? uploadRes.statusText}`);
    }
    const data = await uploadRes.json();
    if (data.h) handle = data.h as string;
    offset += CHUNK;
  }

  if (!handle) throw new Error('Meta não retornou handle após upload');
  return handle;
}

export interface MetaTemplateResult {
  id: string;
  status: string;
}

export interface MetaTemplateSummary {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
}

export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_handle?: string[];
    header_url?: string[];
    body_text?: string[][];
  };
  buttons?: {
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }[];
}

export interface MetaTemplateFull extends MetaTemplateSummary {
  components: MetaTemplateComponent[];
}

export function getTemplateBody(components: MetaTemplateComponent[]): string {
  return components.find((c) => c.type === 'BODY')?.text ?? '';
}

export function getTemplateHeaderImageUrl(components: MetaTemplateComponent[]): string | undefined {
  const h = components.find((c) => c.type === 'HEADER');
  if (!h || h.format !== 'IMAGE') return undefined;
  return h.example?.header_url?.[0] ?? h.example?.header_handle?.[0];
}

export function getTemplateHeaderDocumentUrl(components: MetaTemplateComponent[]): string | undefined {
  const h = components.find((c) => c.type === 'HEADER');
  if (!h || h.format !== 'DOCUMENT') return undefined;
  return h.example?.header_url?.[0] ?? h.example?.header_handle?.[0];
}

/** Busca todos os templates cadastrados no WhatsApp Business Manager */
export async function fetchMetaTemplates(): Promise<MetaTemplateFull[]> {
  const allTemplates: MetaTemplateFull[] = [];
  let url = `${GRAPH_BASE}/v19.0/${WABA_ID}/message_templates?fields=id,name,status,category,language,components&limit=200`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Erro ao buscar templates Meta: ${err.error?.message ?? res.statusText}`);
    }
    const data = await res.json();
    allTemplates.push(...((data.data ?? []) as MetaTemplateFull[]));
    url = data.paging?.next ?? '';
  }

  return allTemplates;
}

/**
 * Cria template no WhatsApp Business Manager.
 * - Imagens: faz upload binário para Meta via proxy → header_handle
 * - PDFs: usa a URL pública do Supabase → header_url (evita limite de body do proxy)
 */
export async function createMetaTemplate(params: {
  nome: string;
  corpo: string;
  midiaFile?: File;
  midiaUrl?: string;
  botoes?: TemplateButton[];
}): Promise<MetaTemplateResult> {
  const { nome, corpo, midiaFile, botoes } = params;

  const components: object[] = [];

  if (midiaFile) {
    const isPdf = midiaFile.type === 'application/pdf';
    // Imagem ou PDF: upload em chunks para Meta → header_handle
    const handle = await uploadImageToMeta(midiaFile);
    components.push({
      type: 'HEADER',
      format: isPdf ? 'DOCUMENT' : 'IMAGE',
      example: { header_handle: [handle] },
    });
  }

  const { corpo: corpoMeta, exemplos } = converterVariaveisParaMeta(corpo);
  components.push(
    exemplos.length > 0
      ? { type: 'BODY', text: corpoMeta, example: { body_text: [exemplos] } }
      : { type: 'BODY', text: corpoMeta }
  );

  if (botoes && botoes.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: botoes.slice(0, 3).map((b) =>
        b.type === 'quick_reply'
          ? { type: 'QUICK_REPLY', text: b.text }
          : { type: 'URL', text: b.text, url: b.url }
      ),
    });
  }

  const res = await fetch(`${GRAPH_BASE}/v19.0/${WABA_ID}/message_templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: normalizeName(nome),
      language: 'pt_BR',
      category: 'MARKETING',
      components,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    const e = data.error;
    const msg = e?.error_user_msg || e?.message || 'Erro desconhecido';
    const detail = e?.error_subcode ? ` (subcode ${e.error_subcode})` : '';
    console.error('Meta API error:', JSON.stringify(data, null, 2));
    throw new Error(`${msg}${detail}`);
  }

  return { id: data.id, status: data.status };
}
