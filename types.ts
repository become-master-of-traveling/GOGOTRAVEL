export interface Coordinates {
  lat: number;
  lng: number;
}

export type TransportMode = 'CAR' | 'WALK' | 'TRANSIT';

export interface Place {
  id: string;
  name: string;
  description: string;
  coordinates: Coordinates;
  estimatedTime?: string; // AI provided text suggestion
  
  // User planning data
  stayMinutes?: number; // How long to stay
  transportToNext?: TransportMode;
  travelMinutesToNext?: number; // Time to get to the NEXT place
  transportNotes?: string; // User notes for transport (e.g., bus number)
}

export interface DayPlan {
  id: string;
  title: string;
  startTime: string; // "09:00"
  places: Place[];
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  payer: string;
  involved: string[];
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export enum AppTab {
  PLANNING = 'PLANNING',
  EXPENSES = 'EXPENSES',
}