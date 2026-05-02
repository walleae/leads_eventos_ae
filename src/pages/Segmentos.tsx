import { Layers, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSegmentos } from '../hooks/useSegmentos';

export default function Segmentos() {
  const { segmentos, loading, toggleCadenciaAtiva } = useSegmentos();

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Segmentos</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Defina quais segmentos podem receber cadências automáticas
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
          <Layers size={16} className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Apenas segmentos com cadência ativa aparecem na seleção ao criar uma cadência.
            Leads criados em segmentos desativados não receberão disparos automáticos.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {segmentos.map((seg) => (
              <div key={seg.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{seg.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {seg.cadenciaAtiva ? 'Cadências ativas' : 'Cadências desativadas'}
                  </p>
                </div>
                <button
                  onClick={() => toggleCadenciaAtiva(seg.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    seg.cadenciaAtiva
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {seg.cadenciaAtiva
                    ? <><ToggleRight size={14} /> Ativo</>
                    : <><ToggleLeft size={14} /> Inativo</>
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
