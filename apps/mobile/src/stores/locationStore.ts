import { create } from 'zustand';
import { api } from '../services/api';

interface LocationState {
  locations: any[];
  selectedLocation: any | null;
  isLoading: boolean;
  error: string | null;
  fetchLocations: () => Promise<void>;
  selectLocation: (location: any) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  locations: [],
  selectedLocation: null,
  isLoading: false,
  error: null,

  fetchLocations: async () => {
    set({ isLoading: true, error: null });
    try {
      const locations = await api.getLocations();
      set({ locations, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  selectLocation: (location) => {
    set({ selectedLocation: location });
  },
}));
