// Main game file for Flappy Mario
// This file handles the game initialization, loop, and core mechanics

// Game constants
const GRAVITY = 0.5;
const FLAP_FORCE = -10;
const PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 1500; // milliseconds
const PIPE_GAP = 180;
const GROUND_HEIGHT = 80;
const MARIO_WIDTH = 50;
const MARIO_HEIGHT = 50;

// Game variables
let canvas, ctx;
let selectedCharacter = 'taz'; // Default character
const characterAssets = {
    taz: 'assets/images/8bit taz.png',
    chloe: 'assets/images/8 bit chloe.png'
};
let dpr = window.devicePixelRatio || 1; // Device Pixel Ratio
let logicalWidth, logicalHeight; // Logical canvas dimensions

// --- Player Object ---
let player = {
    x: 80,
    y: 300,
    width: MARIO_WIDTH, // Uses the updated constant
    height: MARIO_HEIGHT, // Uses the updated constant
    velocity: 0,
    isFlapping: false,
    // Animation properties
    animationState: 'idle', // 'idle', 'flapping', 'hit'
    animationFrame: 0,
    frameCount: 2, // Default frame count (e.g., for idle)
    frameTimer: 0,
    frameDuration: 150, // milliseconds per frame (adjust as needed)
    spriteSheet: new Image(), // Use this instead of marioSprite globally
    frameWidth: 40, // Width of a single frame on the sheet (Keep as 40)
    frameHeight: 40 // Height of a single frame on the sheet (Keep as 40)
};
// --- End Player Object ---

let pipes = [];
let ground = { y: 0 };
let score = 0;
let highScore = 0;
let gameStarted = false;
let gameOver = false;
let firstPipePassed = false; // Flag to track if the first pipe is passed
let lastPipeSpawn = 0;
let animationFrameId;

// Assets (Keep sprite variables, but player uses its own internal one)
// let marioSprite = new Image(); // Now handled within player object
let pipeTopSprite = new Image();
let pipeBottomSprite = new Image();
let backgroundSprite = new Image();
let groundSprite = new Image();

// Sound contexts
let flapSoundContext;
let scoreSoundContext;
let hitSoundContext;
let gameOverSoundContext;

// DOM elements
let gameContainer, startScreen, gameOverScreen, scoreDisplay, finalScoreDisplay, highScoreDisplay;
let themeToggleButton; // Add theme toggle button variable
const muteButton = document.getElementById('mute-toggle'); // Get mute button

// --- Score Animation Variables ---
let displayedScore = 0;
let targetScore = 0;
let scoreAnimationId = null;
// --- End Score Animation Variables ---

// --- Particle System Variables ---
let particles = [];
// --- End Particle System Variables ---

