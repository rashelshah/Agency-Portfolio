import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- paper: torn edges ---------- */
// jagged SVG strip glued to the top of every [data-tear] section (rim = paper fibre, fill = section colour)
function tearSvg(color) {
  const N = 320, W = 1600;
  const p1 = rnd(0, 6), p2 = rnd(0, 6);
  // two slow waves + fine jitter + occasional nick = a fibrous tear rather than a zig-zag
  const ys = Array.from({ length: N + 1 }, (_, i) => 14 + 4 * Math.sin(i * 0.07 + p1) + 2.5 * Math.sin(i * 0.31 + p2) + rnd(-2.2, 2.2) + (Math.random() < 0.05 ? rnd(-5, 5) : 0));
  const edge = (dy) => ys.map((y, i) => `L${((i / N) * W).toFixed(1)} ${(y + dy).toFixed(1)}`).join("");
  const dark = color.toLowerCase() === "#1a1a1a";
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} 30`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.classList.add("tear");
  if (dark) {
    // exposed white paper core: a broken fibre line along the tear plus tiny hairs standing off it
    const dash = [14, 4, 3, 9, 22, 5, 6, 12].map((d) => d * rnd(0.6, 1.4)).join(" ");
    const hairs = Array.from({ length: 90 }, () => {
      const i = Math.floor(rnd(0, N)), x = (i / N) * W, y = ys[i] - 1.5;
      return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${rnd(-5, 5).toFixed(1)} ${rnd(-4.5, -1).toFixed(1)}" stroke="#f3ecdc" stroke-opacity="${rnd(0.3, 0.8).toFixed(2)}" stroke-width="1" vector-effect="non-scaling-stroke" fill="none"/>`;
    }).join("");
    svg.innerHTML = `<path d="M0 30${edge(0)}L${W} 30Z" fill="#050505"/><path d="M0 ${ys[0] - 1}${ys.map((y, i) => `L${((i / N) * W).toFixed(1)} ${(y - 1).toFixed(1)}`).join("")}" fill="none" stroke="#f3ecdc" stroke-opacity=".85" stroke-width="1.6" stroke-dasharray="${dash}" vector-effect="non-scaling-stroke"/>${hairs}`;
  } else {
    svg.innerHTML = `<path d="M0 30${edge(-3.4)}L${W} 30Z" fill="#fffaf0" opacity=".9"/><path d="M0 30${edge(0)}L${W} 30Z" fill="${color}"/>`;
  }
  return svg;
}
$$("[data-tear]").forEach((s) => s.prepend(tearSvg(s.dataset.tear)));

// ragged clip-path for images/loader: jitter points around the rectangle perimeter
function ripClip(el, amp = 1.1, n = 14) {
  const j = () => rnd(0, amp).toFixed(2);
  const t = Array.from({ length: n + 1 }, (_, i) => `${(i / n) * 100}% ${j()}%`);
  const r = Array.from({ length: n - 1 }, (_, i) => `${(100 - j()).toString()}% ${((i + 1) / n) * 100}%`);
  const b = Array.from({ length: n + 1 }, (_, i) => `${100 - (i / n) * 100}% ${(100 - j()).toString()}%`);
  const l = Array.from({ length: n - 1 }, (_, i) => `${j()}% ${100 - ((i + 1) / n) * 100}%`);
  el.style.clipPath = `polygon(${[...t, ...r, ...b, ...l].join(",")})`;
}
$$(".card__img").forEach((el) => ripClip(el));
{
  // loader's torn bottom edge lives in its extra 46px
  const l = $(".loader");
  const bottom = Array.from({ length: 61 }, (_, i) => `${100 - (i / 60) * 100}% calc(100% - ${rnd(0, 40).toFixed(1)}px)`);
  l.style.clipPath = `polygon(0 0,100% 0,${bottom.join(",")})`;
}

/* ---------- ink-bleed "boil" on hand-drawn bits ---------- */
if (!reduced) {
  const noise = $("#rough-noise");
  let seed = 1;
  setInterval(() => noise.setAttribute("seed", (seed = (seed % 12) + 1)), 150);
}

/* ---------- smooth scroll ---------- */
let lenis;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollTo = (target, opts) => (lenis ? lenis.scrollTo(target, { duration: 1.5, ...opts }) : $(target)?.scrollIntoView());

/* ---------- loader ---------- */
document.body.classList.add("is-loading");
lenis?.stop();

