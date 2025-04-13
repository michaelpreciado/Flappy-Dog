import * as THREE from 'three';

// Game constants (adjust as needed for 3D)
const GRAVITY = 0.01; // Adjusted for 3D space/scale - Reduced from 0.015
const FLAP_FORCE = -0.5; // Adjusted for 3D space/scale
const PIPE_SPEED = 0.05; // Adjusted for 3D space/scale
const PIPE_SPAWN_INTERVAL = 1500; // milliseconds
const PIPE_GAP = 4; // Gap size in 3D units
const GROUND_Y_POSITION = -5; // Y position for the ground plane
const DOG_START_X = 0;
const DOG_START_Y = 0;
const DOG_SIZE = 1.0; // Size of the dog object
const HITBOX_PADDING = 0.3; // Padding for collision detection. Increased from 0.1 for less sensitivity.

// Three.js variables
let scene, camera, renderer;
let dogObject; // Will hold the 3D representation of the dog
let pipes = [];
let groundPlane;
let ambientLight, directionalLight;
let textureLoader; // Texture loader instance
let characterTextures = {}; // Store loaded textures

// Game state variables (similar to 2D version)
let selectedCharacter = 'taz'; // Default character
const characterAssets = {
    taz: 'assets/images/8bit taz.png',
    chloe: 'assets/images/8 bit chloe.png'
};
let dog = {
    x: DOG_START_X,
    y: DOG_START_Y,
    z: 0,
    velocity: 0,
    isFlapping: false
};

let score = 0;
let highScore = 0;
let gameStarted = false;
let gameOver = false;
let lastPipeSpawn = 0;
let animationFrameId;
let isTransitioning = false; // Flag to prevent multiple starts during delay
const RESTART_DELAY = 500; // Delay in milliseconds

// --- Frame Rate Control ---
let lastTime = 0;
let elapsedTime = 0;
const targetFPS = 30;
const targetFrameDuration = 1000 / targetFPS;

// Sound contexts (reuse from sounds.js)
let flapSoundContext, scoreSoundContext, hitSoundContext, gameOverSoundContext;

// DOM elements
let gameContainer, startScreen, gameOverScreen, scoreDisplay, finalScoreDisplay, highScoreDisplay, leaderboardList;

// Leaderboard settings (reuse from 2D version)
const LEADERBOARD_SIZE = 5;
const LEADERBOARD_KEY = 'flappyDogGlobalLeaderboard'; // Keep same key for consistency?
const DEVICE_RECORD_KEY = 'flappyDogDeviceRecord';

