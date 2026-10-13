const DEFAULT_SELECTORS = ['input', 'button'];
const DEFAULT_MIN_SPEED = 15; // px/s
const DEFAULT_MAX_SPEED = 40; // px/s

let animationFrameId = null;
let controls = [];
let mounted = false;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomVelocity(minSpeed, maxSpeed) {
  const speed = randomBetween(minSpeed, maxSpeed);
  const angle = Math.random() * Math.PI * 2;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function prepareControl(el, minSpeed, maxSpeed) {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return null;
  }

  const computed = window.getComputedStyle(el);

  const left = clamp(rect.left, 0, window.innerWidth - rect.width);
  const top = clamp(rect.top, 0, window.innerHeight - rect.height);
  const { vx, vy } = randomVelocity(minSpeed, maxSpeed);

  // Keep visual style while switching to viewport-based motion.
  el.dataset.htmlDanceOriginalPosition = computed.position;
  el.dataset.htmlDanceOriginalLeft = el.style.left;
  el.dataset.htmlDanceOriginalTop = el.style.top;
  el.dataset.htmlDanceOriginalTransform = el.style.transform;
  el.dataset.htmlDanceOriginalMargin = el.style.margin;
  el.dataset.htmlDanceOriginalZIndex = el.style.zIndex;

  el.style.position = 'fixed';
  el.style.left = '0px';
  el.style.top = '0px';
  el.style.margin = '0';
  el.style.zIndex = '9999';
  el.style.transform = `translate3d(${left}px, ${top}px, 0)`;

  return {
    el,
    x: left,
    y: top,
    width: rect.width,
    height: rect.height,
    vx,
    vy,
  };
}

function restoreControl(el) {
  el.style.position = el.dataset.htmlDanceOriginalPosition || '';
  el.style.left = el.dataset.htmlDanceOriginalLeft || '';
  el.style.top = el.dataset.htmlDanceOriginalTop || '';
  el.style.transform = el.dataset.htmlDanceOriginalTransform || '';
  el.style.margin = el.dataset.htmlDanceOriginalMargin || '';
  el.style.zIndex = el.dataset.htmlDanceOriginalZIndex || '';

  delete el.dataset.htmlDanceOriginalPosition;
  delete el.dataset.htmlDanceOriginalLeft;
  delete el.dataset.htmlDanceOriginalTop;
  delete el.dataset.htmlDanceOriginalTransform;
  delete el.dataset.htmlDanceOriginalMargin;
  delete el.dataset.htmlDanceOriginalZIndex;
}

function tick(timestamp) {
  if (!tick.lastTimestamp) {
    tick.lastTimestamp = timestamp;
  }

  const dt = (timestamp - tick.lastTimestamp) / 1000;
  tick.lastTimestamp = timestamp;

  const maxX = window.innerWidth;
  const maxY = window.innerHeight;

  for (const c of controls) {
    c.x += c.vx * dt;
    c.y += c.vy * dt;

    const right = c.x + c.width;
    const bottom = c.y + c.height;

    if (c.x <= 0) {
      c.x = 0;
      c.vx = Math.abs(c.vx);
    } else if (right >= maxX) {
      c.x = maxX - c.width;
      c.vx = -Math.abs(c.vx);
    }

    if (c.y <= 0) {
      c.y = 0;
      c.vy = Math.abs(c.vy);
    } else if (bottom >= maxY) {
      c.y = maxY - c.height;
      c.vy = -Math.abs(c.vy);
    }

    c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
  }

  animationFrameId = window.requestAnimationFrame(tick);
}

function handleResize() {
  const maxX = window.innerWidth;
  const maxY = window.innerHeight;

  for (const c of controls) {
    c.x = clamp(c.x, 0, Math.max(0, maxX - c.width));
    c.y = clamp(c.y, 0, Math.max(0, maxY - c.height));
    c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
  }
}

export function startHtmlDance(options = {}) {
  const selectors = options.selectors || DEFAULT_SELECTORS;
  const minSpeed = options.minSpeed ?? DEFAULT_MIN_SPEED;
  const maxSpeed = options.maxSpeed ?? DEFAULT_MAX_SPEED;

  stopHtmlDance();

  const selectorText = selectors.join(',');
  const elements = Array.from(document.querySelectorAll(selectorText));

  controls = elements
    .map((el) => prepareControl(el, minSpeed, maxSpeed))
    .filter(Boolean);

  if (controls.length === 0) {
    return { count: 0 };
  }

  tick.lastTimestamp = 0;
  window.addEventListener('resize', handleResize);
  animationFrameId = window.requestAnimationFrame(tick);

  return { count: controls.length };
}

export function stopHtmlDance() {
  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  window.removeEventListener('resize', handleResize);

  for (const c of controls) {
    restoreControl(c.el);
  }

  controls = [];
  tick.lastTimestamp = 0;
}

// single-spa lifecycle: called once when app is first loaded.
export async function bootstrap() {
  return undefined;
}

// single-spa lifecycle: called each time app is mounted.
export async function mount(props = {}) {
  if (mounted) {
    return;
  }

  const result = startHtmlDance(props.htmlDanceOptions || {});
  mounted = result.count > 0;
}

// single-spa lifecycle: called each time app is unmounted.
export async function unmount() {
  stopHtmlDance();
  mounted = false;
}

// Compatibility export for loaders that expect lifecycles on `module.default`.
const lifecycles = {
  bootstrap,
  mount,
  unmount,
};

export default lifecycles;
