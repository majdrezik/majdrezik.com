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
    let w, h, nodes, raf;
    const NODE_COUNT = 48;
    const MAX_DIST = 140;
    const GREEN = "0, 255, 157";
    const CYAN = "0, 212, 255";

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
    draw();

    window.addEventListener("resize", () => {
      resize();
      createNodes();
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
      git: ["ci", "cd", "config"],
      ci: ["git", "containers", "cd", "teamcity"],
      teamcity: ["ci", "cd", "deploy"],
      config: ["git", "orch", "aws"],
      network: ["monitor", "aws", "security"],
      deploy: ["cd", "containers", "orch", "aws"],
      containers: ["ci", "orch", "deploy", "docker", "k8s"],
      docker: ["containers", "k8s", "ci"],
      k8s: ["containers", "orch", "docker", "monitor"],
      orch: ["containers", "config", "aws", "k8s"],
      aws: ["orch", "deploy", "monitor", "network"],
      monitor: ["aws", "network", "analytics"],
      analytics: ["monitor"],
      js: ["python", "java", "fullstack"],
      python: ["js", "java", "fullstack"],
      java: ["js", "python", "fullstack"],
      fullstack: ["js", "python", "java", "git"],
      security: ["network", "aws", "config"],
      cd: ["ci", "deploy", "teamcity", "git"],
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

    function open() {
      terminal.classList.add("open");
      input?.focus();
      if (!booted) {
        booted = true;
        print("sys", "majd-bot v1.0 — profile query interface");
        print("ok", "Session established. Type a command or click a prompt.");
        print("cyan", "Available: /help  /skills  /experience  /about  /contact  /clear");
      }
    }

    function close() {
      terminal.classList.remove("open");
    }

    fab.addEventListener("click", () => {
      if (terminal.classList.contains("open")) close();
      else open();
    });
    closeBtn?.addEventListener("click", close);

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
          ["sys", "Provisioning       Git · Config Mgmt · Network Protocols"],
          ["sys", "Containerization   Docker · Containers · K8s"],
          ["sys", "CI/CD Pipeline     TeamCity · CI Servers · Deploy Automation"],
          ["sys", "Infrastructure     AWS · Orchestration · Monitoring"],
          ["sys", "Application        JavaScript · Python · Java · Full-Stack"],
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
        print("warn", `Command not found: ${cmd}`);
        print("sys", 'Type /help for available commands.');
      }
    }

    promptBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        open();
        runCommand(btn.dataset.cmd);
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
