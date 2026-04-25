import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Palette, X } from 'lucide-react';

interface ColorPickerProps {
  orderId: string;
  currentColors: string[];
  onUpdateColors: (colors: string[]) => Promise<void>;
}

const ORDER_COLORS = [
  { value: 'blue', label: 'Azul', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  { value: 'green', label: 'Verde', bg: 'bg-green-100', dot: 'bg-green-500' },
  { value: 'red', label: 'Rojo', bg: 'bg-red-100', dot: 'bg-red-500' },
  { value: 'yellow', label: 'Amarillo', bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ orderId, currentColors, onUpdateColors }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [colors, setColors] = useState<string[]>(currentColors);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const isOpeningRef = useRef(false);

  useEffect(() => {
    setColors(currentColors);
  }, [currentColors]);

  useEffect(() => {
    if (!isOpen) return;

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 288
      });
    }

    isOpeningRef.current = true;

    const handleClickOutside = (e: MouseEvent) => {
      if (isOpeningRef.current) {
        return;
      }

      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape);

    const timeoutId = setTimeout(() => {
      isOpeningRef.current = false;
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      isOpeningRef.current = false;
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleAddColor = async (colorValue: string) => {
    const newColors = [...colors, colorValue];
    setColors(newColors);
    await onUpdateColors(newColors);
  };

  const handleRemoveColor = async (colorValue: string) => {
    const index = colors.indexOf(colorValue);
    if (index === -1) return;

    const newColors = [...colors];
    newColors.splice(index, 1);
    setColors(newColors);
    await onUpdateColors(newColors);
  };

  const handleRemoveAll = async () => {
    setColors([]);
    await onUpdateColors([]);
  };

  const modal = isOpen && (
    <div
      ref={modalRef}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="bg-white rounded-lg shadow-xl border-2 border-slate-200 p-3 z-[9999] w-72"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-slate-700">Seleccionar colores</div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          title="Cerrar"
        >
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>
      <div className="space-y-2 mb-3">
        {ORDER_COLORS.map((color) => {
          const count = colors.filter(c => c === color.value).length;
          return (
            <div key={color.value} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
              <div className={`w-8 h-8 rounded-full shadow-md border-2 border-white ${color.dot} flex-shrink-0`} />
              <span className="text-sm font-medium text-slate-700 flex-1">{color.label}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveColor(color.value);
                  }}
                  disabled={count === 0}
                  className="w-6 h-6 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm transition-colors"
                  title="Quitar uno"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-bold text-slate-700">
                  {count}
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddColor(color.value);
                  }}
                  className="w-6 h-6 rounded bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center font-bold text-sm transition-colors"
                  title="Agregar uno"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {colors.length > 0 && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRemoveAll();
          }}
          className="w-full text-xs text-red-600 hover:bg-red-50 py-1.5 rounded transition-colors font-medium"
        >
          Limpiar todos los colores
        </button>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          isOpeningRef.current = true;
          setIsOpen(!isOpen);
        }}
        className={`relative flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all text-xs sm:text-sm font-medium ${
          colors.length > 0
            ? `${ORDER_COLORS.find(c => c.value === colors[0])?.bg || 'bg-slate-100'} text-slate-700`
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
        title="Asignar colores al pedido"
      >
        <Palette className="h-4 w-4" />
        {colors.length > 0 && (
          <div className="flex items-center gap-0.5">
            {colors.map((color, idx) => {
              const colorConfig = ORDER_COLORS.find(c => c.value === color);
              return (
                <div key={idx} className={`w-2 h-2 rounded-full ${
                  colorConfig?.dot || 'bg-slate-500'
                }`} />
              );
            })}
          </div>
        )}
        <span className="hidden sm:inline">Color</span>
      </button>

      {modal && createPortal(modal, document.body)}
    </>
  );
};
