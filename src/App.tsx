import { useEffect, useState } from 'react'
import { FaGear, FaMicrophone, FaStop } from 'react-icons/fa6'
import type { TuningTarget } from './audio/tuning'
import { useTunerAudio } from './audio/useTunerAudio'
import InstallApp from './components/InstallApp'
import Settings from './components/Settings'
import TuningMeter from './components/TuningMeter'
import { useAppSelector } from './store/hooks'
import { useI18n } from './utils/i18n'

export default function App() {
  const { t } = useI18n()
  const theme = useAppSelector((state) => state.settings.theme)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [lockedTarget, setLockedTarget] = useState<TuningTarget | null>(null)
  const { audioState, reading, activeToneId, start, stop, toggleTone } = useTunerAudio(lockedTarget)
  const isListening = audioState === 'listening' || audioState === 'starting'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#17120e' : '#a95f25')
  }, [theme])

  const handleTargetSelect = (target: TuningTarget) => {
    setLockedTarget(target)
  }

  const toggleAutoMode = () => {
    setLockedTarget((current) => current ? null : reading.target)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
        <div className="title-block">
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className={`auto-toggle ${lockedTarget ? '' : 'auto-toggle--active'}`}
            role="switch"
            aria-checked={!lockedTarget}
            aria-label={t('mode.toggleAuto')}
            onClick={toggleAutoMode}
          >
            <span className="auto-toggle__track"><span className="auto-toggle__thumb" /></span>
            <span>{t('mode.auto')}</span>
          </button>
          <button type="button" className="icon-button" aria-label={t('settings.open')} onClick={() => setSettingsOpen(true)}>
            <FaGear />
          </button>
        </div>
      </header>

      <main>
        <TuningMeter
          reading={reading}
          audioState={audioState}
          activeToneId={activeToneId}
          onActivateString={(target) => {
            handleTargetSelect(target)
            void toggleTone(target)
          }}
        />

        <button className={`listen-button ${isListening ? 'listen-button--stop' : ''}`} type="button" disabled={audioState === 'starting'} onClick={audioState === 'listening' ? stop : () => void start()}>
          {isListening ? <FaStop aria-hidden="true" /> : <FaMicrophone aria-hidden="true" />}
          {audioState === 'starting' ? t('tuner.starting') : audioState === 'listening' ? t('tuner.stop') : t('tuner.start')}
        </button>

        <InstallApp />
      </main>

      <footer>
        <span>◉ {t('footer.private')}</span>
        <span>{t('footer.version', { version: __APP_VERSION__ })}</span>
      </footer>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
