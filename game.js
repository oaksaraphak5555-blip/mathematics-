// ขั้นที่ 1: ตัวละครเดินได้
const TILE = 40, COLS = 9, ROWS = 9;
const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
const player = { x: 4, y: 4 };

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4aa3ff";
  ctx.beginPath();
  ctx.arc(player.x * TILE + TILE / 2, player.y * TILE + TILE / 2, 15, 0, Math.PI * 2);
  ctx.fill();
  document.getElementById("status").textContent =
    "game.js ทำงานแล้ว | ตำแหน่ง " + player.x + "," + player.y;
}

function move(dx, dy) {
  const nx = player.x + dx, ny = player.y + dy;
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;
  player.x = nx;
  player.y = ny;
  draw();
}

document.getElementById("up").onclick = () => move(0, -1);
document.getElementById("down").onclick = () => move(0, 1);
document.getElementById("left").onclick = () => move(-1, 0);
document.getElementById("right").onclick = () => move(1, 0);

window.addEventListener("keydown", e => {
  const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
  if (m) { e.preventDefault(); move(m[0], m[1]); }
});

draw();
