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
    const vh = viewportHeight();

    state.forEach((item) => {
      item.track.style.transform = "translate3d(0,0,0)";
      item.track.style.paddingBottom = "0px";

      const contentHeight = item.track.scrollHeight;
      item.scrollRange = Math.max(0, contentHeight - vh);

      // One continuous scroll: section height matches content travel only.
      // Next project covers as soon as this one's media has scrolled through.
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
    // Account for sticky top offset under the narrow top bar
    const scrolled = Math.min(
      Math.max(-(rect.top - offset), 0),
      item.scrollRange || 0
    );
    return { scrolled, rect };
  }

  function update() {
    let activeId = state[0]?.id;
    const vh = viewportHeight();
    const topbar = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--topbar-height"
      )
    );
    const offset = Number.isFinite(topbar) ? topbar : 0;

    state.forEach((item, index) => {
      const { scrolled, rect } = progressFor(item);

      if (!reducedMotion) {
        item.track.style.transform = `translate3d(0, ${-scrolled}px, 0)`;
      }

      // Quicker opacity: finish fade soon after the stack enters view
      if (item.overlay && item.stack) {
        const stackHeight = Math.max(
          1,
          item.stackHeight || item.stack.offsetHeight
        );
        const start = item.stackTop - vh * 0.08;
        const end = item.stackTop + Math.min(vh * 0.28, stackHeight * 0.22);
        const t = end <= start ? 1 : (scrolled - start) / (end - start);
        item.overlay.style.opacity = String(Math.min(1, Math.max(0, t)));
      }

      // Active = topmost project whose pin currently owns the viewport
      const pinTop = offset;
      const covers =
        rect.top <= pinTop + 8 && rect.bottom > pinTop + vh * 0.35;
      if (covers) {
        activeId = item.id;
      }

      if (index === state.length - 1 && rect.bottom <= offset + vh) {
        activeId = item.id;
      }
    });

    indexLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.project === activeId);
    });

    if (topbarProject) {
      topbarProject.textContent = labels[activeId] || "";
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
    if (document.hidden || !videosOnScreen.has(video)) return;
    if (video.ended || (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime >= video.duration - 0.08)) {
      try {
        video.currentTime = 0;
      } catch (_) {
        /* ignore seek errors before metadata */
      }
    }
    if (video.paused) {
      video.play().catch(() => {});
    }
  };

  videos.forEach((video) => {
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.preload = "auto";

    // Hard-loop fallback for browsers that stall on `loop`
    video.addEventListener("ended", () => {
      try {
        video.currentTime = 0;
      } catch (_) {}
      ensurePlay(video);
    });

    video.addEventListener("pause", () => {
      // Resume if the browser paused an on-screen clip (common with sticky scroll)
      ensurePlay(video);
    });

    video.addEventListener("loadeddata", () => ensurePlay(video));
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) {
            videosOnScreen.add(video);
            ensurePlay(video);
          } else {
            videosOnScreen.delete(video);
            video.pause();
          }
        });
      },
      { threshold: [0, 0.01, 0.15], rootMargin: "40px 0px" }
    );
    videos.forEach((video) => io.observe(video));
  } else {
    videos.forEach((video) => {
      videosOnScreen.add(video);
      ensurePlay(video);
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      videos.forEach((video) => ensurePlay(video));
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      onScroll();
      videos.forEach((video) => ensurePlay(video));
    },
    { passive: true }
  );
  window.addEventListener("resize", measure);

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
