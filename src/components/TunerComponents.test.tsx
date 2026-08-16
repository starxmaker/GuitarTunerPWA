import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_TARGET, makeSilentReading, STANDARD_TUNING } from '../audio/tuning'
import { LocalizationProvider } from '../utils/i18n'
import TuningMeter from './TuningMeter'

function localized(ui: React.ReactNode) {
  return render(<LocalizationProvider>{ui}</LocalizationProvider>)
}

describe('tuner components', () => {
  beforeEach(() => localStorage.setItem('guitar-tuner-language', 'en'))

  it('renders measurements without status text while tuning', () => {
    localized(<TuningMeter audioState="listening" activeToneId={null} onActivateString={vi.fn()} reading={{ frequencyHz: 109.7, target: STANDARD_TUNING[1], cents: -4.7, confidence: 0.9, status: 'tuned' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('')
    expect(screen.getByTestId('pitch-axis-marker')).toHaveTextContent('-5')
    expect(screen.getByTestId('pitch-axis-marker')).toHaveStyle({ left: '45.77%' })
  })

  it('keeps the status message empty while idle', () => {
    localized(<TuningMeter audioState="idle" activeToneId={null} onActivateString={vi.fn()} reading={makeSilentReading(DEFAULT_TARGET)} />)
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('shows microphone error guidance', () => {
    localized(<TuningMeter audioState="permissionDenied" activeToneId={null} onActivateString={vi.fn()} reading={makeSilentReading(DEFAULT_TARGET)} />)
    expect(screen.getByRole('status')).toHaveTextContent('Microphone access was denied')
  })

  it('activates a string and its tone from the headstock note', async () => {
    const user = userEvent.setup()
    const activate = vi.fn()
    localized(<TuningMeter audioState="idle" activeToneId={null} onActivateString={activate} reading={makeSilentReading(DEFAULT_TARGET)} />)
    await user.click(screen.getByRole('button', { name: 'Play reference tone for A2' }))
    expect(activate).toHaveBeenCalledWith(STANDARD_TUNING[1])
  })
})
