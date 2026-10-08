import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });

document.getElementById("boot")?.remove(); // real CSS is applied by now
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
// WebKit (Safari, incl. iOS) renders SVG filters / blend modes on the CPU: flag it so CSS + JS can skip the costly bits
const isSafari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
if (isSafari) document.documentElement.classList.add("is-safari");
const isHome = !!$(".hero"); // work.html shares this file but has no hero
const MAIL = "team@brisklabs.online";
// never restore the old scroll position on load: coming back to a page used to reveal wherever it was left (e.g. the Crypton AI card)
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (!location.hash) window.scrollTo(0, 0);

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
/* ---------- ink-bleed "boil" on hand-drawn bits ---------- */
if (!reduced && !isSafari) {
  const noise = $("#rough-noise");
  let seed = 1;
  setInterval(() => noise.setAttribute("seed", (seed = (seed % 12) + 1)), 150);
}


// scroll-velocity burst that eases back to normal speed; one ticker callback instead of a new tween per scroll event
function velocityDrive(tw, trigger, burst) {
  let ts = 1;
  ScrollTrigger.create({ ...trigger, onUpdate: (s) => { ts = burst(s); tw.timeScale(ts); } });
  gsap.ticker.add(() => { if (Math.abs(ts - 1) > 0.002) tw.timeScale((ts += (1 - ts) * 0.06)); else if (ts !== 1) tw.timeScale((ts = 1)); });
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

// Slanted, torn slice line (rises left -> right). Top mask is opaque above it, bottom mask below it with a hairline gap
// so the dark site shows through as the black seam. Both are generated at the viewport size.
function sliceMasks() {
  const w = innerWidth, h = innerHeight, gap = Math.max(2, Math.round(h / 300));
  const edge = new Float32Array(w), p1 = rnd(0, 6), p2 = rnd(0, 6), p3 = rnd(0, 6);
  for (let x = 0; x < w; x++) {
    const t = x / w;
    edge[x] = h * (0.64 - 0.26 * t) + Math.sin(t * 9 + p1) * h * 0.018 + Math.sin(t * 23 + p2) * h * 0.006 + Math.sin(t * 61 + p3) * 2 + rnd(-1.6, 1.6) + (Math.random() < 0.02 ? rnd(-4, 4) : 0);
  }
  const make = (top) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.fillStyle = "#000";
    g.beginPath();
    if (top) { g.moveTo(0, 0); g.lineTo(w, 0); for (let x = w - 1; x >= 0; x--) g.lineTo(x, edge[x]); }
    else { g.moveTo(0, h); g.lineTo(w, h); for (let x = w - 1; x >= 0; x--) g.lineTo(x, edge[x] + gap); }
    g.closePath(); g.fill();
    return `url(${c.toDataURL("image/png")})`;
  };
  return [make(true), make(false)];
}

