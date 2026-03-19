export interface WorkforceEntry {
  id: string;
  trade: string;
  company: string;
  count: number;
  hours: number;
}

export interface WorkItem {
  id: string;
  location: string;
  description: string;
  status?: 'completed' | 'in_progress' | 'delayed';
}

export interface DeliveryEntry {
  id: string;
  time: string;
  supplier: string;
  materials: string;
  deliveryNote?: string;
  accepted: boolean;
  issues?: string;
}

export interface VisitorEntry {
  id: string;
  name: string;
  company: string;
  purpose: string;
  timeIn: string;
  timeOut?: string;
}

export interface PlantEquipmentEntry {
  id: string;
  item: string;
  supplier?: string;
  status: 'on_site' | 'arrived' | 'departed' | 'breakdown';
  hours?: number;
  notes?: string;
}

export interface SafetyIncident {
  id: string;
  type: 'near_miss' | 'first_aid' | 'accident' | 'unsafe_act' | 'unsafe_condition';
  description: string;
  actionTaken: string;
  reportedTo?: string;
}

export interface InstructionEntry {
  id: string;
  from: string;
  instruction: string;
  reference?: string;
  actionRequired: string;
}

export interface DelayEntry {
  id: string;
  cause: string;
  duration: string;
  impact: string;
  mitigation?: string;
}

export interface DiaryPhoto {
  id: string;
  url: string;
  caption?: string;
  location?: string;
  takenAt: string;
}

export interface SiteDiaryEntry {
  id: string;
  organisation_id: string;
  project_id: string;
  entry_date: string;
  status: 'draft' | 'complete';
  
  // Weather
  weather_morning?: string;
  weather_afternoon?: string;
  temperature_high?: number;
  temperature_low?: number;
  weather_conditions?: string[];
  weather_impact?: string;
  
  // Workforce
  workforce_entries: WorkforceEntry[];
  workforce_total: number;
  
  // Work
  work_completed: WorkItem[];
  work_planned_tomorrow: WorkItem[];
  
  // Deliveries
  deliveries: DeliveryEntry[];
  
  // Visitors
  visitors: VisitorEntry[];
  
  // Plant
  plant_equipment: PlantEquipmentEntry[];
  
  // Safety
  safety_incidents: SafetyIncident[];
  safety_observations?: string;
  toolbox_talk_delivered: boolean;
  toolbox_talk_topic?: string;
  
  // Instructions
  instructions: InstructionEntry[];
  
  // Delays
  delays: DelayEntry[];
  
  // Photos
  photos: DiaryPhoto[];
  
  // Notes
  notes?: string;
  
  // Metadata
  created_by?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
}

export const WEATHER_CONDITIONS = [
  'Clear',
  'Sunny',
  'Partly Cloudy',
  'Cloudy',
  'Overcast',
  'Light Rain',
  'Heavy Rain',
  'Showers',
  'Thunderstorms',
  'Snow',
  'Sleet',
  'Fog',
  'Frost',
  'Windy',
  'Hot',
  'Cold',
] as const;

export const WEATHER_ICONS: Record<string, string> = {
  'Clear': '☀️',
  'Sunny': '☀️',
  'Partly Cloudy': '⛅',
  'Cloudy': '☁️',
  'Overcast': '☁️',
  'Light Rain': '🌧️',
  'Heavy Rain': '🌧️',
  'Showers': '🌦️',
  'Thunderstorms': '⛈️',
  'Snow': '❄️',
  'Sleet': '🌨️',
  'Fog': '🌫️',
  'Frost': '🥶',
  'Windy': '💨',
  'Hot': '🌡️',
  'Cold': '🥶',
};
