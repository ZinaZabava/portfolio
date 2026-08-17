/* ===================== Intro loader =====================
   A full-screen green panel that breaks into a dot matrix and pulls back in a
   wave from the bottom up. The panel is built as one masked strip per row of
   dots, and the strips carry the greeting, so the type breaks into dots along
   with the background instead of fading out ahead of it. */
(() => {
  const loader = document.getElementById("loader");
  if (!loader) return;

  const grid = loader.querySelector(".loader__grid");
  const text = loader.querySelector(".loader__text");
  const root = document.documentElement;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // The break-up needs a mask to punch the dots and a registered custom
  // property to shrink them; without both, fall back to the plain fade
  const canDot =
    typeof CSS !== "undefined" &&
    typeof CSS.registerProperty === "function" &&
    (CSS.supports("mask-image", "radial-gradient(#000, transparent)") ||
      CSS.supports("-webkit-mask-image", "radial-gradient(#000, transparent)"));

  const DOT = 16; // dot pitch, px
  const WAVE = 900; // time the break-up takes to travel bottom to top
  const PULL_BACK = 620; // time a row of dots takes to close to nothing
  const HOLD = 1500; // time the greeting stays put
  const MAX_WAIT = 4000; // never hold the page longer than this

  let built = false;

  function build() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rows = Math.max(1, Math.ceil(vh / DOT));
    // Spread the wave over a fixed span, so the dot pitch sets the grain of
    // the break-up without changing how long it takes
    const rowStep = WAVE / rows;

    grid.style.setProperty("--dot", `${DOT}px`);

    // Measured from the live element, so the slices inherit its exact metrics
    const box = text.getBoundingClientRect();
    const inkLeft = Math.round((vw - box.width) / 2);
    const inkTop = Math.round((vh - box.height) / 2);
    const inkBottom = inkTop + Math.ceil(box.height);

    const frag = document.createDocumentFragment();
    for (let row = 0; row < rows; row += 1) {
      const top = row * DOT;
      const strip = document.createElement("span");
      strip.className = "loader__row";
      strip.style.setProperty(
        "--d",
        `${Math.round((rows - 1 - row) * rowStep)}ms`
      );

      if (top < inkBottom && top + DOT > inkTop) {
        const ink = document.createElement("span");
        ink.className = "loader__ink";
        ink.textContent = text.textContent;
        ink.style.left = `${inkLeft}px`;
        ink.style.top = `${inkTop - top}px`;
        ink.style.width = `${Math.ceil(box.width)}px`;
        strip.className += " has-ink";
        strip.appendChild(ink);
      }

      frag.appendChild(strip);
    }

    grid.replaceChildren(frag);
    loader.classList.add("is-built");
    built = true;
  }

  function finish() {
    loader.remove();
    root.classList.remove("is-loading");
    // Safari will not recompute sticky + track heights in the same turn as
    // removing overflow on html. Wait for layout, then ask the scroller to
    // measure again so images are not left clipped inside the black frames.
    void root.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    });
  }

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;

    // Without the dot grid there is nothing to break up, so just fade
    if (!built) {
      loader.classList.add("is-instant");
      window.setTimeout(finish, 300);
      return;
    }

    loader.classList.add("is-dismissing");
    window.setTimeout(finish, WAVE + PULL_BACK + 120);
  }

  // Wait for the webfonts: body is hidden until they settle, and the slices
  // are only aligned if the line is measured at its final metrics.
  const fontsReady =
    document.fonts && document.fonts.ready
      ? document.fonts.ready
      : Promise.resolve();

  let scheduled = false;
  function start() {
    if (scheduled) return;
    scheduled = true;
    if (!reducedMotion && canDot) {
      build();
      window.addEventListener("resize", () => {
        if (!dismissed) build();
      });
    }
    window.setTimeout(dismiss, HOLD);
  }

  fontsReady.then(start);
  window.setTimeout(() => {
    if (!scheduled) {
      scheduled = true;
      dismiss();
    }
  }, MAX_WAIT);
})();

