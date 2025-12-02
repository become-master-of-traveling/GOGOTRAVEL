import React, { useState } from 'react';
import { PlaceSearch } from './components/PlaceSearch';
import { Itinerary } from './components/Itinerary';
import { MapBoard } from './components/MapBoard';
import { ExpenseSplitter } from './components/ExpenseSplitter';
import { Place, DayPlan, AppTab, Expense } from './types';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Map, DollarSign, Layers } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.PLANNING);
  
  // Search State (Lifted from PlaceSearch)
  const [searchResults, setSearchResults] = useState<Place[]>([]);

  // Itinerary State
  const [activeDayId, setActiveDayId] = useState<string>('day-1');
  const [unscheduledPlaces, setUnscheduledPlaces] = useState<Place[]>([]);
  const [days, setDays] = useState<DayPlan[]>([
    { id: 'day-1', title: '第 1 天', startTime: '09:00', places: [] },
  ]);
  
  // Expense State
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Get the last added place for Context Search
  const lastAddedPlace = unscheduledPlaces.length > 0 
      ? unscheduledPlaces[unscheduledPlaces.length - 1] 
      : (days.find(d => d.id === activeDayId)?.places.slice(-1)[0] || null);

  const handleAddPlace = (place: Place) => {
    // Check duplicates globally
    const exists = unscheduledPlaces.find(p => p.id === place.id) || 
                   days.some(d => d.places.some(p => p.id === place.id));
    
    // Check duplicates in current search results to avoid ID collision if dragging same item twice
    // (Though usually we want to allow re-adding if it's a different instance, but let's keep it simple)
    
    if (!exists) {
        // Create a deep copy with a new unique ID to ensure React keys are unique if added multiple times conceptually
        const newPlace = { ...place, id: `place-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
        setUnscheduledPlaces(prev => [...prev, newPlace]);
    }
  };

  const handleUpdatePlace = (dayId: string, index: number, updates: Partial<Place>) => {
      setDays(prev => prev.map(d => {
          if (d.id === dayId) {
              const newPlaces = [...d.places];
              newPlaces[index] = { ...newPlaces[index], ...updates };
              return { ...d, places: newPlaces };
          }
          return d;
      }));
  };

  const handleUpdateDay = (dayId: string, updates: Partial<DayPlan>) => {
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, ...updates } : d));
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // --- Logic for Dragging FROM Search Results ---
    if (source.droppableId === 'search-results') {
        const itemToMove = searchResults[source.index];
        
        // Create a new instance of the place for the itinerary
        const newPlace: Place = {
            ...itemToMove,
            id: `place-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate new ID
            stayMinutes: 60,
            travelMinutesToNext: 15,
            transportToNext: 'CAR'
        };

        if (destination.droppableId === 'unscheduled') {
            const newUnscheduled = [...unscheduledPlaces];
            newUnscheduled.splice(destination.index, 0, newPlace);
            setUnscheduledPlaces(newUnscheduled);
        } else {
            // Added to a Day
            setDays(prev => prev.map(d => {
                if (d.id === destination.droppableId) {
                    const newPlaces = [...d.places];
                    newPlaces.splice(destination.index, 0, newPlace);
                    return { ...d, places: newPlaces };
                }
                return d;
            }));
        }
        return;
    }

    // --- Logic for Reordering / Moving within Itinerary ---

    // Helper to get list by ID
    const getList = (id: string): Place[] => {
      if (id === 'unscheduled') return unscheduledPlaces;
      return days.find(d => d.id === id)?.places || [];
    };

    // Helper to set list by ID
    const setList = (id: string, newPlaces: Place[]) => {
      if (id === 'unscheduled') {
        setUnscheduledPlaces(newPlaces);
      } else {
        setDays(prev => prev.map(d => d.id === id ? { ...d, places: newPlaces } : d));
      }
    };

    const sourceList = [...getList(source.droppableId)];
    const destList = source.droppableId === destination.droppableId 
      ? sourceList 
      : [...getList(destination.droppableId)];

    const [movedItem] = sourceList.splice(source.index, 1);
    
    // Ensure defaults exist when moving to timeline
    if (destination.droppableId !== 'unscheduled') {
        if (!movedItem.stayMinutes) movedItem.stayMinutes = 60;
        if (!movedItem.travelMinutesToNext) movedItem.travelMinutesToNext = 15;
        if (!movedItem.transportToNext) movedItem.transportToNext = 'CAR';
    }

    destList.splice(destination.index, 0, movedItem);

    if (source.droppableId === destination.droppableId) {
      setList(source.droppableId, sourceList);
    } else {
      setList(source.droppableId, sourceList);
      setList(destination.droppableId, destList);
    }
  };

  const handleRemovePlace = (dayId: string | 'unscheduled', index: number) => {
    if (dayId === 'unscheduled') {
      const newPlaces = [...unscheduledPlaces];
      newPlaces.splice(index, 1);
      setUnscheduledPlaces(newPlaces);
    } else {
      setDays(prev => prev.map(d => {
        if (d.id === dayId) {
          const newPlaces = [...d.places];
          newPlaces.splice(index, 1);
          return { ...d, places: newPlaces };
        }
        return d;
      }));
    }
  };

  const handleAddDay = () => {
    const newId = `day-${Date.now()}`;
    setDays(prev => [...prev, { id: newId, title: `第 ${prev.length + 1} 天`, startTime: '09:00', places: [] }]);
    setActiveDayId(newId);
  };

  const handleRemoveDay = (id: string) => {
     const newDays = days.filter(d => d.id !== id);
     // Re-label days
     const relabeled = newDays.map((d, idx) => ({ ...d, title: `第 ${idx + 1} 天` }));
     setDays(relabeled);
     if (activeDayId === id && relabeled.length > 0) {
         setActiveDayId(relabeled[0].id);
     }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-indigo-200 shadow-lg">
                <Map size={20} />
            </div>
            <div>
                <h1 className="text-lg font-bold text-slate-800 leading-none tracking-tight">TravelGenie</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">AI 旅遊規劃助手</p>
            </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab(AppTab.PLANNING)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
              activeTab === AppTab.PLANNING 
              ? 'bg-white text-indigo-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers size={16} /> 行程規劃
          </button>
          <button
            onClick={() => setActiveTab(AppTab.EXPENSES)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
              activeTab === AppTab.EXPENSES 
              ? 'bg-white text-indigo-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign size={16} /> 費用分攤
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        {activeTab === AppTab.PLANNING && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Col: Search (Sticky on Desktop) */}
                <div className="lg:col-span-3 lg:sticky lg:top-24 h-[500px] lg:h-[calc(100vh-8rem)]">
                <PlaceSearch 
                    results={searchResults} 
                    setResults={setSearchResults}
                    onAddPlace={handleAddPlace} 
                    lastAddedPlace={lastAddedPlace} 
                />
                </div>

                {/* Middle Col: Itinerary Editor */}
                <div className="lg:col-span-6 min-h-[500px]">
                <Itinerary 
                    unscheduledPlaces={unscheduledPlaces}
                    days={days}
                    activeDayId={activeDayId}
                    setActiveDayId={setActiveDayId}
                    onRemovePlace={handleRemovePlace}
                    onAddDay={handleAddDay}
                    onRemoveDay={handleRemoveDay}
                    onUpdatePlace={handleUpdatePlace}
                    onUpdateDay={handleUpdateDay}
                />
                </div>

                {/* Right Col: Map (Sticky on Desktop) */}
                <div className="lg:col-span-3 lg:sticky lg:top-24 h-[400px] lg:h-[500px]">
                    <MapBoard days={days} activeDayId={activeDayId} />
                    <div className="mt-4 bg-indigo-50 p-4 rounded-xl text-xs text-indigo-800 border border-indigo-100">
                        <p className="font-bold mb-1">💡 小提示</p>
                        <p>您可以直接將搜尋結果拖曳至中間的行程表或待排區！</p>
                    </div>
                </div>

            </div>
          </DragDropContext>
        )}

        {activeTab === AppTab.EXPENSES && (
          <div className="max-w-5xl mx-auto">
             <ExpenseSplitter expenses={expenses} setExpenses={setExpenses} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;