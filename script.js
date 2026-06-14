let audioContext = null;
let soundUnlocked = false;
let lastDescentSoundIndex = -1;

const descentNotes = [
  73.42, // D2
  69.30, // C#2
  55.00, // A1
  43.65  // F1
];

const clamp = (value, min = 0, max = 1) => {
  return Math.min(Math.max(value, min), max);
};

const root = document.documentElement;
const body = document.body;

const progressFill = document.querySelector("#progressFill");
const waterCursor = document.querySelector("#waterCursor");

const hero = document.querySelector("#hero");
const interior = document.querySelector("#interior");
const descent = document.querySelector("#switch");
const ending = document.querySelector("#end");
const system = document.querySelector("#system");

const trailerSection = document.querySelector("#trailer");
const trailerVideo = document.querySelector(".parasite-edit-video");

const descentPanels = [...document.querySelectorAll(".descent-panel")];
const navLinks = [...document.querySelectorAll(".chapter-nav a")];

const navTargets = [
  ...document.querySelectorAll("main section[id]"),
  ...document.querySelectorAll(".scroll-anchor[id]")
];

function getSectionProgress(section) {
  if (!section) return 0;

  const rect = section.getBoundingClientRect();
  const total = section.offsetHeight - window.innerHeight;

  if (total <= 0) return 0;

  return clamp(-rect.top / total);
}

function updateHero() {
  if (!hero) return;

  const rect = hero.getBoundingClientRect();
  const total = hero.offsetHeight - window.innerHeight;
  const progress = total > 0 ? clamp(-rect.top / total) : 0;

  root.style.setProperty("--heroZoom", Math.min(progress * 1.25, 1).toFixed(4));
  root.style.setProperty(
    "--splitOpen",
    Math.max((progress - 0.58) * 2.2, 0).toFixed(4)
  );

  if (rect.bottom <= window.innerHeight * 0.25) {
    body.classList.add("past-hero");
  } else {
    body.classList.remove("past-hero");
  }
}

function updateInterior() {
  if (!interior) return;

  const progress = getSectionProgress(interior);
  root.style.setProperty("--interiorText", clamp(progress * 1.6).toFixed(4));
}

function updateDescent() {
  if (!descent || descentPanels.length === 0) return;

  const rect = descent.getBoundingClientRect();
  const progress = getSectionProgress(descent);

  root.style.setProperty("--descentProgress", progress.toFixed(4));

  const isInsideDescent =
    rect.top <= window.innerHeight * 0.45 &&
    rect.bottom >= window.innerHeight * 0.45;

  descentPanels.forEach((panel) => {
    panel.classList.remove("is-active");
  });

  if (!isInsideDescent) {
    lastDescentSoundIndex = -1;
    return;
  }

  const panelCount = descentPanels.length;
  const activeIndex = Math.min(
    panelCount - 1,
    Math.floor(progress * panelCount)
  );

  descentPanels[activeIndex].classList.add("is-active");

  if (activeIndex !== lastDescentSoundIndex) {
    playDescentNote(activeIndex);
    lastDescentSoundIndex = activeIndex;
  }
}

function updateFinal() {
  const endingProgress = getSectionProgress(ending);
  const systemProgress = getSectionProgress(system);

  const finalProgress = Math.max(endingProgress, systemProgress, 0.15);

  root.style.setProperty("--final", clamp(finalProgress).toFixed(4));
}

function updateProgressBar() {
  if (!progressFill) return;

  const scrollY = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? clamp(scrollY / docHeight) : 0;

  progressFill.style.width = `${progress * 100}%`;
}

function updateNav() {
  if (navLinks.length === 0 || navTargets.length === 0) return;

  let activeId = null;
  const triggerLine = window.innerHeight * 0.42;

  navTargets.forEach((target) => {
    const rect = target.getBoundingClientRect();

    if (rect.top <= triggerLine) {
      activeId = target.id;
    }
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("is-active", href === `#${activeId}`);
  });
}

function updateScroll() {
  updateProgressBar();
  updateHero();
  updateInterior();
  updateDescent();
  updateFinal();
  updateNav();
}

/* =========================================================
   CLEAN UX CURSOR
========================================================= */

