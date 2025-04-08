const LEADERBOARD_KEY = 'flappyDogLocalLeaderboard';
const MAX_LEADERBOARD_ENTRIES = 5;

// --- Leaderboard Data Handling ---

// Function to get the leaderboard from localStorage
function getLeaderboard() {
    const leaderboardJSON = localStorage.getItem(LEADERBOARD_KEY);
    try {
        const leaderboard = leaderboardJSON ? JSON.parse(leaderboardJSON) : [];
        // Ensure it's always an array
        return Array.isArray(leaderboard) ? leaderboard : [];
    } catch (error) {
        console.error("Error parsing leaderboard data:", error);
        return []; // Return empty array on error
    }
}

// Function to save the leaderboard to localStorage
function saveLeaderboard(leaderboard) {
    try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch (error) {
        console.error("Error saving leaderboard data:", error);
    }
}

// Function to add a score to the leaderboard
function addScoreToLeaderboard(name, score) {
    const leaderboard = getLeaderboard();
    
    // Add the new score
    leaderboard.push({ name, score });
    
    // Sort the leaderboard by score (highest first)
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only the top scores
    const updatedLeaderboard = leaderboard.slice(0, MAX_LEADERBOARD_ENTRIES);
    
    saveLeaderboard(updatedLeaderboard);
    
    return updatedLeaderboard; // Return the updated list
}

// --- UI Handling ---

// Function to display the leaderboard in the table
function displayLeaderboard() {
    const leaderboard = getLeaderboard();
    const leaderboardBody = document.getElementById('leaderboard-body');
    
    if (!leaderboardBody) {
        console.error("Leaderboard table body not found!");
        return;
    }
    
    // Clear previous entries
    leaderboardBody.innerHTML = '';
    
    if (leaderboard.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No scores yet!</td></tr>';
    } else {
        leaderboard.forEach((entry, index) => {
            const row = leaderboardBody.insertRow();
            
            const rankCell = row.insertCell();
            rankCell.textContent = index + 1;
            
            const nameCell = row.insertCell();
            nameCell.textContent = entry.name;
            
            const scoreCell = row.insertCell();
            scoreCell.textContent = entry.score;
        });
    }
}

// Function to check if a score qualifies for the leaderboard
function isHighScore(score) {
    if (score <= 0) return false; // Don't add scores of 0 or less
    const leaderboard = getLeaderboard();
    // Qualifies if the board isn't full OR the score is higher than the lowest score on the board
    return leaderboard.length < MAX_LEADERBOARD_ENTRIES || score > (leaderboard[leaderboard.length - 1]?.score ?? 0);
}

// --- Nickname Modal Handling ---

let currentScoreForSubmission = 0;

// Function to show the nickname modal
function showNicknameModal(score) {
    const modal = document.getElementById('nickname-modal');
    const input = document.getElementById('nickname-input');
    const submitButton = document.getElementById('submit-score-button');

    if (!modal || !input || !submitButton) {
        console.error("Nickname modal elements not found!");
        return;
    }

    currentScoreForSubmission = score;
    input.value = ''; // Clear previous input
    modal.style.display = 'flex'; // Show the modal
    input.focus(); // Focus the input field

    // Add event listener for the submit button (remove previous if any)
    // Using a temporary function to handle removal properly
    const handleSubmit = () => {
        const nickname = input.value.trim() || 'Anonymous';
        addScoreToLeaderboard(nickname, currentScoreForSubmission);
        displayLeaderboard(); // Update display immediately
        modal.style.display = 'none'; // Hide modal
        // Clean up listener if needed, although button click inherently finishes
    };
    
    // Ensure we don't attach multiple listeners
    submitButton.onclick = handleSubmit; // Simple assignment, replaces previous
}

// --- Initial Load ---

// Display the leaderboard when the script loads (e.g., on page load or game init)
// This assumes the leaderboard table is already in the DOM
// displayLeaderboard(); // We'll call this from game.js after DOM is ready 