import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import en from '../locales/en.json'
import es from '../locales/es.json'
import { LocalizationProvider, useI18n } from './i18n'

function Fixture() {
  const { t, language, setLanguageSetting } = useI18n()
  return <><span>{language}</span><h1>{t('app.title')}</h1><button onClick={() => setLanguageSetting('es')}>es</button></>
}

describe('localization', () => {
  beforeEach(() => localStorage.clear())

  it('keeps English and Spanish translation keys in parity', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort())
  })

  it('changes language and persists the selection', async () => {
    render(<LocalizationProvider><Fixture /></LocalizationProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'es' }))
    expect(screen.getByRole('heading')).toHaveTextContent('Afinador de guitarra')
    expect(localStorage.getItem('guitar-tuner-language')).toBe('es')
    expect(document.documentElement.lang).toBe('es')
  })
})
