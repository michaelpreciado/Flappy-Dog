// --- Game Constants ---
const LOGICAL_WIDTH = 540; // Fixed logical width
const LOGICAL_HEIGHT = 960; // Fixed logical height

const PLAYER_START_X = LOGICAL_WIDTH * 0.2; // Position player relative to screen width
const PLAYER_START_Y = LOGICAL_HEIGHT / 2;
const PLAYER_GRAVITY = 1000;
const PLAYER_FLAP_VELOCITY = -400; // Keep this negative
const PLAYER_ANGLE_UP = -20;
// const PLAYER_ANGLE_DOWN = 20;
// const PLAYER_TINT_ON_DEATH = 0xff0000; // Red tint

// --- Pipe/Obstacle Constants --- 
const PIPE_SPAWN_DELAY = 1800; // Milliseconds - Increased from 1500
const PIPE_VELOCITY_X = -150; // Pixels/second - Slowed down from -200
const PIPE_GAP_VERTICAL = 320; // Vertical gap between pipes - Increased
const PIPE_HORIZONTAL_MARGIN = 75; // Min distance from top/bottom edge for the gap center (relative to LOGICAL_HEIGHT)

// Placeholder Graphics Details - Removed Player constants
// const PLAYER_WIDTH = 40;
// const PLAYER_HEIGHT = 30;
// const PLAYER_COLOR = 0xffff00; // Yellow

// --- Mario Style Colors ---
const MARIO_SKY_BLUE = '#5c94fc';
const MARIO_GROUND_BROWN = 0xac743c;
const MARIO_GROUND_GREEN = 0x00a800;
// const MARIO_PIPE_GREEN = 0x00e800;
// const MARIO_PIPE_SHADING = 0x00a800; // Darker green for shading
// const MARIO_PIPE_RIM = 0x80ff80; // Lighter green for rim
// --- End Mario Style Colors ---

const PIPE_WIDTH = 120; // Make pipes wider to resemble Mario pipes
// const PIPE_HEIGHT = GAME_HEIGHT; // Pipes should be able to span the screen height
// const PIPE_COLOR = 0x00cc00; // Slightly different green

