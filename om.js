const GRAVITY = 0.7;
const INITIAL_AI_SPEED = 3.5;
const MAX_AI_SPEED = 7;
const INITIAL_JUMP_CHANCE = 0.005;
const MAX_JUMP_CHANCE = 0.03;
const BASE_ATTACK_DAMAGE = 15;
const MAX_AI_ATTACK_DAMAGE = 25;
const AI_DIFFICULTY_FACTOR = 0.05;

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

function calculateAIStats(currentLevel) {
    const levelFactor = Math.min(1, currentLevel * AI_DIFFICULTY_FACTOR);
    
    const speed = INITIAL_AI_SPEED + (MAX_AI_SPEED - INITIAL_AI_SPEED) * levelFactor;
    const jumpChance = INITIAL_JUMP_CHANCE + (MAX_JUMP_CHANCE - INITIAL_JUMP_CHANCE) * levelFactor;
    const damage = BASE_ATTACK_DAMAGE + (MAX_AI_ATTACK_DAMAGE - BASE_ATTACK_DAMAGE) * levelFactor;

    return {
        speed: speed,
        jumpChance: jumpChance,
        attackCooldown: 60 - Math.floor(levelFactor * 40),
        damage: Math.round(damage),
        health: 100,
        name: `josh.ai.Potloodvechter Lvl ${currentLevel}`
    };
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
        fighter.velocity.y = -20;
    }

    if (Math.abs(distance) <= attackRange && fighter.currentCooldown === 0) {
        fighter.attack();
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 750;
canvas.height = 400;

const playerHealthBar = document.getElementById('playerHealth');
const enemyHealthBar = document.getElementById('enemyHealth');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('scoreDisplay');
const player1NameDisplay = document.getElementById('player1Name');
const player2NameDisplay = document.getElementById('player2Name');
const gameElements = document.getElementById('gameElements');

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
const pinInput = document.getElementById('pinInput');
const disconnectAndMenuButton = document.getElementById('disconnectAndMenuButton');
const nextRoundButton = document.getElementById('nextRoundButton');
const nextRoundButtonContainer = document.getElementById('nextRoundButtonContainer');

const INITIAL_TIME = 60;

let player, opponent;
let gameLoopId;
let timerIntervalId;
let keys = { a: { pressed: false }, d: { pressed: false }, w: { pressed: false }, j: { pressed: false }, k: { pressed: false } };

let game = {
    isRunning: false,
    isMultiplayer: false,
    isSolo: false,
    isHost: false,
    username: '',
    matchID: null,
    score: { player1: 0, player2: 0 },
    totalMatches: 1,
    timer: INITIAL_TIME,
    playerSide: 'p1',
    currentLevel: 1,
    matchesNeededForNextLevel: 1
};

const SERVER_URL = 'https://joshthedev888-server.onrender.com';
const socket = io(SERVER_URL);

function showMainMenu() {
    game.isSolo = false;
    game.currentLevel = 1;
    game.matchesNeededForNextLevel = 1;
    game.score = { player1: 0, player2: 0 };
    
    hostGameForm.style.display = 'none';
    joinGameForm.style.display = 'none';
    waitingScreen.style.display = 'none';
    publicGameSelectScreen.style.display = 'none';
    
    messageBox.style.display = 'flex';
    gameElements.classList.add('hidden');
    document.querySelector('.message-text').textContent = 'Om Multiplayer';
    
    nextRoundButtonContainer.style.display = 'none';

    const name = usernameInput.value.trim();
    
    if (name.length > 0) {
        playOptionsDiv.style.display = 'flex';
        messageSubtitle.textContent = 'Kies een optie om te beginnen';
        nameStatus.textContent = 'Je naam is ingevoerd. Kies een actie.';
        nameStatus.classList.remove('text-red-500', 'font-bold', 'hidden');
        nameStatus.classList.add('text-gray-600', 'mb-4');
        nameStatus.style.display = 'block';
        usernameInput.style.marginBottom = '10px';
        
    } else {
        playOptionsDiv.style.display = 'none';
        messageSubtitle.textContent = 'Voer je naam in om te starten';
        nameStatus.textContent = 'Voer een gebruikersnaam in om de opties te zien.';
        nameStatus.classList.add('text-red-500', 'font-bold');
        nameStatus.classList.remove('text-gray-600', 'mb-4', 'hidden');
        nameStatus.style.display = 'block';
        usernameInput.style.marginBottom = '20px';
    }
}

function disconnectAndGoToMenu() {
    if (game.isMultiplayer && game.matchID) {
        socket.emit('leaveGame', game.matchID);
    }
    
    game.isRunning = false;
    game.isMultiplayer = false;
    game.isHost = false;
    game.matchID = null;
    cancelAnimationFrame(gameLoopId);
    clearInterval(timerIntervalId);
    
    showMainMenu();
}


function renderPublicGames(gamesData) {
    publicGamesListDisplay.innerHTML = '';
    
    if (gamesData.length === 0) {
        publicGamesListDisplay.innerHTML = '<p class="text-gray-500">Geen openbare spellen beschikbaar. Host er één!</p>';
        return;
    }

    gamesData.forEach(g => {
        const gameButton = document.createElement('button');
        gameButton.textContent = `${g.gameName || 'Naamloos Spel'} (Host: ${g.hostName})`;
        gameButton.className = 'join-button w-full mb-2 p-2 text-sm';
        gameButton.style.backgroundColor = '#00796b';
        gameButton.style.display = 'block';
        
        gameButton.addEventListener('click', () => {
            if (!usernameInput.value.trim()) { alert("Voer eerst een gebruikersnaam in."); return; }
            joinGame(g.pin);
        });
        publicGamesListDisplay.appendChild(gameButton);
    });
}


socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    socket.emit('requestPublicGames');
    if (!game.isRunning && !game.isSolo) showMainMenu(); 
});