function runLoader() {
  const icons = $$(".loader__icon");
  const count = $(".loader__count");
  let i = 0;
  const cycle = setInterval(() => {
    icons[i].classList.remove("is-on");
    icons[(i = (i + 1) % icons.length)].classList.add("is-on");
    gsap.fromTo(icons[i], { rotate: -8, scale: 0.9 }, { rotate: 0, scale: 1, duration: 0.3, ease: "back.out(3)" });
  }, 480);

  const num = { v: 0 };
  const tl = gsap.timeline({ delay: 0.2 });
  tl.to(num, { v: 100, duration: reduced ? 0.1 : 2.2, ease: "power1.inOut", onUpdate: () => (count.textContent = Math.round(num.v)) })
    .add(() => {
      clearInterval(cycle);
      document.body.classList.remove("is-loading");
      lenis?.start();
    })
    .to(".loader__stage, .loader__label", { y: -30, opacity: 0, duration: 0.4, ease: "power2.in" })
    .to(".loader", { yPercent: -102, duration: 1.1, ease: "power4.inOut" }, "-=.1")
    .add(intro, "-=.55")
    .set(".loader", { display: "none" });
}

/* ---------- hero intro ---------- */
let heroSplit, introDone = false;
function intro() {
  introDone = true;
  const tl = gsap.timeline();
  tl.from(".head", { yPercent: -120, duration: 0.9, ease: "power3.out" })
    .fromTo(heroSplit.chars, { yPercent: 115, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.025, ease: "power4.out" }, 0)
    .from(".hero__sub", { y: 30, opacity: 0, duration: 0.9, ease: "power3.out" }, 0.5)
    .from(".scrap", { scale: 0, rotate: "+=40", duration: 0.9, stagger: 0.12, ease: "back.out(1.8)" }, 0.5)
    .from(".hero__scroll", { opacity: 0, y: 20, duration: 0.7 }, 1);
}