// Initialize the 3D game environment
function init() {
    console.log("init: Initializing game...");
    // Get DOM elements (same as 2D version)
    gameContainer = document.querySelector('.game-container');
    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over');
    scoreDisplay = document.getElementById('score');
    finalScoreDisplay = document.getElementById('final-score');
    highScoreDisplay = document.getElementById('high-score');
    leaderboardList = document.getElementById('leaderboard-list');

    // --- Three.js Setup ---
    scene = new THREE.Scene();

    // Camera (Perspective)
    const aspect = gameContainer.clientWidth / gameContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 10; // Move camera back to see the scene
    // camera.position.y = 2; // Slightly elevated view

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Alpha for transparent background if needed
    renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.id = 'game-canvas-3d'; // Assign ID for potential styling
    gameContainer.appendChild(renderer.domElement);

    // --- Texture Loader ---
    textureLoader = new THREE.TextureLoader();

    // --- Pre-load Character Textures ---
    console.log("init: Pre-loading character textures...");
    textureLoader.load(characterAssets.taz, (texture) => {
        console.log("init: Taz texture loaded.");
        texture.magFilter = THREE.NearestFilter; // Pixelated look
        texture.minFilter = THREE.NearestFilter;
        characterTextures.taz = texture;
        // Set the initial dog texture once taz is loaded
        if (selectedCharacter === 'taz' && dogObject && !dogObject.material.map) {
             console.log("init: Setting initial texture to Taz.");
            dogObject.material.map = characterTextures.taz;
            dogObject.material.needsUpdate = true;
        }
    });
    textureLoader.load(characterAssets.chloe, (texture) => {
        console.log("init: Chloe texture loaded.");
        texture.magFilter = THREE.NearestFilter; // Pixelated look
        texture.minFilter = THREE.NearestFilter;
        characterTextures.chloe = texture;
         // Set the initial dog texture once chloe is loaded (if chloe is selected)
        if (selectedCharacter === 'chloe' && dogObject && !dogObject.material.map) {
            console.log("init: Setting initial texture to Chloe.");
            dogObject.material.map = characterTextures.chloe;
            dogObject.material.needsUpdate = true;
        }
    });

    // Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft white light
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // --- Game Objects ---

    // Dog (Sprite with Texture)
    // Create material first, map will be set by loader callback
    const dogMaterial = new THREE.SpriteMaterial({ transparent: true, map: null }); // Start with null map
    dogObject = new THREE.Sprite(dogMaterial);
    dogObject.scale.set(DOG_SIZE * 1.5, DOG_SIZE * 1.5, 1); // Adjust scale for sprite size
    dogObject.position.set(dog.x, dog.y, dog.z);
    console.log(`init: Creating dog sprite at (${dog.x}, ${dog.y}, ${dog.z})`);
    scene.add(dogObject);

    // Ground (Placeholder: Plane)
    const groundGeometry = new THREE.PlaneGeometry(30, 10); // Wider than view
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, side: THREE.DoubleSide }); // Green plane
    groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    groundPlane.position.y = GROUND_Y_POSITION;
    scene.add(groundPlane);

    // --- UI and Event Listeners (Adapt from 2D) ---
    setupUIAndListeners();

    // Load high score (same as 2D)
    const savedHighScore = localStorage.getItem('flappyMarioHighScore'); // Or a new key?
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
    }

    console.log("init: Three.js setup complete.");
    console.log("init: Initialization complete. Rendering initial scene.");
    render(); // Start the rendering loop (renders static scene until gameLoop starts)
}

// Function to handle UI elements and event listeners
function setupUIAndListeners() {
    console.log("setupUIAndListeners: Setting up UI and listeners...");
    // Character selection listeners
    const charOptions = document.querySelectorAll('.char-option');
    if (!charOptions.length) console.warn("setupUIAndListeners: No character options found!");
    charOptions.forEach(option => {
        option.addEventListener('click', () => {
            const newlySelectedCharacter = option.dataset.char;
             // Only update if the character actually changes
            if (newlySelectedCharacter !== selectedCharacter) {
                selectedCharacter = newlySelectedCharacter;
                console.log("Character selected:", selectedCharacter);

                // Update 3D model/texture
                if (characterTextures[selectedCharacter]) {
                    console.log(`Updating dog texture to ${selectedCharacter}`);
                    dogObject.material.map = characterTextures[selectedCharacter];
                    dogObject.material.needsUpdate = true;
                } else {
                    console.warn(`Texture for ${selectedCharacter} not loaded yet.`);
                    // Optionally set to null or a default placeholder if load failed
                    // dogObject.material.map = null; // Or some default texture
                    // dogObject.material.needsUpdate = true;
                }

                charOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            } // end if character changed
        });
    });
    // Set initial selection visually
    const initialChar = document.querySelector(`.char-option[data-char='${selectedCharacter}']`);
    if (initialChar) initialChar.classList.add('selected');
    else console.warn("setupUIAndListeners: Initial character element not found!");

    // Button listeners
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    if (startButton) {
        startButton.addEventListener('click', handleInputStart);
        console.log("setupUIAndListeners: Start button listener attached.");
    } else {
        console.error("setupUIAndListeners: Start button not found!");
    }
    if (restartButton) {
        restartButton.addEventListener('click', resetGame);
        console.log("setupUIAndListeners: Restart button listener attached.");
    } else {
        console.error("setupUIAndListeners: Restart button not found!");
    }

    // Input handlers (adapt for 3D if necessary, but logic is similar)
    window.addEventListener('keydown', handleInputStart);
    gameContainer.addEventListener('touchstart', handleInputStart, { passive: false });
    gameContainer.addEventListener('mousedown', handleInputStart);
    console.log("setupUIAndListeners: Global input listeners attached.");
    
    // Optional: Add listeners for input end if needed later
    // window.addEventListener('keyup', handleInputEnd);
    // gameContainer.addEventListener('touchend', handleInputEnd, { passive: false });
    // gameContainer.addEventListener('mouseup', handleInputEnd);
}


