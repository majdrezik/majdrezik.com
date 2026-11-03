// Pixel office: the ten teams as pixel animals at their desks. Status comes from data.json
// (working = typing, reviewing = reading, blocked = red "!", idle = coffee runs), and recent
// messages are acted out: the sender walks to the recipient's desk with a speech bubble.
(() => {
  const W = 400, H = 232, SP = 20;
  const cv = document.getElementById("office-canvas"), tip = document.getElementById("office-tip"), ticker = document.getElementById("office-ticker");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '8px "Silkscreen", monospace';

  const C = {
    wall: "#3a3f78", wallTop: "#575eb0", window: "#8fe3ff", windowHi: "#d6f6ff",
    floorA: "#d9a66b", floorB: "#c99258", corridor: "#9aa3c7", corridorB: "#8d96bc",
    carpetA: "#5a4fb8", carpetB: "#5246ad", desk: "#8a4f24", deskTop: "#b5733a", deskEdge: "#6b3b19",
    monitor: "#1d2033", screenOff: "#2b3150", chair: "#2b2e4a", plant: "#2fbf71", plantDark: "#1f8a50", pot: "#d0643a",
    white: "#ffffff", ink: "#1b1638", shadow: "rgba(20,10,40,.28)", glass: "rgba(160,220,255,.35)",
  };
  const TEAM = {
    owl: { n: "R&D Manager", c: "#ffc93c" }, elephant: { n: "Architect", c: "#a78bfa" }, beaver: { n: "Backend", c: "#ff9f43" },
    fox: { n: "Frontend", c: "#ff6b6b" }, octopus: { n: "DevOps", c: "#ff5fb7" }, dolphin: { n: "Data", c: "#4cc9ff" },
    hawk: { n: "QA", c: "#fb7185" }, spider: { n: "Test Auto", c: "#b6f23d" }, crow: { n: "Code Review", c: "#2dd4bf" }, badger: { n: "Security", c: "#3ee6a8" },
  };
  const ROLE = { owl: "Plans the sprint, decides", elephant: "Design reviews, tech debt", beaver: "API, database, payments", fox: "App screens, languages", octopus: "Deploys, backups, uptime", dolphin: "Metrics and funnels", hawk: "Tests real flows by hand", spider: "Automated test suites", crow: "Reviews every change", badger: "Security and privacy" };
  const FULL = { fox: "Frontend & UX", dolphin: "Data & Analytics", spider: "Test Automation" };

  // Desks: x,y = desk top-left; door = where this zone meets the corridor.
  const DESKS = {
    owl: { x: 30, y: 36, door: { x: 50, iy: 80 } },
    elephant: { x: 132, y: 36, door: { x: 150, iy: 80 } },
    beaver: { x: 22, y: 122, aisle: 12, door: { x: 12, iy: 110 } }, fox: { x: 104, y: 122, aisle: 94, door: { x: 94, iy: 110 } },
    octopus: { x: 22, y: 176, aisle: 12, door: { x: 12, iy: 110 } }, dolphin: { x: 104, y: 176, aisle: 94, door: { x: 94, iy: 110 } },
    hawk: { x: 224, y: 122, aisle: 214, door: { x: 300, iy: 114 } }, spider: { x: 312, y: 122, aisle: 302, door: { x: 300, iy: 114 } },
    crow: { x: 224, y: 176, aisle: 214, door: { x: 300, iy: 114 } }, badger: { x: 312, y: 176, aisle: 302, door: { x: 300, iy: 114 } },
  };
  const CORRIDOR_Y = 98;
  const COFFEE = { x: 362, y: 62, door: { x: 330, iy: 80 } };
  const MAIL = { x: 388, y: 98, door: { x: 388, iy: 98 } };
  const seat = k => ({ x: DESKS[k].x + 18, y: DESKS[k].y + 34 });

  // Pixel sprites made from the 3D animal images: shrink, hard alpha, 1px outline.
  const sprites = {};
  Object.keys(TEAM).forEach(k => {
    const im = new Image();
    im.onload = () => {
      const a = document.createElement("canvas"); a.width = a.height = SP;
      const ax = a.getContext("2d"); ax.imageSmoothingQuality = "high"; ax.drawImage(im, 1, 1, SP - 2, SP - 2);
      const d = ax.getImageData(0, 0, SP, SP), p = d.data, solid = i => p[i * 4 + 3] > 0;
      for (let i = 0; i < SP * SP; i++) {
        p[i * 4 + 3] = p[i * 4 + 3] > 100 ? 255 : 0;
        for (let j = 0; j < 3; j++) p[i * 4 + j] = Math.round(p[i * 4 + j] / 24) * 24; // posterize
      }
      const out = new Uint8ClampedArray(p);
      for (let y = 0; y < SP; y++) for (let x = 0; x < SP; x++) {
        const i = y * SP + x; if (solid(i)) continue;
        const n = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < SP && Y < SP && solid(Y * SP + X); });
        if (n) { out[i * 4] = 27; out[i * 4 + 1] = 22; out[i * 4 + 2] = 56; out[i * 4 + 3] = 255; }
      }
      ax.putImageData(new ImageData(out, SP, SP), 0, 0); sprites[k] = a;
    };
    im.src = "animals/" + ({ hawk: "hawk", crow: "crow", badger: "badger" }[k] || k) + ".png";
  });

  // Characters
  const chars = {};
  Object.keys(TEAM).forEach((k, i) => { const s = seat(k); chars[k] = { k, x: s.x, y: s.y, path: [], status: "idle", task: "", bubble: null, busy: false, phase: i * 0.7, nextIdle: 4 + i * 3 }; });
  let data = { teams: {}, events: [] }, queue = [], qi = 0, nextEvent = 2, now = 0;

  // Way out of a zone: along its aisle (if any) to the door, then into the corridor.
  function exitPts(spot, xy) {
    const d = spot.door, pts = spot.aisle != null ? [{ x: spot.aisle, y: xy.y }, { x: spot.aisle, y: d.iy }] : [{ x: xy.x, y: d.iy }];
    return pts.concat({ x: d.x, y: d.iy }, { x: d.x, y: CORRIDOR_Y });
  }
  const route = (fromXY, fromSpot, toSpot, toXY) => [...exitPts(fromSpot, fromXY), ...exitPts(toSpot, toXY).reverse(), toXY];
  const walk = (c, pts, then) => { c.path = pts.slice(); c.onArrive = then; };
  const say = (c, text, secs, color) => { c.bubble = { text, until: now + secs, color }; };
  const deskSpot = k => DESKS[k];

  function trip(c, targetXY, targetSpot, atTarget, label) {
    c.busy = true;
    const home = seat(c.k), mySpot = deskSpot(c.k);
    walk(c, route({ x: c.x, y: c.y }, mySpot, targetSpot, targetXY), () => {
      atTarget && atTarget();
      setTimeout(() => walk(c, route({ x: c.x, y: c.y }, targetSpot, mySpot, home), () => { c.busy = false; }), 2600);
    });
    if (label) ticker.textContent = label;
  }

  function playEvent(e) {
    const a = key(e.from), b = key(e.to), type = e.type || "note";
    const nm = k => k === "majd" ? "Majd" : (FULL[k] || TEAM[k]?.n || k);
    const label = `${nm(a)} → ${nm(b)} · ${type}${e.ticket ? " · " + e.ticket : ""}`;
    if (a === b && chars[a]) { say(chars[a], type, 3); ticker.textContent = label; return true; }
    if (chars[a] && !chars[a].busy && chars[b]) {
      const s = seat(b);
      trip(chars[a], { x: s.x + 20, y: s.y }, deskSpot(b), () => { say(chars[a], type, 2.6, TEAM[a].c); setTimeout(() => say(chars[b], "ok!", 1.6), 1200); }, label);
      return true;
    }
    if (chars[a] && !chars[a].busy && b === "majd") { trip(chars[a], MAIL, MAIL, () => say(chars[a], type, 2.6, TEAM[a].c), label); return true; }
    if (a === "majd" && chars[b] && !chars[b].busy) { trip(chars[b], MAIL, MAIL, () => say(chars[b], type === "decision" ? "approved!" : type, 2.6, "#ffc93c"), label); return true; }
    return false;
  }
  const key = s => { s = String(s || "").toLowerCase(); if (s.includes("badger")) return "badger"; if (s.includes("majd")) return "majd"; return s.split(/[^a-z]/)[0]; };

  function update(d) {
    data = d || data;
    Object.values(chars).forEach(c => { const t = data.teams?.[c.k] || {}; c.status = t.status || "idle"; c.task = t.task || ""; });
    queue = (data.events || []).slice().sort((x, y) => String(x.time).localeCompare(String(y.time))).slice(-14);
    qi = 0;
  }

  function step(dt) {
    now += dt;
    for (const c of Object.values(chars)) {
      if (c.path.length) {
        const t = c.path[0], dx = t.x - c.x, dy = t.y - c.y, dist = Math.hypot(dx, dy), v = 46 * dt;
        if (dist <= v) { c.x = t.x; c.y = t.y; c.path.shift(); if (!c.path.length && c.onArrive) { const f = c.onArrive; c.onArrive = null; f(); } }
        else { c.x += dx / dist * v; c.y += dy / dist * v; }
      } else if (!c.busy && c.status === "idle" && now > c.nextIdle) {
        c.nextIdle = now + 25 + ((c.phase * 13) % 20);
        trip(c, COFFEE, COFFEE, () => say(c, "coffee", 2.2));
      }
      if (c.bubble && now > c.bubble.until) c.bubble = null;
    }
    if (queue.length && now > nextEvent) {
      for (let tries = 0; tries < queue.length; tries++) { const e = queue[qi++ % queue.length]; if (playEvent(e)) break; }
      nextEvent = now + 5.5;
    }
  }

  // Drawing helpers
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  function floor() {
    R(0, 0, W, H, C.floorA);
    for (let y = 18; y < H; y += 6) for (let x = (y / 6) % 2 ? 0 : 12; x < W; x += 24) R(x, y, 23, 5, C.floorB);
    for (let y = 92; y < 106; y += 4) for (let x = 0; x < W; x += 8) R(x, y, 8, 4, ((x + y) / 4) % 2 ? C.corridor : C.corridorB);
    for (let y = 108; y < H; y += 8) for (let x = 206; x < W; x += 8) R(x, y, 8, 8, ((x + y) / 8) % 2 ? C.carpetA : C.carpetB);
    // team rugs in the open space
    ["beaver", "fox", "octopus", "dolphin"].forEach(k => { const d = DESKS[k]; ctx.globalAlpha = .28; R(d.x - 6, d.y - 4, 50, 46, TEAM[k].c); ctx.globalAlpha = 1; });
  }
  function walls() {
    R(0, 0, W, 16, C.wall); R(0, 14, W, 2, C.wallTop);
    for (let x = 14; x < W - 20; x += 46) { R(x, 3, 22, 9, C.window); R(x + 2, 4, 6, 2, C.windowHi); R(x + 10, 3, 1, 9, C.wall); }
    const v = (x, y1, y2) => R(x, y1, 4, y2 - y1, C.wall), hz = (x1, x2, y) => R(x1, y, x2 - x1, 4, C.wall);
    v(98, 16, 90); v(198, 16, 90); v(298, 16, 90);
    hz(0, 42, 88); hz(58, 142, 88); hz(158, 242, 88); hz(258, 322, 88); hz(338, W, 88);
    v(200, 106, H); hz(200, 292, 106); hz(308, W, 106);
    // glass on Owl's office
    ctx.fillStyle = C.glass; ctx.fillRect(4, 86, 36, 2);
    R(396, 92, 4, 14, "#ffc93c"); // front door
  }
  function furniture(t) {
    // whiteboard in Elephant's room
    R(110, 18, 40, 14, "#f2f4ff"); R(110, 31, 40, 2, "#9aa3c7"); R(114, 21, 14, 1, "#a78bfa"); R(114, 24, 22, 1, "#4cc9ff"); R(114, 27, 10, 1, "#ff6b6b"); R(130, 22, 6, 6, "#ffc93c");
    // meeting room
    R(216, 40, 64, 22, C.deskEdge); R(216, 38, 64, 22, C.deskTop);
    for (let i = 0; i < 4; i++) { R(222 + i * 15, 31, 8, 6, C.chair); R(222 + i * 15, 63, 8, 6, C.chair); }
    R(214, 18, 30, 12, "#2b3150"); R(216, 20, 26, 8, "#4cc9ff"); R(218, 22, 12, 1, C.white); // TV
    // kitchen
    R(352, 20, 18, 26, "#d8dcef"); R(354, 24, 14, 2, "#9aa3c7"); R(372, 20, 22, 30, "#eef1fb"); R(372, 33, 22, 1, "#9aa3c7"); R(390, 24, 2, 6, "#9aa3c7");
    R(356, 34, 10, 6, C.ink); R(359, 30 - Math.round((Math.sin(t * 3) + 1)), 1, 3, "rgba(255,255,255,.6)");
    R(308, 60, 34, 14, "#ff5fb7"); R(308, 56, 34, 6, "#e04a9e"); // sofa
    // server rack by Octopus
    R(170, 112, 20, 40, "#1d2033"); for (let i = 0; i < 6; i++) { R(172, 115 + i * 6, 16, 4, "#2b3150"); R(184, 116 + i * 6, 2, 2, (Math.floor(t * 4) + i) % 3 ? "#3ee6a8" : "#ff6b6b"); }
    // bookshelf in auditors' room
    R(370, 112, 26, 36, "#6b3b19"); ["#ff6b6b", "#4cc9ff", "#ffc93c", "#3ee6a8", "#a78bfa", "#ff9f43"].forEach((c, i) => R(373 + (i % 3) * 7, 115 + Math.floor(i / 3) * 16, 5, 12, c));
    // plants
    [[6, 22], [84, 22], [184, 160], [6, 214], [384, 214], [204, 214], [290, 20]].forEach(([x, y]) => { R(x + 2, y + 8, 8, 7, C.pot); R(x, y, 12, 9, C.plant); R(x + 3, y - 3, 6, 5, C.plantDark); });
    // mailbox for Majd
    R(380, 86, 10, 8, "#ffc93c"); R(382, 88, 6, 1, C.ink);
    ctx.font = FONT; ctx.fillStyle = C.ink; ctx.fillText("MAJD", 362, 85);
  }
  function desk(k, t) {
    const d = DESKS[k], c = chars[k], atDesk = Math.hypot(c.x - seat(k).x, c.y - seat(k).y) < 1;
    R(d.x, d.y + 6, 36, 14, C.deskEdge); R(d.x, d.y + 4, 36, 12, C.deskTop); R(d.x + 2, d.y + 18, 3, 6, C.deskEdge); R(d.x + 31, d.y + 18, 3, 6, C.deskEdge);
    R(d.x + 9, d.y - 8, 18, 13, C.monitor); R(d.x + 16, d.y + 5, 4, 2, C.monitor);
    const sx = d.x + 10, sy = d.y - 7;
    if (atDesk && c.status === "working") {
      R(sx, sy, 16, 11, "#10142a");
      for (let i = 0; i < 4; i++) { const w = 3 + ((Math.floor(t * 6) + i * 5 + k.length) % 10); R(sx + 1, sy + 1 + i * 2.5, w, 1, [TEAM[k].c, "#4cc9ff", "#3ee6a8", "#ffffff"][i]); }
    } else if (atDesk && c.status === "reviewing") {
      R(sx, sy, 16, 11, "#f2f4ff"); for (let i = 0; i < 4; i++) R(sx + 2, sy + 2 + i * 2, 11 - (i % 2) * 4, 1, "#9aa3c7"); R(sx + 10, sy + 6, 4, 4, "#ffc93c");
    } else R(sx, sy, 16, 11, C.screenOff);
    R(d.x + 4, d.y + 8, 6, 3, "#e8e8f5"); // keyboard/papers
    R(d.x + 26, d.y + 7, 4, 4, TEAM[k].c); // mug in team colour
    R(d.x + 12, d.y + 26, 12, 10, C.chair);
  }
  function character(c, t) {
    const sp = sprites[c.k], moving = c.path.length > 0;
    const bob = moving ? Math.round(Math.abs(Math.sin(t * 10 + c.phase)) * -2) : (c.status === "working" ? Math.round(Math.sin(t * 8 + c.phase)) * 0.5 : 0);
    const x = Math.round(c.x - SP / 2), y = Math.round(c.y - SP + bob);
    ctx.fillStyle = C.shadow; ctx.beginPath(); ctx.ellipse(c.x, c.y, 8, 3, 0, 0, 7); ctx.fill();
    if (sp) ctx.drawImage(sp, x, y);
    if (moving) { const f = Math.floor(t * 8) % 2; R(c.x - 4, c.y - 1 + f, 3, 2, "#1b1638"); R(c.x + 1, c.y - f, 3, 2, "#1b1638"); }
    if (!moving && c.status === "blocked" && Math.floor(t * 2) % 2) { R(c.x - 2, y - 12, 4, 8, "#ff4d4d"); R(c.x - 2, y - 3, 4, 2, "#ff4d4d"); }
    ctx.font = FONT; const nm = TEAM[c.k].n, w = ctx.measureText(nm).width;
    const lx = Math.round(Math.min(W - w - 3, Math.max(3, c.x - w / 2)));
    R(lx - 2, c.y + 3, w + 4, 9, "rgba(27,22,56,.82)"); ctx.fillStyle = TEAM[c.k].c; ctx.fillText(nm, lx, c.y + 10);
    if (c.bubble) {
      ctx.font = FONT; const bw = ctx.measureText(c.bubble.text).width + 8, bx = Math.round(Math.min(W - bw - 2, Math.max(2, c.x - bw / 2))), by = y - 16;
      R(bx, by, bw, 12, C.ink); R(bx + 1, by + 1, bw - 2, 10, c.bubble.color || C.white); R(Math.round(c.x) - 1, by + 12, 3, 3, C.ink);
      ctx.fillStyle = C.ink; ctx.fillText(c.bubble.text, bx + 4, by + 9);
    }
  }

  let S = 2;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    S = Math.max(1, Math.min(6, Math.ceil(cv.clientWidth * dpr / W)));
    cv.width = W * S; cv.height = H * S;
  }
  function draw(t) {
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false;
    floor(); walls(); furniture(t);
    Object.keys(DESKS).forEach(k => desk(k, t));
    Object.values(chars).sort((a, b) => a.y - b.y).forEach(c => character(c, t));
  }
  let last = performance.now();
  function frame(ts) {
    const dt = Math.min(.05, (ts - last) / 1000); last = ts;
    step(dt); draw(now);
    if (!still) requestAnimationFrame(frame);
  }

  cv.addEventListener("pointermove", e => {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    const hit = Object.values(chars).find(c => Math.abs(c.x - x) < 11 && y > c.y - SP && y < c.y + 10);
    if (!hit) { tip.hidden = true; cv.style.cursor = ""; return; }
    cv.style.cursor = "pointer";
    tip.replaceChildren();
    const b = document.createElement("b"); b.textContent = FULL[hit.k] || TEAM[hit.k].n; b.style.color = TEAM[hit.k].c;
    const s = document.createElement("span"); s.textContent = `${ROLE[hit.k]} · ${hit.status}`;
    const p = document.createElement("p"); p.textContent = hit.task || "No current task";
    tip.append(b, s, p); tip.hidden = false;
    const box = cv.parentElement.getBoundingClientRect();
    tip.style.left = Math.min(box.width - 230, Math.max(0, e.clientX - box.left + 12)) + "px";
    tip.style.top = (e.clientY - box.top + 12) + "px";
  });
  cv.addEventListener("pointerleave", () => { tip.hidden = true; });

  resize(); addEventListener("resize", resize);
  if (still) { setInterval(() => { now += 1; draw(now); }, 1000); draw(0); } else requestAnimationFrame(frame);
  window.office = { update };
})();
