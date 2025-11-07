const GRAVITY = 0.7;

class Sprite {
    constructor({ position }) {
        this.position = position;
        this.width = 50;
        this.height = 150;
        this.velocity = { x: 0, y: 0 };
    }
    update(ctx, canvas) {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        const floorY = canvas.height - 50 - this.height;
        if (this.position.y + this.height + this.velocity.y >= canvas.height - 50) {
            this.velocity.y = 0;
            this.position.y = floorY;
        } else {
            this.velocity.y += GRAVITY;
        }
    }
}

class Fighter extends Sprite {
    constructor({ position, velocity, color, isEnemy, stats }) {
        super({ position });
        this.velocity = velocity;
        this.maxHealth = stats.health || 100;
        this.health = this.maxHealth;
        this.isAttacking = false;
        this.attackCooldown = stats.attackCooldown || 30;
        this.currentCooldown = 0;
        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            width: 100,
            height: 50,
            damage: stats.damage || 15
        };
        this.isEnemy = isEnemy;
        this.lineColor = color;
        this.lineWidth = 3;
        this.stats = stats;
        this.name = stats.name;
    }

    drawStickman(ctx) {
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = this.lineWidth;
        const x = this.position.x + this.width / 2;
        const y = this.position.y;
        const bodyHeight = this.height * 0.55;
        const legLength = this.height * 0.3;
        const armLength = this.height * 0.2;
        const headRadius = this.width / 2;

        ctx.beginPath();
        ctx.arc(x, y + headRadius, headRadius, 0, Math.PI * 2, false);
        ctx.stroke();

        const bodyTop = y + headRadius * 2;
        ctx.beginPath();
        ctx.moveTo(x, bodyTop);
        ctx.lineTo(x, bodyTop + bodyHeight);
        ctx.stroke();

        const bodyBottom = bodyTop + bodyHeight;
        ctx.beginPath();
        ctx.moveTo(x, bodyBottom);
        ctx.lineTo(x - legLength * 0.4, bodyBottom + legLength);
        ctx.moveTo(x, bodyBottom);
        ctx.lineTo(x + legLength * 0.4, bodyBottom + legLength);
        ctx.stroke();

        const armY = bodyTop + bodyHeight / 4;
        ctx.beginPath();
        ctx.moveTo(x - armLength, armY);
        ctx.lineTo(x + armLength, armY);
        ctx.stroke();

        if (this.isAttacking) {
            ctx.fillStyle = '#ffc107';
            ctx.strokeStyle = '#ffc107';
            ctx.lineWidth = 4;
            const attackDirection = this.position.x < 375 ? 1 : -1;
            const pencilStart = { x: x + (attackDirection * (armLength + 5)), y: armY };
            const pencilEnd = { x: pencilStart.x + (attackDirection * 50), y: armY - 10 };
            
            ctx.beginPath();
            ctx.moveTo(pencilStart.x, pencilStart.y);
            ctx.lineTo(pencilEnd.x, pencilEnd.y);
            ctx.stroke();
            
            ctx.fillStyle = '#6d4c41';
            ctx.beginPath();
            ctx.moveTo(pencilEnd.x, pencilEnd.y);
            ctx.lineTo(pencilEnd.x + (attackDirection * 10), pencilEnd.y + 5);
            ctx.lineTo(pencilEnd.x + (attackDirection * 10), pencilEnd.y - 15);
            ctx.closePath();
            ctx.fill();
        }
    }

    update(ctx, canvas) {
        this.drawStickman(ctx);
        super.update(ctx, canvas);
        
        const attackDirection = this.position.x < 375 ? 1 : -1;
        if (attackDirection === -1) {
             this.attackBox.position.x = this.position.x - this.attackBox.width + this.width / 2;
        } else {
             this.attackBox.position.x = this.position.x + this.width / 2;
        }
        this.attackBox.position.y = this.position.y + 50;

        if (this.currentCooldown > 0) {
            this.currentCooldown--;
            if (this.currentCooldown === 0) {
                this.isAttacking = false;
            }
        }
    }

    attack() {
        if (this.currentCooldown === 0) {
            this.isAttacking = true;
            this.currentCooldown = this.stats.attackCooldown;
        }
    }
}

