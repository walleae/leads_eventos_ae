import { useState } from 'react';
import { useLeads } from '../hooks/useLeads';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { CheckCircle2, ClipboardList } from 'lucide-react';

const RELACAO_OPTIONS = ['Diretor', 'Coordenador', 'Professor', 'Outro'];
const PORTE_OPTIONS = ['Até 100', '100-300', '300-500', '500+'];
const CONSULTORES = ['Ana Silva', 'Carlos Santos', 'Maria Oliveira', 'João Pereira', 'Fernanda Lima', 'Rafael Souza'];

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

export default function FormConsultor() {
  const { saveLead } = useLeads();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    nomeEscola: '',
    relacaoEscola: '',
    estado: '',
    cidade: '',
    porteAlunos: '',
    jaECliente: '' as '' | 'sim' | 'nao',
    maiorInteresse: '' as '' | 'agenda_edu' | 'pagamentos' | 'ambos',
    redeEnsino: '' as '' | 'sim' | 'nao',
    nivelInteresse: '' as '' | 'quente' | 'morno' | 'frio',
    nomeConsultor: '',
    observacoes: '',
  });

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nome.trim()) errs.nome = 'Obrigatório';
    if (!form.email.trim()) errs.email = 'Obrigatório';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'E-mail inválido';
    if (!form.telefone.trim()) errs.telefone = 'Obrigatório';
    if (!form.nomeEscola.trim()) errs.nomeEscola = 'Obrigatório';
    if (!form.relacaoEscola) errs.relacaoEscola = 'Obrigatório';
    if (!form.porteAlunos) errs.porteAlunos = 'Obrigatório';
    if (!form.jaECliente) errs.jaECliente = 'Obrigatório';
    if (!form.nivelInteresse) errs.nivelInteresse = 'Obrigatório';
    if (!form.nomeConsultor) errs.nomeConsultor = 'Obrigatório';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    saveLead({
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      nomeEscola: form.nomeEscola,
      relacaoEscola: form.relacaoEscola,
      estado: form.estado || undefined,
      cidade: form.cidade || undefined,
      porteAlunos: form.porteAlunos,
      jaECliente: form.jaECliente === 'sim',
      maiorInteresse: form.maiorInteresse || undefined,
      redeEnsino: form.redeEnsino === 'sim' ? 'Sim' : form.redeEnsino === 'nao' ? 'Não' : undefined,
      nivelInteresse: form.nivelInteresse as 'quente' | 'morno' | 'frio',
      nomeConsultor: form.nomeConsultor,
      observacoes: form.observacoes || undefined,
      stage: 'novo',
      origem: 'consultor',
    });
    setSubmitted(true);
  };

  const resetForm = () => {
    setForm({
      nome: '', email: '', telefone: '', nomeEscola: '', relacaoEscola: '',
      estado: '', cidade: '', porteAlunos: '', jaECliente: '', maiorInteresse: '',
      redeEnsino: '', nivelInteresse: '', nomeConsultor: '', observacoes: '',
    });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead cadastrado!</h2>
          <p className="text-gray-600 mb-6">
            O lead foi registrado com sucesso e está disponível no Kanban.
          </p>
          <Button variant="default" onClick={resetForm} className="w-full">
            Cadastrar novo lead
          </Button>
        </div>
      </div>
    );
  }

  const field = (label: string, key: string, required?: boolean) => (
    <div>
      <Label htmlFor={key}>{label}{required ? ' *' : ''}</Label>
      {errors[key] && <span className="text-xs text-red-500 ml-1">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
            <span className="font-bold text-lg">Agenda Edu</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Formulário do Consultor</h1>
          <p className="text-purple-200 text-sm">
            Registre informações detalhadas sobre o lead.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              {field('Nome', 'nome', true)}
              <Input id="nome" className="mt-1" placeholder="Nome completo" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            </div>

            {/* Email */}
            <div>
              {field('E-mail', 'email', true)}
              <Input id="email" type="email" className="mt-1" placeholder="email@escola.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>

            {/* Telefone */}
            <div>
              {field('Telefone', 'telefone', true)}
              <Input id="telefone" className="mt-1" placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
            </div>

            {/* Nome escola */}
            <div>
              {field('Nome da escola', 'nomeEscola', true)}
              <Input id="nomeEscola" className="mt-1" placeholder="Nome da escola" value={form.nomeEscola} onChange={(e) => set('nomeEscola', e.target.value)} />
            </div>

            {/* Relação */}
            <div>
              {field('Relação com a escola', 'relacaoEscola', true)}
              <Select id="relacaoEscola" className="mt-1" value={form.relacaoEscola} onChange={(e) => set('relacaoEscola', e.target.value)}>
                <option value="">Selecione...</option>
                {RELACAO_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>

            {/* Estado */}
            <div>
              {field('Estado', 'estado')}
              <Select id="estado" className="mt-1" value={form.estado} onChange={(e) => set('estado', e.target.value)}>
                <option value="">Selecione...</option>
                {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>

            {/* Cidade */}
            <div>
              {field('Cidade', 'cidade')}
              <Input id="cidade" className="mt-1" placeholder="Nome da cidade" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
            </div>

            {/* Porte */}
            <div>
              {field('Porte de alunos', 'porteAlunos', true)}
              <Select id="porteAlunos" className="mt-1" value={form.porteAlunos} onChange={(e) => set('porteAlunos', e.target.value)}>
                <option value="">Selecione...</option>
                {PORTE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
          </div>

          {/* Já é cliente */}
          <div>
            <Label>Já é cliente Agenda Edu? *</Label>
            {errors.jaECliente && <span className="text-xs text-red-500 ml-1">{errors.jaECliente}</span>}
            <div className="flex gap-4 mt-2">
              {[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="jaECliente" value={value} checked={form.jaECliente === value} onChange={() => set('jaECliente', value)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Maior interesse */}
          <div>
            <Label>Qual é o maior interesse da escola?</Label>
            <div className="flex gap-4 mt-2 flex-wrap">
              {[
                { value: 'agenda_edu', label: 'Agenda Edu' },
                { value: 'pagamentos', label: 'Pagamentos' },
                { value: 'ambos', label: 'Ambos' },
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="maiorInteresse" value={value} checked={form.maiorInteresse === value} onChange={() => set('maiorInteresse', value)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Rede de ensino */}
          <div>
            <Label>Faz parte de alguma Rede de ensino?</Label>
            <div className="flex gap-4 mt-2">
              {[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="redeEnsino" value={value} checked={form.redeEnsino === value} onChange={() => set('redeEnsino', value)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Nível de interesse */}
          <div>
            <Label>Nível de interesse *</Label>
            {errors.nivelInteresse && <span className="text-xs text-red-500 ml-1">{errors.nivelInteresse}</span>}
            <div className="flex gap-4 mt-2">
              {[
                { value: 'quente', label: '🔴 Quente', color: 'text-red-600' },
                { value: 'morno', label: '🟡 Morno', color: 'text-amber-600' },
                { value: 'frio', label: '🔵 Frio', color: 'text-blue-600' },
              ].map(({ value, label, color }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="nivelInteresse" value={value} checked={form.nivelInteresse === value} onChange={() => set('nivelInteresse', value)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" />
                  <span className={`text-sm font-medium ${color}`}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Consultor */}
          <div>
            {field('Nome do(a) consultor(a)', 'nomeConsultor', true)}
            <Select id="nomeConsultor" className="mt-1" value={form.nomeConsultor} onChange={(e) => set('nomeConsultor', e.target.value)}>
              <option value="">Selecione o consultor...</option>
              {CONSULTORES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              className="mt-1 h-24"
              placeholder="Anotações adicionais sobre o lead..."
              value={form.observacoes}
              onChange={(e) => set('observacoes', e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full h-11 text-base">
            Enviar
          </Button>
        </form>
      </div>
    </div>
  );
}
