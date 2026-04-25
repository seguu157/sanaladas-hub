import React, { useState } from 'react';
import { Calendar, Users, UserCheck, Clock, Edit2, Check, X, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { ExtractedData } from '../../types';

interface OrderInformationProps {
  data: ExtractedData['order_information'];
  onUpdate?: (updatedData: ExtractedData['order_information']) => void;
}

const OrderInformation: React.FC<OrderInformationProps> = ({ data, onUpdate }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingMealField, setEditingMealField] = useState<string | null>(null);
  const [editMealValue, setEditMealValue] = useState('');
  const [editingMealType, setEditingMealType] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => getCurrentTime());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Convertir la fecha del evento a Date object
    const eventDate = data.event_date;
    const currentYear = new Date().getFullYear();
    const monthMap: Record<string, number> = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };
    
    const parts = eventDate.toLowerCase().split(' ');
    if (parts.length >= 2) {
      const day = parseInt(parts[0]);
      const monthName = parts[1];
      const monthIndex = monthMap[monthName];
      
      if (!isNaN(day) && monthIndex !== undefined) {
        return new Date(currentYear, monthIndex, day);
      }
    }
    return new Date();
  });
  const [calendarDate, setCalendarDate] = useState(new Date(selectedDate));

  function getCurrentDate() {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'short', 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function getCurrentTime() {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const formatEventDate = (dateString: string) => {
    const currentYear = new Date().getFullYear();
    const monthMap: Record<string, number> = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };
    
    const parts = dateString.toLowerCase().split(' ');
    if (parts.length >= 2) {
      const day = parseInt(parts[0]);
      const monthName = parts[1];
      const monthIndex = monthMap[monthName];
      
      if (!isNaN(day) && monthIndex !== undefined) {
        const date = new Date(currentYear, monthIndex, day);
        return date.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: '2-digit',
          month: 'short'
        });
      }
    }
    return dateString;
  };

  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getDaysInMonth = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Días del mes anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Días del mes siguiente
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({ date: nextDate, isCurrentMonth: false });
    }
    
    return days;
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const newDateString = `${day} ${month}`;

    if (onUpdate) {
      onUpdate({
        ...data,
        event_date: newDateString
      });
    }

    setShowDatePicker(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  // Update current time every second for real-time display
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleMealDoubleClick = (mealType: string, field: string, currentValue: string) => {
    // Siempre usar el sufijo '-detail' para los campos de la sección de detalles
    const fieldKey = `${mealType}-${field}-detail`;
    setEditingMealField(fieldKey);
    setEditMealValue(currentValue || '');
  };

  const handleMealSave = () => {
    if (onUpdate && editingMealField) {
      const parts = editingMealField.split('-');
      const mealType = parts[0];
      const field = parts[1];
      // Ignorar el sufijo '-detail' si existe
      const updatedMealTimes = {
        ...data.meal_times,
        [mealType]: {
          ...data.meal_times[mealType as keyof typeof data.meal_times],
          [field]: editMealValue
        }
      };
      
      onUpdate({
        ...data,
        meal_times: updatedMealTimes
      });
    }
    setEditingMealField(null);
    setEditMealValue('');
  };

  const handleMealCancel = () => {
    setEditingMealField(null);
    setEditMealValue('');
  };

  const handleMealKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleMealSave();
    } else if (e.key === 'Escape') {
      handleMealCancel();
    }
  };

  const handleDeleteMeal = (mealType: string) => {
    if (onUpdate) {
      const updatedMealTimes = { ...data.meal_times };
      delete updatedMealTimes[mealType as keyof typeof data.meal_times];

      onUpdate({
        ...data,
        meal_times: updatedMealTimes
      });
    }
  };

  const handleAddMeal = () => {
    if (onUpdate) {
      const availableMeals = ['breakfast', 'lunch', 'dinner', 'coffee_break', 'finger_food'].filter(
        meal => !data.meal_times[meal as keyof typeof data.meal_times]
      );

      if (availableMeals.length > 0) {
        const newMealType = availableMeals[0];
        const updatedMealTimes = {
          ...data.meal_times,
          [newMealType]: {
            preparation_time: '',
            delivery_time: '',
            delivery_responsible: ''
          }
        };

        onUpdate({
          ...data,
          meal_times: updatedMealTimes
        });
      }
    }
  };

  const handleMealTypeChange = (oldMealType: string, newMealType: string) => {
    if (onUpdate && oldMealType !== newMealType) {
      const updatedMealTimes = { ...data.meal_times };
      const mealData = updatedMealTimes[oldMealType as keyof typeof data.meal_times];

      delete updatedMealTimes[oldMealType as keyof typeof data.meal_times];

      updatedMealTimes[newMealType as keyof typeof data.meal_times] = mealData;

      onUpdate({
        ...data,
        meal_times: updatedMealTimes
      });

      setEditingMealType(null);
    }
  };

  const getAvailableMealTypes = (currentMealType: string) => {
    const allMeals = [
      { value: 'breakfast', label: 'Desayuno' },
      { value: 'coffee_break', label: 'Coffee Break' },
      { value: 'finger_food', label: 'Finger Food' },
      { value: 'lunch', label: 'Almuerzo' },
      { value: 'dinner', label: 'Cena' }
    ];

    return allMeals.filter(meal =>
      meal.value === currentMealType || !data.meal_times[meal.value as keyof typeof data.meal_times]
    );
  };

  const getMealLabel = (mealType: string) => {
    const labels: Record<string, string> = {
      'breakfast': 'Desayuno',
      'coffee_break': 'Coffee Break',
      'finger_food': 'Finger Food',
      'lunch': 'Almuerzo',
      'dinner': 'Cena'
    };
    return labels[mealType] || mealType;
  };

  const handleDateFieldClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDatePicker(prev => !prev);
  };

  // Cerrar el calendario cuando se hace clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDatePicker) {
        const target = event.target as HTMLElement;
        if (!target.closest('.date-picker-container')) {
          setShowDatePicker(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const renderDateField = () => {
    return (
      <div className="relative">
        {/* Campo de fecha */}
        <div
          className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-xl hover:shadow-md transition-all cursor-pointer group"
          onClick={handleDateFieldClick}
        >
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Calendar className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-orange-800 uppercase tracking-wide mb-1">Fecha del Evento</p>
            <p className="text-lg font-bold text-slate-900">
              {data.event_date}
            </p>
          </div>
          <Edit2 className="h-5 w-5 text-orange-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Overlay para cerrar */}
        {showDatePicker && (
          <div
            className="fixed inset-0 bg-black/40 z-[9998]"
            onClick={() => setShowDatePicker(false)}
          />
        )}

        {/* Calendar Dropdown - SIEMPRE CENTRADO EN PANTALLA */}
        {showDatePicker && (
          <div className="date-picker-container fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-slate-300 rounded-2xl shadow-2xl z-[9999] p-5 w-[360px] max-w-[calc(100vw-2rem)]">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateMonth('prev');
                }}
                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                type="button"
              >
                <ChevronLeft className="h-5 w-5 text-slate-700" />
              </button>

              <h4 className="font-bold text-lg text-slate-900 capitalize">
                {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </h4>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateMonth('next');
                }}
                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                type="button"
              >
                <ChevronRight className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="p-2 text-center text-xs font-bold text-slate-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {getDaysInMonth().map((day, index) => {
                const isCurrentDay = isToday(day.date);
                const isSelected = isSameDay(day.date, selectedDate);

                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateSelect(day.date);
                    }}
                    type="button"
                    className={`w-full h-10 flex items-center justify-center text-sm font-semibold rounded-lg transition-all ${
                      day.isCurrentMonth
                        ? isSelected
                          ? 'bg-orange-600 text-white shadow-lg scale-105'
                          : isCurrentDay
                          ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300'
                          : 'hover:bg-slate-100 text-slate-800'
                        : 'text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Calendar Footer */}
            <div className="flex gap-2 mt-4 pt-4 border-t-2 border-slate-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDatePicker(false);
                }}
                type="button"
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDateSelect(new Date());
                }}
                type="button"
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-md hover:shadow-lg transition-all"
              >
                Hoy
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEditableField = (
    field: keyof ExtractedData['order_information'],
    label: string,
    icon: React.ReactNode,
    value: string,
    suffix?: string
  ) => {
    const isEditing = editingField === field;

    return (
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
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
              <p className="text-slate-800 break-words font-semibold text-xs sm:text-sm pr-6">
                {value}{suffix}
              </p>
              <Edit2 className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Filtrar solo comidas que tengan al menos un campo con valor
  const activeMeals = Object.entries(data.meal_times).filter(([_, meal]) => {
    if (!meal) return false;
    // Solo mostrar si tiene al menos un campo con valor
    return meal.preparation_time || meal.delivery_time || meal.delivery_responsible;
  });

  return (
    <div>
      {/* Información del Pedido */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Calendar className="h-4 w-4 text-orange-600" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">
            Información del Pedido
          </h3>
        </div>

        {/* Selector de fecha destacado */}
        <div className="mb-3 sm:mb-4">
          {renderDateField()}
        </div>

        <div className="space-y-2 sm:space-y-3">
          
          {renderEditableField(
            'number_of_attendees',
            'Número de Asistentes',
            <Users className="h-4 w-4 text-slate-400 mt-0.5" />,
            data.number_of_attendees,
            ' personas'
          )}
          
          {renderEditableField(
            'sales_representative',
            'Representante de Ventas',
            <UserCheck className="h-4 w-4 text-slate-400 mt-0.5" />,
            data.sales_representative
          )}
          
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-slate-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600">Horarios</p>
                  <button
                    onClick={handleAddMeal}
                    disabled={activeMeals.length >= 5}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-colors"
                    title="Añadir horario"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Añadir</span>
                  </button>
                </div>
                {activeMeals.length === 0 ? (
                  <div className="bg-orange-50 rounded-lg p-2.5 border border-orange-200 relative group">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Tipo:</span>
                        <button
                          onClick={() => setEditingMealType('default')}
                          className="flex-1 text-left font-bold text-slate-800 text-sm bg-white px-2 py-1 rounded border border-orange-300 hover:border-orange-500 hover:bg-orange-100 transition-colors"
                          title="Haz clic para cambiar tipo de horario"
                        >
                          {editingMealType === 'default' ? (
                            <select
                              value="lunch"
                              onChange={(e) => {
                                if (onUpdate) {
                                  const newMealType = e.target.value;
                                  const updatedMealTimes = {
                                    ...data.meal_times,
                                    [newMealType]: {
                                      preparation_time: '',
                                      delivery_time: '',
                                      delivery_responsible: ''
                                    }
                                  };
                                  onUpdate({
                                    ...data,
                                    meal_times: updatedMealTimes
                                  });
                                }
                                setEditingMealType(null);
                              }}
                              onBlur={() => setEditingMealType(null)}
                              className="w-full font-bold text-slate-800 text-sm bg-white border-2 border-orange-500 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              autoFocus
                            >
                              <option value="breakfast">Desayuno</option>
                              <option value="coffee_break">Coffee Break</option>
                              <option value="finger_food">Finger Food</option>
                              <option value="lunch">Almuerzo</option>
                              <option value="dinner">Cena</option>
                            </select>
                          ) : (
                            'Almuerzo'
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {/* Preparación */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 w-20 flex-shrink-0">Preparación:</span>
                        {editingMealField === 'default-preparation_time' ? (
                          <input
                            type="text"
                            value={editMealValue}
                            onChange={(e) => setEditMealValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (onUpdate) {
                                  const updatedMealTimes = {
                                    ...data.meal_times,
                                    lunch: {
                                      preparation_time: editMealValue,
                                      delivery_time: '',
                                      delivery_responsible: ''
                                    }
                                  };
                                  onUpdate({
                                    ...data,
                                    meal_times: updatedMealTimes
                                  });
                                }
                                setEditingMealField(null);
                                setEditMealValue('');
                              } else if (e.key === 'Escape') {
                                setEditingMealField(null);
                                setEditMealValue('');
                              }
                            }}
                            onBlur={() => {
                              if (onUpdate && editMealValue) {
                                const updatedMealTimes = {
                                  ...data.meal_times,
                                  lunch: {
                                    preparation_time: editMealValue,
                                    delivery_time: '',
                                    delivery_responsible: ''
                                  }
                                };
                                onUpdate({
                                  ...data,
                                  meal_times: updatedMealTimes
                                });
                              }
                              setEditingMealField(null);
                              setEditMealValue('');
                            }}
                            className="flex-1 bg-white border-2 border-orange-500 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                            autoFocus
                            placeholder="Ej: 08:00"
                          />
                        ) : (
                          <div
                            onDoubleClick={() => {
                              setEditingMealField('default-preparation_time');
                              setEditMealValue('');
                            }}
                            className="flex-1 bg-white rounded px-2 py-1 text-slate-500 cursor-pointer hover:bg-orange-100 hover:text-slate-800 transition-colors border border-orange-200 hover:border-orange-300"
                          >
                            Sin especificar
                          </div>
                        )}
                      </div>

                      {/* Entrega */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 w-20 flex-shrink-0">Entrega:</span>
                        {editingMealField === 'default-delivery_time' ? (
                          <input
                            type="text"
                            value={editMealValue}
                            onChange={(e) => setEditMealValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (onUpdate) {
                                  const currentMeal = data.meal_times.lunch || { preparation_time: '', delivery_time: '', delivery_responsible: '' };
                                  const updatedMealTimes = {
                                    ...data.meal_times,
                                    lunch: {
                                      ...currentMeal,
                                      delivery_time: editMealValue
                                    }
                                  };
                                  onUpdate({
                                    ...data,
                                    meal_times: updatedMealTimes
                                  });
                                }
                                setEditingMealField(null);
                                setEditMealValue('');
                              } else if (e.key === 'Escape') {
                                setEditingMealField(null);
                                setEditMealValue('');
                              }
                            }}
                            onBlur={() => {
                              if (onUpdate && editMealValue) {
                                const currentMeal = data.meal_times.lunch || { preparation_time: '', delivery_time: '', delivery_responsible: '' };
                                const updatedMealTimes = {
                                  ...data.meal_times,
                                  lunch: {
                                    ...currentMeal,
                                    delivery_time: editMealValue
                                  }
                                };
                                onUpdate({
                                  ...data,
                                  meal_times: updatedMealTimes
                                });
                              }
                              setEditingMealField(null);
                              setEditMealValue('');
                            }}
                            className="flex-1 bg-white border-2 border-orange-500 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                            autoFocus
                            placeholder="Ej: 12:30"
                          />
                        ) : (
                          <div
                            onDoubleClick={() => {
                              setEditingMealField('default-delivery_time');
                              setEditMealValue('');
                            }}
                            className="flex-1 bg-white rounded px-2 py-1 text-slate-500 cursor-pointer hover:bg-orange-100 hover:text-slate-800 transition-colors border border-orange-200 hover:border-orange-300"
                          >
                            Sin especificar
                          </div>
                        )}
                      </div>

                      {/* Responsable */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 w-20 flex-shrink-0">Responsable:</span>
                        {editingMealField === 'default-delivery_responsible' ? (
                          <input
                            type="text"
                            value={editMealValue}
                            onChange={(e) => setEditMealValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (onUpdate) {
                                  const currentMeal = data.meal_times.lunch || { preparation_time: '', delivery_time: '', delivery_responsible: '' };
                                  const updatedMealTimes = {
                                    ...data.meal_times,
                                    lunch: {
                                      ...currentMeal,
                                      delivery_responsible: editMealValue
                                    }
                                  };
                                  onUpdate({
                                    ...data,
                                    meal_times: updatedMealTimes
                                  });
                                }
                                setEditingMealField(null);
                                setEditMealValue('');
                              } else if (e.key === 'Escape') {
                                setEditingMealField(null);
                                setEditMealValue('');
                              }
                            }}
                            onBlur={() => {
                              if (onUpdate && editMealValue) {
                                const currentMeal = data.meal_times.lunch || { preparation_time: '', delivery_time: '', delivery_responsible: '' };
                                const updatedMealTimes = {
                                  ...data.meal_times,
                                  lunch: {
                                    ...currentMeal,
                                    delivery_responsible: editMealValue
                                  }
                                };
                                onUpdate({
                                  ...data,
                                  meal_times: updatedMealTimes
                                });
                              }
                              setEditingMealField(null);
                              setEditMealValue('');
                            }}
                            className="flex-1 bg-white border-2 border-orange-500 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                            autoFocus
                            placeholder="Ej: nosotros"
                          />
                        ) : (
                          <div
                            onDoubleClick={() => {
                              setEditingMealField('default-delivery_responsible');
                              setEditMealValue('');
                            }}
                            className="flex-1 bg-white rounded px-2 py-1 text-slate-500 cursor-pointer hover:bg-orange-100 hover:text-slate-800 transition-colors border border-orange-200 hover:border-orange-300"
                          >
                            Sin especificar
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeMeals.map(([mealType, meal]) => (
                      <div key={mealType} className="bg-orange-50 rounded-lg p-2.5 border border-orange-200 relative group">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Tipo:</span>
                            {editingMealType === mealType ? (
                              <select
                                value={mealType}
                                onChange={(e) => handleMealTypeChange(mealType, e.target.value)}
                                onBlur={() => setEditingMealType(null)}
                                className="flex-1 font-bold text-slate-800 text-sm bg-white border-2 border-orange-500 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                autoFocus
                              >
                                {getAvailableMealTypes(mealType).map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <button
                                onClick={() => setEditingMealType(mealType)}
                                className="flex-1 text-left font-bold text-slate-800 text-sm bg-white px-2 py-1 rounded border border-orange-300 hover:border-orange-500 hover:bg-orange-100 transition-colors"
                                title="Haz clic para cambiar tipo de horario"
                              >
                                {getMealLabel(mealType)}
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteMeal(mealType)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
                            title="Eliminar horario"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          {/* Preparación */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-600 w-20 flex-shrink-0">Preparación:</span>
                            {editingMealField === `${mealType}-preparation_time-detail` ? (
                              <input
                                type="text"
                                value={editMealValue}
                                onChange={(e) => setEditMealValue(e.target.value)}
                                onKeyDown={handleMealKeyPress}
                                onBlur={handleMealSave}
                                className="flex-1 bg-white border-2 border-orange-500 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                autoFocus
                                placeholder="Ej: 08:00"
                              />
                            ) : (
                              <div
                                onDoubleClick={() => handleMealDoubleClick(mealType, 'preparation_time', meal!.preparation_time)}
                                className="flex-1 bg-white rounded px-2 py-1 text-slate-900 font-semibold cursor-pointer hover:bg-orange-100 transition-colors border border-transparent hover:border-orange-300"
                              >
                                {meal!.preparation_time || 'Sin especificar'}
                              </div>
                            )}
                          </div>

                          {/* Entrega */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-600 w-20 flex-shrink-0">Entrega:</span>
                            {editingMealField === `${mealType}-delivery_time-detail` ? (
                              <input
                                type="text"
                                value={editMealValue}
                                onChange={(e) => setEditMealValue(e.target.value)}
                                onKeyDown={handleMealKeyPress}
                                onBlur={handleMealSave}
                                className="flex-1 bg-white border-2 border-orange-500 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                autoFocus
                                placeholder="Ej: 12:30"
                              />
                            ) : (
                              <div
                                onDoubleClick={() => handleMealDoubleClick(mealType, 'delivery_time', meal!.delivery_time)}
                                className="flex-1 bg-white rounded px-2 py-1 text-slate-900 font-semibold cursor-pointer hover:bg-orange-100 transition-colors border border-transparent hover:border-orange-300"
                              >
                                {meal!.delivery_time || 'Sin especificar'}
                              </div>
                            )}
                          </div>

                          {/* Responsable */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-600 w-20 flex-shrink-0">Responsable:</span>
                            {editingMealField === `${mealType}-delivery_responsible-detail` ? (
                              <input
                                type="text"
                                value={editMealValue}
                                onChange={(e) => setEditMealValue(e.target.value)}
                                onKeyDown={handleMealKeyPress}
                                onBlur={handleMealSave}
                                className="flex-1 bg-white border-2 border-orange-500 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                autoFocus
                                placeholder="Ej: nosotros"
                              />
                            ) : (
                              <div
                                onDoubleClick={() => handleMealDoubleClick(mealType, 'delivery_responsible', meal!.delivery_responsible)}
                                className="flex-1 bg-white rounded px-2 py-1 text-slate-900 font-semibold cursor-pointer hover:bg-orange-100 transition-colors border border-transparent hover:border-orange-300"
                              >
                                {meal!.delivery_responsible || 'Sin especificar'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {editingField && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 Presiona Enter para guardar o Escape para cancelar
            </p>
          </div>
        )}
        
        {editingMealField && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-700">
              ⏰ Editando horario - Presiona Enter para guardar o Escape para cancelar
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderInformation;