import React, { useState } from 'react';
import { Search, Loader2, Plus, MapPin, GripVertical } from 'lucide-react';
import { searchPlacesWithAI } from '../services/geminiService';
import { Place } from '../types';
import { Droppable, Draggable } from '@hello-pangea/dnd';

interface PlaceSearchProps {
  onAddPlace: (place: Place) => void;
  lastAddedPlace?: Place | null;
  results: Place[];
  setResults: React.Dispatch<React.SetStateAction<Place[]>>;
}

export const PlaceSearch: React.FC<PlaceSearchProps> = ({ onAddPlace, lastAddedPlace, results, setResults }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent, useNearby: boolean = false) => {
    e.preventDefault();
    if (!useNearby && !query.trim()) return;

    setLoading(true);
    const context = useNearby && lastAddedPlace ? lastAddedPlace.name : undefined;
    const searchTerm = useNearby ? "附近景點" : query;
    
    const places = await searchPlacesWithAI(searchTerm, context);
    setResults(places);
    setLoading(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-700">
        <Search size={20} />
        搜尋景點
      </h2>
      
      <form onSubmit={(e) => handleSearch(e, false)} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：京都、台北美食..."
            className="flex-1 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : '搜尋'}
          </button>
        </div>

        {lastAddedPlace && (
          <button
            type="button"
            onClick={(e) => handleSearch(e, true)}
            disabled={loading}
            className="w-full text-xs flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 py-2 rounded-md hover:bg-emerald-100 transition-colors"
          >
            <MapPin size={14} />
            搜尋「{lastAddedPlace.name}」附近
          </button>
        )}
      </form>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {results.length === 0 && !loading && (
          <div className="text-center mt-10 p-4">
             <p className="text-slate-400 text-sm italic">
                輸入城市或景點名稱，讓 AI 為您推薦。
             </p>
          </div>
        )}
        
        {/* Make Search Results Droppable (but disabled dropping) so we can drag FROM it */}
        <Droppable droppableId="search-results" isDropDisabled={true}>
            {(provided, snapshot) => (
                <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3 min-h-[50px]"
                >
                    {results.map((place, index) => (
                        <Draggable key={place.id} draggableId={place.id} index={index}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    // Clone styling for search result card
                                    className={`p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group relative bg-white shadow-sm flex flex-col ${snapshot.isDragging ? 'shadow-2xl rotate-2 z-50 ring-2 ring-indigo-500' : ''}`}
                                    style={{ ...provided.draggableProps.style }}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-800 text-sm">{place.name}</h3>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{place.description}</p>
                                        </div>
                                        <div className="text-slate-300">
                                            <GripVertical size={16} />
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mt-2">
                                        {place.estimatedTime ? (
                                            <span className="inline-block text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                建議：{place.estimatedTime}
                                            </span>
                                        ) : <span></span>}
                                        
                                        <button
                                            type="button" // Important to prevent form submission
                                            onClick={(e) => {
                                                e.preventDefault(); // Stop drag if clicking button
                                                onAddPlace(place);
                                            }}
                                            className="text-indigo-600 hover:bg-indigo-100 p-1 rounded transition-colors text-xs font-bold px-2 py-0.5"
                                            title="加入待排行程"
                                            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on button click
                                        >
                                            + 加入
                                        </button>
                                    </div>
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
  );
};