function setupCursor() {
  if (!waterCursor) return;

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (!canHover) {
    waterCursor.style.display = "none";
    return;
  }

  window.addEventListener("mousemove", (event) => {
    waterCursor.style.left = `${event.clientX}px`;
    waterCursor.style.top = `${event.clientY}px`;
  });

  window.addEventListener("mousedown", () => {
    waterCursor.classList.add("is-hover");
  });

  window.addEventListener("mouseup", () => {
    waterCursor.classList.remove("is-hover");
  });

  document.addEventListener("mouseleave", () => {
    waterCursor.classList.add("is-hidden");
  });

  document.addEventListener("mouseenter", () => {
    waterCursor.classList.remove("is-hidden");
  });

  const hoverItems = document.querySelectorAll(
    "a, button, video, input, textarea, select, .chapter-nav-list a"
  );

  hoverItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      waterCursor.classList.add("is-hover");
    });

    item.addEventListener("mouseleave", () => {
      waterCursor.classList.remove("is-hover");
    });
  });
}

/* =========================================================
   VIDEO AUTOPLAY ON SCROLL
========================================================= */

function setupVideoAutoplay() {
  if (!trailerSection || !trailerVideo) return;

  trailerVideo.muted = true;
  trailerVideo.playsInline = true;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          trailerVideo.play().catch(() => {
            // Als browser autoplay blokkeert, kan je nog steeds handmatig op play klikken.
          });
        } else {
          trailerVideo.pause();
          trailerVideo.currentTime = 0;
        }
      });
    },
    {
      threshold: 0.55
    }
  );

  observer.observe(trailerSection);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      trailerVideo.pause();
    }
  });
}

/* =========================================================
   DESCENT SOUND — DARK PIANO / BASS NOTES
========================================================= */

function setupDescentSound() {
  const unlockSound = () => {
    if (soundUnlocked) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();

    soundUnlocked = true;
  };

  window.addEventListener("pointerdown", unlockSound, { once: true });
  window.addEventListener("keydown", unlockSound, { once: true });
  window.addEventListener("touchstart", unlockSound, { once: true });
}

function playDescentNote(index) {
  if (!soundUnlocked || !audioContext) return;

  const now = audioContext.currentTime;
  const frequency = descentNotes[index % descentNotes.length];

  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.24, now + 0.035);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(420, now);
  lowpass.frequency.exponentialRampToValueAtTime(90, now + 1.8);
  lowpass.Q.setValueAtTime(1.2, now);

  const rumble = audioContext.createOscillator();
  rumble.type = "sine";
  rumble.frequency.setValueAtTime(frequency / 2, now);

  const darkString = audioContext.createOscillator();
  darkString.type = "sawtooth";
  darkString.frequency.setValueAtTime(frequency, now);
  darkString.detune.setValueAtTime(-8, now);

  const tension = audioContext.createOscillator();
  tension.type = "triangle";
  tension.frequency.setValueAtTime(frequency * 1.06, now); // kleine spanning / vals gevoel
  tension.detune.setValueAtTime(6, now);

  const hit = audioContext.createOscillator();
  hit.type = "sine";
  hit.frequency.setValueAtTime(frequency * 3.02, now);
  hit.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + 0.12);

  const hitGain = audioContext.createGain();
  hitGain.gain.setValueAtTime(0.09, now);
  hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  const tremolo = audioContext.createOscillator();
  tremolo.type = "sine";
  tremolo.frequency.setValueAtTime(5.5, now);

  const tremoloGain = audioContext.createGain();
  tremoloGain.gain.setValueAtTime(0.035, now);

  tremolo.connect(tremoloGain);
  tremoloGain.connect(masterGain.gain);

  rumble.connect(lowpass);
  darkString.connect(lowpass);
  tension.connect(lowpass);

  lowpass.connect(masterGain);

  hit.connect(hitGain);
  hitGain.connect(masterGain);

  masterGain.connect(audioContext.destination);

  rumble.start(now);
  darkString.start(now);
  tension.start(now);
  hit.start(now);
  tremolo.start(now);

  rumble.stop(now + 2.45);
  darkString.stop(now + 2.45);
  tension.stop(now + 2.45);
  hit.stop(now + 0.24);
  tremolo.stop(now + 2.45);
}
/* =========================================================
   EVENTS
========================================================= */

window.addEventListener("scroll", updateScroll, { passive: true });
window.addEventListener("resize", updateScroll);

setupCursor();
setupVideoAutoplay();
setupDescentSound();
updateScroll();