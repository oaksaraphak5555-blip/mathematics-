// ===== ตัวแปรหลัก (เหมือน Global variables ใน GDevelop) =====
const state = {
  playerHP: 30, playerMaxHP: 30, playerAtk: 5,
  level: 1, xp: 0, coins: 0,
  isBoss: 0,
  enemyHP: 20, enemyMaxHP: 20,
  turn: "player",
  inBattle: false, busy: false
};

// ===== แผนที่ =====
const TILE = 40, COLS = 9, ROWS = 9;
const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
let player = { x: 4, y: 4 };
let coins = [], slimes = [], boss = null;

function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function freeCell() {
  while (true) {
    const p = { x: rand(0, COLS - 1), y: rand(0, ROWS - 1) };
    if (p.x === player.x && p.y === player.y) continue;
    if (coins.concat(slimes, boss ? [boss] : []).some(o => o.x === p.x && o.y === p.y)) continue;
    return p;
  }
}

function spawnWorld() {
  coins = []; slimes = []; boss = null;
  for (let i = 0; i < 6; i++) coins.push(freeCell());
  for (let i = 0; i < 3; i++) slimes.push(freeCell());
  boss = freeCell();
}

// ===== วาด =====
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "30px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const put = (o, e) => ctx.fillText(e, o.x * TILE + TILE / 2, o.y * TILE + TILE / 2 + 2);
  coins.forEach(c => put(c, "🪙"));
  slimes.forEach(s => put(s, "🟢"));
  if (boss) put(boss, "👹");
  put(player, "🧑");
  document.getElementById("hudHP").textContent = `HP ${state.playerHP}/${state.playerMaxHP}`;
  document.getElementById("hudLv").textContent = `Lv ${state.level} (XP ${state.xp}/20)`;
  document.getElementById("hudCoin").textContent = `🪙 ${state.coins}`;
}

// ===== เสียงเก็บเหรียญ (สุ่ม pitch เหมือน CoinPitch) =====
let audioCtx;
function coinSound() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 880 * (0.8 + Math.random() * 0.2);
    o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    o.start(); o.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

// ===== เดิน =====
function move(dx, dy) {
  if (state.inBattle) return;
  const nx = player.x + dx, ny = player.y + dy;
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;
  player.x = nx; player.y = ny;

  const ci = coins.findIndex(c => c.x === nx && c.y === ny);
  if (ci >= 0) { coins.splice(ci, 1); state.coins++; coinSound(); }

  const si = slimes.findIndex(s => s.x === nx && s.y === ny);
  if (si >= 0) { slimes.splice(si, 1); startBattle(0); }
  else if (boss && boss.x === nx && boss.y === ny) { boss = null; startBattle(1); }

  if (coins.length === 0) for (let i = 0; i < 6; i++) coins.push(freeCell());
  draw();
}

document.querySelectorAll("#dpad button").forEach(b => {
  b.addEventListener("click", () => {
    const d = b.dataset.d;
    move(d === "left" ? -1 : d === "right" ? 1 : 0, d === "up" ? -1 : d === "down" ? 1 : 0);
  });
});
window.addEventListener("keydown", e => {
  const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
              w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[e.key];
  if (m) { e.preventDefault(); move(m[0], m[1]); }
});

// ===== ต่อสู้ =====
const $ = id => document.getElementById(id);
const battleEl = $("battle");

function enemyName() { return state.isBoss ? "Boss" : "Slime"; }

function updateBattleUI() {
  $("heroHPText").textContent = `Hero HP: ${state.playerHP}/${state.playerMaxHP}`;
  $("enemyHPText").textContent = `${enemyName()} HP: ${Math.max(0, state.enemyHP)}/${state.enemyMaxHP}`;
  const off = state.turn !== "player" || state.busy;
  ["attackBtn", "healBtn", "fleeBtn"].forEach(id => $(id).disabled = off);
}

function say(t) { $("battleText").textContent = t; }

function startBattle(isBoss) {
  state.inBattle = true; state.busy = false;
  state.isBoss = isBoss;
  state.enemyMaxHP = isBoss ? 50 : 20;
  state.enemyHP = state.enemyMaxHP;
  state.turn = "player";
  $("enemyIcon").textContent = isBoss ? "👹" : "🟢";
  say(isBoss ? "บอสมาแล้ว! HP 50!" : "เทิร์นของคุณ! โจมตีเลย!");
  battleEl.classList.remove("hidden");
  updateBattleUI();
}

function endBattle() {
  state.inBattle = false; state.busy = false;
  battleEl.classList.add("hidden");
  draw();
}

function enemyTurn() {
  state.turn = "enemy"; updateBattleUI();
  setTimeout(() => {
    state.playerHP -= rand(3, 6);
    say(`${enemyName()} โจมตีกลับ!`);
    state.turn = "player";
    updateBattleUI();
    checkLose();
  }, 1000);
}

function checkLose() {
  if (state.playerHP <= 0 && !state.busy) {
    state.playerHP = 0; state.busy = true;
    say("แพ้... กลับไปเริ่มใหม่");
    updateBattleUI();
    setTimeout(() => {
      state.playerHP = state.playerMaxHP;
      state.isBoss = 0;
      player = { x: 4, y: 4 };
      spawnWorld(); endBattle();
    }, 1500);
  }
}

function checkWin() {
  if (state.enemyHP <= 0 && !state.busy) {
    state.enemyHP = 0; state.busy = true;
    state.xp += 10;
    say("ชนะ! ได้ XP +10");
    updateBattleUI();
    setTimeout(() => {
      if (state.xp >= 20) {
        state.level++; state.playerAtk += 2; state.playerMaxHP += 5;
        state.playerHP = state.playerMaxHP; state.xp = 0;
      }
      if (state.isBoss) alert("ปราบบอสได้แล้ว! คุณชนะเกม!");
      state.isBoss = 0;
      endBattle();
    }, 1500);
    return true;
  }
  return false;
}

$("attackBtn").addEventListener("click", () => {
  if (state.turn !== "player" || state.busy) return;
  state.enemyHP -= state.playerAtk + rand(0, 3);
  say(`โจมตี! ${enemyName()} โดนดาเมจ!`);
  updateBattleUI();
  if (!checkWin()) enemyTurn();
});

$("healBtn").addEventListener("click", () => {
  if (state.turn !== "player" || state.busy) return;
  if (state.playerHP >= state.playerMaxHP) { say("HP เต็มอยู่แล้ว"); return; }
  state.playerHP = Math.min(state.playerMaxHP, state.playerHP + 8);
  say("ใช้ยา! ฟื้น HP +8");
  updateBattleUI();
  enemyTurn();
});

$("fleeBtn").addEventListener("click", () => {
  if (state.turn !== "player" || state.busy) return;
  endBattle();
});

// ===== เริ่มเกม =====
spawnWorld();
draw();

