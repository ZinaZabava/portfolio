/* ===================== Intro loader =====================
   Three equal columns: name, the ZR mark, then a rotating role. After the
   last phrase, the whole panel fades out. */
(() => {
  const loader = document.getElementById("loader");
  if (!loader) return;

  const role = document.getElementById("loader-role");
  const root = document.documentElement;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const PHRASES = [
    "Graphic designer",
    "Visual Identity",
    "Book Design",
    "Printed Matter",
    "Social Media",
    "Simple Animations",
    "Exhibition Materials",
  ];
  const HOLD = 420; // time each phrase stays put
  const SHIFT = 200; // slide up to the next phrase
  const FADE = 600; // whole-loader opacity fade
  const MAX_WAIT = 16000;

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  function finish() {
    loader.remove();
    root.classList.remove("is-loading");
    // Project heights were measured behind the loader; re-run now it is gone
    void root.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        window.dispatchEvent(new Event("resize"));
      });
    });
  }

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    loader.classList.add("is-dismissing");
    window.setTimeout(finish, FADE);
  }

  function shiftTo(next) {
    const current = role.querySelector(".is-in");
    if (!current) {
      role.textContent = "";
      const line = document.createElement("span");
      line.className = "loader__role-line is-in";
      line.textContent = next;
      role.appendChild(line);
      return wait(0);
    }

    const incoming = document.createElement("span");
    incoming.className = "loader__role-line is-prep";
    incoming.textContent = next;
    role.appendChild(incoming);

    const nextHeight = Math.max(current.offsetHeight, incoming.offsetHeight);
    role.style.height = `${nextHeight}px`;

    incoming.classList.remove("is-prep");
    incoming.classList.add("is-from-below");
    void incoming.offsetWidth;

    current.classList.remove("is-in");
    current.classList.add("is-to-above");
    incoming.classList.remove("is-from-below");
    incoming.classList.add("is-in");

    return wait(SHIFT).then(() => {
      current.remove();
      role.style.height = "";
    });
  }

  const fontsReady =
    document.fonts && document.fonts.ready
      ? document.fonts.ready
      : Promise.resolve();

  let scheduled = false;
  async function start() {
    if (scheduled) return;
    scheduled = true;

    if (reducedMotion) {
      await wait(HOLD);
      dismiss();
      return;
    }

    for (let i = 1; i < PHRASES.length; i += 1) {
      await wait(i === 1 ? HOLD + 1500 : HOLD);
      if (dismissed) return;
      await shiftTo(PHRASES[i]);
      if (dismissed) return;
    }
    await wait(HOLD);
    if (!dismissed) dismiss();
  }

  fontsReady.then(start);
  window.setTimeout(() => {
    if (!scheduled) start();
    else if (!dismissed) dismiss();
  }, MAX_WAIT);
})();

