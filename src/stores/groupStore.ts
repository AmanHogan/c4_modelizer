import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Group {
  id: string;
  label: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color: string;
  viewKey: string;
}

export const GROUP_COLORS = [
  "#51a2ff", // blue
  "#4caf50", // green
  "#ff9800", // orange
  "#e91e63", // pink
  "#9c27b0", // purple
  "#00bcd4", // cyan
];

interface GroupState {
  groups: Group[];
  addGroup: (group: Group) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  removeGroup: (id: string) => void;
  getGroupsForView: (viewKey: string) => Group[];
  getNextColor: (viewKey: string) => string;
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],

      addGroup: (group) =>
        set((state) => ({ groups: [...state.groups, group] })),

      updateGroup: (id, updates) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        })),

      removeGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
        })),

      getGroupsForView: (viewKey) =>
        get().groups.filter((g) => g.viewKey === viewKey),

      getNextColor: (viewKey) => {
        const viewGroups = get().groups.filter((g) => g.viewKey === viewKey);
        return GROUP_COLORS[viewGroups.length % GROUP_COLORS.length];
      },
    }),
    { name: "c4-groups" }
  )
);