socket.on('publicGamesUpdate', (gamesData) => {
    renderPublicGames(gamesData);
    
    const mainListDiv = document.getElementById('publicGamesList');
    mainListDiv.innerHTML = '';
    if (gamesData.length > 0) {
        gamesData.slice(0, 5).forEach(g => {
            const gameDiv = document.createElement('div');
            gameDiv.className = 'p-3 bg-white rounded-lg shadow-md border border-blue-200';
            gameDiv.innerHTML = `<p class="font-bold text-lg text-blue-800">${g.gameName || 'Naamloos Spel'}</p><p class="text-sm text-gray-600">Host: ${g.hostName}</p><p class="text-xs text-gray-500">1/2 Spelers</p>`;
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
    displayWaitingScreen(`Wachten op speler. PIN:`, pin, 'Host (Speler 1)');
});

socket.on('playerJoined', (player2Name) => {
    player2NameDisplay.textContent = player2Name;
    playersJoined.textContent = `VS: ${player2Name}. Host kan de match starten!`;
    document.getElementById('waitingMessage').textContent = 'Klaar om te beginnen:';
    gamePinDisplay.textContent = 'Start de match hieronder.';
    nextRoundButtonContainer.style.display = game.isHost ? 'block' : 'none';
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
    game.score[game.playerSide === 'p1' ? 'player1' : 'player2'] = game.totalMatches;
    endMatch('OpponentDisconnected');
});

socket.on('seriesEnded', (finalScore) => {
    game.score = { player1: finalScore.p1, player2: finalScore.p2 };
    endMatch('SeriesEnded');
});

function initializeFighters(playerData, opponentData, playerIsP1) {
    const playerStats = { health: 100, attackCooldown: 30, damage: 15, name: playerData.name };
    let opponentStats = { health: 100, attackCooldown: 30, damage: 15, name: opponentData.name };

    if (game.isSolo) {
        opponentStats = calculateAIStats(game.currentLevel);
        opponentData.name = opponentStats.name;
    }


    const p1Pos = { x: 100, y: 0 };
    const p2Pos = { x: canvas.width - 150, y: 0 };

    if (playerIsP1) {
        player = new Fighter({ position: p1Pos, velocity: { x: 0, y: 0 }, color: '#c62828', isEnemy: false, stats: playerStats });
        opponent = new Fighter({ position: p2Pos, velocity: { x: 0, y: 0 }, color: '#1565c0', isEnemy: true, stats: opponentStats });
    } else {
        player = new Fighter({ position: p2Pos, velocity: { x: 0, y: 0 }, color: '#1565c0', isEnemy: true, stats: playerStats });
        opponent = new Fighter({ position: p1Pos, velocity: { x: 0, y: 0 }, color: '#c62828', isEnemy: false, stats: opponentStats });
    }

    player.attackBox.damage = playerStats.damage;
    opponent.attackBox.damage = opponentStats.damage;
    
    player1NameDisplay.textContent = playerData.name;
    player2NameDisplay.textContent = opponentData.name;
}

function displayWaitingScreen(message, pin, role) {
    hostGameForm.style.display = 'none';
    joinGameForm.style.display = 'none';
    publicGameSelectScreen.style.display = 'none';
    waitingScreen.style.display = 'block';
    nextRoundButtonContainer.style.display = 'none';
    
    document.getElementById('waitingMessage').textContent = `${message}`;
    gamePinDisplay.textContent = pin;
    playersJoined.textContent = `${role}. Wachten op tegenstander...`;
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

    if (game.isSolo) {
        const aiPlayer = opponent;
        const humanPlayer = player;
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
        endMatch('Tijd op');
    }
}

function startMatch() {
    game.isRunning = true;
    messageBox.style.display = 'none';
    gameElements.classList.remove('hidden'); 
    
    game.timer = INITIAL_TIME;
    player.health = player.maxHealth;
    opponent.health = opponent.maxHealth;

    clearInterval(timerIntervalId);
    timerIntervalId = setInterval(handleTimer, 1000);
    
    if (game.isSolo) {
        scoreDisplay.textContent = `Level: ${game.currentLevel} (${game.score.player1}/${game.matchesNeededForNextLevel})`;
    } else {
        scoreDisplay.textContent = `Score: ${game.score.player1}-${game.score.player2} / ${game.totalMatches}`;
    }
    
    animate(0); 
}

function endMatch(reason) {
    cancelAnimationFrame(gameLoopId);
    game.isRunning = false;
    clearInterval(timerIntervalId);
    
    let titleText, subtitleText;
    let mySide = game.playerSide;
    let restartMatch = false;
    nextRoundButtonContainer.style.display = 'none';

    if (reason === 'Tijd op' || (player.health <= 0 && opponent.health <= 0)) {
        titleText = 'Gelijkspel!';
        subtitleText = 'Tijd op of dubbele K.O.';
        if (game.isMultiplayer) socket.emit('matchEnded', 'draw', game.matchID);
        restartMatch = true;
    } else if (reason === 'PlayerDied' || (reason === 'Tijd op' && player.health <= opponent.health)) {
        game.score[mySide === 'p1' ? 'player2' : 'player1']++;
        titleText = 'Je bent verslagen';
        subtitleText = `${opponent.name} wint deze ronde.`;

    } else if (reason === 'OpponentDied' || (reason === 'Tijd op' && player.health > opponent.health)) {
        game.score[mySide === 'p1' ? 'player1' : 'player2']++;
        titleText = 'Overwinning!';
        subtitleText = `Je hebt ${opponent.name} verslagen.`;
        restartMatch = true;
    } 
    
    if (game.isSolo) {
        if (reason === 'PlayerDied' || (reason === 'Tijd op' && player.health <= opponent.health)) {
            titleText = `Game Over! (Lvl ${game.currentLevel})`;
            subtitleText = 'Je bent verslagen. Terug naar menu in 5 seconden.';
            restartMatch = false;
            
        } else if (restartMatch) {
            if (game.score.player1 >= game.matchesNeededForNextLevel) {
                game.currentLevel++;
                game.matchesNeededForNextLevel += 1;
                subtitleText = `De tegenstander is nu sterker (Lvl ${game.currentLevel}). Nieuwe match in 5 seconden...`;
            } else {
                 subtitleText = `Nog ${game.matchesNeededForNextLevel - game.score.player1} overwinning(en) tot Level ${game.currentLevel + 1}. Nieuwe match in 5 seconden...`;
            }
        }
    }
    else if (reason === 'OpponentDisconnected') {
        titleText = 'Tegenstander Verlaten';
        subtitleText = 'De tegenstander heeft de verbinding verbroken. Spel voorbij.';
        restartMatch = false;
    } else if (reason === 'SeriesEnded' || game.score.player1 >= Math.ceil(game.totalMatches / 2) || game.score.player2 >= Math.ceil(game.totalMatches / 2)) {
         const winnerName = game.score.player1 > game.score.player2 ? player1NameDisplay.textContent : player2NameDisplay.textContent;
         titleText = 'Einde Spel Serie!';
         subtitleText = `${winnerName} heeft de serie gewonnen met ${game.score.player1}-${game.score.player2}.`;
         restartMatch = false;
    }
    
    if (game.isSolo) {
        scoreDisplay.textContent = `Level: ${game.currentLevel} (${game.score.player1}/${game.matchesNeededForNextLevel})`;
    } else {
        scoreDisplay.textContent = `Score: ${game.score.player1}-${game.score.player2}`;
    }

    document.querySelector('.message-text').textContent = titleText;
    messageSubtitle.textContent = subtitleText;
    messageBox.style.display = 'flex';
    
    if (game.isSolo) {
        if (titleText.includes('Game Over!')) {
            setTimeout(showMainMenu, 5000); 
        } else if (restartMatch) {
            setTimeout(() => {
                const newAiStats = calculateAIStats(game.currentLevel);
                initializeFighters(
                    {name: game.username}, 
                    {name: newAiStats.name}, 
                    true
                );
                startMatch();
            }, 5000);
        }
    } else if (game.isMultiplayer && restartMatch) {
        messageSubtitle.textContent += ' Wachten op Host om volgende match te starten...';
        if (game.isHost) {
            nextRoundButtonContainer.style.display = 'block';
        }
    } else if (game.isMultiplayer && !restartMatch) {
        if (reason !== 'OpponentDisconnected') { 
             setTimeout(showMainMenu, 5000); 
        }
    } else if (!game.isMultiplayer && !game.isSolo) {
          setTimeout(showMainMenu, 3000); 
    }
    
    if (!game.isMultiplayer && !game.isSolo && !restartMatch) {
        gameElements.classList.add('hidden'); 
    }
}


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
    if (!usernameInput.value.trim()) { alert("Voer een gebruikersnaam in."); return; }
    
    game.username = usernameInput.value.trim();
    game.isMultiplayer = false;
    game.isSolo = true; 
    game.totalMatches = 999; 
    game.currentLevel = 1;
    game.score = { player1: 0, player2: 0 }; 
    
    const aiStatsLvl1 = calculateAIStats(1);
    initializeFighters({name: game.username}, {name: aiStatsLvl1.name}, true);
    
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
    publicGamesListDisplay.innerHTML = '<p class="text-gray-500">Laden...</p>';
    socket.emit('requestPublicGames');
});

backToMenuHost.addEventListener('click', showMainMenu);
backToMenuJoin.addEventListener('click', showMainMenu);
backToMenuPublic.addEventListener('click', showMainMenu); 

hostConfirmButton.addEventListener('click', () => {
    if (!usernameInput.value.trim()) { hostStatus.textContent = 'Voer gebruikersnaam in.'; return; }
    const gameName = gameNameInput.value.trim() || `${usernameInput.value.trim()}'s Game`;
    const matches = parseInt(matchCountInput.value);
    const isPublic = publicCheckbox.checked;

    if (matches < 1 || matches > 10) { hostStatus.textContent = 'Matches moeten tussen 1 en 10 zijn.'; return; }

    game.username = usernameInput.value.trim();
    game.totalMatches = matches;
    game.isMultiplayer = true;
    game.isSolo = false;

    socket.emit('createGame', { hostName: game.username, gameName, totalMatches: matches, isPublic });
    hostGameForm.style.display = 'none';
});

joinConfirmButton.addEventListener('click', () => {
    const pin = pinInput.value.trim().toUpperCase();
    if (!usernameInput.value.trim()) { alert("Voer een gebruikersnaam in."); return; }
    if (pin.length !== 6) { joinStatus.textContent = 'PIN moet 6 tekens zijn.'; return; }
    joinGame(pin);
});

function joinGame(pin) {
    game.username = usernameInput.value.trim();
    game.isMultiplayer = true;
    game.isSolo = false;
    socket.emit('joinGame', { pin, playerName: game.username });
    displayWaitingScreen(`Verbinden met spel PIN:`, pin, 'Speler');
    joinGameForm.style.display = 'none';
}

disconnectAndMenuButton.addEventListener('click', disconnectAndGoToMenu); 

nextRoundButton.addEventListener('click', () => {
    if (game.isHost && game.isMultiplayer && game.matchID) {
        socket.emit('hostStartNextMatch', game.matchID);
        nextRoundButtonContainer.style.display = 'none';
        document.querySelector('.message-text').textContent = 'Match gestart!';
        messageSubtitle.textContent = 'Verbinden...';
    }
});

document.addEventListener('DOMContentLoaded', showMainMenu);
