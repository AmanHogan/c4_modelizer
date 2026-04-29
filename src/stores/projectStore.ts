import { FlatC4Model } from "@archivisio/c4-modelizer-sdk";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Group } from "./groupStore";
import type { NodeSize } from "./nodeSizeStore";

export interface ProjectSnapshot {
  id: string;
  name: string;
  lastModified: string; // ISO string
  model: FlatC4Model;
  groups: Group[];
  nodeSizes: Record<string, NodeSize>;
}

interface ProjectState {
  projects: ProjectSnapshot[];
  activeProjectId: string | null;

  createProject: (
    name: string,
    model: FlatC4Model,
    groups: Group[],
    nodeSizes: Record<string, NodeSize>
  ) => string; // returns new id

  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;

  saveProject: (
    id: string,
    model: FlatC4Model,
    groups: Group[],
    nodeSizes: Record<string, NodeSize>
  ) => void;

  setActiveProjectId: (id: string | null) => void;
  getProject: (id: string) => ProjectSnapshot | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      createProject: (name, model, groups, nodeSizes) => {
        const id = `project-${Date.now()}`;
        const snapshot: ProjectSnapshot = {
          id,
          name,
          lastModified: new Date().toISOString(),
          model,
          groups,
          nodeSizes,
        };
        set((state) => ({ projects: [...state.projects, snapshot] }));
        return id;
      },

      deleteProject: (id) =>
        set((state) => {
          const remaining = state.projects.filter((p) => p.id !== id);
          const activeId =
            state.activeProjectId === id
              ? (remaining[0]?.id ?? null)
              : state.activeProjectId;
          return { projects: remaining, activeProjectId: activeId };
        }),

      renameProject: (id, name) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name, lastModified: new Date().toISOString() } : p
          ),
        })),

      saveProject: (id, model, groups, nodeSizes) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, model, groups, nodeSizes, lastModified: new Date().toISOString() }
              : p
          ),
        })),

      setActiveProjectId: (id) => set({ activeProjectId: id }),

      getProject: (id) => get().projects.find((p) => p.id === id),
    }),
    { name: "c4-projects" }
  )
);
