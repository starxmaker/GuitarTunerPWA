import { detectPitch } from './pitchDetector'
import { STANDARD_TUNING } from './tuning'

const SAMPLE_RATE = 48_000
const BUFFER_SIZE = 4096

function sine(frequency: number, amplitude = 0.7, harmonicAmplitude = 0) {
  return Float32Array.from({ length: BUFFER_SIZE }, (_, index) => {
    const phase = 2 * Math.PI * frequency * index / SAMPLE_RATE
    return amplitude * Math.sin(phase) + harmonicAmplitude * Math.sin(phase * 2)
  })
}

describe('detectPitch', () => {
  it.each(STANDARD_TUNING.map((target) => [target.id, target.frequencyHz] as const))('detects %s', (_, frequency) => {
    const estimate = detectPitch(sine(frequency), SAMPLE_RATE)
    expect(estimate).not.toBeNull()
    expect(estimate!.frequencyHz).toBeCloseTo(frequency, 0)
    expect(estimate!.confidence).toBeGreaterThan(0.9)
  })

  it('finds the fundamental when harmonics are present', () => {
    expect(detectPitch(sine(110, 0.55, 0.12), SAMPLE_RATE)!.frequencyHz).toBeCloseTo(110, 0)
  })

  it('finds the high E fundamental despite a strong second harmonic', () => {
    const estimate = detectPitch(sine(329.6276, 0.18, 0.9), SAMPLE_RATE)
    expect(estimate).not.toBeNull()
    expect(estimate!.frequencyHz).toBeCloseTo(329.6276, 0)
  })

  it('rejects silence and very weak signals', () => {
    expect(detectPitch(new Float32Array(BUFFER_SIZE), SAMPLE_RATE)).toBeNull()
    expect(detectPitch(sine(110, 0.001), SAMPLE_RATE)).toBeNull()
  })

  it('rejects frequencies outside the guitar range', () => {
    expect(detectPitch(sine(50), SAMPLE_RATE)).toBeNull()
    expect(detectPitch(sine(600), SAMPLE_RATE)).toBeNull()
  })
})
