const GRID_SIZE = 30; 
const CELL_SIZE = 20; 
const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;
const UNIT_COUNT = 40; 
const PLAYER_FACTION = 'Aethel';
        
const FACTION_CONFIG = {
    Aethel: {
        color: '#10b981',
        maxHealth: 80,
        damage: 0.6,
        speed: 2.5,
        team: 'Player'
    },
    Borean: {
        color: '#ef4444',
        maxHealth: 120,
        damage: 0.4,
        speed: 1.5,
        team: 'Enemy'
    },
    Cygnus: {
        color: '#3b82f6',
        maxHealth: 100,
        damage: 0.5,
        speed: 2.0,
        team: 'Enemy'
    },
    Drakon: {
        color: '#fcd34d',
        maxHealth: 70,
        damage: 0.7,
        speed: 2.2,
        team: 'Enemy'
    }
};

const ATTACK_RANGE = 70;
const SEPARATION_RADIUS = 30;
const SEPARATION_FORCE = 0.05;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statsEl = document.getElementById('stats');
const resetButton = document.getElementById('resetButton');
const messageBox = document.getElementById('messageBox');
const messageTitle = document.getElementById('messageTitle');
const messageContent = document.getElementById('messageContent');
const closeMessageButton = document.getElementById('closeMessage');
const menuButton = document.getElementById('menuButton');

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let units = [];
let obstacles = [];
let currentPath = []; 
let gameMap = [];
let isGameOver = false;

class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
    subtract(v) { return new Vec2(this.x - v.x, this.y - v.y); }
    multiply(s) { return new Vec2(this.x * s, this.y * s, ); }
    divide(s) { return new Vec2(this.x / s, this.y / s); }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() {
        const len = this.length();
        return len > 0 ? this.divide(len) : new Vec2(0, 0);
    }
    distanceTo(v) { return this.subtract(v).length(); }
    toGrid() {
        return {
            i: Math.floor(this.x / CELL_SIZE),
            j: Math.floor(this.y / CELL_SIZE)
        };
    }
}


class Unit {
    constructor(x, y, factionName) {
        const config = FACTION_CONFIG[factionName];

        this.position = new Vec2(x, y);
        this.velocity = new Vec2(0, 0);
        
        this.factionName = factionName;
        this.team = config.team; 
        this.maxSpeed = config.speed;
        this.radius = 8;
        this.color = config.color;
        this.health = config.maxHealth;
        this.maxHealth = config.maxHealth;
        this.damage = config.damage;
        this.attackRange = ATTACK_RANGE;
        this.targetUnit = null; 

        this.path = []; 
        this.pathIndex = 0;
    }

    update(allUnits) {
        let steering = new Vec2(0, 0);

        if (this.health <= 0) return; 

        let targetViable = false;
        if (this.targetUnit && this.targetUnit.health > 0 && this.targetUnit.factionName !== this.factionName) {
            targetViable = true;
        } else {
            const nearestEnemy = this.findNearestEnemy(allUnits);
            if (nearestEnemy) {
                this.targetUnit = nearestEnemy;
                targetViable = true;
            } else {
                this.targetUnit = null;
            }
        }

        if (targetViable) {
            const dist = this.position.distanceTo(this.targetUnit.position);
            if (dist <= this.attackRange) {
                this.velocity = new Vec2(0, 0);
                this.path = []; 

                this.targetUnit.health -= this.damage;
            } else {
                const seekForce = this.calculateSeek(this.targetUnit.position);
                steering = steering.add(seekForce);
                this.path = [];
            }
        } 
        
        else if (this.path.length > 0) {
            const targetNode = this.path[this.pathIndex];
            const targetCellCenter = new Vec2(
                targetNode.i * CELL_SIZE + CELL_SIZE / 2,
                targetNode.j * CELL_SIZE + CELL_SIZE / 2
            );

            const seekForce = this.calculateSeek(targetCellCenter);
            steering = steering.add(seekForce);

            if (this.position.distanceTo(targetCellCenter) < CELL_SIZE * 0.5) {
                this.pathIndex++;
                if (this.pathIndex >= this.path.length) {
                    this.path = [];
                }
            }
        }

        const separationForce = this.calculateSeparation(allUnits).multiply(SEPARATION_FORCE * 2);
        steering = steering.add(separationForce);

        this.velocity = this.velocity.add(steering);
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity = this.velocity.normalize().multiply(this.maxSpeed);
        }

        this.position = this.position.add(this.velocity);

