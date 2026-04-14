import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, Bold, Italic, Strikethrough, ArrowLeft, X, CheckCircle, AlertCircle, Loader2, Link2, Info, MessageCircle } from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import type { TemplateButton, TemplateButtonType } from '../types/template';
import { STAGES } from '../types/lead';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { createMetaTemplate, uploadImageToSupabase } from '../lib/meta';

function WhatsAppPreview({
  nome,
  corpo,
  midia,
  botoes,
}: {
  nome: string;
  corpo: string;
  midia?: string;
  botoes?: TemplateButton[];
}) {
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

  const hasContent = corpo || midia;

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
        {hasContent ? (
          <div className="flex justify-end">
            <div className="max-w-[85%] w-full">
              {/* Message bubble */}
              <div className="bg-[#DCF8C6] rounded-xl rounded-tr-sm px-3 py-2 shadow-sm">
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

              {/* Buttons preview */}
              {botoes && botoes.filter((b) => b.text).length > 0 && (
                <div className="mt-1 space-y-1">
                  {botoes.filter((b) => b.text).map((btn, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 shadow-sm border border-gray-100"
                    >
                      {btn.type === 'url'
                        ? <Link2 size={12} className="text-[#128C7E]" />
                        : <MessageCircle size={12} className="text-[#128C7E]" />
                      }
                      <span className="text-sm text-[#128C7E] font-medium">{btn.text}</span>
                    </div>
                  ))}
                </div>
              )}
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
  const [midiaFile, setMidiaFile] = useState<File | undefined>();
  const [botoes, setBotoes] = useState<TemplateButton[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [metaStatus, setMetaStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [metaMessage, setMetaMessage] = useState('');

  useEffect(() => {
    if (editId) {
      const t = templates.find((t) => t.id === editId);
      if (t) {
        setNome(t.nome);
        setStage(t.stage ?? '');
        setCorpo(t.corpo);
        setMidia(t.midia);
        setMidiaNome(t.midiaNome);
        setBotoes(t.botoes ?? []);
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
    setMidiaFile(file);
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

  const addBotao = (type: TemplateButtonType) => {
    if (botoes.length >= 3) return;
    setBotoes([...botoes, { type, text: '', url: '' }]);
  };

  const updateBotao = (idx: number, field: keyof TemplateButton, value: string) => {
    setBotoes(botoes.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));
  };

  const removeBotao = (idx: number) => {
    setBotoes(botoes.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      setError('O nome do template é obrigatório');
      return;
    }
    if (!corpo.trim()) {
      setError('O corpo da mensagem é obrigatório');
      return;
    }
    const botoesValidos = botoes.filter((b) => b.text.trim());
    for (const b of botoesValidos) {
      if (b.type === 'url' && !b.url?.trim()) {
        setError('Botões de link precisam ter uma URL');
        return;
      }
    }
    setError('');
    setSaving(true);
    setMetaStatus('sending');
    setMetaMessage('Fazendo upload da imagem...');

    try {
      // 1. Upload da imagem para Supabase Storage (se houver)
      let imageUrl: string | undefined;
      if (midiaFile) {
        imageUrl = await uploadImageToSupabase(midiaFile);
      }

      // 2. Salva no Supabase (usa URL pública em vez de base64)
      const templateData = {
        nome,
        corpo,
        stage: stage || undefined,
        midia: imageUrl ?? midia, // URL pública se subiu, senão mantém o que tinha
        midiaNome: midiaNome,
        botoes: botoesValidos,
      };
      if (editId) {
        await updateTemplate(editId, templateData);
      } else {
        await saveTemplate(templateData);
      }

      // 3. Cria na Meta API
      setMetaMessage('Enviando para a Meta...');
      const result = await createMetaTemplate({ nome, corpo, imageFile: midiaFile, botoes: botoesValidos });
      setMetaStatus('success');
      const statusLabel = result.status === 'PENDING' ? 'Aguardando aprovação' : result.status;
      setMetaMessage(`Template enviado! Status Meta: ${statusLabel}.`);
    } catch (err) {
      setMetaStatus('error');
      setMetaMessage(err instanceof Error ? err.message : 'Erro ao salvar template');
    } finally {
      setSaving(false);
      setTimeout(() => navigate('/templates'), 2500);
    }
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
              <p className="text-xs text-gray-400 mt-1">
                Será normalizado para a Meta: <span className="font-mono">{nome ? nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : '—'}</span>
              </p>
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
              <div className="flex items-start gap-1.5 mt-1 mb-2 text-xs text-blue-700 bg-blue-50 px-2.5 py-2 rounded-lg">
                <Info size={12} className="mt-0.5 shrink-0" />
                <span>A imagem será enviada para o Supabase Storage e a URL pública usada na criação do template na Meta.</span>
              </div>
              {midia ? (
                <div className="mt-1 relative">
                  <img
                    src={midia}
                    alt="Preview"
                    className="w-full max-h-40 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => { setMidia(undefined); setMidiaNome(undefined); setMidiaFile(undefined); }}
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
              <div className="flex gap-1 mb-1.5">
                <button
                  type="button"
                  onClick={() => insertFormat('*', '*')}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors font-bold text-xs"
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

            {/* Botões */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Botões com link (opcional)</Label>
                <span className="text-xs text-gray-400">{botoes.length}/3</span>
              </div>

              {botoes.length > 0 && (
                <div className="space-y-3 mb-3">
                  {botoes.map((btn, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                          {btn.type === 'url' ? (
                            <><Link2 size={11} /> Botão com link</>
                          ) : (
                            <><MessageCircle size={11} /> Resposta rápida</>
                          )}
                          <span className="text-gray-400">#{i + 1}</span>
                        </span>
                        <button onClick={() => removeBotao(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Texto do botão *</label>
                        <Input
                          placeholder={btn.type === 'url' ? 'Ex: Saiba mais, Acesse aqui...' : 'Ex: Sim, quero! / Não tenho interesse'}
                          value={btn.text}
                          maxLength={25}
                          onChange={(e) => updateBotao(i, 'text', e.target.value)}
                        />
                        <p className="text-xs text-gray-400 mt-0.5 text-right">{btn.text.length}/25</p>
                      </div>
                      {btn.type === 'url' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">URL de destino *</label>
                          <Input
                            placeholder="https://..."
                            value={btn.url ?? ''}
                            onChange={(e) => updateBotao(i, 'url', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {botoes.length < 3 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addBotao('url')}
                    className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 border border-dashed border-primary-300 rounded-lg px-3 py-2 flex-1 justify-center hover:bg-primary-50 transition-colors"
                  >
                    <Link2 size={12} />
                    + Link
                  </button>
                  <button
                    type="button"
                    onClick={() => addBotao('quick_reply')}
                    className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 border border-dashed border-green-300 rounded-lg px-3 py-2 flex-1 justify-center hover:bg-green-50 transition-colors"
                  >
                    <MessageCircle size={12} />
                    + Resposta rápida
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            {metaStatus === 'sending' && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                <Loader2 size={14} className="animate-spin" />
                {metaMessage}
              </div>
            )}

            {metaStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle size={14} />
                {metaMessage}
              </div>
            )}

            {metaStatus === 'error' && (
              <div className="space-y-1">
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span><strong>Erro Meta:</strong> {metaMessage} — Template salvo no Supabase.</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/templates')} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Salvando...' : editId ? 'Atualizar Template' : 'Salvar Template'}
              </Button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="p-6 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Prévia do WhatsApp
            </p>
            <div
              className="max-w-sm mx-auto bg-white rounded-xl shadow-md overflow-hidden"
              style={{ minHeight: '480px', display: 'flex', flexDirection: 'column' }}
            >
              <WhatsAppPreview nome={nome} corpo={corpo} midia={midia} botoes={botoes} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
