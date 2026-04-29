// Audio Manager using Web Audio API - generates all sounds procedurally
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicPlaying = false;
let musicOscillators: OscillatorNode[] = [];

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(masterGain);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.4;
    sfxGain.connect(masterGain);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3, detune = 0) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(sfxGain!);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playJump() {
  playTone(400, 0.15, 'sine', 0.3);
  setTimeout(() => playTone(600, 0.1, 'sine', 0.2), 50);
}

export function playDoubleJump() {
  playTone(500, 0.1, 'sine', 0.3);
  setTimeout(() => playTone(700, 0.1, 'sine', 0.25), 40);
  setTimeout(() => playTone(900, 0.15, 'sine', 0.2), 80);
}

export function playCollect() {
  playTone(800, 0.08, 'sine', 0.25);
  setTimeout(() => playTone(1000, 0.08, 'sine', 0.2), 60);
  setTimeout(() => playTone(1200, 0.12, 'sine', 0.15), 120);
}

export function playLeafToken() {
  playTone(600, 0.05, 'square', 0.15);
  playTone(900, 0.05, 'sine', 0.2);
  setTimeout(() => playTone(1200, 0.1, 'sine', 0.2), 80);
  setTimeout(() => playTone(1500, 0.15, 'sine', 0.15), 160);
}

export function playPowerUp() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.2, 'sine', 0.25), i * 80);
  });
}

export function playBounce() {
  playTone(300, 0.15, 'sine', 0.3);
  setTimeout(() => playTone(500, 0.1, 'sine', 0.2), 30);
}

export function playRampBoost() {
  playTone(760, 0.08, 'triangle', 0.28);
  setTimeout(() => playTone(1180, 0.12, 'sine', 0.24), 30);
}

export function playHit() {
  playTone(200, 0.2, 'sawtooth', 0.15);
  playTone(150, 0.3, 'square', 0.1);
}

export function playCraft() {
  const notes = [440, 554, 659, 880];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.15, 'triangle', 0.2), i * 60);
  });
}

export function playCheckpoint() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.25, 'sine', 0.2), i * 100);
  });
}

export function playGameOver() {
  const notes = [400, 350, 300, 250];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.3, 'triangle', 0.2), i * 150);
  });
}

export function playCombo() {
  playTone(880, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(1100, 0.15, 'sine', 0.25), 50);
}

// Simple procedural background music
let musicInterval: number | null = null;

export function startMusic() {
  if (musicPlaying) return;
  musicPlaying = true;
  const ctx = getCtx();

  const melodyNotes = [
    523, 587, 659, 784, 659, 587, 523, 440,
    523, 659, 784, 880, 784, 659, 523, 587,
    440, 523, 587, 659, 523, 440, 392, 440,
    523, 587, 659, 784, 880, 784, 659, 523,
  ];
  let noteIndex = 0;

  const playMelodyNote = () => {
    if (!musicPlaying) return;
    const note = melodyNotes[noteIndex % melodyNotes.length];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(musicGain!);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);

    // Bass note
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'triangle';
    bassOsc.frequency.value = note / 4;
    bassGain.gain.setValueAtTime(0.06, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    bassOsc.connect(bassGain);
    bassGain.connect(musicGain!);
    bassOsc.start(ctx.currentTime);
    bassOsc.stop(ctx.currentTime + 0.45);

    noteIndex++;
  };

  musicInterval = window.setInterval(playMelodyNote, 300);
}

export function stopMusic() {
  musicPlaying = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  musicOscillators.forEach(o => { try { o.stop(); } catch(e) {} });
  musicOscillators = [];
}

export function setMusicVolume(v: number) {
  if (musicGain) musicGain.gain.value = v * 0.15;
}

export function setSfxVolume(v: number) {
  if (sfxGain) sfxGain.gain.value = v * 0.4;
}

export function setMasterVolume(v: number) {
  if (masterGain) masterGain.gain.value = v * 0.3;
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