const SCORE_TEXT_STYLE = { fontSize: '32px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 4 };
const INFO_TEXT_STYLE = { fontSize: '36px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5, align: 'center' };
const TITLE_TEXT_STYLE = { fontSize: '54px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 6, align: 'center' };

// Texture Keys
// Removed DOG_TEXTURE_KEY as keys will come from the characters array
// const PIPE_TEXTURE_KEY = 'pipeTexture'; // Key for the generated pipe graphic
const FENCE_TEXTURE_KEY = 'fenceObstacle'; // Key for the fence image
// --- End Game Constants ---

// --- Character Selection ---
const characters = [
    // *** Update paths if your filenames are different ***
    { key: 'taz', name: 'Taz', path: 'assets/characters/taz.png' }, // Assuming taz.png is the Corgi
    { key: 'chloe', name: 'Chloe', path: 'assets/characters/shih_tzu.png' } // Update path for Chloe
    // Add more characters here if needed
];
let currentCharacterIndex = 0; // Default to the first character
let characterSelected = false; // Flag to track if a character has been chosen
// --- End Character Selection ---

const config = {
    type: Phaser.WEBGL, // Explicitly prefer WebGL for performance
    canvas: document.getElementById('game-canvas'), // Optional: If you add an explicit canvas element
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: LOGICAL_WIDTH, // Use logical constant
        height: LOGICAL_HEIGHT // Use logical constant
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: PLAYER_GRAVITY }, // Use constant
            debug: false,
            // Disable world bounds collision checks if player death is handled solely by y-position
            // checkCollision: { up: true, down: true, left: false, right: false } // Example
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    render: {
        antialias: false, // Disable antialiasing for potential perf gain & crisp pixels
        pixelArt: false // Set to true if using pixel art assets
    }
};

const game = new Phaser.Game(config);

// Scene Variables
let player;
let pipes;
let score = 0;
let scoreText;
let highscore = localStorage.getItem('flappyDogHighscore') || 0; // Load highscore
let highscoreText;
let gameOver = false;
let gameStarted = false; // Flag for ready state
let startText; // Re-using this for "Tap to Flap"
let menuTexts = []; // To hold menu text objects
let menuTitleText; // Variable to hold the title text
let gameOverTexts = {}; // Object to hold game over text elements

function preload() {
    // --- Load Character Images ---
    characters.forEach(character => {
        this.load.image(character.key, character.path);
    });
    // --- End Load Character Images ---

    // --- Remove loading external pipe/fence image ---
    // this.load.image(PIPE_TEXTURE_KEY, 'assets/images/fence.png');
    // --- End Remove Loading ---

    // --- [EDIT] Remove Mario-Style Pipe Placeholder Generation ---
    // graphics = this.add.graphics(); // Use existing 'graphics' or redeclare if needed
    // const PIPE_BODY_HEIGHT = GAME_HEIGHT; // Use full height for texture
    // const PIPE_RIM_HEIGHT = 20;
    // const PIPE_SHADING_WIDTH = 10;
    //
    // // Main pipe body
    // graphics.fillStyle(MARIO_PIPE_GREEN, 1);
    // graphics.fillRect(0, 0, PIPE_WIDTH, PIPE_BODY_HEIGHT);
    //
    // // Simple shading (darker rectangle on the left)
    // graphics.fillStyle(MARIO_PIPE_SHADING, 1);
    // graphics.fillRect(0, 0, PIPE_SHADING_WIDTH, PIPE_BODY_HEIGHT);
    //
    // // Pipe Rim (top part - light green rectangle)
    // graphics.fillStyle(MARIO_PIPE_RIM, 1);
    // graphics.fillRect(0, 0, PIPE_WIDTH, PIPE_RIM_HEIGHT);
    //
    // // Generate the texture (covers previous placeholder generation)
    // graphics.generateTexture(PIPE_TEXTURE_KEY, PIPE_WIDTH, PIPE_BODY_HEIGHT);
    // graphics.destroy();
    // --- End Placeholder Generation ---

    // --- [EDIT] Load Fence Image ---
    this.load.image(FENCE_TEXTURE_KEY, 'assets/images/fence_obstacle.png');
    // --- [EDIT] End Load Fence Image ---


    // --- Remove Obstacle Image Loading ---

    // --- Remove Pipe Placeholder Generation --- 
    // let graphics = this.add.graphics();
    // graphics.fillStyle(PIPE_COLOR, 1);
    // graphics.fillRect(0, 0, PIPE_WIDTH, PIPE_HEIGHT);
    // graphics.generateTexture(PIPE_TEXTURE_KEY, PIPE_WIDTH, PIPE_HEIGHT);
    // graphics.destroy();
    // --- End Remove Pipe Placeholder Generation ---
}

function create() {
    // Reset state variables
    gameOver = false;
    gameStarted = false;
    characterSelected = false; // Reset character selection flag
    score = 0;

    // Set background color (Mario Blue)
    this.cameras.main.setBackgroundColor(MARIO_SKY_BLUE);

    // Draw Mario-style ground
    const GROUND_HEIGHT = 60; // Total height
    const GROUND_TOP_HEIGHT = 15; // Height of the green top part
    const GROUND_BASE_HEIGHT = GROUND_HEIGHT - GROUND_TOP_HEIGHT;

    let groundGraphics = this.add.graphics();
    // Brown base
    groundGraphics.fillStyle(MARIO_GROUND_BROWN, 1);
    groundGraphics.fillRect(0, LOGICAL_HEIGHT - GROUND_HEIGHT, LOGICAL_WIDTH, GROUND_HEIGHT);
    // Green top
    groundGraphics.fillStyle(MARIO_GROUND_GREEN, 1);
    groundGraphics.fillRect(0, LOGICAL_HEIGHT - GROUND_HEIGHT, LOGICAL_WIDTH, GROUND_TOP_HEIGHT);

    groundGraphics.setDepth(-1); // Draw behind everything else

    // Player - Create but keep invisible initially
    // IMPORTANT: Ensure character images are reasonably sized to minimize scaling.
    // Large images scaled down consume more memory and GPU resources.
    player = this.physics.add.sprite(PLAYER_START_X, PLAYER_START_Y, characters[currentCharacterIndex].key);
    player.setCollideWorldBounds(true);
    player.body.setAllowGravity(false); // Don't fall until game starts
    player.setDepth(1); // Ensure player is above pipes
    player.setVisible(false); // Hide player until character is selected
    // *** Adjust scale as needed for your image size ***
    player.setScale(0.2); // Example scale factor, change 0.1 to suit your image

    // Pipe Group (Formerly Obstacles) - Setup for Pooling
    pipes = this.physics.add.group({
        defaultKey: FENCE_TEXTURE_KEY, // Use the loaded pipe texture key
        maxSize: 10, // Max number of pipe objects to keep in memory
        allowGravity: false,
        immovable: true,
        velocityX: PIPE_VELOCITY_X // Use pipe velocity
    });
    pipes.setDepth(0); // Ensure pipes are behind player

    // Score Text
    scoreText = this.add.text(16, 16, `Score: ${score}`, SCORE_TEXT_STYLE).setDepth(2);
    highscoreText = this.add.text(LOGICAL_WIDTH - 16, 16, `Best: ${highscore}`, SCORE_TEXT_STYLE).setOrigin(1, 0).setDepth(2);


    // --- Create Game Over Texts (Initially Hidden) ---
    gameOverTexts.title = this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 80, 'Game Over', TITLE_TEXT_STYLE)
        .setOrigin(0.5).setDepth(3).setVisible(false);
    gameOverTexts.finalScore = this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, '', INFO_TEXT_STYLE) // Text set in endGame
        .setOrigin(0.5).setDepth(3).setVisible(false);
    gameOverTexts.restart = this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 80, 'Tap to Restart', INFO_TEXT_STYLE)
        .setOrigin(0.5).setDepth(3).setVisible(false);
    // --- End Game Over Texts ---


    // --- Character Selection Menu ---
    menuTexts = []; // Clear previous menu items if any
    const menuStartY = LOGICAL_HEIGHT / 2 - 50;
    const menuSpacing = 80;

    // Store the title text object
    menuTitleText = this.add.text(LOGICAL_WIDTH / 2, menuStartY - menuSpacing, 'Choose Your Character:', INFO_TEXT_STYLE)
        .setOrigin(0.5)
        .setDepth(3);

    characters.forEach((character, index) => {
        const characterText = this.add.text(LOGICAL_WIDTH / 2, menuStartY + index * menuSpacing, character.name, TITLE_TEXT_STYLE)
            .setOrigin(0.5)
            .setDepth(3)
            .setInteractive({ useHandCursor: true }); // Make text clickable

        characterText.on('pointerdown', () => {
            selectCharacter.call(this, index); // Pass scene context and index
        });

        menuTexts.push(characterText); // Keep track to remove later
    });
    // --- End Character Selection Menu ---

    // Collision detection - will be enabled in startGame
    this.physics.add.collider(player, pipes, hitPipe, null, this);

    // Pipe Spawner Timer - will be started in startGame
    this.pipeSpawnTimer = this.time.addEvent({
        delay: PIPE_SPAWN_DELAY,
        callback: addPipeRow, // Renamed callback function back to pipes
        callbackScope: this,
        loop: true,
        paused: true // Start paused
    });

}

