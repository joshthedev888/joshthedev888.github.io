const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 750;
canvas.height = 400;

const playerHealthBar = document.getElementById('playerHealth');
const enemyHealthBar = document.getElementById('enemyHealth');
const timerDisplay = document.getElementById('timer');
const levelDisplay = document.getElementById('levelDisplay');
const messageBox = document.getElementById('messageBox');
const startButton = document.getElementById('startButton');
const messageSubtitle = document.getElementById('messageSubtitle');

const GRAVITY = 0.7;
const MAX_LEVEL = 5;
const INITIAL_TIME = 60;
    
let player, enemy;
let gameLoopId;
let game = {
    isRunning: false,
    level: 1,
    timer: INITIAL_TIME
};
let timerIntervalId;
let lastTime = 0;
    
const keys = {
    a: { pressed: false },
    d: { pressed: false },
    w: { pressed: false },
};

const ENEMY_STATS = {
    1: { health: 100, speed: 2, jumpChance: 0.003, attackCooldown: 30, damage: 10 },
    2: { health: 120, speed: 3, jumpChance: 0.005, attackCooldown: 25, damage: 12 },
    3: { health: 140, speed: 4, jumpChance: 0.007, attackCooldown: 20, damage: 14 },
    4: { health: 160, speed: 5, jumpChance: 0.010, attackCooldown: 15, damage: 16 },
    5: { health: 180, speed: 6, jumpChance: 0.012, attackCooldown: 10, damage: 18 },
    6: { health: 200, speed: 2, jumpChance: 0.014, attackCooldown: 30, damage: 20),
    7: { health: 220, speed: 3, jumpChance: 0.016, attackCooldown: 25, damage: 22 },
    8: { health: 240, speed: 4, jumpChance: 0.018, attackCooldown: 20, damage: 24 },
    9: { health: 260, speed: 5, jumpChance: 0.021, attackCooldown: 15, damage: 26 },
    10: { health: 280, speed: 6, jumpChance: 0.022, attackCooldown: 10, damage: 28 },
};

class Sprite {
    constructor({ position }) {
        this.position = position;
        this.width = 50;
        this.height = 150;
        this.velocity = { x: 0, y: 0 };
    }