function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x &&
        rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.attackBox.position.y + rectangle1.attackBox.height >= rectangle2.position.y &&
        rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
    );
}

function updateHealthBar(fighter, element) {
    const healthPercentage = Math.max(0, fighter.health / fighter.maxHealth) * 100;
    element.style.width = healthPercentage + '%';
}

function enemyAI(fighter, player) {
    const enemyStats = fighter.stats;
    const distance = player.position.x - fighter.position.x;
    const pursuitRange = 250;
    const attackRange = 100;

    fighter.velocity.x = 0;

    if (Math.abs(distance) > pursuitRange) {
        fighter.velocity.x = distance < 0 ? -enemyStats.speed : enemyStats.speed;
    } else if (Math.abs(distance) > attackRange) {
        fighter.velocity.x = distance < 0 ? -enemyStats.speed * 0.7 : enemyStats.speed * 0.7;
    }

    if (Math.random() < enemyStats.jumpChance && fighter.velocity.y === 0) {
        fighter.velocity.y = -15;
    }

    if (Math.abs(distance) <= attackRange && fighter.currentCooldown === 0) {
        fighter.attack();
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 750;
canvas.height = 400;

// GET UI ELEMENTS
const playerHealthBar = document.getElementById('playerHealth');
const enemyHealthBar = document.getElementById('enemyHealth');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('scoreDisplay');
const player1NameDisplay = document.getElementById('player1Name');
const player2NameDisplay = document.getElementById('player2Name');

const messageBox = document.getElementById('messageBox');
const messageSubtitle = document.getElementById('messageSubtitle');
const hostGameForm = document.getElementById('hostGameForm');
const joinGameForm = document.getElementById('joinGameForm');
const waitingScreen = document.getElementById('waitingScreen');
const publicGamesList = document.getElementById('publicGamesList');
const noPublicGames = document.getElementById('noPublicGames');

const usernameInput = document.getElementById('usernameInput');
const playOptionsDiv = document.getElementById('playOptions');
const nameStatus = document.getElementById('nameStatus');
const showHostButton = document.getElementById('showHostButton');
const showJoinButton = document.getElementById('showJoinButton');
const soloPlayButton = document.getElementById('soloPlayButton');
const showPublicGamesButton = document.getElementById('showPublicGamesButton');
const publicGameSelectScreen = document.getElementById('publicGameSelectScreen');
const publicGamesListDisplay = document.getElementById('publicGamesListDisplay');
const refreshPublicGamesButton = document.getElementById('refreshPublicGamesButton');

const hostConfirmButton = document.getElementById('hostConfirmButton');
const joinConfirmButton = document.getElementById('joinConfirmButton');
const backToMenuHost = document.getElementById('backToMenuHost');
const backToMenuJoin = document.getElementById('backToMenuJoin');
const backToMenuPublic = document.getElementById('backToMenuPublic');
const gameNameInput = document.getElementById('gameNameInput');
const matchCountInput = document.getElementById('matchCountInput');
const publicCheckbox = document.getElementById('publicCheckbox');
const hostStatus = document.getElementById('hostStatus');
const joinStatus = document.getElementById('joinStatus');
const gamePinDisplay = document.getElementById('gamePinDisplay');
const playersJoined = document.getElementById('playersJoined');
const pinInput = document.getElementById('pinInput'); // Corrected/Added line
const disconnectAndMenuButton = document.getElementById('disconnectAndMenuButton'); // New button

const INITIAL_TIME = 60;

let player, opponent;
let gameLoopId;
let timerIntervalId;
let keys = { a: { pressed: false }, d: { pressed: false }, w: { pressed: false }, j: { pressed: false }, k: { pressed: false } };

let game = {
    isRunning: false,
    isMultiplayer: false,
    isHost: false,
    username: '',
    matchID: null,
    score: { player1: 0, player2: 0 },
    totalMatches: 1,
    timer: INITIAL_TIME,
    playerSide: 'p1'
};

const SERVER_URL = 'https://joshthedev888-server.onrender.com';
const socket = io(SERVER_URL);

// FUNCTIONS
function showMainMenu() {
    hostGameForm.style.display = 'none';
    joinGameForm.style.display = 'none';
    waitingScreen.style.display = 'none';
    publicGameSelectScreen.style.display = 'none';
    
    messageBox.style.display = 'flex';
    document.querySelector('.message-text').textContent = 'Om Multiplayer';
    messageSubtitle.textContent = 'Choose an option to begin';

    const name = usernameInput.value.trim();
    if (name.length > 0) {
        playOptionsDiv.style.display = 'block';
        nameStatus.style.display = 'none';
    } else {
        playOptionsDiv.style.display = 'none';
        nameStatus.style.display = 'block';
    }
}

function disconnectAndGoToMenu() {
    if (game.isMultiplayer && game.matchID) {
        socket.emit('leaveGame', game.matchID);
    }
    
    // Reset local game status
    game.isRunning = false;
    game.isMultiplayer = false;
    game.isHost = false;
    game.matchID = null;
    cancelAnimationFrame(gameLoopId);
    clearInterval(timerIntervalId);
    
    // Go back to main menu
    showMainMenu();
}


function renderPublicGames(gamesData) {
    publicGamesListDisplay.innerHTML = '';
    
    if (gamesData.length === 0) {
        publicGamesListDisplay.innerHTML = '<p class="text-gray-500">No public games available. Host one!</p>';
        return;
    }

    gamesData.forEach(g => {
        const gameButton = document.createElement('button');
        gameButton.textContent = `${g.gameName || 'Untitled Game'} (Host: ${g.hostName})`;
        gameButton.className = 'join-button w-full mb-2 p-2 text-sm';
        gameButton.style.backgroundColor = '#00796b';
        gameButton.style.display = 'block';
        
        gameButton.addEventListener('click', () => {
            if (!usernameInput.value.trim()) { alert("Please enter a username first."); return; }
            joinGame(g.pin);
        });
        publicGamesListDisplay.appendChild(gameButton);
    });
}


socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    socket.emit('requestPublicGames');
    if (!game.isRunning) showMainMenu();
});

