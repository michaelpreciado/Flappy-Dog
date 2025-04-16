// Main game file for Flappy Mario
// This file handles the game initialization, loop, and core mechanics

// Game constants
const GRAVITY = 0.45;
const FLAP_FORCE = -11;
const PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 1500; // milliseconds
const PIPE_GAP = 160;
const GROUND_HEIGHT = 80;
const MARIO_WIDTH = 40;
const MARIO_HEIGHT = 40;
const DEVICE_ID_KEY = 'flappyDogDeviceIdentifier';
const NETLIFY_FUNCTIONS_PATH = '/.netlify/functions/'; // Adjust if using a custom path

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
let localHighScore = 0; // Renamed from highScore to avoid confusion
let gameStarted = false;
let gameOver = false;
let lastPipeSpawn = 0;
let animationFrameId;
let deviceId = null; // Will be set in init

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
let gameContainer, startScreen, gameOverScreen, scoreDisplay, finalScoreDisplay, localHighScoreDisplay; // Renamed highScoreDisplay
let globalLeaderboardListStart, globalLeaderboardListGameOver; // New leaderboard elements

// Input handlers (Moved BEFORE init)
function handleKeyDown(e) {
    if (e.code === 'Space') {
        console.log(`handleKeyDown: Space detected. State: gameStarted=${gameStarted}, gameOver=${gameOver}`);
        if (!gameStarted && !gameOver) { // Simplified condition
            if (areAssetsLoaded()) {
                startGame();
            } else {
                console.warn("Assets not fully loaded yet, cannot start game via keydown.");
            }
        } else if (gameStarted && !gameOver) {
            mario.isFlapping = true;
        } else if (gameOver) {
            resetGame();
        }
    }
}

function handleKeyUp(e) {
    // Nothing needed here for now
}

function handleTouchStart(e) {
    e.preventDefault();
    console.log(`handleTouchStart: Touch detected. State: gameStarted=${gameStarted}, gameOver=${gameOver}`);
    if (!gameStarted && !gameOver) {
        if (areAssetsLoaded()) {
            startGame();
        } else {
            console.warn("Assets not fully loaded yet, cannot start game via touch.");
        }
    } else if (gameStarted && !gameOver) {
        mario.isFlapping = true;
    } else if (gameOver) {
        resetGame();
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    // Nothing needed here for now
}

function handleMouseDown(e) {
    // Start button handled separately
    if (e.target === canvas) {
        console.log(`handleMouseDown: Canvas mouse down. State: gameStarted=${gameStarted}, gameOver=${gameOver}`);
        if (!gameStarted && !gameOver) {
            if (areAssetsLoaded()) {
                startGame();
            } else {
                 console.warn("Assets not fully loaded yet, cannot start game via mouse down.");
            }
        } else if (gameStarted && !gameOver) {
            mario.isFlapping = true;
        } else if (gameOver) {
            resetGame();
        }
    }
}

function handleMouseUp(e) {
    // Nothing needed here for now
}

// Helper function to check if core assets are loaded
function areAssetsLoaded() {
    return (
        marioSprite.complete && marioSprite.naturalHeight !== 0 &&
        pipeTopSprite.complete && pipeTopSprite.naturalHeight !== 0 &&
        pipeBottomSprite.complete && pipeBottomSprite.naturalHeight !== 0 &&
        backgroundSprite.complete && backgroundSprite.naturalHeight !== 0 &&
        groundSprite.complete && groundSprite.naturalHeight !== 0
    );
}

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
    localHighScoreDisplay = document.getElementById('high-score'); // Updated ID reference
    globalLeaderboardListStart = document.getElementById('global-leaderboard-list-start');
    globalLeaderboardListGameOver = document.getElementById('global-leaderboard-list-gameover');
    
    // Set canvas dimensions
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    
    // Ground position
    ground.y = canvas.height - GROUND_HEIGHT;
    
    // Get Device ID
    deviceId = getOrCreateDeviceId();
    console.log('Using Device ID:', deviceId);
    
    // Load local high score
    const savedLocalHighScore = localStorage.getItem('flappyMarioHighScore');
    if (savedLocalHighScore) {
        localHighScore = parseInt(savedLocalHighScore);
        localHighScoreDisplay.textContent = localHighScore;
    }
    
    // Fetch global leaderboard initially
    fetchGlobalLeaderboard();
    
    // Load assets
    loadAssets();
    
    // Character selection listeners
    const charOptions = document.querySelectorAll('.char-option');
    charOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (!gameStarted) { // Only allow changing character when game is not running
                selectedCharacter = option.dataset.char;
                marioSprite.src = characterAssets[selectedCharacter];
                charOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            }
        });
    });
    // Set initial selection visually
    document.querySelector(`.char-option[data-char='${selectedCharacter}']`).classList.add('selected');
    
    // Event listeners
    document.getElementById('start-button').addEventListener('click', () => {
        if (areAssetsLoaded()) {
            startGame();
        } else {
            console.warn("Assets not loaded, cannot start game via button.");
            // Optionally disable button until assets load
        }
    });
    document.getElementById('restart-button').addEventListener('click', resetGame);
    
    // Input handlers
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    gameContainer.addEventListener('mousedown', handleMouseDown); // Use gameContainer for broader click area

    // Show start screen initially
    startScreen.classList.add('visible');
    gameOverScreen.classList.remove('visible'); // Ensure game over is hidden
    
    // Initial render (optional, might not be needed if canvas is behind start screen)
    // render(); 
}

