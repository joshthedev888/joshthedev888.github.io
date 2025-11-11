const INITIAL_TIME = 60;
const AI_DIFFICULTY_FACTOR = 0.005;
const MIN_GOLD_PER_WIN = 20;
const MAX_GOLD_PER_WIN = 50;
const MIN_GOLD_PER_DRAW = 5;
const MAX_GOLD_PER_DRAW = 20;
const UPGRADE_BONUS_HEALTH = 10;
const UPGRADE_BONUS_DAMAGE = 5;
const UPGRADE_BONUS_COOLDOWN = 2;
const BASE_UPGRADE_COST_HEALTH = 100;
const BASE_UPGRADE_COST_DAMAGE = 150;
const BASE_UPGRADE_COST_COOLDOWN = 200;
const COST_MULTIPLIER = 1.4;
const WEEKLY_BONUS_DURATION_ROUNDS = 5;
const PENCIL_SPECIAL_COOLDOWN = 600;
const ICE_FREEZE_DURATION = 60;
const ICE_EXTRA_DAMAGE_MULTIPLIER = 1.5;
const PENCIL_STYLES = [
    {
        id: 'standard',
        name: 'Houtskool Standaard',
        desc: 'Een gewone potlood. Geen bonus.',
        drawColor: '#B8860B',
        damageBonus: 0, healthBonus: 0, cooldownBonus: 0, cost: 0
    },
    {
        id: 'ruby',
        name: 'Vlammen Potlood',
        desc: 'Schiet vlammen bij elke aanval (cosmetisch) en een kleine passieve DMG-boost.',
        drawColor: '#E0115F',
        damageBonus: 3, healthBonus: 0, cooldownBonus: 0, cost: 500,
        specialAttack: null, specialCooldown: 0
    },
    {
        id: 'sapphire',
        name: 'IJskristal Pen',
        desc: 'Bevriest de vijand (1s), daarna 50% extra schade (Z-toets).',
        drawColor: '#0F52BA',
        damageBonus: 8, healthBonus: 0, cooldownBonus: 0, cost: 750,
        specialAttack: 'freeze_shot', specialCooldown: 300
    },
    {
        id: 'emerald',
        name: 'Smaragd Stormbreker',
        desc: 'Gebalanceerde kracht en betere verdediging.',
        drawColor: '#50C878',
        damageBonus: 10, healthBonus: 5, cooldownBonus: 0, cost: 1000,
        specialAttack: null, specialCooldown: 0
    },
    {
        id: 'gold',
        name: 'Oud Gouden Scepter',
        desc: 'Een krachtige lichtstraal die elke 10s enorme schade aanricht (Z-toets).',
        drawColor: '#FFD700',
        damageBonus: 15, healthBonus: 0, cooldownBonus: 5, cost: 2500,
        specialAttack: 'beam_of_light', specialCooldown: PENCIL_SPECIAL_COOLDOWN
    }
];
const AI_PROFILES = [
    { name: "De Drukker", damageMultiplier: 1.2, speedMultiplier: 1.1, cooldownMultiplier: 0.9 },
    { name: "De Tank", damageMultiplier: 0.8, healthMultiplier: 1.5, speedMultiplier: 0.8 },
    { name: "De Snelheidsduivel", speedMultiplier: 1.5, jumpChanceMultiplier: 2.0, damageMultiplier: 0.9 },
    { name: "De Balans", damageMultiplier: 1.0, speedMultiplier: 1.0, healthMultiplier: 1.0 }
];
const KEY_CODES = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ATTACK: 32,
    SPECIAL: 90
};
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageBox = document.getElementById('messageBox');
const messageSubtitle = document.getElementById('messageSubtitle');
const nextRoundButtonContainer = document.getElementById('nextRoundButtonContainer');
const shopContent = document.getElementById('shopContent');
const scoreDisplay = document.getElementById('scoreDisplay');
const playerHealthBar = document.getElementById('playerHealth');
const enemyHealthBar = document.getElementById('enemyHealth');
const player1Name = document.getElementById('player1Name');
const player2Name = document.getElementById('player2Name');
const timerDisplay = document.getElementById('timer');
const gameElements = document.getElementById('gameElements');
const showShopButton = document.getElementById('showShopButton');
let gameLoopId;
let timerIntervalId;
let player, opponent;
let keys = {};
let activeProjectiles = [];
let game = {
    isRunning: false,
    isMultiplayer: false,
    isSolo: false,
    isHost: false,
    username: '',
    score: { player1: 0, player2: 0 },
    totalMatches: 3,
    timer: INITIAL_TIME,
    playerSide: 'p1',
    currentLevel: 1,
    matchesNeededForNextLevel: 1,
    soloPlayerUpgrades: { health: 0, damage: 0, cooldown: 0 },
    soloWinCount: 0,
    gold: 0,
    boughtPencils: ['standard'],
    activePencil: 'standard',
    soloBonusRoundsLeft: 0,
    soloBonusActive: null,
};
const WEEKLY_SHOP_ITEMS = [
    {
        id: 'gold_boost',
        name: 'Goud Boost',
        desc: `Verdien 2x zoveel goud voor de volgende ${WEEKLY_BONUS_DURATION_ROUNDS} rondes.`,
        cost: 500,
    },
    {
        id: 'starting_shield',
        name: 'Start Schild',
        desc: `Krijg een tijdelijk schild (30% HP boost) in de volgende ronde.`,
        cost: 350,
    },
];
class Fighter {
    constructor(x, y, width, height, isPlayer, playerSide) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isPlayer = isPlayer;
        this.playerSide = playerSide;
        this.health = 100;
        this.maxHealth = 100;
        this.damage = 10;
        this.speed = 5;
        this.jumpForce = 20;
        this.gravity = 1;
        this.attackCooldown = 60;
        this.vy = 0;
        this.vx = 0;
        this.isOnGround = false;
        this.isAttacking = false;
        this.currentCooldown = 0;
        this.isFlipped = (playerSide === 'p2');
        this.name = '';
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.specialCooldownTimer = 0;
        this.isBeingHit = false;
        this.isDying = false;
    }
}
function saveGameData() {
    localStorage.setItem('om_game_gold', game.gold);
    localStorage.setItem('om_game_upgrades', JSON.stringify(game.soloPlayerUpgrades));
    localStorage.setItem('om_game_bought_pencils', JSON.stringify(game.boughtPencils));
    localStorage.setItem('om_game_active_pencil', game.activePencil);
    localStorage.setItem('om_game_solo_bonus', JSON.stringify({
        active: game.soloBonusActive,
        roundsLeft: game.soloBonusRoundsLeft
    }));
}
function loadGameData() {
    game.gold = parseInt(localStorage.getItem('om_game_gold') || 0);
    game.soloPlayerUpgrades = JSON.parse(localStorage.getItem('om_game_upgrades') || '{"health": 0, "damage": 0, "cooldown": 0}');
    
    const loadedPencils = JSON.parse(localStorage.getItem('om_game_bought_pencils') || '["standard"]');
    game.boughtPencils = Array.isArray(loadedPencils) ? loadedPencils : ['standard'];
    if (!game.boughtPencils.includes('standard')) {
        game.boughtPencils.unshift('standard');
    }

    game.activePencil = localStorage.getItem('om_game_active_pencil') || 'standard';
    if (!game.boughtPencils.includes(game.activePencil)) {
        game.activePencil = 'standard';
    }

    const loadedBonus = JSON.parse(localStorage.getItem('om_game_solo_bonus') || '{}');
    game.soloBonusActive = loadedBonus.active || null;
    game.soloBonusRoundsLeft = loadedBonus.roundsLeft || 0;
}
function setCanvasSize() {
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.6;
    if (player && opponent) {
        player.y = canvas.height - player.height;
        opponent.y = canvas.height - opponent.height;
    }
}
window.addEventListener('resize', setCanvasSize);
function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
}
function calculateCost(baseCost, currentLevel) {
    return Math.ceil(baseCost * Math.pow(COST_MULTIPLIER, currentLevel));
}
function calculateGold(min, max, level) {
    const base = Math.floor(Math.random() * (max - min + 1)) + min;
    let multiplier = 1 + (level * 0.1);
    if (game.soloBonusActive === 'gold_boost' && game.soloBonusRoundsLeft > 0) {
        multiplier *= 2;
    }
    return Math.round(base * multiplier);
}
function calculateAIStats(currentLevel) {
    const levelFactor = Math.min(1, currentLevel * AI_DIFFICULTY_FACTOR);
    const profile = AI_PROFILES[Math.floor(Math.random() * AI_PROFILES.length)];
    const INITIAL_AI_SPEED = 4;
    const MAX_AI_SPEED = 8;
    const INITIAL_JUMP_CHANCE = 0.05;
    const MAX_JUMP_CHANCE = 0.20;
    const BASE_ATTACK_DAMAGE = 15;
    const MAX_AI_ATTACK_DAMAGE = 35;
    const speed = INITIAL_AI_SPEED + (MAX_AI_SPEED - INITIAL_AI_SPEED) * levelFactor;
    const jumpChance = INITIAL_JUMP_CHANCE + (MAX_JUMP_CHANCE - INITIAL_JUMP_CHANCE) * levelFactor;
    const damage = BASE_ATTACK_DAMAGE + (MAX_AI_ATTACK_DAMAGE - BASE_ATTACK_DAMAGE) * levelFactor;
    const attackCooldown = 60 - Math.floor(levelFactor * 40);
    const health = 100 + Math.floor(levelFactor * 50);
    return {
        speed: speed * (profile.speedMultiplier || 1),
        jumpChance: jumpChance * (profile.jumpChanceMultiplier || 1),
        attackCooldown: Math.max(10, attackCooldown * (profile.cooldownMultiplier || 1)),
        damage: Math.round(damage * (profile.damageMultiplier || 1)),
        health: Math.round(health * (profile.healthMultiplier || 1)),
        name: `${profile.name} (Lvl ${currentLevel})`
    };
}
function updateHealthBars() {
    playerHealthBar.style.width = `${(player.health / player.maxHealth) * 100}%`;
    enemyHealthBar.style.width = `${(opponent.health / opponent.maxHealth) * 100}%`;
}
function initializeFighters(playerData, opponentData, playerIsP1) {
    setCanvasSize();
    player = new Fighter(canvas.width * 0.1, canvas.height - 100, 50, 100, true, 'p1');
    opponent = new Fighter(canvas.width * 0.9 - 50, canvas.height - 100, 50, 100, false, 'p2');
    let playerStats = { health: 100, damage: 15, attackCooldown: 60, speed: 7, name: playerData.name };
    let opponentStats = { health: 100, damage: 15, attackCooldown: 60, speed: 7, name: opponentData.name };
    if (game.isSolo) {
        opponentStats = calculateAIStats(game.currentLevel);
        const activePencilData = PENCIL_STYLES.find(p => p.id === game.activePencil);
        playerStats.health += game.soloPlayerUpgrades.health * UPGRADE_BONUS_HEALTH;
        playerStats.damage += game.soloPlayerUpgrades.damage * UPGRADE_BONUS_DAMAGE;
        playerStats.attackCooldown -= game.soloPlayerUpgrades.cooldown * UPGRADE_BONUS_COOLDOWN;
        if (activePencilData) {
            playerStats.health += activePencilData.healthBonus || 0;
            playerStats.damage += activePencilData.damageBonus || 0;
            playerStats.attackCooldown -= activePencilData.cooldownBonus || 0;
        }
        if (game.soloBonusActive === 'starting_shield' && game.soloBonusRoundsLeft > 0) {
            playerStats.health *= 1.30;
        }
        playerStats.attackCooldown = Math.max(10, playerStats.attackCooldown);
    }
    player.health = player.maxHealth = playerStats.health;
    player.damage = playerStats.damage;
    player.attackCooldown = playerStats.attackCooldown;
    player.speed = playerStats.speed;
    player.name = playerStats.name;
    opponent.health = opponent.maxHealth = opponentStats.health;
    opponent.damage = opponentStats.damage;
    opponent.attackCooldown = opponentStats.attackCooldown;
    opponent.name = opponentStats.name;
    player1Name.textContent = player.name;
    player2Name.textContent = opponent.name;
    updateHealthBars();
}
function applyDamage(target, damage) {
    if (target.health <= 0) return;
    if (target.freezeTimer > 0 && target.isFrozen === false && game.isSolo) {
        damage = Math.round(damage * ICE_EXTRA_DAMAGE_MULTIPLIER);
        target.freezeTimer = 0;
    }
    target.health -= damage;
    target.isBeingHit = true;
    if (target.health < 0) target.health = 0;
    updateHealthBars();
    if (target.health === 0) {
        if (target === opponent) endMatch('OpponentDied');
        if (target === player) endMatch('PlayerDied');
    }
    setTimeout(() => target.isBeingHit = false, 100);
}
function startSpecialAttack(attacker, pencil) {
    if (!game.isSolo) return;
    if (pencil.specialAttack === 'freeze_shot') {
        activeProjectiles.push({
            id: 'ice_proj',
            x: attacker.x + attacker.width / 2,
            y: attacker.y + attacker.height / 2,
            width: 15,
            height: 15,
            speed: 15,
            damage: 10,
            color: pencil.drawColor,
            isFlipped: attacker.isFlipped,
            type: 'ice'
        });
    } else if (pencil.specialAttack === 'beam_of_light') {
        activeProjectiles.push({
            id: 'gold_beam',
            x: attacker.x + attacker.width / 2,
            y: attacker.y + attacker.height / 2,
            width: 500,
            height: 25,
            speed: 0,
            damage: 50,
            color: pencil.drawColor,
            lifespan: 15,
            isFlipped: attacker.isFlipped,
            type: 'beam'
        });
    }
}
function handleInput() {
    player.vx = 0;
    if (keys[KEY_CODES.LEFT]) {
        player.vx = -player.speed;
        player.isFlipped = true;
    }
    if (keys[KEY_CODES.RIGHT]) {
        player.vx = player.speed;
        player.isFlipped = false;
    }
    if (keys[KEY_CODES.UP] && player.isOnGround) {
        player.vy = -player.jumpForce;
        player.isOnGround = false;
    }
    if (keys[KEY_CODES.ATTACK] && player.currentCooldown <= 0) {
        player.isAttacking = true;
        player.currentCooldown = player.attackCooldown;
        if (game.isSolo) {
             if (checkCollision(player, opponent)) {
                 applyDamage(opponent, player.damage);
             }
        }
    }
    if (keys[KEY_CODES.SPECIAL] && game.isSolo) {
        const activePencilData = PENCIL_STYLES.find(p => p.id === game.activePencil);
        if (activePencilData && activePencilData.specialAttack && player.specialCooldownTimer <= 0) {
            startSpecialAttack(player, activePencilData);
            player.specialCooldownTimer = activePencilData.specialCooldown;
        }
    }
}
function updateFighter(fighter, opponent) {
    fighter.vy += fighter.gravity;
    fighter.y += fighter.vy;
    fighter.x += fighter.vx;
    if (fighter.y + fighter.height >= canvas.height) {
        fighter.y = canvas.height - fighter.height;
        fighter.vy = 0;
        fighter.isOnGround = true;
    }
    if (fighter.currentCooldown > 0) {
        fighter.currentCooldown--;
        if (fighter.currentCooldown === 0) {
            fighter.isAttacking = false;
        }
    }
    if (fighter === opponent && game.isSolo) {
        if (fighter.isFrozen) {
            fighter.vx = 0;
            fighter.vy = 0;
            return;
        }
        fighter.vx = (player.x < fighter.x) ? -fighter.speed : fighter.speed;
        fighter.isFlipped = (player.x < fighter.x);
        if (checkCollision(fighter, player) && fighter.currentCooldown <= 0) {
            fighter.isAttacking = true;
            fighter.currentCooldown = fighter.attackCooldown;
            applyDamage(player, fighter.damage);
        }
    }
}
function gameLoop(timestamp) {
    if (!game.isRunning) return;
    handleInput();
    updateFighter(player, opponent);
    updateFighter(opponent, player);
    if (game.isSolo) {
        activeProjectiles = activeProjectiles.filter(proj => {
            if (proj.speed > 0) {
                proj.x += proj.isFlipped ? -proj.speed : proj.speed;
            }
            if (proj.id === 'gold_beam') {
                proj.lifespan--;
                if (proj.lifespan <= 0) return false;
            }
            if (checkCollision(proj, opponent)) {
                applyDamage(opponent, proj.damage);
                if (proj.id === 'ice_proj') {
                    opponent.isFrozen = true;
                    opponent.freezeTimer = ICE_FREEZE_DURATION;
                    return false;
                } else if (proj.id === 'gold_beam') {
                    return false;
                }
                return false;
            }
            return proj.x > 0 && proj.x < canvas.width;
        });
        if (player.specialCooldownTimer > 0) player.specialCooldownTimer--;
        if (opponent.specialCooldownTimer > 0) opponent.specialCooldownTimer--;
        if (opponent.isFrozen) {
            opponent.freezeTimer--;
            if (opponent.freezeTimer <= 0) {
                opponent.isFrozen = false;
            }
        }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFighter(ctx, player);
    drawFighter(ctx, opponent);
    drawProjectiles(ctx);
    gameLoopId = requestAnimationFrame(gameLoop);
}
function drawProjectiles(ctx) {
    activeProjectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        if (proj.id === 'gold_beam') {
            let startX = proj.isFlipped ? proj.x - proj.width : proj.x;
            ctx.globalAlpha = proj.lifespan / 15;
            ctx.fillRect(startX, proj.y, proj.width, proj.height);
            ctx.globalAlpha = 1.0;
        } else {
            ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        }
    });
}
function drawFighter(ctx, fighter) {
    let spriteColor = fighter.playerSide === 'p1' ? 'red' : 'blue';
    if (fighter === player && game.isSolo) {
        const activePencilData = PENCIL_STYLES.find(p => p.id === game.activePencil);
        if (activePencilData) {
            spriteColor = activePencilData.drawColor;
        }
    }
    if (fighter === opponent && fighter.isFrozen) {
        spriteColor = '#ADD8E6';
        ctx.globalAlpha = 0.8;
    }
    ctx.fillStyle = spriteColor;
    ctx.fillRect(fighter.x, fighter.y, fighter.width, fighter.height);
    ctx.globalAlpha = 1.0;
    if (fighter === player && game.isSolo && game.activePencil === 'ruby') {
        ctx.fillStyle = 'orange';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(fighter.x + fighter.width / 2, fighter.y + fighter.height / 2, fighter.width * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    if (fighter.specialCooldownTimer > 0) {
        const cdMax = PENCIL_STYLES.find(p => p.id === game.activePencil)?.specialCooldown || PENCIL_SPECIAL_COOLDOWN;
        const cdPercent = fighter.specialCooldownTimer / cdMax;
        ctx.fillStyle = `rgba(0, 0, 0, 0.7)`;
        ctx.fillRect(fighter.x, fighter.y - 15, fighter.width, 10);
        ctx.fillStyle = `rgba(255, 255, 255, 1)`;
        ctx.fillRect(fighter.x, fighter.y - 15, fighter.width * (1 - cdPercent), 10);
    }
}
function startMatch() {
    messageBox.style.display = 'none';
    gameElements.style.display = 'block';
    game.isRunning = true;
    activeProjectiles = [];
    game.timer = INITIAL_TIME;
    timerDisplay.textContent = `${game.timer}s`;
    clearInterval(timerIntervalId);
    timerIntervalId = setInterval(() => {
        game.timer--;
        timerDisplay.textContent = `${game.timer}s`;
        if (game.timer <= 0) {
            clearInterval(timerIntervalId);
            endMatch('Tijd op');
        }
    }, 1000);
    gameLoopId = requestAnimationFrame(gameLoop);
}
function endMatch(reason) {
    cancelAnimationFrame(gameLoopId);
    game.isRunning = false;
    clearInterval(timerIntervalId);
    let titleText, subtitleText;
    let restartMatch = false;
    nextRoundButtonContainer.style.display = 'none';
    let goldEarned = 0;
    
    const isDraw = reason === 'Tijd op' || (player.health <= 0 && opponent.health <= 0);
    const isWin = reason === 'OpponentDied';

    if (isDraw) {
        titleText = 'Gelijkspel!';
        subtitleText = 'Tijd op of dubbele K.O.';
        if (game.isSolo) goldEarned = calculateGold(MIN_GOLD_PER_DRAW, MAX_GOLD_PER_DRAW, game.currentLevel);
        restartMatch = true;
    } else if (isWin) {
        game.score.player1++;
        titleText = 'Overwinning!';
        subtitleText = `Je hebt ${opponent.name} verslagen.`;
        if (game.isSolo) goldEarned = calculateGold(MIN_GOLD_PER_WIN, MAX_GOLD_PER_WIN, game.currentLevel);
        restartMatch = true;
    } else {
        game.score.player2++;
        titleText = 'Je bent verslagen';
        subtitleText = `${opponent.name} wint deze ronde.`;
    }

    if (game.isSolo) {
        if (goldEarned > 0) {
            game.gold += goldEarned;
            subtitleText += `<br>Je hebt <strong>${goldEarned} goud</strong> verdiend!`;
        }
        
        if (restartMatch) {
            if (game.soloBonusActive && game.soloBonusRoundsLeft > 0) {
                game.soloBonusRoundsLeft--;
                if (game.soloBonusRoundsLeft > 0) {
                    subtitleText += `<br><strong>(Tijdelijke Bonus Actief: ${game.soloBonusRoundsLeft} ronde(s) resterend)</strong>`;
                } else {
                    game.soloBonusActive = null;
                    subtitleText += `<br><strong>(Tijdelijke Bonus: Verlopen!)</strong>`;
                }
            }
            saveGameData(); 
        }

        if (game.score.player1 < game.matchesNeededForNextLevel && !restartMatch) {
            titleText = 'Game Over!';
            subtitleText += '<br>Je bent te zwak. Keer terug naar het menu.';
            setTimeout(() => showStartScreen(), 5000);
            return;
        }

        if (restartMatch) {
            game.soloWinCount++;
            if (game.soloWinCount % game.matchesNeededForNextLevel === 0) {
                document.getElementById('playOptions').style.display = 'flex';
                showUpgradeShop(titleText, subtitleText, true);
                return;
            } else {
                subtitleText += `<br>Nog ${game.matchesNeededForNextLevel - game.score.player1} overwinning(en) tot Level ${game.currentLevel + 1} en een upgrade. Nieuwe match in 5 seconden...`;
                setTimeout(() => {
                    const newAiStats = calculateAIStats(game.currentLevel);
                    initializeFighters({name: game.username}, {name: newAiStats.name}, true);
                    startMatch();
                }, 5000);
            }
        }
    }
    if (game.isSolo) {
        scoreDisplay.textContent = `Level: ${game.currentLevel} (${game.score.player1}/${game.matchesNeededForNextLevel}) | Goud: ${game.gold}`;
    } else {
        scoreDisplay.textContent = `Score: ${game.score.player1}-${game.score.player2}`;
    }
    document.querySelector('.message-text').textContent = titleText;
    messageSubtitle.innerHTML = subtitleText;
    messageBox.style.display = 'flex';
}
function showUpgradeShop(title, subtitle, isLevelUp) {
    document.getElementById('playOptions').style.display = 'flex';
    document.getElementById('usernameInput').style.display = 'block';
    
    document.getElementById('hostGameForm').style.display = 'none';
    document.getElementById('joinGameForm').style.display = 'none';
    document.getElementById('publicGameSelectScreen').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'none';

    shopContent.style.display = 'block';
    nextRoundButtonContainer.style.display = 'block';

    messageBox.style.display = 'flex';
    document.querySelector('.message-text').textContent = title;
    
    const updateShopSubtitle = (message) => {
        messageSubtitle.innerHTML = `${message}<br><br>Je hebt <strong>${game.gold}</strong> goud. <strong>Koop permanente upgrades en potloden!</strong>`;
    };

    updateShopSubtitle(subtitle);

    const createShopButtons = () => {
        nextRoundButtonContainer.innerHTML = '';
        
        const buyUpgrade = (type, cost, currentLevel) => {
            if (game.gold >= cost) {
                game.gold -= cost;
                game.soloPlayerUpgrades[type]++;
                saveGameData();
                if (isLevelUp) {
                    game.currentLevel++;
                    game.matchesNeededForNextLevel++;
                    game.score.player1 = 0;
                }
                updateShopSubtitle(`✅ <strong>${type.toUpperCase()} geüpgraded naar niveau ${currentLevel + 1}!</strong> Je hebt nu ${game.gold} goud. Koop meer of ga door.`);
            } else {
                updateShopSubtitle(`❌ <strong>Niet genoeg goud!</strong> Je hebt ${game.gold} goud, maar je hebt ${cost} nodig voor deze upgrade.`);
            }
            createShopButtons();
        };

        const buyWeeklyItem = (item) => {
            if (game.gold >= item.cost) {
                game.gold -= item.cost;
                game.soloBonusActive = item.id;
                game.soloBonusRoundsLeft = WEEKLY_BONUS_DURATION_ROUNDS;
                saveGameData();
                updateShopSubtitle(`✅ <strong>${item.name} gekocht!</strong> ${item.desc} Je hebt nu ${game.gold} goud. Dit item is nu actief.`);
            } else {
                updateShopSubtitle(`❌ <strong>Niet genoeg goud!</strong> Je hebt ${game.gold} goud, maar je hebt ${item.cost} nodig.`);
            }
            createShopButtons();
        };

        const handlePencilAction = (pencil) => {
            const isBought = game.boughtPencils.includes(pencil.id);
            if (!isBought) {
                if (game.gold >= pencil.cost) {
                    game.gold -= pencil.cost;
                    game.boughtPencils.push(pencil.id);
                    game.activePencil = pencil.id;
                    saveGameData();
                    updateShopSubtitle(`✅ <strong>Potlood '${pencil.name}' gekocht en geactiveerd!</strong> Je hebt nu ${game.gold} goud.`);
                } else {
                    updateShopSubtitle(`❌ <strong>Niet genoeg goud!</strong> Je hebt ${game.gold} goud, maar je hebt ${pencil.cost} nodig.`);
                }
            } else {
                game.activePencil = pencil.id;
                saveGameData();
                updateShopSubtitle(`✅ <strong>Potlood '${pencil.name}' geactiveerd!</strong>`);
            }
            createShopButtons();
        };

        const startNextSoloMatch = () => {
            if (isLevelUp) {
                game.currentLevel = game.currentLevel + 1;
                game.matchesNeededForNextLevel = game.matchesNeededForNextLevel + 1;
                game.score.player1 = 0;
            }
            const newAiStats = calculateAIStats(game.currentLevel);
            initializeFighters(
                {name: game.username},
                {name: newAiStats.name},
                true
            );
            startMatch();
        };
        
        nextRoundButtonContainer.insertAdjacentHTML('beforeend', '<h4 class="text-xl font-bold mt-4 mb-2 text-gray-700">Permanente Upgrades:</h4>');
        const healthLvl = game.soloPlayerUpgrades.health;
        const damageLvl = game.soloPlayerUpgrades.damage;
        const cooldownLvl = game.soloPlayerUpgrades.cooldown;
        const healthCost = calculateCost(BASE_UPGRADE_COST_HEALTH, healthLvl);
        const damageCost = calculateCost(BASE_UPGRADE_COST_DAMAGE, damageLvl);
        const cooldownCost = calculateCost(BASE_UPGRADE_COST_COOLDOWN, cooldownLvl);
        
        nextRoundButtonContainer.insertAdjacentHTML('beforeend', `<button id="buyHealth" class="upgrade-btn w-full mb-2 p-3 text-sm" style="background-color: ${game.gold >= healthCost ? '#28a745' : '#6c757d'};" ${game.gold < healthCost ? 'disabled' : ''}>
            ❤️ Max HP (+${UPGRADE_BONUS_HEALTH} HP) - Niveau ${healthLvl} | Kosten: ${healthCost} Goud
        </button>`);
        nextRoundButtonContainer.insertAdjacentHTML('beforeend', `<button id="buyDamage" class="upgrade-btn w-full mb-2 p-3 text-sm" style="background-color: ${game.gold >= damageCost ? '#28a745' : '#6c757d'};" ${game.gold < damageCost ? 'disabled' : ''}>
            ⚔️ Schade (+${UPGRADE_BONUS_DAMAGE} DMG) - Niveau ${damageLvl} | Kosten: ${damageCost} Goud
        </button>`);
        nextRoundButtonContainer.insertAdjacentHTML('beforeend', `<button id="buyCooldown" class="upgrade-btn w-full mb-2 p-3 text-sm" style="background-color: ${game.gold >= cooldownCost ? '#28a745' : '#6c757d'};" ${game.gold < cooldownCost ? 'disabled' : ''}>
            💨 Aanvalssnelheid (-${UPGRADE_BONUS_COOLDOWN} Ticks CD) - Niveau ${cooldownLvl} | Kosten: ${cooldownCost} Goud
        </button>`);
        
        nextRoundButtonContainer.insertAdjacentHTML('beforeend', '<h4 class="text-xl font-bold mt-6 mb-2 text-indigo-700">🎨 Potlood Wapens:</h4>');
        PENCIL_STYLES.forEach(pencil => {
            const isBought = game.boughtPencils.includes(pencil.id);
            const isActive = game.activePencil === pencil.id;
            const isAffordable = game.gold >= pencil.cost;
            let bonusText = '';
            if (pencil.damageBonus) bonusText += `+${pencil.damageBonus} DMG`;
            if (pencil.healthBonus) bonusText += (bonusText ? ', ' : '') + `+${pencil.healthBonus} HP`;
            if (pencil.cooldownBonus) bonusText += (bonusText ? ', ' : '') + `-${pencil.cooldownBonus} CD`;
            if (pencil.specialAttack) bonusText += (bonusText ? ', ' : '') + `ACTIEVE SKILL`;
            let buttonText;
            let buttonAction;
            let buttonColor;
            if (isActive) {
                buttonText = '✅ ACTIEF';
                buttonColor = '#00796b';
                buttonAction = 'disabled';
            } else if (isBought) {
                buttonText = 'SELECTEREN (Equip)';
                buttonColor = '#4caf50';
                buttonAction = '';
            } else {
                buttonText = `KOPEN (${pencil.cost} Goud)`;
                buttonColor = isAffordable ? '#3f51b5' : '#6c757d';
                buttonAction = isAffordable ? '' : 'disabled';
            }
            nextRoundButtonContainer.insertAdjacentHTML('beforeend', `
                <button id="pencil_${pencil.id}" class="w-full mb-2 p-3 text-sm text-white rounded flex justify-between items-center" style="background-color: ${buttonColor};" ${buttonAction}>
                    <div class="text-left">
                        <span class="font-bold">${pencil.name}</span>
                        <p class="text-xs italic">${pencil.desc} <span class="font-bold">(${bonusText || 'Geen Bonus'})</span></p>
                    </div>
                    <div style="width: 25px; height: 25px; background-color: ${pencil.drawColor}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${pencil.drawColor};"></div>
                </button>
            `);
        });
        
        nextRoundButtonContainer.insertAdjacentHTML('beforeend', '<h4 class="text-xl font-bold mt-6 mb-2 text-yellow-700">✨ Wekelijkse Speciale Items:</h4>');
        WEEKLY_SHOP_ITEMS.forEach(item => {
            const isAffordable = game.gold >= item.cost;
            const currentlyActive = game.soloBonusActive && game.soloBonusRoundsLeft > 0;
            const isThisItemActive = game.soloBonusActive === item.id;
            
            let buttonText = `Kosten: ${item.cost} Goud`;
            let buttonColor = isAffordable ? '#f6ad55' : '#6c757d';
            let isDisabled = !isAffordable || currentlyActive;
            
            if (currentlyActive) {
                if (isThisItemActive) {
                    buttonText = `BONUS ACTIEF (${game.soloBonusRoundsLeft} rondes)`;
                    buttonColor = '#00796b';
                    isDisabled = true;
                } else {
                    buttonText = `BONUS ACTIEF (Wacht op afronding)`;
                    buttonColor = '#e53e3e';
                    isDisabled = true;
                }
            }
            
            nextRoundButtonContainer.insertAdjacentHTML('beforeend', `
                <div class="p-3 mb-2 bg-gray-100 rounded border border-gray-300 text-left">
                    <p class="font-bold text-lg">${item.name}</p>
                    <p class="text-sm text-gray-600">${item.desc}</p>
                    <button id="buyWeekly_${item.id}" class="weekly-btn w-full mt-2 p-2 text-sm text-white rounded" style="background-color: ${buttonColor};" ${isDisabled ? 'disabled' : ''}>
                        ${buttonText}
                    </button>
                </div>
            `);
        });
        
        if (game.isSolo) {
            nextRoundButtonContainer.insertAdjacentHTML('beforeend', `<button id="continueSolo" class="w-full mt-4 p-3 text-lg" style="background-color: #00796b;">
                Volgende Gevecht (Lvl ${game.currentLevel})
            </button>`);
        }
        
        document.getElementById('buyHealth').addEventListener('click', () => buyUpgrade('health', healthCost, healthLvl));
        document.getElementById('buyDamage').addEventListener('click', () => buyUpgrade('damage', damageCost, damageLvl));
        document.getElementById('buyCooldown').addEventListener('click', () => buyUpgrade('cooldown', cooldownCost, cooldownLvl));
        
        PENCIL_STYLES.forEach(pencil => {
            const button = document.getElementById(`pencil_${pencil.id}`);
            if (button && !button.disabled) {
                button.addEventListener('click', () => handlePencilAction(pencil));
            }
        });
        
        WEEKLY_SHOP_ITEMS.forEach(item => {
            const button = document.getElementById(`buyWeekly_${item.id}`);
            if (button && !button.disabled) {
                button.addEventListener('click', () => buyWeeklyItem(item));
            }
        });
        
        if (document.getElementById('continueSolo')) {
            document.getElementById('continueSolo').addEventListener('click', startNextSoloMatch);
        }

        scoreDisplay.textContent = `Level: ${game.currentLevel} (${game.score.player1}/${game.matchesNeededForNextLevel}) | Goud: ${game.gold}`;
    };

    createShopButtons();
}
function showStartScreen() {
    gameElements.style.display = 'none';
    messageBox.style.display = 'flex';
    
    shopContent.style.display = 'none'; 
    document.getElementById('hostGameForm').style.display = 'none';
    document.getElementById('joinGameForm').style.display = 'none';
    document.getElementById('publicGameSelectScreen').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'none';
    nextRoundButtonContainer.style.display = 'none';

    document.querySelector('.message-text').textContent = 'Om Multiplayer';
    messageSubtitle.innerHTML = 'Voer je naam in om te starten';
    document.getElementById('usernameInput').style.display = 'block';
    document.getElementById('playOptions').style.display = 'none';
    document.getElementById('nameStatus').style.display = 'none';
    
    document.getElementById('usernameInput').addEventListener('input', (e) => {
        if (e.target.value.trim().length > 2) {
            game.username = e.target.value.trim();
            document.getElementById('playOptions').style.display = 'flex';
            document.getElementById('nameStatus').style.display = 'none';
        } else {
            document.getElementById('playOptions').style.display = 'none';
        }
    });
    
    document.getElementById('soloPlayButton').addEventListener('click', () => {
        game.isSolo = true;
        game.isMultiplayer = false;
        game.score = { player1: 0, player2: 0 };
        const newAiStats = calculateAIStats(game.currentLevel);
        initializeFighters(
            {name: game.username},
            {name: newAiStats.name},
            true
        );
        startMatch();
    });

    if (showShopButton) {
        showShopButton.addEventListener('click', () => {
            game.isSolo = true;
            showUpgradeShop('Welkom in de Winkel', 'Beheer je upgrades en koop nieuwe potlooden.', false);
        });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    loadGameData();
    setCanvasSize();
    showStartScreen();
});
