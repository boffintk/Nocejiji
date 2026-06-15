// ==========================================================================
// CONFIGURACIÓN E IDIOMAS
// ==========================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TRADUCCIONES = {
    es: {
        title: "ZOMBIE LIMINAL", lblLang: "Idioma:", lblDiff: "Dificultad:",
        lblColor: "Color Skin:", btnStart: "INICIAR JUEGO", goTitle: "CONEXIÓN PERDIDA",
        goScore: "Zombis eliminados: ", btnRestart: "REINTENTAR", hudKills: "BAJAS", hudHp: "ESTABILIDAD",
        easy: "Fácil", med: "Medio", hard: "Difícil"
    },
    en: {
        title: "LIMINAL ZOMBIE", lblLang: "Language:", lblDiff: "Difficulty:",
        lblColor: "Skin Color:", btnStart: "START GAME", goTitle: "CONNECTION LOST",
        goScore: "Zombies defeated: ", btnRestart: "RETRY", hudKills: "KILLS", hudHp: "STABILITY",
        easy: "Easy", med: "Medium", hard: "Hard"
    }
};

let CONFIG = {
    lang: 'es',
    difficulty: 'easy',
    playerColor: '#ff0055'
};

let d_zombieSpeed = 1.2;
let d_zombieDamage = 10;
let d_obstacleCount = 0.2;

let gameRunning = false;
let score = 0;
let hp = 100;
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

function aplicarIdioma() {
    const t = TRADUCCIONES[CONFIG.lang];
    document.getElementById('m-title').textContent = t.title;
    document.getElementById('lbl-lang').textContent = t.lblLang;
    document.getElementById('lbl-diff').textContent = t.lblDiff;
    document.getElementById('lbl-color').textContent = t.lblColor;
    document.getElementById('start-btn').textContent = t.btnStart;
    document.getElementById('go-title').textContent = t.goTitle;
    document.getElementById('restart-btn').textContent = t.btnRestart;
    document.getElementById('hud-kills').textContent = t.hudKills;
    document.getElementById('hud-hp').textContent = t.hudHp;
    
    document.getElementById('diff-easy').textContent = t.easy;
    document.getElementById('diff-med').textContent = t.med;
    document.getElementById('diff-hard').textContent = t.hard;
}

// Interfaz del Menú Principal
document.getElementById('lang-es').addEventListener('click', () => { CONFIG.lang = 'es'; toggleActiveLang('lang-es', 'lang-en'); aplicarIdioma(); });
document.getElementById('lang-en').addEventListener('click', () => { CONFIG.lang = 'en'; toggleActiveLang('lang-en', 'lang-es'); aplicarIdioma(); });

function toggleActiveLang(act, inact) {
    document.getElementById(act).classList.add('active');
    document.getElementById(inact).classList.remove('active');
}

const diffBtns = {
    easy: document.getElementById('diff-easy'),
    med: document.getElementById('diff-med'),
    hard: document.getElementById('diff-hard')
};
Object.keys(diffBtns).forEach(key => {
    diffBtns[key].addEventListener('click', () => {
        Object.values(diffBtns).forEach(b => b.classList.remove('active'));
        diffBtns[key].classList.add('active');
        CONFIG.difficulty = key;
        
        if(key === 'easy') { d_zombieSpeed = 1.2; d_zombieDamage = 10; d_obstacleCount = 0.2; }
        if(key === 'med') { d_zombieSpeed = 2.2; d_zombieDamage = 20; d_obstacleCount = 0.45; }
        if(key === 'hard') { d_zombieSpeed = 3.5; d_zombieDamage = 35; d_obstacleCount = 0.7; }
    });
});

const dots = document.querySelectorAll('.color-dot');
dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
        dots.forEach(d => d.classList.remove('selected'));
        e.target.classList.add('selected');
        CONFIG.playerColor = e.target.getAttribute('data-color');
    });
});

function resizeCanvas() {
    let scale = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT);
    canvas.width = BASE_WIDTH; canvas.height = BASE_HEIGHT;
    canvas.style.width = (BASE_WIDTH * scale) + 'px'; canvas.style.height = (BASE_HEIGHT * scale) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==========================================================================
// CONTROLES
// ==========================================================================
const keys = { left: false, right: false, up: false };
let facingDirection = 1;

