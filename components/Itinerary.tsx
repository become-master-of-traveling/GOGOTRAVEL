import React, { useState } from 'react';
import { Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Place, DayPlan, TransportMode } from '../types';
import { MapPin, GripVertical, Trash2, Clock, Car, Footprints, Bus, PenLine } from 'lucide-react';

interface ItineraryProps {
  unscheduledPlaces: Place[];
  days: DayPlan[];
  activeDayId: string;
  setActiveDayId: (id: string) => void;
  onRemovePlace: (dayId: string | 'unscheduled', index: number) => void;
  onAddDay: () => void;
  onRemoveDay: (id: string) => void;
  onUpdatePlace: (dayId: string, index: number, updates: Partial<Place>) => void;
  onUpdateDay: (dayId: string, updates: Partial<DayPlan>) => void;
}

// Helper to add minutes to a time string "HH:MM"
const addMinutes = (timeStr: string, minutes: number): string => {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h);
  date.setMinutes(m + minutes);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export const Itinerary: React.FC<ItineraryProps> = ({ 
  unscheduledPlaces, 
  days, 
  activeDayId,
  setActiveDayId,
  onRemovePlace,
  onAddDay,
  onRemoveDay,
  onUpdatePlace,
  onUpdateDay
}) => {
  
  const activeDay = days.find(d => d.id === activeDayId) || days[0];

  // Calculate timeline for active day
  let currentTime = activeDay?.startTime || "09:00";
  const timelineTimes: { start: string, end: string }[] = [];
  
  if (activeDay) {
    activeDay.places.forEach(place => {
      const start = currentTime;
      const end = addMinutes(start, place.stayMinutes || 60);
      timelineTimes.push({ start, end });
      
      // Advance time by stay duration + travel time to next
      const travel = place.travelMinutesToNext !== undefined ? place.travelMinutesToNext : 0;
      currentTime = addMinutes(end, travel);
    });
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      
      {/* Left Sidebar: Day Selector & Unscheduled */}
      <div className="lg:w-1/3 flex flex-col gap-4">
        
        {/* Day Selector */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-700">行程天數</h3>
                <button onClick={onAddDay} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">+ 新增天數</button>
            </div>
            <div className="flex flex-wrap gap-2">
                {days.map((day, idx) => (
                    <div key={day.id} className="relative group">
                        <button
                            onClick={() => setActiveDayId(day.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeDayId === day.id 
                                ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {day.title}
                        </button>
                        {days.length > 1 && (
                             <button 
                             onClick={(e) => { e.stopPropagation(); onRemoveDay(day.id); }}
                             className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             ×
                           </button>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Unscheduled Pool */}
        <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col min-h-[300px]">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <MapPin size={18} className="text-slate-400" /> 
              待安排景點
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{unscheduledPlaces.length}</span>
            </h3>
            
            <Droppable droppableId="unscheduled">
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-slate-200/50 rounded-lg' : ''}`}
                >
                    {unscheduledPlaces.length === 0 && (
                        <p className="text-slate-400 text-sm text-center mt-8">拖曳左側搜尋結果，或將下方行程移至此處。</p>
                    )}
                    {unscheduledPlaces.map((place, index) => (
                        <Draggable key={place.id} draggableId={place.id} index={index}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex items-start gap-3 group ${snapshot.isDragging ? 'rotate-2 shadow-xl z-50' : ''}`}
                                >
                                    <GripVertical size={18} className="text-slate-300 mt-1 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-slate-800 text-sm truncate">{place.name}</h4>
                                        <p className="text-xs text-slate-500 truncate">{place.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => onRemovePlace('unscheduled', index)}
                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                </div>
            )}
            </Droppable>
        </div>
      </div>

      {/* Center: Active Day Editor */}
      <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
         {activeDay ? (
             <>
                <div className="flex justify-between items-end mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{activeDay.title} 行程表</h2>
                        <div className="flex items-center gap-2 mt-2 text-slate-600">
                            <Clock size={16} />
                            <span className="text-sm">出發時間：</span>
                            <input 
                                type="time" 
                                value={activeDay.startTime}
                                onChange={(e) => onUpdateDay(activeDay.id, { startTime: e.target.value })}
                                className="bg-slate-100 border-none rounded px-2 py-1 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-bold text-indigo-600">{activeDay.places.length}</span>
                        <span className="text-sm text-slate-500 ml-1">個景點</span>
                    </div>
                </div>

                <Droppable droppableId={activeDayId}>
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 space-y-0 relative pb-20 ${snapshot.isDraggingOver ? 'bg-indigo-50/30 rounded-lg' : ''}`}
                        >   
                            {activeDay.places.length === 0 && (
                                <div className="border-2 border-dashed border-slate-300 rounded-xl h-64 flex flex-col items-center justify-center text-slate-400">
                                    <MapPin size={48} className="mb-2 opacity-20" />
                                    <p>將左側景點或待排景點拖曳至此安排行程</p>
                                </div>
                            )}

                            {activeDay.places.map((place, index) => {
                                const time = timelineTimes[index];
                                return (
                                <Draggable key={place.id} draggableId={place.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="relative pl-8 pb-4"
                                        >
                                            {/* Timeline Line */}
                                            <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200 -z-10 last:hidden"></div>
                                            
                                            {/* Card */}
                                            <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm transition-shadow ${snapshot.isDragging ? 'shadow-xl rotate-1 z-50' : 'hover:shadow-md'}`}>
                                                <div className="flex justify-between items-start gap-3 mb-3">
                                                        {/* Drag Handle */}
                                                    <div {...provided.dragHandleProps} className="mt-1 cursor-grab text-slate-300 hover:text-slate-500">
                                                        <GripVertical size={20} />
                                                    </div>

                                                    {/* Number Badge */}
                                                    <div className="absolute -left-[16px] top-6 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm border-4 border-white">
                                                        {index + 1}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1">
                                                        <div className="flex justify-between">
                                                            <h3 className="font-bold text-lg text-slate-800">{place.name}</h3>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-mono font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                                                                    {time?.start} - {time?.end}
                                                                </span>
                                                                <button 
                                                                    onClick={() => onRemovePlace(activeDayId, index)}
                                                                    className="text-slate-300 hover:text-red-500 p-1"
                                                                    >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-500 line-clamp-1">{place.description}</p>
                                                        
                                                        {/* Settings Row */}
                                                        <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                                <Clock size={14} />
                                                                <span>停留:</span>
                                                                <input 
                                                                    type="number" 
                                                                    min="1"
                                                                    step="1"
                                                                    value={place.stayMinutes || 60}
                                                                    onChange={(e) => onUpdatePlace(activeDayId, index, { stayMinutes: Math.max(1, parseInt(e.target.value) || 0) })}
                                                                    className="w-16 bg-slate-100 rounded px-2 py-1 text-center font-medium focus:outline-indigo-500"
                                                                />
                                                                <span className="text-xs">分</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Transport Connector (if not last) */}
                                            {index < activeDay.places.length - 1 && (
                                                <div className="ml-8 mt-2 mb-2 p-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2 w-full max-w-lg">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">交通</span>
                                                        <div className="flex bg-white rounded border border-slate-200 p-0.5">
                                                            <button 
                                                                onClick={() => onUpdatePlace(activeDayId, index, { transportToNext: 'CAR' })}
                                                                className={`p-1.5 rounded ${place.transportToNext === 'CAR' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                                                                title="開車"
                                                            >
                                                                <Car size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => onUpdatePlace(activeDayId, index, { transportToNext: 'TRANSIT' })}
                                                                className={`p-1.5 rounded ${place.transportToNext === 'TRANSIT' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                                                                title="大眾運輸"
                                                            >
                                                                <Bus size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => onUpdatePlace(activeDayId, index, { transportToNext: 'WALK' })}
                                                                className={`p-1.5 rounded ${place.transportToNext === 'WALK' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                                                                title="步行"
                                                            >
                                                                <Footprints size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                                <input 
                                                                type="number" 
                                                                min="0"
                                                                step="1"
                                                                value={place.travelMinutesToNext !== undefined ? place.travelMinutesToNext : 15}
                                                                onChange={(e) => onUpdatePlace(activeDayId, index, { travelMinutesToNext: Math.max(0, parseInt(e.target.value) || 0) })}
                                                                className="w-12 bg-white border border-slate-200 rounded px-1 py-0.5 text-xs text-center focus:outline-indigo-500"
                                                                />
                                                                <span className="text-xs text-slate-500 whitespace-nowrap">分</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 w-full sm:w-auto flex items-center gap-1">
                                                        <PenLine size={12} className="text-slate-400" />
                                                        <input 
                                                            type="text"
                                                            placeholder="備註 (例: 202 號公車)"
                                                            value={place.transportNotes || ''}
                                                            onChange={(e) => onUpdatePlace(activeDayId, index, { transportNotes: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-300"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Draggable>
                                );
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
             </>
         ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <p>請選擇或新增一天行程</p>
             </div>
         )}
      </div>

    </div>
  );
};