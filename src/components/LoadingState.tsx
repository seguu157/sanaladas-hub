import React from 'react';
import { Brain, Loader2, Send, CheckCircle, Zap } from 'lucide-react';

interface LoadingStateProps {
  isWebhookProcessing?: boolean;
  progress?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  isWebhookProcessing = false, 
  progress = '' 
}) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <div className="space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className={`absolute inset-0 rounded-full flex items-center justify-center ${
              isWebhookProcessing ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {isWebhookProcessing ? (
                <Send className="h-10 w-10 text-green-600" />
              ) : (
                <Brain className="h-10 w-10 text-blue-600" />
              )}
            </div>
            <Loader2 className={`absolute inset-0 h-20 w-20 animate-spin ${
              isWebhookProcessing ? 'text-green-300' : 'text-blue-300'
            }`} />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              {isWebhookProcessing ? 'Procesando con IA' : 'Procesando con LlamaIndex'}
            </h3>
            <p className="text-slate-500">
              {isWebhookProcessing ? 'Enviando PDF al servidor de IA...' : 'Extrayendo información del PDF...'}
            </p>
          </div>
          
          {/* Progress indicator for webhook processing */}
          {isWebhookProcessing && progress && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                {progress.includes('exitosamente') ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Zap className="h-5 w-5 text-green-600" />
                )}
                <span className="text-green-700 font-medium">{progress}</span>
              </div>
              {!progress.includes('exitosamente') && (
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <div className="w-64 mx-auto bg-slate-200 rounded-full h-2">
              <div className={`h-2 rounded-full animate-pulse ${
                isWebhookProcessing ? 'bg-green-600' : 'bg-blue-600'
              }`} style={{ width: '70%' }}></div>
            </div>
            <p className="text-xs text-slate-400">
              {isWebhookProcessing ? 'Procesamiento automático en curso...' : 'Esto puede tomar unos segundos'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingState;