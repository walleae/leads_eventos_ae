// POST /api/leads — cria um lead via API externa
// Autenticação: header x-api-key com o valor da env LEADS_API_KEY
// Campos obrigatórios: telefone, origem
// Todos os demais campos são opcionais

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const API_KEY = process.env.LEADS_API_KEY;

const EXEMPLO = {
  telefone: '11999999999',
  origem: 'feira_sp_2025',
  nome: 'João Silva',
  email: 'joao@escola.com',
  nome_escola: 'Escola Exemplo',
  relacao_escola: 'diretor',
  ja_e_cliente: false,
  estado: 'SP',
  cidade: 'São Paulo',
  porte_alunos: '100-500',
  maior_interesse: 'agenda',
  rede_ensino: 'privada',
  nivel_interesse: 'quente',
  nome_consultor: 'Maria',
  observacoes: 'Veio pelo estande B12',
  stage: 'novo',
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      endpoint: 'POST /api/leads',
      descricao: 'Cria um novo lead',
      autenticacao: 'Header x-api-key obrigatório',
      campos_obrigatorios: ['telefone', 'origem'],
      campos_opcionais: Object.keys(EXEMPLO).filter((k) => !['telefone', 'origem'].includes(k)),
      exemplo_requisicao: EXEMPLO,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  // Autenticação via API key
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'API key inválida ou ausente (header x-api-key).' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  // Validação dos campos obrigatórios
  if (!body?.telefone || !body?.origem) {
    return res.status(400).json({
      error: 'Campos obrigatórios ausentes: telefone, origem',
      exemplo: EXEMPLO,
    });
  }

  const lead = {
    telefone: String(body.telefone).trim(),
    origem: String(body.origem).trim(),
    nome: body.nome ? String(body.nome).trim() : '',
    email: body.email ? String(body.email).trim() : '',
    nome_escola: body.nome_escola ? String(body.nome_escola).trim() : '',
    relacao_escola: body.relacao_escola ? String(body.relacao_escola).trim() : 'outro',
    ja_e_cliente: Boolean(body.ja_e_cliente ?? false),
    estado: body.estado ? String(body.estado).trim() : null,
    cidade: body.cidade ? String(body.cidade).trim() : null,
    porte_alunos: body.porte_alunos ? String(body.porte_alunos).trim() : null,
    maior_interesse: body.maior_interesse ? String(body.maior_interesse).trim() : null,
    rede_ensino: body.rede_ensino ? String(body.rede_ensino).trim() : null,
    nivel_interesse: body.nivel_interesse ? String(body.nivel_interesse).trim() : null,
    nome_consultor: body.nome_consultor ? String(body.nome_consultor).trim() : null,
    observacoes: body.observacoes ? String(body.observacoes).trim() : null,
    stage: body.stage ? String(body.stage).trim() : 'novo',
  };

  // Insere o lead no Supabase
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(lead),
  });

  if (!insertRes.ok) {
    const err = await insertRes.json().catch(() => ({}));
    return res.status(500).json({ error: 'Erro ao criar lead no banco', details: err });
  }

  const [created] = await insertRes.json();

  // Auto-registra a origem na tabela segmentos (sem sobrescrever se já existir)
  await fetch(`${SUPABASE_URL}/rest/v1/segmentos`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,resolution=ignore-duplicates',
    },
    body: JSON.stringify({ id: lead.origem, label: lead.origem, cadencia_ativa: false }),
  });

  return res.status(201).json({ ok: true, lead: created });
}
