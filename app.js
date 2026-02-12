import { supabase } from "./supabase.js";

async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from("sketches")
      .select("*")
      .limit(1);

    if (error) {
      console.error("Supabase connection error:", error);
    } else {
      console.log("Supabase connected successfully");
    }
  } catch (err) {
    console.error("Error testing Supabase connection:", err);
  }
}

testSupabaseConnection();

document.addEventListener("DOMContentLoaded", () => {
  const heroSection = document.querySelector(".hero").closest(".content-piece");

  function updateTilt() {
    const scrollPercent = window.scrollY / (window.innerHeight / 2);

    if (scrollPercent > 0.25) {
      heroSection.classList.remove("broken");
    } else {
      heroSection.classList.add("broken");
    }
  }

  window.addEventListener("scroll", updateTilt);
  updateTilt();

  const artsGrid = document.querySelector(".arts-grid");
  const artsItems = document.querySelectorAll(".arts-item");

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".arts-item")) {
      const currentActive = document.querySelector(".arts-item.active");
      if (currentActive) {
        currentActive.classList.remove("active", "right-column");
        artsGrid.classList.remove("expanded");
        resetItemPositions();
      }
    }
  });

  const getColumn = (element) => {
    const rect = element.getBoundingClientRect();
    const containerRect = artsGrid.getBoundingClientRect();
    const third = containerRect.width / 3;
    const relativeX = rect.left - containerRect.left;
    return Math.floor(relativeX / third);
  };

  artsItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();

      const currentActive = document.querySelector(".arts-item.active");
      if (currentActive) {
        if (currentActive === item) {
          item.classList.remove("active", "right-column");
          artsGrid.classList.remove("expanded");
          resetItemPositions();
          return;
        }

        currentActive.classList.remove("active", "right-column");
        artsGrid.classList.remove("expanded");
        resetItemPositions();

        setTimeout(() => {
          activateItem(item);
        }, 300);
        return;
      }

      activateItem(item);
    });
  });

  function handleItemPositions(activeItem, itemRect, textHeight) {
    const clickedColumn = getColumn(activeItem);
    let columnsToMove = clickedColumn === 1 ? [2] : [1];
    const gap = 20;

    const itemsToMove = Array.from(artsItems).filter((item) => {
      if (!item.classList.contains("active")) {
        const itemColumn = getColumn(item);
        return columnsToMove.includes(itemColumn);
      }
      return false;
    });

    const originalPositions = new Map();
    itemsToMove.forEach((item) => {
      originalPositions.set(item, item.getBoundingClientRect());
    });

    const textPanelTop = itemRect.top;
    const textPanelBottom = itemRect.top + textHeight;

    const topmostShiftingItem = itemsToMove
      .filter((item) => {
        const rect = originalPositions.get(item);
        const itemBottom = rect.top + rect.height;
        return (
          (rect.top <= textPanelBottom && itemBottom >= textPanelTop) ||
          rect.top >= textPanelTop ||
          (itemBottom >= textPanelTop - gap && rect.top <= textPanelTop)
        );
      })
      .sort(
        (a, b) => originalPositions.get(a).top - originalPositions.get(b).top,
      )[0];

    let additionalShift = 0;
    if (topmostShiftingItem) {
      const rect = originalPositions.get(topmostShiftingItem);
      if (rect.top < textPanelTop) {
        additionalShift = textPanelTop - rect.top;
      }
    }

    itemsToMove.forEach((item) => {
      const originalRect = originalPositions.get(item);
      const itemBottom = originalRect.top + originalRect.height;

      if (
        (originalRect.top <= textPanelBottom && itemBottom >= textPanelTop) ||
        originalRect.top >= textPanelTop ||
        (itemBottom >= textPanelTop - gap && originalRect.top <= textPanelTop)
      ) {
        item.style.transform = `translateY(${
          textHeight + additionalShift + 20
        }px)`;
      }
    });
  }

  function activateItem(item) {
    const items = Array.from(artsItems);
    const clickedIndex = items.indexOf(item);
    const originalRow = Math.floor(clickedIndex / 3);
    const originalCol = clickedIndex % 3;
    const startRow = originalRow * 2 + 1;
    const navHeight = document.querySelector("nav").offsetHeight;

    resetItemPositions();

    setTimeout(() => {
      item.classList.add("active");
      artsGrid.classList.add("expanded");

      const column = getColumn(item);
      if (column === 2) {
        item.classList.add("right-column");
      } else {
        item.classList.remove("right-column");
      }

      item.style.gridRow = `${startRow} / span 2`;
      item.style.gridColumn = originalCol === 2 ? "3" : "1";

      requestAnimationFrame(() => {
        const itemRect = item.getBoundingClientRect();
        const absoluteElementTop = window.pageYOffset + itemRect.top;
        const textDetails = item.querySelector(".item-details");
        const textHeight = textDetails.offsetHeight;

        handleItemPositions(item, itemRect, textHeight);

        window.scrollTo({
          top: absoluteElementTop - navHeight - 20,
          behavior: "smooth",
        });
      });
    }, 300);
  }

  function resetItemPositions() {
    artsItems.forEach((item) => {
      item.style.gridRow = "";
      item.style.gridColumn = "";
      item.style.transform = "";
    });
  }

  function createSketchCanvas() {
    let currentSessionDrawings = new Set();
    const heroSection = document.querySelector(".hero");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let path = [];
    let isSketch = false;
    let currentColor = "";

    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    let lastSoundTime = 0;
    const SOUND_THROTTLE = 50;

    function playDrawSound(frequency) {
      const now = Date.now();
      if (now - lastSoundTime < SOUND_THROTTLE) return;
      lastSoundTime = now;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.1;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1,
      );

      setTimeout(() => oscillator.stop(), 100);
    }

    function getFrequencyFromPosition(x, y, canvasWidth, canvasHeight) {
      const baseFreq = 200 + (x / canvasWidth) * 600;
      const yModulation = 1 + (y / canvasHeight) * 0.5;
      return baseFreq * yModulation;
    }

    function getRandomColor() {
      const h = Math.floor(Math.random() * 360);
      const s = Math.floor(Math.random() * 30) + 60;
      const l = Math.floor(Math.random() * 20) + 40;
      return `hsl(${h}, ${s}%, ${l}%)`;
    }

    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "auto";
    canvas.style.zIndex = "2";

    heroSection.style.position = "relative";
    heroSection.appendChild(canvas);

    let cursorColor = getRandomColor();
    const cursor = document.createElement("div");
    cursor.style.cssText = `
    position: fixed;
    width: 10px;
    height: 10px;
    background: ${cursorColor};
    border-radius: 50%;
    pointer-events: none;
    z-index: 3;
    transform: translate(-50%, -50%);
    transition: background-color 0.3s ease;
  `;
    document.body.appendChild(cursor);

    function draw(e) {
      if (!isSketch) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      path.push({ x, y });

      const frequency = getFrequencyFromPosition(
        x,
        y,
        canvas.width,
        canvas.height,
      );
      playDrawSound(frequency);

      ctx.beginPath();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.globalAlpha = 1.0;

      if (path.length > 1) {
        ctx.moveTo(path[path.length - 2].x, path[path.length - 2].y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }

    function updateCursor(e) {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
    }

    const sketchesChannel = supabase.channel("sketches");

    sketchesChannel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sketches",
        },
        handleNewSketch,
      )
      .subscribe();

    function handleNewSketch(payload) {
      if (
        payload.new &&
        (!payload.new.location || payload.new.location === "hero")
      ) {
        addSketchToCanvas(payload.new.path);
      }
    }

    function saveSketch() {
      if (path.length < 2) return;

      try {
        let svgPath = `M ${path[0].x} ${path[0].y}`;
        for (let i = 1; i < path.length; i++) {
          svgPath += ` L ${path[i].x} ${path[i].y}`;
        }

        const drawingId = Date.now().toString();
        currentSessionDrawings.add(drawingId);

        const pathElement = `<path data-id="${drawingId}" d="${svgPath}" stroke="${currentColor}" stroke-width="2" fill="none" opacity="1.0"/>`;

        supabase
          .from("sketches")
          .insert([{ path: pathElement, id: drawingId, location: "hero" }])
          .then(({ data, error }) => {
            if (error) {
              console.error("Supabase insert error:", error);
            } else {
              console.log("Sketch saved successfully:", data);
            }
          });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        path = [];
      } catch (err) {
        console.error("Error saving sketch:", err);
      }
    }

    function addSketchToCanvas(pathData) {
      const svgElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      svgElement.setAttribute(
        "viewBox",
        `0 0 ${canvas.width} ${canvas.height}`,
      );
      svgElement.style.width = "100%";
      svgElement.style.height = "100%";
      svgElement.style.position = "absolute";
      svgElement.style.top = "0";
      svgElement.style.left = "0";

      const idMatch = pathData.match(/data-id="([^"]+)"/);
      const drawingId = idMatch ? idMatch[1] : null;
      const opacity = currentSessionDrawings.has(drawingId) ? "1.0" : "0.4";
      const modifiedPathData = pathData.replace(
        /opacity="[^"]*"/,
        `opacity="${opacity}"`,
      );

      svgElement.innerHTML = modifiedPathData;
      document.querySelector(".saved-sketches").appendChild(svgElement);
    }

    function initializeBouncingHeadshot() {
      const container = document.querySelector(".about-container");
      const originalHeadshot = container.querySelector("img");
      const textContent = container.querySelector("p");

      const staticHeadshot = {
        x: originalHeadshot.offsetLeft,
        y: originalHeadshot.offsetTop,
        width: originalHeadshot.width,
        height: originalHeadshot.height,
        element: originalHeadshot,
      };

      const words = textContent.textContent.split(/\s+/);
      textContent.innerHTML = words
        .map((word) => `<span class="floating-word">${word}</span>`)
        .join(" ");

      const wordElements = textContent.querySelectorAll(".floating-word");
      let balls = [];

      class Ball {
        constructor(x, y) {
          this.element = originalHeadshot.cloneNode(true);
          this.element.style.position = "absolute";
          this.element.style.transform = `rotate(${Math.random() * 360}deg)`;
          container.appendChild(this.element);

          this.x = x;
          this.y = y;
          this.vx = (Math.random() - 0.5) * 15;
          this.vy = 5;
          this.rotation = Math.random() * 360;
          this.rotationSpeed = (Math.random() - 0.5) * 5;
          this.width = this.element.width;
          this.height = this.element.height;
        }

        update(others) {
          this.vy += 0.3;
          this.y += this.vy;
          this.x += this.vx;

          this.rotation += this.rotationSpeed;

          const maxY = container.clientHeight - this.height - 20;
          const maxX = container.clientWidth - this.width - 20;
          const minX = 20;

          if (this.y > maxY) {
            this.y = maxY;
            this.vy *= -0.65;
            this.vx *= 0.8;
          }

          if (this.x > maxX) {
            this.x = maxX;
            this.vx *= -0.65;
          } else if (this.x < minX) {
            this.x = minX;
            this.vx *= -0.65;
          }

          const dx = this.x - staticHeadshot.x;
          const dy = this.y - staticHeadshot.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDist = this.width;

          if (distance < minDist) {
            const angle = Math.atan2(dy, dx);
            const pushForce = (minDist - distance) / minDist;

            this.vx += Math.cos(angle) * pushForce * 2;
            this.vy += Math.sin(angle) * pushForce * 2;

            this.rotationSpeed = (Math.random() - 0.5) * 5;
          }

          others.forEach((other) => {
            if (other === this) return;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = this.width;

            if (distance < minDist) {
              const angle = Math.atan2(dy, dx);
              const overlap = minDist - distance;
              const percent = 0.3;
              const damping = 0.6;

              const moveX = Math.cos(angle) * overlap * percent;
              const moveY = Math.sin(angle) * overlap * percent;

              this.x -= moveX;
              this.y -= moveY;
              other.x += moveX;
              other.y += moveY;

              const nx = dx / distance;
              const ny = dy / distance;

              const rvx = other.vx - this.vx;
              const rvy = other.vy - this.vy;

              const normalVelocity = rvx * nx + rvy * ny;

              if (normalVelocity < 0) {
                const restitution = 0.3;
                const impulseMagnitude =
                  -(1 + restitution) * normalVelocity * damping;

                const impulseX = impulseMagnitude * nx;
                const impulseY = impulseMagnitude * ny;

                this.vx -= impulseX * 0.5;
                this.vy -= impulseY * 0.5;
                other.vx += impulseX * 0.5;
                other.vy += impulseY * 0.5;
              }

              this.rotationSpeed = (Math.random() - 0.5) * 2;
              other.rotationSpeed = (Math.random() - 0.5) * 2;
            }
          });

          this.element.style.left = `${this.x}px`;
          this.element.style.top = `${this.y}px`;
          this.element.style.transform = `rotate(${this.rotation}deg)`;

          const ballRect = this.element.getBoundingClientRect();
          wordElements.forEach((word) => {
            checkWordCollision(word, ballRect);
          });
        }
      }

      function checkWordCollision(wordEl, ballRect) {
        const wordRect = wordEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const relativeWord = {
          left: wordRect.left - containerRect.left,
          right: wordRect.right - containerRect.left,
          top: wordRect.top - containerRect.top,
          bottom: wordRect.bottom - containerRect.top,
        };

        const relativeBall = {
          left: ballRect.left - containerRect.left,
          right: ballRect.right - containerRect.left,
          top: ballRect.top - containerRect.top,
          bottom: ballRect.bottom - containerRect.top,
        };

        const collision = !(
          relativeWord.right < relativeBall.left ||
          relativeWord.left > relativeBall.right ||
          relativeWord.bottom < relativeBall.top ||
          relativeWord.top > relativeBall.bottom
        );

        if (collision) {
          const centerX = (relativeBall.left + relativeBall.right) / 2;
          const wordCenterX = (relativeWord.left + relativeWord.right) / 2;
          const pushRight = wordCenterX < centerX;

          const moveX = pushRight ? -50 : 50;
          const moveY = relativeWord.top < relativeBall.top ? -30 : 30;

          wordEl.style.transform = `translate(${moveX}px, ${moveY}px)`;
        } else {
          if (
            !balls.some((ball) => {
              const otherBallRect = ball.element.getBoundingClientRect();
              const overlap = !(
                wordRect.right < otherBallRect.left ||
                wordRect.left > otherBallRect.right ||
                wordRect.bottom < otherBallRect.top ||
                wordRect.top > otherBallRect.bottom
              );
              return overlap;
            })
          ) {
            wordEl.style.transform = "";
          }
        }
      }

      function animate() {
        balls.forEach((ball) => {
          ball.update(balls);
        });
        requestAnimationFrame(animate);
      }

      originalHeadshot.style.position = "absolute";
      originalHeadshot.style.left = originalHeadshot.offsetLeft + "px";
      originalHeadshot.style.top = originalHeadshot.offsetTop + "px";

      container.addEventListener("mousedown", (e) => {
        if (
          e.target.closest("a") ||
          e.target.closest(".contact-social") ||
          e.target.closest(".social-icon") ||
          e.target.closest(".contact-item")
        ) {
          return;
        }

        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const newBall = new Ball(
          clickX - originalHeadshot.width / 2,
          clickY - originalHeadshot.height / 2,
        );
        balls.push(newBall);
      });

      const cursor = document.createElement("div");
      cursor.className = "about-cursor";
      document.body.appendChild(cursor);

      container.addEventListener("mousemove", (e) => {
        const overInteractive =
          e.target.closest(".contact-item") ||
          e.target.closest(".social-icon") ||
          e.target.closest(".contact-social");

        cursor.style.left = e.clientX + "px";
        cursor.style.top = e.clientY + "px";
        cursor.style.opacity = overInteractive ? "0" : "1";
      });

      container.addEventListener("mouseenter", () => {
        cursor.style.opacity = "1";
      });

      container.addEventListener("mouseleave", () => {
        cursor.style.opacity = "0";
      });

      animate();
    }

    initializeBouncingHeadshot();

    canvas.addEventListener("mousemove", (e) => {
      updateCursor(e);
      if (isSketch) {
        draw(e);
      }
    });

    canvas.addEventListener("mouseenter", () => {
      cursor.style.display = "block";
    });

    canvas.addEventListener("mouseleave", () => {
      cursor.style.display = "none";
    });

    canvas.addEventListener("mousedown", (e) => {
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      isSketch = true;
      currentColor = getRandomColor();
      cursorColor = currentColor;
      cursor.style.backgroundColor = cursorColor;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      path = [
        {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        },
      ];
    });

    canvas.addEventListener("mouseup", () => {
      isSketch = false;
      if (path.length > 1) {
        saveSketch();
      }
    });

    async function loadSketches() {
      try {
        const { data, error } = await supabase
          .from("sketches")
          .select("*")
          .or("location.eq.hero,location.is.null")
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (data) {
          data.forEach((sketch) => {
            addSketchToCanvas(sketch.path);
          });
        }
      } catch (err) {
        console.error("Error loading sketches:", err);
      }
    }

    function resize() {
      const rect = heroSection.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    window.addEventListener("resize", resize);
    resize();
    loadSketches();
  }

  createSketchCanvas();

  function createBackgroundSketchCanvas() {
    let bgSessionDrawings = new Set();
    const bgLayer = document.querySelector(".bg-sketch-layer");
    const bgSavedSketches = document.querySelector(".bg-saved-sketches");
    const canvas = document.createElement("canvas");
    canvas.classList.add("bg-sketch-canvas");
    const ctx = canvas.getContext("2d");
    let path = [];
    let isSketch = false;
    let currentColor = "";

    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    let lastSoundTime = 0;
    const SOUND_THROTTLE = 50;

    function playDrawSound(frequency) {
      const now = Date.now();
      if (now - lastSoundTime < SOUND_THROTTLE) return;
      lastSoundTime = now;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.05;
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1,
      );
      setTimeout(() => oscillator.stop(), 100);
    }

    function getRandomColor() {
      const h = Math.floor(Math.random() * 360);
      const s = Math.floor(Math.random() * 30) + 60;
      const l = Math.floor(Math.random() * 20) + 40;
      return `hsl(${h}, ${s}%, ${l}%)`;
    }

    bgLayer.appendChild(canvas);

    let cursorColor = getRandomColor();
    const cursor = document.createElement("div");
    cursor.style.cssText = `
      position: fixed;
      width: 8px;
      height: 8px;
      background: ${cursorColor};
      border-radius: 50%;
      pointer-events: none;
      z-index: 10000;
      transform: translate(-50%, -50%);
      transition: background-color 0.3s ease;
      display: none;
    `;
    document.body.appendChild(cursor);

    // Track total document height for the canvas
    let docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
    );

    function resize() {
      const w = window.innerWidth;
      docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      );
      canvas.width = w;
      canvas.height = window.innerHeight;
      bgSavedSketches.style.height = docHeight + "px";
    }

    window.addEventListener("resize", resize);
    resize();

    // We need to figure out if the mouse is over interactive content or the background
    // The canvas is behind everything, so we use a different approach:
    // listen on document for drawing when not over interactive elements
    let mouseOverHero = false;
    let mouseOverInteractive = false;

    const heroEl = document.querySelector(".hero");
    const aboutContainer = document.querySelector(".about-container");

    document.addEventListener("mousemove", (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;

      // Check if over hero (has its own canvas) or about section (has its own cursor)
      mouseOverHero = !!el.closest(".hero");
      const overAbout = !!el.closest(".about-container");
      // Check if over any clickable/interactive element
      mouseOverInteractive = !!(
        el.closest("a") ||
        el.closest("button") ||
        el.closest(".arts-item") ||
        el.closest(".project-card") ||
        el.closest(".publication-card") ||
        el.closest("nav") ||
        el.closest(".contact-item") ||
        el.closest(".social-icon")
      );

      const showBgCursor =
        !mouseOverHero && !overAbout && !mouseOverInteractive;

      cursor.style.display = showBgCursor ? "block" : "none";
      if (showBgCursor) {
        document.body.classList.add("bg-drawing-active");
      } else {
        document.body.classList.remove("bg-drawing-active");
      }
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";

      if (isSketch && showBgCursor) {
        drawBg(e);
      } else if (isSketch && !showBgCursor) {
        // Stop drawing if we leave the background area
        finishStroke();
      }
    });

    document.addEventListener("mousedown", (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;

      const overHero = !!el.closest(".hero");
      const overAbout = !!el.closest(".about-container");
      const overInteractive = !!(
        el.closest("a") ||
        el.closest("button") ||
        el.closest(".arts-item") ||
        el.closest(".project-card") ||
        el.closest(".publication-card") ||
        el.closest("nav") ||
        el.closest(".contact-item") ||
        el.closest(".social-icon")
      );

      if (overHero || overAbout || overInteractive) return;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      isSketch = true;
      currentColor = getRandomColor();
      cursorColor = currentColor;
      cursor.style.backgroundColor = cursorColor;

      // Use absolute page coordinates for the path
      const absX = e.clientX;
      const absY = e.clientY + window.scrollY;

      path = [{ x: absX, y: absY }];
    });

    document.addEventListener("mouseup", () => {
      finishStroke();
    });

    function finishStroke() {
      if (!isSketch) return;
      isSketch = false;
      if (path.length > 1) {
        saveBgSketch();
      }
      path = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function drawBg(e) {
      if (!isSketch) return;

      const absX = e.clientX;
      const absY = e.clientY + window.scrollY;

      path.push({ x: absX, y: absY });

      const freq = 200 + (absX / canvas.width) * 600;
      playDrawSound(freq);

      // Draw on the temporary canvas using viewport-relative coords
      const viewX = e.clientX;
      const viewY = e.clientY;

      ctx.beginPath();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.globalAlpha = 1.0;

      if (path.length > 1) {
        const prevViewX = path[path.length - 2].x;
        const prevViewY = path[path.length - 2].y - window.scrollY;
        ctx.moveTo(prevViewX, prevViewY);
        ctx.lineTo(viewX, viewY);
        ctx.stroke();
      }
    }

    function saveBgSketch() {
      if (path.length < 2) return;

      try {
        let svgPath = `M ${path[0].x} ${path[0].y}`;
        for (let i = 1; i < path.length; i++) {
          svgPath += ` L ${path[i].x} ${path[i].y}`;
        }

        const drawingId = "bg-" + Date.now().toString();
        bgSessionDrawings.add(drawingId);

        const pathElement = `<path data-id="${drawingId}" d="${svgPath}" stroke="${currentColor}" stroke-width="2" fill="none" opacity="1.0"/>`;

        supabase
          .from("sketches")
          .insert([
            { path: pathElement, id: drawingId, location: "background" },
          ])
          .then(({ data, error }) => {
            if (error) {
              console.error("Supabase bg insert error:", error);
            } else {
              console.log("Background sketch saved:", data);
            }
          });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } catch (err) {
        console.error("Error saving bg sketch:", err);
      }
    }

    function addBgSketchToCanvas(pathData) {
      // Get the bounding box from the path to determine viewBox
      const coordMatches = [...pathData.matchAll(/(\d+\.?\d*)\s+(\d+\.?\d*)/g)];
      if (coordMatches.length === 0) return;

      const xs = coordMatches.map((m) => parseFloat(m[1]));
      const ys = coordMatches.map((m) => parseFloat(m[2]));
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      const svgElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      const viewW = Math.max(maxX + 10, window.innerWidth);
      const viewH = Math.max(maxY + 10, docHeight);
      svgElement.setAttribute("viewBox", `0 0 ${viewW} ${viewH}`);
      svgElement.style.width = viewW + "px";
      svgElement.style.height = viewH + "px";
      svgElement.style.position = "absolute";
      svgElement.style.top = "0";
      svgElement.style.left = "0";
      svgElement.style.pointerEvents = "none";

      const idMatch = pathData.match(/data-id="([^"]+)"/);
      const drawingId = idMatch ? idMatch[1] : null;
      const opacity = bgSessionDrawings.has(drawingId) ? "1.0" : "0.4";
      const modifiedPathData = pathData.replace(
        /opacity="[^"]*"/,
        `opacity="${opacity}"`,
      );

      svgElement.innerHTML = modifiedPathData;
      bgSavedSketches.appendChild(svgElement);
    }

    // Load existing background sketches
    async function loadBgSketches() {
      try {
        const { data, error } = await supabase
          .from("sketches")
          .select("*")
          .eq("location", "background")
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (data) {
          data.forEach((sketch) => {
            addBgSketchToCanvas(sketch.path);
          });
        }
      } catch (err) {
        console.error("Error loading bg sketches:", err);
      }
    }

    // Realtime subscription for background sketches
    const bgChannel = supabase.channel("bg-sketches");
    bgChannel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sketches",
        },
        (payload) => {
          if (payload.new && payload.new.location === "background") {
            addBgSketchToCanvas(payload.new.path);
          }
        },
      )
      .subscribe();

    loadBgSketches();

    // Recalculate doc height after images load etc.
    window.addEventListener("load", resize);
    // Also recheck periodically for dynamic content
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(document.body);
  }

  createBackgroundSketchCanvas();
});
