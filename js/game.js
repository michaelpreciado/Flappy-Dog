// Main game file for Flappy Mario
// This file handles the game initialization, loop, and core mechanics

// Game constants
const GRAVITY = 0.5;
const FLAP_FORCE = -10;
const PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 1500; // milliseconds
const PIPE_GAP = 180;
const GROUND_HEIGHT = 80;
const MARIO_WIDTH = 40;
const MARIO_HEIGHT = 40;

// Game variables
let canvas, ctx;
let selectedCharacter = 'taz'; // Default character
const characterAssets = {
    taz: 'assets/images/taz.png',
    chloe: 'assets/images/chloe.png'
};

let mario = {
    x: 80,
    y: 300,
    width: MARIO_WIDTH,
    height: MARIO_HEIGHT,
    velocity: 0,
    isFlapping: false
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
    
    // Initial render
    render();
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
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameContainer.classList.remove('game-is-over');
    score = 0;
    updateScore();
    
    // Reset mario position
    mario.y = 300;
    mario.velocity = 0;
    
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
    
    // Update mario
    mario.velocity += GRAVITY;
    
    if (mario.isFlapping) {
        mario.velocity = FLAP_FORCE;
        mario.isFlapping = false;
        flapSoundContext = window.gameSounds.flap();
    }
    
    mario.y += mario.velocity;
    
    // Check for collisions with ground
    if (mario.y + mario.height > ground.y) {
        mario.y = ground.y - mario.height;
        gameEnd();
    }
    
    // Check for collisions with ceiling
    if (mario.y < 0) {
        mario.y = 0;
        mario.velocity = 0;
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
    ctx.fillStyle = '#6b8cff'; // Sky blue background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw pipes
    for (const pipe of pipes) {
        // Top pipe
        ctx.fillStyle = '#75CF00'; // Green pipe color
        ctx.fillRect(pipe.x, pipe.top.y, pipe.width, pipe.top.height);
        
        // Pipe cap
        ctx.fillStyle = '#75CF00'; // Slightly darker green for pipe cap
        ctx.fillRect(pipe.x - 5, pipe.top.y + pipe.top.height - 20, pipe.width + 10, 20);
        
        // Bottom pipe
        ctx.fillStyle = '#75CF00'; // Green pipe color
        ctx.fillRect(pipe.x, pipe.bottom.y, pipe.width, pipe.bottom.height);
        
        // Pipe cap
        ctx.fillStyle = '#75CF00'; // Slightly darker green for pipe cap
        ctx.fillRect(pipe.x - 5, pipe.bottom.y, pipe.width + 10, 20);
    }
    
    // Draw ground
    ctx.fillStyle = '#C84C0C'; // Brown ground
    ctx.fillRect(0, ground.y, canvas.width, GROUND_HEIGHT);
    
    // Draw grass on ground
    ctx.fillStyle = '#00A800'; // Green grass
    ctx.fillRect(0, ground.y, canvas.width, 15);
    
    // Draw mario
    if (marioSprite.complete) { // Ensure image is loaded
        ctx.drawImage(marioSprite, mario.x, mario.y, mario.width, mario.height);
    } else {
        // Fallback or placeholder if image not loaded yet
        ctx.fillRect(mario.x, mario.y, mario.width, mario.height);
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
    gameContainer.classList.add('game-is-over');
    gameOverScreen.style.display = 'flex';
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