socket.on('publicGamesUpdate', (gamesData) => {
    renderPublicGames(gamesData);
    
    const mainListDiv = document.getElementById('publicGamesList');
    mainListDiv.innerHTML = '';
    if (gamesData.length > 0) {
        gamesData.forEach(g => {
            const gameDiv = document.createElement('div');
            gameDiv.className = 'p-3 bg-white rounded-lg shadow-md border border-blue-200';
            gameDiv.innerHTML = `<p class="font-bold text-lg text-blue-800">${g.gameName || 'Untitled Game'}</p><p class="text-sm text-gray-600">Host: ${g.hostName}</p><p class="text-xs text-gray-500">1/2 Players</p>`;
            mainListDiv.appendChild(gameDiv);
        });
        noPublicGames.style.display = 'none';
    } else {
        noPublicGames.style.display = 'block';
    }
});

socket.on('gameCreated', (pin, totalMatches) => {
    game.matchID = pin;
    game.totalMatches = totalMatches;
    game.isHost = true;
    game.playerSide = 'p1';
    displayWaitingScreen(`Waiting for player. PIN:`, pin, 'Host (Player 1)');
});

socket.on('playerJoined', (player2Name) => {
    player2NameDisplay.textContent = player2Name;
    playersJoined.textContent = `VS: ${player2Name}. Host can start the match!`;
});

socket.on('joinStatus', (message) => {
    joinStatus.textContent = message;
});

