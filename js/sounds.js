// Simple audio synthesizer for game sounds
function createAudioContext() {
  return new (window.AudioContext || window.webkitAudioContext)();
}

// Create jump/flap sound (Mario jump sound)
function createFlapSound() {
  const audioCtx = createAudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(784, audioCtx.currentTime); // G5
  oscillator.frequency.exponentialRampToValueAtTime(1568, audioCtx.currentTime + 0.1); // G6
  
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.2);
  
  return audioCtx;
}

// Create coin/score sound (Mario coin sound)
function createScoreSound() {
  const audioCtx = createAudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(988, audioCtx.currentTime); // B5
  oscillator.frequency.setValueAtTime(1319, audioCtx.currentTime + 0.1); // E6
  
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.2);
  
  return audioCtx;
}

// Create hit/collision sound (Mario bump sound)
function createHitSound() {
  const audioCtx = createAudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(196, audioCtx.currentTime); // G3
  
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.1);
  
  return audioCtx;
}

// Create game over sound (Mario death sound)
function createGameOverSound() {
  const audioCtx = createAudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(494, audioCtx.currentTime); // B4
  oscillator.frequency.setValueAtTime(466, audioCtx.currentTime + 0.1); // A#4/Bb4
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime + 0.2); // A4
  oscillator.frequency.setValueAtTime(415, audioCtx.currentTime + 0.3); // G#4/Ab4
  oscillator.frequency.setValueAtTime(392, audioCtx.currentTime + 0.4); // G4
  oscillator.frequency.setValueAtTime(370, audioCtx.currentTime + 0.5); // F#4/Gb4
  oscillator.frequency.setValueAtTime(349, audioCtx.currentTime + 0.6); // F4
  
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.6);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.8);
  
  return audioCtx;
}

// Export sound functions
window.gameSounds = {
  flap: createFlapSound,
  score: createScoreSound,
  hit: createHitSound,
  gameOver: createGameOverSound
};