/* ---------- everything else ---------- */
function init() {
  /* hero: split now (hidden by loader), animate after load */
  SplitText.create(".hero__title", {
    type: "lines,chars", mask: "lines", linesClass: "ln", autoSplit: true,
    onSplit: (self) => ((heroSplit = self), !introDone && gsap.set(self.chars, { yPercent: 115 })),
  });

  /* generic reveals */
  $$("[data-split]:not(.hero__title)").forEach((el) => {
    const mode = el.dataset.split;
    SplitText.create(el, {
      type: mode === "chars" ? "lines,chars" : "lines", mask: "lines", linesClass: "ln", autoSplit: true,
      onSplit: (s) =>
        gsap.from(mode === "chars" ? s.chars : s.lines, {
          yPercent: 115, rotate: mode === "chars" ? 5 : 2, duration: 1, stagger: mode === "chars" ? 0.018 : 0.12, ease: "power4.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        }),
    });
  });
  $$("[data-reveal]:not(.hero__sub)").forEach((el) =>
    gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } })
  );

  /* manifesto: words fill in as you scroll */
  const words = SplitText.create("[data-scrub]", { type: "words", wordsClass: "w" }).words;
  gsap.to(words, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: "[data-scrub]", start: "top 78%", end: "bottom 50%", scrub: true } });

  /* stat counters */
  $$("[data-count]").forEach((el) => {
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: () => gsap.to(o, { v: +el.dataset.count, duration: 2, ease: "power2.out", onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString() + "+") }),
    });
  });

  /* marquee reacts to scroll velocity + direction */
  const track = $(".marquee__track");
  const tw = gsap.to(track, { xPercent: -50, ease: "none", duration: 26, repeat: -1 });
  ScrollTrigger.create({
    onUpdate: (self) => {
      tw.timeScale(self.direction * (1 + Math.min(Math.abs(self.getVelocity()) / 180, 7)));
      gsap.to(tw, { timeScale: 1, duration: 1, delay: 0.05, overwrite: true });
    },
  });

  /* hero parallax out */
  gsap.to(".hero__title", { yPercent: -14, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero__scraps", { yPercent: -28, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  addEventListener("mousemove", (e) => {
    const mx = e.clientX / innerWidth - 0.5, my = e.clientY / innerHeight - 0.5;
    $$(".scrap").forEach((s) => gsap.to(s, { x: mx * 70 * s.dataset.depth, y: my * 70 * s.dataset.depth, duration: 1.2, ease: "power3.out" }));
  });

  /* work cards: rise, settle, inner parallax */
  $$(".card").forEach((c, i) => {
    gsap.from(c, { y: 140, rotate: i % 2 ? 3 : -3, opacity: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: c, start: "top 90%" } });
    gsap.fromTo($("svg", c), { yPercent: 25 }, { yPercent: -25, ease: "none", scrollTrigger: { trigger: c, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* services: pinned horizontal scroll */
  const svcTrack = $(".services__track");
  const dist = () => svcTrack.scrollWidth - innerWidth;
  gsap.to(svcTrack, {
    x: () => -dist(), ease: "none",
    scrollTrigger: { trigger: ".services", pin: ".services__pin", start: "top top", end: () => "+=" + dist(), scrub: 1, invalidateOnRefresh: true },
  });

  /* process: sticky stack that shrinks as the next card lands */
  const steps = $$(".step");
  steps.forEach((s, i) => {
    s.style.setProperty("--i", i);
    if (i < steps.length - 1)
      gsap.to(s, { scale: 0.92, ease: "none", scrollTrigger: { trigger: steps[i + 1], start: "top 92%", end: "top 24%", scrub: true } });
  });

  /* header colour follows the section underneath */
  const head = $(".head");
  $$("section[data-theme], footer[data-theme]").forEach((s) =>
    ScrollTrigger.create({
      trigger: s, start: "top 50px", end: "bottom 50px",
      onToggle: (self) => self.isActive && (head.className = "head is-" + s.dataset.theme),
    })
  );

  /* clients: stamp-in cards, parallax, tilt, drawn scribble, tickers */
  const clientCards = $$(".cl__card");
  ScrollTrigger.batch(clientCards, {
    start: "top 88%", once: true,
    onEnter: (els) => els.forEach((el, i) => {
      const r = rnd(-14, 14);
      gsap.timeline({ delay: i * 0.12 })
        .fromTo(el, { scale: 1.8, opacity: 0, rotation: r, "--k": 0 }, { scale: 1, opacity: 1, rotation: 0, "--k": 1, duration: 0.42, ease: "power4.in" })               // slam down
        .to(el, { x: "+=5", y: "+=3", duration: 0.04, repeat: 5, yoyo: true, ease: "none" })                                                                         // impact shake
        .fromTo($(".cl__ico", el), { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.7, ease: "back.out(2.4)" }, "-=.25");
    }),
  });
  gsap.set(clientCards, { opacity: 0 });
  $$(".cl").forEach((el) => gsap.fromTo(el, { y: +el.dataset.speed }, { y: -el.dataset.speed, ease: "none", scrollTrigger: { trigger: ".clients__grid", start: "top bottom", end: "bottom top", scrub: true } }));
  if (matchMedia("(hover: hover)").matches)
    clientCards.forEach((el) => {
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3" }), ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3" });
      gsap.set(el, { transformPerspective: 800 });
      el.addEventListener("mousemove", (e) => { const b = el.getBoundingClientRect(); ry(((e.clientX - b.left) / b.width - 0.5) * 14); rx(-((e.clientY - b.top) / b.height - 0.5) * 12); });
      el.addEventListener("mouseleave", () => (rx(0), ry(0)));
    });
  const scrib = $(".clients__scribble path"), sl = scrib.getTotalLength();
  gsap.set(scrib, { strokeDasharray: sl, strokeDashoffset: sl });
  gsap.to(scrib, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut", scrollTrigger: { trigger: ".clients__scribble", start: "top 88%" } });
  [[".ticker--a", -1], [".ticker--b", 1]].forEach(([sel, dir]) => {
    const t = $(".ticker__track", $(sel)), tw = gsap.fromTo(t, { xPercent: dir > 0 ? -50 : 0 }, { xPercent: dir > 0 ? 0 : -50, ease: "none", duration: 34, repeat: -1 });
    ScrollTrigger.create({ trigger: sel, start: "top bottom", end: "bottom top", onUpdate: (s) => { tw.timeScale(1 + Math.min(Math.abs(s.getVelocity()) / 250, 5) * (s.direction === 1 ? 1 : -1) * 1); gsap.to(tw, { timeScale: 1, duration: 0.9, overwrite: true }); } });
  });
  ScrollTrigger.refresh();
}

/* ---------- menu ---------- */
const burger = $(".burger"), menu = $(".menu");
const menuTl = gsap.timeline({ paused: true, onReverseComplete: () => (menu.style.visibility = "hidden") })
  .set(menu, { visibility: "visible" })
  .to(menu, { clipPath: "circle(150% at calc(100% - 60px) 44px)", duration: 0.9, ease: "power3.inOut" })
  .fromTo(".menu li a", { yPercent: 110, y: 0, rotate: 4 }, { yPercent: 0, y: 0, rotate: 0, stagger: 0.07, duration: 0.8, ease: "power3.out" }, "-=.45")
  .from(".menu__foot", { opacity: 0, y: 14, duration: 0.5 }, "-=.4");
let open = false;
const setMenu = (v) => {
  open = v;
  burger.setAttribute("aria-expanded", v);
  v ? (menuTl.timeScale(1).play(), lenis?.stop()) : (menuTl.timeScale(1.6).reverse(), lenis?.start());
};
burger.addEventListener("click", () => setMenu(!open));
addEventListener("keydown", (e) => e.key === "Escape" && open && setMenu(false));

/* anchor links → smooth scroll */
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    e.preventDefault();
    if (open) setMenu(false);
    setTimeout(() => scrollTo(id === "#top" ? 0 : id), open ? 350 : 0);
  })
);

