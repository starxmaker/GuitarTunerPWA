import { centsBetween, closestTarget, DEFAULT_TARGET, ReadingStabilizer, STANDARD_TUNING, statusForCents } from './tuning'

describe('tuning calculations', () => {
  it('calculates signed cents', () => {
    expect(centsBetween(440, 440)).toBe(0)
    expect(centsBetween(466.1638, 440)).toBeCloseTo(100, 2)
    expect(centsBetween(415.3047, 440)).toBeCloseTo(-100, 2)
  })

  it('chooses the nearest standard-tuning target', () => {
    expect(closestTarget(111).id).toBe('A')
    expect(closestTarget(325).id).toBe('highE')
  })

  it('uses inclusive five-cent tuned and fifteen-cent near boundaries', () => {
    expect(statusForCents(5)).toBe('tuned')
    expect(statusForCents(-5)).toBe('tuned')
    expect(statusForCents(15)).toBe('near')
    expect(statusForCents(-15)).toBe('near')
    expect(statusForCents(15.01)).toBe('far')
  })

  it('requires three frames before changing the automatic target', () => {
    const stabilizer = new ReadingStabilizer(DEFAULT_TARGET)
    expect(stabilizer.update({ frequencyHz: 110, confidence: 1 }, null).target.id).toBe('lowE')
    expect(stabilizer.update({ frequencyHz: 110, confidence: 1 }, null).target.id).toBe('lowE')
    expect(stabilizer.update({ frequencyHz: 110, confidence: 1 }, null).target.id).toBe('A')
  })

  it('honors a locked target immediately', () => {
    const locked = STANDARD_TUNING[3]
    const reading = new ReadingStabilizer().update({ frequencyHz: 198, confidence: 0.9 }, locked)
    expect(reading.target).toBe(locked)
  })

  it('smooths readings with a rolling median', () => {
    const stabilizer = new ReadingStabilizer(STANDARD_TUNING[1])
    const target = STANDARD_TUNING[1]
    stabilizer.update({ frequencyHz: 110, confidence: 1 }, target)
    stabilizer.update({ frequencyHz: 180, confidence: 1 }, target)
    const result = stabilizer.update({ frequencyHz: 111, confidence: 1 }, target)
    expect(result.frequencyHz).toBe(111)
  })
})
