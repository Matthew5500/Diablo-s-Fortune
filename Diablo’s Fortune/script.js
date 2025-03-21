// Standard symbols for normal spins
console.log("Script loaded successfully");
const symbols = ['🍒','🍋','🍉','🍇','🍊','🍓','🔔','⭐'];
const HELL_THRESHOLD = 5;
let consecutiveLosses = 0;

// Game statistics
let initialBalance = null;
let currentBalance = null;
let totalPlayed = 0;
let totalWon = 0;
let totalLost = 0;
let gamesPlayed = 0;
let wins = 0;
let losses = 0;
let isSpinning = false;

/**
 * Normalizes a symbol to remove variation selectors, etc.
 */
function normalizeSymbol(str) {
  return str.normalize("NFKD").replace(/[\uFE00-\uFE0F]/g, "").trim();
}

/**
 * Checks the grid for horizontal, vertical, and diagonal lines of 3 matching symbols.
 */
function checkWins(grid) {
  let winCount = 0;
  // Horizontal
  for (let r = 0; r < 3; r++) {
    const base = r * 3;
    if (grid[base] && grid[base] === grid[base + 1] && grid[base] === grid[base + 2]) {
      winCount++;
    }
  }
  // Vertical
  for (let c = 0; c < 3; c++) {
    if (grid[c] && grid[c] === grid[c + 3] && grid[c] === grid[c + 6]) {
      winCount++;
    }
  }
  // Main diagonal
  if (grid[0] && grid[0] === grid[4] && grid[0] === grid[8]) winCount++;
  // Anti-diagonal
  if (grid[2] && grid[2] === grid[4] && grid[2] === grid[6]) winCount++;
  return winCount;
}

// SOUND EFFECTS SETUP
const sounds = {
  spinClick: new Audio("sounds/spin_click.mp3"),
  reelSpin: new Audio("sounds/reel_spin.mp3"),
  reelStop: new Audio("sounds/reel_stop.mp3"),
  win: new Audio("sounds/win.mp3"),
  lose: new Audio("sounds/lose.mp3"),
  hellActivate: new Audio("sounds/hell_activate.mp3"),
  hellWin: new Audio("sounds/hell_win.mp3"),
  hellLose: new Audio("sounds/hell_lose.mp3"),
  bgMusic: new Audio("sounds/bg_music.mp3")
};
sounds.bgMusic.loop = true;
sounds.bgMusic.volume = 0.5;
document.body.addEventListener("click", function startMusic() {
  sounds.bgMusic.play().catch(e => console.warn("BG music play failed:", e));
  document.body.removeEventListener("click", startMusic);
});

function playSound(sound) {
  if (sound) {
    sound.currentTime = 0;
    sound.play();
  }
}

function stopSound(sound) {
  if (sound && !sound.paused) {
    sound.pause();
    sound.currentTime = 0;
  }
}

function updateLog() {
  const net = currentBalance - initialBalance;
  document.getElementById('log').innerHTML = `
    <p>Initial Balance: $${initialBalance}</p>
    <p>Total Played: $${totalPlayed}</p>
    <p>Total Won: <span class="win">$${totalWon}</span></p>
    <p>Total Lost: <span class="lose">$${totalLost}</span></p>
    <p>Net Gain/Loss: ${
      net >= 0
        ? '<span class="win">+$' + net + '</span>'
        : '<span class="lose">-$' + Math.abs(net) + '</span>'
    }</p>
    <p>Current Balance: $${currentBalance}</p>
    <p>Games Played: ${gamesPlayed} | Wins: ${wins} | Losses: ${losses}</p>
  `;
  document.getElementById('balance').value = currentBalance;
}

function updateProgress() {
  const progress = Math.min(100, (consecutiveLosses / HELL_THRESHOLD) * 100);
  document.getElementById('hscProgress').style.width = progress + '%';
}

function toggleLog() {
  const logDiv = document.getElementById('log');
  const toggleBtn = document.querySelector('.toggle-log-btn');
  if (logDiv.style.display === 'none' || logDiv.style.display === '') {
    logDiv.style.display = 'block';
    toggleBtn.textContent = 'Hide Log';
  } else {
    logDiv.style.display = 'none';
    toggleBtn.textContent = 'Show Log';
  }
}