(() => {
  document.documentElement.classList.add("js");
  window.addEventListener("pageshow", () => {
    window.scrollTo(0, 0);
  });

  const projects = Array.from(
    document.querySelectorAll(".project:not([hidden])")
  );
  const stripeProject = document.getElementById("stripe-project");
  const about = document.getElementById("about");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const narrowMq = window.matchMedia("(max-width: 900px)");
  const coarseMq = window.matchMedia("(hover: none) and (pointer: coarse)");

  function usePinnedScroll() {
    return !reducedMotion && !narrowMq.matches && !coarseMq.matches;
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
    return {
      section,
      pin,
      track,
      id: section.dataset.project,
      scrollRange: 0,
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

  function measure() {
    // Heights taken while html was overflow-clipped are viewport-tall in
    // Safari, which is what hides each project's images under its intro.
    syncScrollMode();
    if (document.documentElement.classList.contains("is-loading")) return;
    const vh = viewportHeight();

    state.forEach((item) => {
      item.track.style.transform = "";
      item.track.style.paddingBottom = "0px";

      if (!usePinnedScroll()) {
        // Mobile / reduced-motion: natural document height, all media visible
        item.section.style.height = "";
        item.scrollRange = 0;
        return;
      }

      const contentHeight = item.track.scrollHeight;
      item.scrollRange = Math.max(0, contentHeight - vh);
      item.section.style.height = `${vh + item.scrollRange + 1}px`;
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

      if (rect.top <= focusY) {
        activeId = item.id;
      }
    });

    if (pinned) {
      state.forEach((item, i) => {
        if (!item.pin) return;
        const next = state[i + 1];
        const nextTop = next
          ? next.section.getBoundingClientRect().top
          : about
            ? about.getBoundingClientRect().top
            : Infinity;
        const cover = Math.min(
          1,
          Math.max(0, (vh - (nextTop - offset)) / vh)
        );
        item.pin.style.opacity = String(1 - cover);
      });
    } else {
      state.forEach((item) => {
        if (item.pin) item.pin.style.opacity = "";
      });
    }

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

    if (about) {
      const aboutRect = about.getBoundingClientRect();
      if (aboutRect.top <= focusY) {
        activeId = "about";
      }
    }

    if (stripeProject) {
      stripeProject.textContent =
        activeId === "about" ? "About" : activeId ? labels[activeId] || "" : "";
    }
    document.querySelectorAll("#stripe-projects a[data-project]").forEach((link) => {
      link.classList.toggle("is-current", link.dataset.project === activeId);
    });
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

  function goToTop() {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  function goToProject(id) {
    const item = state.find((entry) => entry.id === id);
    if (!item) return;
    const top = item.section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  function goToAbout() {
    if (!about) return;
    const top = window.scrollY + about.getBoundingClientRect().top;
    window.scrollTo({
      top,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  const stripeAbout = document.getElementById("stripe-about");
  if (stripeAbout) {
    stripeAbout.addEventListener("click", (event) => {
      event.preventDefault();
      goToAbout();
    });
  }

  const stripeNav = document.getElementById("stripe-nav");
  const stripeList = document.getElementById("stripe-projects");
  if (stripeNav && stripeList && stripeProject) {
    projects.forEach((section) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const name = document.createElement("span");
      const meta = document.createElement("span");
      const type =
        section.querySelector(".project__tags span")?.textContent.trim() || "";
      link.href = `#${section.id}`;
      link.dataset.project = section.dataset.project;
      name.className = "stripe__list-name";
      name.textContent = section.dataset.label || section.dataset.project;
      meta.className = "stripe__list-meta";
      if (type) meta.textContent = ` | ${type}`;
      link.append(name, meta);
      link.addEventListener("click", (event) => {
        event.preventDefault();
        goToProject(section.dataset.project);
        stripeNav.classList.remove("is-open");
        stripeProject.setAttribute("aria-expanded", "false");
      });
      item.appendChild(link);
      stripeList.appendChild(item);
    });

    const hoverNav = window.matchMedia("(hover: hover) and (pointer: fine)");
    const setOpen = (open) => {
      stripeNav.classList.toggle("is-open", open);
      stripeProject.setAttribute("aria-expanded", open ? "true" : "false");
    };

    stripeProject.addEventListener("click", (event) => {
      event.preventDefault();
      if (hoverNav.matches) return;
      setOpen(!stripeNav.classList.contains("is-open"));
    });

    if (hoverNav.matches) {
      stripeNav.addEventListener("mouseenter", () => setOpen(true));
      stripeNav.addEventListener("mouseleave", () => setOpen(false));
    } else {
      document.addEventListener("click", (event) => {
        if (!stripeNav.contains(event.target)) setOpen(false);
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }

  const footerTop = document.getElementById("footer-top");
  if (footerTop) {
    footerTop.addEventListener("click", (event) => {
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

  narrowMq.addEventListener("change", () => {
    measure();
  });
  if (coarseMq.addEventListener) {
    coarseMq.addEventListener("change", () => {
      measure();
    });
  }

  const videos = Array.from(
    document.querySelectorAll(".project:not([hidden]) .media:not([hidden]) video")
  );
  const videosOnScreen = new Set();
  const playHoldTimers = new WeakMap();

  const playHoldMs = (video) => {
    const n = Number(video.dataset.playDelay);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : 0;
  };

  const clearPlayHold = (video) => {
    const timer = playHoldTimers.get(video);
    if (timer) {
      window.clearTimeout(timer);
      playHoldTimers.delete(video);
    }
  };

  const ensurePlay = (video, holdStart = false) => {
    if (document.hidden) return;
    if (!videosOnScreen.has(video)) return;
    video.muted = true;
    video.defaultMuted = true;

    const start = () => {
      if (document.hidden || !videosOnScreen.has(video)) return;
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

    const delay = holdStart ? playHoldMs(video) : 0;
    if (delay) {
      clearPlayHold(video);
      try {
        video.pause();
      } catch (_) {}
      playHoldTimers.set(video, window.setTimeout(start, delay));
      return;
    }

    start();
  };

  const armVideo = (video) => {
    const hold = playHoldMs(video);
    video.loop = hold ? false : true;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = !hold;
    video.playsInline = true;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.setAttribute("muted", "");
    if (hold) video.removeAttribute("autoplay");
    else video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("disablepictureinpicture", "");
    video.removeAttribute("controls");
    video.preload = "auto";

    video.addEventListener("ended", () => {
      try {
        video.currentTime = 0;
      } catch (_) {}
      ensurePlay(video, hold > 0);
    });

    // iOS often pauses muted inline videos; nudge them back if still on screen
    video.addEventListener("pause", () => {
      if (playHoldTimers.has(video)) return;
      if (videosOnScreen.has(video) && !document.hidden) {
        requestAnimationFrame(() => ensurePlay(video));
      }
    });

    video.addEventListener("loadeddata", () => ensurePlay(video, hold > 0));
    video.addEventListener("canplay", () => ensurePlay(video, hold > 0));
  };

  videos.forEach(armVideo);

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            videosOnScreen.add(video);
            ensurePlay(video, playHoldMs(video) > 0);
          } else {
            videosOnScreen.delete(video);
            clearPlayHold(video);
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
  const media = Array.from(
    document.querySelectorAll(
      ".project:not([hidden]) .media:not([hidden]) img, .project:not([hidden]) .media:not([hidden]) video"
    )
  );
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