// Load game assets
function loadAssets() {
    let assetsToLoad = 5; // Keep track of assets
    let assetsLoaded = 0;

    function assetLoaded() {
        assetsLoaded++;
        // console.log(`Assets loaded: ${assetsLoaded}/${assetsToLoad}`);
        if (assetsLoaded === assetsToLoad) {
            console.log("All core assets loaded.");
            // Consider enabling start button here if it was initially disabled
            // document.getElementById('start-button').disabled = false;
        }
    }

    function assetError(e) {
        console.error(`Error loading asset: ${e.target.src}`);
        // Display error to user?
    }

    // Set asset paths and add load/error handlers
    marioSprite.onload = assetLoaded;
    marioSprite.onerror = assetError;
    marioSprite.src = characterAssets[selectedCharacter];

    pipeTopSprite.onload = assetLoaded;
    pipeTopSprite.onerror = assetError;
    pipeTopSprite.src = 'assets/images/pipe-top.png';

    pipeBottomSprite.onload = assetLoaded;
    pipeBottomSprite.onerror = assetError;
    pipeBottomSprite.src = 'assets/images/pipe-bottom.png';

    backgroundSprite.onload = assetLoaded;
    backgroundSprite.onerror = assetError;
    backgroundSprite.src = 'assets/images/background.png';

    groundSprite.onload = assetLoaded;
    groundSprite.onerror = assetError;
    groundSprite.src = 'assets/images/ground.png';

    // Sound functions are loaded from sounds.js
    // No need to preload as they're generated on demand
}

// Start the game
function startGame() {
    if (!areAssetsLoaded()) {
        console.error("Attempted to start game, but assets are not loaded.");
        return;
    }
    if (gameStarted) return; // Prevent multiple starts

    console.log("Starting game...");
    gameStarted = true;
    gameOver = false;
    marioSprite.src = characterAssets[selectedCharacter];
    startScreen.classList.remove('visible');
    gameOverScreen.classList.remove('visible');
    score = 0;
    updateScoreDisplay(); // Changed function name

    mario.y = canvas.height / 2 - MARIO_HEIGHT / 2; // Start in middle
    mario.velocity = 0;
    mario.isFlapping = false;

    pipes = [];
    lastPipeSpawn = 0;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}

// Reset the game
function resetGame() {
    // Don't need to check assets again if resetting from game over
    console.log("Resetting game...");
    startGame();
}

// Game loop
function gameLoop() {
    update();
    render();
    
    if (!gameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
        animationFrameId = null; // Clear ID when game stops
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
        if (window.gameSounds) flapSoundContext = window.gameSounds.flap();
    }
    
    mario.y += mario.velocity;
    
    // Check for collisions with ground
    if (mario.y + mario.height > ground.y) {
        mario.y = ground.y - mario.height;
        gameEnd();
        return; // Stop update processing
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
            return; // Stop update processing
        }
        
        // Check if mario passed the pipe
        if (!pipe.passed && mario.x > pipe.x + pipe.width) {
            pipe.passed = true;
            score++;
            updateScoreDisplay(); // Changed function name
            if (window.gameSounds) scoreSoundContext = window.gameSounds.score();
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
    const minHeight = 60; // Adjusted min height
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
            height: canvas.height - bottomY - GROUND_HEIGHT, // Adjust bottom pipe height
            width: pipeWidth
        },
        passed: false
    });
}

// Check collision between two rectangles
function checkCollision(rect1, rect2) {
    // Add slight padding for fairness/feel
    const padding = 2;
    return (
        rect1.x < rect2.x + rect2.width - padding &&
        rect1.x + rect1.width > rect2.x + padding &&
        rect1.y < rect2.y + rect2.height - padding &&
        rect1.y + rect1.height > rect2.y + padding
    );
}