socket.on('matchStart', (playerData1, playerData2) => {
    const myData = (playerData1.id === socket.id) ? playerData1 : playerData2;
    const opponentData = (playerData1.id !== socket.id) ? playerData1 : playerData2;
    
    game.playerSide = (playerData1.id === socket.id) ? 'p1' : 'p2';
    
    initializeFighters(myData, opponentData, game.playerSide === 'p1');
    
    game.timer = INITIAL_TIME;
    player.health = player.maxHealth;
    opponent.health = opponent.maxHealth;
    updateHealthBar(player, playerHealthBar);
    updateHealthBar(opponent, enemyHealthBar);
    
    startMatch();
});

socket.on('opponentMoved', (moveData) => {
    if (opponent) {
        opponent.position.x = moveData.x;
        opponent.position.y = moveData.y;
        opponent.velocity.x = moveData.vx;
        opponent.velocity.y = moveData.vy;
    }
});

socket.on('opponentAttacked', () => {
    if (opponent) {
        opponent.attack();
    }
});

socket.on('opponentDisconnected', () => {
    // Set the score as if the opponent lost the series
    game.score[game.playerSide === 'p1' ? 'player1' : 'player2'] = game.totalMatches;
    endMatch('OpponentDisconnected');
});

socket.on('seriesEnded', (finalScore) => {
    game.score = { player1: finalScore.p1, player2: finalScore.p2 };
    endMatch('SeriesEnded');
});

function initializeFighters(playerData, opponentData, playerIsP1) {
    const playerStats = { health: 100, attackCooldown: 30, damage: 15, name: playerData.name };
    const opponentStats = { health: 100, attackCooldown: 30, damage: 15, name: opponentData.name };

    const p1Pos = { x: 100, y: 0 };
    const p2Pos = { x: canvas.width - 150, y: 0 };

    if (playerIsP1) {
        player = new Fighter({ position: p1Pos, velocity: { x: 0, y: 0 }, color: '#c62828', isEnemy: false, stats: playerStats });
        opponent = new Fighter({ position: p2Pos, velocity: { x: 0, y: 0 }, color: '#1565c0', isEnemy: true, stats: opponentStats });
    } else {
        player = new Fighter({ position: p2Pos, velocity: { x: 0, y: 0 }, color: '#1565c0', isEnemy: true, stats: playerStats });
        opponent = new Fighter({ position: p1Pos, velocity: { x: 0, y: 0 }, color: '#c62828', isEnemy: false, stats: opponentStats });
    }

    player1NameDisplay.textContent = playerData.name;
    player2NameDisplay.textContent = opponentData.name;
}

function displayWaitingScreen(message, pin, role) {
    hostGameForm.style.display = 'none';
    joinGameForm.style.display = 'none';
    publicGameSelectScreen.style.display = 'none';
    waitingScreen.style.display = 'block';
    
    document.getElementById('waitingMessage').textContent = `${message}`;
    gamePinDisplay.textContent = pin;
    playersJoined.textContent = `${role}. Waiting for opponent...`;
    messageBox.style.display = 'flex';
}

function animate(currentTime) {
    gameLoopId = requestAnimationFrame(animate);

    ctx.fillStyle = '#e0f7fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    player.update(ctx, canvas);
    opponent.update(ctx, canvas);

    player.velocity.x = 0;
    const playerSpeed = 8;
    if (keys.a.pressed) player.velocity.x = -playerSpeed;
    if (keys.d.pressed) player.velocity.x = playerSpeed;
    
    if (game.isMultiplayer) {
        socket.emit('playerMovement', {
            x: player.position.x,
            y: player.position.y,
            vx: player.velocity.x,
            vy: player.velocity.y
        });
    }

    if (!game.isMultiplayer) {
        const aiPlayer = opponent;
        const humanPlayer = player;
        aiPlayer.stats = { speed: 2, jumpChance: 0.005, attackCooldown: 60 };
        enemyAI(aiPlayer, humanPlayer);
    }

    if (player.isAttacking && player.currentCooldown > 0) {
        if (rectangularCollision({ rectangle1: player, rectangle2: opponent })) {
            opponent.health -= player.attackBox.damage;
            player.isAttacking = false;
        }
    }
    if (opponent.isAttacking && opponent.currentCooldown > 0) {
        if (rectangularCollision({ rectangle1: opponent, rectangle2: player })) {
            player.health -= opponent.attackBox.damage;
            opponent.isAttacking = false;
        }
    }

    updateHealthBar(player, playerHealthBar);
    updateHealthBar(opponent, enemyHealthBar);

    if (player.health <= 0 || opponent.health <= 0) {
        endMatch(player.health <= 0 ? 'PlayerDied' : 'OpponentDied');
    }
}

