import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Preserves what a visitor typed into the public landing-page booking
// widget across the login/register interruption that booking requires —
// and, more generally, across any refresh/back-navigation while filling out
// the booking wizard. Deliberately holds only trip-planning fields: no
// payment data belongs here (there isn't any at this stage of the flow).
export interface BookingDraft {
  tripType?: string;
  pickupLocation?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropLocation?: string;
  dropLat?: number;
  dropLng?: number;
  pickupDate?: string;
  pickupTime?: string;
  passengerCount?: number;
  luggageCount?: number;
  vehicleTypeId?: string;
  flightNumber?: string;
  flightType?: string;
  specialInstructions?: string;
}

interface BookingDraftState {
  draft: BookingDraft | null;
  setDraft: (draft: BookingDraft) => void;
  updateDraft: (patch: Partial<BookingDraft>) => void;
  clearDraft: () => void;
}

export const useBookingDraftStore = create<BookingDraftState>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => set({ draft }),
      updateDraft: (patch) => set((state) => ({ draft: { ...(state.draft || {}), ...patch } })),
      clearDraft: () => set({ draft: null }),
    }),
    { name: 'mailari-booking-draft' }
  )
);
