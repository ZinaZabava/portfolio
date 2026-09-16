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

  /* The loader holds until the first screens can actually be painted: the
     About block and the first project, video posters included. Not the whole
     site — that is 57 MB of images, and waiting on it would mean staring at
     the loader for a minute. Videos are not waited on either; their poster is
     what the viewer sees and the clip streams in once reached.
     A failed image resolves like a loaded one, so a single 404 can never
     strand the loader, and MAX_WAIT below is the final backstop. */
  const firstProject = document.querySelector(".project:not([hidden])");
  const criticalImages = [
    ...document.querySelectorAll("#about img"),
    ...(firstProject ? firstProject.querySelectorAll("img") : []),
  ];

  const imageReady = (img) => {
    const loaded =
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
    // decode() means paintable, not merely downloaded.
    return loaded.then(() =>
      img.decode ? img.decode().catch(() => {}) : undefined
    );
  };

  const mediaReady = Promise.all(criticalImages.map(imageReady));

  /* Once the first screens are ready, quietly pull the rest of the site's
     images into the HTTP cache while the loader is still up. Total download is
     only a few MB, so by the time anyone scrolls there is no network left to
     wait for. Deliberately a fetch and not a decode: decoding everything would
     pin hundreds of MB of bitmaps, which is the opposite of what we want.
     Decoding stays where it belongs, a screen ahead of the viewport. */
  function prefetchRest() {
    const rest = [...document.querySelectorAll(".project img")].filter(
      (img) => !criticalImages.includes(img)
    );
    let i = 0;
    const step = () => {
      if (i >= rest.length) return;
      const img = rest[i++];
      const done = () => {
        if (window.requestIdleCallback) window.requestIdleCallback(step);
        else setTimeout(step, 32);
      };
      if (img.complete && img.naturalWidth > 0) return done();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    };
    step();
  }
  mediaReady.then(prefetchRest);

  function lockRoleWidth() {
    const first = role.querySelector(".is-in");
    if (!first) return;
    // Measure every phrase and reserve the widest. Locking to the first one
    // meant the longer phrases overflowed a box sized for "Graphic designer".
    const probe = document.createElement("span");
    probe.className = "loader__role-line";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "nowrap";
    probe.style.width = "max-content";
    role.appendChild(probe);
    let widest = first.getBoundingClientRect().width;
    PHRASES.forEach((phrase) => {
      probe.textContent = phrase;
      widest = Math.max(widest, probe.getBoundingClientRect().width);
    });
    probe.remove();
    role.style.width = `${Math.ceil(widest)}px`;
    // On a narrow screen the widest phrase can be wider than the column, and a
    // fixed width would push the loader sideways. Cap it and let it shrink.
    role.style.maxWidth = "100%";
  }

  let mediaDone = false;
  mediaReady.then(() => {
    mediaDone = true;
  });

  let scheduled = false;
  async function start() {
    if (scheduled) return;
    scheduled = true;
    lockRoleWidth();

    if (reducedMotion) {
      await wait(HOLD);
      await mediaReady;
      dismiss();
      return;
    }

    let index = 1;
    let firstPass = true;
    while (true) {
      await wait(index === 1 && firstPass ? HOLD + 1500 : HOLD);
      if (dismissed) return;
      if (index >= PHRASES.length) {
        // Sequence done. Leave if the first screens are painted, otherwise
        // cycle the phrases again rather than freezing on the last one.
        if (mediaDone) break;
        index = 0;
        firstPass = false;
      }
      await shiftTo(PHRASES[index]);
      if (dismissed) return;
      index += 1;
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

  // Fraction of a viewport each project rests, fully arrived, before the next
  // one starts covering it. Raise for a longer pause, 0 for none.
  const DESKTOP_HOLD = 0.2;

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
      // Without this the next project starts covering on the pixel after the
      // media finishes. The hold is a beat where the project sits fully
      // arrived — the mobile branch above does the same thing.
      const hold = isLast ? 0 : Math.round(vh * DESKTOP_HOLD);
      item.section.style.height = `${item.scrollRange + hold + (isLast ? 1 : 2) * vh}px`;
    });

    if (about) {
      about.style.height = "";
      about.style.removeProperty("--about-stick-top");
      if (useCoverScroll() && !usePinnedScroll()) {
        const inner = about.querySelector(".site-footer__inner");
        const contentHeight = inner ? inner.offsetHeight : about.offsetHeight;
        const stickTop = Math.min(0, vh - contentHeight);
        about.style.setProperty("--about-stick-top", `${stickTop}px`);
        const hold = Math.round(vh * 0.85);
        const coverDist = Math.round(vh * 1.4);
        about.style.height = `${contentHeight + hold + coverDist}px`;
      }
    }

    document.documentElement.classList.add("is-ready");
    update();
  }

  /* Decoding is the slow half of showing an image, and doing it while a
     project is sliding into view is what makes it arrive in bands. Once a
     project comes within a screen of the viewport its images are decoded off
     the main thread, so by the time it covers there is nothing left to do but
     paint. Runs once per image. */
  const decodedImages = new WeakSet();
  function warmProject(item) {
    item.section.querySelectorAll("img").forEach((img) => {
      if (decodedImages.has(img) || !img.decode) return;
      decodedImages.add(img);
      img.decode().catch(() => {
        // Not yet downloaded, or failed — retry naturally on the next pass.
        decodedImages.delete(img);
      });
    });
  }

  function progressFor(item, offset) {
    // Reuses the rect cached at the top of the frame. This used to take its
    // own measurement AND a getComputedStyle on the root element, both of
    // which force a style/layout recalculation — nine times over, every frame.
    const rect = item.frameRect || item.section.getBoundingClientRect();
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

    const nearH = viewportHeight();

    // Every rect this frame needs is read here, before a single style is
    // written. Reading geometry after a write forces the browser to redo
    // layout on the spot, and the old code did that nine times a frame.
    state.forEach((item) => {
      item.frameRect = item.section.getBoundingClientRect();
    });

    state.forEach((item) => {
      const { scrolled, rect } = progressFor(item, offset);

      if (pinned) {
        item.track.style.transform = `translate3d(0, ${-scrolled}px, 0)`;
      } else {
        item.track.style.transform = "";
      }

      // A screen either side of the viewport. Only these get composited
      // layers, and their images are decoded before they are needed rather
      // than during the transition.
      const near = rect.top < nearH * 2 && rect.bottom > -nearH;
      if (near !== item.near) {
        item.near = near;
        item.section.classList.toggle("is-near", near);
        if (near) warmProject(item);
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
        const nextTop = next ? next.frameRect.top : Infinity;
        const coverAmt = Math.min(
          1,
          Math.max(0, (vh - (nextTop - offset)) / vh)
        );
        // Quantised to half a pixel: a full-viewport blur re-rasterises on
        // every distinct value, and stepping it per scroll pixel was ~100
        // rasterisations per transition instead of ~24.
        const blur =
          coverAmt > 0 ? `blur(${(Math.round(coverAmt * 24) / 2).toFixed(1)}px)` : "";
        if (item.pin.style.filter !== blur) item.pin.style.filter = blur;

        // The pin is sticky at `offset` inside its section, so the section's
        // own top tells us whether it has stuck yet — no second layout read.
        item.pin.classList.toggle("is-arriving", item.frameRect.top - offset > 1);
      });
      if (about && state[0]) {
        const firstTop = state[0].section.getBoundingClientRect().top - offset;
        const coverAmt = Math.min(1, Math.max(0, (vh - firstTop) / vh));
        const blur =
          coverAmt > 0 ? `blur(${(Math.round(coverAmt * 24) / 2).toFixed(1)}px)` : "";
        if (about.style.filter !== blur) about.style.filter = blur;
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
      // Keep-alive for iOS, which pauses muted video on its own. Once per
      // frame and only for what is actually on screen — this used to run for
      // every video on every scroll event.
      videosOnScreen.forEach((video) => ensurePlay(video));
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

  // Beat between a video arriving on screen and starting. data-play-delay on a
  // single video overrides it; 0 starts immediately.
  const PLAY_DELAY = 0.7;

  const playHoldMs = (video) => {
    const n = Number(video.dataset.playDelay);
    const seconds = Number.isFinite(n) && n >= 0 ? n : PLAY_DELAY;
    return seconds > 0 ? Math.round(seconds * 1000) : 0;
  };

  const clearPlayHold = (video) => {
    const timer = playHoldTimers.get(video);
    if (timer) {
      window.clearTimeout(timer);
      playHoldTimers.delete(video);
    }
    holding.delete(video);
  };

  const setPlaying = (video, on) => {
    video.classList.toggle("is-playing", on);
  };

  const ensurePlay = (video) => {
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
    // The hold applies once per appearance. holdDone is cleared when a video
    // leaves the viewport, so it waits again next time it comes back — but the
    // loop itself stays native and seamless, with no pause between passes.
    const shouldHold = delay > 0 && !holdDone.has(video);

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
    // Native looping stays on even with a delay: the wait is for arriving on
    // screen, not something to repeat between passes.
    video.loop = true;
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
    // Nothing is fetched or started by the browser on its own. The observers
    // below warm a clip up as it approaches and start it once it is actually
    // on screen; before that a video costs nothing but its poster.
    video.preload = "none";
    video.autoplay = false;
    video.removeAttribute("autoplay");

    video.addEventListener("playing", () => setPlaying(video, true));
    video.addEventListener("ended", () => {
      setPlaying(video, false);
      holdDone.delete(video);
      try {
        video.currentTime = 0;
      } catch (_) {}
      ensurePlay(video);
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
    // Stage one: a screen out, start buffering so the clip is ready by the
    // time it arrives. Runs once per video.
    const warmed = new WeakSet();
    const preloader = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const video = entry.target;
          preloader.unobserve(video);
          if (warmed.has(video)) return;
          warmed.add(video);
          video.preload = "auto";
          try {
            video.load();
          } catch (_) {
            /* ignore */
          }
        });
      },
      { threshold: 0, rootMargin: "100% 0px" }
    );

    // Stage two: play only once the video is genuinely on screen. Starting at
    // 20% and stopping at 0% leaves a dead band between, so a video parked at
    // the edge of the viewport cannot flicker between play and pause.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            videosOnScreen.add(video);
            ensurePlay(video);
          } else if (!entry.isIntersecting) {
            videosOnScreen.delete(video);
            clearPlayHold(video);
            holdDone.delete(video);
            setPlaying(video, false);
            video.pause();
          }
        });
      },
      { threshold: [0, 0.2, 0.5], rootMargin: "0px" }
    );
    videos.forEach((video) => {
      preloader.observe(video);
      io.observe(video);
    });
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

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", scheduleMeasure);

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
