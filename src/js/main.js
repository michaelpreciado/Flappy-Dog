// Import main CSS
import '../assets/styles/style.css';
// Import Logo
import logoUrl from '../assets/images/flappy-dog.png';

// Import game modules
import { init as initGame } from './game'; // Import init function, renaming to avoid potential conflicts
import './sounds';      // Import sounds to register window.gameSounds
import './leaderboard'; // Import leaderboard to register functions

// Initialize the game once the window loads
window.addEventListener('load', () => {
  // Check if initGame is a function before calling
  if (typeof initGame === 'function') {
    initGame();
  } else {
    console.error('Game initialization function (init) not found or not exported correctly from game.js');
    // Optionally display an error to the user in the DOM
    document.body.innerHTML = '<p style="color: red; padding: 20px;">Error loading game assets. Please try refreshing.</p>';
  }

  // Set logo image source after DOM is potentially ready
  const logoImg = document.getElementById('start-logo');
  if (logoImg) {
      logoImg.src = logoUrl;
  } else {
      console.warn('Logo image element not found');
  }
}); 