(() => {
  document.documentElement.classList.add("js");

  const projects = Array.from(document.querySelectorAll(".project"));
  const indexLinks = Array.from(document.querySelectorAll(".index-list a"));
  const topbarProject = document.getElementById("topbar-project");
  const burger = document.getElementById("burger");
  const about = document.getElementById("about");
  const backdrop = document.getElementById("about-backdrop");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const narrowMq = window.matchMedia("(max-width: 900px)");

  function usePinnedScroll() {
    return !reducedMotion && !narrowMq.matches;
  }

  function syncScrollMode() {
    document.documentElement.classList.toggle(
      "is-simple-scroll",
      !usePinnedScroll()
    );
  }

  syncScrollMode();

  const labels = Object.fromEntries(
    projects.map((section) => [
      section.dataset.project,
      section.dataset.label || section.dataset.project,
    ])
  );

  const state = projects.map((section) => {
    const pin = section.querySelector(".project__pin");
    const track = section.querySelector(".project__track");
    const stack = section.querySelector("[data-opacity-scroll]");
    const overlay = stack ? stack.querySelector(".stack-overlay") : null;
    return {
      section,
      pin,
      track,
      stack,
      overlay,
      id: section.dataset.project,
      scrollRange: 0,
      stackTop: 0,
      stackHeight: 0,
    };
  });

  function viewportHeight() {
    const topbar = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--topbar-height"
      )
    );
    const offset = Number.isFinite(topbar) ? topbar : 0;
    return Math.max(1, window.innerHeight - offset);
  }

  function closeMenu() {
    document.body.classList.remove("menu-open");
    if (burger) {
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Open menu");
    }
    if (backdrop) backdrop.hidden = true;
  }

  function openMenu() {
    document.body.classList.add("menu-open");
    if (burger) {
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "Close menu");
    }
    if (backdrop) backdrop.hidden = false;
  }

  function toggleMenu() {
    if (document.body.classList.contains("menu-open")) closeMenu();
    else openMenu();
  }

  function measure() {
    // Heights taken while html was overflow-clipped are viewport-tall in
    // Safari, which is what hides each project's images under its intro.
    if (document.documentElement.classList.contains("is-loading")) return;

    syncScrollMode();
    const vh = viewportHeight();

    state.forEach((item) => {
      item.track.style.transform = "";
      item.track.style.paddingBottom = "0px";

      if (!usePinnedScroll()) {
        // Mobile / reduced-motion: natural document height, all media visible
        item.section.style.height = "";
        item.scrollRange = 0;
        if (item.stack) {
          item.stackTop = item.stack.offsetTop;
          item.stackHeight = item.stack.offsetHeight;
        }
        return;
      }

      const contentHeight = item.track.scrollHeight;
      item.scrollRange = Math.max(0, contentHeight - vh);
      item.section.style.height = `${vh + item.scrollRange + 1}px`;

      if (item.stack) {
        item.stackTop = item.stack.offsetTop;
        item.stackHeight = item.stack.offsetHeight;
      }
    });

    update();
  }

  function progressFor(item) {
    const rect = item.section.getBoundingClientRect();
    const topbar = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--topbar-height"
      )
    );
    const offset = Number.isFinite(topbar) ? topbar : 0;
    const scrolled = Math.min(
      Math.max(-(rect.top - offset), 0),
      item.scrollRange || 0
    );
    return { scrolled, rect };
  }

  function update() {
    const vh = viewportHeight();
    const topbar = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--topbar-height"
      )
    );
    const offset = Number.isFinite(topbar) ? topbar : 0;
    const pinned = usePinnedScroll();
    // Focus line just below the top bar / upper viewport — active project is
    // the last one whose top has crossed this line (never jumps back to first).
    const focusY = offset + Math.min(96, window.innerHeight * 0.18);

    let activeId = null;

    state.forEach((item) => {
      const { scrolled, rect } = progressFor(item);

      if (pinned) {
        item.track.style.transform = `translate3d(0, ${-scrolled}px, 0)`;
      } else {
        item.track.style.transform = "";
      }

      // Bio-based 3.1 → 3.2 opacity fade
      if (item.overlay && item.stack) {
        if (pinned) {
          const stackHeight = Math.max(
            1,
            item.stackHeight || item.stack.offsetHeight
          );
          const start = item.stackTop - vh * 0.08;
          const end = item.stackTop + Math.min(vh * 0.28, stackHeight * 0.22);
          const t = end <= start ? 1 : (scrolled - start) / (end - start);
          item.overlay.style.opacity = String(Math.min(1, Math.max(0, t)));
        } else {
          // Mobile (simple scroll): fade as the stack moves up through the viewport
          const stackRect = item.stack.getBoundingClientRect();
          const viewBottom = window.innerHeight;
          const viewTop = offset;
          const start = viewBottom - 40;
          const end = viewTop + Math.min(160, window.innerHeight * 0.22);
          const t = (start - stackRect.top) / Math.max(1, start - end);
          item.overlay.style.opacity = String(Math.min(1, Math.max(0, t)));
        }
      }

      if (rect.top <= focusY) {
        activeId = item.id;
      }
    });

    // Before the first project reaches the focus line, highlight nothing yet
    // (avoids Special-Style flashing between projects / on the About block).
    if (!activeId) {
      const first = state[0];
      if (first) {
        const firstRect = first.section.getBoundingClientRect();
        if (firstRect.top < window.innerHeight && firstRect.bottom > offset) {
          activeId = first.id;
        }
      }
    }

    indexLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.project === activeId);
    });

    if (topbarProject) {
      topbarProject.textContent = activeId ? labels[activeId] || "" : "";
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  function goToProject(id) {
    const target = state.find((item) => item.id === id);
    if (!target) return;
    const top = window.scrollY + target.section.getBoundingClientRect().top;
    window.scrollTo({
      top,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  function goToTop() {
    closeMenu();
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  const aboutHome = document.getElementById("about-home");
  if (aboutHome) {
    aboutHome.addEventListener("click", (event) => {
      event.preventDefault();
      goToTop();
    });
  }

  // Mobile: extra scroll past the end returns to the top of the page
  let overscrollPull = 0;
  let touchLastY = 0;
  let touchTracking = false;

  function isPageBottom() {
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    return window.scrollY >= maxScroll - 4;
  }

  window.addEventListener(
    "wheel",
    (event) => {
      if (!narrowMq.matches) return;
      if (isPageBottom() && event.deltaY > 0) {
        overscrollPull += event.deltaY;
        if (overscrollPull > 100) {
          overscrollPull = 0;
          goToTop();
        }
      } else if (event.deltaY < 0) {
        overscrollPull = 0;
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "touchstart",
    (event) => {
      if (!narrowMq.matches || !event.touches[0]) return;
      touchLastY = event.touches[0].clientY;
      touchTracking = isPageBottom();
      overscrollPull = 0;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (!narrowMq.matches || !touchTracking || !event.touches[0]) return;
      const y = event.touches[0].clientY;
      const dy = touchLastY - y; // finger up → would scroll down
      if (isPageBottom() && dy > 0) overscrollPull += dy;
      touchLastY = y;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    () => {
      if (narrowMq.matches && overscrollPull > 70) goToTop();
      overscrollPull = 0;
      touchTracking = false;
    },
    { passive: true }
  );

  indexLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      goToProject(link.dataset.project);
      if (narrowMq.matches) closeMenu();
    });
  });

  if (burger) {
    burger.addEventListener("click", toggleMenu);
  }
  if (backdrop) {
    backdrop.addEventListener("click", closeMenu);
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  narrowMq.addEventListener("change", () => {
    if (!narrowMq.matches) closeMenu();
    measure();
  });

  const videos = Array.from(document.querySelectorAll("video"));
  const videosOnScreen = new Set();

  const ensurePlay = (video) => {
    if (document.hidden) return;
    if (!videosOnScreen.has(video)) return;
    video.muted = true;
    video.defaultMuted = true;
    if (
      video.ended ||
      (Number.isFinite(video.duration) &&
        video.duration > 0 &&
        video.currentTime >= video.duration - 0.08)
    ) {
      try {
        video.currentTime = 0;
      } catch (_) {
        /* ignore seek errors before metadata */
      }
    }
    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => {});
    }
  };

  const armVideo = (video) => {
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("disablepictureinpicture", "");
    video.removeAttribute("controls");
    video.preload = "auto";

    video.addEventListener("ended", () => {
      try {
        video.currentTime = 0;
      } catch (_) {}
      ensurePlay(video);
    });

    // iOS often pauses muted inline videos; nudge them back if still on screen
    video.addEventListener("pause", () => {
      if (videosOnScreen.has(video) && !document.hidden) {
        requestAnimationFrame(() => ensurePlay(video));
      }
    });

    video.addEventListener("loadeddata", () => ensurePlay(video));
    video.addEventListener("canplay", () => ensurePlay(video));
  };

  videos.forEach(armVideo);

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            videosOnScreen.add(video);
            ensurePlay(video);
          } else {
            videosOnScreen.delete(video);
            video.pause();
          }
        });
      },
      { threshold: [0, 0.05, 0.25], rootMargin: "80px 0px" }
    );
    videos.forEach((video) => io.observe(video));
  } else {
    videos.forEach((video) => {
      videosOnScreen.add(video);
      ensurePlay(video);
    });
  }

  // Remeasure whenever media resolves — reserved width/height keep layout
  // stable, but we still refresh after decode for exact sizes.
  const media = Array.from(document.querySelectorAll(".project img, .project video"));
  let measureScheduled = false;
  const scheduleMeasure = () => {
    if (measureScheduled) return;
    measureScheduled = true;
    requestAnimationFrame(() => {
      measureScheduled = false;
      measure();
    });
  };

  // First gesture unlocks autoplay on iOS Safari
  const unlockVideos = () => {
    videos.forEach((video) => {
      video.muted = true;
      if (videosOnScreen.has(video) || !("IntersectionObserver" in window)) {
        ensurePlay(video);
      } else {
        // Prime decode even if off-screen
        video.play().then(() => video.pause()).catch(() => {});
      }
    });
  };
  document.addEventListener("touchstart", unlockVideos, {
    once: true,
    passive: true,
  });
  document.addEventListener("click", unlockVideos, { once: true });

  // After lock/unlock iOS often leaves videos at broken intrinsic sizes —
  // force a layout pass and resume playback.
  const repairVideos = () => {
    videos.forEach((video) => {
      video.style.width = "";
      video.style.height = "";
      video.style.maxWidth = "";
      // Toggle to kick WebKit layout
      video.style.display = "none";
      void video.offsetHeight;
      video.style.display = "";
      ensurePlay(video);
    });
    scheduleMeasure();
  };

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      requestAnimationFrame(repairVideos);
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) repairVideos();
    else requestAnimationFrame(repairVideos);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      scheduleMeasure();
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      onScroll();
      videos.forEach((video) => ensurePlay(video));
    },
    { passive: true }
  );
  window.addEventListener("resize", measure);

  const markReady = (el) => {
    el.classList.add("is-ready");
    scheduleMeasure();
  };

  media.forEach((el) => {
    if (el.tagName === "IMG") {
      if (el.complete && el.naturalWidth > 0) markReady(el);
      else {
        el.addEventListener("load", () => markReady(el));
        el.addEventListener("error", () => markReady(el));
      }
    } else {
      if (el.readyState >= 2) markReady(el);
      else {
        el.addEventListener("loadeddata", () => markReady(el));
        el.addEventListener("error", () => markReady(el));
      }
    }
  });

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(scheduleMeasure);
    media.forEach((el) => ro.observe(el));
  }

  // First measure uses intrinsic width/height placeholders so project
  // sections already have the correct scroll length while assets load.
  measure();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleMeasure);
  }
})();
