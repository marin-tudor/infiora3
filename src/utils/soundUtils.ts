export const playNotificationSound = (): void => {
  try {
    const ctx = new AudioContext()

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.35, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }

    playTone(880, 0, 0.18)
    playTone(1100, 0.2, 0.18)
    playTone(1320, 0.4, 0.28)
  } catch {}
}