// New function to handle character selection
function selectCharacter(index) {
    if (characterSelected) return; // Prevent selecting again if already chosen

    characterSelected = true;
    currentCharacterIndex = index;

    // Remove menu texts AND the title
    if (menuTitleText) menuTitleText.destroy();
    menuTexts.forEach(text => text.destroy());
    menuTexts = [];
    menuTitleText = null; // Clear reference

    // Update player texture and make visible
    player.setTexture(characters[currentCharacterIndex].key);
    player.setVisible(true);
    player.setPosition(PLAYER_START_X, PLAYER_START_Y); // Ensure correct starting position
    // Apply scale again in case different characters need different scales later
    // IMPORTANT: Consider adding a 'scale' property to your characters array objects
    // if different characters require different scaling factors for optimal performance.
    player.setScale(0.2); // Re-apply or adjust scale based on character if needed

    // Display "Tap to Flap!" message
    startText = this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 'Tap to Flap!', TITLE_TEXT_STYLE)
        .setOrigin(0.5)
        .setDepth(3);

    // Add listeners to actually start the game now
    this.input.once('pointerdown', startGame, this);
    this.input.keyboard.once('keydown-SPACE', startGame, this);
}

function startGame() {
    // Ensure a character was selected and game hasn't started
    if (!characterSelected || gameStarted) return;

    gameStarted = true;
    startText.destroy(); // Remove "Tap to Start" text

    // Enable gravity and input for the player
    player.body.setAllowGravity(true);
    this.input.on('pointerdown', flap); // Use regular input handler now
    this.input.keyboard.on('keydown-SPACE', flap); // Use regular input handler now


    // Start the pipe spawner
    this.pipeSpawnTimer.paused = false;

    // Initial flap to avoid instant death
    flap();
}


