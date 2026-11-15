const bgm = document.getElementById('bgm');
const audioList = new Array('music.mp3', 'Music.mp3', 'music.MP3', 'music.ogg', 'music.m4a', 'music.wav');
let audioIdx = 0;

function tryLoadAudio() {
    if (audioIdx >= audioList.length) return;
    bgm.src = audioList.at(audioIdx++);
}
bgm.onerror = tryLoadAudio;
tryLoadAudio();

function playBgm() {
    if (bgm && bgm.paused && state !== 'win') {
        bgm.volume = 0.6;
        bgm.play().catch(() => {});
    }
}
new Array('click', 'pointerdown', 'keydown').forEach(ev => window.addEventListener(ev, playBgm));

function loadImg(el, name, clean = true) {
    const ex = new Array('.png', '.jpg', '.jpeg', '.webp', '.PNG', '.JPG');
    let i = 0;
    function next() {
        if (i >= ex.length) { el.removeAttribute('src'); return; }
        const src = name + ex.at(i++), img = new Image();
        img.onload = () => {
            if (!clean) { el.src = src; return; }
            try {
                const c = document.createElement('canvas'), cx = c.getContext('2d');
                c.width = img.width; c.height = img.height; cx.drawImage(img, 0, 0);
                const id = cx.getImageData(0, 0, c.width, c.height), d = id.data;
                let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0, ok = false;
                for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
                    const p = (y * c.width + x) * 4;
                    if (d.at(p) > 225 && d.at(p + 1) > 225 && d.at(p + 2) > 225) d.set(new Array(0), p + 3);
                    else if (d.at(p + 3) > 10) { ok = true; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
                }
                cx.putImageData(id, 0, 0);
                if (ok && x1 >= x0 && y1 >= y0) {
                    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
                    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
                    el.src = o.toDataURL();
                } else el.src = c.toDataURL();
            } catch (e) { el.src = src; }
        };
        img.onerror = next; img.src = src;
    }
    next();
}

const boomImg = new Image(), bulImg = new Image(), barImg = new Image();
loadImg(document.getElementById('boss-img'), 'boss');
loadImg(document.getElementById('soul'), 'soul');
loadImg(boomImg, 'boom');
loadImg(bulImg, 'bullet');
loadImg(barImg, 'bar', false);

const bg = document.getElementById('shader-bg'), ctx = bg.getContext('2d');
const resize = () => { bg.width = innerWidth; bg.height = innerHeight; };
window.addEventListener('resize', resize); resize();

let t = 0;
function drawBg() {
    t += 0.025;
    const cx = bg.width / 2, cy = bg.height / 2, maxR = Math.hypot(cx, cy);
    ctx.fillStyle = '#06010d'; ctx.fillRect(0, 0, bg.width, bg.height);
    for (let r = 7; r > 0; r--) {
        let p = (r + (t * 1.4) % 1) / 7, rad = Math.pow(p, 1.5) * maxR * 1.3, ang = t * (r % 2 ? 0.5 : -0.5);
        for (let s = 0; s < 10; s++) {
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, rad, s / 10 * Math.PI * 2 + ang, (s + 1) / 10 * Math.PI * 2 + ang);
            ctx.fillStyle = (s + r) % 2 ? `rgba(12,4,28,${0.6 * p})` : `rgba(60,18,120,${0.35 * p})`; ctx.fill();
        }
    }
    ctx.strokeStyle = 'rgba(190,140,255,0.18)'; ctx.lineWidth = 2;
    for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        for (let x = 0; x <= bg.width; x += 30) {
            let y = cy + Math.sin(x * 0.015 + t * 1.5 + w) * 75;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    requestAnimationFrame(drawBg);
}
drawBg();
const box = document.getElementById('battle-box'), soul = document.getElementById('soul');
const diag = document.getElementById('dialogue-box'), sub = document.getElementById('submenu');
const fg = document.getElementById('fight-minigame'), cur = document.getElementById('cursor-bar');

let hp = 20, bHp = 120, sX = 128, sY = 85, state = 'menu', mult = 1, rage = 1, inv = 0;
let keys = new Map(), bul = new Array(), haz = new Array(), curX = 0, fInt = null, tIv = null;
let items = new Array({ n: "Кукуруза (+12 HP)", h: 12 }, { n: "Порох (+20 HP)", h: 20 });