window.addEventListener('keydown', (e) => {
    if(e.code === 'KeyA' || e.code === 'ArrowLeft') { keys.left = true; facingDirection = -1; }
    if(e.code === 'KeyD' || e.code === 'ArrowRight') { keys.right = true; facingDirection = 1; }
    if(e.code === 'KeyW' || e.code === 'Space') keys.up = true;
    if(e.code === 'KeyF') fireBullet();
});
window.addEventListener('keyup', (e) => {
    if(e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
    if(e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
    if(e.code === 'KeyW' || e.code === 'Space') keys.up = false;
});

const joystick = document.getElementById('joystick-bg');
const stick = document.getElementById('joystick-stick');
let joyActive = false; let jsX = 0; let jsY = 0;

joystick.addEventListener('touchstart', (e) => {
    joyActive = true;
    let r = joystick.getBoundingClientRect();
    jsX = r.left + r.width/2; jsY = r.top + r.height/2;
});
window.addEventListener('touchmove', (e) => {
    if(!joyActive) return;
    let t = e.touches[0];
    let dx = t.clientX - jsX;
    if(Math.abs(dx) > 15) {
        keys.left = dx < 0; keys.right = dx > 0;
        facingDirection = dx > 0 ? 1 : -1;
        stick.style.transform = `translate(${dx > 0 ? 25 : -25}px, 0px)`;
    }
});
window.addEventListener('touchend', () => {
    joyActive = false; keys.left = false; keys.right = false;
    stick.style.transform = 'translate(0px,0px)';
});

document.getElementById('jump-btn').addEventListener('touchstart', (e) => { e.preventDefault(); keys.up = true; });
document.getElementById('jump-btn').addEventListener('touchend', () => keys.up = false);
document.getElementById('shoot-btn').addEventListener('touchstart', (e) => { e.preventDefault(); fireBullet(); });

// ==========================================================================
// OBJETOS Y FÍSICAS
// ==========================================================================
const camera = { x: 0, targetX: 0, speed: 0.08 };

const player = {
    x: 200, y: 300, width: 45, height: 45, vx: 0, vy: 0,
    speed: 7.5, gravity: 0.65, jumpForce: -14, grounded: false,
    invulnerable: 0,
    
    update() {
        if (this.invulnerable > 0) this.invulnerable--;
        if (keys.left) this.vx = -this.speed;
        else if (keys.right) this.vx = this.speed;
        else this.vx *= 0.8;

        this.vy += this.gravity;
        if (keys.up && this.grounded) { this.vy = this.jumpForce; this.grounded = false; }

        this.x += this.vx; this.y += this.vy;
        if (this.y > BASE_HEIGHT + 150) { this.damage(25); this.resetPosition(); }
    },
    damage(amt) {
        if(this.invulnerable > 0) return;
        hp -= amt; this.invulnerable = 40;
        if(hp <= 0) { hp = 0; endGame(); }
        document.getElementById('hp-display').textContent = hp + "%";
    },
    resetPosition() {
        this.x = platforms[0] ? platforms[0].x + 40 : 200;
        this.y = 200; this.vx = 0; this.vy = 0;
    },
    draw() {
        if (this.invulnerable > 0 && Math.floor(this.invulnerable / 4) % 2 === 0) return;
        ctx.save();
        ctx.fillStyle = CONFIG.playerColor;
        ctx.shadowBlur = 15; ctx.shadowColor = CONFIG.playerColor;
        ctx.fillRect(this.x - camera.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#666';
        let gunX = facingDirection === 1 ? this.x - camera.x + this.width : this.x - camera.x - 15;
        ctx.fillRect(gunX, this.y + 20, 15, 8);
        ctx.restore();
    }
};

const platforms = [];
const bullets = [];
const zombies = [];
const obstacles = [];

function fireBullet() {
    let bX = facingDirection === 1 ? player.x + player.width : player.x - 10;
    bullets.push({ x: bX, y: player.y + 22, vx: facingDirection * 16, width: 12, height: 5 });
}

function generateInitialWorld() {
    platforms.length = 0; bullets.length = 0; zombies.length = 0; obstacles.length = 0;
    platforms.push({ x: 0, y: 560, width: 900, height: 160 });
    
    let lastX = 900;
    for(let i=0; i<10; i++) {
        let w = Math.random() * 200 + 200;
        let gap = Math.random() * 110 + 90;
        let y = Math.random() * 150 + 400;
        let plat = { x: lastX + gap, y: y, width: w, height: 200 };
        platforms.push(plat);

        if (Math.random() < d_obstacleCount) {
            obstacles.push({ x: plat.x + (plat.width/2) - 15, y: plat.y - 25, width: 30, height: 25 });
        }

        if (Math.random() * 1.2 > 0.4) {
            zombies.push({
                x: plat.x + plat.width - 50, y: plat.y - 45, width: 40, height: 45,
                vx: -d_zombieSpeed, hp: CONFIG.difficulty === 'hard' ? 2 : 1
            });
        }
        lastX = plat.x + plat.width;
    }
}

function updateWorld() {
    let lastPlat = platforms[platforms.length - 1];
    if (player.x + BASE_WIDTH > lastPlat.x) {
        let w = Math.random() * 200 + 200;
        let gap = Math.random() * 120 + 90;
        let y = Math.random() * 150 + 400;
        let nPlat = { x: lastPlat.x + lastPlat.width + gap, y: y, width: w, height: 200 };
        platforms.push(nPlat);

        if (Math.random() < d_obstacleCount) {
            obstacles.push({ x: nPlat.x + 40, y: nPlat.y - 25, width: 35, height: 25 });
        }
        if (Math.random() > 0.3) {
            zombies.push({
                x: nPlat.x + nPlat.width - 40, y: nPlat.y - 45, width: 40, height: 45,
                vx: -d_zombieSpeed, hp: CONFIG.difficulty === 'hard' ? 2 : 1
            });
        }
    }

    if(platforms[0] && platforms[0].x + platforms[0].width < player.x - BASE_WIDTH) platforms.shift();
    for(let i=zombies.length-1; i>=0; i--) { if(zombies[i].x < player.x - BASE_WIDTH) zombies.splice(i,1); }
    for(let i=obstacles.length-1; i>=0; i--) { if(obstacles[i].x < player.x - BASE_WIDTH) obstacles.splice(i,1); }
}

function checkCollisions() {
    player.grounded = false;

    for (let plat of platforms) {
        if (player.x < plat.x + plat.width && player.x + player.width > plat.x &&
            player.y + player.height >= plat.y && player.y + player.height - player.vy <= plat.y + 6) {
            player.y = plat.y - player.height; player.vy = 0; player.grounded = true;
        }
    }

    for(let obs of obstacles) {
        if (player.x < obs.x + obs.width && player.x + player.width > obs.x &&
            player.y < obs.y + obs.height && player.y + player.height > obs.y) {
            player.damage(d_zombieDamage);
        }
    }

    for(let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i]; b.x += b.vx;
        let bulletHit = false;

        for(let j = zombies.length - 1; j >= 0; j--) {
            let z = zombies[j];
            if (b.x < z.x + z.width && b.x + b.width > z.x && b.y < z.y + z.height && b.y + b.height > z.y) {
                z.hp--; bulletHit = true;
                if(z.hp <= 0) { zombies.splice(j, 1); score++; document.getElementById('score-display').textContent = score; }
                break;
            }
        }
        if(bulletHit || Math.abs(b.x - player.x) > BASE_WIDTH) bullets.splice(i, 1);
    }

    for(let z of zombies) {
        z.x += z.vx;
        for (let plat of platforms) {
            if (z.x + z.width > plat.x && z.x < plat.x + plat.width) {
                if (z.x <= plat.x) z.vx = d_zombieSpeed;
                if (z.x + z.width >= plat.x + plat.width) z.vx = -d_zombieSpeed;
            }
        }
        if (player.x < z.x + z.width && player.x + player.width > z.x &&
            player.y < z.y + z.height && player.y + player.height > z.y) {
            player.damage(d_zombieDamage);
        }
    }
}

function drawScene() {
    ctx.fillStyle = '#09090d'; ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    for(let plat of platforms) {
        ctx.fillStyle = '#1b1b26'; ctx.strokeStyle = '#33334c'; ctx.lineWidth = 3;
        ctx.fillRect(plat.x - camera.x, plat.y, plat.width, plat.height);
        ctx.strokeRect(plat.x - camera.x, plat.y, plat.width, plat.height);
    }

    for(let obs of obstacles) {
        ctx.save();
        ctx.fillStyle = '#39ff14'; ctx.shadowBlur = 10; ctx.shadowColor = '#39ff14';
        ctx.beginPath();
        ctx.moveTo(obs.x - camera.x, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width/2 - camera.x, obs.y);
        ctx.lineTo(obs.x + obs.width - camera.x, obs.y + obs.height);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    ctx.fillStyle = '#fffb00';
    for(let b of bullets) { ctx.fillRect(b.x - camera.x, b.y, b.width, b.height); }

    for(let z of zombies) {
        ctx.save();
        ctx.fillStyle = '#2e7d32'; ctx.shadowBlur = 8; ctx.shadowColor = '#1b5e20';
        ctx.fillRect(z.x - camera.x, z.y, z.width, z.height);
        ctx.fillStyle = '#ff1100';
        let eyeX = z.vx > 0 ? z.x - camera.x + z.width - 12 : z.x - camera.x + 4;
        ctx.fillRect(eyeX, z.y + 10, 8, 6);
        ctx.restore();
    }

    player.draw();
}

function gameLoop() {
    if (!gameRunning) return;
    updateWorld();
    player.update();
    checkCollisions();

    camera.targetX = player.x - 280;
    camera.x += (camera.targetX - camera.x) * camera.speed;

    drawScene();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    score = 0; hp = 100;
    document.getElementById('score-display').textContent = score;
    document.getElementById('hp-display').textContent = hp + "%";
    generateInitialWorld();
    player.resetPosition();
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    gameRunning = true;
    gameLoop();
}

function endGame() {
    gameRunning = false;
    const t = TRADUCCIONES[CONFIG.lang];
    document.getElementById('final-score').textContent = score;
    document.getElementById('go-score-lbl').innerHTML = `${t.goScore} <span style="color:#00ffcc;">${score}</span>`;
    document.getElementById('gameover-screen').classList.remove('hidden');
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
aplicarIdioma();