function update(time, delta) {
    // Only run update logic if the game has started and is not over
    if (!gameStarted || gameOver) {
        // Keep player stationary before start if character is selected but game not started
        if (characterSelected && !gameStarted) {
            player.setVelocityY(0); // Prevent any slight movement
            player.y = PLAYER_START_Y; // Lock position
        }
        return;
    }

    // Rotate bird based on velocity
    if (player.body.velocity.y < 0) {
        player.setAngle(PLAYER_ANGLE_UP);
    } else {
        player.setAngle(0);
    }

    // Check if player is out of vertical bounds
    if (player.getBounds().bottom >= LOGICAL_HEIGHT || player.getBounds().top <= 0) {
        endGame(this);
    }

    // Obstacle Pooling and Scoring
    pipes.getChildren().forEach(obstacle => {
        // Deactivation check (Efficient)
        if (obstacle.active && obstacle.x < -PIPE_WIDTH) { // Check based on PIPE_WIDTH
            pipes.killAndHide(obstacle);
            obstacle.body.enable = false;
        }

        // Scoring check (Only check active, non-scored obstacles past player)
        if (obstacle.active && !obstacle.scored && obstacle.x < player.x) {
            // Score increases only once per pair (check if it's the top one)
            if (obstacle.originY === 1) { 
                score += 1;
                scoreText.setText('Score: ' + score);
                if (score > highscore) {
                    highscore = score;
                    highscoreText.setText('Best: ' + highscore);
                    localStorage.setItem('flappyDogHighscore', highscore); 
                }
                // Mark both pipes of the pair as scored.
                obstacle.scored = true; // Mark this one.
                // Find its pair efficiently: iterate again, but break once found.
                pipes.getChildren().forEach(otherObstacle => {
                    if (otherObstacle.active && otherObstacle !== obstacle && Math.abs(otherObstacle.x - obstacle.x) < 10) {
                        otherObstacle.scored = true;
                        // return false; // NOTE: Returning false from forEach doesn't break the loop reliably across browsers.
                        // A standard for loop or finding index might be needed for micro-optimization if this becomes a bottleneck.
                    }
                });
            }
            // If it wasn't the top pipe, ensure it still gets marked (as part of the pair)
            // This covers the case where the bottom pipe check happens first.
            else if(obstacle.originY === 0 && !obstacle.scored) {
                 pipes.getChildren().forEach(otherObstacle => {
                     if (otherObstacle.active && otherObstacle.originY === 1 && otherObstacle.scored && Math.abs(otherObstacle.x - obstacle.x) < 10) {
                         obstacle.scored = true;
                     }
                 });
            }
        }
    });
}