// Initialize the game
function init() {
    // Get DOM elements
    gameContainer = document.querySelector('.game-container');
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over');
    scoreDisplay = document.getElementById('score');
    finalScoreDisplay = document.getElementById('final-score');
    highScoreDisplay = document.getElementById('high-score');
    themeToggleButton = document.getElementById('theme-toggle-start'); // Get the toggle button
    
    // --- Feature Support Check ---
    if (!canvas || !canvas.getContext || !canvas.getContext('2d')) {
        // Basic check for canvas support
        gameContainer.innerHTML = '<div style="padding: 20px; color: white; text-align: center;">' +
                                  '<h2>Unsupported Browser</h2>' +
                                  '<p>Sorry, your browser does not support the required features to play this game.</p>' +
                                  '</div>';
        return; // Stop initialization
    }
    // Audio support is checked within sounds.js initAudioContext
    // --- End Feature Support Check ---
    
    // Set canvas dimensions considering DPR
    setupCanvasDimensions(); // Call new function to handle setup
    
    // Ground position (using logical height)
    ground.y = logicalHeight - GROUND_HEIGHT;
    
    // Load high score from local storage
    const savedHighScore = localStorage.getItem('flappyMarioHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
        highScoreDisplay.textContent = highScore;
        targetScore = 0; // Ensure target score starts at 0
        displayedScore = 0; // Ensure displayed score starts at 0
        scoreDisplay.textContent = displayedScore; // Show initial 0
    }
    
    // Load assets
    loadAssets();
    
    // Character selection listeners
    const charOptions = document.querySelectorAll('.char-option');
    charOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectedCharacter = option.dataset.char;
            player.spriteSheet.src = characterAssets[selectedCharacter]; // Load into player object
            
            // Update visual selection
            charOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
    // Set initial selection visually
    document.querySelector(`.char-option[data-char='${selectedCharacter}']`).classList.add('selected');
    
    // Event listeners
    document.getElementById('start-button').addEventListener('click', handleInputStart); // Changed to shared handler
    document.getElementById('restart-button').addEventListener('click', resetGame);
    
    // Theme toggle listener
    if (themeToggleButton) { // Check if button exists
        themeToggleButton.addEventListener('click', toggleTheme);
    }
    // Apply saved theme on load
    applySavedTheme();
    
    // --- Mute Button Listener and Initial State Load ---
    if (muteButton) {
        muteButton.addEventListener('click', () => {
            if (window.gameSounds && typeof window.gameSounds.toggleMute === 'function') {
                window.gameSounds.toggleMute();
            }
        });
    }
    // Load saved mute preference
    if (window.gameSounds && typeof window.gameSounds.loadMutePreference === 'function') {
        window.gameSounds.loadMutePreference();
    }
    // --- End Mute Handling ---
    
    // Display initial leaderboard
    if (typeof displayLeaderboard === 'function') {
        displayLeaderboard(); 
    } else {
        console.error("displayLeaderboard function not found. Ensure leaderboard.js is loaded.");
    }
    
    // Input handlers (Use a single handler for start/flap/reset)
    window.addEventListener('keydown', handleInputStart);
    canvas.addEventListener('touchstart', handleInputStart, { passive: false }); // Use shared handler, ensure passive: false if needed
    canvas.addEventListener('mousedown', handleInputStart); // Use shared handler
    
    // Add resize listener
    window.addEventListener('resize', onResize);
    
    // Show start screen with animation class
    startScreen.classList.add('visible');
    gameOverScreen.classList.remove('visible'); // Ensure game over is hidden initially

    // Initial render
    render();
}

// --- New function to set up canvas dimensions and scaling ---
function setupCanvasDimensions() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    logicalWidth = rect.width;
    logicalHeight = rect.height;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;

    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';

    // Apply scaling to the context
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Use setTransform for clarity
}

// --- New function to handle window resize ---
function onResize() {
    console.log("Window resized");
    setupCanvasDimensions();
    // Update ground position in case height changed significantly relative to GROUND_HEIGHT
    ground.y = logicalHeight - GROUND_HEIGHT;

    // Optionally, re-calculate pipe positions or other elements if needed based on new dimensions
    // For simplicity, we might just let existing pipes continue based on old dimensions
    // until they go off-screen. A full rescale might involve repositioning elements.

    // Re-render the current state with new dimensions/scaling
    render();
}

// Load game assets
function loadAssets() {
    player.spriteSheet.src = characterAssets[selectedCharacter]; // Load initial character sheet
    pipeTopSprite.src = 'assets/images/pipe-top.png';
    pipeBottomSprite.src = 'assets/images/pipe-bottom.png';
    backgroundSprite.src = 'assets/images/background.png';
    groundSprite.src = 'assets/images/ground.png';
}

