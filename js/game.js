// Main game file for Flappy Mario
// This file handles the game initialization, loop, and core mechanics

// Game constants
const GRAVITY = 0.28;        // Decreased further for slower fall
const FLAP_FORCE = -7;      // Decreased magnitude for softer flap
const PIPE_SPEED = 2.5;      // Decreased for slower pipe movement
const PIPE_SPAWN_INTERVAL = 1500; // milliseconds
const PIPE_GAP = 160;
const GROUND_HEIGHT = 80;
const MARIO_WIDTH = 40;
const MARIO_HEIGHT = 40;
const TERMINAL_VELOCITY = 8; // Decreased max downward speed
const MAX_ROTATION_DOWN = Math.PI / 2; // 90 degrees downward
const MAX_ROTATION_UP = -Math.PI / 6; // 30 degrees upward
const ROTATION_SPEED_FACTOR = 5; // How quickly rotation responds to velocity change

// Game variables
let canvas, ctx;
let selectedCharacter = 'taz'; // Default character
const characterAssets = {
    taz: 'assets/images/8bit taz.png',     // Use 8-bit Taz
    chloe: 'assets/images/8 bit chloe.png' // Use 8-bit Chloe
};

let mario = {
    x: 80,
    y: 300,
    width: MARIO_WIDTH,
    height: MARIO_HEIGHT,
    velocity: 0,
    isFlapping: false,
    rotation: 0 // Add rotation property
};

let pipes = [];
let ground = { y: 0 };
let score = 0;
let highScore = 0;
let gameStarted = false;
let gameOver = false;
let lastPipeSpawn = 0;
let animationFrameId;

// Assets
let marioSprite = new Image();
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
    
    // Set canvas dimensions
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    
    // Ground position
    ground.y = canvas.height - GROUND_HEIGHT;
    
    // Load high score from local storage
    const savedHighScore = localStorage.getItem('flappyMarioHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
        highScoreDisplay.textContent = highScore;
    }
    
    // Load assets
    loadAssets();
    
    // Character selection listeners
    const charOptions = document.querySelectorAll('.char-option');
    charOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectedCharacter = option.dataset.char;
            marioSprite.src = characterAssets[selectedCharacter];
            
            // Update visual selection
            charOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
    // Set initial selection visually
    document.querySelector(`.char-option[data-char='${selectedCharacter}']`).classList.add('selected');
    
    // Event listeners
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', resetGame);
    
    // Input handlers
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Show start screen initially
    startScreen.classList.add('visible');
    
    // Initial render (optional, might not be needed if canvas is behind start screen)
    // render(); 
}

// Load game assets
function loadAssets() {
    // Set asset paths (these will be replaced with actual Mario-themed assets later)
    marioSprite.src = characterAssets[selectedCharacter];
    pipeTopSprite.src = 'assets/images/pipe-top.png';
    pipeBottomSprite.src = 'assets/images/pipe-bottom.png';
    backgroundSprite.src = 'assets/images/background.png';
    groundSprite.src = 'assets/images/ground.png';
    
    // Sound functions are loaded from sounds.js
    // No need to preload as they're generated on demand
}

