import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NodeSize {
  width: number;
  height?: number; // undefined = auto-sized by content
}

interface NodeSizeState {
  sizes: Record<string, NodeSize>;
  setSize: (id: string, size: NodeSize) => void;
  getSize: (id: string) => NodeSize | undefined;
  removeSize: (id: string) => void;
}

export const useNodeSizeStore = create<NodeSizeState>()(
  persist(
    (set, get) => ({
      sizes: {},

      setSize: (id, size) =>
        set((state) => ({
          sizes: { ...state.sizes, [id]: size },
        })),

      getSize: (id) => get().sizes[id],

      removeSize: (id) =>
        set((state) => {
          const next = { ...state.sizes };
          delete next[id];
          return { sizes: next };
        }),
    }),
    { name: "c4-node-sizes" }
  )
);