let arrive = null; // set by the slice code below: opens the vertical halves on a freshly loaded page
function runLoader() {
  // arriving via an in-site link (or on the work page) skips the 0-100% count: cream sheet -> straight into the slice
  const quickName = sessionStorage.getItem("quickLoad"); sessionStorage.removeItem("quickLoad");
  const quick = !isHome || quickName !== null;
  const T = { wipe: 1000, wait: 1000, slide: 1000, intro: 650, fin: 1050 };
  if (quick && arrive) {
    // continue the vertical slice from the previous page: the same cream halves open sideways (no horizontal cut)
    arrive(quickName || (isHome ? "Brisk Labs" : "All Work"), () => { document.body.classList.remove("is-loading"); lenis?.start(); setTimeout(intro, 380); });
    return;
  }
  const layers = $$(".loader__layer"), [top, bottom, cover] = layers;
  const [mTop, mBottom] = sliceMasks();
  top.style.maskImage = top.style.webkitMaskImage = mTop;
  bottom.style.maskImage = bottom.style.webkitMaskImage = mBottom;
  const iconSets = layers.map((l) => $$(".loader__icon", l)), counts = $$(".loader__count");
  let i = 0;
  const cycle = iconSets[0].length < 2 ? 0 : setInterval(() => {
    const prev = i; i = (i + 1) % iconSets[0].length;
    iconSets.forEach((set) => { set[prev].classList.remove("is-on"); set[i].classList.add("is-on"); });
    gsap.fromTo(iconSets.map((s) => s[i]), { rotate: -8, scale: 0.9 }, { rotate: 0, scale: 1, duration: 0.3, ease: "back.out(3)" });
  }, 480);

  const finish = () => $(".loader").remove();
  const num = { v: 0 };
  const tl = gsap.timeline({ delay: 0.15 });
  // no 0-100% count any more: a short beat on the cream sheet, then straight into the page cut
  tl.to(num, { v: 100, duration: 0.25, ease: "power1.inOut", onUpdate: () => counts.forEach((c) => (c.textContent = Math.round(num.v))) })
    .add(() => {
      clearInterval(cycle);
      if (reduced) { document.body.classList.remove("is-loading"); lenis?.start(); finish(); intro(); return; }
      // 1) the cover layer wipes off left -> right, uncovering the slanted seam line (and the icon stays on the two halves)
      cover.animate([{ clipPath: "polygon(0 0,100% 0,100% 100%,0 100%)" }, { clipPath: "polygon(100% 0,100% 0,100% 100%,100% 100%)" }], { duration: T.wipe, easing: "cubic-bezier(.333,1,.666,1)", fill: "forwards" });
      // 2) then the page is sliced: top half slides up, bottom half slides down
      setTimeout(() => {
        const ease = "cubic-bezier(.95,.05,.795,.035)";
        top.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: T.slide, easing: ease, fill: "forwards" });
        bottom.animate([{ transform: "translateY(0)" }, { transform: "translateY(100%)" }], { duration: T.slide, easing: ease, fill: "forwards" });
        document.body.classList.remove("is-loading");
        lenis?.start();
        setTimeout(intro, T.intro);
        setTimeout(finish, T.fin);
      }, T.wait);
    });
}

/* ---------- hero intro ---------- */
let heroSplit, introDone = false;
function intro() {
  introDone = true;
  if (!heroSplit) { gsap.from(".head", { yPercent: -120, duration: 0.9, ease: "power3.out" }); return; }
  const tl = gsap.timeline();
  tl.from(".head", { yPercent: -120, duration: 0.9, ease: "power3.out" })
    .fromTo(heroSplit.chars, { yPercent: 115, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.025, ease: "power4.out" }, 0)
    .from(".hero__sub", { y: 30, opacity: 0, duration: 0.9, ease: "power3.out" }, 0.5)
    .from(".scrap", { scale: 0, rotate: "+=40", duration: 0.9, stagger: 0.12, ease: "back.out(1.8)" }, 0.5)
    .from(".hero__scroll", { opacity: 0, y: 20, duration: 0.7 }, 1);
}

function reveals() {
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

}
function headTheme() {
  const head = $(".head");
  $$("section[data-theme], footer[data-theme]").forEach((s) =>
    ScrollTrigger.create({
      trigger: s, start: "top 50px", end: "bottom 50px",
      onToggle: (self) => self.isActive && (head.className = "head is-" + s.dataset.theme),
    })
  );

}