    update() {
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
            damage: stats.damage || 10
        };
        this.isEnemy = isEnemy;
        this.lineColor = color;
        this.lineWidth = 3;
        this.stats = stats;
    }

    drawStickman() {
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
            
            const attackDirection = this.isEnemy ? -1 : 1; 
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

    update() {
        this.drawStickman();
        super.update();

        if (this.isEnemy) {
            this.attackBox.position.x = this.position.x - this.attackBox.width + this.width / 2;
            this.attackBox.position.y = this.position.y + 50;
        } else {
            this.attackBox.position.x = this.position.x + this.width / 2;
            this.attackBox.position.y = this.position.y + 50;
        }

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

function setupNewGame(startLevel = 1) {
    const playerStats = { health: 100, attackCooldown: 30, damage: 15 };
    player = new Fighter({
        position: { x: 100, y: 0 },
        velocity: { x: 0, y: 0 },
        color: '#c62828',
        isEnemy: false,
        stats: playerStats
    });

    const currentEnemyStats = ENEMY_STATS[startLevel];
    enemy = new Fighter({
        position: { x: canvas.width - 150, y: 0 },
        velocity: { x: 0, y: 0 },
        color: '#1565c0',
        isEnemy: true,
        stats: currentEnemyStats
    });

    game.level = startLevel;
    game.timer = INITIAL_TIME;
    game.isRunning = true;
    
    }
    
    levelDisplay.textContent = `Level ${game.level}`;
    playerHealthBar.style.width = '100%';
    enemyHealthBar.style.width = '100%';

    messageBox.style.display = 'none';

    clearInterval(timerIntervalId);
    timerIntervalId = setInterval(handleTimer, 1000);
}

function handleTimer() {
    if (!game.isRunning) return;

    game.timer--;
    timerDisplay.textContent = `${game.timer}s`;

    if (game.timer <= 0) {
        endGame('Tijd op');
    }
}

function endGame(reason) {
    cancelAnimationFrame(gameLoopId);
    game.isRunning = false;
    clearInterval(timerIntervalId);

    let titleText = 'Spel Voorbij!';
    let subtitleText = 'Helaas, je hebt verloren.';
    
    if (reason === 'Tijd op') {
        titleText = 'Tijd op';
        subtitleText = 'Niet snel genoeg. Probeer opnieuw';
    } else if (reason === 'PlayerDied') {
        titleText = 'Je bent verslagen';
        subtitleText = `josh.ai.Potloodvechter was te sterk op Level ${game.level}.`;
    } else if (reason === 'EnemyDied') {
        if (game.level < MAX_LEVEL) {
            titleText = `Level ${game.level} VOLTOOID!`;
            subtitleText = 'Klaar voor de volgende sterkere josh.ai.Potloodvechter?';
            startButton.textContent = `Ga naar Level ${game.level + 1}`;
            startButton.onclick = () => {
                setupNewGame(game.level + 1);
                animate(0);
            }
        } else {
            titleText = 'gefeliciteerd';
            subtitleText = 'Je hebt VOOR NU josh.ai.Potloodvechter verslagen.';
            startButton.textContent = 'Speel Opnieuw (Level 1)';
            startButton.onclick = () => {
                setupNewGame(1);
                animate(0);
            }
        }
        messageBox.style.display = 'flex';
        return;
    }

    messageBox.style.display = 'flex';
    messageSubtitle.textContent = subtitleText;
    document.querySelector('.message-text').textContent = titleText;
    startButton.textContent = 'Opnieuw starten (Level 1)';
    startButton.onclick = () => {
        setupNewGame(1);
        animate(0);
    }
}

function enemyAI() {
    const enemyStats = enemy.stats;

    const distance = player.position.x - enemy.position.x;
    const pursuitRange = 250; 
    const attackRange = 100; 
    
    enemy.velocity.x = 0;
    
    if (Math.abs(distance) > pursuitRange) {
        if (distance < 0) {
            enemy.velocity.x = -enemyStats.speed;
        } else {
            enemy.velocity.x = enemyStats.speed;
        }
    } else if (Math.abs(distance) > attackRange) {
        if (distance < 0) {
            enemy.velocity.x = -enemyStats.speed * 0.7;
        } else {
            enemy.velocity.x = enemyStats.speed * 0.7;
        }
    } else {
        enemy.velocity.x = 0;
    }

    if (Math.random() < enemyStats.jumpChance && enemy.velocity.y === 0) {
        enemy.velocity.y = -15;
    }

    if (Math.abs(distance) <= attackRange && enemy.currentCooldown === 0) {
        enemy.attack();
    }
}

function animate(currentTime) {
    gameLoopId = requestAnimationFrame(animate);

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    ctx.fillStyle = '#e0f7fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    player.update();
    enemy.update();

    if (game.isRunning) {
        enemyAI();
    }

    if (player.isAttacking && player.currentCooldown > 0) {
        if (rectangularCollision({ rectangle1: player, rectangle2: enemy })) {
            enemy.health -= player.attackBox.damage;
            updateHealthBar(enemy, enemyHealthBar);
            player.isAttacking = false; 
        }
    }

    if (enemy.isAttacking && enemy.currentCooldown > 0) {
        if (rectangularCollision({ rectangle1: enemy, rectangle2: player })) {
            player.health -= enemy.attackBox.damage;
            updateHealthBar(player, playerHealthBar);
            enemy.isAttacking = false; 
        }
    }

    if (player.health <= 0) {
        endGame('PlayerDied');
    } else if (enemy.health <= 0) {
        endGame('EnemyDied');
    }

    player.velocity.x = 0;
    const playerSpeed = 8;
    if (keys.a.pressed) player.velocity.x = -playerSpeed;
    if (keys.d.pressed) player.velocity.x = playerSpeed;
}

window.addEventListener('keydown', (event) => {
    if (!game.isRunning) return;

    switch (event.key) {
        case 'a':
        case 'A':
            keys.a.pressed = true;
            break;
        case 'd':
        case 'D':
            keys.d.pressed = true;
            break;
        case 'w':
        case 'W':
            if (player.velocity.y === 0) {
                player.velocity.y = -20;
            }
            break;
        case 'j':
        case 'J':
            player.attack();
            break;
        case 'k':
        case 'K':
            player.attack();
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'a':
        case 'A':
            keys.a.pressed = false;
            break;
        case 'd':
        case 'D':
            keys.d.pressed = false;
            break;
    }
});

messageSubtitle.textContent = `Versla josh.ai.Potloodvechter in level 1. Er zijn ${MAX_LEVEL} levels. Er komen er misschien meer maar voor nu zijn er ${MAX_LEVEL} levels.`;
startButton.addEventListener('click', () => {
    setupNewGame(game.level);
    animate(0);
});