window.addEventListener('keydown', e => { keys.set(e.code, true); if (e.code === 'KeyZ' || e.code === 'Enter') handleActionPress(); });
window.addEventListener('keyup', e => keys.set(e.code, false));
function handleActionPress() { playBgm(); if (state === 'aim') hitConfirm(); else if (state === 'def') shoot(); }

function openMenu(type) {
    playBgm(); if (state !== 'menu') return;
    sub.style.display = 'none'; fg.style.display = 'none';
    if (type === 'fight') {
        state = 'aim'; fg.style.display = 'flex'; curX = 0;
        diag.textContent = "* Нажми ОГОНЬ (Z) в центре жёлтой зоны!";
        fInt = setInterval(() => { curX += 6; cur.style.left = curX + 'px'; if (curX >= 274) hitConfirm(); }, 16);
    } else if (type === 'act') {
        sub.style.display = 'flex';
        sub.innerHTML = `<button onclick="doAct('chk')">* Осмотреть</button><button onclick="doAct('foc')">* Фокус (x1.5 урон)</button><button onclick="doAct('tnt')">* Дразнить</button>`;
    } else if (type === 'item') {
        if (!items.length) { diag.textContent = "* Рюкзак пуст!"; return; }
        sub.style.display = 'flex';
        sub.innerHTML = items.map((it, i) => `<button onclick="useItem(${i})">* ${it.n}</button>`).join('');
    } else if (type === 'mercy') {
        diag.textContent = "* Цветок не принимает пощаду!"; enemyTurn();
    }
}

function hitConfirm() {
    clearInterval(fInt); fg.style.display = 'none';
    let dist = Math.abs(137 - curX);
    let base = curX >= 274 ? 0 : (dist < 18 ? 35 : (dist < 50 ? 20 : 10));
    let dmg = Math.round(base * mult); mult = 1;

    if (dmg > 0) {
        bHp = Math.max(0, bHp - dmg);
        document.getElementById('boss-hp-fill').style.width = (bHp / 120 * 100) + '%';
        let bi = document.getElementById('boss-img');
        bi.classList.remove('shake'); void bi.offsetWidth; bi.classList.add('shake');
        diag.textContent = `* Нанесено ${dmg} урона!`;
    } else diag.textContent = "* ПРОМАХ!";

    if (bHp <= 0) {
        state = 'win'; clearInterval(tIv); bgm.pause();
        diag.textContent = "* ПОБЕДА! Босс повержен!";
        const bi = document.getElementById('boss-img');
        document.getElementById('boss-hp-wrap').style.display = 'none';
        if (boomImg.src) bi.src = boomImg.src;
        bi.classList.remove('shake'); bi.classList.add('boom-effect');
        setTimeout(() => { document.getElementById('end-screen').style.display = 'flex'; }, 1100);
        return;
    }
    setTimeout(enemyTurn, 800);
}

function doAct(a) {
    sub.style.display = 'none';
    if (a === 'chk') diag.textContent = `* ЦВЕТОК - HP ${bHp}/120. Сбивай полосы выстрелами!`;
    if (a === 'foc') { mult = 1.5; diag.textContent = "* Прицел наведён! Урон следующей атаки x1.5."; }
    if (a === 'tnt') { rage = 1.35; diag.textContent = "* Босс в ярости! Скорость атак выросла."; }
    setTimeout(enemyTurn, 1000);
}

function useItem(i) {
    sub.style.display = 'none';
    let it = items.at(i);
    items = items.filter((_, idx) => idx !== i);
    hp = Math.min(20, hp + it.h); updHp();
    diag.textContent = `* Использовано: ${it.n}`;
    setTimeout(enemyTurn, 900);
}

