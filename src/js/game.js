import tazImageUrl from '../assets/images/8bit taz.png';
import chloeImageUrl from '../assets/images/8 bit chloe.png';
import pipeTopImageUrl from '../assets/images/pipe-top.png';
import pipeBottomImageUrl from '../assets/images/pipe-bottom.png';
import backgroundImageUrl from '../assets/images/background.png';
import groundImageUrl from '../assets/images/ground.png';

// Import leaderboard functions (Ensure these are exported from leaderboard.js)
// If leaderboard.js uses window globals, these imports aren't needed, but check its structure.
import { displayLeaderboard, isHighScore, showNicknameModal } from './leaderboard';

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
    taz: tazImageUrl,     // Use imported URL
    chloe: chloeImageUrl  // Use imported URL
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
    // Animation properties (used even if drawing single frame)
    animationState: 'idle',
    animationFrame: 0,
    frameCount: 2, // Still used for timing even if visually 1 frame
    frameTimer: 0,
    frameDuration: 150,
    spriteSheet: new Image(),
    frameWidth: 40, // Original source frame width (if spritesheet were used)
    frameHeight: 40 // Original source frame height
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

// Assets (Image objects)
let pipeTopSprite = new Image();
let pipeBottomSprite = new Image();
let backgroundSprite = new Image();
let groundSprite = new Image();

// DOM elements (Variables will be assigned in init)
let gameContainer, startScreen, gameOverScreen, scoreDisplay, finalScoreDisplay, highScoreDisplay;
let themeToggleButton;

// --- Score Animation Variables ---
let displayedScore = 0;
let targetScore = 0;
let scoreAnimationId = null;
// --- End Score Animation Variables ---

// --- Particle System Variables ---
let particles = [];
// --- End Particle System Variables ---

// Initialize the game
export function init() { // Exported for main.js
    // Get DOM elements
    gameContainer = document.querySelector('.game-container');
    canvas = document.getElementById('game-canvas');
    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over');
    scoreDisplay = document.getElementById('score');
    finalScoreDisplay = document.getElementById('final-score');
    highScoreDisplay = document.getElementById('high-score');
    themeToggleButton = document.getElementById('theme-toggle-start');
    const muteButton = document.getElementById('mute-toggle');

    // --- Feature Support Check ---
    if (!canvas || !canvas.getContext || !(ctx = canvas.getContext('2d'))) { // Assign ctx here
        gameContainer.innerHTML = '<div style="padding: 20px; color: white; text-align: center;">' +
                                  '<h2>Unsupported Browser</h2>' +
                                  '<p>Sorry, your browser does not support the required features to play this game.</p>' +
                                  '</div>';
        return;
    }
    // --- End Feature Support Check ---

    setupCanvasDimensions();
    ground.y = logicalHeight - GROUND_HEIGHT;

    const savedHighScore = localStorage.getItem('flappyMarioHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
        highScoreDisplay.textContent = highScore;
        targetScore = 0;
        displayedScore = 0;
        scoreDisplay.textContent = displayedScore;
    }

    loadAssets();

    const charOptions = document.querySelectorAll('.char-option');
    charOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectedCharacter = option.dataset.char;
            player.spriteSheet.src = characterAssets[selectedCharacter];
            charOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
    document.querySelector(`.char-option[data-char='${selectedCharacter}']`).classList.add('selected');

    document.getElementById('start-button').addEventListener('click', handleInputStart);
    document.getElementById('restart-button').addEventListener('click', resetGame);

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
    applySavedTheme();

    if (muteButton) {
        muteButton.addEventListener('click', () => {
            if (window.gameSounds && typeof window.gameSounds.toggleMute === 'function') {
                window.gameSounds.toggleMute();
            }
        });
    }
    if (window.gameSounds && typeof window.gameSounds.loadMutePreference === 'function') {
        window.gameSounds.loadMutePreference();
    }

    if (typeof displayLeaderboard === 'function') {
        displayLeaderboard();
    } else {
        console.error("displayLeaderboard function not found. Ensure leaderboard.js is loaded and function is exported/available.");
    }

    window.addEventListener('keydown', handleInputStart);
    canvas.addEventListener('touchstart', handleInputStart, { passive: false });
    canvas.addEventListener('mousedown', handleInputStart);
    window.addEventListener('resize', onResize);

    startScreen.classList.add('visible');
    gameOverScreen.classList.remove('visible');

    render();
}