// Start the game
function startGame() {
    gameStarted = true;
    gameOver = false;
    firstPipePassed = false; // Reset flag
    // player.spriteSheet.src = characterAssets[selectedCharacter]; // Already loaded on selection/init
    startScreen.classList.remove('visible'); // Hide with animation
    gameOverScreen.classList.remove('visible'); // Ensure hidden
    gameContainer.classList.remove('game-is-over');
    score = 0;
    targetScore = 0; // Reset target score
    displayedScore = 0; // Reset displayed score
    updateScoreDisplayAnimated(); // Update display to 0 (animated if needed)
    
    // Reset player position and state
    player.y = 300;
    player.velocity = 0;
    player.animationState = 'idle';
    player.animationFrame = 0;
    player.frameTimer = 0;
    
    // Clear pipes
    pipes = [];
    particles = []; // Clear particles
    
    // Start game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}

// Reset the game
function resetGame() {
    gameOver = false;
    gameStarted = false;
    firstPipePassed = false; // Reset flag
    score = 0;
    targetScore = 0;
    displayedScore = 0;
    player.y = 300; // Reset position
    player.velocity = 0;
    player.animationState = 'idle'; // Reset animation
    player.animationFrame = 0;
    player.frameTimer = 0;
    pipes = [];
    particles = []; // Clear particles
    
    gameOverScreen.classList.remove('visible'); // Hide game over screen
    startScreen.classList.add('visible'); // Show start screen
    updateScoreDisplayAnimated(); // Reset score display
    render(); // Render the initial state
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// Game loop
function gameLoop() {
    try { // Add try block
        update();
        render();

        if (!gameOver) {
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    } catch (error) { // Add catch block
        console.error("Error in game loop:", error);
        // Attempt graceful shutdown/game over
        if (!gameOver) { // Prevent multiple calls if error occurs during gameEnd
             gameEnd(); 
        }
        // Optionally display an error message to the user
        // alert("An unexpected error occurred. Please reload the game."); 
    }
}

// Update game state
function update() {
    if (!gameStarted || gameOver) return;
    
    // Update player
    player.velocity += GRAVITY;
    
    let justFlapped = false;
    if (player.isFlapping) {
        player.velocity = FLAP_FORCE;
        player.isFlapping = false; // Reset flap trigger
        player.animationState = 'flapping'; // Set animation state
        player.animationFrame = 0; // Reset frame for flap animation
        player.frameTimer = 0;
        justFlapped = true;
        flapSoundContext = window.gameSounds.flap();
        // Spawn flap particles
        createParticles(player.x, player.y + player.height, 5, '#dddddd', 15, 1.5, 0.01);
    }
    
    player.y += player.velocity;
    
    // Simple check to return to idle animation if falling slowly or rising slowly after flap
    if (player.animationState === 'flapping' && !justFlapped && Math.abs(player.velocity) < Math.abs(FLAP_FORCE / 2)) {
         player.animationState = 'idle';
         player.animationFrame = 0; // Reset idle animation frame
         player.frameTimer = 0;
    }

    // Check for collisions with ground
    if (player.y + player.height > ground.y) {
        player.y = ground.y - player.height;
        gameEnd();
    }
    
    // Check for collisions with ceiling
    if (player.y < 0) {
        player.y = 0;
        player.velocity = 0;
    }
    
    // Spawn pipes
    const currentTime = Date.now();
    if (currentTime - lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
        spawnPipe();
        lastPipeSpawn = currentTime;
    }
    
    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= PIPE_SPEED;
        
        // Check if pipe is off screen
        if (pipe.x + pipe.width < 0) {
            pipes.splice(i, 1);
            continue;
        }
        
        // Create full rectangle objects for collision check
        const topPipeRect = { x: pipe.x, y: pipe.top.y, width: pipe.width, height: pipe.top.height };
        const bottomPipeRect = { x: pipe.x, y: pipe.bottom.y, width: pipe.width, height: pipe.bottom.height };
        
        // Player collision rect
        const playerRect = {x: player.x, y: player.y, width: player.width, height: player.height};

        // Check for collisions with pipes
        if (checkCollision(playerRect, topPipeRect) || checkCollision(playerRect, bottomPipeRect)) {
            gameEnd();
            return; // Exit update early if game ended
        }
        
        // Check if player passed the pipe
        if (!pipe.passed && player.x > pipe.x + pipe.width) {
            pipe.passed = true; // Always mark pipe as passed

            if (firstPipePassed) {
                 // If the first pipe was already passed, increment score now
                score++;
                updateScore(); // This now triggers the animated update
                if (window.gameSounds) window.gameSounds.score(); // Play sound only on actual score increase
            } else {
                // This was the first pipe passed, just set the flag
                firstPipePassed = true;
                console.log("First pipe passed, scoring enabled."); // Optional debug log
            }
        }
    }
}

// Render game
function render() {
    // Ensure crisp pixel rendering on canvas
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false; // For older Safari
    ctx.mozImageSmoothingEnabled = false;    // For Firefox
    ctx.msImageSmoothingEnabled = false;     // For IE/Edge

    // Clear canvas (use physical dimensions)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (Use logical dimensions for positioning/scaling)
    if (backgroundSprite.complete && backgroundSprite.naturalWidth > 0) {
        const bgWidth = backgroundSprite.naturalWidth;
        const bgHeight = backgroundSprite.naturalHeight; // Use image's natural height
        // Calculate scale to fill logical height
        const scale = logicalHeight / bgHeight;
        const scaledWidth = bgWidth * scale;
        const numTiles = Math.ceil(logicalWidth / scaledWidth) + 1; // Use logical width
        let xOffset = -(Date.now() * 0.03 % scaledWidth); // Slower scroll for retro feel

        for (let i = 0; i < numTiles; i++) {
            // Draw scaled to fit height, tiling horizontally (use logical height)
            ctx.drawImage(backgroundSprite, xOffset + i * scaledWidth, 0, scaledWidth, logicalHeight);
        }
    } else {
        // Fallback solid color if image fails (use logical dimensions)
        ctx.fillStyle = '#5c94fc'; // Revert to hardcoded fallback color
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    }

    // Draw pipes
    for (const pipe of pipes) {
        if (pipeTopSprite.complete && pipeTopSprite.naturalWidth > 0) {
            ctx.drawImage(pipeTopSprite, pipe.x, pipe.top.y, pipe.width, pipe.top.height);
        }
        if (pipeBottomSprite.complete && pipeBottomSprite.naturalWidth > 0) {
            ctx.drawImage(pipeBottomSprite, pipe.x, pipe.bottom.y, pipe.width, pipe.bottom.height);
        }
    }

    // Draw ground (Use logical dimensions for positioning/scaling)
    if (groundSprite.complete && groundSprite.naturalWidth > 0) {
        const groundWidth = groundSprite.naturalWidth;
        const groundScale = GROUND_HEIGHT / groundSprite.naturalHeight; // Scale to fit GROUND_HEIGHT
        const scaledGroundWidth = groundWidth * groundScale;
        const numGroundTiles = Math.ceil(logicalWidth / scaledGroundWidth) + 1; // Use logical width
        // Make ground scroll with pipes (adjust speed multiplier if needed)
        let groundXOffset = -(Date.now() * (PIPE_SPEED / 10) % scaledGroundWidth);

        for (let i = 0; i < numGroundTiles; i++) {
            ctx.drawImage(groundSprite, groundXOffset + i * scaledGroundWidth, ground.y, scaledGroundWidth, GROUND_HEIGHT);
        }
    } else {
        // Fallback ground colors (use logical width)
        ctx.fillStyle = '#e47326'; // Revert to hardcoded fallback color (Brown ground)
        ctx.fillRect(0, ground.y, logicalWidth, GROUND_HEIGHT);
        ctx.fillStyle = '#00a800'; // Revert to hardcoded fallback color (Green grass top)
        ctx.fillRect(0, ground.y, logicalWidth, 8); // Thinner grass line
    }

    // --- Draw Player (Character) ---
    const spriteSheet = player.spriteSheet;
    const frameWidth = player.frameWidth;
    const frameHeight = player.frameHeight;
    
    let sourceX = 0;
    let sourceY = 0; // Use rows for different states if sheet is designed that way
    let currentFrameCount = 2; // Default frame count

    // Determine animation sequence based on state
    switch (player.animationState) {
        case 'flapping':
            currentFrameCount = 2; // Example: 2 frames for flapping
            sourceY = 0; // Row 0 for flapping (adjust based on your sheet)
            player.frameDuration = 100; // Faster animation for flap
            break;
        case 'hit':
            currentFrameCount = 1; // Example: 1 frame for hit state
            sourceY = 1; // Row 1 for hit state (adjust based on your sheet)
             // Optional: Add visual hit effect like flashing
             if (Math.floor(Date.now() / 100) % 2 === 0) {
                 // Don't draw the player this frame to make it flash
                 // Alternatively: ctx.globalAlpha = 0.5; // Draw semi-transparent
             }
            break;
        case 'idle':
        default:
            currentFrameCount = 2; // Example: 2 frames for idle bob/blink
            sourceY = 0; // Row 0 for idle (adjust based on your sheet)
            player.frameDuration = 200; // Slower animation for idle
            break;
    }
    
    // Update animation frame based on timer, only if more than one frame exists
    if (currentFrameCount > 1) {
        player.frameTimer += 16.67; // Approximate time delta for 60fps
        if (player.frameTimer >= player.frameDuration) {
            player.animationFrame = (player.animationFrame + 1) % currentFrameCount;
            player.frameTimer = 0;
        }
    } else {
        player.animationFrame = 0; // Stay on first frame if only one frame
    }

    // sourceX = player.animationFrame * frameWidth; // No longer needed for drawing single image

    // Draw the correct frame from the sprite sheet
    if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
        // Revert to drawing the entire image, scaled to player dimensions
        ctx.drawImage(
            spriteSheet,         // The entire source image
            player.x, player.y, // Destination X, Y
            player.width, player.height // Destination W, H (now 50x50)
        );

        /* --- ORIGINAL SPRITE SHEET CODE (Now commented out again) ---
         ctx.drawImage(
             spriteSheet,
             sourceX, sourceY, // Source X, Y
             frameWidth, frameHeight, // Source W, H
             player.x, player.y, // Destination X, Y
             player.width, player.height // Destination W, H
         );
         ctx.globalAlpha = 1.0; // Reset alpha if it was changed for hit effect
        */
    } else {
        // Fallback square if image not loaded
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
    // --- End Draw Player ---

    // --- Draw Particles ---
    updateAndDrawParticles(ctx); // Particle system also uses logical coordinates
    // --- End Draw Particles ---
}

// Spawn a new pipe
function spawnPipe() {
    const pipeWidth = 80;
    const minHeight = 50;
    // Use logicalHeight for calculations
    const maxHeight = logicalHeight - PIPE_GAP - minHeight - GROUND_HEIGHT;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    const bottomY = topHeight + PIPE_GAP;

    pipes.push({
        x: logicalWidth, // Spawn pipe at the right edge of the logical screen
        width: pipeWidth,
        top: {
            y: 0,
            height: topHeight,
            width: pipeWidth
        },
        bottom: {
            y: bottomY,
            height: logicalHeight - bottomY, // Use logicalHeight
            width: pipeWidth
        },
        passed: false
    });
}

// Check collision between two rectangles
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// End the game
function gameEnd() {
    if (gameOver) return; // Prevent running multiple times

    gameOver = true;
    gameStarted = false; // Stop game logic updates
    player.animationState = 'hit'; // Set hit animation state
    if (window.gameSounds) window.gameSounds.hit(); // Play hit sound
    // Spawn death particles
    createParticles(player.x + player.width / 2, player.y + player.height / 2, 30, '#ffaa00', 40, 3, 0.08);

    // --- Add Screen Shake Effect ---
    if (gameContainer) {
        gameContainer.classList.add('shake');
        // Remove the class after the animation duration
        setTimeout(() => {
            if (gameContainer) gameContainer.classList.remove('shake');
        }, 500); // Match animation duration in CSS
    }
    // --- End Screen Shake ---

    setTimeout(() => {
        if (window.gameSounds) window.gameSounds.gameOver(); // Play game over sound
    }, 500);
    
    // Stop the game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Update high score (this is the personal high score display)
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyMarioHighScore', highScore); // Keep using the old key for personal high score
    }
    
    // Update displays
    finalScoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore; // Update personal high score display
    
    // Check leaderboard qualification and handle nickname/display
    if (typeof isHighScore === 'function' && isHighScore(score)) {
        // If it's a leaderboard high score, show modal
        if (typeof showNicknameModal === 'function') {
            showNicknameModal(score);
        } else {
            console.error("showNicknameModal function not found.");
            // Fallback: display leaderboard without adding new score yet
             if (typeof displayLeaderboard === 'function') displayLeaderboard();
        }
    } else {
        // If not a new leaderboard high score, just display the current leaderboard
        if (typeof displayLeaderboard === 'function') {
            displayLeaderboard();
        }
    }

    // Show game over screen AFTER handling leaderboard logic
    gameContainer.classList.add('game-is-over');
    gameOverScreen.classList.add('visible'); // Show with animation
}

// --- Score Animation Function ---
function updateScoreDisplayAnimated() {
    if (scoreAnimationId) cancelAnimationFrame(scoreAnimationId);

    function animateScore() {
        const diff = targetScore - displayedScore;
        if (Math.abs(diff) < 0.1) { // Use a smaller threshold for smoother finish
            displayedScore = targetScore;
        } else {
            // Ease-out effect: move a fraction of the remaining distance
            displayedScore += diff * 0.1;
             // Use Math.ceil or Math.round for integer scores
            // Use toFixed(1) for smoother visual movement if score can be float internally
             displayedScore = Math.round(displayedScore); // Round to nearest integer
        }
        scoreDisplay.textContent = displayedScore;

        if (displayedScore !== targetScore) {
            scoreAnimationId = requestAnimationFrame(animateScore);
        } else {
             scoreAnimationId = null;
        }
    }
    animateScore();
}

// Update score display (Now triggers animation)
function updateScore() {
    targetScore = score; // Set the target for the animation
    updateScoreDisplayAnimated(); // Start the animation
     // Add a visual pop effect to the score display element itself
     if (scoreDisplay) {
         scoreDisplay.style.transition = 'transform 0.1s ease-out';
         scoreDisplay.style.transform = 'scale(1.3)';
         setTimeout(() => {
              if (scoreDisplay) scoreDisplay.style.transform = 'scale(1)';
         }, 100);
     }
}
// --- End Score Animation Function ---

// --- Input Handler (Combined) ---
function handleInputStart(e) {
    // Prevent default behavior for touch (scrolling, zooming)
    if (e.type.includes('touch')) {
        e.preventDefault();
    }
     // Allow starting via Space key even if input is focused elsewhere
    if (e.type === 'keydown' && e.code !== 'Space') {
        return;
    }

    // --- Initialize AudioContext on first user interaction ---
    if (!isAudioContextResumed && window.gameSounds && typeof window.gameSounds.init === 'function') {
        window.gameSounds.init();
    }
    // --- End AudioContext Init ---

    if (!gameStarted && !gameOver) {
        // Start Game
        startGame();
    } else if (gameStarted && !gameOver) {
        // Flap
        player.isFlapping = true; // Set flag, update() will handle physics/animation
    } else if (gameOver) {
        // Restart Game (Allow restart by clicking/tapping anywhere or pressing Space)
        resetGame();
    }
}
// --- End Input Handler ---

// Toggle Day/Night Theme
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('flappyDogTheme', newTheme); // Save preference
    // Update button text/icon if desired
    if (themeToggleButton) {
         themeToggleButton.textContent = newTheme === 'light' ? 'Night Mode' : 'Day Mode';
    }
    // Potentially update game asset variables here if backgrounds change
    // e.g., backgroundSprite.src = newTheme === 'dark' ? 'assets/images/bg_night.png' : 'assets/images/bg_day.png';
    // loadAssets(); // or reload specific assets
}