/* ---------- cursor + magnetic buttons ---------- */
if (matchMedia("(hover: hover)").matches) {
  const cur = $(".cursor"), label = $("span", cur);
  gsap.set(cur, { xPercent: -50, yPercent: -50 });
  const qx = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3" }), qy = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3" });
  addEventListener("mousemove", (e) => (qx(e.clientX), qy(e.clientY)));
  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-cursor], a, button");
    if (!t) return gsap.to(cur, { width: 16, height: 16, duration: 0.3 }), (label.textContent = ""), void gsap.to(label, { opacity: 0, duration: 0.1 });
    const txt = t.dataset.cursor;
    label.textContent = txt || "";
    gsap.to(cur, { width: txt ? 92 : 44, height: txt ? 92 : 44, duration: 0.35, ease: "back.out(2)" });
    gsap.to(label, { opacity: txt ? 1 : 0, duration: 0.2 });
  });
}
$$("[data-magnetic]").forEach((el) => {
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4, ease: "power3.out" });
  });
  el.addEventListener("mouseleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1,.4)" }));
});


/* ---------- project viewer (thumbnail expands to a full-screen story) ---------- */
const PROJECTS = [
  { name: "Forge", c: "#f25f36", icon: "d-browser", client: "Forge", kind: "Agentic AI Website",
    lead: "Forge is an AI-powered startup validation and execution platform that helps founders transform ideas into actionable business plans, roadmaps, and growth strategies. It combines intelligent research, market analysis, and project management tools to guide startups from concept to launch.",
    tags: ["WEBSITE", "AUTOMATION", "AI AGENTS", "INTEGRATIONS"], stats: [["+64%", "CONVERSION"], ["1.1s", "LOAD TIME"], ["6 WKS", "TO LAUNCH"]] },
  { name: "PRODSYNC", c: "#2f7a72", icon: "d-gear", client: "Tubelight Mediaworks", kind: "SAAS",
    lead: "ProdSync is a production management platform for film, television, and media teams that streamlines crew management, scheduling, call sheets, logistics, expenses, and reporting. It centralizes production workflows into a single system, improving coordination and operational efficiency.",
    tags: ["SOFTWARE", "SAAS", "REACT", "API"], stats: [["12K", "ACTIVE USERS"], ["-40%", "REPORT TIME"], ["99.9%", "UPTIME"]] },
  { name: "Glyph", c: "#e7a3b3", icon: "d-robot", client: "Glyph", kind: "Collaborative Latex Editor",
    lead: "Collaborative Latex Editor",
    tags: ["Collaboration", "EDITOR", "INTEGRATIONS"], stats: [["3,400", "HRS SAVED / MO"], ["0", "MISSED ORDERS"], ["4 WKS", "TO LAUNCH"]] },
  { name: "Crypton AI", c: "#6aa4c8", icon: "d-bolt", client: "Crypton AI", kind: "WEBSITE",
    lead: "Crypton AI is a modern cryptocurrency analysis and trading assistant that leverages AI to provide real-time insights, portfolio analysis, smart alerts, and a risk-free trading simulator.",
    tags: ["Website", "SAAS", "REACT", "UI/UX"], stats: [["4.8★", "APP STORE"], ["200K", "DOWNLOADS"], ["10 WKS", "TO LAUNCH"]] },
];
{
  const v = $(".viewer"), media = $(".viewer__media"), title = $(".viewer__title"), dir = $(".viewer__dir");
  let cur = 0, isOpen = false, busy = false, lastCard = null;
  const pad = (n) => String(n).padStart(2, "0");

  const fill = (i) => {
    const p = PROJECTS[i], card = $$(".card")[i];
    const name = $("h3", card).textContent.trim(), meta = $("p", card).textContent.trim();
    media.style.setProperty("--c", p.c);
    $(".viewer__img", media).src = "";
    media.classList.remove("has-img");
    $("svg use", media).setAttribute("href", "#" + p.icon);
    $("b", media).textContent = p.name;
    title.textContent = name;
    dir.textContent = meta;
    $(".viewer__count").textContent = `WORK ${pad(i + 1)} / ${pad(PROJECTS.length)}`;
    $(".vd__lead").textContent = p.lead;
    $(".vd__tags").innerHTML = meta.split("·").map((t) => `<li>${t.trim()}</li>`).join("");
    $(".vd__stats").innerHTML = p.stats.map(([n, l]) => `<li><b>${n}</b><span>${l}</span></li>`).join("");
  };

  const ui = () => [".viewer__head", ".viewer__close", ".viewer__nav", ".viewer__play"];

  // Split wipe: a solid centre block plus two frayed dry-brush edge sprites. The block and sprites only move
  // (mask-position/size), so nothing is re-decoded per frame -> no flicker. Opens from the middle, sweeps sideways.
  const SW = 170, SH = 1024, EDGE = 28;
  const halo = $(".viewer-halo");
  let sprites = null, spritesReady = null;
  // One side of the wipe. Opaque body on the left, a dry-brush fringe to the right: thin bristle streaks of varying length,
  // broken into dashes, plus loose flecks beyond the edge. makeSprite(true) mirrors it for the other side.
  const makeSprite = (flip) => {
    const c = document.createElement("canvas"); c.width = SW; c.height = SH;
    const ctx = c.getContext("2d"), img = ctx.createImageData(SW, SH), px = img.data;
    const ph = Array.from({ length: 6 }, () => rnd(0, 6.283));
    // bristle length per row: heavy-tailed, correlated with the row above so strands read as streaks, not bars
    const L = new Float32Array(SH); let prev = 0;
    for (let y = 0; y < SH; y++) { const fresh = Math.pow(Math.random(), 3) * 74; prev = Math.random() < 0.35 ? fresh : prev * 0.82 + fresh * 0.18; L[y] = prev; }
    const set = (x, y, a) => { if (x < 0 || x >= SW) return; const X = flip ? SW - 1 - x : x, i = (y * SW + X) * 4; px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = Math.max(px[i + 3], a * 255); };
    for (let y = 0; y < SH; y++) {
      let wob = 0; for (let k = 1; k <= 6; k++) wob += (11 / k) * Math.sin((6.283185 * k * y) / SH + ph[k - 1]);
      const body = Math.max(6, EDGE + wob + rnd(-2, 2));          // solid paper
      const reach = body + L[y];                                  // end of this row's bristle
      for (let x = 0; x < body; x++) set(x, y, 1);
      // fringe as dry-brush dashes: alternating paint / gap runs that get sparser towards the tip
      let x = body, on = true;
      while (x < reach) {
        const run = on ? 3 + Math.random() * 12 : 2 + Math.random() * 9, t = (x - body) / Math.max(1, reach - body);
        if (on && Math.random() > t * 0.55) for (let j = 0; j < run && x + j < reach; j++) set(Math.floor(x + j), y, 1 - t * 0.35);
        x += run; on = !on;
      }
    }
    for (let n = 0; n < 150; n++) { const y = Math.floor(rnd(0, SH)), x = Math.floor(EDGE + rnd(10, SW - EDGE - 12)); const s = Math.random() < 0.3 ? 2 : 1; for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s + 1; dx++) set(x + dx, (y + dy) % SH, 0.9); } // flecks
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  };
  function buildMask() {
    if (spritesReady) return spritesReady;
    spritesReady = new Promise((resolve) => {
      const R = makeSprite(false), L = makeSprite(true);
      let n = 0; [R, L].forEach((u) => { const im = new Image(); im.onload = im.onerror = () => ++n === 2 && ((sprites = { R: `url(${R})`, L: `url(${L})` }), resolve()); im.src = u; });
    });
    return spritesReady;
  }
  const setMask = (el, s) => {
    const cx = innerWidth / 2, blockW = Math.max(0, s * 2);
    const css = {
      maskImage: `linear-gradient(#000,#000), ${sprites.R}, ${sprites.L}`,
      maskSize: `${blockW}px 100%, ${SW}px ${SH}px, ${SW}px ${SH}px`,
      maskPosition: `${cx - s}px 0, ${cx + s - EDGE}px 0, ${cx - s - (SW - EDGE)}px 0`,
      maskRepeat: "no-repeat, repeat-y, repeat-y",
    };
    for (const k in css) { el.style[k] = css[k]; el.style["webkit" + k[0].toUpperCase() + k.slice(1)] = css[k]; }
  };
  const clearMask = (el) => { el.style.maskImage = el.style.webkitMaskImage = "none"; };
  const sMax = () => innerWidth / 2 + 60;
  const paint = (p) => {
    const s = sMax() * p;
    if (p >= 1) { clearMask(v); halo.style.visibility = "hidden"; return; }
    setMask(v, s); setMask(halo, s + 34); halo.style.visibility = "visible";
  };
  const draw = (o) => paint(o.p);
  (window.requestIdleCallback || setTimeout)(() => buildMask());

  async function open(i, card) {
    if (isOpen || busy) return;
    busy = true; isOpen = true; cur = i; lastCard = card;
    fill(i);
    v.scrollTop = 0;
    lenis?.stop();
    await buildMask();
    const o = { p: 0 };
    draw(o);
    gsap.set([v, halo], { visibility: "visible", opacity: 1 });
    gsap.set(ui(), { opacity: 0 });
    gsap.timeline({ onComplete: () => { clearMask(v); gsap.set(halo, { visibility: "hidden" }); busy = false; } })
      .to(o, { p: 1, duration: 1.2, ease: "power2.inOut", onUpdate: () => draw(o) })
      .fromTo($("b", media), { yPercent: 50, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: "power3.out" }, 0.7)
      .fromTo(title, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power4.out" }, 0.85)
      .to(".viewer__head", { opacity: 1, duration: 0.01 }, 0.84)
      .fromTo(dir, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 1.05)
      .fromTo(".viewer__close", { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: "back.out(2)" }, 1.0)
      .fromTo(".viewer__play", { scale: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(2)" }, 1.1)
      .fromTo(".viewer__nav", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 1.15);
    v.setAttribute("aria-hidden", "false");
  }

  function close() {
    if (!isOpen || busy) return;
    busy = true;
    const o = { p: 1 };
    draw(o);
    gsap.set(halo, { visibility: "visible" });
    gsap.timeline({ onComplete: () => { gsap.set([v, halo], { visibility: "hidden" }); isOpen = busy = false; lenis?.start(); v.setAttribute("aria-hidden", "true"); } })
      .to(ui(), { opacity: 0, duration: 0.25 })
      .add(() => v.scrollTo({ top: 0 }))
      .to(o, { p: 0, duration: 0.95, ease: "power2.inOut", onUpdate: () => draw(o) })
      .to([v, halo], { opacity: 0, duration: 0.12 });
  }

  function go(dirn) {
    if (!isOpen || busy) return;
    busy = true;
    const next = (cur + dirn + PROJECTS.length) % PROJECTS.length;
    gsap.timeline({ onComplete: () => (busy = false) })
      .to([media, title, dir], { x: -60 * dirn, opacity: 0, duration: 0.3, ease: "power2.in" })
      .add(() => { cur = next; fill(next); })
      .fromTo([media, title, dir], { x: 60 * dirn, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
  }

  const PROJECTS_CARDS = $$(".card");
  PROJECTS_CARDS.forEach((c) => c.addEventListener("click", () => open(+c.dataset.project, c)));
  $(".viewer__close").addEventListener("click", close);
  $(".viewer__prev").addEventListener("click", () => go(-1));
  $(".viewer__next").addEventListener("click", () => go(1));
  $(".viewer__play").addEventListener("click", () => v.scrollTo({ top: innerHeight, behavior: "smooth" }));
  $(".vd__cta").addEventListener("click", () => { close(); setTimeout(() => scrollTo("#contact"), 1100); });
  addEventListener("keydown", (e) => { if (!isOpen) return; if (e.key === "Escape") close(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); });

  // story section reveals as the viewer scrolls
  $$(".vd__lead, .vd__cols > *, .vd__cta").forEach((el) =>
    gsap.from(el, { y: 50, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, scroller: v, start: "top 88%" } })
  );
}

/* go */
document.fonts.ready.then(() => {
  init();
  runLoader();
});