// Start the game
function startGame() {
    console.log("startGame: Starting game...");
    gameStarted = true;
    gameOver = false;
    // TODO: Load actual character model/texture
    // startScreen.style.display = 'none'; // Handled by input handler now
    gameOverScreen.style.display = 'none';
    gameContainer.classList.remove('game-is-over');
    score = 0;
    updateScoreDisplay();

    // Reset dog state
    dog.y = DOG_START_Y;
    dog.velocity = 0;
    dogObject.position.set(dog.x, dog.y, dog.z);

    // Clear pipes
    pipes.forEach(pipePair => {
        scene.remove(pipePair.top);
        scene.remove(pipePair.bottom);
    });
    pipes = [];
    lastPipeSpawn = Date.now(); // Reset spawn timer

    // --- Reset Frame Rate Timer ---
    lastTime = 0;
    elapsedTime = 0;

    // Start game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    console.log("startGame: Starting game loop.");
    // Directly call gameLoop, it will request the next frame
    gameLoop(performance.now()); // Pass initial timestamp
}

// Reset the game
function resetGame() {
    // Similar to startGame, could potentially be merged
    startGame();
}

// Game loop (Three.js style)
function gameLoop(currentTime) { // Pass currentTime from requestAnimationFrame
    // Request the next frame immediately. Pass the callback function.
    animationFrameId = requestAnimationFrame(gameLoop);

    // Initialize lastTime on the first frame or after reset
    if (!lastTime) {
        lastTime = currentTime;
    }

    // Calculate time elapsed since the last processed frame
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Accumulate elapsed time
    elapsedTime += deltaTime;

    // Update and render only if enough time has passed for the target frame rate
    if (elapsedTime >= targetFrameDuration) {
        if (!gameOver && gameStarted) { // Check gameStarted as well
            update(); // Update game logic
        }
        render(); // Render the scene

        // Subtract the fixed frame duration from the accumulator
        // This helps maintain a consistent update rate even if frames fluctuate
        elapsedTime -= targetFrameDuration;

        // Optional: Clamp elapsed time to prevent spiral of death if updates lag severely
        // elapsedTime = Math.min(elapsedTime, targetFrameDuration * 5); // e.g., max 5 frames behind
    }

    // Note: rendering happens conditionally based on targetFrameDuration
}

