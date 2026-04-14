import { useState } from 'react';
import { useLeads } from '../hooks/useLeads';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { CheckCircle2, CalendarDays } from 'lucide-react';

const RELACAO_OPTIONS = ['Diretor', 'Coordenador', 'Professor', 'Outro'];

export default function FormSorteio() {
  const { saveLead } = useLeads();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    nomeEscola: '',
    relacaoEscola: '',
    jaECliente: '' as '' | 'sim' | 'nao',
  });

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!form.email.trim()) errs.email = 'E-mail é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'E-mail inválido';
    if (!form.telefone.trim()) errs.telefone = 'Telefone é obrigatório';
    if (!form.nomeEscola.trim()) errs.nomeEscola = 'Nome da escola é obrigatório';
    if (!form.relacaoEscola) errs.relacaoEscola = 'Selecione sua relação com a escola';
    if (!form.jaECliente) errs.jaECliente = 'Selecione uma opção';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    await saveLead({
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      nomeEscola: form.nomeEscola,
      relacaoEscola: form.relacaoEscola,
      jaECliente: form.jaECliente === 'sim',
      stage: 'novo',
      origem: 'sorteio',
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inscrição realizada!</h2>
          <p className="text-gray-600 mb-6">
            Sua participação no sorteio foi registrada com sucesso. Boa sorte!
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({ nome: '', email: '', telefone: '', nomeEscola: '', relacaoEscola: '', jaECliente: '' });
            }}
            className="text-sm text-teal-600 hover:underline"
          >
            Fazer outra inscrição
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              <CalendarDays size={20} />
            </div>
            <span className="font-bold text-lg">Agenda Edu</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Participe do Sorteio!</h1>
          <p className="text-teal-100 text-sm">
            Preencha seus dados para concorrer a prêmios exclusivos no nosso evento.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div>
            <Label htmlFor="nome">Nome completo *</Label>
            <Input
              id="nome"
              className="mt-1"
              placeholder="Seu nome completo"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
            />
            {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
          </div>

          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              className="mt-1"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="telefone">Número de telefone *</Label>
            <Input
              id="telefone"
              className="mt-1"
              placeholder="(00) 00000-0000"
              value={form.telefone}
              onChange={(e) => set('telefone', e.target.value)}
            />
            {errors.telefone && <p className="text-xs text-red-500 mt-1">{errors.telefone}</p>}
          </div>

          <div>
            <Label htmlFor="nomeEscola">Nome da Escola *</Label>
            <Input
              id="nomeEscola"
              className="mt-1"
              placeholder="Nome da sua instituição"
              value={form.nomeEscola}
              onChange={(e) => set('nomeEscola', e.target.value)}
            />
            {errors.nomeEscola && <p className="text-xs text-red-500 mt-1">{errors.nomeEscola}</p>}
          </div>

          <div>
            <Label htmlFor="relacaoEscola">Qual a sua relação com a Escola? *</Label>
            <Select
              id="relacaoEscola"
              className="mt-1"
              value={form.relacaoEscola}
              onChange={(e) => set('relacaoEscola', e.target.value)}
            >
              <option value="">Selecione...</option>
              {RELACAO_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
            {errors.relacaoEscola && <p className="text-xs text-red-500 mt-1">{errors.relacaoEscola}</p>}
          </div>

          <div>
            <Label>Já é cliente Agenda Edu? *</Label>
            <div className="flex gap-4 mt-2">
              {[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="jaECliente"
                    value={value}
                    checked={form.jaECliente === value}
                    onChange={() => set('jaECliente', value)}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            {errors.jaECliente && <p className="text-xs text-red-500 mt-1">{errors.jaECliente}</p>}
          </div>

          <Button type="submit" variant="success" className="w-full h-11 text-base mt-2">
            Quero Participar do Sorteio
          </Button>
        </form>
      </div>
    </div>
  );
}
