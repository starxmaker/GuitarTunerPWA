import { centsBetween, STANDARD_TUNING, type PitchEstimate } from './tuning'

const MIN_FREQUENCY = 70
// Give E4 enough room for small phone-microphone estimation errors and vibrato.
const MAX_FREQUENCY = 420
const SILENCE_RMS = 0.008
const YIN_THRESHOLD = 0.15
const SUBHARMONIC_CANDIDATE_THRESHOLD = 0.42
const TARGET_MATCH_CENTS = 150

function closestTargetDistance(frequencyHz: number) {
  return Math.min(...STANDARD_TUNING.map((target) => Math.abs(centsBetween(frequencyHz, target.frequencyHz))))
}

function localMinimum(cmnd: Float64Array, center: number, minTau: number, maxTau: number) {
  let bestTau = Math.max(minTau, Math.min(maxTau, Math.round(center)))
  for (let tau = Math.max(minTau, bestTau - 2); tau <= Math.min(maxTau, bestTau + 2); tau += 1) {
    if (cmnd[tau] < cmnd[bestTau]) bestTau = tau
  }
  return bestTau
}

function correctSubharmonicTau(
  cmnd: Float64Array,
  tauEstimate: number,
  sampleRate: number,
  minTau: number,
  maxTau: number,
) {
  let correctedTau = tauEstimate
  let bestScore = SUBHARMONIC_CANDIDATE_THRESHOLD

  for (const multiplier of [2, 3, 4]) {
    const candidateTau = tauEstimate / multiplier
    if (candidateTau < minTau) continue
    const refinedCandidateTau = localMinimum(cmnd, candidateTau, minTau, maxTau)
    const candidateFrequency = sampleRate / refinedCandidateTau
    if (closestTargetDistance(candidateFrequency) > TARGET_MATCH_CENTS) continue
    if (cmnd[refinedCandidateTau] < bestScore) {
      correctedTau = refinedCandidateTau
      bestScore = cmnd[refinedCandidateTau]
    }
  }

  return correctedTau
}

export function detectPitch(samples: Float32Array, sampleRate: number): PitchEstimate | null {
  if (samples.length < 2 || sampleRate <= 0) return null

  let squareSum = 0
  let mean = 0
  for (const sample of samples) mean += sample
  mean /= samples.length
  for (const sample of samples) {
    const centered = sample - mean
    squareSum += centered * centered
  }
  if (Math.sqrt(squareSum / samples.length) < SILENCE_RMS) return null

  const minTau = Math.max(2, Math.floor(sampleRate / MAX_FREQUENCY))
  const maxTau = Math.min(Math.floor(sampleRate / MIN_FREQUENCY), Math.floor(samples.length / 2))
  if (maxTau <= minTau) return null

  const difference = new Float64Array(maxTau + 1)
  for (let tau = 1; tau <= maxTau; tau += 1) {
    let sum = 0
    const limit = samples.length - tau
    for (let i = 0; i < limit; i += 1) {
      const delta = (samples[i] - mean) - (samples[i + tau] - mean)
      sum += delta * delta
    }
    difference[tau] = sum
  }

  const cmnd = new Float64Array(maxTau + 1)
  cmnd[0] = 1
  let runningSum = 0
  for (let tau = 1; tau <= maxTau; tau += 1) {
    runningSum += difference[tau]
    cmnd[tau] = runningSum === 0 ? 1 : (difference[tau] * tau) / runningSum
  }

  // A strong period shorter than our supported range is an above-range tone,
  // not a guitar fundamental whose subharmonic should be reported.
  for (let tau = 2; tau < minTau; tau += 1) {
    if (cmnd[tau] < 0.025 && cmnd[tau] <= cmnd[tau - 1] && cmnd[tau] <= cmnd[tau + 1]) return null
  }

  let tauEstimate = -1
  for (let tau = minTau; tau < maxTau; tau += 1) {
    if (cmnd[tau] < YIN_THRESHOLD) {
      while (tau + 1 <= maxTau && cmnd[tau + 1] < cmnd[tau]) tau += 1
      tauEstimate = tau
      break
    }
  }
  if (tauEstimate < 0) {
    let best = minTau
    for (let tau = minTau + 1; tau <= maxTau; tau += 1) {
      if (cmnd[tau] < cmnd[best]) best = tau
    }
    if (cmnd[best] > 0.35) return null
    tauEstimate = best
  }

  tauEstimate = correctSubharmonicTau(cmnd, tauEstimate, sampleRate, minTau, maxTau)

  let refinedTau = tauEstimate
  if (tauEstimate > 1 && tauEstimate < maxTau) {
    const before = cmnd[tauEstimate - 1]
    const center = cmnd[tauEstimate]
    const after = cmnd[tauEstimate + 1]
    const denominator = 2 * (2 * center - after - before)
    if (denominator !== 0) refinedTau += (after - before) / denominator
  }

  const frequencyHz = sampleRate / refinedTau
  if (!Number.isFinite(frequencyHz) || frequencyHz < MIN_FREQUENCY || frequencyHz > MAX_FREQUENCY) return null
  return { frequencyHz, confidence: Math.max(0, Math.min(1, 1 - cmnd[tauEstimate])) }
}
