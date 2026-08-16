export type GuitarStringId = 'lowE' | 'A' | 'D' | 'G' | 'B' | 'highE'

export type TuningTarget = {
  id: GuitarStringId
  stringNumber: number
  note: 'E' | 'A' | 'D' | 'G' | 'B'
  octave: number
  frequencyHz: number
}

export type PitchEstimate = {
  frequencyHz: number
  confidence: number
}

export type TuningStatus = 'silent' | 'far' | 'near' | 'tuned'

export type TuningReading = {
  frequencyHz: number | null
  target: TuningTarget
  cents: number | null
  confidence: number
  status: TuningStatus
}

export const STANDARD_TUNING: readonly TuningTarget[] = [
  { id: 'lowE', stringNumber: 6, note: 'E', octave: 2, frequencyHz: 82.4069 },
  { id: 'A', stringNumber: 5, note: 'A', octave: 2, frequencyHz: 110 },
  { id: 'D', stringNumber: 4, note: 'D', octave: 3, frequencyHz: 146.8324 },
  { id: 'G', stringNumber: 3, note: 'G', octave: 3, frequencyHz: 195.9977 },
  { id: 'B', stringNumber: 2, note: 'B', octave: 3, frequencyHz: 246.9417 },
  { id: 'highE', stringNumber: 1, note: 'E', octave: 4, frequencyHz: 329.6276 },
] as const

export const DEFAULT_TARGET = STANDARD_TUNING[0]

export function centsBetween(frequencyHz: number, targetHz: number): number {
  return 1200 * Math.log2(frequencyHz / targetHz)
}

export function closestTarget(frequencyHz: number): TuningTarget {
  return STANDARD_TUNING.reduce((closest, target) =>
    Math.abs(centsBetween(frequencyHz, target.frequencyHz)) <
    Math.abs(centsBetween(frequencyHz, closest.frequencyHz))
      ? target
      : closest,
  )
}

export function statusForCents(cents: number): Exclude<TuningStatus, 'silent'> {
  const distance = Math.abs(cents)
  if (distance <= 5) return 'tuned'
  if (distance <= 15) return 'near'
  return 'far'
}

export function makeSilentReading(target: TuningTarget): TuningReading {
  return { frequencyHz: null, target, cents: null, confidence: 0, status: 'silent' }
}

export class ReadingStabilizer {
  private frequencies: number[] = []
  private activeTarget: TuningTarget
  private candidateId: GuitarStringId | null = null
  private candidateFrames = 0

  constructor(initialTarget: TuningTarget = DEFAULT_TARGET) {
    this.activeTarget = initialTarget
  }

  reset(target: TuningTarget = DEFAULT_TARGET) {
    this.frequencies = []
    this.activeTarget = target
    this.candidateId = null
    this.candidateFrames = 0
  }

  update(estimate: PitchEstimate, lockedTarget: TuningTarget | null): TuningReading {
    this.frequencies.push(estimate.frequencyHz)
    if (this.frequencies.length > 5) this.frequencies.shift()
    const sorted = [...this.frequencies].sort((a, b) => a - b)
    const smoothedFrequency = sorted[Math.floor(sorted.length / 2)]

    if (lockedTarget) {
      this.activeTarget = lockedTarget
      this.candidateId = null
      this.candidateFrames = 0
    } else {
      const nearest = closestTarget(smoothedFrequency)
      if (nearest.id === this.activeTarget.id) {
        this.candidateId = null
        this.candidateFrames = 0
      } else if (nearest.id === this.candidateId) {
        this.candidateFrames += 1
        if (this.candidateFrames >= 3) {
          this.activeTarget = nearest
          this.candidateId = null
          this.candidateFrames = 0
        }
      } else {
        this.candidateId = nearest.id
        this.candidateFrames = 1
      }
    }

    const cents = centsBetween(smoothedFrequency, this.activeTarget.frequencyHz)
    return {
      frequencyHz: smoothedFrequency,
      target: this.activeTarget,
      cents,
      confidence: estimate.confidence,
      status: statusForCents(cents),
    }
  }
}
