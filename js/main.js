const OPENING_CONFIG = {
  animationCycleDuration: 15000,
  airTravelDurationMin: 3200,
  airTravelDurationMax: 5200,
  spinDecayDuration: 3000,
  airFadeDuration: 1100,
  movementRuneSize: 0.24,
  earthRuneSize: 0.12,
  airRuneSize: 0.095,
  movementRuneX: 0.38,
  movementRuneY: 0.56,
  earthRuneX: 0.69,
  earthRuneY: 0.4,
  airStartXMin: 1.3,
  airStartXMax: 1.62,
  airEndX: -0.3,
  airBaseYMin: 0.38,
  airBaseYMax: 0.6,
  waveAmplitudeMin: 0.03,
  waveAmplitudeMax: 0.085,
  waveFrequencyMin: 1.4,
  waveFrequencyMax: 2.9,
  spinTriggerOffset: 0.04,
  spinAngle: 360,
  overshootAngle: 16,
  settleBackAngle: 12,
  upperPassRotate: 300,
  stagePadding: 24,
  animationAreaInsetX: 0.08,
  animationAreaInsetY: 0.14,
  airOuterColor: 'rgba(120, 120, 120, 0.9)',
  airInnerColor: 'rgba(17, 17, 17, 0.92)',
};

const CORE_RUNE_FONT_FAMILY = "'Glorantha Core Runes', serif";
const RUNE_FONT_FAMILY = "'Glorantha Core Runes', 'Glorantha Got Runes Set 1', 'Glorantha Got Runes Set 2', 'Glorantha Got Runes Set 3', 'Glorantha Got Runes Set 4', 'Glorantha Got Runes Set 5', 'Glorantha Got Runes Set 6', 'Glorantha Got Runes Set 7', 'Glorantha Got Runes Set 8', serif";
const RUNE_FONT_72 = `400 72px ${RUNE_FONT_FAMILY}`;
const CORE_RUNE_BACKDROP_GLYPHS = "1234567wetyuiOpaSdfgHjklxcbn,./QWERYIOPASFGHKlxCVB?";
const CORE_RUNE_BACKDROP_ROWS = [
  { chars: CORE_RUNE_BACKDROP_GLYPHS, top: '5%', size: 'clamp(112px, 10vw, 170px)', opacity: '0.14', amplitude: '14px', speed: 'fast', direction: 'rtl', wave: '2.2' },
  { chars: `${CORE_RUNE_BACKDROP_GLYPHS.slice(8)}${CORE_RUNE_BACKDROP_GLYPHS.slice(0, 8)}`, top: '17%', size: 'clamp(136px, 12vw, 204px)', opacity: '0.17', amplitude: '18px', speed: 'medium', direction: 'ltr', wave: '1.3' },
  { chars: `${CORE_RUNE_BACKDROP_GLYPHS.slice(16)}${CORE_RUNE_BACKDROP_GLYPHS.slice(0, 16)}`, top: '29%', size: 'clamp(118px, 10.5vw, 182px)', opacity: '0.15', amplitude: '15px', speed: 'slow', direction: 'rtl', wave: '2.8' },
  { chars: `${CORE_RUNE_BACKDROP_GLYPHS.slice(24)}${CORE_RUNE_BACKDROP_GLYPHS.slice(0, 24)}`, top: '41%', size: 'clamp(150px, 13vw, 220px)', opacity: '0.16', amplitude: '20px', speed: 'fast', direction: 'rtl', wave: '1.8' },
  { chars: CORE_RUNE_BACKDROP_GLYPHS.split('').reverse().join(''), top: '53%', size: 'clamp(126px, 11vw, 188px)', opacity: '0.15', amplitude: '16px', speed: 'medium', direction: 'ltr', wave: '3.2' },
  { chars: `${CORE_RUNE_BACKDROP_GLYPHS.slice(5)}${CORE_RUNE_BACKDROP_GLYPHS.slice(0, 5)}`, top: '65%', size: 'clamp(140px, 12.2vw, 208px)', opacity: '0.16', amplitude: '19px', speed: 'slow', direction: 'rtl', wave: '1.6' },
  { chars: `${CORE_RUNE_BACKDROP_GLYPHS.slice(12)}${CORE_RUNE_BACKDROP_GLYPHS.slice(0, 12)}`, top: '77%', size: 'clamp(120px, 10.6vw, 180px)', opacity: '0.15', amplitude: '15px', speed: 'medium', direction: 'ltr', wave: '2.5' },
  { chars: `${CORE_RUNE_BACKDROP_GLYPHS.slice(20)}${CORE_RUNE_BACKDROP_GLYPHS.slice(0, 20)}`, top: '88%', size: 'clamp(160px, 14vw, 236px)', opacity: '0.18', amplitude: '13px', speed: 'fast', direction: 'rtl', wave: '3.6' },
];

function buildRandomBackdropGlyphString(length = 44) {
  const glyphs = [];
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * CORE_RUNE_BACKDROP_GLYPHS.length);
    glyphs.push(CORE_RUNE_BACKDROP_GLYPHS[index]);
    if ((i + 1) % 6 === 0 && i < length - 1 && Math.random() < 0.4) glyphs.push(' ');
  }
  return glyphs.join('');
}

function buildRandomParadeGlyphString(length = 18) {
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += CORE_RUNE_BACKDROP_GLYPHS[Math.floor(Math.random() * CORE_RUNE_BACKDROP_GLYPHS.length)];
    if (i < length - 1) output += Math.random() < 0.3 ? '  ' : ' ';
  }
  return output;
}

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  } catch (e) {
    console.warn('[boot] Service Worker cleanup failed:', e);
  }
}

function showUnsupportedMobileScreen() {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = '';
    app.style.display = 'none';
  }

  const screenRoot = document.getElementById('screenRoot');
  if (screenRoot) screenRoot.innerHTML = '';

  const unsupported = document.getElementById('unsupportedMobileScreen');
  if (unsupported) {
    const text = window.I18N?.t?.('NOT_SUPPORTED');
    unsupported.textContent = text && text !== 'I18N_INIT_FAILED'
      ? text
      : 'This app is not supported on iOS or Android.';
    unsupported.style.display = 'flex';
  }
}

function i18nText(key, fallback = '') {
  const text = window.I18N?.t?.(key);
  return text && text !== 'I18N_INIT_FAILED' ? text : fallback;
}

function formatAdjustValues({ x, y, scale = null, dragScale }) {
  const parts = [
    `${i18nText('COORD_X', 'X')} ${Number(x).toFixed(2)}`,
    `${i18nText('COORD_Y', 'Y')} ${Number(y).toFixed(2)}`,
  ];
  if (scale !== null) parts.push(`${i18nText('SCALE_LABEL', 'Scale')} ${Number(scale).toFixed(2)}`);
  parts.push(`${i18nText('MOVE_AMOUNT_LABEL', 'Move amount')} ${Number(dragScale).toFixed(2)}`);
  return parts.join(' / ');
}

function formatAdjustToggleLabel(titleKey, enabled) {
  return `${i18nText(titleKey)} ${i18nText(enabled ? 'STATE_OFF' : 'STATE_ON', enabled ? 'OFF' : 'ON')}`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  const x = 1 - clamp01(t);
  return 1 - x * x * x;
}