// Start the game
function startGame() {
    gameStarted = true;
    gameOver = false;
    marioSprite.src = characterAssets[selectedCharacter];
    startScreen.classList.remove('visible'); // Use classList
    gameOverScreen.classList.remove('visible'); // Use classList
    // gameContainer.classList.remove('game-is-over'); // Removed - CSS effect removed
    score = 0;
    updateScore();
    
    // Reset mario position and state
    mario.y = 300;
    mario.velocity = 0;
    mario.rotation = 0; // Reset rotation
    
    // Clear pipes
    pipes = [];
    
    // Start game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}

// Reset the game
function resetGame() {
    startGame();
}

// Game loop
function gameLoop() {
    update();
    render();
    
    if (!gameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Update game state
function update() {
    if (!gameStarted || gameOver) return;
    
    // Update mario velocity
    mario.velocity += GRAVITY;
    
    // Apply terminal velocity
    if (mario.velocity > TERMINAL_VELOCITY) {
        mario.velocity = TERMINAL_VELOCITY;
    }
    
    if (mario.isFlapping) {
        mario.velocity = FLAP_FORCE;
        mario.isFlapping = false;
        flapSoundContext = window.gameSounds.flap();
    }
    
    mario.y += mario.velocity;
    
    // Calculate rotation based on velocity
    if (mario.velocity > 1) { // Falling
        // Rotate downwards towards 90 degrees
        mario.rotation += Math.PI / 180 * ROTATION_SPEED_FACTOR; // Increment rotation
        if (mario.rotation > MAX_ROTATION_DOWN) {
            mario.rotation = MAX_ROTATION_DOWN;
        }
    } else if (mario.velocity < 0) { // Flapping/Rising
        // Instantly set rotation when flapping, or slightly rotate up if coasting up
        mario.rotation = MAX_ROTATION_UP;
    }
    
    // Check for collisions with ground
    if (mario.y + mario.height / 2 > ground.y) { // Adjust collision check for rotation center
        mario.y = ground.y - mario.height / 2;
        mario.rotation = MAX_ROTATION_DOWN; // Ensure pointing down when hitting ground
        gameEnd();
    }
    
    // Check for collisions with ceiling
    if (mario.y - mario.height / 2 < 0) { // Adjust collision check for rotation center
        mario.y = mario.height / 2;
        mario.velocity = 0;
        mario.rotation = 0; // Reset rotation if hitting ceiling
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
        
        // Create full rectangle objects for collision check, including the pipe's x coordinate
        const topPipeRect = { x: pipe.x, y: pipe.top.y, width: pipe.width, height: pipe.top.height };
        const bottomPipeRect = { x: pipe.x, y: pipe.bottom.y, width: pipe.width, height: pipe.bottom.height };
        
        // Check for collisions with pipes
        if (checkCollision(mario, topPipeRect) || checkCollision(mario, bottomPipeRect)) {
            gameEnd();
        }
        
        // Check if mario passed the pipe
        if (!pipe.passed && mario.x > pipe.x + pipe.width) {
            pipe.passed = true;
            score++;
            updateScore();
            scoreSoundContext = window.gameSounds.score();
        }
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (backgroundSprite.complete) {
        // Tiled background drawing for seamless scrolling (optional but nice)
        const bgWidth = backgroundSprite.width;
        const numTiles = Math.ceil(canvas.width / bgWidth) + 1; // Draw one extra tile
        let xOffset = -(Date.now() * 0.05 % bgWidth); // Slow horizontal scroll
        for (let i = 0; i < numTiles; i++) {
            ctx.drawImage(backgroundSprite, xOffset + i * bgWidth, 0, bgWidth, canvas.height);
        }
    } else {
        ctx.fillStyle = '#6b8cff'; // Fallback sky blue background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw pipes
    for (const pipe of pipes) {
        if (pipeTopSprite.complete) {
            ctx.drawImage(pipeTopSprite, pipe.x, pipe.top.y, pipe.width, pipe.top.height);
        }
        if (pipeBottomSprite.complete) {
            ctx.drawImage(pipeBottomSprite, pipe.x, pipe.bottom.y, pipe.width, pipe.bottom.height);
        }
    }

    // Draw ground
    if (groundSprite.complete) {
        // Tiled ground drawing
        const groundWidth = groundSprite.width;
        const numGroundTiles = Math.ceil(canvas.width / groundWidth) + 1;
        // Make ground scroll faster than pipes
        let groundXOffset = -(Date.now() * PIPE_SPEED * 0.05 % groundWidth);
        for (let i = 0; i < numGroundTiles; i++) {
            ctx.drawImage(groundSprite, groundXOffset + i * groundWidth, ground.y, groundWidth, GROUND_HEIGHT);
        }
    } else {
        // Fallback ground colors
        ctx.fillStyle = '#C84C0C'; // Brown ground
        ctx.fillRect(0, ground.y, canvas.width, GROUND_HEIGHT);
        ctx.fillStyle = '#00A800'; // Green grass
        ctx.fillRect(0, ground.y, canvas.width, 15);
    }

    // Draw mario with rotation
    if (marioSprite.complete) { // Ensure image is loaded
        ctx.save(); // Save current context state
        // Translate context to the center of mario
        ctx.translate(mario.x + mario.width / 2, mario.y);
        // Rotate the context
        ctx.rotate(mario.rotation);
        // Draw the image centered on the new origin
        ctx.drawImage(marioSprite, -mario.width / 2, -mario.height / 2, mario.width, mario.height);
        ctx.restore(); // Restore context state
    } else {
        // Fallback or placeholder if image not loaded yet
        ctx.fillRect(mario.x, mario.y - mario.height / 2, mario.width, mario.height); // Adjust fallback drawing position
    }
}

// Spawn a new pipe
function spawnPipe() {
    const pipeWidth = 80;
    const minHeight = 50;
    const maxHeight = canvas.height - PIPE_GAP - minHeight - GROUND_HEIGHT;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    const bottomY = topHeight + PIPE_GAP;
    
    pipes.push({
        x: canvas.width,
        width: pipeWidth,
        top: {
            y: 0,
            height: topHeight,
            width: pipeWidth
        },
        bottom: {
            y: bottomY,
            height: canvas.height - bottomY,
            width: pipeWidth
        },
        passed: false
    });
}

// Check collision between two rectangles (adjusted slightly for rotated mario)
function checkCollision(marioRect, pipeRect) {
    // Note: Simple AABB collision doesn't account for rotation.
    // For true pixel-perfect or rotated rectangle collision, more complex logic is needed.
    // This implementation remains AABB for simplicity, using mario's unrotated bounding box.
    // We use mario.y - mario.height / 2 as the top coordinate due to the center-based rendering.
    const marioTop = marioRect.y - marioRect.height / 2;
    const marioBottom = marioRect.y + marioRect.height / 2;
    const marioLeft = marioRect.x;
    const marioRight = marioRect.x + marioRect.width;

    return (
        marioLeft < pipeRect.x + pipeRect.width &&
        marioRight > pipeRect.x &&
        marioTop < pipeRect.y + pipeRect.height &&
        marioBottom > pipeRect.y
    );
}

// End the game
function gameEnd() {
    gameOver = true;
    hitSoundContext = window.gameSounds.hit();
    setTimeout(() => {
        gameOverSoundContext = window.gameSounds.gameOver();
    }, 500);
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyMarioHighScore', highScore);
    }
    
    // Show game over screen
    finalScoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;
    // gameContainer.classList.add('game-is-over'); // Removed - CSS effect removed
    gameOverScreen.classList.add('visible'); // Use classList
}

// Update score display
function updateScore() {
    scoreDisplay.textContent = score;
}

// Input handlers
function handleKeyDown(e) {
    if (e.code === 'Space') {
        if (!gameStarted) {
            startGame();
        } else if (!gameOver) {
            mario.isFlapping = true;
        } else {
            resetGame();
        }
    }
}

function handleKeyUp(e) {
    // Nothing needed here for now
}

function handleTouchStart(e) {
    e.preventDefault();
    if (!gameStarted) {
        startGame();
    } else if (!gameOver) {
        mario.isFlapping = true;
    } else {
        resetGame();
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    // Nothing needed here for now
}

function handleMouseDown(e) {
    if (!gameStarted) {
        startGame();
    } else if (!gameOver) {
        mario.isFlapping = true;
    } else {
        resetGame();
    }
}

function handleMouseUp(e) {
    // Nothing needed here for now
}

// Initialize the game when the page loads
window.addEventListener('load', init);
