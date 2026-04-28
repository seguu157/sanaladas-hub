import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  Send,
  Cloud,
  Brain,
  Database,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export type ProcessingStage =
  | 'uploading'
  | 'sending'
  | 'received_by_llamaindex'
  | 'extracting'
  | 'creating'
  | 'completed'
  | 'error';

interface Step {
  id: ProcessingStage;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  {
    id: 'uploading',
    label: 'Subir PDF',
    description: 'Guardando el archivo en el almacenamiento seguro',
    icon: FileText,
  },
  {
    id: 'sending',
    label: 'Enviar a n8n',
    description: 'Iniciando el flujo automático de procesamiento',
    icon: Send,
  },
  {
    id: 'received_by_llamaindex',
    label: 'PDF recibido por LlamaIndex',
    description: 'Confirmado por la API de LlamaIndex (file_id devuelto)',
    icon: Cloud,
  },
  {
    id: 'extracting',
    label: 'Extraer datos con IA',
    description: 'LlamaIndex está analizando el PDF (esto puede tardar 1-2 minutos)',
    icon: Brain,
  },
  {
    id: 'creating',
    label: 'Crear pedido',
    description: 'Guardando el pedido normalizado en la base de datos',
    icon: Database,
  },
  {
    id: 'completed',
    label: 'Pedido disponible',
    description: 'El pedido ya está visible en el dashboard',
    icon: Sparkles,
  },
];

const STAGE_INDEX: Record<ProcessingStage, number> = {
  uploading: 0,
  sending: 1,
  received_by_llamaindex: 2,
  extracting: 3,
  creating: 4,
  completed: 5,
  error: -1,
};

interface Props {
  currentStage: ProcessingStage;
  fileName?: string;
  errorMessage?: string;
  startedAt?: number | null;
  onRetry?: () => void;
  onCancel?: () => void;
}

const formatElapsed = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  return `${seconds}s`;
};

const PdfProcessingProgress: React.FC<Props> = ({
  currentStage,
  fileName,
  errorMessage,
  startedAt,
  onRetry,
  onCancel,
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (currentStage === 'completed' || currentStage === 'error') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [currentStage]);

  const currentIdx = STAGE_INDEX[currentStage];
  const isError = currentStage === 'error';
  const isDone = currentStage === 'completed';
  const elapsed = startedAt ? now - startedAt : 0;

  const heading = isError
    ? 'Error procesando el PDF'
    : isDone
      ? '¡Pedido creado correctamente!'
      : 'Procesando tu PDF';

  const subheading = isError
    ? 'Algo falló durante el procesamiento. Puedes reintentarlo cuando quieras.'
    : isDone
      ? 'En unos segundos te llevamos a la vista del pedido.'
      : 'No cierres esta ventana. El proceso continuará automáticamente.';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <div
            className={`mx-auto mb-3 w-14 h-14 rounded-full flex items-center justify-center ${
              isError
                ? 'bg-red-100'
                : isDone
                  ? 'bg-green-100'
                  : 'bg-blue-100'
            }`}
          >
            {isError ? (
              <AlertCircle className="w-7 h-7 text-red-600" />
            ) : isDone ? (
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            ) : (
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-1">{heading}</h3>
          {fileName && (
            <p className="text-sm text-slate-500 truncate" title={fileName}>
              {fileName}
            </p>
          )}
          <p className="text-sm text-slate-500 mt-1">{subheading}</p>
          {!isError && !isDone && startedAt && (
            <p className="text-xs text-slate-400 mt-1">
              Tiempo transcurrido: {formatElapsed(elapsed)}
            </p>
          )}
        </div>

        <ol className="space-y-3 sm:space-y-4">
          {STEPS.map((step, idx) => {
            const isCompletedStep = !isError && idx < currentIdx;
            const isActiveStep = !isError && idx === currentIdx && !isDone;
            const isFinalDone = isDone && idx === STAGE_INDEX.completed;
            const isErrorStep = isError && idx === Math.max(currentIdx, 0);
            const Icon = step.icon;

            return (
              <li
                key={step.id}
                className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                  isActiveStep
                    ? 'bg-blue-50 border border-blue-100'
                    : isErrorStep
                      ? 'bg-red-50 border border-red-100'
                      : 'bg-transparent'
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompletedStep || isFinalDone ? (
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  ) : isActiveStep ? (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  ) : isErrorStep ? (
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 pt-1 min-w-0">
                  <p
                    className={`font-medium ${
                      isActiveStep
                        ? 'text-blue-700'
                        : isCompletedStep || isFinalDone
                          ? 'text-slate-700'
                          : isErrorStep
                            ? 'text-red-700'
                            : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-xs sm:text-sm ${
                      isActiveStep
                        ? 'text-slate-600'
                        : isErrorStep
                          ? 'text-red-600'
                          : 'text-slate-400'
                    }`}
                  >
                    {isErrorStep && errorMessage ? errorMessage : step.description}
                  </p>
                  {isActiveStep && step.id === 'extracting' && (
                    <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full animate-pulse"
                        style={{ width: '65%' }}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {(isError || isDone) && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {isError && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            )}
            {isError && onCancel && (
              <button
                onClick={onCancel}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfProcessingProgress;