function easeInOutSine(t) {
  const x = clamp01(t);
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

function easeOutSine(t) {
  return Math.sin((clamp01(t) * Math.PI) / 2);
}

function phaseProgress(time, start, duration) {
  if (duration <= 0) return time >= start ? 1 : 0;
  return clamp01((time - start) / duration);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

const DEMO_MAP_SIZE = {
  width: 7627,
  height: 8545,
};

const DEMO_DEFAULT_VIEW = {
  zoom: 'min',
  centerX: DEMO_MAP_SIZE.width / 2,
  centerY: DEMO_MAP_SIZE.height / 2,
};

const DEMO_MAP_LABELS = {
  glacier: "Valind's Glacier",
  northernLand: 'GNERTELA',
  whirlpool: "Magasta's Pool",
  southernLand: 'PAMALTELA',
  easternIsles: 'EAST ISLES',
};

function drawPolygon(ctx, points, fillStyle, strokeStyle, lineWidth) {
  if (!Array.isArray(points) || points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle && lineWidth > 0) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function strokeTextFill(ctx, text, x, y, options = {}) {
  const {
    font = "700 320px 'Arial Narrow', sans-serif",
    fillStyle = '#ffffff',
    strokeStyle = 'transparent',
    lineWidth = 0,
    align = 'center',
    baseline = 'middle',
    letterSpacing = 0,
  } = options;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  if (!letterSpacing) {
    if (lineWidth > 0) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeStyle;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = fillStyle;
    ctx.fillText(text, x, y);
    ctx.restore();
    return;
  }

  const glyphs = Array.from(text);
  const widths = glyphs.map((glyph) => ctx.measureText(glyph).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, glyphs.length - 1) * letterSpacing;
  let cursorX = x;
  if (align === 'center') cursorX -= totalWidth / 2;
  if (align === 'right' || align === 'end') cursorX -= totalWidth;

  if (lineWidth > 0) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
  }
  ctx.fillStyle = fillStyle;

  glyphs.forEach((glyph, index) => {
    if (lineWidth > 0) ctx.strokeText(glyph, cursorX, y);
    ctx.fillText(glyph, cursorX, y);
    cursorX += widths[index] + letterSpacing;
  });

  ctx.restore();
}

function drawWordSpacedText(ctx, words, x, y, options = {}) {
  const {
    font = "700 320px 'Arial Narrow', sans-serif",
    fillStyle = '#ffffff',
    align = 'center',
    baseline = 'middle',
    gap = 120,
  } = options;

  const parts = Array.isArray(words) ? words.filter(Boolean) : [];
  if (!parts.length) return;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = baseline;
  ctx.fillStyle = fillStyle;

  const widths = parts.map((part) => ctx.measureText(part).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, parts.length - 1) * gap;
  let cursorX = x;
  if (align === 'center') cursorX -= totalWidth / 2;
  if (align === 'right' || align === 'end') cursorX -= totalWidth;

  parts.forEach((part, index) => {
    ctx.fillText(part, cursorX, y);
    cursorX += widths[index] + gap;
  });

  ctx.restore();
}

function drawRuneScatter(ctx, glyph, placements, options = {}) {
  const {
    font = RUNE_FONT_72,
    fixedSize = null,
    fillStyle = 'rgba(255,255,255,0.4)',
    strokeStyle = null,
    strokeWidth = 0,
    shadowColor = null,
    shadowBlur = 0,
    align = 'center',
    baseline = 'middle',
  } = options;

  if (!Array.isArray(placements) || !placements.length) return;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = fillStyle;
  if (strokeStyle) ctx.strokeStyle = strokeStyle;
  if (strokeWidth) ctx.lineWidth = strokeWidth;
  if (shadowColor) ctx.shadowColor = shadowColor;
  if (shadowBlur) ctx.shadowBlur = shadowBlur;

  placements.forEach(([x, y, size = null, alpha = null, rotate = 0]) => {
    ctx.save();
    ctx.translate(x, y);
    if (rotate) ctx.rotate((rotate * Math.PI) / 180);
    const resolvedSize = fixedSize || size;
    if (resolvedSize) ctx.font = `400 ${resolvedSize}px ${RUNE_FONT_FAMILY}`;
    if (alpha != null) ctx.globalAlpha = alpha;
    if (strokeStyle && strokeWidth) ctx.strokeText(glyph, 0, 0);
    ctx.fillText(glyph, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}

function getRuneProbeCanvas() {
  if (!getRuneProbeCanvas._canvas) {
    getRuneProbeCanvas._canvas = document.createElement('canvas');
    getRuneProbeCanvas._canvas.width = 160;
    getRuneProbeCanvas._canvas.height = 160;
  }
  return getRuneProbeCanvas._canvas;
}

function getGlyphSignature(fontFamily, glyph) {
  const canvas = getRuneProbeCanvas();
  const probe = canvas.getContext('2d', { willReadFrequently: true });
  if (!probe) return '';

  probe.clearRect(0, 0, canvas.width, canvas.height);
  probe.font = `700 96px ${fontFamily}`;
  probe.textAlign = 'center';
  probe.textBaseline = 'middle';
  probe.fillStyle = '#000';
  probe.fillText(glyph, canvas.width / 2, canvas.height / 2);

  const { data } = probe.getImageData(0, 0, canvas.width, canvas.height);
  let signature = '';
  for (let i = 3; i < data.length; i += 4) {
    signature += data[i] > 8 ? '1' : '0';
  }
  return signature;
}

function resolveRuneGlyph(candidates, fallback = 'w') {
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (!list.length) return fallback;

  for (const glyph of list) {
    const runeSig = getGlyphSignature(RUNE_FONT_FAMILY, glyph);
    const fallbackSig = getGlyphSignature("serif", glyph);
    if (runeSig && runeSig !== fallbackSig) return glyph;
  }

  return fallback;
}

function drawDemoMap(ctx, width, height) {
  const water = '#1777e8';
  const land = '#10a500';
  const coast = '#747474';
  const ice = '#f4f4f2';
  const dot = '#8a7656';
  const whirl = '#2b26ff';
  const waveRune = 'rgba(178, 235, 255, 0.62)';
  const mountainRune = 'rgba(22, 74, 26, 0.88)';
  const grassRune = 'rgba(224, 255, 150, 0.88)';
  const waveGlyph = 'w';
  const mountainGlyph = 'e';
  const grassGlyph = 'p';
  const demoRuneSize = 112;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, width, height);

  const coastWidth = 82;

  drawPolygon(ctx, [
    [0, 0],
    [2860, 0],
    [2710, 240],
    [2540, 540],
    [2360, 820],
    [2150, 1090],
    [1860, 1270],
    [1450, 1260],
    [1080, 1140],
    [760, 920],
    [490, 610],
    [130, 130],
  ], ice, coast, coastWidth);

  drawPolygon(ctx, [
    [2860, 0],
    [5860, 0],
    [5860, 180],
    [5730, 320],
    [5600, 880],
    [5420, 1510],
    [5210, 2050],
    [5340, 2310],
    [5140, 2580],
    [4780, 2190],
    [4090, 2350],
    [3970, 1930],
    [3530, 1990],
    [3590, 2350],
    [2700, 2420],
    [2120, 2420],
    [1690, 2510],
    [1640, 2310],
    [1110, 1650],
    [760, 1080],
    [1580, 1090],
    [1720, 770],
    [1880, 1060],
    [2480, 1060],
    [2700, 1320],
    [2990, 1670],
    [2830, 1960],
    [2610, 1510],
    [2520, 1060],
  ], land, coast, coastWidth);

  drawPolygon(ctx, [
    [0, 8520],
    [0, 7540],
    [720, 6180],
    [1580, 6820],
    [2860, 6340],
    [3160, 7010],
    [3470, 6430],
    [3720, 6740],
    [4260, 6600],
    [4330, 7260],
    [4720, 6880],
    [4740, 5870],
    [5270, 5850],
    [5480, 6430],
    [5300, 6900],
    [5730, 6900],
    [5890, 6260],
    [6220, 6550],
    [6800, 6780],
    [7260, 7300],
    [7040, 7820],
    [7040, 8520],
  ], land, coast, coastWidth);

  const islands = [
    [[5440, 1390], [5560, 1260], [5670, 1500], [5580, 1740], [5450, 1640]],
    [[5540, 1920], [5620, 1740], [5750, 1880], [5780, 2190], [5650, 2320], [5530, 2160]],
    [[4870, 2250], [5000, 2140], [5200, 2190], [5140, 2340], [4950, 2380]],
    [[5280, 2240], [5390, 2120], [5560, 2230], [5490, 2370], [5320, 2370]],
    [[5610, 2160], [5700, 1980], [5830, 2190], [5760, 2470], [5620, 2390]],
    [[6340, 1960], [6500, 1930], [6510, 2390], [6360, 2390]],
    [[5790, 4580], [6120, 4440], [6400, 4700], [6260, 5190], [5950, 5410], [5650, 5090]],
    [[4580, 5820], [4790, 5740], [4990, 5860], [4940, 6130], [4650, 6140]],
    [[5160, 6890], [5540, 6950], [5630, 7350], [5480, 7480], [5200, 7340]],
    [[6530, 7700], [6720, 7730], [6720, 8520], [6530, 8520]],
    [[170, 5330], [420, 4770], [820, 4860], [700, 5820], [530, 6040], [330, 5560]],
    [[1220, 5100], [1590, 5190], [1510, 5740], [1380, 6150], [1180, 6040]],
    [[7500, 5050], [7627, 5030], [7627, 5340], [7480, 5360]],
  ];
  islands.forEach((points) => drawPolygon(ctx, points, land, coast, coastWidth));

  ctx.fillStyle = dot;
  const dots = [
    [170, 1920], [540, 1920], [170, 2230], [480, 2330], [630, 2420], [3100, 2310], [3500, 2690],
    [7000, 1900], [7350, 2300], [7510, 2360], [5580, 3040], [6120, 6500], [6940, 6330], [7170, 6440],
    [7290, 6130], [7350, 6610], [7200, 6790], [6070, 6770], [1310, 4830], [1110, 5790], [1270, 5930],
    [1240, 6070], [1090, 6100], [2780, 5590], [3090, 6180], [3230, 6390], [3390, 6580], [7410, 5760],
    [7480, 5920], [7420, 6070], [7100, 4220], [7220, 4400], [7300, 4580], [7270, 4790], [7370, 4130],
  ];
  dots.forEach(([x, y]) => ctx.fillRect(x - 28, y - 28, 56, 56));

  ctx.fillStyle = '#f4f4f2';
  ctx.beginPath();
  ctx.roundRect(5890, 120, 180, 70, 32);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(5930, 260, 90, 70, 28);
  ctx.fill();

  ctx.save();
  ctx.translate(3530, 4260);
  ctx.strokeStyle = whirl;
  ctx.lineWidth = 72;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-180, -150);
  ctx.lineTo(20, -270);
  ctx.lineTo(240, -200);
  ctx.lineTo(350, -40);
  ctx.lineTo(350, 160);
  ctx.lineTo(280, 340);
  ctx.lineTo(90, 430);
  ctx.lineTo(-120, 390);
  ctx.lineTo(-230, 250);
  ctx.lineTo(-210, 60);
  ctx.lineTo(-80, -40);
  ctx.lineTo(70, -20);
  ctx.lineTo(130, 100);
  ctx.lineTo(120, 220);
  ctx.lineTo(20, 260);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = coast;
  ctx.lineWidth = 70;
  ctx.lineCap = 'round';
  [
    [2350, 5410, 2520, 5380],
    [3200, 5780, 3390, 5670],
    [3500, 5930, 3640, 5800],
    [3800, 6120, 3940, 5960],
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  ctx.save();
  ctx.font = `400 ${demoRuneSize}px ${RUNE_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(178, 235, 255, 0.88)';
  ctx.shadowColor = 'rgba(18, 80, 150, 0.35)';
  ctx.shadowBlur = 14;
  [
    [3720, 4200],
    [1680, 3240],
    [5920, 3160],
    [2480, 6240],
    [6520, 6060],
    [980, 1480],
    [2440, 1120],
    [3180, 2740],
    [4700, 1180],
    [4980, 2480],
    [6760, 1520],
    [7140, 4140],
    [5720, 4660],
    [4740, 5660],
    [3880, 6660],
    [1780, 6500],
  ].forEach(([x, y]) => {
    ctx.fillText(waveGlyph, x, y);
  });
  ctx.restore();

  ctx.save();
  ctx.font = `400 ${demoRuneSize}px ${RUNE_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(22, 74, 26, 0.9)';
  ctx.strokeStyle = 'rgba(200, 238, 188, 0.56)';
  ctx.lineWidth = 24;
  ctx.shadowColor = 'rgba(8, 42, 12, 0.18)';
  ctx.shadowBlur = 10;
  ctx.strokeText(mountainGlyph, 2920, 1500);
  ctx.fillText(mountainGlyph, 2920, 1500);
  ctx.strokeText(mountainGlyph, 4950, 7730);
  ctx.fillText(mountainGlyph, 4950, 7730);
  ctx.restore();

  ctx.save();
  ctx.font = `400 ${demoRuneSize}px ${RUNE_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(224, 255, 150, 0.9)';
  ctx.strokeStyle = 'rgba(72, 120, 20, 0.5)';
  ctx.lineWidth = 22;
  ctx.shadowColor = 'rgba(220, 255, 170, 0.14)';
  ctx.shadowBlur = 8;
  ctx.strokeText(grassGlyph, 3920, 1710);
  ctx.fillText(grassGlyph, 3920, 1710);
  ctx.strokeText(grassGlyph, 2580, 7780);
  ctx.fillText(grassGlyph, 2580, 7780);
  ctx.restore();

  drawRuneScatter(ctx, waveGlyph, [
    [760, 980, 84, 0.26, -12], [1120, 1220, 76, 0.24, 10], [1560, 860, 70, 0.23, -6],
    [1880, 1380, 88, 0.22, -8], [2580, 1110, 74, 0.21, 6], [3180, 2580, 72, 0.2, -10],
    [4580, 2870, 78, 0.22, 12], [6120, 1290, 74, 0.24, 8], [6820, 2050, 76, 0.23, -14],
    [7140, 2840, 82, 0.21, 11], [6650, 3880, 74, 0.22, -6], [6010, 4700, 72, 0.2, 9],
    [5220, 5560, 68, 0.19, -12], [4380, 6390, 74, 0.21, 7], [2900, 6880, 70, 0.19, -9],
    [2140, 5920, 72, 0.2, 13], [1220, 6640, 74, 0.22, -11], [770, 4400, 68, 0.18, 10],
    [1440, 3650, 64, 0.17, -4], [2520, 3350, 68, 0.18, 5], [5480, 3520, 68, 0.19, -7],
    [7030, 5340, 70, 0.21, 8], [6960, 7360, 76, 0.23, -10], [5900, 6140, 66, 0.18, 4],
    [3660, 5000, 64, 0.16, -8], [3270, 3940, 68, 0.18, 14], [4060, 2050, 66, 0.16, -3],
    [7440, 4430, 64, 0.18, 9], [730, 2940, 64, 0.17, -7], [1760, 2500, 60, 0.15, 12],
    [6390, 2580, 64, 0.17, -5], [520, 1880, 60, 0.16, -10], [980, 2460, 62, 0.17, 7],
    [3940, 940, 60, 0.16, -5], [5840, 2360, 64, 0.17, 4], [7480, 6140, 64, 0.18, -8],
    [6640, 8120, 68, 0.19, 6], [4680, 7480, 64, 0.17, -11], [2080, 7340, 62, 0.16, 9],
  ], {
    fixedSize: demoRuneSize,
    fillStyle: waveRune,
    strokeStyle: 'rgba(120, 210, 255, 0.35)',
    strokeWidth: 6,
    shadowColor: 'rgba(28, 118, 190, 0.25)',
    shadowBlur: 8,
  });

  drawRuneScatter(ctx, mountainGlyph, [
    [1780, 1280, 168, 0.6, 0], [2330, 1380, 152, 0.58, -8], [2860, 1490, 168, 0.62, 10],
    [3400, 1600, 152, 0.59, -12], [4000, 1480, 160, 0.58, 8], [4620, 1350, 152, 0.6, -4],
    [5090, 1030, 146, 0.58, 6], [5350, 1610, 138, 0.56, -10], [5950, 7040, 160, 0.58, 9],
    [5530, 7480, 152, 0.6, -8], [4930, 7840, 168, 0.61, 7], [4300, 8070, 152, 0.59, -12],
    [3490, 7890, 146, 0.58, 6], [2720, 7520, 152, 0.57, -9], [1880, 7810, 160, 0.6, 11],
    [830, 7600, 146, 0.58, -7], [640, 5380, 130, 0.52, 12], [1360, 5570, 124, 0.5, -6],
    [5780, 5240, 124, 0.5, 8],
  ], {
    fixedSize: demoRuneSize,
    fillStyle: mountainRune,
    strokeStyle: 'rgba(182, 234, 182, 0.45)',
    strokeWidth: 8,
    shadowColor: 'rgba(4, 44, 8, 0.22)',
    shadowBlur: 9,
  });

  drawRuneScatter(ctx, grassGlyph, [
    [2100, 1730, 140, 0.54, -4], [3180, 1820, 128, 0.52, 9], [4460, 1740, 140, 0.54, -10],
    [5160, 1450, 120, 0.48, 5], [5610, 7750, 128, 0.54, -7], [4100, 7670, 140, 0.52, 12],
    [2560, 7940, 128, 0.53, -8], [1040, 7350, 116, 0.48, 6], [1310, 5310, 104, 0.44, -5],
    [5920, 5330, 104, 0.44, 4],
  ], {
    fixedSize: demoRuneSize,
    fillStyle: grassRune,
    strokeStyle: 'rgba(78, 120, 24, 0.42)',
    strokeWidth: 7,
    shadowColor: 'rgba(210, 245, 132, 0.18)',
    shadowBlur: 8,
  });

  strokeTextFill(ctx, DEMO_MAP_LABELS.glacier, 1860, 355, {
    font: "700 250px 'Courier New', monospace",
    fillStyle: '#5c5c5c',
  });
  strokeTextFill(ctx, DEMO_MAP_LABELS.northernLand, 3640, 1760, {
    font: "700 700px 'Arial Narrow', sans-serif",
    fillStyle: '#ffffff',
    letterSpacing: 8,
  });
  drawWordSpacedText(ctx, ['EAST', 'ISLES'], 6430, 4220, {
    font: "700 340px 'Arial Narrow', sans-serif",
    fillStyle: '#ffffff',
    gap: 120,
  });
  strokeTextFill(ctx, DEMO_MAP_LABELS.whirlpool, 3610, 5120, {
    font: "700 240px 'Courier New', monospace",
    fillStyle: '#111111',
  });
  drawWordSpacedText(ctx, ['World', 'of', 'GLORANTHA'], 3610, 6120, {
    font: "700 520px 'Arial Narrow', sans-serif",
    fillStyle: '#ffffff',
    gap: 60,
  });
  strokeTextFill(ctx, DEMO_MAP_LABELS.southernLand, 3690, 8020, {
    font: "700 700px 'Arial Narrow', sans-serif",
    fillStyle: '#ffffff',
    letterSpacing: 8,
  });
}

function drawDemoGrid(ctx, width, height) {
  const majorStep = 960;
  const minorStep = 240;
  const scale = window.SquareGridAdjust?.getScale?.() ?? 1;
  const offsetX = window.SquareGridAdjust?.getOffsetX?.() ?? 0;
  const offsetY = window.SquareGridAdjust?.getOffsetY?.() ?? 0;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (let x = -width; x <= width * 2; x += minorStep) {
    const isMajor = x % majorStep === 0;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height * 2);
    ctx.lineWidth = isMajor ? 5 : 2;
    ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
    ctx.stroke();
  }

  for (let y = -height; y <= height * 2; y += minorStep) {
    const isMajor = y % majorStep === 0;
    ctx.beginPath();
    ctx.moveTo(-width, y + 0.5);
    ctx.lineTo(width * 2, y + 0.5);
    ctx.lineWidth = isMajor ? 5 : 2;
    ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
    ctx.stroke();
  }

  ctx.restore();
}

const HEX_LAYER_GEOMETRY = Object.freeze({
  kmPerHex: 8,
  guideScale: 1.2108,
  baseRadiusPx: 39,
});

function getHexLayerGeometry() {
  const radiusPx = HEX_LAYER_GEOMETRY.baseRadiusPx * HEX_LAYER_GEOMETRY.guideScale;
  const outerDiameterPx = radiusPx * 2;
  const innerDiameterPx = Math.sqrt(3) * radiusPx;
  const widthPx = innerDiameterPx;
  const heightPx = outerDiameterPx;
  const rowStepPx = heightPx * 0.75;
  const columnStepPx = widthPx;
  const averageDiameterPx = (outerDiameterPx + innerDiameterPx) / 2;
  const pxPerKm = averageDiameterPx / HEX_LAYER_GEOMETRY.kmPerHex;

  return {
    kmPerHex: HEX_LAYER_GEOMETRY.kmPerHex,
    radiusPx,
    widthPx,
    heightPx,
    rowStepPx,
    columnStepPx,
    innerDiameterPx,
    outerDiameterPx,
    averageDiameterPx,
    pxPerKm,
  };
}

function getHexDistanceMetrics() {
  const geometry = getHexLayerGeometry();
  const pxPerKm = geometry.pxPerKm;

  return {
    kmPerHex: geometry.kmPerHex,
    radiusPx: geometry.radiusPx,
    innerDiameterPx: geometry.innerDiameterPx,
    outerDiameterPx: geometry.outerDiameterPx,
    averageDiameterPx: geometry.averageDiameterPx,
    hexWidthPx: geometry.widthPx,
    hexHeightPx: geometry.heightPx,
    hexRowStepPx: geometry.rowStepPx,
    hexColumnStepPx: geometry.columnStepPx,
    pxPerKm,
    kmFromPixels(pixelDistance) {
      const px = Number(pixelDistance);
      if (!Number.isFinite(px)) return 0;
      return px / pxPerKm;
    },
    pixelsFromKm(km) {
      const value = Number(km);
      if (!Number.isFinite(value)) return 0;
      return value * pxPerKm;
    },
  };
}

function drawDemoHexGrid(ctx, width, height) {
  const hexGeometry = getHexLayerGeometry();
  const hexRadius = hexGeometry.radiusPx;
  const hexWidth = hexGeometry.widthPx;
  const hexHeight = hexGeometry.heightPx;
  const rowStep = hexGeometry.rowStepPx;
  const hexOffsetX = window.HexGridAdjust?.getOffsetX?.() ?? 67.98;
  const hexOffsetY = window.HexGridAdjust?.getOffsetY?.() ?? 107.45;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.translate(-height / 2, -width / 2);
  ctx.translate(hexOffsetX, hexOffsetY);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;

  for (let row = -1, y = -hexHeight; y <= width + hexHeight; row += 1, y += rowStep) {
    const offsetX = row % 2 === 0 ? 0 : hexWidth / 2;
    for (let x = -hexWidth; x <= height + hexWidth; x += hexWidth) {
      const cx = x + offsetX;
      const cy = y;
      ctx.beginPath();
      for (let side = 0; side < 6; side += 1) {
        const angle = ((60 * side) - 30) * (Math.PI / 180);
        const px = cx + hexRadius * Math.cos(angle);
        const py = cy + hexRadius * Math.sin(angle);
        if (side === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  ctx.restore();
}

window.GGISDrawers = {
  drawDemoGrid,
  drawDemoHexGrid,
};

window.GGISHexMetrics = {
  get: getHexDistanceMetrics,
  getFromHexLayer: getHexDistanceMetrics,
};

window.GGISHexLayerGeometry = {
  get: getHexLayerGeometry,
};

window.HexGridAdjust = {
  defaultOffsetX: 67.98,
  defaultOffsetY: 107.45,
  offsetX: 67.98,
  offsetY: 107.45,
  dragScale: 0.25,
  enabled: false,
  _panelEl: null,
  _statusEl: null,
  _valueEl: null,
  _toggleBtn: null,
  _overlayEl: null,
  _drag: null,

  init() {
    if (this._panelEl) {
      this._ensureOverlay();
      this._sync();
      return;
    }

    const panel = document.createElement('aside');
    panel.className = 'gg-hex-adjust-panel';
    panel.innerHTML = `
      <div class="gg-hex-adjust-title">${i18nText('HEX_ADJUST_TITLE', 'HEX Adjust')}</div>
      <div class="gg-hex-adjust-body">
        <p class="gg-hex-adjust-copy">${i18nText('HEX_ADJUST_DRAG_ONLY', 'Only HEX moves with left drag.')}</p>
        <p class="gg-hex-adjust-copy">${i18nText('HEX_ADJUST_NO_MAP_PAN', 'This does not affect map panning.')}</p>
        <div class="gg-hex-adjust-values" id="hexAdjustValues"></div>
        <div class="gg-hex-adjust-slider-group">
          <label class="gg-hex-adjust-slider-label" for="hexAdjustDragScale">${i18nText('MOVE_AMOUNT_LABEL', 'Move amount')}</label>
          <input id="hexAdjustDragScale" class="gg-hex-adjust-slider" type="range" min="0.05" max="2" step="0.01" value="0.25" />
        </div>
        <div class="gg-hex-adjust-status" id="hexAdjustStatus"></div>
        <div class="gg-hex-adjust-actions">
          <button id="hexAdjustToggle" class="gg-hex-adjust-button" type="button">${formatAdjustToggleLabel('HEX_ADJUST_TITLE', false)}</button>
          <button id="hexAdjustReset" class="gg-hex-adjust-button is-secondary" type="button">${i18nText('RESET_TO_DEFAULT', 'Reset to default')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this._panelEl = panel;
    this._valueEl = panel.querySelector('#hexAdjustValues');
    this._statusEl = panel.querySelector('#hexAdjustStatus');
    this._toggleBtn = panel.querySelector('#hexAdjustToggle');
    this._dragScaleEl = panel.querySelector('#hexAdjustDragScale');

    this._toggleBtn?.addEventListener('click', () => {
      this.enabled = !this.enabled;
      this._sync();
    });

    panel.querySelector('#hexAdjustReset')?.addEventListener('click', () => {
      this.offsetX = this.defaultOffsetX;
      this.offsetY = this.defaultOffsetY;
      this._redraw();
      this._sync();
    });

    this._dragScaleEl?.addEventListener('input', () => {
      this.dragScale = Number(this._dragScaleEl.value);
      this._sync();
    });

    this._ensureOverlay();
    this._sync();
  },

  getOffsetX() {
    return this.offsetX;
  },

  getOffsetY() {
    return this.offsetY;
  },

  _ensureOverlay() {
    const viewport = document.getElementById('mapViewport');
    if (!viewport) return;

    if (this._overlayEl?.parentNode !== viewport) {
      this._overlayEl?.remove?.();
      const overlay = document.createElement('div');
      overlay.className = 'gg-hex-adjust-overlay';
      overlay.hidden = !this.enabled;
      overlay.addEventListener('pointerdown', (event) => this._startDrag(event));
      viewport.appendChild(overlay);
      this._overlayEl = overlay;
    }
  },

  _startDrag(event) {
    if (!this.enabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    this._drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: this.offsetX,
      startOffsetY: this.offsetY,
    };

    this._overlayEl?.setPointerCapture?.(event.pointerId);
    this._overlayEl?.addEventListener('pointermove', this._onPointerMove);
    this._overlayEl?.addEventListener('pointerup', this._endDrag);
    this._overlayEl?.addEventListener('pointercancel', this._endDrag);
    this._sync(true);
  },

  _onPointerMove: (event) => {
    window.HexGridAdjust?._handlePointerMove(event);
  },

  _endDrag: () => {
    window.HexGridAdjust?._finishDrag();
  },

  _handlePointerMove(event) {
    if (!this._drag) return;
    const dx = event.clientX - this._drag.startX;
    const dy = event.clientY - this._drag.startY;
    const dragScale = Number.isFinite(this.dragScale) ? this.dragScale : 1;
    this.offsetX = Number((this._drag.startOffsetX + (dy * dragScale)).toFixed(2));
    this.offsetY = Number((this._drag.startOffsetY - (dx * dragScale)).toFixed(2));
    this._redraw();
    this._sync(true);
  },

  _finishDrag() {
    if (!this._drag) return;
    const pointerId = this._drag.pointerId;
    this._drag = null;
    this._overlayEl?.releasePointerCapture?.(pointerId);
    this._overlayEl?.removeEventListener('pointermove', this._onPointerMove);
    this._overlayEl?.removeEventListener('pointerup', this._endDrag);
    this._overlayEl?.removeEventListener('pointercancel', this._endDrag);
    this._sync(false);
    console.log('[hex-adjust]', { offsetX: this.offsetX, offsetY: this.offsetY });
  },

  _redraw() {
    window.MapCanvas?.redrawCanvasLayers?.();
  },

  _sync(isDragging = false) {
    this._ensureOverlay();
    if (this._overlayEl) {
      this._overlayEl.hidden = !this.enabled;
      this._overlayEl.classList.toggle('is-dragging', !!isDragging);
    }
    if (this._toggleBtn) {
      this._toggleBtn.textContent = formatAdjustToggleLabel('HEX_ADJUST_TITLE', this.enabled);
      this._toggleBtn.classList.toggle('is-active', this.enabled);
    }
    if (this._valueEl) {
      this._valueEl.textContent = formatAdjustValues({ x: this.offsetX, y: this.offsetY, dragScale: this.dragScale });
    }
    if (this._dragScaleEl) {
      this._dragScaleEl.value = String(this.dragScale);
    }
    if (this._statusEl) {
      this._statusEl.textContent = this.enabled
        ? (isDragging ? i18nText('ADJUST_STATUS_DRAGGING', 'Dragging') : i18nText('ADJUST_STATUS_ENABLED', 'Adjust with left drag.'))
        : i18nText('ADJUST_STATUS_DISABLED', 'Normal map interaction.');
    }
  },
};

window.SquareGridAdjust = {
  defaultOffsetX: 0,
  defaultOffsetY: 0,
  defaultScale: 1,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  dragScale: 0.25,
  enabled: false,
  _panelEl: null,
  _statusEl: null,
  _valueEl: null,
  _toggleBtn: null,
  _overlayEl: null,
  _dragScaleEl: null,
  _scaleEl: null,
  _drag: null,

  init() {
    if (this._panelEl) {
      this._ensureOverlay();
      this._sync();
      return;
    }

    const panel = document.createElement('aside');
    panel.className = 'gg-grid-adjust-panel gg-grid-adjust-panel-square';
    panel.innerHTML = `
      <div class="gg-hex-adjust-title">${i18nText('SQUARE_ADJUST_TITLE', 'SQU Adjust')}</div>
      <div class="gg-hex-adjust-body">
        <p class="gg-hex-adjust-copy">${i18nText('SQUARE_ADJUST_DRAG_ONLY', 'Only SQU moves with left drag.')}</p>
        <p class="gg-hex-adjust-copy">${i18nText('SQUARE_ADJUST_SLIDER_HINT', 'Use sliders to adjust move amount and scale.')}</p>
        <div class="gg-hex-adjust-values" id="squareAdjustValues"></div>
        <div class="gg-hex-adjust-slider-group">
          <label class="gg-hex-adjust-slider-label" for="squareAdjustDragScale">${i18nText('MOVE_AMOUNT_LABEL', 'Move amount')}</label>
          <input id="squareAdjustDragScale" class="gg-hex-adjust-slider" type="range" min="0.05" max="2" step="0.01" value="0.25" />
        </div>
        <div class="gg-hex-adjust-slider-group">
          <label class="gg-hex-adjust-slider-label" for="squareAdjustScale">${i18nText('SCALE_LABEL', 'Scale')}</label>
          <input id="squareAdjustScale" class="gg-hex-adjust-slider" type="range" min="0.5" max="2" step="0.01" value="1" />
        </div>
        <div class="gg-hex-adjust-status" id="squareAdjustStatus"></div>
        <div class="gg-hex-adjust-actions">
          <button id="squareAdjustToggle" class="gg-hex-adjust-button" type="button">${formatAdjustToggleLabel('SQUARE_ADJUST_TITLE', false)}</button>
          <button id="squareAdjustReset" class="gg-hex-adjust-button is-secondary" type="button">${i18nText('RESET_TO_DEFAULT', 'Reset to default')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this._panelEl = panel;
    this._valueEl = panel.querySelector('#squareAdjustValues');
    this._statusEl = panel.querySelector('#squareAdjustStatus');
    this._toggleBtn = panel.querySelector('#squareAdjustToggle');
    this._dragScaleEl = panel.querySelector('#squareAdjustDragScale');
    this._scaleEl = panel.querySelector('#squareAdjustScale');

    this._toggleBtn?.addEventListener('click', () => {
      this.enabled = !this.enabled;
      this._sync();
    });

    panel.querySelector('#squareAdjustReset')?.addEventListener('click', () => {
      this.offsetX = this.defaultOffsetX;
      this.offsetY = this.defaultOffsetY;
      this.scale = this.defaultScale;
      this._redraw();
      this._sync();
    });

    this._dragScaleEl?.addEventListener('input', () => {
      this.dragScale = Number(this._dragScaleEl.value);
      this._sync();
    });

    this._scaleEl?.addEventListener('input', () => {
      this.scale = Number(this._scaleEl.value);
      this._redraw();
      this._sync();
    });

    this._ensureOverlay();
    this._sync();
  },

  getOffsetX() { return this.offsetX; },
  getOffsetY() { return this.offsetY; },
  getScale() { return this.scale; },

  _ensureOverlay() {
    const viewport = document.getElementById('mapViewport');
    if (!viewport) return;
    if (this._overlayEl?.parentNode !== viewport) {
      this._overlayEl?.remove?.();
      const overlay = document.createElement('div');
      overlay.className = 'gg-square-adjust-overlay';
      overlay.hidden = !this.enabled;
      overlay.addEventListener('pointerdown', (event) => this._startDrag(event));
      viewport.appendChild(overlay);
      this._overlayEl = overlay;
    }
  },

  _startDrag(event) {
    if (!this.enabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this._drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: this.offsetX,
      startOffsetY: this.offsetY,
    };
    this._overlayEl?.setPointerCapture?.(event.pointerId);
    this._overlayEl?.addEventListener('pointermove', this._onPointerMove);
    this._overlayEl?.addEventListener('pointerup', this._endDrag);
    this._overlayEl?.addEventListener('pointercancel', this._endDrag);
    this._sync(true);
  },

  _onPointerMove: (event) => {
    window.SquareGridAdjust?._handlePointerMove(event);
  },

  _endDrag: () => {
    window.SquareGridAdjust?._finishDrag();
  },

  _handlePointerMove(event) {
    if (!this._drag) return;
    const dx = event.clientX - this._drag.startX;
    const dy = event.clientY - this._drag.startY;
    const dragScale = Number.isFinite(this.dragScale) ? this.dragScale : 1;
    this.offsetX = Number((this._drag.startOffsetX + (dx * dragScale)).toFixed(2));
    this.offsetY = Number((this._drag.startOffsetY + (dy * dragScale)).toFixed(2));
    this._redraw();
    this._sync(true);
  },

  _finishDrag() {
    if (!this._drag) return;
    const pointerId = this._drag.pointerId;
    this._drag = null;
    this._overlayEl?.releasePointerCapture?.(pointerId);
    this._overlayEl?.removeEventListener('pointermove', this._onPointerMove);
    this._overlayEl?.removeEventListener('pointerup', this._endDrag);
    this._overlayEl?.removeEventListener('pointercancel', this._endDrag);
    this._sync(false);
    console.log('[square-adjust]', { offsetX: this.offsetX, offsetY: this.offsetY, scale: this.scale });
  },

  _redraw() {
    window.MapCanvas?.redrawCanvasLayers?.();
  },

  _sync(isDragging = false) {
    this._ensureOverlay();
    if (this._overlayEl) {
      this._overlayEl.hidden = !this.enabled;
      this._overlayEl.classList.toggle('is-dragging', !!isDragging);
    }
    if (this._toggleBtn) {
      this._toggleBtn.textContent = formatAdjustToggleLabel('SQUARE_ADJUST_TITLE', this.enabled);
      this._toggleBtn.classList.toggle('is-active', this.enabled);
    }
    if (this._dragScaleEl) this._dragScaleEl.value = String(this.dragScale);
    if (this._scaleEl) this._scaleEl.value = String(this.scale);
    if (this._valueEl) {
      this._valueEl.textContent = formatAdjustValues({ x: this.offsetX, y: this.offsetY, scale: this.scale, dragScale: this.dragScale });
    }
    if (this._statusEl) {
      this._statusEl.textContent = this.enabled
        ? (isDragging ? i18nText('ADJUST_STATUS_DRAGGING', 'Dragging') : i18nText('ADJUST_STATUS_ENABLED', 'Adjust with left drag.'))
        : i18nText('ADJUST_STATUS_DISABLED', 'Normal map interaction.');
    }
  },
};

(() => {
  const adjust = window.HexGridAdjust;
  const square = window.SquareGridAdjust;
  if (!adjust || !square) return;

  const originalInit = adjust.init.bind(adjust);
  const originalSync = adjust._sync.bind(adjust);
  const originalHandle = adjust._handlePointerMove.bind(adjust);
  const originalStartDrag = adjust._startDrag.bind(adjust);

  adjust.mode = 'hex';

  adjust.init = function initWithSelector() {
    originalInit();
    if (!this._panelEl || this._modeEnhanced) return;

    const body = this._panelEl.querySelector('.gg-hex-adjust-body');
    const values = this._panelEl.querySelector('#hexAdjustValues');
    const status = this._panelEl.querySelector('#hexAdjustStatus');
    if (!body || !values || !status) return;

    const modeRow = document.createElement('div');
    modeRow.className = 'gg-hex-adjust-slider-group';
    modeRow.innerHTML = `
      <label class="gg-hex-adjust-slider-label" for="gridAdjustMode">${i18nText('TARGET_LABEL', 'Target')}</label>
      <select id="gridAdjustMode" class="gg-grid-adjust-select">
        <option value="hex">${i18nText('HEX_ADJUST_TITLE', 'HEX Adjust')}</option>
        <option value="square">${i18nText('SQUARE_ADJUST_TITLE', 'SQU Adjust')}</option>
      </select>
    `;
    body.insertBefore(modeRow, values);

    const scaleRow = document.createElement('div');
    scaleRow.className = 'gg-hex-adjust-slider-group';
    scaleRow.id = 'gridAdjustScaleRow';
    scaleRow.hidden = true;
    scaleRow.innerHTML = `
      <label class="gg-hex-adjust-slider-label" for="gridAdjustScale">${i18nText('SCALE_LABEL', 'Scale')}</label>
      <input id="gridAdjustScale" class="gg-hex-adjust-slider" type="range" min="0.5" max="2" step="0.001" value="1" />
    `;
    body.insertBefore(scaleRow, status);

    this._modeEl = modeRow.querySelector('#gridAdjustMode');
    this._scaleRowEl = scaleRow;
    this._scaleEl = scaleRow.querySelector('#gridAdjustScale');

    this._modeEl?.addEventListener('change', () => {
      this.mode = this._modeEl.value === 'square' ? 'square' : 'hex';
      this._sync();
    });

    this._scaleEl?.addEventListener('input', () => {
      square.scale = Number(this._scaleEl.value);
      square._redraw?.();
      this._sync();
    });

    const resetBtn = this._panelEl.querySelector('#hexAdjustReset');
    resetBtn?.addEventListener('click', () => {
      if (this.mode !== 'square') return;
      square.offsetX = square.defaultOffsetX;
      square.offsetY = square.defaultOffsetY;
      square.scale = square.defaultScale;
      square._redraw?.();
      this._sync();
    });

    const dragScaleEl = this._panelEl.querySelector('#hexAdjustDragScale');
    dragScaleEl?.addEventListener('input', () => {
      if (this.mode !== 'square') return;
      square.dragScale = Number(dragScaleEl.value);
      this._sync();
    });

    this._modeEnhanced = true;
    this._sync();
  };

  adjust._startDrag = function startDragWithMode(event) {
    if (this.mode !== 'square') {
      originalStartDrag(event);
      return;
    }
    if (!this.enabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this._drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: square.offsetX,
      startOffsetY: square.offsetY,
    };
    this._overlayEl?.setPointerCapture?.(event.pointerId);
    this._overlayEl?.addEventListener('pointermove', this._onPointerMove);
    this._overlayEl?.addEventListener('pointerup', this._endDrag);
    this._overlayEl?.addEventListener('pointercancel', this._endDrag);
    this._sync(true);
  };

  adjust._handlePointerMove = function handlePointerMoveWithMode(event) {
    if (this.mode !== 'square') {
      originalHandle(event);
      return;
    }
    if (!this._drag) return;
    const dx = event.clientX - this._drag.startX;
    const dy = event.clientY - this._drag.startY;
    const dragScale = Number.isFinite(square.dragScale) ? square.dragScale : 1;
    square.offsetX = Number((this._drag.startOffsetX + (dx * dragScale)).toFixed(2));
    square.offsetY = Number((this._drag.startOffsetY + (dy * dragScale)).toFixed(2));
    square._redraw?.();
    this._sync(true);
  };

  adjust._sync = function syncWithMode(isDragging = false) {
    originalSync(isDragging);
    const active = this.mode === 'square' ? square : this;
    const titleKey = this.mode === 'square' ? 'SQUARE_ADJUST_TITLE' : 'HEX_ADJUST_TITLE';
    if (this._modeEl) this._modeEl.value = this.mode;
    if (this._scaleRowEl) this._scaleRowEl.hidden = this.mode !== 'square';
    if (this._scaleEl) this._scaleEl.value = String(square.scale);
    if (this._dragScaleEl) this._dragScaleEl.value = String(active.dragScale);
    if (this._toggleBtn) this._toggleBtn.textContent = formatAdjustToggleLabel(titleKey, this.enabled);
    if (this._valueEl) {
      this._valueEl.textContent = this.mode === 'square'
        ? formatAdjustValues({ x: square.offsetX, y: square.offsetY, scale: square.scale, dragScale: square.dragScale })
        : formatAdjustValues({ x: this.offsetX, y: this.offsetY, dragScale: this.dragScale });
    }
  };
})();

const IntroFlow = {
  config: OPENING_CONFIG,
  currentScreen: 'start',
  previousScreen: 'start',
  animationFrame: 0,
  animationStartedAt: 0,
  pendingFileEntry: false,
  pendingPngEntryFocusBoldhome: false,
  elements: {},
  lastCycleIndex: -1,
  airCycle: null,
  backdropAnimationFrame: 0,
  backdropLastFrameAt: 0,
  backdropRows: [],
  unavailableHintHideTimer: 0,
  unavailableHintMoveBound: null,

  _t(key) {
    const text = window.I18N?.t?.(key);
    return text && text !== 'I18N_INIT_FAILED' ? text : '';
  },

  init() {
    const root = document.getElementById('screenRoot');
    if (!root) return;

    root.innerHTML = this.template();
    this.elements = {
      root,
      start: root.querySelector('[data-screen="start"]'),
      credit: root.querySelector('[data-screen="credit"]'),
      guidance: root.querySelector('[data-screen="guidance"]'),
      stage: root.querySelector('#openingRuneStage'),
      movementRune: root.querySelector('#movementRune'),
      earthRune: root.querySelector('#earthRune'),
      airRune: root.querySelector('#airRune'),
      unavailableHint: root.querySelector('#guidanceUnavailableHint'),
    };

    this.setupRuneBackdropMotion();
    this.bindEvents();
    this.applyTexts();
    this.showScreen('start');
    this.startAnimationLoop();
    document.body.classList.add('gg-opening-active');
    document.getElementById('app')?.classList.add('gg-app-hidden');
  },

  template() {
    return `
      <section class="gg-screen-shell" data-screen="start">
        <div class="gg-screen-panel gg-start-panel">
          <div class="gg-start-hero">
            <div class="gg-rune-stage" id="openingRuneStage" aria-hidden="true">
              <div class="gg-rune-glyph is-earth" id="earthRune">e</div>
              <div class="gg-rune-glyph is-movement" id="movementRune">s</div>
              <div class="gg-rune-glyph is-air" id="airRune">g</div>
              <div class="gg-rune-stage-vignette"></div>
            </div>
            <div class="gg-start-copy">
              <h1 class="gg-start-title" data-i18n="APP_TITLE"></h1>
              <p class="gg-start-subtitle" data-i18n="START_SUBTITLE"></p>
              <div class="gg-start-actions">
                <button class="gg-start-link start" type="button" data-action="open-guidance" data-i18n="START_PUSH"></button>
                <button class="gg-start-link credit" type="button" data-action="open-credit" data-i18n="CREDIT"></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="gg-screen-shell has-rune-backdrop" data-screen="credit" hidden>
        ${this.buildGotRuneBackdrop('credit')}
        <article class="gg-screen-article">
          <h2 class="gg-screen-title" data-i18n="CREDIT_TITLE"></h2>
          <p class="gg-screen-copy" data-i18n="CREDIT_BODY_1"></p>
          <p class="gg-screen-copy" data-i18n="CREDIT_BODY_2"></p>
          <p class="gg-screen-copy" data-i18n="CREDIT_BODY_3"></p>
          <p class="gg-screen-copy"><span data-i18n="CREDIT_FONT_LABEL"></span><br /><span data-i18n="CREDIT_FONT_LINK_LABEL"></span>:<br /><a id="creditFontLink" class="gg-credit-link" href="https://wellofdaliath.chaosium.com/home/gloranthan-documents/gloranthan-runes-fonts/glorantha-core-rune-font/" target="_blank" rel="noopener noreferrer">https://wellofdaliath.chaosium.com/home/gloranthan-documents/gloranthan-runes-fonts/glorantha-core-rune-font/</a></p>
          <div class="gg-screen-actions">
            <button class="gg-screen-button is-secondary" type="button" data-action="return-top" data-i18n="RETURN_TOP"></button>
          </div>
        </article>
      </section>

      <section class="gg-screen-shell has-rune-backdrop" data-screen="guidance" hidden>
        ${this.buildGuidanceRuneParade()}
        <div class="gg-screen-panel">
          <div class="gg-guidance-wrap">
            <div class="gg-guidance-header">
              <div>
                <p class="gg-guidance-lead" data-i18n="GUIDANCE_LEAD"></p>
              </div>
              <div class="gg-guidance-header-actions">
                <button class="gg-screen-button is-secondary" type="button" data-action="return-top" data-i18n="RETURN_TOP"></button>
              </div>
            </div>

            <div class="gg-guidance-grid">
              <article class="gg-guidance-card">
                <img class="gg-guidance-thumb" src="./assets/colinMap.png" alt="Colin's Map preview" />
                <h3 data-i18n="GUIDE_COLIN_TITLE"></h3>
                <p data-i18n="GUIDE_COLIN_DESC"></p>
                <p class="gg-guidance-note">※ <span data-i18n="GUIDE_COLIN_NOTE"></span></p>
                <a class="gg-link-jump" href="https://www.drivethrurpg.com/ja/product/527100/hi-res-map-of-dragon-pass-and-prax" target="_blank" rel="noopener noreferrer" data-i18n="LINK_TO_JUMP"></a>
              </article>

              <article class="gg-guidance-card">
                <img class="gg-guidance-thumb" src="./assets/ashinohaMap.png" alt="Ashinoha's Map preview" />
                <h3 data-i18n="GUIDE_ASH_TITLE"></h3>
                <p data-i18n="GUIDE_ASH_DESC"></p>
                <a class="gg-link-jump" href="https://www.drivethrurpg.com/ja/product/553451/japanese" target="_blank" rel="noopener noreferrer" data-i18n="LINK_TO_JUMP"></a>
              </article>
            </div>

            <div class="gg-guidance-bottom-actions">
              <span class="gg-guidance-bottom-copy">Let's GloranthaGIS ! →→→</span>
              <button class="gg-screen-button gg-guidance-start-button" type="button" data-action="load-demo" data-i18n="TEST_EXPERIENCE"></button>
              <button class="gg-screen-button gg-guidance-start-button" type="button" data-action="load-png" data-i18n="IMAGE_LOAD_BUTTON"></button>
              <div id="guidanceUnavailableHint" class="gg-guidance-inline-hint" hidden></div>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  buildGotRuneBackdrop(screen) {
    const rows = CORE_RUNE_BACKDROP_ROWS.map((row, index) => {
      const randomChars = buildRandomBackdropGlyphString(42 + (index % 3) * 6);
      const content = this.buildGotRuneRowContent(randomChars, screen, index);
      return `
        <div class="gg-rune-backdrop-row" style="--gg-row-top:${row.top};--gg-row-size:${row.size};--gg-row-opacity:${row.opacity};--gg-row-drift-amplitude:${row.amplitude};" data-speed="${row.speed}" data-direction="${row.direction}" data-wave="${row.wave}">
          <div class="gg-rune-backdrop-track">
            ${content}
            ${content}
          </div>
        </div>
      `;
    }).join('');

    return `<div class="gg-rune-backdrop" aria-hidden="true">${rows}</div>`;
  },

  buildGuidanceRuneParade() {
    const parade = buildRandomParadeGlyphString(20);
    return `
        <div class="gg-rune-parade" aria-hidden="true">
          <div class="gg-rune-parade-track">
          <span class="gg-rune-parade-copy" style="font-family:${CORE_RUNE_FONT_FAMILY};">${parade}</span>
          <span class="gg-rune-parade-copy" style="font-family:${CORE_RUNE_FONT_FAMILY};">${parade}</span>
          </div>
        </div>
    `;
  },

  buildGotRuneRowContent(chars, screen, rowIndex) {
    const expanded = `${chars} ${chars.slice(0, Math.max(8, Math.floor(chars.length / 2)))}`;
    const glyphs = expanded
      .split('')
      .map((char, charIndex) => {
        if (char === ' ') return `<span class="gg-rune-backdrop-gap" aria-hidden="true"></span>`;
        const rotation = ((rowIndex * 7) + (charIndex % 5) - 2) * 0.8;
        return `<span class="gg-rune-backdrop-char" style="font-family:${CORE_RUNE_FONT_FAMILY};transform:rotate(${rotation}deg)">${char}</span>`;
      })
      .join('');

    return `<span class="gg-rune-backdrop-copy" data-screen="${screen}" data-row="${rowIndex}">${glyphs}</span>`;
  },

  setupRuneBackdropMotion() {
    const rows = Array.from(this.elements.root?.querySelectorAll('.gg-rune-backdrop-row') || []);
    this.backdropRows = rows.map((rowEl, index) => {
      const trackEl = rowEl.querySelector('.gg-rune-backdrop-track');
      const topPercent = Number.parseFloat(rowEl.style.getPropertyValue('--gg-row-top')) || 0;
      const amplitude = (Number.parseFloat(rowEl.style.getPropertyValue('--gg-row-drift-amplitude')) || 16) * 4.8;
      const speedLabel = rowEl.dataset.speed || 'medium';
      const direction = rowEl.dataset.direction === 'ltr' ? 1 : -1;
      const waveMultiplier = Number.parseFloat(rowEl.dataset.wave || '') || 2;
      const speedRange = speedLabel === 'fast'
        ? { min: 0.035, max: 0.065 }
        : speedLabel === 'slow'
          ? { min: 0.008, max: 0.02 }
          : { min: 0.015, max: 0.035 };
      const baseSpeed = randomRange(speedRange.min, speedRange.max) * direction;
      return {
        rowEl,
        trackEl,
        screen: rowEl.closest('[data-screen]')?.getAttribute('data-screen') || '',
        topPercent,
        amplitude,
        direction,
        speedLabel,
        waveMultiplier,
        x: direction < 0 ? randomRange(-42, -4) : randomRange(-46, -8),
        vx: baseSpeed,
        targetVx: baseSpeed,
        y: randomRange(-amplitude * 0.45, amplitude * 0.45),
        targetY: randomRange(-amplitude, amplitude),
        yBlend: randomRange(0.08, 0.16),
        rotation: randomRange(-0.55, 0.55),
        targetRotation: randomRange(-0.8, 0.8),
        rotationBlend: randomRange(0.06, 0.12),
        scale: randomRange(0.988, 1.012),
        targetScale: randomRange(0.984, 1.018),
        scaleBlend: randomRange(0.04, 0.08),
        opacityDrift: randomRange(-0.02, 0.03),
        wavePhase: randomRange(0, Math.PI * 2),
        wavePhaseSecondary: randomRange(0, Math.PI * 2),
        wavePhaseTertiary: randomRange(0, Math.PI * 2),
        waveTime: randomRange(0, 100),
        nextMoodShiftAt: performance.now() + randomRange(5000, 13000),
      };
    });
  },

  startRuneBackdropLoop(resetClock = false) {
    if (!this.backdropRows.length) return;
    if (this.backdropAnimationFrame) cancelAnimationFrame(this.backdropAnimationFrame);
    if (!this.backdropLastFrameAt || resetClock) this.backdropLastFrameAt = performance.now();

    const tick = (now) => {
      if (this.currentScreen === 'start') {
        this.backdropAnimationFrame = 0;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - this.backdropLastFrameAt) / 1000));
      this.backdropLastFrameAt = now;
      this.renderRuneBackdropFrame(now, dt);
      this.backdropAnimationFrame = requestAnimationFrame(tick);
    };

    this.backdropAnimationFrame = requestAnimationFrame(tick);
  },

  stopRuneBackdropLoop() {
    if (this.backdropAnimationFrame) {
      cancelAnimationFrame(this.backdropAnimationFrame);
      this.backdropAnimationFrame = 0;
    }
  },

  renderRuneBackdropFrame(now, dt) {
    const activeRows = this.backdropRows.filter((state) => state.screen === this.currentScreen);
    if (!activeRows.length) return;
    const viewportHeight = Math.max(window.innerHeight || 0, 1);

    activeRows.forEach((state) => {
      if (now >= state.nextMoodShiftAt) {
        const speedRange = state.speedLabel === 'fast'
          ? { min: 0.04, max: 0.07 }
          : state.speedLabel === 'slow'
            ? { min: 0.006, max: 0.018 }
            : { min: 0.014, max: 0.032 };
        state.targetVx = randomRange(speedRange.min, speedRange.max) * state.direction;
        state.targetY = randomRange(-state.amplitude, state.amplitude);
        state.targetRotation = randomRange(-0.95, 0.95);
        state.targetScale = randomRange(0.982, 1.022);
        state.opacityDrift = randomRange(-0.03, 0.035);
        state.wavePhase = randomRange(0, Math.PI * 2);
        state.wavePhaseSecondary = randomRange(0, Math.PI * 2);
        state.wavePhaseTertiary = randomRange(0, Math.PI * 2);
        state.nextMoodShiftAt = now + randomRange(7000, 18000);
      }

      const soften = 1 - Math.pow(1 - state.yBlend, dt * 60);
      const rotateSoft = 1 - Math.pow(1 - state.rotationBlend, dt * 60);
      const scaleSoft = 1 - Math.pow(1 - state.scaleBlend, dt * 60);

      state.waveTime += dt;
      const cosWave = Math.cos(state.waveTime * state.waveMultiplier + state.wavePhase) * state.amplitude * 0.9;
      const cosWaveSecondary = Math.cos(state.waveTime * (state.waveMultiplier * 0.47) + state.wavePhaseSecondary) * state.amplitude * 0.48;
      const cosWaveTertiary = Math.cos(state.waveTime * (state.waveMultiplier * 1.63) + state.wavePhaseTertiary) * state.amplitude * 0.22;
      state.vx += (state.targetVx - state.vx) * Math.min(1, dt * 0.04);
      state.x += state.vx * dt;
      if (state.direction < 0 && state.x <= -50) {
        state.x += 50;
      } else if (state.direction > 0 && state.x >= 0) {
        state.x -= 50;
      }

      state.y += (state.targetY - state.y) * soften;
      state.y += ((cosWave + cosWaveSecondary + cosWaveTertiary) - state.y) * Math.min(1, dt * 0.1);
      state.rotation += (state.targetRotation - state.rotation) * rotateSoft;
      state.rotation += Math.cos(state.waveTime * (state.waveMultiplier * 0.28) + state.wavePhase) * dt * 0.08;
      state.scale += (state.targetScale - state.scale) * scaleSoft;
    });

    const sortedRows = [...activeRows].sort((a, b) => ((a.topPercent / 100) * viewportHeight + a.y) - ((b.topPercent / 100) * viewportHeight + b.y));
    for (let i = 0; i < sortedRows.length - 1; i += 1) {
      const current = sortedRows[i];
      const next = sortedRows[i + 1];
      const currentY = (current.topPercent / 100) * viewportHeight + current.y;
      const nextY = (next.topPercent / 100) * viewportHeight + next.y;
      const distance = nextY - currentY;
      if (distance >= 128) continue;

      const overlap = 128 - distance;
      const push = overlap * 0.28;
      current.y = Math.max(-current.amplitude, Math.min(current.amplitude, current.y - push));
      next.y = Math.max(-next.amplitude, Math.min(next.amplitude, next.y + push));
      current.targetY = Math.max(-current.amplitude, current.targetY - push * 0.65);
      next.targetY = Math.min(next.amplitude, next.targetY + push * 0.65);

      const speedMix = (current.vx + next.vx) * 0.5;
      const currentMin = current.direction < 0 ? -0.08 : 0.006;
      const currentMax = current.direction < 0 ? -0.006 : 0.08;
      const nextMin = next.direction < 0 ? -0.08 : 0.006;
      const nextMax = next.direction < 0 ? -0.006 : 0.08;
      current.targetVx = Math.max(currentMin, Math.min(currentMax, speedMix - (0.006 * current.direction)));
      next.targetVx = Math.max(nextMin, Math.min(nextMax, speedMix + (0.006 * next.direction)));
      current.targetRotation = Math.max(-1.15, Math.min(1.15, current.targetRotation - randomRange(0.08, 0.22)));
      next.targetRotation = Math.max(-1.15, Math.min(1.15, next.targetRotation + randomRange(0.08, 0.22)));
    }

    activeRows.forEach((state) => {
      const visualOpacity = Math.max(0.08, Math.min(0.26, (Number.parseFloat(state.rowEl.style.getPropertyValue('--gg-row-opacity')) || 0.14) + state.opacityDrift));
      state.rowEl.style.opacity = String(visualOpacity);
      state.rowEl.style.transform = `translate3d(0, ${state.y}px, 0) rotate(${state.rotation}deg) scale(${state.scale})`;
      if (state.trackEl) state.trackEl.style.transform = `translate3d(${state.x}%, 0, 0)`;
    });
  },

  bindEvents() {
    this.elements.root?.addEventListener('click', (event) => {
      const actionEl = event.target instanceof Element ? event.target.closest('[data-action]') : null;
      if (!actionEl) return;
      const action = actionEl.getAttribute('data-action');
      if (!action) return;

      if (action === 'open-guidance') return void this.showScreen('guidance');
      if (action === 'open-credit') return void this.showScreen('credit');
      if (action === 'return-top') {
        return void this.showScreen('start');
      }
      if (action === 'load-demo') {
        return void this.loadDemoAndEnter();
      }
      if (action === 'load-png') {
        return void this.loadPngAndEnter();
      }
    });

    this.elements.root?.addEventListener('pointerover', (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-hover-key]') : null;
      if (!button) return;
      const label = button.querySelector('span');
      const hoverKey = button.getAttribute('data-hover-key');
      if (label && hoverKey) label.textContent = this._t(hoverKey);
    });

    this.elements.root?.addEventListener('pointerout', (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-hover-key]') : null;
      if (!button) return;
      const related = event.relatedTarget instanceof Element ? event.relatedTarget.closest('[data-hover-key]') : null;
      if (button === related) return;
      const label = button.querySelector('span');
      const defaultKey = button.getAttribute('data-default-key');
      if (label && defaultKey) label.textContent = this._t(defaultKey);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.animationFrame = 0;
        this.stopRuneBackdropLoop();
        return;
      }
      if (this.currentScreen === 'start') {
        this.startAnimationLoop();
      } else {
        this.startRuneBackdropLoop(true);
      }
    });

    window.addEventListener('GGIS_LANG_CHANGED', () => {
      this.applyTexts();
    });
  },

  applyTexts() {
    const root = this.elements.root;
    if (!root) return;

    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = this._t(key);
    });
  },

  showScreen(name) {
    this.previousScreen = this.currentScreen;
    this.currentScreen = name;
    this.hideUnavailableHint();
    const distanceReadout = document.getElementById('distanceReadout');
    if (distanceReadout) {
      distanceReadout.hidden = true;
      distanceReadout.innerHTML = '';
    }

    [this.elements.start, this.elements.credit, this.elements.guidance].forEach((screen) => {
      if (!screen) return;
      screen.hidden = screen.getAttribute('data-screen') !== name;
    });

    document.body.classList.add('gg-opening-active');
    document.getElementById('app')?.classList.add('gg-app-hidden');

    if (name === 'start') {
      this.stopRuneBackdropLoop();
      this.lastCycleIndex = -1;
      this.startAnimationLoop(true);
    } else {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = 0;
      }
      this.startRuneBackdropLoop(true);
    }
  },

  applyDemoDefaultView() {
    const size = window.MapCanvas?.getReferenceSize?.() || DEMO_MAP_SIZE;
    const steps = Array.isArray(window.MapView?.zoomSteps) ? window.MapView.zoomSteps : [];
    const minZoom = steps.length ? steps[0] : 0.1;
    const centerX = Number(size?.width) ? Number(size.width) / 2 : DEMO_DEFAULT_VIEW.centerX;
    const centerY = Number(size?.height) ? Number(size.height) / 2 : DEMO_DEFAULT_VIEW.centerY;

    window.MapTools?.setPinToMapCenter?.();
    window.MapView?.setCenterOnMapPoint?.({
      x: centerX,
      y: centerY,
      zoom: minZoom,
      syncZoomIndex: true,
    });
    window.MapTools?._render?.();
    window.MapTools?._renderDistanceReadout?.();
  },

  scheduleDemoDefaultView() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.applyDemoDefaultView());
    });
  },

  async loadDemoAndEnter() {
    try {
      const baseLayer = window.MapCanvas?.addImageLayerFromUrl?.({
        name: 'map.png',
        src: './assets/map.png',
        fit: true,
        fitMode: 'cover',
        demo: true,
      });
      if (!baseLayer) throw new Error('DEMO_IMAGE_CREATE_FAILED');
      baseLayer.el?.addEventListener?.('load', () => this.scheduleDemoDefaultView(), { once: true });

      const gridLayer = window.MapCanvas?.addCanvasLayer?.({
        name: 'Squ_Grid',
        width: DEMO_MAP_SIZE.width,
        height: DEMO_MAP_SIZE.height,
        draw: drawDemoGrid,
        fit: false,
      });
      if (!gridLayer) throw new Error('DEMO_GRID_CREATE_FAILED');

      const hexGridLayer = window.MapCanvas?.addCanvasLayer?.({
        name: 'Hex_Grid',
        width: DEMO_MAP_SIZE.width,
        height: DEMO_MAP_SIZE.height,
        draw: drawDemoHexGrid,
        fit: false,
      });
      if (!hexGridLayer) throw new Error('DEMO_HEX_GRID_CREATE_FAILED');
      window.MapCanvas?.setLayerVisible?.(hexGridLayer.id, true);

      if (document.fonts?.ready) {
        document.fonts.ready
          .then(() => {
            window.MapCanvas?.redrawCanvasLayers?.();
          })
          .catch(() => {});
      }
      window.UI?.syncImageLoadState?.();
      window.UI?.renderLayerList?.();
      this.enterApp();
      this.scheduleDemoDefaultView();
    } catch (error) {
      console.error('[opening] Demo map load failed:', error);
      this.loadPngAndEnter();
    }
  },

  loadPngAndEnter() {
    if (!window.MapCanvas?.openFilePicker) return;

    this.pendingFileEntry = true;
    this.pendingPngEntryFocusBoldhome = true;
    window.MapTools?.setInitialPinPosition?.({ x: 4028, y: 2829 });
    window.MapCanvas?.setInitialViewConfig?.({ zoomMultiplier: 1 });
    const onImageStateChanged = (event) => {
      const detail = event.detail || {};
      if (!detail.hasImages) return;
      window.removeEventListener('GGIS_IMAGE_STATE_CHANGED', onImageStateChanged);
      this.pendingFileEntry = false;
      this.enterApp();
    };

    window.addEventListener('GGIS_IMAGE_STATE_CHANGED', onImageStateChanged);
    window.MapCanvas.openFilePicker();

    window.setTimeout(() => {
      if (!this.pendingFileEntry) return;
      window.removeEventListener('GGIS_IMAGE_STATE_CHANGED', onImageStateChanged);
      this.pendingFileEntry = false;
      this.pendingPngEntryFocusBoldhome = false;
      window.MapTools?.setInitialPinPosition?.(null);
      window.MapCanvas?.setInitialViewConfig?.(null);
    }, 12000);
  },

  focusBoldhomeIfNeeded() {
    if (!this.pendingPngEntryFocusBoldhome) return;
    this.pendingPngEntryFocusBoldhome = false;

    const tool = window.PlaceCoordinateTool;
    const candidates = tool?.searchRows?.('BOLDHOME', { limit: 5 }) || [];
    const row = candidates.find((item) => String(item?.L1 || '').trim().toUpperCase() === 'BOLDHOME')
      || candidates.find((item) => String(item?.L2_read || '').trim().toUpperCase() === 'BOLDHOME')
      || null;
    const coords = tool?.getRowCoords?.(row) || { x: 4028, y: 2829 };
    if (!Number.isFinite(coords?.x) || !Number.isFinite(coords?.y)) return;
    window.MapCanvas?.setInitialViewConfig?.(null);
    window.MapTools?.setInitialPinPosition?.(coords);
    window.MapTools?.setPinPosition?.(coords);
    window.MapView?.setCenterOnMapPoint?.({
      x: coords.x,
      y: coords.y,
      syncZoomIndex: false,
    });
    window.MapTools?._renderDistanceReadout?.();
    window.PlaceCoordinateTool?.updateCenterPreview?.();
  },

  showUnavailableHint(anchorEl) {
    const hintEl = this.elements.unavailableHint;
    if (!(hintEl instanceof HTMLElement) || !(anchorEl instanceof Element)) return;

    hintEl.textContent = this._t('PLACE_JUMP_STATUS_UNAVAILABLE_HERE') || 'This cannot be used here.';
    hintEl.hidden = false;

    const anchorRect = anchorEl.getBoundingClientRect();
    const rootRect = this.elements.root?.getBoundingClientRect?.() || { left: 0, top: 0 };
    hintEl.style.left = `${Math.max(12, anchorRect.left - rootRect.left + (anchorRect.width / 2))}px`;
    hintEl.style.top = `${Math.max(12, anchorRect.top - rootRect.top - 10)}px`;

    if (this.unavailableHintHideTimer) {
      clearTimeout(this.unavailableHintHideTimer);
      this.unavailableHintHideTimer = 0;
    }
    if (this.unavailableHintMoveBound) {
      window.removeEventListener('pointermove', this.unavailableHintMoveBound);
    }

    this.unavailableHintMoveBound = () => {
      if (this.unavailableHintMoveBound) {
        window.removeEventListener('pointermove', this.unavailableHintMoveBound);
      }
      this.unavailableHintMoveBound = null;
      this.unavailableHintHideTimer = window.setTimeout(() => {
        this.hideUnavailableHint();
      }, 1000);
    };

    window.addEventListener('pointermove', this.unavailableHintMoveBound, { passive: true });
  },

  hideUnavailableHint() {
    const hintEl = this.elements.unavailableHint;
    if (hintEl instanceof HTMLElement) {
      hintEl.hidden = true;
    }
    if (this.unavailableHintHideTimer) {
      clearTimeout(this.unavailableHintHideTimer);
      this.unavailableHintHideTimer = 0;
    }
    if (this.unavailableHintMoveBound) {
      window.removeEventListener('pointermove', this.unavailableHintMoveBound);
      this.unavailableHintMoveBound = null;
    }
  },

  enterApp() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }
    this.stopRuneBackdropLoop();
    this.hideUnavailableHint();

    document.getElementById('app')?.classList.remove('gg-app-hidden');
    document.body.classList.remove('gg-opening-active');
    const shouldKeepPngLoadedView = this.pendingPngEntryFocusBoldhome;
    requestAnimationFrame(() => {
      if (!shouldKeepPngLoadedView) {
        window.MapCanvas?.applyInitialFlagView?.(window.MapCanvas?._initialFitMode || 'contain');
      }
      this.focusBoldhomeIfNeeded();
    });
    if (this.elements.root) this.elements.root.innerHTML = '';
    this.elements = {};
  },

  createAirCycle() {
    const isUpperPass = Math.random() < 0.5;
    this.airCycle = {
      isUpperPass,
      startX: randomRange(this.config.airStartXMin, this.config.airStartXMax),
      baseY: isUpperPass
        ? randomRange(this.config.airBaseYMin, Math.min(this.config.movementRuneY - 0.03, this.config.airBaseYMax))
        : randomRange(Math.max(this.config.movementRuneY + 0.03, this.config.airBaseYMin), this.config.airBaseYMax),
      waveAmplitude: randomRange(this.config.waveAmplitudeMin, this.config.waveAmplitudeMax),
      waveFrequency: randomRange(this.config.waveFrequencyMin, this.config.waveFrequencyMax),
      airTravelDuration: randomRange(this.config.airTravelDurationMin, this.config.airTravelDurationMax),
    };
  },

  getAirCycle(absoluteElapsed) {
    const cycleIndex = Math.floor(absoluteElapsed / this.config.animationCycleDuration);
    if (!this.airCycle || cycleIndex !== this.lastCycleIndex) {
      this.lastCycleIndex = cycleIndex;
      this.createAirCycle();
    }
    return this.airCycle;
  },

  getAirTravelRotate(airT) {
    const travel = easeOutSine(airT);
    return -this.config.upperPassRotate * travel;
  },

  getAirYAtProgress(stageHeight, airCycle, airT) {
    const pad = this.config.stagePadding;
    const wave = Math.sin(airT * Math.PI * airCycle.waveFrequency * 2) * (stageHeight * airCycle.waveAmplitude);
    return pad + (stageHeight - pad * 2) * airCycle.baseY + wave;
  },

  startAnimationLoop(resetClock = false) {
    if (!this.elements.stage || !this.elements.movementRune || !this.elements.earthRune || !this.elements.airRune) return;
    if (this.currentScreen !== 'start') return;
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (!this.animationStartedAt || resetClock) this.animationStartedAt = performance.now();

    const totalDuration = this.config.animationCycleDuration;
    const tick = (now) => {
      if (this.currentScreen !== 'start') {
        this.animationFrame = 0;
        return;
      }
      const absoluteElapsed = now - this.animationStartedAt;
      const elapsed = absoluteElapsed % totalDuration;
      this.renderAnimationFrame(elapsed, absoluteElapsed);
      this.animationFrame = requestAnimationFrame(tick);
    };

    this.animationFrame = requestAnimationFrame(tick);
  },

  renderAnimationFrame(elapsed, absoluteElapsed = elapsed) {
    const stage = this.elements.stage;
    const movementRune = this.elements.movementRune;
    const earthRune = this.elements.earthRune;
    const airRune = this.elements.airRune;
    if (!stage || !movementRune || !earthRune || !airRune) return;

    const rect = stage.getBoundingClientRect();
    const width = Math.max(rect.width, 240);
    const height = Math.max(rect.height, 240);
    const unit = Math.min(width, height);
    const pad = this.config.stagePadding;
    const airCycle = this.getAirCycle(absoluteElapsed);

    const movementSize = unit * this.config.movementRuneSize;
    const earthSize = unit * this.config.earthRuneSize;
    const airSize = unit * this.config.airRuneSize;

    const movementX = pad + (width - pad * 2) * this.config.movementRuneX;
    const movementY = pad + (height - pad * 2) * this.config.movementRuneY;
    const earthX = pad + (width - pad * 2) * this.config.earthRuneX;
    const earthY = pad + (height - pad * 2) * this.config.earthRuneY;
    const animationAreaLeft = width * this.config.animationAreaInsetX;
    const animationAreaRight = width * (1 - this.config.animationAreaInsetX);
    const animationAreaTop = height * this.config.animationAreaInsetY;
    const animationAreaBottom = height * (1 - this.config.animationAreaInsetY);

    const triggerX = movementX + airSize * this.config.spinTriggerOffset;
    const triggerT = clamp01((triggerX - width * airCycle.startX) / (width * (this.config.airEndX - airCycle.startX)));
    const triggerTime = airCycle.airTravelDuration * triggerT;
    const crossingT = clamp01((movementX - width * airCycle.startX) / (width * (this.config.airEndX - airCycle.startX)));
    const crossingY = this.getAirYAtProgress(height, airCycle, crossingT);
    const spinDirection = crossingY < movementY ? -1 : 1;

    const airT = phaseProgress(elapsed, 0, airCycle.airTravelDuration);
    const airX = lerp(airCycle.startX, this.config.airEndX, easeInOutSine(airT));
    const airTravelRotate = this.getAirTravelRotate(airT);
    const airY = this.getAirYAtProgress(height, airCycle, airT);
    const airCenterX = width * airX;
    const isAirInsideAnimationArea = (
      airCenterX >= animationAreaLeft &&
      airCenterX <= animationAreaRight &&
      airY >= animationAreaTop &&
      airY <= animationAreaBottom
    );

    const spinT = phaseProgress(elapsed, triggerTime, this.config.spinDecayDuration);
    const settleAngle = this.config.spinAngle + this.config.overshootAngle - this.config.settleBackAngle;
    let movementAngle = 0;
    if (elapsed >= triggerTime) {
      if (spinT < 1) {
        const leadPortion = 0.18;
        if (spinT <= leadPortion) {
          movementAngle = lerp(0, this.config.spinAngle + this.config.overshootAngle, easeOutSine(spinT / leadPortion));
        } else {
          movementAngle = lerp(
            this.config.spinAngle + this.config.overshootAngle,
            settleAngle,
            easeOutCubic((spinT - leadPortion) / (1 - leadPortion)),
          );
        }
      } else {
        movementAngle = settleAngle;
      }
    }
    movementAngle *= spinDirection;

    const airFadeT = phaseProgress(elapsed, Math.max(0, airCycle.airTravelDuration - this.config.airFadeDuration), this.config.airFadeDuration);
    const airOpacity = elapsed > airCycle.airTravelDuration ? 0 : 1 - airFadeT;

    movementRune.style.fontSize = `${movementSize}px`;
    movementRune.style.left = '0';
    movementRune.style.top = '0';
    movementRune.style.transform = `translate(${movementX}px, ${movementY}px) translate(-50%, -50%) rotate(${movementAngle}deg)`;

    earthRune.style.fontSize = `${earthSize}px`;
    earthRune.style.left = '0';
    earthRune.style.top = '0';
    earthRune.style.opacity = '0.72';
    earthRune.style.transform = `translate(${earthX}px, ${earthY}px) translate(-50%, -50%) scale(0.9)`;

    airRune.style.fontSize = `${airSize}px`;
    airRune.style.left = '0';
    airRune.style.top = '0';
    airRune.style.color = isAirInsideAnimationArea ? this.config.airInnerColor : this.config.airOuterColor;
    airRune.style.opacity = String(Math.max(0, airOpacity));
    airRune.style.transform = `translate(${airCenterX}px, ${airY}px) translate(-50%, -50%) rotate(${airTravelRotate}deg)`;
  },
};