// End the game
async function gameEnd() { // Made async to await score submission
    console.log(`gameEnd called. Current state: gameOver=${gameOver}, gameStarted=${gameStarted}, score=${score}`);
    if (gameOver) {
        console.log('gameEnd: Already game over, returning.');
        return; // Prevent multiple calls
    }
    gameOver = true;
    gameStarted = false;
    if (window.gameSounds) hitSoundContext = window.gameSounds.hit();
    setTimeout(() => {
        if (window.gameSounds) gameOverSoundContext = window.gameSounds.gameOver();
    }, 500);
    
    // Stop the game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Update local high score first
    if (score > localHighScore) {
        localHighScore = score;
        localStorage.setItem('flappyMarioHighScore', localHighScore);
    }

    // Submit score to global leaderboard (and potentially prompt for name)
    const submissionResult = await submitScoreToGlobalLeaderboard(score);

    // Fetch and display the updated leaderboard *after* submission attempt
    await fetchGlobalLeaderboard();

    // Show game over screen
    finalScoreDisplay.textContent = score;
    localHighScoreDisplay.textContent = localHighScore; // Display updated local high score
    gameOverScreen.classList.add('visible');
    startScreen.classList.remove('visible'); // Ensure start screen is hidden

    console.log('Game ended. Final score:', score, 'Local High Score:', localHighScore);
}

// Update score display
function updateScoreDisplay() {
    scoreDisplay.textContent = score;
}

// Helper function to get or create a device ID
function getOrCreateDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        // Simple UUID generation (not strictly RFC4122 compliant but good enough)
        id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem(DEVICE_ID_KEY, id);
        console.log('Generated new device ID:', id);
    }
    return id;
}

// Leaderboard functions
async function fetchGlobalLeaderboard() {
    const listElements = [globalLeaderboardListStart, globalLeaderboardListGameOver];
    listElements.forEach(el => {
        if (el) el.innerHTML = '<li class="loading">Loading scores...</li>';
    });

    try {
        const response = await fetch(`${NETLIFY_FUNCTIONS_PATH}get-leaderboard`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const leaderboardData = await response.json();
        console.log('Fetched global leaderboard:', leaderboardData);
        displayGlobalLeaderboard(leaderboardData);
    } catch (error) {
        console.error('Error fetching global leaderboard:', error);
        listElements.forEach(el => {
            if (el) el.innerHTML = '<li class="error">Could not load scores.</li>';
        });
    }
}

function displayGlobalLeaderboard(leaderboardData) {
    const listElements = [globalLeaderboardListStart, globalLeaderboardListGameOver];

    listElements.forEach(listElement => {
        if (!listElement) return;
        listElement.innerHTML = ''; // Clear previous entries

        if (!leaderboardData || leaderboardData.length === 0) {
            listElement.innerHTML = '<li>No global scores yet!</li>';
            return;
        }

        leaderboardData.forEach((entry, index) => {
            const li = document.createElement('li');
            // Basic sanitization display-side (server should handle robustly)
            const safeNickname = entry.nickname.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            li.textContent = `#${index + 1} ${safeNickname} - ${entry.score}`;
            listElement.appendChild(li);
        });
    });
}

async function submitScoreToGlobalLeaderboard(newScore) {
    if (!deviceId) {
        console.error('Device ID not available, cannot submit score.');
        return null; // Indicate failure
    }

    // Only prompt if the score is potentially a high score (local or global)
    // We don't know the global high score here, so prompt if it beats local
    let nickname = localStorage.getItem('flappyDogPlayerNickname') || '';
    if (newScore > localHighScore || !nickname) {
        nickname = prompt(`High score! Enter nickname (3-12 chars):`, nickname) || 'Anonymous';
        nickname = nickname.trim().substring(0, 12); // Client-side trim/length limit
        if (nickname.length < 3) nickname = 'Anonymous'; // Enforce min length client-side too
        localStorage.setItem('flappyDogPlayerNickname', nickname);
    }

    console.log(`Submitting score: ${newScore}, Nickname: ${nickname}, DeviceID: ${deviceId}`);

    try {
        const response = await fetch(`${NETLIFY_FUNCTIONS_PATH}submit-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ score: newScore, nickname: nickname, deviceId: deviceId }),
        });

        const result = await response.json(); // Always try to parse JSON

        if (!response.ok) {
            console.error('Error submitting score:', result.error || `HTTP status ${response.status}`);
            alert(`Error submitting score: ${result.error || 'Please try again later.'}`);
            return null; // Indicate failure
        }

        console.log('Score submission result:', result);
        // Optionally update local high score based on server response if needed
        // if (result.deviceHighScore && result.deviceHighScore > localHighScore) {
        //     localHighScore = result.deviceHighScore;
        //     localStorage.setItem('flappyMarioHighScore', localHighScore);
        //     localHighScoreDisplay.textContent = localHighScore;
        // }
        return result; // Return the success result
    } catch (error) {
        console.error('Network or parsing error submitting score:', error);
        alert('Could not submit score due to a network error.');
        return null; // Indicate failure
    }
}

// Initialize the game when the page loads
window.addEventListener('load', init);
