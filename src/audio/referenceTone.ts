import type { GuitarStringId, TuningTarget } from './tuning'

const SAMPLE_FILES: Record<GuitarStringId, string> = {
  lowE: 'E2.flac',
  A: 'A2.flac',
  D: 'D3.flac',
  G: 'G3.flac',
  B: 'B3.flac',
  highE: 'E4.flac',
}

export function getReferenceSampleUrl(target: TuningTarget) {
  return `${import.meta.env.BASE_URL}audio/guitar/${SAMPLE_FILES[target.id]}`
}

export class ReferenceTonePlayer {
  private context: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private oscillator: OscillatorNode | null = null
  private gain: GainNode | null = null
  private activeId: TuningTarget['id'] | null = null
  private generation = 0
  private onEnded: () => void = () => undefined

  setOnEnded(onEnded: () => void) {
    this.onEnded = onEnded
  }

  get activeTargetId() {
    return this.activeId
  }

  async toggle(target: TuningTarget): Promise<TuningTarget['id'] | null> {
    if (this.activeId === target.id) {
      this.stop()
      return null
    }
    this.stop()
    const token = this.generation
    const context = new AudioContext()
    this.context = context
    await context.resume()
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.5, context.currentTime + 0.025)
    this.gain = gain

    try {
      const response = await fetch(getReferenceSampleUrl(target))
      if (!response.ok) throw new Error(`Reference sample returned HTTP ${response.status}`)
      const buffer = await context.decodeAudioData(await response.arrayBuffer())
      if (token !== this.generation) {
        await context.close()
        return null
      }
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(gain).connect(context.destination)
      source.onended = () => this.finishNaturally(token)
      this.source = source
      this.activeId = target.id
      source.start()
      return target.id
    } catch (error) {
      if (token !== this.generation) return null
      console.warn('Acoustic guitar sample unavailable; using synthesized fallback.', error)
      const oscillator = context.createOscillator()
      oscillator.type = 'triangle'
      oscillator.frequency.value = target.frequencyHz
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      this.oscillator = oscillator
      this.activeId = target.id
      return target.id
    }
  }

  stop() {
    this.generation += 1
    const context = this.context
    const gain = this.gain
    const source = this.source
    const oscillator = this.oscillator
    if (context && gain) {
      const now = context.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)
      if (source) {
        source.onended = null
        source.stop(now + 0.04)
      }
      if (oscillator) oscillator.stop(now + 0.04)
      window.setTimeout(() => void context.close(), 60)
    }
    this.context = null
    this.source = null
    this.oscillator = null
    this.gain = null
    this.activeId = null
  }

  private finishNaturally(token: number) {
    if (token !== this.generation) return
    const context = this.context
    this.generation += 1
    this.context = null
    this.source = null
    this.gain = null
    this.activeId = null
    if (context) void context.close()
    this.onEnded()
  }
}
