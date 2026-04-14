// ── PAGE LOADER ──
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  if (loader) {
    setTimeout(() => {
      loader.classList.add("hide");
      document.getElementById("heroBg")?.classList.add("loaded");
    }, 1600);
  }
});

// ── NAVBAR SCROLL ──
const navbar = document.getElementById("navbar");
if (navbar) {
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  });
}

// ── SCROLL REVEAL ──
const revealEls = document.querySelectorAll(
  ".reveal, .reveal-left, .reveal-right, .reveal-scale"
);
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach((el) => observer.observe(el));

// ── PARALLAX ──
window.addEventListener("scroll", () => {
  const heroBg = document.getElementById("heroBg");
  if (heroBg) heroBg.style.transform = `translateY(${window.scrollY * 0.3}px)`;
});
