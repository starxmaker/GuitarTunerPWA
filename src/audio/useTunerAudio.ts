import { useCallback, useEffect, useRef, useState } from 'react'
import { detectPitch } from './pitchDetector'
import { ReferenceTonePlayer } from './referenceTone'
import {
  DEFAULT_TARGET,
  makeSilentReading,
  ReadingStabilizer,
  type GuitarStringId,
  type TuningReading,
  type TuningTarget,
} from './tuning'

export type AudioState = 'idle' | 'starting' | 'listening' | 'permissionDenied' | 'unsupported' | 'insecure' | 'error'

const ANALYSIS_INTERVAL_MS = 70

export function useTunerAudio(lockedTarget: TuningTarget | null) {
  const [audioState, setAudioState] = useState<AudioState>('idle')
  const [reading, setReading] = useState<TuningReading>(() => makeSilentReading(DEFAULT_TARGET))
  const [activeToneId, setActiveToneId] = useState<GuitarStringId | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastAnalysisRef = useRef(0)
  const lockedTargetRef = useRef(lockedTarget)
  const stabilizerRef = useRef(new ReadingStabilizer())
  const activeToneRef = useRef<GuitarStringId | null>(null)
  const tonePlayerRef = useRef(new ReferenceTonePlayer())

  useEffect(() => {
    const tonePlayer = tonePlayerRef.current
    tonePlayer.setOnEnded(() => {
      activeToneRef.current = null
      setActiveToneId(null)
    })
    return () => tonePlayer.setOnEnded(() => undefined)
  }, [])

  useEffect(() => {
    lockedTargetRef.current = lockedTarget
    if (lockedTarget) {
      stabilizerRef.current.reset(lockedTarget)
    }
  }, [lockedTarget])

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }, [])

  const stopTone = useCallback(() => {
    tonePlayerRef.current.stop()
    activeToneRef.current = null
    setActiveToneId(null)
  }, [])

  const stop = useCallback(() => {
    cancelFrame()
    stopTone()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    analyserRef.current?.disconnect()
    analyserRef.current = null
    const context = contextRef.current
    contextRef.current = null
    if (context) void context.close()
    stabilizerRef.current.reset(lockedTargetRef.current ?? DEFAULT_TARGET)
    setReading(makeSilentReading(lockedTargetRef.current ?? DEFAULT_TARGET))
    setAudioState('idle')
  }, [cancelFrame, stopTone])

  const start = useCallback(async () => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setAudioState('insecure')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setAudioState('unsupported')
      return
    }
    setAudioState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      streamRef.current = stream
      const context = new AudioContext()
      contextRef.current = context
      await context.resume()
      const analyser = context.createAnalyser()
      analyser.fftSize = 4096
      analyser.smoothingTimeConstant = 0
      context.createMediaStreamSource(stream).connect(analyser)
      analyserRef.current = analyser
      stabilizerRef.current.reset(lockedTargetRef.current ?? DEFAULT_TARGET)
      setAudioState('listening')
      lastAnalysisRef.current = 0
      const analyze = (time: number) => {
        frameRef.current = requestAnimationFrame(analyze)
        if (activeToneRef.current || time - lastAnalysisRef.current < ANALYSIS_INTERVAL_MS) return
        lastAnalysisRef.current = time
        const currentAnalyser = analyserRef.current
        const currentContext = contextRef.current
        if (!currentAnalyser || !currentContext) return
        const samples = new Float32Array(currentAnalyser.fftSize)
        currentAnalyser.getFloatTimeDomainData(samples)
        const estimate = detectPitch(samples, currentContext.sampleRate)
        if (!estimate || estimate.confidence < 0.65) {
          setReading((current) => makeSilentReading(lockedTargetRef.current ?? current.target))
          return
        }
        setReading(stabilizerRef.current.update(estimate, lockedTargetRef.current))
      }
      frameRef.current = requestAnimationFrame(analyze)
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      const context = contextRef.current
      contextRef.current = null
      if (context) void context.close()
      const name = error instanceof DOMException ? error.name : ''
      setAudioState(name === 'NotAllowedError' || name === 'SecurityError' ? 'permissionDenied' : 'error')
    }
  }, [])

  const toggleTone = useCallback(async (target: TuningTarget) => {
    if (!window.AudioContext) {
      setAudioState('unsupported')
      return
    }
    try {
      const nextId = await tonePlayerRef.current.toggle(target)
      activeToneRef.current = nextId
      setActiveToneId(nextId)
    } catch {
      activeToneRef.current = null
      setActiveToneId(null)
      setAudioState('error')
    }
  }, [])

  useEffect(() => {
    const tonePlayer = tonePlayerRef.current
    const handleVisibility = () => {
      if (document.hidden) stop()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      cancelFrame()
      tonePlayer.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      const context = contextRef.current
      if (context) void context.close()
    }
  }, [cancelFrame, stop])

  const visibleReading = lockedTarget && reading.target.id !== lockedTarget.id
    ? makeSilentReading(lockedTarget)
    : reading

  return { audioState, reading: visibleReading, activeToneId, start, stop, toggleTone, stopTone }
}