// Apply saved theme from local storage
function applySavedTheme() {
    const savedTheme = localStorage.getItem('flappyDogTheme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    if (themeToggleButton) {
         themeToggleButton.textContent = savedTheme === 'light' ? 'Night Mode' : 'Day Mode';
    }
     // Potentially set initial background asset based on theme
    // backgroundSprite.src = savedTheme === 'dark' ? 'assets/images/bg_night.png' : 'assets/images/bg_day.png';
}

// --- Particle System Functions ---
function createParticles(x, y, count, color = '#ffffff', life = 30, speed = 2, gravity = 0.1) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * speed * 2,
            vy: (Math.random() - 0.5) * speed * 2 - (speed * Math.random() * 0.5), // Bias upwards slightly randomly
            life: life + Math.random() * (life * 0.5),
            maxLife: life * 1.5, // Store max life for alpha calculation
            size: Math.random() * 3 + 1,
            color: color,
            gravity: gravity
        });
    }
}

function updateAndDrawParticles(ctx) {
    ctx.save(); // Save context state before drawing particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.vx *= 0.98; // Air resistance/friction
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        // Remove if life ends or falls off logical screen bottom
        if (p.life <= 0 || p.y > logicalHeight) { 
            particles.splice(i, 1);
        } else {
            ctx.fillStyle = p.color;
            // Fade out based on remaining life ratio
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); // Draw centered
        }
    }
    ctx.restore(); // Restore context state (especially globalAlpha)
}
// --- End Particle System Functions ---

// Initialize the game when the page loads
window.addEventListener('load', init);
