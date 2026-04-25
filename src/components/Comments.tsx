import React, { useState } from 'react';
import { MessageSquare, Plus, Clock, Trash2 } from 'lucide-react';
import { Comment } from '../types';

interface CommentsProps {
  orderId: string;
  comments: Comment[];
  onAddComment: (orderId: string, text: string) => void;
  onDeleteComment: (orderId: string, commentId: string) => void;
}

const Comments: React.FC<CommentsProps> = ({ orderId, comments, onAddComment, onDeleteComment }) => {
  const [newComment, setNewComment] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(orderId, newComment.trim());
      setNewComment('');
      setIsAdding(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">
            Comentarios y Cambios
          </h3>
          <p className="text-sm text-slate-600">
            {comments.length} comentario{comments.length !== 1 ? 's' : ''} registrado{comments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
            isAdding 
              ? 'bg-slate-200 text-slate-700' 
              : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isAdding ? 'Cancelar' : 'Agregar'}
          </span>
        </button>
      </div>

      {/* Formulario para nuevo comentario */}
      {isAdding && (
        <div className="mb-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-2">
                Nuevo comentario
              </label>
              <textarea
                id="comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Describe los cambios de última hora o notas importantes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                rows={3}
                required
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Agregar Comentario
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewComment('');
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de comentarios */}
      <div className="space-y-2.5">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">No hay comentarios aún</p>
            <p className="text-xs sm:text-sm mt-1">
              Agrega notas sobre cambios de última hora o información importante
            </p>
          </div>
        ) : (
          comments
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((comment) => (
              <div
                key={comment.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {formatTimestamp(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-800 text-sm sm:text-base break-words">
                      {comment.text}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteComment(orderId, comment.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar comentario"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>

      {comments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            Los comentarios se ordenan del más reciente al más antiguo
          </p>
        </div>
      )}
    </div>
  );
};

export default Comments;