function handleTimer() {
    if (!game.isRunning) return;
    game.timer--;
    timerDisplay.textContent = `${game.timer}s`;
    
    if (game.timer <= 0) {
        endMatch('TimeUp');
    }
}

function startMatch() {
    game.isRunning = true;
    messageBox.style.display = 'none';
    
    game.timer = INITIAL_TIME;
    player.health = player.maxHealth;
    opponent.health = opponent.maxHealth;

    clearInterval(timerIntervalId);
    timerIntervalId = setInterval(handleTimer, 1000);
    
    scoreDisplay.textContent = `Score: ${game.score.player1}-${game.score.player2} / ${game.totalMatches}`;
    animate(0);
}

function endMatch(reason) {
    cancelAnimationFrame(gameLoopId);
    game.isRunning = false;
    clearInterval(timerIntervalId);
    
    let titleText, subtitleText;
    let mySide = game.playerSide;

    if (reason === 'TimeUp' || (player.health <= 0 && opponent.health <= 0)) {
        titleText = 'Draw!';
        subtitleText = 'Time up or double K.O. New match in 5 seconds...';
        if (game.isMultiplayer) socket.emit('matchEnded', 'draw', game.matchID);
    } else if (reason === 'PlayerDied') {
        titleText = 'You were defeated';
        subtitleText = `${opponent.name} wins this round. New match in 5 seconds...`;
        game.score[mySide === 'p1' ? 'player2' : 'player1']++;
        if (game.isMultiplayer) socket.emit('matchEnded', 'loss', game.matchID);
    } else if (reason === 'OpponentDied') {
        titleText = 'Victory!';
        subtitleText = `You defeated ${opponent.name}. New match in 5 seconds...`;
        game.score[mySide === 'p1' ? 'player1' : 'player2']++;
        if (game.isMultiplayer) socket.emit('matchEnded', 'win', game.matchID);
    } else if (reason === 'OpponentDisconnected') {
        titleText = 'Opponent Left';
        subtitleText = 'The opponent disconnected. Game over.';
        // No timeout! We wait for the player to manually return.
    } else if (reason === 'SeriesEnded') {
        const winnerName = game.score.player1 > game.score.player2 ? player1NameDisplay.textContent : player2NameDisplay.textContent;
        titleText = 'Series Ended!';
        subtitleText = `${winnerName} won the series with ${game.score.player1}-${game.score.player2}.`;
    }

    scoreDisplay.textContent = `Score: ${game.score.player1}-${game.score.player2}`;
    document.querySelector('.message-text').textContent = titleText;
    messageSubtitle.textContent = subtitleText;
    messageBox.style.display = 'flex';
    
    const maxScoreNeeded = Math.ceil(game.totalMatches / 2);

    if (!game.isMultiplayer) {
        setTimeout(showMainMenu, 3000);
    } else if (reason === 'OpponentDisconnected' || reason === 'SeriesEnded' || game.score.player1 >= maxScoreNeeded || game.score.player2 >= maxScoreNeeded) {
        if (reason !== 'OpponentDisconnected') { // Only go back on disconnect if player clicks the button, otherwise wait 5s
            setTimeout(showMainMenu, 5000);
        }
    } else if (game.isMultiplayer) {
        // Waiting for next match start
        messageSubtitle.textContent += ' Waiting for Host to start the next match...';
        // This ensures the Host has the option to start the next match
    }
}


