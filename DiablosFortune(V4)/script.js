// ===========================================================================
// Project: Diablo's Fortune (Slot Machine Game Part of Diablo's Lounge)
// Module: script.js
// Description:
//   Contains the game logic for the Diablo's Fortune slot machine, including:
//     - 
//     -
//     -
// Purpose:
//   - To control game dynamics and interactivity.
//   - 
// Dependencies:
//   - DiablosFortune.html (for element references)
//   - style.css (for visual cues)
//   - Supabase library (for data management)
// Author: Matthew Pizzitola
// Last Updated: 03/20/2025
// ===========================================================================

//Check For Any Errors in The Script
console.log("Script Loaded Successfully");

//Slot Machine Symbols For Regular Spins 
const symbols = ['🍒','🍋','🍉','🍇','🍊','🍓','🔔','⭐'];

//Define The "Hell's Seventh Chance" Mechanic's Loss Amount Before Triggering it
const HELLS_THRESHOLD = 5; //Set Number of Losses to 5 
let consecutiveLosses = 0; //Keep Track of Loss Amount Before Triggering

//Define The Recoreded Game Statistics That Will be Displayed in The Log
let initialBalance = null;
let currentBalance = null;
let totalPlayed = 0;
let totalWon = 0;
let totalLost = 0;
let gamesPlayed = 0;
let wins = 0;
let losses = 0;
let isSpinning = false; //Flag to Ensure no Multiple Spins


//=====Utility Functions=====

/**
 * Normalize a Symbol.
 *
 * This function is responsible for "normalizing" a string to remove any hidden variations.
 * JavaScript's Built in ".normalize()" method along side "NFKD" is used to decompose the symbol.
 * The ".replace()" method removes any extra variation characters and the ".trim()" method removes any extra spaces. 
 * 
 */
function normalizeSymbol(str) {
    return str.normalize("NFKD").replace(/[\uFE00-\uFE0F]/g, "").trim();
}

/**
 * Check for Wins.
 *
 * This function takes the 3 x 3 slot grid and checks for wins horizontaly, verticaly, and diagonaly.
 * 
 */
function checkWins(grid) {
    
    //Set The Win Count to Zero 
    let winCount = 0;

    //Horizontal Win Check
    for (let r = 0; r < 3; r++) {
        const base = r * 3;
        if (grid[base] && grid[base] === grid[base + 1] && grid[base] === grid[base + 2]) {
            winCount++;    
        }
    }

    //Vertical Win Check
    for (let c = 0; c < 3; c++) {
        if (grid[c] && grid[c] === grid[c + 3] && grid[c] === grid[c + 6]) {
            winCount++;
        }
    }

    //Diagonal Win Check
    if (grid[0] && grid[0] === grid[4] && grid[0] === grid[8]) winCount++;

    //Reverse Diagonal Win Check
    if (grid[2] && grid[2] === grid[4] && grid[2] === grid[6]) winCount++;
    
    //Return The Win Count
    return winCount;
}


//=====Sound Effects Setup=====

//Audio Objects
const sounds = {
    click: new Audio("sounds/spin_click.mp3"), //Sound That Plays When Any Button is Clicked
    reelSpin: new Audio("sounds/reel_spin.mp3"), //Sound That Plays When The Slot Start Spinning
    reelStop: new Audio("sounds/reel_stop.mp3"), //Sound That Plays When The Slot Stops Spinning
    win: new Audio("sounds/win.mp3"), //Sound That Plays When The Player Wins
    lose: new Audio("sounds/lose.mp3"), //Sound That Plays When The Player Loses
    hellActivate: new Audio("sounds/hell_activate.mp3"), //Sound That Plays When The Player Enters The "Hell's Seventh Chance" State
    hellWin: new Audio("sounds/hell_win.mp3"), //Sound That Plays When The User Wins in The "Hell's Seventh Chance" State
    hellLose: new Audio("sounds/hell_lose.mp3"), //Sound That Plays When The User Loses in The "Hell's Seventh Chance" State
    bgMusic: new Audio("sounds/bg_music.mp3") //Default Site Background Music
};

//Set Background Music to Loop 
sounds.bgMusic.loop = true;

//Set Background Music Volume to 50%
sounds.bgMusic.volume = 0.5;

//Wait Until User Interaction to Start Background Music
document.body.addEventListener("click", function startMusic() {
    sounds.bgMusic.play().catch(e => console.warn("BG music play failed:", e));
    document.body.removeEventListener("click", startMusic); //Remove Event Listener so Music Isn't Triggered Again
});

/**
 * Play Sound Function.
 *
 * This function is responsible for resting a sound's playback to the beginning.
 * 
 */
function playSound(sound) {
    if(sound) {
        sound.currentTime = 0;
        sound.play();
    }
}

/**
 * Stop Sound Function.
 *
 * This function is responsible for resting a sound's playback to 0 Stoping it.
 * 
 */
function stopSound(sound) {
    if(sound && !sound.paused) {
        sound.pause();
        sound.currentTime = 0;
    }
}


//=====UI Update Functions=====

