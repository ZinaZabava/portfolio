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
    "Social Media",
    "Motion",
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
    // Measure in this turn so About cannot overlap the first project
    // before section heights exist.
    void root.offsetHeight;
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event("resize"));
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

  function lockRoleWidth() {
    const first = role.querySelector(".is-in");
    if (!first) return;
    role.style.width = `${Math.ceil(first.getBoundingClientRect().width)}px`;
  }

  let scheduled = false;
  async function start() {
    if (scheduled) return;
    scheduled = true;
    lockRoleWidth();

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
  const about = document.getElementById("about");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const narrowMq = window.matchMedia("(max-width: 900px)");
  const coarseMq = window.matchMedia("(hover: none) and (pointer: coarse)");

  function usePinnedScroll() {
    return !reducedMotion && !narrowMq.matches;
  }

  function useCoverScroll() {
    return !reducedMotion;
  }

  function syncScrollMode() {
    document.documentElement.classList.toggle(
      "is-simple-scroll",
      !usePinnedScroll()
    );
  }

  syncScrollMode();

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

    state.forEach((item, i) => {
      item.track.style.transform = "";
      item.track.style.paddingBottom = "0px";
      const isLast = i === state.length - 1;

      if (!useCoverScroll()) {
        item.section.style.height = "";
        item.scrollRange = 0;
        if (item.pin) item.pin.style.removeProperty("--pin-stick-top");
        return;
      }

      if (!usePinnedScroll()) {
        // Mobile: text then images in flow. Stick the last viewport of this
        // project, then give one extra screen so the next can cover it.
        item.scrollRange = 0;
        if (item.pin) {
          const contentHeight = item.pin.offsetHeight;
          const stickTop = Math.min(0, vh - contentHeight);
          item.pin.style.setProperty("--pin-stick-top", `${stickTop}px`);
          const hold = isLast ? 0 : Math.round(vh * 0.85);
          const coverDist = isLast ? 0 : Math.round(vh * 1.4);
          document.documentElement.style.setProperty(
            "--cover-pull",
            `${coverDist || Math.round(vh * 1.4)}px`
          );
          item.section.style.height = `${contentHeight + hold + coverDist}px`;
        }
        return;
      }

      if (item.pin) item.pin.style.removeProperty("--pin-stick-top");
      document.documentElement.style.removeProperty("--cover-pull");

      const contentHeight = item.track.scrollHeight;
      const viewH = item.track.clientHeight || vh;
      item.scrollRange = Math.max(0, contentHeight - viewH);
      item.section.style.height = `${item.scrollRange + (isLast ? 1 : 2) * vh}px`;
    });

    document.documentElement.classList.add("is-ready");
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
    const topbar = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--topbar-height"
      )
    );
    const offset = Number.isFinite(topbar) ? topbar : 0;
    const pinned = usePinnedScroll();
    const cover = useCoverScroll();
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

    if (cover) {
      const vh = viewportHeight();
      state.forEach((item, i) => {
        if (!item.pin) return;
        const next = state[i + 1];
        const nextTop = next
          ? next.section.getBoundingClientRect().top
          : Infinity;
        const coverAmt = Math.min(
          1,
          Math.max(0, (vh - (nextTop - offset)) / vh)
        );
        item.pin.style.filter =
          coverAmt > 0 ? `blur(${(coverAmt * 12).toFixed(2)}px)` : "";

        const pinTop = item.pin.getBoundingClientRect().top - offset;
        item.pin.classList.toggle("is-arriving", pinTop > 1);
      });
      if (about && state[0]) {
        const firstTop = state[0].section.getBoundingClientRect().top - offset;
        const coverAmt = Math.min(1, Math.max(0, (vh - firstTop) / vh));
        about.style.filter =
          coverAmt > 0 ? `blur(${(coverAmt * 12).toFixed(2)}px)` : "";
      }
    } else {
      state.forEach((item) => {
        if (!item.pin) return;
        item.pin.style.filter = "";
        item.pin.classList.remove("is-arriving");
      });
      if (about) about.style.filter = "";
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
      const first = state[0];
      const firstTop = first
        ? first.section.getBoundingClientRect().top
        : Infinity;
      if (firstTop > focusY) {
        activeId = "about";
      }
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
    goToTop();
  }

  const stripeAbout = document.getElementById("stripe-about");
  const stripeNav = document.getElementById("stripe-nav");
  const stripeList = document.getElementById("stripe-projects");
  const stripeMenu = document.getElementById("stripe-menu");

  const setNavOpen = (open) => {
    if (!stripeNav) return;
    stripeNav.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("is-nav-open", open);
    if (stripeMenu) {
      stripeMenu.setAttribute("aria-expanded", open ? "true" : "false");
      stripeMenu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  };

  if (stripeAbout) {
    stripeAbout.addEventListener("click", (event) => {
      event.preventDefault();
      if (stripeNav && stripeNav.classList.contains("is-open")) {
        setNavOpen(false);
        return;
      }
      goToAbout();
    });
  }

  if (stripeNav && stripeList) {
    if (about) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const name = document.createElement("span");
      link.href = "#about";
      link.dataset.project = "about";
      name.className = "stripe__list-name";
      name.textContent = "About";
      link.append(name);
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setNavOpen(false);
        requestAnimationFrame(() => goToAbout());
      });
      item.appendChild(link);
      stripeList.appendChild(item);
    }

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
      if (type) meta.textContent = type;
      link.append(name, meta);
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setNavOpen(false);
        requestAnimationFrame(() => goToProject(section.dataset.project));
      });
      item.appendChild(link);
      stripeList.appendChild(item);
    });

    if (stripeMenu) {
      stripeMenu.addEventListener("click", (event) => {
        event.preventDefault();
        setNavOpen(!stripeNav.classList.contains("is-open"));
      });
    }

    document.addEventListener("click", (event) => {
      if (!stripeNav.contains(event.target)) setNavOpen(false);
    });
    stripeList.addEventListener("click", (event) => {
      if (event.target === stripeList) setNavOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setNavOpen(false);
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
  const holding = new WeakSet();
  const holdDone = new WeakSet();

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
    holding.delete(video);
  };

  const isAtStart = (video) => {
    if (video.ended) return true;
    const t = video.currentTime;
    if (!Number.isFinite(t) || t <= 0.05) return true;
    return (
      Number.isFinite(video.duration) &&
      video.duration > 0 &&
      t >= video.duration - 0.08
    );
  };

  const setPlaying = (video, on) => {
    video.classList.toggle("is-playing", on);
  };

  const ensurePlay = (video, loopHold = false) => {
    if (document.hidden) return;
    if (!videosOnScreen.has(video)) return;
    if (holding.has(video)) return;
    video.muted = true;
    video.defaultMuted = true;

    const start = () => {
      if (document.hidden || !videosOnScreen.has(video)) return;
      holding.delete(video);
      playHoldTimers.delete(video);
      holdDone.add(video);
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
      if (playAttempt && typeof playAttempt.then === "function") {
        playAttempt
          .then(() => setPlaying(video, true))
          .catch(() => setPlaying(video, false));
      }
    };

    const delay = playHoldMs(video);
    const shouldHold =
      delay > 0 && (loopHold || (isAtStart(video) && !holdDone.has(video)));

    if (shouldHold) {
      holding.add(video);
      try {
        video.pause();
      } catch (_) {}
      try {
        if (video.currentTime > 0.05) video.currentTime = 0;
      } catch (_) {}
      setPlaying(video, false);
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
    video.playsInline = true;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("disablepictureinpicture", "");
    video.removeAttribute("controls");
    video.preload = "auto";
    // Reduce Motion: iOS treats autoplay muted videos as background
    // motion and never paints a frame. JS starts them after a gesture.
    if (reducedMotion || hold) {
      video.autoplay = false;
      video.removeAttribute("autoplay");
    } else {
      video.autoplay = true;
      video.setAttribute("autoplay", "");
    }

    video.addEventListener("playing", () => setPlaying(video, true));
    video.addEventListener("ended", () => {
      setPlaying(video, false);
      holdDone.delete(video);
      try {
        video.currentTime = 0;
      } catch (_) {}
      ensurePlay(video, true);
    });

    video.addEventListener("pause", () => {
      if (holding.has(video)) return;
      setPlaying(video, false);
      if (videosOnScreen.has(video) && !document.hidden) {
        requestAnimationFrame(() => ensurePlay(video));
      }
    });

    video.addEventListener("loadeddata", () => ensurePlay(video));
    video.addEventListener("canplay", () => ensurePlay(video));

    const frame = video.closest(".media");
    if (frame) {
      frame.addEventListener("click", () => {
        videosOnScreen.add(video);
        holdDone.add(video);
        ensurePlay(video);
      });
    }
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
            clearPlayHold(video);
            holdDone.delete(video);
            setPlaying(video, false);
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
    state.forEach((item) => {
      if (item.pin) ro.observe(item.pin);
    });
  }

  // First measure uses intrinsic width/height placeholders so project
  // sections already have the correct scroll length while assets load.
  measure();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleMeasure);
  }
})();
