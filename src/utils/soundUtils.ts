let audioContext: AudioContext | null = null
let notificationAudio: HTMLAudioElement | null = null
let notificationAudioUrl: string | null = null
let unlockHandlersInstalled = false

const SAMPLE_RATE = 22050

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null

  const BrowserAudioContext =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!BrowserAudioContext) return null

  if (!audioContext) {
    audioContext = new BrowserAudioContext()
  }

  return audioContext
}

const writeString = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

const createNotificationWavUrl = (): string | null => {
  if (typeof window === 'undefined') return null
  if (notificationAudioUrl) return notificationAudioUrl

  const durationSeconds = 0.9
  const totalSamples = Math.floor(SAMPLE_RATE * durationSeconds)
  const samples = new Int16Array(totalSamples)

  const notes = [
    { start: 0.0, end: 0.18, freq: 880 },
    { start: 0.24, end: 0.42, freq: 1100 },
    { start: 0.48, end: 0.76, freq: 1320 }
  ]

  for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += 1) {
    const time = sampleIndex / SAMPLE_RATE
    let value = 0

    for (const note of notes) {
      if (time < note.start || time > note.end) continue

      const progress = (time - note.start) / (note.end - note.start)
      const envelope = Math.sin(Math.PI * progress)

      value += Math.sin(2 * Math.PI * note.freq * time) * envelope * 0.5
    }

    const clamped = Math.max(-1, Math.min(1, value))

    samples[sampleIndex] = clamped * 32767
  }

  const wavBuffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(wavBuffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(44 + index * 2, samples[index]!, true)
  }

  const bytes = new Uint8Array(wavBuffer)
  let binary = ''

  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })

  notificationAudioUrl = `data:audio/wav;base64,${window.btoa(binary)}`

  return notificationAudioUrl
}

const getNotificationAudio = (): HTMLAudioElement | null => {
  if (typeof window === 'undefined') return null
  if (notificationAudio) return notificationAudio

  const src = createNotificationWavUrl()

  if (!src) return null

  notificationAudio = new Audio(src)
  notificationAudio.preload = 'auto'
  notificationAudio.volume = 1

  return notificationAudio
}

const resumeAudioContext = async () => {
  const ctx = getAudioContext()

  if (!ctx || ctx.state === 'running') return

  try {
    await ctx.resume()
  } catch {}
}

export const installNotificationSoundUnlock = (): void => {
  if (typeof window === 'undefined' || unlockHandlersInstalled) return

  unlockHandlersInstalled = true

  const unlock = () => {
    void resumeAudioContext()

    const audio = getNotificationAudio()

    if (!audio) return

    audio.muted = true
    audio.currentTime = 0

    void audio.play().then(() => {
      audio.pause()
      audio.currentTime = 0
      audio.muted = false
    }).catch(() => {
      audio.muted = false
    })
  }

  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('touchstart', unlock, { passive: true })
  window.addEventListener('keydown', unlock)
}

const playWebAudioFallback = () => {
  const ctx = getAudioContext()

  if (!ctx || ctx.state !== 'running') return

  const playTone = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.001, ctx.currentTime + start)
    gain.gain.exponentialRampToValueAtTime(0.38, ctx.currentTime + start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
    osc.start(ctx.currentTime + start)
    osc.stop(ctx.currentTime + start + duration)
  }

  playTone(880, 0, 0.22)
  playTone(1100, 0.2, 0.24)
  playTone(1320, 0.42, 0.34)
}

export const playNotificationSound = (): void => {
  try {
    installNotificationSoundUnlock()

    const audio = getNotificationAudio()

    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.volume = 1
      void audio.play().catch(() => {})
    }

    playWebAudioFallback()
  } catch {}
}