        this.position.x = Math.max(this.radius, Math.min(CANVAS_WIDTH - this.radius, this.position.x));
        this.position.y = Math.max(this.radius, Math.min(CANVAS_HEIGHT - this.radius, this.position.y));
    }

    findNearestEnemy(allUnits) {
        let nearest = null;
        let minDistance = Infinity;

        for (const other of allUnits) {
            if (other.factionName !== this.factionName && other.health > 0) {
                const distance = this.position.distanceTo(other.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = other;
                }
            }
        }
        return nearest;
    }

    calculateSeek(target) {
        const desiredVelocity = target.subtract(this.position).normalize().multiply(this.maxSpeed);
        return desiredVelocity.subtract(this.velocity);
    }

    calculateSeparation(allUnits) {
        let force = new Vec2(0, 0);

        for (const other of allUnits) {
            if (other === this) continue;

            const distance = this.position.distanceTo(other.position);
            if (distance < SEPARATION_RADIUS) {
                let away = this.position.subtract(other.position);
                away = away.normalize().divide(distance);
                force = force.add(away);
            }
        }
        return force;
    }
    
    drawHealthBar() {
        const barWidth = this.radius * 3;
        const barHeight = 4;
        const healthRatio = this.health / this.maxHealth;
        const x = this.position.x - barWidth / 2;
        const y = this.position.y - this.radius - barHeight - 4;

        ctx.fillStyle = '#cccccc';
        ctx.fillRect(x, y, barWidth, barHeight);

        const healthColor = healthRatio > 0.5 ? '#22c55e' : (healthRatio > 0.2 ? '#facc15' : '#ef4444');
        ctx.fillStyle = healthColor;
        ctx.fillRect(x, y, barWidth * healthRatio, barHeight);

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }

    draw() {
        if (this.health <= 0) return; 

        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        this.drawHealthBar();

        if (this.targetUnit && this.targetUnit.health > 0) {
            const dist = this.position.distanceTo(this.targetUnit.position);
            if (dist <= this.attackRange * 1.5) { 
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, this.attackRange, 0, Math.PI * 2);
                ctx.strokeStyle = '#ef444455';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
}

class Node {
    constructor(i, j) {
        this.i = i;
        this.j = j;
        this.g = Infinity; 
        this.h = 0;        
        this.f = Infinity; 
        this.parent = null;
    }
}

function heuristic(nodeA, nodeB) {
    return Math.abs(nodeA.i - nodeB.i) + Math.abs(nodeA.j - nodeB.j);
}

function solveAStar(start, end) {
    if (start.i < 0 || start.j < 0 || start.i >= GRID_SIZE || start.j >= GRID_SIZE ||
        end.i < 0 || end.j < 0 || end.i >= GRID_SIZE || end.j >= GRID_SIZE ||
        gameMap[end.j][end.i].isObstacle) {
        return []; 
    }

    let nodes = [];
    for (let j = 0; j < GRID_SIZE; j++) {
        nodes[j] = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            nodes[j][i] = new Node(i, j);
        }
    }

    const startNode = nodes[start.j][start.i];
    const endNode = nodes[end.j][end.i];

    startNode.g = 0;
    startNode.f = heuristic(startNode, endNode);

    let openList = [startNode];
    let closedSet = new Set();

    while (openList.length > 0) {
        openList.sort((a, b) => a.f - b.f);
        let current = openList.shift();

        if (current === endNode) {
            let path = [];
            let temp = current;
            while (temp) {
                path.push({ i: temp.i, j: temp.j });
                temp = temp.parent;
            }
            path.pop(); 
            return path.reverse();
        }

        closedSet.add(current);

        const neighbors = [
            { i: 0, j: 1 }, { i: 0, j: -1 }, { i: 1, j: 0 }, { i: -1, j: 0 }
        ];

        for (const offset of neighbors) {
            const nextI = current.i + offset.i;
            const nextJ = current.j + offset.j;

            if (nextI < 0 || nextJ < 0 || nextI >= GRID_SIZE || nextJ >= GRID_SIZE) continue;

            const neighbor = nodes[nextJ][nextI];

            if (gameMap[nextJ][nextI].isObstacle || closedSet.has(neighbor)) continue;

            const tentativeG = current.g + 1;

            if (tentativeG < neighbor.g) {
                neighbor.parent = current;
                neighbor.g = tentativeG;
                neighbor.h = heuristic(neighbor, endNode);
                neighbor.f = neighbor.g + neighbor.h;

                if (!openList.includes(neighbor)) {
                    openList.push(neighbor);
                }
            }
        }
    }

    return []; 
}

function initMap() {
    gameMap = [];
    for (let j = 0; j < GRID_SIZE; j++) {
        gameMap[j] = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            gameMap[j][i] = { i, j, isObstacle: false };
        }
    }
}