function setupCanvasDimensions() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    logicalWidth = rect.width;
    logicalHeight = rect.height;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;

    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function onResize() {
    console.log("Window resized");
    setupCanvasDimensions();
    ground.y = logicalHeight - GROUND_HEIGHT;
    render();
}

function loadAssets() {
    // Set src for Image objects using imported URLs
    player.spriteSheet.src = characterAssets[selectedCharacter];
    pipeTopSprite.src = pipeTopImageUrl;
    pipeBottomSprite.src = pipeBottomImageUrl;
    backgroundSprite.src = backgroundImageUrl;
    groundSprite.src = groundImageUrl;
    // Add listeners to check if critical assets loaded? Optional.
}

function startGame() {
    gameStarted = true;
    gameOver = false;
    firstPipePassed = false;
    startScreen.classList.remove('visible');
    gameOverScreen.classList.remove('visible');
    gameContainer.classList.remove('game-is-over');
    score = 0;
    targetScore = 0;
    displayedScore = 0;
    updateScoreDisplayAnimated();

    player.y = 300;
    player.velocity = 0;
    player.animationState = 'idle';
    player.animationFrame = 0;
    player.frameTimer = 0;

    pipes = [];
    particles = [];

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    lastPipeSpawn = Date.now(); // Reset pipe spawn timer
    gameLoop();
}

