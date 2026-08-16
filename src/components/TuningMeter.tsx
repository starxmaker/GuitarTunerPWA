import type { AudioState } from '../audio/useTunerAudio'
import { STANDARD_TUNING, type GuitarStringId, type TuningReading, type TuningTarget } from '../audio/tuning'
import { useI18n } from '../utils/i18n'

type Props = {
  reading: TuningReading
  audioState: AudioState
  activeToneId: GuitarStringId | null
  onActivateString: (target: TuningTarget) => void
}

export default function TuningMeter({ reading, audioState, activeToneId, onActivateString }: Props) {
  const { t } = useI18n()
  const cents = reading.cents
  const boundedCents = Math.max(-50, Math.min(50, cents ?? 0))
  const markerPosition = Number((5 + ((boundedCents + 50) / 100) * 90).toFixed(2))
  const noteLabel = `${reading.target.note}${reading.target.octave}`
  const headstockStrings = [
    { id: 'lowE', note: 'E2', pegX: 151, pegY: 198, labelX: 100, labelY: 198, nutX: 162 },
    { id: 'A', note: 'A2', pegX: 153, pegY: 142, labelX: 103, labelY: 142, nutX: 169 },
    { id: 'D', note: 'D3', pegX: 155, pegY: 86, labelX: 105, labelY: 86, nutX: 176 },
    { id: 'G', note: 'G3', pegX: 205, pegY: 86, labelX: 255, labelY: 86, nutX: 184 },
    { id: 'B', note: 'B3', pegX: 207, pegY: 142, labelX: 257, labelY: 142, nutX: 191 },
    { id: 'highE', note: 'E4', pegX: 209, pegY: 198, labelX: 260, labelY: 198, nutX: 198 },
  ] as const

  const errors: Partial<Record<AudioState, string>> = {
    permissionDenied: t('status.permissionDenied'),
    unsupported: t('status.unsupported'),
    insecure: t('status.insecure'),
    error: t('status.error'),
  }
  const message = errors[audioState] ?? ''

  return (
    <section className={`meter-card meter-card--${reading.status}`} aria-label={t('tuner.meterLabel')}>
      <div className="headstock-stage">
        <div className="pitch-axis" aria-hidden="true">
          <span className="pitch-axis__flat">−50</span>
          <span className="pitch-axis__center">0</span>
          <span className="pitch-axis__sharp">+50</span>
          <div className="pitch-axis__rail" />
          <span className="pitch-axis__marker" data-testid="pitch-axis-marker" style={{ left: `${markerPosition}%` }}>
            {cents === null ? '—' : `${cents >= 0 ? '+' : ''}${cents.toFixed(0)}`}
          </span>
        </div>
        <div className="target-note">{noteLabel}</div>
        <div className="headstock-wrap">
          <svg className="headstock" viewBox="0 0 360 350" aria-hidden="true">
            <path className="headstock__neck" d="M154 222 H206 V350 H154 Z" />
            <path className="headstock__body" d="M146 55 Q180 25 214 55 L220 211 Q218 229 205 239 H155 Q142 229 140 211 Z" />
            <path className="headstock__inlay" d="M180 63 L190 80 L180 97 L170 80 Z" />
            <path className="headstock__nut" d="M153 238 H207" />
            {Array.from({ length: 2 }, (_, index) => index + 1).map((fret) => (
              <line
                key={fret}
                className="headstock__fret"
                x1="154"
                x2="206"
                y1={(238 + 850 * (1 - Math.pow(2, -fret / 12))).toFixed(1)}
                y2={(238 + 850 * (1 - Math.pow(2, -fret / 12))).toFixed(1)}
              />
            ))}
            {headstockStrings.map((string) => {
              const active = reading.target.id === string.id
              return (
                <g key={string.id} className={active ? 'headstock-string headstock-string--active' : 'headstock-string'}>
                  <polyline className="headstock-string__wire" points={`${string.pegX},${string.pegY} ${string.nutX},238 ${string.nutX},350`} />
                  <line className="headstock-string__post" x1={string.pegX} y1={string.pegY} x2={string.labelX < 180 ? string.labelX + 18 : string.labelX - 18} y2={string.pegY} />
                  <circle className="headstock-string__peg" cx={string.pegX} cy={string.pegY} r="9" />
                </g>
              )
            })}
          </svg>
          {headstockStrings.map((string) => {
            const active = reading.target.id === string.id
            const playing = activeToneId === string.id
            const target = STANDARD_TUNING.find((candidate) => candidate.id === string.id)!
            return (
              <button
                key={string.id}
                type="button"
                className={`headstock-note-button ${active ? 'headstock-note-button--active' : ''} ${playing ? 'headstock-note-button--playing' : ''}`}
                style={{ left: `${(string.labelX / 360) * 100}%`, top: `${(string.labelY / 350) * 100}%` }}
                aria-label={t(playing ? 'strings.stopTone' : 'strings.playTone', { note: string.note })}
                aria-pressed={playing}
                onClick={() => onActivateString(target)}
              >
                {string.note[0]}
              </button>
            )
          })}
        </div>
        <p className={`status-message ${errors[audioState] ? 'status-message--error' : ''}`} role="status" aria-live="polite">
          {message}
        </p>
      </div>
    </section>
  )
}