function enemyTurn() {
    if (state === 'win') return;
    state = 'def'; let step = 0;
    tIv = setInterval(() => {
        if (state === 'win') { clearInterval(tIv); return; }
        step++;
        if (step % 4 === 0) {
            let b = document.createElement('img'); b.className = 'enemy-bar';
            barImg.src ? b.src = barImg.src : b.classList.add('bar-fallback');
            let sx = Math.random() > 0.5 ? 0 : 150;
            b.style.width = '130px'; b.style.left = sx + 'px'; b.style.top = '0px';
            box.appendChild(b);
            haz.push({ el: b, x: sx, y: 0, w: 130, h: 18, vy: 2.8 * rage, brk: true });
        } else {
            let p = document.createElement('div'); p.className = 'enemy-proj';
            let sx = Math.random() * 265;
            p.style.left = sx + 'px'; p.style.top = '0px';
            box.appendChild(p);
            haz.push({ el: p, x: sx, y: 0, w: 12, h: 12, vy: 3.5 * rage, brk: false });
        }
        if (step >= 14) {
            clearInterval(tIv);
            setTimeout(() => {
                if (state === 'win') return;
                state = 'menu'; diag.textContent = "* Ваш ход!";
                haz.forEach(h => h.el.remove()); haz = new Array();
                bul.forEach(b => b.el.remove()); bul = new Array();
            }, 1400);
        }
    }, Math.round(550 / rage));
}

function shoot() {
    if (state !== 'def' || bul.length > 3) return;
    let b = document.createElement('img'); b.className = 'bullet';
    bulImg.src ? b.src = bulImg.src : b.classList.add('bullet-fallback');
    b.style.left = (sX + 6) + 'px'; b.style.top = (sY - 18) + 'px';
    box.appendChild(b);
    bul.push({ el: b, x: sX + 6, y: sY - 18 });
}

function updHp() {
    document.getElementById('hp-fill').style.width = (hp / 20 * 100) + '%';
    document.getElementById('hp-text').textContent = `${hp}/20`;
    if (hp <= 0) { bgm.pause(); alert("GAME OVER!"); location.reload(); }
}

const bind = (id, k) => {
    let b = document.getElementById(id); if (!b) return;
    b.addEventListener('pointerdown', e => { e.preventDefault(); keys.set(k, true); });
    b.addEventListener('pointerup', e => { e.preventDefault(); keys.set(k, false); });
    b.addEventListener('pointerleave', () => keys.set(k, false));
};
bind('btn-up', 'ArrowUp'); bind('btn-down', 'ArrowDown');
bind('btn-left', 'ArrowLeft'); bind('btn-right', 'ArrowRight');

function loop() {
    if (inv > 0 && --inv === 0) soul.classList.remove('blink');
    if (state === 'def') {
        let sp = keys.get('ShiftLeft') ? 2 : 3.5;
        if (keys.get('ArrowLeft') && sX > 0) sX -= sp;
        if (keys.get('ArrowRight') && sX < 248) sX += sp;
        if (keys.get('ArrowUp') && sY > 0) sY -= sp;
        if (keys.get('ArrowDown') && sY < 168) sY += sp;
        soul.style.left = sX + 'px'; soul.style.top = sY + 'px';

        for (let i = bul.length - 1; i >= 0; i--) {
            let b = bul.at(i); b.y -= 7; b.el.style.top = b.y + 'px';
            if (b.y < -25) { b.el.remove(); bul.splice(i, 1); continue; }
            for (let j = haz.length - 1; j >= 0; j--) {
                let h = haz.at(j);
                if (h.brk && b.x < h.x + h.w && b.x + 12 > h.x && b.y < h.y + h.h && b.y + 24 > h.y) {
                    h.el.remove(); haz.splice(j, 1);
                    b.el.remove(); bul.splice(i, 1); break;
                }
            }
        }

        for (let j = haz.length - 1; j >= 0; j--) {
            let h = haz.at(j); h.y += h.vy; h.el.style.top = h.y + 'px';
            if (h.y > 205) { h.el.remove(); haz.splice(j, 1); continue; }
            if (inv === 0 && sX + 4 < h.x + h.w && sX + 20 > h.x && sY + 4 < h.y + h.h && sY + 20 > h.y) {
                hp = Math.max(0, hp - 4); inv = 45;
                soul.classList.add('blink'); updHp();
                if (!h.brk) { h.el.remove(); haz.splice(j, 1); }
            }
        }
    }
    requestAnimationFrame(loop);
}
loop();