// Update game state for 3D
function update() {
    if (!gameStarted || gameOver) return;

    // Update dog physics
    dog.velocity += GRAVITY;
    if (dog.isFlapping) {
        dog.velocity = FLAP_FORCE;
        dog.isFlapping = false;
        // flapSoundContext = window.gameSounds.flap(); // Re-enable sounds later
    }
    dog.y += dog.velocity;
    dogObject.position.y = dog.y;

    // Check for collisions with ground
    if (dog.y - DOG_SIZE / 2 < GROUND_Y_POSITION) {
        dog.y = GROUND_Y_POSITION + DOG_SIZE / 2;
        dogObject.position.y = dog.y;
        gameEnd();
        return; // Stop update if game ended
    }

    // Check for collisions with ceiling (adjust based on camera/scene setup)
    // const ceilingY = camera.position.y + 5; // Example ceiling
    // if (dog.y + DOG_SIZE / 2 > ceilingY) {
    //     dog.y = ceilingY - DOG_SIZE / 2;
    //     dog.velocity = 0;
    //     dogObject.position.y = dog.y;
    // }

    // Spawn pipes
    const currentTime = Date.now();
    if (currentTime - lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
        spawnPipe();
        lastPipeSpawn = currentTime;
    }

    // Update pipes
    const dogBox = new THREE.Box3().setFromObject(dogObject);
    dogBox.expandByScalar(-HITBOX_PADDING); // Slightly smaller hitbox

    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipePair = pipes[i];
        pipePair.top.position.x -= PIPE_SPEED;
        pipePair.bottom.position.x -= PIPE_SPEED;

        // Check if pipe is off screen (left side)
        if (pipePair.top.position.x + pipePair.width / 2 < camera.position.x - camera.far / 4) { // Heuristic check
            scene.remove(pipePair.top);
            scene.remove(pipePair.bottom);
            pipes.splice(i, 1);
            continue;
        }

        // Collision check
        const topPipeBox = new THREE.Box3().setFromObject(pipePair.top);
        const bottomPipeBox = new THREE.Box3().setFromObject(pipePair.bottom);

        if (dogBox.intersectsBox(topPipeBox) || dogBox.intersectsBox(bottomPipeBox)) {
            gameEnd();
            return; // Stop update if game ended
        }

        // Check for passing pipe
        if (!pipePair.passed && dogObject.position.x > pipePair.top.position.x + pipePair.width / 2) {
            pipePair.passed = true;
            score++;
            updateScoreDisplay();
            // scoreSoundContext = window.gameSounds.score(); // Re-enable sounds later
        }
    }
}

// Render the scene
function render() {
    renderer.render(scene, camera);
}

// Spawn a new pair of pipes (3D version)
function spawnPipe() {
    const pipeWidth = 1.5;
    const pipeHeight = 10; // Total height, adjust as needed
    const minTopY = GROUND_Y_POSITION + PIPE_GAP / 2 + 1; // Min height for bottom pipe's top edge
    const maxTopY = 5; // Max height for top pipe's bottom edge (adjust based on scene)

    const topPipeBottomY = THREE.MathUtils.randFloat(minTopY, maxTopY);
    const bottomPipeTopY = topPipeBottomY - PIPE_GAP;

    const pipeGeometry = new THREE.BoxGeometry(pipeWidth, pipeHeight, pipeWidth);
    // Simple green material for now
    const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x00cc00 });

    const topPipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
    const bottomPipe = new THREE.Mesh(pipeGeometry, pipeMaterial);

    const spawnX = camera.position.x + 15; // Spawn ahead of the camera view

    // Position top pipe (anchor point is center)
    topPipe.position.set(
        spawnX,
        topPipeBottomY + pipeHeight / 2, // Center Y position
        0
    );

    // Position bottom pipe (anchor point is center)
    bottomPipe.position.set(
        spawnX,
        bottomPipeTopY - pipeHeight / 2, // Center Y position
        0
    );

    scene.add(topPipe);
    scene.add(bottomPipe);

    pipes.push({ top: topPipe, bottom: bottomPipe, passed: false, width: pipeWidth });
}

// Load leaderboard (reusing 2D function structure)
function getLeaderboard() {
    const leaderboardJSON = localStorage.getItem(LEADERBOARD_KEY);
    const leaderboard = leaderboardJSON ? JSON.parse(leaderboardJSON) : [];
    return leaderboard.map((entry, index) => ({ ...entry, id: entry.id || `legacy_${index}` }));
}

function saveLeaderboard(leaderboard) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

function getDeviceRecord() {
    const recordJSON = localStorage.getItem(DEVICE_RECORD_KEY);
    return recordJSON ? JSON.parse(recordJSON) : { score: -1, name: '', id: null };
}

function saveDeviceRecord(record) {
    localStorage.setItem(DEVICE_RECORD_KEY, JSON.stringify(record));
}