function placeObstacles() {
    obstacles = [];
    initMap();

    const wallJ = Math.floor(GRID_SIZE / 2);
    for (let i = Math.floor(GRID_SIZE / 4); i < Math.floor(GRID_SIZE * 3 / 4); i++) {
        if (i !== Math.floor(GRID_SIZE / 2) && i !== Math.floor(GRID_SIZE / 2) + 1) { 
            gameMap[wallJ][i].isObstacle = true;
            obstacles.push({ i, j: wallJ });
        }
    }
}

function initUnits() {
    units = [];
    const UNITS_PER_FACTION = UNIT_COUNT / 4;
    const OFFSET = 50;
    
    const POSITIONS = [
        { x: OFFSET, y: OFFSET, faction: 'Aethel' },
        { x: CANVAS_WIDTH - OFFSET, y: OFFSET, faction: 'Cygnus' },
        { x: CANVAS_WIDTH - OFFSET, y: CANVAS_HEIGHT - OFFSET, faction: 'Borean' },
        { x: OFFSET, y: CANVAS_HEIGHT - OFFSET, faction: 'Drakon' },
    ];

    for (const pos of POSITIONS) {
        for (let i = 0; i < UNITS_PER_FACTION; i++) {
            const startX = pos.x + (Math.random() - 0.5) * 40;
            const startY = pos.y + (Math.random() - 0.5) * 40;
            units.push(new Unit(startX, startY, pos.faction));
        }
    }
}

function handlePlayerClick(event) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const targetGrid = new Vec2(x, y).toGrid();
    
    const playerUnit = units.find(u => u.factionName === PLAYER_FACTION && u.health > 0);
    if (!playerUnit) return;

    const startGrid = playerUnit.position.toGrid();
    
    currentPath = solveAStar(startGrid, targetGrid);

    if (currentPath.length > 0) {
        units.filter(u => u.factionName === PLAYER_FACTION && u.health > 0).forEach(u => {
            u.path = currentPath;
            u.pathIndex = 0;
            u.targetUnit = null; 
        });
        currentPath = [];
    } else {
        showMessageBox('Pad Zoeken Mislukt', 'Kon geen duidelijk pad naar de bestemming vinden. Controleer op obstakels!');
    }
}

function checkGameOver() {
    if (isGameOver) return;

    const liveFactions = new Set();
    units.filter(u => u.health > 0).forEach(u => liveFactions.add(u.factionName));

    if (liveFactions.size <= 1) {
        isGameOver = true;
        if (liveFactions.size === 1) {
            const winner = Array.from(liveFactions)[0];
            messageTitle.textContent = 'OVERWINNING!';
            messageContent.textContent = `De ${winner} beschaving heeft het veld veroverd en is de enige overlevende!`;
        } else {
            messageTitle.textContent = 'TOTALE VERNIETIGING';
            messageContent.textContent = `Alle eenheden zijn uitgeschakeld. Het is gelijkspel!`;
        }
        messageBox.style.display = 'flex';
    }
}

function showMessageBox(title, content) {
    messageTitle.textContent = title;
    messageContent.textContent = content;
    messageBox.style.display = 'flex';
}

function drawMap() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#a0aec0';
    obstacles.forEach(obs => {
        ctx.fillRect(obs.i * CELL_SIZE, obs.j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
}

function updateStats() {
    const factions = {};
    for (const key in FACTION_CONFIG) {
        factions[key] = { color: FACTION_CONFIG[key].color, count: 0 };
    }

    units.filter(u => u.health > 0).forEach(u => {
        if (factions[u.factionName]) {
            factions[u.factionName].count++;
        }
    });

    let statsHtml = '<ul class="space-y-1">';
    let livingFactions = [];

    for (const name in factions) {
        livingFactions.push({ name: name, count: factions[name].count, color: factions[name].color });
    }
    
    livingFactions.sort((a, b) => b.count - a.count);

    livingFactions.forEach(f => {
        statsHtml += `<li style="color: ${f.color}; font-weight: bold;">${f.name}: ${f.count} over</li>`;
    });
    
    statsHtml += '</ul>';
    statsEl.innerHTML = statsHtml;
}

function gameLoop() {
    if (isGameOver) {
        updateStats(); 
        return;
    }

    drawMap();

    units.forEach(unit => unit.update(units));

    units.forEach(unit => unit.draw());

    updateStats();
    checkGameOver();

    requestAnimationFrame(gameLoop);
}

function resetGame() {
    isGameOver = false;
    currentPath = [];
    placeObstacles(); 
    initUnits();
    messageBox.style.display = 'none';
    gameLoop();
}

canvas.addEventListener('click', handlePlayerClick);
resetButton.addEventListener('click', resetGame);
closeMessageButton.addEventListener('click', () => {
     messageBox.style.display = 'none';
});

resetGame();
