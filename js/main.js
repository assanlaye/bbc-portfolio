(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Mobile nav ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.querySelector(".mobile-nav");
  const setMenuOpen = (open) => {
    if (!toggle || !mobileNav) return;
    mobileNav.classList.toggle("is-open", open);
    toggle.classList.toggle("is-active", open);
    document.body.classList.toggle("menu-open", open);
    mobileNav.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  if (toggle && mobileNav) {
    toggle.addEventListener("click", () => {
      setMenuOpen(!mobileNav.classList.contains("is-open"));
    });
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });
  }

  /* ---------- Text split ---------- */
  const splitTargets = document.querySelectorAll(".split-target");
  let delayCursor = 0.08;

  splitTargets.forEach((el) => {
    const mode = el.dataset.split || "words";
    const html = el.innerHTML;
    el.textContent = "";
    el.setAttribute("aria-label", html.replace(/&amp;/g, "&").replace(/<[^>]+>/g, ""));

    if (mode === "chars") {
      const text = html.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
      [...text].forEach((char, i) => {
        const span = document.createElement("span");
        span.className = "split-char";
        span.textContent = char === " " ? "\u00A0" : char;
        span.style.animationDelay = `${delayCursor + i * 0.028}s`;
        el.appendChild(span);
      });
      delayCursor += text.length * 0.018 + 0.12;
      return;
    }

    const parts = html.replace(/&amp;/g, "&").split(/(\s+)/);
    parts.forEach((part, i) => {
      if (/^\s+$/.test(part)) {
        el.appendChild(document.createTextNode(part));
        return;
      }
      const span = document.createElement("span");
      span.className = "split-word";
      span.textContent = part;
      span.style.animationDelay = `${delayCursor + i * 0.045}s`;
      el.appendChild(span);
    });
    delayCursor += 0.22;
  });

  /* ---------- Boot ---------- */
  const boot = () => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
  };
  if (reduceMotion) boot();
  else window.setTimeout(boot, 120);

  /* ---------- Scroll progress ---------- */
  const progress = document.querySelector(".scroll-progress");
  const updateProgress = () => {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = `${value}%`;
  };

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const siblings = el.parentElement
            ? [...el.parentElement.children].filter((n) => n.classList.contains("reveal"))
            : [];
          const index = Math.max(0, siblings.indexOf(el));
          el.style.transitionDelay = `${Math.min(index * 0.08, 0.4)}s`;
          el.classList.add("is-in");
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Skills hover ---------- */
  const skillRows = document.querySelectorAll(".recognise-list li");
  const setActiveSkill = (row) => {
    skillRows.forEach((item) => item.classList.remove("is-active"));
    row.classList.add("is-active");
  };
  skillRows.forEach((row) => {
    row.addEventListener("mouseenter", () => setActiveSkill(row));
    row.addEventListener("focusin", () => setActiveSkill(row));
  });

  /* ---------- FAQ ---------- */
  document.querySelectorAll(".faq-item").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      document.querySelectorAll(".faq-item").forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---------- Smooth anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  /* ---------- Scroll-pinned coverflow ---------- */
  const scrollRoot = document.querySelector("[data-coverflow-scroll]");
  const carousel = document.querySelector("[data-carousel]");
  if (scrollRoot && carousel) {
    const sticky = scrollRoot.querySelector(".coverflow-sticky");
    const slides = [...carousel.querySelectorAll(".cover-slide")];
    const dotsWrap = carousel.querySelector(".coverflow-dots");
    const prevBtn = carousel.querySelector(".coverflow-prev");
    const nextBtn = carousel.querySelector(".coverflow-next");
    const viewport = carousel.querySelector(".coverflow-viewport");
    const progressEl = carousel.querySelector("[data-coverflow-progress]");
    const currentEl = carousel.querySelector("[data-slide-current]");
    const totalEl = carousel.querySelector("[data-slide-total]");
    const total = Math.max(slides.length - 1, 1);
    if (totalEl) totalEl.textContent = String(slides.length).padStart(2, "0");
    let index = 0;
    let dragX = 0;
    let startX = 0;
    let dragging = false;
    let syncingScroll = false;

    const setScrollHeight = () => {
      // One viewport of travel per slide so scroll flips cards before page continues
      const perSlide = Math.max(window.innerHeight * 0.9, 560);
      scrollRoot.style.height = `${sticky.offsetHeight + perSlide * total}px`;
    };

    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Go to project ${i + 1}`);
      dot.addEventListener("click", () => goTo(i, true));
      dotsWrap.appendChild(dot);
    });
    const dots = [...dotsWrap.querySelectorAll("button")];

    const render = (dragOffset = 0, continuous = 0) => {
      const mobile = window.innerWidth < 720;
      const compact = window.innerWidth < 980;
      const spacing = mobile ? 108 : compact ? 150 : 220;
      const shift = continuous || index;
      slides.forEach((slide, i) => {
        const offset = i - shift;
        const abs = Math.abs(offset);
        const x = offset * spacing + dragOffset;
        const z = -abs * (mobile ? 120 : 180);
        const rotY = offset * (mobile ? -28 : -48) + dragOffset * -0.05;
        const scale = Math.max(mobile ? 0.78 : 0.72, 1 - abs * (mobile ? 0.1 : 0.12));
        const opacity = abs > (mobile ? 2 : 3) ? 0 : Math.max(0.18, 1 - abs * 0.24);
        slide.style.transform = `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotY}deg) scale(${scale})`;
        slide.style.opacity = String(opacity);
        slide.style.zIndex = String(200 - Math.round(abs * 10));
        slide.style.filter =
          abs < 0.35 ? "none" : `brightness(${1 - abs * 0.14}) saturate(${1 - abs * 0.08})`;
        slide.classList.toggle("is-active", Math.round(shift) === i && !dragging);
        slide.setAttribute("aria-hidden", String(Math.round(shift) !== i));
      });
      const active = Math.round(shift);
      dots.forEach((dot, i) => dot.classList.toggle("is-active", i === active));
      if (currentEl) currentEl.textContent = String(active + 1).padStart(2, "0");
      if (progressEl) progressEl.style.width = `${(active / total) * 100}%`;
    };

    const scrollToIndex = (nextIndex) => {
      const clamped = Math.max(0, Math.min(total, nextIndex));
      const rectTop = scrollRoot.getBoundingClientRect().top + window.scrollY;
      const travel = scrollRoot.offsetHeight - window.innerHeight;
      const y = rectTop + (clamped / total) * travel;
      syncingScroll = true;
      window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
      window.setTimeout(() => {
        syncingScroll = false;
      }, 450);
    };

    const goTo = (next, fromControl = false) => {
      index = Math.max(0, Math.min(total, next));
      render();
      if (fromControl) scrollToIndex(index);
    };

    const updateFromScroll = () => {
      if (dragging || syncingScroll) return;
      const rect = scrollRoot.getBoundingClientRect();
      const travel = scrollRoot.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), travel);
      const progress = travel > 0 ? scrolled / travel : 0;
      const continuous = progress * total;
      index = Math.round(continuous);
      render(0, continuous);

      const pinned = rect.top <= 64 && rect.bottom > window.innerHeight + 64;
      sticky?.classList.toggle("is-pinned", pinned);
      if (progressEl) progressEl.style.width = `${progress * 100}%`;
    };

    prevBtn?.addEventListener("click", () => goTo(index - 1, true));
    nextBtn?.addEventListener("click", () => goTo(index + 1, true));

    const onPointerDown = (event) => {
      dragging = true;
      startX = event.clientX;
      dragX = 0;
      slides.forEach((s) => s.classList.add("is-dragging"));
      viewport.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      if (!dragging) return;
      dragX = event.clientX - startX;
      render(dragX * 0.85);
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      slides.forEach((s) => s.classList.remove("is-dragging"));
      if (Math.abs(dragX) > 70) {
        goTo(index + (dragX < 0 ? 1 : -1), true);
      } else {
        render();
      }
      dragX = 0;
    };

    viewport?.addEventListener("pointerdown", onPointerDown);
    viewport?.addEventListener("pointermove", onPointerMove);
    viewport?.addEventListener("pointerup", onPointerUp);
    viewport?.addEventListener("pointercancel", onPointerUp);

    carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") goTo(index + 1, true);
      if (event.key === "ArrowLeft") goTo(index - 1, true);
    });
    carousel.tabIndex = 0;

    setScrollHeight();
    updateFromScroll();
    window.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener(
      "resize",
      () => {
        setScrollHeight();
        updateFromScroll();
      },
      { passive: true }
    );
  }

  if (reduceMotion) {
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    return;
  }

  /* ---------- Custom cursor ---------- */
  const cursorDot = document.querySelector(".cursor-dot");
  const cursorRing = document.querySelector(".cursor-ring");
  const cursorPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ringPos = { x: cursorPos.x, y: cursorPos.y };

  if (finePointer && cursorDot && cursorRing) {
    document.body.classList.add("has-cursor");
    document.body.classList.add("hide-native-cursor");

    window.addEventListener(
      "pointermove",
      (event) => {
        cursorPos.x = event.clientX;
        cursorPos.y = event.clientY;
        cursorDot.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`;
      },
      { passive: true }
    );

    window.addEventListener("pointerdown", () => document.body.classList.add("cursor-press"));
    window.addEventListener("pointerup", () => document.body.classList.remove("cursor-press"));

    document
      .querySelectorAll("a, button, .cover-slide, .faq-item, .recognise-list li, .coverflow-nav")
      .forEach((el) => {
        el.addEventListener("pointerenter", () => document.body.classList.add("cursor-hover"));
        el.addEventListener("pointerleave", () => document.body.classList.remove("cursor-hover"));
      });
  }

  /* ---------- Magnetic buttons ---------- */
  document.querySelectorAll(".magnetic").forEach((el) => {
    const strength = el.classList.contains("hire-pill") || el.classList.contains("book-pill") ? 28 : 16;
    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate3d(${x / (100 / strength)}px, ${y / (100 / strength)}px, 0)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "translate3d(0, 0, 0)";
    });
  });

  /* ---------- Hero parallax ---------- */
  const hero = document.querySelector(".hero");
  const parallaxNodes = document.querySelectorAll("[data-depth]");
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  if (hero && finePointer) {
    hero.addEventListener(
      "pointermove",
      (event) => {
        const rect = hero.getBoundingClientRect();
        targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      },
      { passive: true }
    );
    hero.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
    });
  }

  /* ---------- RAF loop ---------- */
  const tick = () => {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    parallaxNodes.forEach((node) => {
      const depth = Number(node.dataset.depth || 0);
      const x = currentX * depth * 40;
      const y = currentY * depth * 28;
      if (node.classList.contains("magnetic") && node.matches(":hover")) return;
      if (node.classList.contains("hero-orb")) {
        node.style.transform = `translate3d(calc(-50% + ${x}px), ${y}px, 0) scale(${1 + Math.abs(currentX) * 0.04})`;
        return;
      }
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });

    if (cursorRing && finePointer) {
      ringPos.x += (cursorPos.x - ringPos.x) * 0.18;
      ringPos.y += (cursorPos.y - ringPos.y) * 0.18;
      cursorRing.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
    }

    updateProgress();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

})();
