import { configureStore, type Middleware } from '@reduxjs/toolkit'
import settingsReducer, { type SettingsState } from './settingsSlice'

export type RootState = { settings: SettingsState }

const persistSettings: Middleware<object, RootState> = (store) => (next) => (action) => {
  const result = next(action)
  if (typeof action === 'object' && action && 'type' in action && action.type === 'settings/setTheme') {
    try { localStorage.setItem('guitar-tuner-theme', store.getState().settings.theme) } catch { /* Storage is optional. */ }
  }
  return result
}

export const store = configureStore({
  reducer: { settings: settingsReducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistSettings),
})

export type AppDispatch = typeof store.dispatch
