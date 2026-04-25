import React, { useState } from 'react';
import { User, Building, MapPin, Phone, Edit2, Check, X } from 'lucide-react';
import { ExtractedData } from '../../types';

interface ClientDetailsProps {
  data: ExtractedData['client_details'];
  onUpdate?: (updatedData: ExtractedData['client_details']) => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ data, onUpdate }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleDoubleClick = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSave = () => {
    if (onUpdate && editingField) {
      const updatedData = {
        ...data,
        [editingField]: editValue
      };
      onUpdate(updatedData);
    }
    setEditingField(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const renderEditableField = (
    field: keyof ExtractedData['client_details'],
    label: string,
    icon: React.ReactNode,
    value: string
  ) => {
    const isEditing = editingField === field;

    return (
      <div className="flex items-start gap-2">
        {icon}
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-slate-600">{label}</p>
          {isEditing ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onDoubleClick={() => handleDoubleClick(field, value)}
              className="group cursor-pointer p-1 rounded hover:bg-blue-50 transition-colors relative"
            >
              <p className="text-slate-800 break-words text-xs sm:text-sm pr-6">{value}</p>
              <Edit2 className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <User className="h-4 w-4 text-blue-600" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-slate-800">
          Detalles del Cliente
        </h3>
      </div>
      
      <div className="space-y-2.5">
        {renderEditableField(
          'company_name',
          'Empresa',
          <Building className="h-4 w-4 text-slate-400 mt-0.5" />,
          data.company_name
        )}
        
        {renderEditableField(
          'contact_person',
          'Persona de Contacto',
          <User className="h-4 w-4 text-slate-400 mt-0.5" />,
          data.contact_person
        )}
        
        {renderEditableField(
          'address',
          'Dirección',
          <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />,
          data.address
        )}
        
        {renderEditableField(
          'phone_number',
          'Teléfono',
          <Phone className="h-4 w-4 text-slate-400 mt-0.5" />,
          data.phone_number
        )}
      </div>
      
      {editingField && (
        <div className="mt-2.5 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 Presiona Enter para guardar o Escape para cancelar
          </p>
        </div>
      )}
    </div>
  );
};

export default ClientDetails;