// Single, shared AudioContext
let audioCtx = null;
let isAudioContextResumed = false;
let isMuted = false; // Add mute state variable

// Function to initialize or resume the AudioContext (must be called after user interaction)
function initAudioContext() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.");
            return false; // Indicate failure
        }
    }

    // Resume context if necessary (required after user interaction)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("AudioContext resumed successfully.");
            isAudioContextResumed = true;
        }).catch(e => console.error("Error resuming AudioContext:", e));
    } else {
        isAudioContextResumed = true; // Already running or closed (no need to resume)
    }
    return true; // Indicate success or already running
}

// Function to ensure audio context is ready before playing sound
function playSound(soundCreationFunction) {
    if (isMuted) return; // Don't play if muted

    if (!audioCtx && !initAudioContext()) {
        // If context creation failed, don't try to play
        return;
    }

    if (!isAudioContextResumed) {
        // If context hasn't resumed yet (e.g., user hasn't interacted), try resuming.
        // This might happen if a sound is triggered *before* the interaction handler calls initAudioContext explicitly.
        console.log("Attempting to resume AudioContext for sound playback...");
        initAudioContext(); 
        // Sound might not play this time if resume is needed, but will next time.
        // Alternatively, queue the sound or show a message.
        // For simplicity here, we'll just log and potentially skip the sound the very first time.
        if (!isAudioContextResumed) {
             console.warn("AudioContext not ready, sound skipped. Requires user interaction.");
            return; 
        }
    }

    // If context is ready, create and play the sound
    soundCreationFunction(audioCtx);
}

// Create jump/flap sound (modified to accept context)
function createFlapSound(ctx) {
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(784, ctx.currentTime); // G5
    oscillator.frequency.exponentialRampToValueAtTime(1568, ctx.currentTime + 0.1); // G6

    gainNode.gain.setValueAtTime(0.3 * 0.5, ctx.currentTime); // Reduced volume slightly
    gainNode.gain.exponentialRampToValueAtTime(0.01 * 0.5, ctx.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
}

// Create coin/score sound (modified)
function createScoreSound(ctx) {
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(988, ctx.currentTime); // B5
    oscillator.frequency.setValueAtTime(1319, ctx.currentTime + 0.1); // E6

    gainNode.gain.setValueAtTime(0.3 * 0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01 * 0.5, ctx.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
}

// Create hit/collision sound (modified)
function createHitSound(ctx) {
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(196, ctx.currentTime); // G3

    gainNode.gain.setValueAtTime(0.5 * 0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01 * 0.5, ctx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.1);
}

// Create game over sound (modified)
function createGameOverSound(ctx) {
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(494, ctx.currentTime); // B4
    oscillator.frequency.setValueAtTime(466, ctx.currentTime + 0.1); // A#4/Bb4
    oscillator.frequency.setValueAtTime(440, ctx.currentTime + 0.2); // A4
    oscillator.frequency.setValueAtTime(415, ctx.currentTime + 0.3); // G#4/Ab4
    oscillator.frequency.setValueAtTime(392, ctx.currentTime + 0.4); // G4
    oscillator.frequency.setValueAtTime(370, ctx.currentTime + 0.5); // F#4/Gb4
    oscillator.frequency.setValueAtTime(349, ctx.currentTime + 0.6); // F4

    gainNode.gain.setValueAtTime(0.3 * 0.5, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3 * 0.5, ctx.currentTime + 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.01 * 0.5, ctx.currentTime + 0.8);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.8);
}

// --- New function to toggle mute state ---
function toggleMute() {
    isMuted = !isMuted;
    console.log("Muted state:", isMuted);
    // Optional: Save mute preference to localStorage
    try {
        localStorage.setItem('flappyDogMuted', isMuted ? 'true' : 'false');
    } catch (e) {
        console.warn("Could not save mute preference:", e);
    }
    // Optional: Update button text/icon
    const muteButton = document.getElementById('mute-toggle');
    if (muteButton) {
        muteButton.textContent = isMuted ? "Unmute" : "Mute";
    }
    // Maybe add another one for game over screen?
     const muteButtonGameOver = document.getElementById('mute-toggle-gameover');
     if (muteButtonGameOver) {
         muteButtonGameOver.textContent = isMuted ? "Unmute" : "Mute";
     }
}

// --- New function to load mute state ---
function loadMutePreference() {
    try {
        const savedMuteState = localStorage.getItem('flappyDogMuted');
        isMuted = savedMuteState === 'true';
    } catch (e) {
        console.warn("Could not load mute preference:", e);
        isMuted = false; // Default to unmuted
    }
    // Update button text initially
    const muteButton = document.getElementById('mute-toggle');
    if (muteButton) {
        muteButton.textContent = isMuted ? "Unmute" : "Mute";
    }
     const muteButtonGameOver = document.getElementById('mute-toggle-gameover');
     if (muteButtonGameOver) {
         muteButtonGameOver.textContent = isMuted ? "Unmute" : "Mute";
     }
}

// Export sound functions using the playSound wrapper
window.gameSounds = {
    init: initAudioContext, // Expose init function
    toggleMute: toggleMute, // Expose toggle function
    loadMutePreference: loadMutePreference, // Expose load function
    isMuted: () => isMuted, // Expose mute state check
    flap: () => playSound(createFlapSound),
    score: () => playSound(createScoreSound),
    hit: () => playSound(createHitSound),
    gameOver: () => playSound(createGameOverSound)
};