window.IntroFlow = IntroFlow;

window.addEventListener('DOMContentLoaded', async () => {
  try {
    if (window.I18N?.init) await window.I18N.init();
  } catch (e) {
    console.error('[boot] I18N.init failed:', e);
  }

  if (document.documentElement.getAttribute('data-mobile-unsupported') === 'true') {
    showUnsupportedMobileScreen();
    return;
  }

  if (window.OSDetect?.isMobile?.()) {
    showUnsupportedMobileScreen();
    return;
  }

  await unregisterServiceWorkers();

  try {
    window.UI?.renderRoot?.();
  } catch (e) {
    console.error('[boot] UI.renderRoot failed:', e);
    return;
  }

  window.LanguageSelect?.render?.();
  window.UI?.renderTexts?.();

  try {
    window.EntryNotices?.run?.();
  } catch (e) {
    console.error('[boot] EntryNotices.run failed:', e);
  }
  if (window.EntryNotices?.blocked) return;

  try {
    await window.MapCanvas?.init?.();
  } catch (e) {
    console.error('[boot] MapCanvas.init failed:', e);
  }

  window.UI?.syncImageLoadState?.();
  window.UI?.renderLayerList?.();

  try {
    window.CoordsHUD?.init?.();
  } catch (e) {
    console.error('[boot] CoordsHUD.init failed:', e);
  }

  try {
    await window.PlaceCoordinateTool?.init?.();
  } catch (e) {
    console.error('[boot] PlaceCoordinateTool.init failed:', e);
  }

  try {
    window.PlaceJumpUI?.init?.();
  } catch (e) {
    console.error('[boot] PlaceJumpUI.init failed:', e);
  }

  if (window.MapView) {
    window.MapView.onChange = (st) => {
      window.CoordsHUD?.update?.(st.offsetX, st.offsetY, st.zoom);
      window.PlaceCoordinateTool?.updateCenterPreview?.();
      window.MapTools?._render?.();
      window.MapTools?._renderDistanceReadout?.();
    };
  }

  IntroFlow.init();
});
