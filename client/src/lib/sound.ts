let ctx: AudioContext | null = null;
function getCtx() { if (!ctx) { const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; ctx = new AC(); } return ctx; }

/** Short beep via WebAudio (no asset needed). count=3 for "done" alerts. */
export function beep(count = 1, freq = 880, ms = 160) {
  try {
    const c = getCtx();
    if (c.state === 'suspended') void c.resume();
    for (let i = 0; i < count; i++) {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.4, c.currentTime + i * 0.25 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.25 + ms / 1000);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime + i * 0.25); o.stop(c.currentTime + i * 0.25 + ms / 1000 + 0.05);
    }
    if (navigator.vibrate) navigator.vibrate(count === 1 ? 80 : [150, 80, 150, 80, 150]);
  } catch { /* audio not available */ }
}
export const unlockAudio = () => { try { void getCtx().resume(); } catch { /* ignore */ } };