/**
 * Update Game Log Function.
 *
 * This function is responsible for updating the games statistic log and balance.
 * 
 */
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
    document.getElementById('balance').value = currentBalance; //Update The Balance
  }

/**
 * Updating the “Hell's Seventh Chance” Progress Bar.
 *
 * This function is responsible for calculating the progress precentage based upon the counted consecutive losses.
 * 
 */
function updateProgress() {
    const progress = Math.min(100, (consecutiveLosses / HELL_THRESHOLD) * 100);
    document.getElementById('hscProgress').style.width = progress + '%';
}

/**
 * Toggling the Game Log Display.
 *
 * This function is responsible for showing or hiding the statistics log when the user clicks the "Show Log" button.
 * 
 */
function toggleLog() {
    const logDiv = document.getElementById('log');
    const toggleBtn = document.querySelector('.toggle-log-btn');
    if (logDiv.style.display === 'none' || logDiv.style.display === '') {
        logDiv.style.display = 'block';
        toggleBtn.textContent = 'Hide Log';
    }
    else {
        logDiv.style.display = 'none';
        toggleBtn.textContent = 'Show Log';
    }
}


//=====Main Spin Functionality=====

/**
 * Starting a Spin.
 *
 * This function is responsible for retrieving references to several important UI elements when the spin button is called. 
 * 
 */
function spinSlots() {
    console.log("spinSlots() called"); //Update The Console to Check And Ensure The Fuction is Working
    const balanceInput = document.getElementById('balance');
    const betInput = document.getElementById('betAmount');
    const multiplierSelect = document.getElementById('multiplier');
    const messageEl = document.getElementById('message');


    //Check if The Slots Are Already Spining And Display an Error Message 
    if (isSpinning) {
        console.warn("spinSlots() aborted: already spinning");
        messageEl.textContent = 'Slots are already spinning!';
        messageEl.style.color = 'red';
        return;
    }

    //Play "click" Sound Effect When "Spin" Button is Pressed
    playSound(sounds.click);

    //Set The Initial And Current Balance Based on The Input Value
    if (initialBalance === null) {
        initialBalance = parseFloat(balanceInput.value);
        currentBalance = initialBalance;
        console.log("Initial balance set to:", initialBalance); //Update The Console To Check And Ensure That The Ititial Value is Set to The Current Input Value 
        balanceInput.disabled = true; //Disable to Prevent Further Changes
    }

    //Get And Convert The Bet Amount and Multiplier From The UI Into numbers
    const bet = parseFloat(betInput.value);
    const multiplier = parseFloat(multiplierSelect.value);
    console.log('User bet: ${bet}, multiplier: x${multiplier}'); //Update The Console With These Values 

    //Check if The Entered Bet is Greater Than The Current Balance
    if (bet > currentBalance) {
        console.error("Insufficient Balance!"); //Update The Console With An Error 
        messageEl.textContent = 'Insufficient Balance!';
        messageEl.style.color = 'red';
        return;
    }

    //Increment The Count of Games Played For Logging Purposes
    gamesPlayed++;
    console.log('gamesPlayed incremented to: ${gamesPlayed}') //Update The Console To Ensure That gamesPlayed Has Been Incremented After a Game Has Been Played

    //Special Pity Mechanic: "Hell’s Seventh Chance"
    let specialMechanic = false;
    if (consecutiveLosses >= HELLS_THRESHOLD) { //Ensure That The Player Has Lost Enough Times Before Prompting Them
        console.log('Special Mechanic available; consecutive losses = ' + consecutiveLosses); //Update The Console to Show Consecutive Losses And Confirm That "Hell’s Seventh Chance" is Avilable 
        if (
            confirm("Hell's Seventh Chance is available! Want to test your luck with SEVEN TIMES the win/loss rate with a smaller set of charcaters? Click OK to engage or Cancel to play normally.")
        ) {
        specialMechanic = true; //Set a Flag to True, Initating The Mechanic
        console.log("User has accepted Hell's Seventh Chance"); //Update the Console That The User Has Chosen to Enter Into The "Hell's Seventh Chance" State  
        playSound(sounds.hellActivate); //It's Show Time!
        }
        else {
            console.log("The user has declined Hell's Seventh Chance") //Update the Console That The User Has Chosen to Not Enter Into The "Hell's Seventh Chance" State  
        }
    }

    //Continuing With The Spin
    currentBalance -= bet; //Subtract The Bet Amount From The Current Balance 
    totalPlayed += bet; //Adds The Bet Amount to The Total Played For Logging
    isSpinning = true; //Set "isSpinning" to True 
    messageEl.textContent = '';
    messageEl.style.color = '';

    //Reset The Apperance of All Slot Elements
    const slots = document.querySelectorAll('.slot');
    slots.forEach(slot => {
        slot.classList.remove('win', 'lose');
        slot.classList.add('default');
    });

    //Call The "performSeventhChance" Function if The "Hell’s Seventh Chance" Mechanic Has Been Activated
    if(specialMechanic) {
        console.log("Calling performSeventhChance()..."); //Update The Console that The "performSeventhChance" Function is Being Called
        performSeventhChance(bet, multiplier);
        return;
    }

    //Performing a Normal Spin
    console.log("Performing normal spin..."); //Update The Console Log That a Normal Spin Has Started
    playSound(sounds.reelSpin); //Play The Reel Spining Sound Effect
    let spinsCompleted = 0; 
    slots.forEach(slot => {
    const count = 20 + Math.floor(Math.random() * 10); //Create a Random Spin Duration
    let i = 0;
    const interval = setInterval(() => {
        slot.textContent = symbols[Math.floor(Math.random() * symbols.length)]; //Randomly Change Slot's Symbol
        slot.style.boxShadow = `0 0 15px hsl(${Math.random() * 360}, 100%, 50%)`; //Randomly Change The Slot's Box Shadow Color 
        i++; //Increament The Counter Until it Reaches It's Predetermind Count
        if (i >= count) { //Check if The Count Has Been Reached
        clearInterval(interval); //Stop The Interval
        playSound(sounds.reelStop); //Play The Reel Stop Sound Effect 
        spinsCompleted++; //Increment The Number of Completed Spins 
        if (spinsCompleted === slots.length) { //Check if The Slots Have Finished Spinning
            stopSound(sounds.reelSpin); //Stop The Reel Spining Sound Effect
            console.log("All normal spins complete. Evaluating result..."); //Update The Console Log That a Normal Spin Has Completed
            evaluateResult(bet, multiplier); //Call The "evaluateResult" Function to Determin The Outcome of The Game 
        }
        }
    }, 100);
    });
}