function updateLeaderboard(newScore) {
    const globalLeaderboard = getLeaderboard();
    let deviceRecord = getDeviceRecord();
    if (newScore > deviceRecord.score) {
        let playerName;
        const isNewDeviceEntry = deviceRecord.id === null;
        if (isNewDeviceEntry) {
            playerName = prompt(`High score! Enter name (Score: ${newScore}):`, "Player") || "Anonymous";
            deviceRecord.id = 'device_' + Date.now() + Math.random().toString(16).substring(2, 8);
        } else {
            playerName = prompt(`New device high score! Update name? (Score: ${newScore}):`, deviceRecord.name) || deviceRecord.name;
        }
        deviceRecord.score = newScore;
        deviceRecord.name = playerName.substring(0, 15);
        saveDeviceRecord(deviceRecord);
        const filteredLeaderboard = globalLeaderboard.filter(entry => entry.id !== deviceRecord.id);
        filteredLeaderboard.push({ id: deviceRecord.id, name: deviceRecord.name, score: deviceRecord.score });
        filteredLeaderboard.sort((a, b) => b.score - a.score);
        const finalLeaderboard = filteredLeaderboard.slice(0, LEADERBOARD_SIZE);
        saveLeaderboard(finalLeaderboard);
    }
}

function displayLeaderboard() {
    const leaderboard = getLeaderboard();
    leaderboardList.innerHTML = '';
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<li>No scores yet!</li>';
        return;
    }
    leaderboard.forEach((entry, index) => {
        const li = document.createElement('li');
        li.textContent = `#${index + 1} ${entry.name} - ${entry.score}`;
        leaderboardList.appendChild(li);
    });
}

// End the game (3D version)
function gameEnd() {
    gameOver = true;
    gameStarted = false; // Prevent further updates
    // hitSoundContext = window.gameSounds.hit(); // Re-enable sounds later
    // setTimeout(() => {
    //     gameOverSoundContext = window.gameSounds.gameOver();
    // }, 500);

    // Update high score (personal)
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyMarioHighScore', highScore); // Use same key
    }

    updateLeaderboard(score);
    displayLeaderboard();

    // Show game over screen
    finalScoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;
    gameContainer.classList.add('game-is-over'); // Reuse CSS class for visual effect
    gameOverScreen.style.display = 'flex';

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// Update score display UI
function updateScoreDisplay() {
    scoreDisplay.textContent = score;
}

// Input handling
function handleInputStart(e) {
    console.log(`handleInputStart: Input detected (type: ${e.type}, target: ${e.target.id || e.target.tagName})`);
    if (e.type.includes('touch')) {
        e.preventDefault(); // Prevent default touch behavior like scrolling
    }

    // Prevent actions if already transitioning (starting/restarting)
    if (isTransitioning) {
        console.log("handleInputStart: Ignoring input, already transitioning.");
        return;
    }

    console.log(`handleInputStart: Current state - gameStarted: ${gameStarted}, gameOver: ${gameOver}`);

    if (!gameStarted && !gameOver) {
        console.log("handleInputStart: Initiating startGame() with delay...");
        isTransitioning = true;
        // Hide start screen immediately for responsiveness, but delay game logic
        startScreen.style.display = 'none';
        setTimeout(() => {
            startGame();
            isTransitioning = false; // Allow input again after game starts
        }, RESTART_DELAY);
    } else if (gameStarted && !gameOver) {
        console.log("handleInputStart: Setting dog.isFlapping = true");
        dog.isFlapping = true; // Flap should be immediate
    } else if (gameOver) {
        console.log("handleInputStart: Initiating resetGame() with delay...");
        isTransitioning = true;
        // Hide game over screen immediately, but delay game logic
        gameOverScreen.style.display = 'none';
        setTimeout(() => {
            resetGame();
            isTransitioning = false; // Allow input again after game restarts
        }, RESTART_DELAY);
    }
}

function handleInputEnd(e) {
    if (e.type.includes('touch')) {
        e.preventDefault();
    }
    // No specific action needed on key/mouse up for flap mechanic
    // dog.isFlapping = false; // Resetting here might cancel a flap intended by a quick tap
}

// Resize handler
function onWindowResize() {
    if (!renderer || !camera || !gameContainer) return;

    const width = gameContainer.clientWidth;
    const height = gameContainer.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

// --- Initialization ---
window.addEventListener('load', init);
window.addEventListener('resize', onWindowResize); 