// === cadres_draw.js ===
// Gère tous les cadres dynamiques HTML/Canvas de VFind

const DRAW_CADRES = {
  // Mapping direct polaroid_xxx -> fonction de dessin
  "polaroid_990": drawEtoiles,
  "polaroid_991": drawBulles,
  "polaroid_992": drawPixel,
  "polaroid_993": drawNeon,
  "polaroid_994": drawVagues,
  "polaroid_995": drawAquarelle,
  "polaroid_996": drawFeuilles,
  "polaroid_997": drawCosmique,
  "polaroid_998": drawPluie,
  "polaroid_999": drawFlammes,
  // Tu peux aussi garder les anciens noms courts si tu veux les réutiliser ailleurs :
  "etoiles": drawEtoiles,
  "bulles": drawBulles,
  "pixel": drawPixel,
  "neon": drawNeon,
  "vagues": drawVagues,
  "aquarelle": drawAquarelle,
  "feuilles": drawFeuilles,
  "cosmique": drawCosmique,
  "pluie": drawPluie,
  "flammes": drawFlammes
};

// === APERÇU dans boutique ===
export function previewCadre(ctx, id) {
  ctx.clearRect(0, 0, 100, 100);
  if (DRAW_CADRES[id]) DRAW_CADRES[id](ctx, 100, 100, false);
}

// === UTILISÉ POUR PHOTO FINALE ===
export function drawCadre(ctx, id, w = 500, h = 550) {
  if (DRAW_CADRES[id]) DRAW_CADRES[id](ctx, w, h, true);
}

// === Cadres dynamiques ===

function drawEtoiles(ctx, w, h, full) {
  ctx.fillStyle = "#000022";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 50; i++) {
    let x = Math.random() * w;
    let y = Math.random() * h;
    let r = Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(255,255,255,${Math.random()})`;
    ctx.fill();
  }
}

function drawBulles(ctx, w, h, full) {
  ctx.fillStyle = "#e0f7fa";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 20; i++) {
    let x = Math.random() * w;
    let y = Math.random() * h;
    let r = 8 + Math.random() * 12;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fill();
  }
}

function drawPixel(ctx, w, h, full) {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 10) {
    for (let y = 0; y < h; y += 10) {
      if (Math.random() > 0.8) {
        ctx.fillStyle = `hsl(${Math.random() * 360}, 80%, 60%)`;
        ctx.fillRect(x, y, 10, 10);
      }
    }
  }
}

function drawNeon(ctx, w, h, full) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#0ff";
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);
}

function drawVagues(ctx, w, h, full) {
  ctx.fillStyle = "#d0f0ff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#8ecae6";
  for (let y = 0; y < h; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 20) {
      ctx.lineTo(x, y + 5 * Math.sin((x + y) / 20));
    }
    ctx.lineTo(w, y + 20);
    ctx.lineTo(0, y + 20);
    ctx.closePath();
    ctx.fill();
  }
}

function drawAquarelle(ctx, w, h, full) {
  ctx.fillStyle = "#fff4e6";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 60 + Math.random() * 40, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(255, 150, 100, 0.1)`;
    ctx.fill();
  }
}

function drawFeuilles(ctx, w, h, full) {
  ctx.fillStyle = "#edf7ed";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#5a8f49";
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    let x = Math.random() * w;
    let y = Math.random() * h;
    ctx.ellipse(x, y, 8, 18, Math.random() * Math.PI, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function drawCosmique(ctx, w, h, full) {
  let gradient = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, w/2);
  gradient.addColorStop(0, "#5500ff");
  gradient.addColorStop(1, "#000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawPluie(ctx, w, h, full) {
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(200,200,255,0.5)";
  for (let i = 0; i < 50; i++) {
    let x = Math.random() * w;
    let y = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 1, y + 10);
    ctx.stroke();
  }
}

function drawFlammes(ctx, w, h, full) {
  ctx.fillStyle = "#1a0000";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    let x = 50 + Math.random() * (w - 100);
    let y = h - 20 - i * 30;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 10, y - 40, x, y - 80);
    ctx.quadraticCurveTo(x - 10, y - 40, x, y);
    ctx.fillStyle = `rgba(255, ${100 + i * 30}, 0, 0.2)`;
    ctx.fill();
  }
}
