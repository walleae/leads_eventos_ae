import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, Bold, Italic, Strikethrough, ArrowLeft, X } from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { STAGES } from '../types/lead';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

function WhatsAppPreview({ nome, corpo, midia }: { nome: string; corpo: string; midia?: string }) {
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const renderText = (text: string) => {
    const parts = text.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~)/g);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*'))
        return <strong key={i}>{part.slice(1, -1)}</strong>;
      if (part.startsWith('_') && part.endsWith('_'))
        return <em key={i}>{part.slice(1, -1)}</em>;
      if (part.startsWith('~') && part.endsWith('~'))
        return <s key={i}>{part.slice(1, -1)}</s>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* WA Header */}
      <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3 rounded-t-xl">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
          AE
        </div>
        <div>
          <p className="text-sm font-semibold">Agenda Edu</p>
          <p className="text-xs text-green-200">online</p>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 p-4 overflow-y-auto"
        style={{
          background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"), #ECE5DD`,
        }}
      >
        {(corpo || midia) ? (
          <div className="flex justify-end">
            <div className="bg-[#DCF8C6] rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] shadow-sm">
              {midia && (
                <div className="mb-2 rounded-lg overflow-hidden">
                  <img src={midia} alt="Media" className="w-full max-h-48 object-cover" />
                </div>
              )}
              {corpo && (
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-snug">
                  {renderText(corpo)}
                </p>
              )}
              <p className="text-right text-[10px] text-gray-500 mt-1">{now} ✓✓</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-400 text-center">
              A prévia da mensagem<br />aparecerá aqui
            </p>
          </div>
        )}
      </div>

      {/* Input bar (decoration) */}
      <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2 rounded-b-xl">
        <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-gray-400">
          {nome || 'Nome do template...'}
        </div>
      </div>
    </div>
  );
}

export default function NewTemplate() {
  const { templates, saveTemplate, updateTemplate } = useTemplates();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [nome, setNome] = useState('');
  const [stage, setStage] = useState('');
  const [corpo, setCorpo] = useState('');
  const [midia, setMidia] = useState<string | undefined>();
  const [midiaNome, setMidiaNome] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (editId) {
      const t = templates.find((t) => t.id === editId);
      if (t) {
        setNome(t.nome);
        setStage(t.stage ?? '');
        setCorpo(t.corpo);
        setMidia(t.midia);
        setMidiaNome(t.midiaNome);
      }
    }
  }, [editId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMidia(ev.target?.result as string);
      setMidiaNome(file.name);
    };
    reader.readAsDataURL(file);
  };

  const insertFormat = (prefix: string, suffix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = corpo.substring(start, end);
    const before = corpo.substring(0, start);
    const after = corpo.substring(end);
    const newText = `${before}${prefix}${selected || 'texto'}${suffix}${after}`;
    setCorpo(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + (selected || 'texto').length);
    }, 0);
  };

  const handleSave = () => {
    if (!nome.trim()) {
      setError('O nome do template é obrigatório');
      return;
    }
    if (!corpo.trim()) {
      setError('O corpo da mensagem é obrigatório');
      return;
    }
    setError('');

    if (editId) {
      updateTemplate(editId, { nome, corpo, stage: stage || undefined, midia, midiaNome });
    } else {
      saveTemplate({ nome, corpo, stage: stage || undefined, midia, midiaNome });
    }
    setSaved(true);
    setTimeout(() => navigate('/templates'), 1000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/templates')}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {editId ? 'Editar Template' : 'Novo Template'}
          </h1>
          <p className="text-sm text-gray-500">Configure o template de mensagem</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
          {/* Left: Form */}
          <div className="overflow-y-auto p-6 border-r border-gray-200 space-y-5">
            {/* Nome */}
            <div>
              <Label htmlFor="nome">Nome do template *</Label>
              <Input
                id="nome"
                className="mt-1"
                placeholder="Ex: Convite para evento, Aquecimento..."
                value={nome}
                onChange={(e) => { setNome(e.target.value); setError(''); }}
              />
            </div>

            {/* Etapa */}
            <div>
              <Label htmlFor="stage">Etapa do funil (opcional)</Label>
              <Select
                id="stage"
                className="mt-1"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="">Nenhuma etapa específica</option>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </Select>
            </div>

            {/* Mídia */}
            <div>
              <Label>Cabeçalho — Mídia (opcional)</Label>
              {midia ? (
                <div className="mt-1 relative">
                  <img
                    src={midia}
                    alt="Preview"
                    className="w-full max-h-40 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => { setMidia(undefined); setMidiaNome(undefined); }}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <p className="text-xs text-gray-500 mt-1">{midiaNome}</p>
                </div>
              ) : (
                <label className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                  <Upload size={20} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Clique para fazer upload</span>
                  <span className="text-xs text-gray-400 mt-0.5">PNG, JPG até 5MB</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>

            {/* Corpo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="corpo">Corpo da mensagem *</Label>
                <span className="text-xs text-gray-400">{corpo.length}/4096</span>
              </div>

              {/* Formatting buttons */}
              <div className="flex gap-1 mb-1.5">
                <button
                  type="button"
                  onClick={() => insertFormat('*', '*')}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Negrito"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('_', '_')}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Itálico"
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('~', '~')}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Tachado"
                >
                  <Strikethrough size={14} />
                </button>
              </div>

              <Textarea
                id="corpo"
                ref={textareaRef}
                className="h-48"
                placeholder="Digite o texto da mensagem aqui..."
                value={corpo}
                maxLength={4096}
                onChange={(e) => { setCorpo(e.target.value); setError(''); }}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            {saved && (
              <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                Template salvo com sucesso! Redirecionando...
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/templates')}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saved}>
                {editId ? 'Atualizar Template' : 'Salvar Template'}
              </Button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="p-6 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Prévia do WhatsApp
            </p>
            <div className="max-w-sm mx-auto bg-white rounded-xl shadow-md overflow-hidden" style={{ height: '480px', display: 'flex', flexDirection: 'column' }}>
              <WhatsAppPreview nome={nome} corpo={corpo} midia={midia} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