function flap() {
    if (gameOver || !gameStarted) return; // Can only flap if game is running
    player.setVelocityY(PLAYER_FLAP_VELOCITY);
}

function addPipeRow() {
    if (gameOver || !gameStarted) return; // Don't add pipes if game isn't running

    // Calculate center of the gap, ensuring margin from top/bottom
    const gapCenterY = Phaser.Math.Between(
        PIPE_HORIZONTAL_MARGIN + PIPE_GAP_VERTICAL / 2,
        LOGICAL_HEIGHT - PIPE_HORIZONTAL_MARGIN - PIPE_GAP_VERTICAL / 2 // Use LOGICAL_HEIGHT
    );

    const topPipeY = gapCenterY - PIPE_GAP_VERTICAL / 2;
    const bottomPipeY = gapCenterY + PIPE_GAP_VERTICAL / 2;

    // Add pipes using pooling
    addPipe(LOGICAL_WIDTH, topPipeY, true);  // Top Pipe - Spawn at right edge of logical width
    addPipe(LOGICAL_WIDTH, bottomPipeY, false); // Bottom Pipe - Spawn at right edge of logical width
}

function addPipe(x, y, isTopPipe) {
    // Get a deactivated pipe from the pool or create a new one
    const pipe = pipes.get(x, y, FENCE_TEXTURE_KEY); // Use pipe key

    if (pipe) {
        pipe.setActive(true);
        pipe.setVisible(true);
        pipe.body.enable = true; // Re-enable physics body
        pipe.setVelocityX(PIPE_VELOCITY_X); // Ensure velocity is set
        pipe.scored = false; // Reset scored flag

        // [EDIT] Remove flip logic, set origin to center
        pipe.setOrigin(0.5, 0.5); // Origin at center for fence
        // if (isTopPipe) {
        //     // pipe.setFlipY(true); // Removed
        //     // pipe.setOrigin(0, 1); // Removed
        // } else {
        //     // pipe.setFlipY(false); // Removed
        //     // pipe.setOrigin(0, 0); // Removed
        // }

         // You might need to adjust the PIPE_WIDTH constant and potentially scale the pipe
         // pipe.setScale(optional_scale_factor);
    }
}

function hitPipe(player, pipe) {
    endGame(this);
}

function endGame(scene) {
    if (gameOver) return; // Prevent multiple calls

    gameOver = true;
    gameStarted = false; // Reset game started flag
    scene.physics.pause(); // Stop physics simulation
    scene.pipeSpawnTimer.paused = true; // Stop spawning pipes

    // Remove flap listeners to prevent flapping after death
    scene.input.off('pointerdown', flap);
    scene.input.keyboard.off('keydown-SPACE', flap);


    // --- Display Game Over Texts --- 
    const finalScoreText = `Score: ${score}\nBest: ${highscore}`;
    gameOverTexts.title.setVisible(true);
    gameOverTexts.finalScore.setText(finalScoreText).setVisible(true);
    gameOverTexts.restart.setVisible(true);
    // --- End Display Game Over Texts ---

    // Restart logic - simplified
    const restartGame = () => {
        // Clean up listeners before restarting
        scene.input.off('pointerup', restartGame);
        scene.input.keyboard.off('keydown-SPACE', restartGame);

        scene.scene.restart(); // Restart the current scene
    };

    // Use 'pointerup' for restart to avoid accidental double-tap issues
    scene.input.once('pointerup', restartGame);
    scene.input.keyboard.once('keydown-SPACE', restartGame);
} 