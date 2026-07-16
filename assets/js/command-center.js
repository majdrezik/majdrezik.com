/**
 * Majd Rezik — DevOps Command Center
 * Boot sequence, topology canvas, metrics, skill graph, majd-bot
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /*  Topology network canvas                                            */
  /* ------------------------------------------------------------------ */
  function initTopology() {
    const canvas = document.getElementById("topology-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let w, h, nodes, racks, raf;
    const NODE_COUNT = 48;
    const MAX_DIST = 140;
    const GREEN = "0, 255, 157";
    const CYAN = "0, 212, 255";
    const AMBER = "245, 166, 35";

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = canvas.width = rect.width * (window.devicePixelRatio || 1);
      h = canvas.height = rect.height * (window.devicePixelRatio || 1);
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      w = rect.width;
      h = rect.height;
    }

    /* ---- Data-center racks — right side only (keep text clear) ---- */
    function createServers() {
      racks = [];
      const now = performance.now();

      // On narrow screens the copy spans the width — skip racks to avoid clutter
      if (w < 720) {
        racks._aisles = [];
        return;
      }

      // Racks live only in the right gutter, clear of the left-aligned hero copy
      const zoneL = Math.max(w * 0.55, w - 420);
      const zoneR = w - 12;

      // Depth rows: farther = smaller, dimmer, higher up
      const rows = [
        { scale: 0.52, alpha: 0.38, yFrac: 0.16, cols: 4 },
        { scale: 0.66, alpha: 0.52, yFrac: 0.30, cols: 4 },
        { scale: 0.82, alpha: 0.7, yFrac: 0.44, cols: 3 },
        { scale: 0.98, alpha: 0.88, yFrac: 0.58, cols: 3 },
        { scale: 1.12, alpha: 1.0, yFrac: 0.74, cols: 2 },
      ];

      function buildRack(x, y, rackW, rackH, depthAlpha) {
        const units = Math.max(5, Math.round(rackH / 20));
        const unitH = (rackH - 10) / units;
        const leds = [];
        for (let u = 0; u < units; u++) {
          const uy = y + 5 + u * unitH + unitH / 2;
          const ledCount = 3 + Math.floor(Math.random() * 3);
          for (let l = 0; l < ledCount; l++) {
            const roll = Math.random();
            const color = roll > 0.88 ? AMBER : roll > 0.5 ? CYAN : GREEN;
            leds.push({
              x: x + 7 + l * Math.max(5.5, rackW * 0.09),
              y: uy,
              color,
              on: Math.random() > 0.4,
              next: now + 200 + Math.random() * 2400,
              level: Math.random(),
              r: Math.max(1.3, 1.7 * (rackW / 70)),
            });
          }
          leds.push({
            x: x + rackW - Math.max(11, rackW * 0.16),
            y: uy,
            color: Math.random() > 0.65 ? CYAN : GREEN,
            on: Math.random() > 0.3,
            next: now + 150 + Math.random() * 1400,
            level: Math.random(),
            bar: true,
            barW: Math.max(5, rackW * 0.11),
          });
        }
        racks.push({
          x, y, w: rackW, h: rackH, units, unitH, leds, depthAlpha,
        });
      }

      for (const row of rows) {
        const baseW = 52 * row.scale;
        const baseH = 118 * row.scale;
        const gap = 8 + 6 * row.scale;
        const y = h * row.yFrac;

        // Pack columns from the right edge leftward, stop at the text zone
        for (let i = 0; i < row.cols; i++) {
          const x = zoneR - baseW - i * (baseW + gap);
          if (x < zoneL) break;
          buildRack(x, y, baseW, baseH, row.alpha);
        }
      }

      racks._aisles = [
        { x1: zoneL + 8, y: h * 0.88, x2: zoneR },
        { x1: zoneL + 20, y: h * 0.55, x2: zoneR },
        { x1: zoneL + 32, y: h * 0.38, x2: zoneR },
      ];
    }

    function drawServers(now) {
      if (racks._aisles) {
        for (const a of racks._aisles) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${GREEN}, 0.07)`;
          ctx.lineWidth = 1;
          ctx.moveTo(a.x1, a.y);
          ctx.lineTo(a.x2, a.y);
          ctx.stroke();
        }
      }

      for (const rack of racks) {
        if (!rack.leds) continue;
        const da = rack.depthAlpha;

        ctx.fillStyle = `rgba(6, 12, 18, ${0.45 * da})`;
        ctx.fillRect(rack.x, rack.y, rack.w, rack.h);

        ctx.strokeStyle = `rgba(${GREEN}, ${0.2 * da})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(rack.x, rack.y, rack.w, rack.h);

        ctx.fillStyle = `rgba(${CYAN}, ${0.12 * da})`;
        ctx.fillRect(rack.x, rack.y, rack.w, 2);

        ctx.strokeStyle = `rgba(${GREEN}, ${0.1 * da})`;
        for (let u = 1; u < rack.units; u++) {
          const uy = rack.y + 5 + u * rack.unitH;
          ctx.beginPath();
          ctx.moveTo(rack.x + 2, uy);
          ctx.lineTo(rack.x + rack.w - 2, uy);
          ctx.stroke();
        }

        for (const led of rack.leds) {
          if (now >= led.next) {
            led.on = !led.on;
            led.next = now + (led.on ? 400 + Math.random() * 2200 : 160 + Math.random() * 1000);
          }
          const target = led.on ? 1 : 0.08;
          led.level += (target - led.level) * 0.1;

          const a = (0.22 + led.level * 0.85) * da;
          if (led.bar) {
            const bw = led.barW || 7;
            ctx.fillStyle = `rgba(${led.color}, ${a})`;
            ctx.fillRect(led.x, led.y - 1.4, bw, 2.8);
            if (led.level > 0.45) {
              ctx.fillStyle = `rgba(${led.color}, ${(led.level - 0.45) * 0.4 * da})`;
              ctx.fillRect(led.x - 1.5, led.y - 3, bw + 3, 6);
            }
          } else {
            const r = led.r || 1.6;
            ctx.beginPath();
            ctx.fillStyle = `rgba(${led.color}, ${a})`;
            ctx.arc(led.x, led.y, r, 0, Math.PI * 2);
            ctx.fill();
            if (led.level > 0.35) {
              ctx.beginPath();
              ctx.fillStyle = `rgba(${led.color}, ${(led.level - 0.35) * 0.28 * da})`;
              ctx.arc(led.x, led.y, r * 3.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    function createNodes() {
      nodes = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 2 + 1.2,
          pulse: Math.random() * Math.PI * 2,
          accent: Math.random() > 0.7,
        });
      }
    }

    // Packet particles traveling along edges
    const packets = [];

    function spawnPacket(a, b) {
      if (packets.length > 20) return;
      packets.push({
        a, b,
        t: 0,
        speed: 0.004 + Math.random() * 0.008,
        accent: Math.random() > 0.5,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Server racks sit behind the mesh
      drawServers(performance.now());

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.35;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${GREEN}, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            if (Math.random() < 0.0008) spawnPacket(a, b);
          }
        }
      }

      // Packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += p.speed;
        if (p.t >= 1) {
          packets.splice(i, 1);
          continue;
        }
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.beginPath();
        ctx.fillStyle = p.accent
          ? `rgba(${CYAN}, 0.9)`
          : `rgba(${GREEN}, 0.9)`;
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.pulse += 0.03;

        const glow = 0.5 + Math.sin(n.pulse) * 0.3;
        const color = n.accent ? CYAN : GREEN;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${color}, ${glow})`;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(${color}, 0.12)`;
        ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    createNodes();
    createServers();
    draw();

    window.addEventListener("resize", () => {
      resize();
      createNodes();
      createServers();
    });

    // Pause when tab hidden
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(draw);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Boot sequence typewriter                                           */
  /* ------------------------------------------------------------------ */
  function initBootSequence() {
    const log = document.getElementById("boot-log");
    const rolesEl = document.getElementById("hero-roles");
    if (!log) return;

    const lines = [
      { text: "[INFO]  Initializing Majd Rezik Ecosystem...", cls: "info", delay: 0 },
      { text: "[OK]    Kernel modules loaded — DevOps core online", cls: "ok", delay: 600 },
      { text: "[OK]    Cloud topology mesh established", cls: "ok", delay: 1100 },
      { text: "[WARN]  Scanning for opportunity vectors...", cls: "warn", delay: 1600 },
      { text: "[OK]    Identity hybrid resolved. Systems ready.", cls: "ok", delay: 2200 },
    ];

    lines.forEach((line) => {
      setTimeout(() => {
        const div = document.createElement("div");
        div.className = `line ${line.cls}`;
        div.textContent = line.text;
        log.appendChild(div);
      }, line.delay);
    });

    // Role typewriter after boot
    const roles = [
      "DevOps Engineer",
      "Software Architect",
      "Entrepreneur",
    ];

    setTimeout(() => {
      if (!rolesEl) return;
      let roleIdx = 0;
      let charIdx = 0;
      let deleting = false;
      let display = ["", "", ""];

      // Show all roles with separators, type them sequentially once then cycle highlight
      rolesEl.innerHTML = "";
      const spans = roles.map((r, i) => {
        const s = document.createElement("span");
        s.className = "role";
        s.dataset.full = r;
        rolesEl.appendChild(s);
        if (i < roles.length - 1) {
          const sep = document.createElement("span");
          sep.className = "sep";
          sep.textContent = "|";
          rolesEl.appendChild(sep);
        }
        return s;
      });
      const cursor = document.createElement("span");
      cursor.className = "cursor";
      rolesEl.appendChild(cursor);

      function typeAll(idx) {
        if (idx >= roles.length) {
          // Done initial type — keep cursor blinking
          return;
        }
        const span = spans[idx];
        const full = roles[idx];
        let i = 0;
        function tick() {
          if (i <= full.length) {
            span.textContent = full.slice(0, i);
            i++;
            setTimeout(tick, 35);
          } else {
            setTimeout(() => typeAll(idx + 1), 200);
          }
        }
        tick();
      }
      typeAll(0);
    }, 2800);
  }

  /* ------------------------------------------------------------------ */
  /*  Metric counters + sparklines                                       */
  /* ------------------------------------------------------------------ */
  function initMetrics() {
    const cards = document.querySelectorAll(".metric-card[data-count]");
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const card = entry.target;
          if (card.dataset.counted) return;
          card.dataset.counted = "1";
          animateCount(card);
          observer.unobserve(card);
        });
      },
      { threshold: 0.4 }
    );

    cards.forEach((c) => observer.observe(c));
  }

  function animateCount(card) {
    const el = card.querySelector("[data-target]");
    if (!el) return;
    const target = parseInt(el.dataset.target, 10);
    const duration = 1400;
    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /*  Skill topology hover interdependencies                             */
  /* ------------------------------------------------------------------ */
  function initSkillTopology() {
    const layers = document.querySelectorAll(".skill-layer");
    const nodes = document.querySelectorAll(".skill-node");
    if (!nodes.length) return;

    // Connection map: skill id -> related skill ids
    const links = {
      git: ["ci", "cd", "config", "gha", "bash"],
      linux: ["bash", "nginx", "docker", "network", "security"],
      bash: ["linux", "git", "deploy", "ci"],
      ci: ["git", "containers", "cd", "teamcity", "gha", "artifact"],
      teamcity: ["ci", "cd", "deploy", "artifact"],
      gha: ["ci", "git", "cd", "deploy"],
      config: ["git", "orch", "aws", "ansible", "terraform"],
      ansible: ["config", "linux", "deploy", "terraform"],
      terraform: ["aws", "azure", "orch", "config", "ansible", "iam"],
      network: ["monitor", "aws", "security", "nginx", "ssl"],
      security: ["network", "aws", "config", "ssl", "iam"],
      ssl: ["security", "nginx", "network"],
      deploy: ["cd", "containers", "orch", "aws", "artifact"],
      artifact: ["ci", "cd", "deploy", "teamcity"],
      containers: ["ci", "orch", "deploy", "docker", "k8s", "compose", "microservices"],
      docker: ["containers", "k8s", "ci", "compose"],
      compose: ["docker", "containers", "microservices"],
      k8s: ["containers", "orch", "docker", "monitor", "microservices"],
      microservices: ["k8s", "containers", "api", "docker"],
      orch: ["containers", "config", "aws", "k8s", "terraform"],
      aws: ["orch", "deploy", "monitor", "network", "iam", "terraform", "azure"],
      azure: ["aws", "orch", "deploy", "monitor", "terraform", "iam"],
      iam: ["aws", "azure", "security", "terraform", "network"],
      nginx: ["network", "ssl", "linux", "deploy"],
      monitor: ["aws", "network", "analytics", "grafana", "elk"],
      grafana: ["monitor", "analytics", "elk"],
      elk: ["monitor", "grafana", "analytics"],
      analytics: ["monitor", "grafana", "elk"],
      js: ["python", "java", "fullstack", "nodejs", "react"],
      nodejs: ["js", "api", "fullstack", "react"],
      react: ["js", "nodejs", "fullstack"],
      python: ["js", "java", "fullstack", "api"],
      java: ["js", "python", "fullstack", "api"],
      sql: ["api", "fullstack", "python", "java"],
      api: ["fullstack", "nodejs", "microservices", "sql"],
      fullstack: ["js", "python", "java", "git", "nodejs", "react", "api"],
      cd: ["ci", "deploy", "teamcity", "git", "gha"],
      agile: ["comms", "product", "saleseng"],
      comms: ["writing", "saleseng", "agile"],
      saleseng: ["comms", "entrepreneur", "product", "writing"],
      entrepreneur: ["product", "saleseng", "writing"],
      product: ["entrepreneur", "agile", "fullstack"],
      writing: ["comms", "saleseng", "entrepreneur"],
    };

    nodes.forEach((node) => {
      node.addEventListener("mouseenter", () => {
        const id = node.dataset.skill;
        const related = links[id] || [];

        nodes.forEach((n) => {
          const nid = n.dataset.skill;
          if (nid === id || related.includes(nid)) {
            n.classList.add("lit");
            n.classList.remove("dimmed");
            n.closest(".skill-layer")?.classList.add("active");
          } else {
            n.classList.add("dimmed");
            n.classList.remove("lit");
          }
        });

        // Highlight connected layers
        layers.forEach((layer) => {
          const hasLit = layer.querySelector(".skill-node.lit");
          layer.classList.toggle("active", !!hasLit);
        });
      });

      node.addEventListener("mouseleave", () => {
        nodes.forEach((n) => {
          n.classList.remove("lit", "dimmed");
        });
        layers.forEach((l) => l.classList.remove("active"));
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Nav + scroll                                                       */
  /* ------------------------------------------------------------------ */
  function initNav() {
    const burger = document.getElementById("nav-burger");
    const mobile = document.getElementById("nav-mobile");
    const links = document.querySelectorAll(".cc-nav__links a, .cc-nav__mobile a");
    const backTop = document.querySelector(".back-to-top");
    const uptimeEl = document.getElementById("uptime");

    burger?.addEventListener("click", () => {
      mobile?.classList.toggle("open");
    });

    links.forEach((a) => {
      a.addEventListener("click", () => {
        mobile?.classList.remove("open");
      });
    });

    // Active section highlighting
    const sections = document.querySelectorAll("section[id]");
    function onScroll() {
      const y = window.scrollY + 120;
      sections.forEach((sec) => {
        const top = sec.offsetTop;
        const bottom = top + sec.offsetHeight;
        const id = sec.id;
        const link = document.querySelector(`.cc-nav__links a[href="#${id}"]`);
        if (link) {
          link.classList.toggle("active", y >= top && y < bottom);
        }
      });

      if (backTop) {
        backTop.classList.toggle("visible", window.scrollY > 400);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Fake uptime counter
    if (uptimeEl) {
      const start = Date.now();
      setInterval(() => {
        const s = Math.floor((Date.now() - start) / 1000);
        const h = String(Math.floor(s / 3600)).padStart(2, "0");
        const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
        const sec = String(s % 60).padStart(2, "0");
        uptimeEl.textContent = `${h}:${m}:${sec}`;
      }, 1000);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Reveal on scroll                                                   */
  /* ------------------------------------------------------------------ */
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => obs.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /*  Reviews expand (show more)                                         */
  /* ------------------------------------------------------------------ */
  function initReviews() {
    const btn = document.getElementById("reviews-more-btn");
    const hidden = document.querySelectorAll(".review-card.is-hidden");
    if (!btn || !hidden.length) return;

    btn.addEventListener("click", () => {
      hidden.forEach((c) => {
        c.classList.remove("is-hidden");
        c.style.display = "";
      });
      btn.remove();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  majd-bot v1.0 terminal                                             */
  /* ------------------------------------------------------------------ */
  function initBot() {
    const fab = document.getElementById("bot-fab");
    const terminal = document.getElementById("bot-terminal");
    const closeBtn = document.getElementById("bot-close");
    const output = document.getElementById("bot-output");
    const input = document.getElementById("bot-input");
    const promptBtns = document.querySelectorAll(".bot-prompt-btn");

    if (!fab || !terminal || !output) return;

    let booted = false;

    function lockInput() {
      if (!input) return;
      input.setAttribute("readonly", "");
      input.setAttribute("inputmode", "none");
      input.blur();
    }

    function unlockInput() {
      if (!input) return;
      input.removeAttribute("readonly");
      input.setAttribute("inputmode", "text");
      input.focus({ preventScroll: true });
    }

    function open() {
      terminal.classList.add("open");
      // Keep input locked so prompt taps never summon the mobile keyboard
      lockInput();
      if (!booted) {
        booted = true;
        print("sys", "majd-bot v1.0 — profile query interface");
        print("ok", "Session established. Tap a prompt below, or type a command.");
        print("cyan", "Available: /help  /skills  /experience  /about  /contact  /clear");
      }
    }

    function close() {
      terminal.classList.remove("open");
      lockInput();
    }

    fab.addEventListener("click", () => {
      if (terminal.classList.contains("open")) close();
      else open();
    });
    closeBtn?.addEventListener("click", close);

    // Explicit tap on the input row = user wants to type → allow keyboard
    const inputRow = input?.closest(".bot-terminal__input-row");
    inputRow?.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      unlockInput();
    });
    // If anything tries to focus the locked field, bounce focus away
    input?.addEventListener("focus", () => {
      if (input.hasAttribute("readonly")) {
        input.blur();
      }
    });

    function print(cls, text) {
      const line = document.createElement("div");
      line.className = `log-line ${cls}`;
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    function printHTML(cls, html) {
      const line = document.createElement("div");
      line.className = `log-line ${cls}`;
      line.innerHTML = html;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    function typeLines(lines, delay = 40) {
      return new Promise((resolve) => {
        let i = 0;
        function next() {
          if (i >= lines.length) {
            resolve();
            return;
          }
          const [cls, text] = lines[i++];
          print(cls, text);
          setTimeout(next, delay);
        }
        next();
      });
    }

    const commands = {
      "/help": async () => {
        await typeLines([
          ["cyan", "── COMMAND REFERENCE ──────────────────────"],
          ["sys", "  /skills      Tech stack & architecture layers"],
          ["sys", "  /experience  Career timeline logs"],
          ["sys", "  /about       Bio & system profile"],
          ["sys", "  /contact     Open secure channel (mailto)"],
          ["sys", "  /radio       Broadcast interview index"],
          ["sys", "  /clear       Flush terminal buffer"],
          ["sys", "  /help        This reference"],
          ["cyan", "───────────────────────────────────────────"],
        ]);
      },

      "/skills": async () => {
        await typeLines([
          ["ok", "$ kubectl get skills -n majdrezik --output=wide"],
          ["cyan", "LAYER              NODES"],
          ["sys", "Provisioning       Git · Linux · Bash · Ansible · Terraform · InfoSec"],
          ["sys", "Containerization   Docker · Compose · K8s · Microservices"],
          ["sys", "CI/CD Pipeline     TeamCity · GitHub Actions · Deploy Automation"],
          ["sys", "Infrastructure     AWS · Azure · IAM/VPC · Nginx · Grafana · ELK"],
          ["sys", "Application        JS · Node · React · Python · Java · SQL · APIs"],
          ["sys", "Cross-Functional   Agile · Comms · Sales↔Eng · Entrepreneurship"],
          ["ok", "STATUS: all layers healthy · readiness=1/1"],
        ]);
      },

      "/experience": async () => {
        await typeLines([
          ["ok", "$ journalctl -u career.service --since=forever"],
          ["cyan", "[LOG] B.Sc Software Engineering — ORT Braude College"],
          ["sys", "      Degree conferred · strong foundations in SE & math"],
          ["cyan", "[LOG] Full-Stack Developer"],
          ["sys", "      Front-end + back-end · JS / Python / Java"],
          ["cyan", "[LOG] DevOps Engineer @ Galil Software / CORO"],
          ["sys", "      CI/CD · AWS · TeamCity · cross-functional Sales↔Eng"],
          ["cyan", "[LOG] Entrepreneur"],
          ["sys", "      Zero-Aid (UltraHack2020 1st place) · ecosystem builder"],
          ["ok", "uptime: continuous learning · status=active"],
        ]);
      },

      "/about": async () => {
        await typeLines([
          ["ok", "$ cat /etc/majdrezik/profile.yaml"],
          ["cyan", "name:      Majd Rezik"],
          ["sys", "born:      12 June 1998"],
          ["sys", "degree:    B.Sc Software Engineering"],
          ["sys", "role:      DevOps Engineer | Software Architect | Entrepreneur"],
          ["sys", "website:   www.majdrezik.com"],
          ["sys", "freelance: Available"],
          ["cyan", "bio: |"],
          ["sys", "  Holistic Full-Stack background with deep SDLC fluency."],
          ["sys", "  Bridges DevOps, engineering, and business outcomes."],
        ]);
      },

      "/contact": async () => {
        await typeLines([
          ["ok", "$ ping contact.majdrezik.com"],
          ["sys", "PING contact — 56 bytes of data"],
          ["cyan", "email:  majdrezik@gmail.com"],
          ["cyan", "phone:  +972 50 248 3972"],
          ["cyan", "web:    www.majdrezik.com"],
          ["ok", "64 bytes from host: icmp_seq=1 ttl=64 time=0.4 ms"],
          ["ok", "Opening mailto channel..."],
        ]);
        setTimeout(() => {
          window.location.href =
            "mailto:majdrezik@gmail.com?subject=Hello%20Majd%20—%20from%20majdrezik.com";
          print("ok", "[SUCCESS] mailto handshake initiated. Check your mail client.");
        }, 600);
      },

      "/radio": async () => {
        await typeLines([
          ["ok", "$ ffplay broadcasts/ --list"],
          ["cyan", "FREQ   TITLE"],
          ["sys", "01     Cybersecurity in Crisis: 16B Password Leak"],
          ["sys", "02     Scams in the Shadows: New Face of Cybercrime"],
          ["sys", "03     Updates Without a Download"],
          ["sys", "04     From Hackathon to Lifesaver: Zero-Aid"],
          ["ok", "Scroll to #broadcasts to listen."],
        ]);
        document.getElementById("broadcasts")?.scrollIntoView({ behavior: "smooth" });
      },

      "/clear": async () => {
        output.innerHTML = "";
        print("sys", "Buffer cleared. Ready.");
      },
    };

    // Aliases
    commands.help = commands["/help"];
    commands.skills = commands["/skills"];
    commands.experience = commands["/experience"];
    commands.about = commands["/about"];
    commands.contact = commands["/contact"];
    commands.radio = commands["/radio"];
    commands.clear = commands["/clear"];
    commands["/whoami"] = commands["/about"];

    async function runCommand(raw) {
      const cmd = raw.trim().toLowerCase();
      if (!cmd) return;
      print("user", `❯ ${raw.trim()}`);

      const handler = commands[cmd] || commands["/" + cmd.replace(/^\//, "")];
      if (handler) {
        await handler();
      } else {
        print("cyan", "Hey — I only understand the prompts listed below for now.");
        print("sys", "Try: /help  /skills  /experience  /about  /contact  /radio  /clear");
        print("ok", "We're working on improving majd-bot soon. Stay tuned.");
      }
    }

    promptBtns.forEach((btn) => {
      btn.addEventListener("pointerdown", () => {
        // Lock before click settles so iOS never focuses the text field
        lockInput();
      });
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        lockInput();
        open();
        runCommand(btn.dataset.cmd);
        lockInput();
      });
    });

    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = input.value;
        input.value = "";
        runCommand(val);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Boot                                                               */
  /* ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    initTopology();
    initBootSequence();
    initMetrics();
    initSkillTopology();
    initNav();
    initReveal();
    initReviews();
    initBot();
  });
})();