// EVENT LISTENERS
usernameInput.addEventListener('input', showMainMenu);

window.addEventListener('keydown', e => {
    if (!game.isRunning) return;
    switch (e.key.toLowerCase()) {
        case 'a': keys.a.pressed = true; break;
        case 'd': keys.d.pressed = true; break;
        case 'w': if (player.velocity.y === 0) player.velocity.y = -20; break;
        case 'j':
        case 'k':
            player.attack();
            if (game.isMultiplayer) socket.emit('playerAttack');
            break;
    }
});

window.addEventListener('keyup', e => {
    if (!game.isRunning) return;
    switch (e.key.toLowerCase()) {
        case 'a': keys.a.pressed = false; break;
        case 'd': keys.d.pressed = false; break;
    }
});

soloPlayButton.addEventListener('click', () => {
    if (!usernameInput.value.trim()) { alert("Please enter a username."); return; }
    game.username = usernameInput.value.trim();
    game.isMultiplayer = false;
    game.totalMatches = 1;
    
    initializeFighters({name: game.username}, {name: 'josh.ai.PencilFighter'}, true);
    player1NameDisplay.textContent = game.username;
    player2NameDisplay.textContent = 'josh.ai.PencilFighter';
    
    startMatch();
});

showHostButton.addEventListener('click', () => {
    playOptionsDiv.style.display = 'none';
    hostGameForm.style.display = 'block';
});

showJoinButton.addEventListener('click', () => {
    playOptionsDiv.style.display = 'none';
    joinGameForm.style.display = 'block';
});

showPublicGamesButton.addEventListener('click', () => {
    playOptionsDiv.style.display = 'none';
    publicGameSelectScreen.style.display = 'block';
    socket.emit('requestPublicGames');
});

refreshPublicGamesButton.addEventListener('click', () => {
    publicGamesListDisplay.innerHTML = '<p class="text-gray-500">Loading...</p>';
    socket.emit('requestPublicGames');
});

backToMenuHost.addEventListener('click', showMainMenu);
backToMenuJoin.addEventListener('click', showMainMenu);
backToMenuPublic.addEventListener('click', showMainMenu);

hostConfirmButton.addEventListener('click', () => {
    if (!usernameInput.value.trim()) { hostStatus.textContent = 'Enter username.'; return; }
    const gameName = gameNameInput.value.trim() || `${usernameInput.value.trim()}'s Game`;
    const matches = parseInt(matchCountInput.value);
    const isPublic = publicCheckbox.checked;

    if (matches < 1 || matches > 10) { hostStatus.textContent = 'Matches must be between 1 and 10.'; return; }

    game.username = usernameInput.value.trim();
    game.totalMatches = matches;
    game.isMultiplayer = true;

    socket.emit('createGame', { hostName: game.username, gameName, totalMatches: matches, isPublic });
    hostGameForm.style.display = 'none';
});

joinConfirmButton.addEventListener('click', () => {
    const pin = pinInput.value.trim().toUpperCase();
    if (!usernameInput.value.trim()) { alert("Please enter a username."); return; }
    if (pin.length !== 6) { joinStatus.textContent = 'PIN must be 6 characters.'; return; }
    joinGame(pin);
});

function joinGame(pin) {
    game.username = usernameInput.value.trim();
    game.isMultiplayer = true;
    socket.emit('joinGame', { pin, playerName: game.username });
    displayWaitingScreen(`Connecting to game PIN:`, pin, 'Player');
    joinGameForm.style.display = 'none';
}

disconnectAndMenuButton.addEventListener('click', disconnectAndGoToMenu);
document.addEventListener('DOMContentLoaded', showMainMenu);