function spinSlots() {
  console.log("spinSlots() called");
  const balanceInput = document.getElementById('balance');
  const betInput = document.getElementById('betAmount');
  const multiplierSelect = document.getElementById('multiplier');
  const messageEl = document.getElementById('message');

  if (isSpinning) {
    console.warn("spinSlots() aborted: already spinning");
    messageEl.textContent = 'Slots are already spinning!';
    messageEl.style.color = 'red';
    return;
  }

  playSound(sounds.spinClick);

  if (initialBalance === null) {
    initialBalance = parseFloat(balanceInput.value);
    currentBalance = initialBalance;
    console.log("Initial balance set to:", initialBalance);
    balanceInput.disabled = true;
  }

  const bet = parseFloat(betInput.value);
  const multiplier = parseFloat(multiplierSelect.value);
  console.log(`User bet: ${bet}, multiplier: x${multiplier}`);

  if (bet > currentBalance) {
    console.error("Insufficient Balance!");
    messageEl.textContent = 'Insufficient Balance!';
    messageEl.style.color = 'red';
    return;
  }

  gamesPlayed++;
  console.log(`gamesPlayed incremented to: ${gamesPlayed}`);

  let specialMechanic = false;
  if (consecutiveLosses >= HELL_THRESHOLD) {
    console.log('Special Mechanic available; consecutive losses = ' + consecutiveLosses);
    if (
      confirm(
        "Hell's Seventh Chance is available! Do you want to engage it? Click OK to engage or Cancel to play normally."
      )
    ) {
      specialMechanic = true;
      console.log("User accepted Hell's Seventh Chance");
      playSound(sounds.hellActivate);
    } else {
      console.log("User declined Hell's Seventh Chance");
    }
  }

  currentBalance -= bet;
  totalPlayed += bet;
  isSpinning = true;
  messageEl.textContent = '';
  messageEl.style.color = '';

  const slots = document.querySelectorAll('.slot');
  slots.forEach(slot => {
    slot.classList.remove('win', 'lose');
    slot.classList.add('default');
  });

  if (specialMechanic) {
    console.log("Calling performSeventhChance()...");
    performSeventhChance(bet, multiplier);
    return;
  }

  console.log("Performing normal spin...");
  playSound(sounds.reelSpin);
  let spinsCompleted = 0;
  slots.forEach(slot => {
    const count = 20 + Math.floor(Math.random() * 10);
    let i = 0;
    const interval = setInterval(() => {
      slot.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      slot.style.boxShadow = `0 0 15px hsl(${Math.random() * 360}, 100%, 50%)`;
      i++;
      if (i >= count) {
        clearInterval(interval);
        playSound(sounds.reelStop);
        spinsCompleted++;
        if (spinsCompleted === slots.length) {
          stopSound(sounds.reelSpin);
          console.log("All normal spins complete. Evaluating result...");
          evaluateResult(bet, multiplier);
        }
      }
    }, 100);
  });
}

function evaluateResult(bet, multiplier) {
  console.log("evaluateResult() called");
  const slots = document.querySelectorAll('.slot');
  const grid = Array.from(slots, slot => normalizeSymbol(slot.textContent));
  console.log("Grid symbols (normal spin):", grid);
  const winCount = checkWins(grid);
  console.log("winCount:", winCount);
  const messageEl = document.getElementById('message');

  if (winCount === 0) {
    playSound(sounds.lose);
    messageEl.textContent = 'You lost';
    messageEl.style.color = 'red';
    const lossAmount = bet * multiplier;
    totalLost += lossAmount;
    currentBalance -= (lossAmount - bet);
    losses++;
    slots.forEach(slot => slot.classList.add('lose'));
    consecutiveLosses++;
  } else {
    playSound(sounds.win);
    const winText = winCount === 1 ? 'You won' : winCount === 2 ? 'DOUBLE WIN' : 'TRIPLE WIN';
    messageEl.textContent = winText;
    messageEl.style.color = 'green';
    const winAmount = bet * multiplier * winCount;
    totalWon += winAmount;
    currentBalance += winAmount;
    wins++;
    slots.forEach(slot => slot.classList.add('win'));
    consecutiveLosses = 0;
  }

  updateProgress();
  updateLog();
  isSpinning = false;
}

function performSeventhChance(bet, multiplier) {
  console.log("performSeventhChance() called with bet:", bet, "multiplier:", multiplier);
  const messageEl = document.getElementById('message');
  messageEl.textContent = "Hell's Seventh Chance Activated!";
  messageEl.style.color = 'orange';
  const specialSymbols = ['7', '♦️', '♠️'];
  const slots = document.querySelectorAll('.slot');
  let spinsCompleted = 0;
  playSound(sounds.reelSpin);
  slots.forEach(slot => {
    const count = 20 + Math.floor(Math.random() * 10);
    let i = 0;
    const interval = setInterval(() => {
      slot.textContent = specialSymbols[Math.floor(Math.random() * specialSymbols.length)];
      slot.style.boxShadow = '0 0 15px #FFD700';
      i++;
      if (i >= count) {
        clearInterval(interval);
        playSound(sounds.reelStop);
        spinsCompleted++;
        if (spinsCompleted === slots.length) {
          stopSound(sounds.reelSpin);
          console.log("All special spins complete. Evaluating special result...");
          evaluateSpecialResult(bet, multiplier);
        }
      }
    }, 100);
  });
}