function resetGame() {
    gameOver = false;
    gameStarted = false;
    firstPipePassed = false;
    score = 0;
    targetScore = 0;
    displayedScore = 0;
    player.y = 300;
    player.velocity = 0;
    player.animationState = 'idle';
    player.animationFrame = 0;
    player.frameTimer = 0;
    pipes = [];
    particles = [];

    gameOverScreen.classList.remove('visible');
    startScreen.classList.add('visible');
    updateScoreDisplayAnimated();
    render();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function gameLoop() {
    try {
        update();
        render();
        if (!gameOver) {
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    } catch (error) {
        console.error("Error in game loop:", error);
        if (!gameOver) { gameEnd(); }
    }
}

function update() {
    if (!gameStarted || gameOver) return;

    player.velocity += GRAVITY;

    let justFlapped = false;
    if (player.isFlapping) {
        player.velocity = FLAP_FORCE;
        player.isFlapping = false;
        player.animationState = 'flapping';
        player.animationFrame = 0;
        player.frameTimer = 0;
        justFlapped = true;
        if (window.gameSounds) window.gameSounds.flap();
        createParticles(player.x + player.width / 2, player.y + player.height / 2, 5, '#dddddd', 15, 1.5, 0.01);
    }

    player.y += player.velocity;

    if (player.animationState === 'flapping' && !justFlapped && Math.abs(player.velocity) < Math.abs(FLAP_FORCE / 2)) {
        player.animationState = 'idle';
        player.animationFrame = 0;
        player.frameTimer = 0;
    }

    if (player.y + player.height > ground.y) {
        player.y = ground.y - player.height;
        gameEnd();
        return; // Stop update if game ended
    }

    if (player.y < 0) {
        player.y = 0;
        player.velocity = 0;
    }

    const currentTime = Date.now();
    if (currentTime - lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
        spawnPipe();
        lastPipeSpawn = currentTime;
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= PIPE_SPEED;

        if (pipe.x + pipe.width < 0) {
            pipes.splice(i, 1);
            continue;
        }

        const topPipeRect = { x: pipe.x, y: pipe.top.y, width: pipe.width, height: pipe.top.height };
        const bottomPipeRect = { x: pipe.x, y: pipe.bottom.y, width: pipe.width, height: pipe.bottom.height };
        const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };

        if (checkCollision(playerRect, topPipeRect) || checkCollision(playerRect, bottomPipeRect)) {
            gameEnd();
            return;
        }

        if (!pipe.passed && player.x > pipe.x + pipe.width) {
            pipe.passed = true;
            if (firstPipePassed) {
                score++;
                updateScore();
                if (window.gameSounds) window.gameSounds.score();
            } else {
                firstPipePassed = true;
                console.log("First pipe passed, scoring enabled.");
            }
        }
    }
}

function render() {
    ctx.imageSmoothingEnabled = false;
    // ... (rest of smoothing flags)

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (backgroundSprite.complete && backgroundSprite.naturalWidth > 0) {
        const bgWidth = backgroundSprite.naturalWidth;
        const bgHeight = backgroundSprite.naturalHeight;
        const scale = logicalHeight / bgHeight;
        const scaledWidth = bgWidth * scale;
        const numTiles = Math.ceil(logicalWidth / scaledWidth) + 1;
        let xOffset = -(Date.now() * 0.03 % scaledWidth);
        for (let i = 0; i < numTiles; i++) {
            ctx.drawImage(backgroundSprite, xOffset + i * scaledWidth, 0, scaledWidth, logicalHeight);
        }
    } else {
        ctx.fillStyle = '#5c94fc';
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

    // Draw ground
    if (groundSprite.complete && groundSprite.naturalWidth > 0) {
        const groundWidth = groundSprite.naturalWidth;
        const groundScale = GROUND_HEIGHT / groundSprite.naturalHeight;
        const scaledGroundWidth = groundWidth * groundScale;
        const numGroundTiles = Math.ceil(logicalWidth / scaledGroundWidth) + 1;
        let groundXOffset = -(Date.now() * (PIPE_SPEED / 10) % scaledGroundWidth);
        for (let i = 0; i < numGroundTiles; i++) {
            ctx.drawImage(groundSprite, groundXOffset + i * scaledGroundWidth, ground.y, scaledGroundWidth, GROUND_HEIGHT);
        }
    } else {
        ctx.fillStyle = '#e47326';
        ctx.fillRect(0, ground.y, logicalWidth, GROUND_HEIGHT);
        ctx.fillStyle = '#00a800';
        ctx.fillRect(0, ground.y, logicalWidth, 8);
    }

    // Draw Player
    const spriteSheet = player.spriteSheet;
    // Animation logic (even if single frame, timing might be used elsewhere)
    let currentFrameCount = player.frameCount;
    switch (player.animationState) {
        // ... (cases for flapping, hit, idle)
    }
    if (currentFrameCount > 1) {
        player.frameTimer += 16.67; // Approx 60fps delta
        if (player.frameTimer >= player.frameDuration) {
            player.animationFrame = (player.animationFrame + 1) % currentFrameCount;
            player.frameTimer = 0;
        }
    } else {
        player.animationFrame = 0;
    }
    // Draw the player image (simple version for single frame assets)
    if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
        // Optional: Add hit flash effect
        let drawPlayer = true;
        if (player.animationState === 'hit' && Math.floor(Date.now() / 100) % 2 === 0) {
            drawPlayer = false;
        }
        if (drawPlayer) {
            ctx.drawImage(spriteSheet, player.x, player.y, player.width, player.height);
        }
    } else {
        ctx.fillStyle = '#ff0000'; // Fallback
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    // Draw Particles
    updateAndDrawParticles(ctx);
}

function spawnPipe() {
    const pipeWidth = 80;
    const minHeight = 50;
    const maxHeight = logicalHeight - PIPE_GAP - minHeight - GROUND_HEIGHT;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    const bottomY = topHeight + PIPE_GAP;

    pipes.push({
        x: logicalWidth,
        width: pipeWidth,
        top: { y: 0, height: topHeight, width: pipeWidth },
        bottom: { y: bottomY, height: logicalHeight - bottomY, width: pipeWidth },
        passed: false
    });
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function gameEnd() {
    if (gameOver) return;
    gameOver = true;
    gameStarted = false;
    player.animationState = 'hit';
    if (window.gameSounds) window.gameSounds.hit();
    createParticles(player.x + player.width / 2, player.y + player.height / 2, 30, '#ffaa00', 40, 3, 0.08);

    if (gameContainer) {
        gameContainer.classList.add('shake');
        setTimeout(() => { if (gameContainer) gameContainer.classList.remove('shake'); }, 500);
    }

    setTimeout(() => { if (window.gameSounds) window.gameSounds.gameOver(); }, 500);

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyMarioHighScore', highScore);
    }

    finalScoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;

    // Use imported functions for leaderboard
    if (typeof isHighScore === 'function' && isHighScore(score)) {
        if (typeof showNicknameModal === 'function') {
            showNicknameModal(score);
        } else {
            console.error("showNicknameModal function not found.");
            if (typeof displayLeaderboard === 'function') displayLeaderboard();
        }
    } else {
        if (typeof displayLeaderboard === 'function') {
            displayLeaderboard();
        }
    }

    gameContainer.classList.add('game-is-over');
    gameOverScreen.classList.add('visible');
}

function updateScoreDisplayAnimated() {
    if (scoreAnimationId) cancelAnimationFrame(scoreAnimationId);
    function animateScore() {
        const diff = targetScore - displayedScore;
        if (Math.abs(diff) < 0.1) {
            displayedScore = targetScore;
        } else {
            displayedScore += diff * 0.1;
            displayedScore = Math.round(displayedScore);
        }
        if (scoreDisplay) scoreDisplay.textContent = displayedScore;
        if (displayedScore !== targetScore) {
            scoreAnimationId = requestAnimationFrame(animateScore);
        } else {
            scoreAnimationId = null;
        }
    }
    animateScore();
}

function updateScore() {
    targetScore = score;
    updateScoreDisplayAnimated();
    if (scoreDisplay) {
        scoreDisplay.style.transition = 'transform 0.1s ease-out';
        scoreDisplay.style.transform = 'scale(1.3)';
        setTimeout(() => { if (scoreDisplay) scoreDisplay.style.transform = 'scale(1)'; }, 100);
    }
}

function handleInputStart(e) {
    if (e.type.includes('touch')) { e.preventDefault(); }
    if (e.type === 'keydown' && e.code !== 'Space') { return; }

    // Check if audio context is available/resumed (using window global for now)
    const audioResumed = typeof window.isAudioContextResumed !== 'undefined' ? window.isAudioContextResumed : false;
    if (!audioResumed && window.gameSounds && typeof window.gameSounds.init === 'function') {
        window.gameSounds.init();
    }

    if (!gameStarted && !gameOver) {
        startGame();
    } else if (gameStarted && !gameOver) {
        player.isFlapping = true;
    } else if (gameOver) {
        resetGame();
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('flappyDogTheme', newTheme);
    if (themeToggleButton) {
         themeToggleButton.textContent = newTheme === 'light' ? 'Night Mode' : 'Day Mode';
    }
    // Potentially reload assets or change background sprite source here if theme affects them
    // e.g., backgroundSprite.src = newTheme === 'dark' ? darkBgImageUrl : lightBgImageUrl;
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('flappyDogTheme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    if (themeToggleButton) {
         themeToggleButton.textContent = savedTheme === 'light' ? 'Night Mode' : 'Day Mode';
    }
    // Potentially set initial background source based on theme
}

function createParticles(x, y, count, color = '#ffffff', life = 30, speed = 2, gravity = 0.1) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * speed * 2,
            vy: (Math.random() - 0.5) * speed * 2 - (speed * Math.random() * 0.5),
            life: life + Math.random() * (life * 0.5),
            maxLife: life * 1.5,
            size: Math.random() * 3 + 1,
            color: color,
            gravity: gravity
        });
    }
}

function updateAndDrawParticles(ctx) {
    ctx.save();
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.vx *= 0.98;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.life <= 0 || p.y > logicalHeight) {
            particles.splice(i, 1);
        } else {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
    }
    ctx.restore();
}

// No window.addEventListener('load', init) needed here, handled by main.js 