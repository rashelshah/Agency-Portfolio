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

/* go */
document.fonts.ready.then(() => {
  init();
  runLoader();
});
