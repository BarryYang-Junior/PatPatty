import { AppState, Classroom, Pet } from '../types';
import { DEGRADATION_RATE, PET_TEMPLATES } from '../constants';

const STORAGE_KEY = 'pixel_pet_academy_data';

export const loadState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      // Remove classroom '周六' if it exists
      if (state.classrooms) {
        state.classrooms = state.classrooms.filter((c: Classroom) => c.name !== '周六');
      }
      return updatePetStats(state);
    } catch (e) {
      console.error('Failed to parse state', e);
    }
  }
  return {
    isLoggedIn: false,
    classrooms: [],
  };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// Logic to update pet stats based on time passed
const updatePetStats = (state: AppState): AppState => {
  const now = Date.now();
  
  const updatedClassrooms = state.classrooms.map(classroom => ({
    ...classroom,
    students: classroom.students.map(student => {
      // Migration: convert old 'pet' field to 'pets' array
      let pets = student.pets || [];
      // @ts-ignore - handling legacy data
      if (student.pet && pets.length === 0) {
        // @ts-ignore
        pets = [student.pet];
      }
      
      if (pets.length === 0) return { ...student, pets: [] };
      
      const updatedPets = pets.map(pet => {
        const elapsedMinutes = Math.floor((now - pet.lastUpdate) / (1000 * 60));
        if (elapsedMinutes <= 0) return pet;

        let { hunger, cleanliness, exp, level, evolutionStage } = pet;

        // Apply degradation
        hunger = Math.max(0, hunger - elapsedMinutes * DEGRADATION_RATE);
        cleanliness = Math.max(0, cleanliness - elapsedMinutes * DEGRADATION_RATE);

        // Level up logic
        while (exp >= level * 100) {
          exp -= level * 100;
          level++;
        }

        // Evolution logic based on level (5 stages)
        if (level >= 40) evolutionStage = 5;
        else if (level >= 30) evolutionStage = 4;
        else if (level >= 20) evolutionStage = 3;
        else if (level >= 10) evolutionStage = 2;
        else evolutionStage = 1;

        const name = PET_TEMPLATES[pet.type].stages[evolutionStage - 1];

        return {
          ...pet,
          name,
          hunger,
          cleanliness,
          exp,
          level,
          evolutionStage,
          lastUpdate: now
        };
      });

      const activePetId = student.activePetId || (updatedPets.length > 0 ? updatedPets[0].id : undefined);

      return {
        ...student,
        pets: updatedPets,
        activePetId,
        // Remove legacy field
        pet: undefined
      };
    })
  }));

  return { ...state, classrooms: updatedClassrooms };
};