/* ---------- all-projects page ---------- */
function initWorkPage() {
  reveals();
  headTheme();
  $$(".card").forEach((c, i) => {
    gsap.from(c, { y: 140, rotate: i % 2 ? 3 : -3, opacity: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: c, start: "top 92%" } });
    const art = $("svg", c); // only the icon art drifts; moving a screenshot would expose the card colour behind it
    if (art) gsap.fromTo(art, { yPercent: 12 }, { yPercent: -12, ease: "none", scrollTrigger: { trigger: c, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // filter chips: cards that do not match shrink away, the rest re-flow and pop back in
  const cards = $$(".card"), chips = $$(".chip"), empty = $(".work__empty"), count = $(".work__count");
  let busy = false;
  const layout = () => $$(".card:not([hidden])").forEach((c, i) => c.classList.toggle("card--low", i % 2 === 1));
  chips.forEach((chip) => chip.addEventListener("click", () => {
    if (busy || chip.classList.contains("is-on")) return;
    busy = true;
    chips.forEach((c) => c.classList.toggle("is-on", c === chip));
    const f = chip.dataset.filter, match = (c) => f === "all" || c.dataset.cat.split(" ").includes(f);
    gsap.timeline({ onComplete: () => (busy = false) })
      .to(cards.filter((c) => !c.hidden), { scale: 0.88, opacity: 0, rotate: () => rnd(-6, 6), duration: 0.28, stagger: 0.03, ease: "power2.in" })
      .add(() => {
        cards.forEach((c) => (c.hidden = !match(c)));
        const shown = cards.filter((c) => !c.hidden);
        empty.hidden = shown.length > 0;
        count.textContent = String(shown.length).padStart(2, "0");
        layout();
        ScrollTrigger.refresh();
        gsap.fromTo(shown, { scale: 0.7, opacity: 0, y: 60, rotate: () => rnd(-8, 8) }, { scale: 1, opacity: 1, y: 0, rotate: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.6)", clearProps: "transform" });
      });
  }));
  layout();
  ScrollTrigger.refresh();
}

/* ---------- everything else ---------- */
function init() {
  if (!isHome) return initWorkPage();
  /* hero: split now (hidden by loader), animate after load */
  SplitText.create(".hero__title", {
    type: "lines,chars", mask: "lines", linesClass: "ln", autoSplit: true,
    onSplit: (self) => ((heroSplit = self), !introDone && gsap.set(self.chars, { yPercent: 115 })),
  });

  reveals();

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
  velocityDrive(tw, {}, (s) => s.direction * (1 + Math.min(Math.abs(s.getVelocity()) / 180, 7)));

  /* hero parallax out */
  gsap.to(".hero__title", { yPercent: -14, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero__scraps", { yPercent: -28, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  const scrapMove = $$(".scrap").map((s) => ({ d: +s.dataset.depth, x: gsap.quickTo(s, "x", { duration: 1.2, ease: "power3.out" }), y: gsap.quickTo(s, "y", { duration: 1.2, ease: "power3.out" }) }));
  addEventListener("mousemove", (e) => {
    const mx = e.clientX / innerWidth - 0.5, my = e.clientY / innerHeight - 0.5;
    scrapMove.forEach((s) => (s.x(mx * 70 * s.d), s.y(my * 70 * s.d)));
  }, { passive: true });

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
    scrollTrigger: { trigger: ".services", pin: ".services__pin", start: "top top", end: () => "+=" + dist(), scrub: 1, anticipatePin: 1, invalidateOnRefresh: true, onUpdate: (s) => $(".services__pin").style.setProperty("--p", s.progress.toFixed(3)) },
  });

  gsap.to(".services__deco", { x: () => -dist() * 0.32, ease: "none", scrollTrigger: { trigger: ".services", start: "top top", end: () => "+=" + dist(), scrub: 1, invalidateOnRefresh: true } });

  /* process: sticky stack that shrinks as the next card lands */
  const steps = $$(".step");
  steps.forEach((s, i) => {
    s.style.setProperty("--i", i);
    if (i < steps.length - 1)
      gsap.to(s, { scale: 0.92, ease: "none", scrollTrigger: { trigger: steps[i + 1], start: "top 92%", end: "top 24%", scrub: true } });
  });

  headTheme();

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
    velocityDrive(tw, { trigger: sel, start: "top bottom", end: "bottom top" }, (s) => 1 + Math.min(Math.abs(s.getVelocity()) / 250, 5) * (s.direction === 1 ? 1 : -1));
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
  { name: "Forge", c: "#f25f36", icon: "d-browser", client: "Forge", kind: "Agentic AI Website", link: "https://forge-frontend-se6u.onrender.com",
    lead: "Forge is an AI-powered startup validation and execution platform that helps founders transform ideas into actionable business plans, roadmaps, and growth strategies. It combines intelligent research, market analysis, and project management tools to guide startups from concept to launch.",
    tags: ["WEBSITE", "AUTOMATION", "AI AGENTS", "INTEGRATIONS"], stats: [["1000+", "STARTUP SIGNALS"], ["100+", "GROWTH TACTICS"], ["10X", "FASTER EXECUTION"]] },
  { name: "PRODSYNC", c: "#2f7a72", icon: "d-gear", client: "Tubelight Mediaworks", kind: "SAAS", link: "https://www.prodsync.in",
    lead: "ProdSync is a production management platform for film, television, and media teams that streamlines crew management, scheduling, call sheets, logistics, expenses, and reporting. It centralizes production workflows into a single system, improving coordination and operational efficiency.",
    tags: ["SOFTWARE", "SAAS", "REACT", "API"], stats: [["1", "SOURCE OF TRUTH"], ["10X", "BETTER ALIGNMENT"], ["99.9%", "WORKFLOW CLARITY"]] },
  { name: "Glyph", c: "#e7a3b3", icon: "d-robot", client: "Glyph", kind: "Collaborative Latex Editor", link: "https://glyphs.vercel.app",
    lead: "Glyph is an open-source, web-based collaborative LaTeX editor engineered for team productivity and speed. It provides real-time document synchronization, high-fidelity compilation inside sandboxed environment, live syntax highlighting, workspace management, and instant sharing permissions.",
    tags: ["Collaboration", "EDITOR", "INTEGRATIONS"], stats: [["100%", "LOCAL FIRST"], ["100+", "HRS SAVED / MO"], ["1", "UNIFIED WORKSPACE"]] },
  { name: "Crypton AI", c: "#6aa4c8", icon: "d-bolt", client: "Crypton AI", kind: "WEBSITE", link: "https://crypton-ai.vercel.app",
    lead: "Crypton AI is a modern cryptocurrency analysis and trading assistant that leverages AI to provide real-time insights, portfolio analysis, smart alerts, and a risk-free trading simulator.",
    tags: ["Website", "SAAS", "REACT", "UI/UX"], stats: [["100+", "CRYPTOCURRENCIES"], ["<2 SEC", "RESPONSE TIME"], ["24/7", "AI ASSISTANT"]] },
  // MOCK DATA for the extra work-page projects (cards 4-7): replace with the real details later
  { name: "FcuK Academia", c: "#d9dc7a", icon: "d-bolt", client: "FcuK Academia", kind: "PWA",link: "https://www.fcukacademia.in",
    lead: "A student-first academic platform that transforms fragmented campus systems into a seamless, mobile-friendly experience.",
    tags: ["PWA", "WEBSITE", "REACT"], stats: [["26K+", "VISITORS"], ["160K+", "VIEWS"], ["95%", "MOBILE USERS"]] },
  { name: "Tubelight Sports", c: "#f25f36", icon: "d-browser", client: "Tubelight Sports", kind: "Website", link:"https://www.tubelightsports.com",
    lead: "Tubelight Sports is a social media platform built for athletes, coaches, and sports enthusiasts to connect and share their passion for sports. Users can post updates, follow others in their community, and engage with content from people who share their athletic interests. Whether you're a professional athlete, a weekend warrior, or a sports fan, Sports Feed is designed to be your go-to place to celebrate, share, and connect with the sports community.",
    tags: ["SOCIAL MEDIA", "WEBSITE", "BRAND"], stats: [["MULTIPLE", "USER ROLES"], ["1.1s", "LOAD TIME"], ["GLOBAL", "CONECTIVITY"]] },
  { name: "Foxly COD", c: "#2f7a72", icon: "d-gear", client: "Redfox Digital", kind: "Shopify App", link:"https://www.foxlycod.com",
    lead: "A Shopify app that streamlines Cash on Delivery orders with a customizable one-page checkout, helping merchants simplify ordering and improve conversion rates.",
    tags: ["SOFTWARE", "SAAS", "SHOPIFY"], stats: [["3X", "FASTER ORDERING"], ["100%", "CUSTOMIZABLE"], ["1", "PAGE CHECKOUT"]] },
  { name: "Zeen", c: "#e7a3b3", icon: "d-robot", client: "Zeen", kind: "iOS App",
    lead: "A real-time focus companion that tracks digital distraction, measures attention drift, and helps users build healthier focus habits through guided sessions and behavioral insights.",
    tags: ["APP", "COGNITIVE INTELLIGENCE", "IOS"], stats: [["30 DAYS", "BEHAVIOUR HISTORY"], ["4 MODES", "FOCUSING SESSIONS"], ["7 DAYS", "WEEKLY INSIGHTS"]] },
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
    $(".viewer__count").textContent = `WORK ${pad(i + 1)} / ${pad($$(".card").length)}`;
    $(".vd__lead").textContent = p.lead;
    $(".vd__tags").innerHTML = meta.split("·").map((t) => `<li>${t.trim()}</li>`).join("");
    $(".vd__stats").innerHTML = p.stats.map(([n, l]) => `<li><b>${n}</b><span>${l}</span></li>`).join("");
    
    const linkBtn = $(".vd__link");
    if (p.link) {
      linkBtn.href = p.link;
      linkBtn.style.display = "inline-flex";
    } else {
      linkBtn.style.display = "none";
    }
  };

  const ui = () => [".viewer__head", ".viewer__close", ".viewer__nav", ".viewer__play"];

  /* ---- vertical slice transition (the intro's slice, turned 90deg): a slanted torn seam draws top -> bottom, then the
     page splits along it; left half slides left, right half slides right. Close runs it back together and apart again. ---- */
  const sliceEl = $(".slice"), sB = $(".slice__back"), [sL, sR, sC] = $$(".slice__layer", sliceEl);
  // The two seam masks are PNGs rendered at viewport size: costly to build, so they are built once at idle time,
  // cached in sessionStorage (the next page of the visit reuses them instantly) and pre-decoded. Nothing heavy runs when you click.
  let maskKey = "";
  const buildMasks = (w, h) => {
    const gap = Math.max(2, Math.round(w / 300)), edge = new Float32Array(h), p1 = rnd(0, 6), p2 = rnd(0, 6), p3 = rnd(0, 6);
    for (let y = 0; y < h; y++) {
      const t = y / h; // seam leans from upper-right to lower-left
      edge[y] = w * (0.64 - 0.28 * t) + Math.sin(t * 9 + p1) * w * 0.016 + Math.sin(t * 23 + p2) * w * 0.005 + Math.sin(t * 61 + p3) * 2 + rnd(-1.6, 1.6) + (Math.random() < 0.02 ? rnd(-4, 4) : 0);
    }
    const make = (left) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"); g.fillStyle = "#000"; g.beginPath();
      if (left) { g.moveTo(0, 0); g.lineTo(0, h); for (let y = h - 1; y >= 0; y--) g.lineTo(edge[y], y); }
      else { g.moveTo(w, 0); g.lineTo(w, h); for (let y = h - 1; y >= 0; y--) g.lineTo(edge[y] + gap, y); }
      g.closePath(); g.fill();
      return c.toDataURL("image/png");
    };
    return [make(true), make(false)];
  };
  const prepMasks = () => {
    const w = innerWidth, h = innerHeight, key = w + "x" + h;
    if (key === maskKey) return;
    maskKey = key;
    let urls = null;
    try { urls = JSON.parse(sessionStorage.getItem("sliceMasks:" + key)); } catch (e) {}
    if (!urls) {
      urls = buildMasks(w, h);
      try { Object.keys(sessionStorage).filter((k) => k.startsWith("sliceMasks:")).forEach((k) => sessionStorage.removeItem(k)); sessionStorage.setItem("sliceMasks:" + key, JSON.stringify(urls)); } catch (e) {}
    }
    const [ml, mr] = urls.map((u) => `url(${u})`);
    sL.style.maskImage = sL.style.webkitMaskImage = ml;
    sR.style.maskImage = sR.style.webkitMaskImage = mr;
    urls.forEach((u) => { const im = new Image(); im.src = u; im.decode?.().catch(() => {}); }); // decode now, not on first paint
  };
  (window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(prepMasks, { timeout: 2500 });
  addEventListener("resize", () => (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(prepMasks));

  const EASE_IN = "cubic-bezier(.95,.05,.795,.035)", EASE_OUT = "cubic-bezier(.205,.965,.05,.95)", FULL = "polygon(0 0,100% 0,100% 100%,0 100%)", GONE = "polygon(0 100%,100% 100%,100% 100%,0 100%)";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const anim = (el, kf, o) => el.animate(kf, { fill: "forwards", ...o }).finished;
  const prepSlice = (i, closing, mark) => {
    sliceEl.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    prepMasks();
    // opening starts as a full cream sheet; closing starts with the halves parked off-screen
    sL.style.transform = closing ? "translateX(-100%)" : ""; sR.style.transform = closing ? "translateX(100%)" : "";
    sC.style.clipPath = closing ? GONE : ""; sliceEl.style.opacity = closing ? 1 : 0;
    sliceEl.classList.toggle("logo-mark", !!mark);   // page links show the logo; projects keep their own icon
    const p = mark || PROJECTS[i];
    $$(".slice__layer", sliceEl).forEach((l) => { $("svg use", l).setAttribute("href", "#" + p.icon); $("b", l).textContent = p.name; });
    sliceEl.style.visibility = "visible"; sliceEl.style.pointerEvents = "auto";
    // closing: the gap between the halves fills with black, so the page being left never shows through it
    sB.style.opacity = closing ? 1 : 0;
  };
  const apart = () => Promise.all([
    anim(sL, [{ transform: "translateX(0)" }, { transform: "translateX(-100%)" }], { duration: 900, easing: EASE_IN }),
    anim(sR, [{ transform: "translateX(0)" }, { transform: "translateX(100%)" }], { duration: 900, easing: EASE_IN }),
  ]);
  const together = () => Promise.all([
    anim(sL, [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }], { duration: 800, easing: EASE_OUT }),
    anim(sR, [{ transform: "translateX(100%)" }, { transform: "translateX(0)" }], { duration: 800, easing: EASE_OUT }),
  ]);
  const endSlice = () => { sliceEl.style.visibility = "hidden"; sliceEl.style.pointerEvents = "none"; sliceEl.getAnimations({ subtree: true }).forEach((a) => a.cancel()); };

  arrive = async (name, onStart) => {
    prepSlice(0, false, { icon: "d-browser", name });
    sL.style.transform = sR.style.transform = ""; sC.style.clipPath = GONE; sliceEl.style.opacity = 1;
    $(".loader")?.remove();                      // the loader is the same cream, so the swap is invisible
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));   // let the page paint before moving anything
    await wait(220);
    const slide = apart(); onStart?.();
    await slide; endSlice();
  };

  async function open(i, card) {
    if (isOpen || busy) return;
    busy = true; isOpen = true; cur = i; lastCard = card;
    fill(i);
    v.scrollTop = 0;
    lenis?.stop();
    gsap.set(v, { visibility: "visible", opacity: 1 });
    gsap.set(ui(), { opacity: 0 });
    v.setAttribute("aria-hidden", "false");
    prepSlice(i, false);
    await anim(sliceEl, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });          // cream sheet drops over the page
    await wait(120);
    await anim(sC, [{ clipPath: FULL }, { clipPath: GONE }], { duration: 700, easing: "cubic-bezier(.333,1,.666,1)" }); // seam draws top -> bottom
    const slide = apart();                                                             // page splits left / right
    await wait(520);
    gsap.timeline({ onComplete: () => (busy = false) })
      .fromTo($("b", media), { yPercent: 50, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: "power3.out" }, 0)
      .fromTo(title, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power4.out" }, 0.1)
      .to(".viewer__head", { opacity: 1, duration: 0.01 }, 0.09)
      .fromTo(dir, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 0.3)
      .fromTo(".viewer__close", { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: "back.out(2)" }, 0.25)
      .fromTo(".viewer__play", { scale: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(2)" }, 0.35)
      .fromTo(".viewer__nav", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.4);
    await slide; endSlice();
  }

  async function close() {
    if (!isOpen || busy) return;
    busy = true;
    await gsap.to(ui(), { opacity: 0, duration: 0.2 }).then();
    prepSlice(cur, true);
    await together();                                                                  // halves meet over the project
    v.scrollTo({ top: 0 }); gsap.set(v, { visibility: "hidden" }); v.setAttribute("aria-hidden", "true");
    await wait(140);
    sB.style.opacity = 0;                              // halves are fully closed, so this is invisible; the reveal must show the page
    await apart();                                                                     // and split again, revealing the page
    endSlice(); isOpen = busy = false; lenis?.start();
  }

  function go(dirn) {
    if (!isOpen || busy) return;
    busy = true;
    const total = $$(".card").length, next = (cur + dirn + total) % total;
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
  $(".vd__cta").addEventListener("click", () => {
    const subject = encodeURIComponent("Project enquiry: something like " + PROJECTS[cur].name);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${MAIL}&su=${subject}`, "_blank", "noopener,noreferrer");
  });
  // links to another page: close the cream halves over this page first, then navigate (the next page opens them again)
  $$("[data-page]").forEach((a) => a.addEventListener("click", async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true; lenis?.stop();
    sessionStorage.setItem("quickLoad", a.dataset.page);
    prepSlice(0, true, { icon: "d-browser", name: a.dataset.page });
    await together();
    location.href = a.href;
  }));
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