//=====Evaluating the Result of a Normal Spin=====

/**
 * Create the "evaluateResult" function.
 *
 *  This function is responsible for gathering the final symbols from this games slots and then normalizes them for comparison.
 *  This function also uses "checkWins" to count the number of winning lines. 
 * 
 */
function evaluateResult(bet, multiplier) {
    console.log("evaluateResult() called"); //Update The Console Log That The Result Evaluation Has Started 
    const slots = document.querySelectorAll('.slot'); //Gather The Final Symbols From All The Slots
    const grid = Array.from(slots, slot => normalizeSymbol(slot.textContent)); //Normalize The Symbols For Comparison
    console.log("Grid symbols (normal spin):", grid); //Update the Console With The Games Currently Rolled Grid
    const winCount = checkWins(grid); //Count The Number of Winning Lines
    console.log("WinCount:", winCount); //Update The Console With The Win Count
    const messageEl = document.getElementById('message');

    //If There Are No Winning Lines 
    if (winCount === 0) {
        playSound(sounds.lose) //You Lose
        messageEl.textContent = 'You lost'; //Display a Loss Message in Red
        messageEl.style.color = 'red';
        const lossAmount = bet * multiplier; //Calculate The Loss
        totalLost += lossAmount; //Update The Total Lost With The Newly Calculated Amount
        currentBalance -= (lossAmount - bet); //Update The Current Balance
        lossess++; //Increment The Loss Counter
        slots.forEach(slot => slot.classList.add('lose')); //Update The Styling of The Slots to a Loss Effect
        consecutiveLosses++; //Increment The Loss Counter 
    }
    //If There Are Winning Lines
    else {
        playSound(sounds.win); //You Win
        const winText = winCount === 1 ? 'You won' : winCount === 2 ? 'DOUBLE WIN' : 'TRIPLE WIN'; //Display a Win Message Based On The Value of "winCount"
        messageEl.textContent = winText; 
        messageEl.style.color = 'green'; //Display The Message in Green
        const winAmount = bet * multiplier * winCount; //Calculate The Amount Won
        totalWon += winAmount; //Update The Total Amount Won
        currentBalance += winAmount; //Update The Current Balance 
        wins++; //Increment The Win Counter
        slots.forEach(slot => slot.classList.add('win')); //Update The Styling of The Slots to a Win Effect
        consecutiveLosses = 0; //Set The Consecutive Losses to 0, restarting the "Hell's Seventh Chance" mechanic
    }

    //Update The Progress Bar And Game Log 
    updateProgress(); 
    updateLog();
    isSpinning = false; //Set "isSpinning" to False so The User Can Spin Again
}


//=====Hell’s Seventh Chance=====

/**
 * Create the "evaluateResult" function.
 *
 *  This function is responsible for gathering the final symbols from this games slots and then normalizes them for comparison.
 *  This function also uses "checkWins" to count the number of winning lines. 
 * 
 */
function performSeventhChance(bet, multiplier) {
    console.log("performSeventhChance() called with bet:", bet, "multiplier", multiplier); //Update to the Consol That a Hell’s Seventh Chance is Starting 
    const messageEl = document.getElementById('message');
    messageEl.textContent = "Hell's Seventh Chance Activated!";
    messageEl.style.color = 'orange';
    const specialSymbols = ['7', '♦️', '♠️'];
    const slots = document.querySelectorAll('.slot');
    let spinsCompleted = 0;
    playSound(sounds.reelSpin);

    //
    slots.forEach(slot => {
        const count = 20 + Math.floor(Math.random() * 10);
        let i = 0;
        const interval = setInterval(() => {
            slot.textContent = specialSybols[Math.floor(Math.random() * specialSymbols.length)];   
        }
    
    })
}