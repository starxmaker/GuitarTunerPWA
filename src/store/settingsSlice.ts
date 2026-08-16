import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type Theme = 'light' | 'dark'
export type SettingsState = { theme: Theme }

function systemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialTheme(): Theme {
  try {
    const value = localStorage.getItem('guitar-tuner-theme')
    if (value === 'light' || value === 'dark') return value
  } catch { /* Storage is optional. */ }
  return systemTheme()
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState: { theme: initialTheme() } as SettingsState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) { state.theme = action.payload },
  },
})

export const { setTheme } = settingsSlice.actions
export default settingsSlice.reducer
