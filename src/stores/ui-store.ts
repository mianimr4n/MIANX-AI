import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  sidebarOpen: boolean
  commandMenuOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setCommandMenuOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  sidebarOpen: false,
  commandMenuOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCommandMenuOpen: (open) => set({ commandMenuOpen: open }),
}))
