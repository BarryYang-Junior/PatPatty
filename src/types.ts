export type PetType = 
  | 'fire' | 'water' | 'grass' | 'electric' | 'earth' | 'wind' 
  | 'ice' | 'metal' | 'light' | 'dark' | 'dragon' | 'psychic';

export interface Pet {
  id: string;
  name: string;
  type: PetType;
  level: number;
  exp: number;
  hunger: number;
  cleanliness: number;
  mood: number;
  evolutionStage: number;
  lastUpdate: number;
  adoptedAt: number;
  customImage?: string;
  lastBattleDate?: string;
}

export interface Student {
  id: string;
  name: string;
  pets: Pet[];
  activePetId?: string;
  inventory?: Record<string, number>;
}

export interface Classroom {
  id: string;
  name: string;
  students: Student[];
  createdAt: number;
  adminId: string;
}

export interface AppState {
  isLoggedIn: boolean;
  currentAdminId?: string;
  classrooms: Classroom[];
}