function evaluateSpecialResult(bet, multiplier) {
  console.log("evaluateSpecialResult() called");
  const messageEl = document.getElementById('message');
  const slots = document.querySelectorAll('.slot');
  const grid = Array.from(slots, slot => normalizeSymbol(slot.textContent));
  console.log("Grid symbols (Hell's 7th spin):", grid);
  const winCount = checkWins(grid);
  console.log("winCount (special):", winCount);

  if (winCount > 0) {
    // Play both the regular win sound and hell_win sound together
    playSound(sounds.hellWin);
    playSound(sounds.win);
    const winAmount = bet * multiplier * winCount * 7;
    totalWon += winAmount;
    currentBalance += winAmount;
    messageEl.textContent =
      "Hell's Seventh Chance: Win! " +
      (winCount === 1 ? 'You won' : winCount === 2 ? 'DOUBLE WIN' : 'TRIPLE WIN');
    messageEl.style.color = 'green';
    wins++;
    slots.forEach(slot => slot.classList.add('win'));
  } else {
    playSound(sounds.hellLose);
    messageEl.textContent = "Hell's Seventh Chance: Unlucky! You lost extra!";
    messageEl.style.color = 'red';
    const extraPenalty = bet * 6;
    currentBalance -= extraPenalty;
    totalLost += bet * 7;
    losses++;
    slots.forEach(slot => slot.classList.add('lose'));
  }

  updateProgress();
  updateLog();
  consecutiveLosses = 0;
  isSpinning = false;
}

/* ===== SOUND MENU CODE ===== */
function toggleSoundMenu() {
  const menu = document.getElementById('sound-menu');
  menu.classList.toggle('expanded');
}

function switchBackgroundMusic(track) {
  restoreSounds();
  stopSound(sounds.bgMusic);
  if (track === "bg1") {
    sounds.bgMusic = new Audio("sounds/bg1.mp3");
  } else if (track === "bg2") {
    sounds.bgMusic = new Audio("sounds/bg2.mp3");
  } else if (track === "bg3") {
    sounds.bgMusic = new Audio("sounds/bg3.mp3");
  } else if (track === "default") {
    sounds.bgMusic = new Audio("sounds/bg_music.mp3");
  }
  sounds.bgMusic.loop = true;
  sounds.bgMusic.volume = document.getElementById('volumeSlider').value;
  playSound(sounds.bgMusic);
}

function musicOff() {
  sounds.bgMusic.muted = !sounds.bgMusic.muted;
}

function allSoundsOff() {
  const currentMute = sounds.spinClick.muted;
  for (let key in sounds) {
    if (sounds.hasOwnProperty(key)) {
      sounds[key].muted = !currentMute;
    }
  }
}

function restoreSounds() {
  for (let key in sounds) {
    if (sounds.hasOwnProperty(key)) {
      sounds[key].muted = false;
    }
  }
}

/* Set up sound menu interactions */
document.getElementById('sound-menu').addEventListener('click', function(e) {
  toggleSoundMenu();
});

document.querySelectorAll('#sound-menu .menu-option').forEach(option => {
  option.addEventListener('click', function(e) {
    e.stopPropagation();
    const bgOption = this.getAttribute('data-bg');
    const allOption = this.getAttribute('data-all');
    if (bgOption) {
      if (bgOption === "off") {
        musicOff();
      } else {
        switchBackgroundMusic(bgOption);
      }
    } else if (allOption) {
      if (allOption === "off") {
        allSoundsOff();
      }
    }
    toggleSoundMenu();
  });
});

document.getElementById('volumeSlider').addEventListener('input', function(e) {
  const volume = e.target.value;
  sounds.bgMusic.volume = volume;
});

/* ===== GENERIC UI CLICK SOUND ===== */
document.addEventListener("DOMContentLoaded", () => {
  const uiElements = document.querySelectorAll("button:not(.spin-btn), select, .menu-option, .toggle-log-btn");
  uiElements.forEach(el => {
    el.addEventListener("click", () => {
      playSound(sounds.spinClick);
    });
  });
});