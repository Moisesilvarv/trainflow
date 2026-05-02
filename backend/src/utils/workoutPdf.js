import PDFDocument from 'pdfkit';
import { getOfficialLogoBuffer } from './brandAssets.js';

const COLORS = {
  primary: '#2563EB',
  navy: '#0F172A',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  primarySoft: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  shadow: '#CBD5E1'
};

const LAYOUT = {
  margin: 42,
  headerHeight: 78,
  footerHeight: 78,
  sectionGap: 24,
  cardRadius: 18,
  cardPadding: 18
};

function safeText(value, fallback = '-') {
  const text = String(value || '').trim();
  return text || fallback;
}

function formatDisplayDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function joinText(parts = [], fallback = '-') {
  const text = parts
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' ');
  return text || fallback;
}

function summarizeWorkoutNotes(notes = '') {
  const text = String(notes || '').trim();
  if (!text) {
    return 'Planejamento organizado para acompanhamento tecnico com foco em execucao clara, evolucao e registro profissional.';
  }

  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim();
  return safeText(firstSentence || text);
}

function createRenderer(doc, protocol) {
  const renderer = {
    doc,
    protocol,
    pageIndex: 1
  };

  doc.on('pageAdded', () => {
    renderer.pageIndex += 1;
    drawHeader(renderer, { compact: true });
    drawFooter(renderer);
    doc.y = getContentTop(renderer);
  });

  drawHeader(renderer, { compact: false });
  drawFooter(renderer);
  doc.y = getContentTop(renderer);

  return renderer;
}

function getPageBounds(renderer) {
  const { doc } = renderer;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.page.margins.top;
  const bottom = doc.page.height - doc.page.margins.bottom;

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

function getContentTop(renderer) {
  const { top } = getPageBounds(renderer);
  return top + LAYOUT.headerHeight + 18;
}

function getContentBottom(renderer) {
  const { bottom } = getPageBounds(renderer);
  return bottom - LAYOUT.footerHeight - 18;
}

function drawRoundedCard(renderer, x, y, width, height, options = {}) {
  const { doc } = renderer;
  const radius = options.radius ?? LAYOUT.cardRadius;
  const shadowOffset = options.shadow === false ? 0 : 3;

  if (shadowOffset) {
    doc.save();
    doc.roundedRect(x, y + shadowOffset, width, height, radius)
      .fillOpacity(0.08)
      .fillColor(COLORS.shadow)
      .fill();
    doc.restore();
  }

  doc.save();
  doc.roundedRect(x, y, width, height, radius)
    .fillColor(options.fill || COLORS.surface)
    .fill();
  doc.restore();

  doc.save();
  doc.roundedRect(x, y, width, height, radius)
    .lineWidth(options.lineWidth ?? 1)
    .strokeColor(options.stroke || COLORS.border)
    .stroke();
  doc.restore();
}

const OFFICIAL_LOGO_BUFFER = getOfficialLogoBuffer();

function drawDivider(renderer, y) {
  const { doc } = renderer;
  const { left, right } = getPageBounds(renderer);
  doc.save();
  doc.moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor(COLORS.border).stroke();
  doc.restore();
}

function drawHeader(renderer, options = {}) {
  const { doc, protocol } = renderer;
  const { left, right, top, width } = getPageBounds(renderer);
  const compact = Boolean(options.compact);
  const logoY = top + (compact ? 6 : 2);
  const logoSize = compact ? 28 : 32;
  const protocolWidth = compact ? 118 : 170;
  const protocolHeight = compact ? 28 : 34;
  const protocolX = right - protocolWidth;
  const protocolY = top + (compact ? 6 : 0);

  doc.image(OFFICIAL_LOGO_BUFFER, left, logoY + 2, {
    width: logoSize,
    height: logoSize
  });
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(compact ? 20 : 22)
    .text('TRAINFLOW', left + (compact ? 40 : 46), logoY + 7, { width: 180 });

  drawRoundedCard(renderer, protocolX, protocolY, protocolWidth, protocolHeight, {
    fill: COLORS.surface,
    stroke: COLORS.border,
    radius: 12,
    shadow: false
  });
  doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(compact ? 9.5 : 10.5)
    .text(protocol, protocolX, protocolY + (compact ? 9 : 11), {
      width: protocolWidth,
      align: 'center'
    });

  drawDivider(renderer, top + LAYOUT.headerHeight - 10);

  if (!compact) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5)
      .text('', left, top + 56, { width });
  }
}

function drawFooterWatermark(renderer, x, y, size) {
  const { doc } = renderer;
  doc.save();
  doc.lineWidth(8).strokeOpacity(0.07).strokeColor(COLORS.surface);
  doc.roundedRect(x, y, size, size * 0.34, 8).stroke();
  doc.moveTo(x + size * 0.5, y + size * 0.34).lineTo(x + size * 0.5, y + size).stroke();
  doc.restore();
}

function drawIcon(renderer, name, x, y, size = 18, color = COLORS.primary) {
  const { doc } = renderer;
  const s = size;

  doc.save();
  doc.lineWidth(1.8).strokeColor(color).lineCap('round').lineJoin('round');

  if (name === 'user') {
    doc.circle(x + s * 0.5, y + s * 0.32, s * 0.18).stroke();
    doc.moveTo(x + s * 0.18, y + s * 0.88).bezierCurveTo(
      x + s * 0.22, y + s * 0.64,
      x + s * 0.78, y + s * 0.64,
      x + s * 0.82, y + s * 0.88
    ).stroke();
  } else if (name === 'calendar') {
    doc.roundedRect(x + s * 0.12, y + s * 0.2, s * 0.76, s * 0.66, 3).stroke();
    doc.moveTo(x + s * 0.28, y + s * 0.12).lineTo(x + s * 0.28, y + s * 0.32).stroke();
    doc.moveTo(x + s * 0.72, y + s * 0.12).lineTo(x + s * 0.72, y + s * 0.32).stroke();
    doc.moveTo(x + s * 0.12, y + s * 0.42).lineTo(x + s * 0.88, y + s * 0.42).stroke();
  } else if (name === 'shield') {
    doc.moveTo(x + s * 0.5, y + s * 0.1)
      .lineTo(x + s * 0.82, y + s * 0.22)
      .lineTo(x + s * 0.76, y + s * 0.66)
      .quadraticCurveTo(x + s * 0.68, y + s * 0.86, x + s * 0.5, y + s * 0.94)
      .quadraticCurveTo(x + s * 0.32, y + s * 0.86, x + s * 0.24, y + s * 0.66)
      .lineTo(x + s * 0.18, y + s * 0.22)
      .closePath()
      .stroke();
  } else if (name === 'target') {
    doc.circle(x + s * 0.5, y + s * 0.5, s * 0.36).stroke();
    doc.circle(x + s * 0.5, y + s * 0.5, s * 0.19).stroke();
    doc.circle(x + s * 0.5, y + s * 0.5, s * 0.04).fillColor(color).fill();
  } else if (name === 'clipboard') {
    doc.roundedRect(x + s * 0.2, y + s * 0.2, s * 0.6, s * 0.68, 3).stroke();
    doc.roundedRect(x + s * 0.36, y + s * 0.08, s * 0.28, s * 0.18, 3).stroke();
    doc.moveTo(x + s * 0.32, y + s * 0.46).lineTo(x + s * 0.68, y + s * 0.46).stroke();
    doc.moveTo(x + s * 0.32, y + s * 0.64).lineTo(x + s * 0.62, y + s * 0.64).stroke();
  } else if (name === 'bars') {
    doc.moveTo(x + s * 0.22, y + s * 0.82).lineTo(x + s * 0.22, y + s * 0.54).stroke();
    doc.moveTo(x + s * 0.5, y + s * 0.82).lineTo(x + s * 0.5, y + s * 0.3).stroke();
    doc.moveTo(x + s * 0.78, y + s * 0.82).lineTo(x + s * 0.78, y + s * 0.14).stroke();
  } else if (name === 'arrow-up') {
    doc.moveTo(x + s * 0.5, y + s * 0.86).lineTo(x + s * 0.5, y + s * 0.2).stroke();
    doc.moveTo(x + s * 0.28, y + s * 0.42).lineTo(x + s * 0.5, y + s * 0.18).lineTo(x + s * 0.72, y + s * 0.42).stroke();
  } else if (name === 'coach') {
    doc.circle(x + s * 0.36, y + s * 0.3, s * 0.16).stroke();
    doc.moveTo(x + s * 0.12, y + s * 0.82).bezierCurveTo(
      x + s * 0.14, y + s * 0.6,
      x + s * 0.58, y + s * 0.6,
      x + s * 0.6, y + s * 0.82
    ).stroke();
    doc.circle(x + s * 0.78, y + s * 0.72, s * 0.12).stroke();
    doc.moveTo(x + s * 0.78, y + s * 0.54).lineTo(x + s * 0.78, y + s * 0.9).stroke();
    doc.moveTo(x + s * 0.6, y + s * 0.72).lineTo(x + s * 0.96, y + s * 0.72).stroke();
  } else if (name === 'sparkles') {
    doc.moveTo(x + s * 0.5, y + s * 0.08).lineTo(x + s * 0.58, y + s * 0.38).lineTo(x + s * 0.9, y + s * 0.46)
      .lineTo(x + s * 0.58, y + s * 0.54).lineTo(x + s * 0.5, y + s * 0.92)
      .lineTo(x + s * 0.42, y + s * 0.54).lineTo(x + s * 0.1, y + s * 0.46)
      .lineTo(x + s * 0.42, y + s * 0.38).closePath().stroke();
  } else if (name === 'trophy') {
    doc.roundedRect(x + s * 0.28, y + s * 0.16, s * 0.44, s * 0.34, 4).stroke();
    doc.moveTo(x + s * 0.36, y + s * 0.52).lineTo(x + s * 0.64, y + s * 0.52).stroke();
    doc.moveTo(x + s * 0.5, y + s * 0.5).lineTo(x + s * 0.5, y + s * 0.74).stroke();
    doc.moveTo(x + s * 0.34, y + s * 0.84).lineTo(x + s * 0.66, y + s * 0.84).stroke();
    doc.moveTo(x + s * 0.22, y + s * 0.24).quadraticCurveTo(x + s * 0.04, y + s * 0.28, x + s * 0.16, y + s * 0.46).stroke();
    doc.moveTo(x + s * 0.78, y + s * 0.24).quadraticCurveTo(x + s * 0.96, y + s * 0.28, x + s * 0.84, y + s * 0.46).stroke();
  } else if (name === 'dumbbell') {
    doc.moveTo(x + s * 0.12, y + s * 0.5).lineTo(x + s * 0.34, y + s * 0.5).stroke();
    doc.moveTo(x + s * 0.66, y + s * 0.5).lineTo(x + s * 0.88, y + s * 0.5).stroke();
    doc.moveTo(x + s * 0.34, y + s * 0.36).lineTo(x + s * 0.66, y + s * 0.36).stroke();
    doc.moveTo(x + s * 0.34, y + s * 0.64).lineTo(x + s * 0.66, y + s * 0.64).stroke();
    doc.moveTo(x + s * 0.28, y + s * 0.3).lineTo(x + s * 0.28, y + s * 0.7).stroke();
    doc.moveTo(x + s * 0.72, y + s * 0.3).lineTo(x + s * 0.72, y + s * 0.7).stroke();
  }

  doc.restore();
}

function drawFooter(renderer) {
  const { doc } = renderer;
  const { left, width, bottom, right } = getPageBounds(renderer);
  const bandHeight = 54;
  const y = bottom - bandHeight;

  drawRoundedCard(renderer, left, y, width, bandHeight, {
    fill: COLORS.navy,
    stroke: COLORS.navy,
    radius: 16,
    shadow: false
  });

  drawRoundedCard(renderer, left + 14, y + 12, 38, 30, {
    fill: COLORS.primary,
    stroke: COLORS.primary,
    radius: 10,
    shadow: false
  });
  drawIcon(renderer, 'trophy', left + 23, y + 17, 20, COLORS.surface);

  doc.fillColor(COLORS.surface).font('Helvetica-Bold').fontSize(12)
    .text('Foco. Disciplina. Performance.', left + 60, y + 13);
  doc.fillColor('#CBD5E1').font('Helvetica').fontSize(9.5)
    .text('Cada treino e um passo a mais rumo ao seu melhor.', left + 60, y + 30);

  drawFooterWatermark(renderer, right - 78, y + 8, 54);
}

function checkPageBreak(renderer, heightNeeded = 0) {
  const { doc } = renderer;
  if (doc.y + heightNeeded <= getContentBottom(renderer)) return;
  doc.addPage();
}

function measureText(renderer, text, width, options = {}) {
  const { doc } = renderer;
  const previousFont = doc._font;
  const previousFontSize = doc._fontSize;
  const previousLineGap = doc._lineGap;

  if (options.font) doc.font(options.font);
  if (options.fontSize) doc.fontSize(options.fontSize);
  if (typeof options.lineGap === 'number') doc._lineGap = options.lineGap;

  const height = doc.heightOfString(safeText(text), { width, ...options });

  doc._font = previousFont;
  doc._fontSize = previousFontSize;
  doc._lineGap = previousLineGap;

  return height;
}

function drawSectionHeader(renderer, options) {
  const { doc } = renderer;
  const { left, width } = getPageBounds(renderer);
  const iconSize = options.iconSize || 20;

  checkPageBreak(renderer, 48);

  const startY = doc.y;
  if (options.icon) {
    drawIcon(renderer, options.icon, left, startY + 2, iconSize);
  }

  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(17)
    .text(options.title, left + 28, startY, { width: width - 28 });
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10.5)
    .text(options.subtitle || '', left, startY + 24, { width });

  doc.y = startY + 46;
}

function drawBadge(renderer, x, y, width, label) {
  const { doc } = renderer;
  drawRoundedCard(renderer, x, y, width, 28, {
    fill: COLORS.surface,
    stroke: COLORS.border,
    radius: 12,
    shadow: false
  });
  doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9.5)
    .text(label, x, y + 9, { width, align: 'center' });
}

function drawHeaderMetaItem(renderer, x, y, width, icon, label, value) {
  const { doc } = renderer;
  drawIcon(renderer, icon, x, y + 2, 20, COLORS.muted);
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9.4)
    .text(label, x + 28, y, { width: width - 28 });
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(12)
    .text(value, x + 28, y + 14, { width: width - 28 });
}

function drawHeaderMetaDivider(renderer, x, y, height) {
  const { doc } = renderer;
  doc.save();
  doc.moveTo(x, y).lineTo(x, y + height).lineWidth(1).strokeColor(COLORS.border).stroke();
  doc.restore();
}

function drawHero(renderer, data) {
  const { doc } = renderer;
  const { left, width } = getPageBounds(renderer);
  const startY = doc.y;
  const columnGap = 22;
  const columnWidth = (width - columnGap * 2) / 3;
  const titleWidth = width - 40;
  const titleHeight = measureText(renderer, data.workoutTitle, titleWidth, {
    font: 'Helvetica-Bold',
    fontSize: 30,
    lineGap: -2
  });
  const heroHeight = 138 + titleHeight;

  checkPageBreak(renderer, heroHeight);

  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8.8)
    .text('DOCUMENTO PROFISSIONAL DE ACOMPANHAMENTO', left, startY);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(30)
    .text(data.workoutTitle, left, startY + 20, {
      width: titleWidth,
      lineGap: -2
    });

  doc.save();
  doc.roundedRect(left, startY + 22 + titleHeight + 16, 48, 4, 2).fillColor(COLORS.primary).fill();
  doc.restore();

  const metaY = startY + 22 + titleHeight + 34;
  drawHeaderMetaItem(renderer, left, metaY, columnWidth, 'user', 'Profissional responsavel', data.coachName);
  drawHeaderMetaItem(renderer, left + columnWidth + columnGap, metaY, columnWidth, 'calendar', 'Data', data.generatedAt);
  drawHeaderMetaItem(renderer, left + (columnWidth + columnGap) * 2, metaY, columnWidth, 'shield', 'Protocolo', data.protocol);
  drawHeaderMetaDivider(renderer, left + columnWidth + (columnGap / 2), metaY + 3, 36);
  drawHeaderMetaDivider(renderer, left + (columnWidth * 2) + columnGap + (columnGap / 2), metaY + 3, 36);

  doc.y = metaY + 56;
}

function drawInfoCard(renderer, options) {
  const { doc } = renderer;
  const padding = options.padding || 16;

  drawRoundedCard(renderer, options.x, options.y, options.width, options.height, {
    fill: COLORS.surface,
    stroke: COLORS.border,
    radius: 14
  });

  drawIcon(renderer, options.icon, options.x + padding, options.y + 18, 22);
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9.8)
    .text(options.label, options.x + padding + 34, options.y + 16, {
      width: options.width - padding * 2 - 34
    });
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(12.8)
    .text(options.value, options.x + padding + 34, options.y + 32, {
      width: options.width - padding * 2 - 34
    });
}

function drawStudentSection(renderer, data) {
  const { doc } = renderer;
  const { left, width } = getPageBounds(renderer);
  const gap = 14;
  const columns = 2;
  const cardWidth = (width - gap) / columns;
  const cardHeight = 64;
  const cards = [
    { label: 'Aluno', value: data.studentName, icon: 'user' },
    { label: 'Objetivo principal', value: data.studentGoal, icon: 'target' },
    { label: 'Modalidade', value: data.category, icon: 'clipboard' },
    { label: 'Nivel / categoria', value: data.level, icon: 'bars' },
    { label: 'Prioridade', value: data.priority, icon: 'arrow-up' },
    { label: 'Profissional responsavel', value: data.coachName, icon: 'coach' }
  ];
  const totalHeight = Math.ceil(cards.length / columns) * cardHeight + (Math.ceil(cards.length / columns) - 1) * gap;
  checkPageBreak(renderer, 46 + totalHeight + 6);

  drawSectionHeader(renderer, {
    icon: 'user',
    title: 'Dados do aluno',
    subtitle: 'Informacoes principais organizadas em um bloco limpo e facil de compartilhar.'
  });

  const startY = doc.y;
  cards.forEach((card, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    drawInfoCard(renderer, {
      x: left + col * (cardWidth + gap),
      y: startY + row * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
      label: card.label,
      value: card.value,
      icon: card.icon
    });
  });

  doc.y = startY + totalHeight + LAYOUT.sectionGap;
}

function drawObjectivesGroup(renderer, x, y, width, title, text, icon, options = {}) {
  const { doc } = renderer;
  const iconBox = 34;
  const padding = 16;
  const textX = x + padding + iconBox + 14;
  const textWidth = width - padding * 2 - iconBox - 14;
  const titleHeight = 16;
  const bodyHeight = measureText(renderer, text, textWidth, { fontSize: 10.2, lineGap: 2 });
  const sectionHeight = Math.max(42, titleHeight + bodyHeight + 10);

  drawRoundedCard(renderer, x + padding, y + 2, iconBox, iconBox, {
    fill: options.iconFill || COLORS.primary,
    stroke: options.iconFill || COLORS.primary,
    radius: 10,
    shadow: false
  });
  drawIcon(renderer, icon, x + padding + 7, y + 9, 20, options.iconColor || COLORS.surface);

  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(12.2)
    .text(title, textX, y + 4, { width: textWidth });
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10.8)
    .text(options.heading || title, textX, y + 22, { width: textWidth });
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10.2)
    .text(text, textX, y + 38, { width: textWidth, lineGap: 2 });

  return Math.max(sectionHeight + 8, 64);
}

function drawObjectivesSection(renderer, data) {
  const { doc } = renderer;
  const { left, width } = getPageBounds(renderer);
  const cardPadding = 18;
  const innerWidth = width - cardPadding * 2 - 20;
  const groups = [
    {
      title: 'Diretrizes do planejamento',
      heading: 'Resumo do planejamento',
      text: data.summaryText,
      icon: 'clipboard'
    },
    {
      title: 'Observacoes importantes',
      heading: 'Pontos de atencao',
      text: data.notesText,
      icon: 'sparkles'
    },
    {
      title: 'Aquecimento / mobilidade / alongamentos',
      heading: 'Preparacao inicial',
      text: data.warmupText,
      icon: 'dumbbell'
    }
  ];

  const groupHeights = groups.map((group) => {
    const textHeight = measureText(renderer, group.text, innerWidth - 48, { fontSize: 10.2, lineGap: 2 });
    return Math.max(64, 52 + textHeight);
  });
  const cardHeight = 26 + groupHeights.reduce((sum, value) => sum + value, 0) + (groups.length - 1) * 18;
  checkPageBreak(renderer, 46 + cardHeight + 6);

  drawSectionHeader(renderer, {
    icon: 'target',
    title: 'Objetivos e orientacoes',
    subtitle: 'Resumo executivo do planejamento e pontos de atencao para acompanhamento.'
  });

  const startY = renderer.doc.y;
  drawRoundedCard(renderer, left, startY, width, cardHeight, {
    fill: COLORS.surface,
    stroke: COLORS.primaryBorder,
    radius: 14
  });

  doc.save();
  doc.roundedRect(left, startY, 4, cardHeight, 2).fillColor(COLORS.primary).fill();
  doc.restore();

  let cursorY = startY + 18;
  groups.forEach((group, index) => {
    const usedHeight = drawObjectivesGroup(renderer, left + 10, cursorY, width - 20, group.title, group.text, group.icon, {
      heading: group.heading
    });
    cursorY += usedHeight;

    if (index < groups.length - 1) {
      doc.save();
      doc.moveTo(left + 18, cursorY + 2).lineTo(left + width - 18, cursorY + 2).lineWidth(1).strokeColor(COLORS.border).stroke();
      doc.restore();
      cursorY += 16;
    }
  });

  renderer.doc.y = startY + cardHeight + LAYOUT.sectionGap;
}

function drawExerciseMetaPill(renderer, x, y, width, label, value) {
  const { doc } = renderer;
  drawRoundedCard(renderer, x, y, width, 42, {
    fill: COLORS.surfaceAlt,
    stroke: COLORS.border,
    radius: 12,
    shadow: false
  });
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7.5)
    .text(label, x + 10, y + 8, { width: width - 20 });
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9.7)
    .text(value, x + 10, y + 22, { width: width - 20 });
}

function getExerciseCardMetrics(renderer, exercise, index) {
  const { left, width } = getPageBounds(renderer);
  const title = safeText(exercise?.name, `Atividade ${index + 1}`);
  const focus = safeText(exercise?.muscle_group, 'Foco livre');
  const notes = safeText(exercise?.notes, 'Sem observacoes tecnicas adicionais.');
  const summary = joinText([
    `Foco: ${focus}.`,
    exercise?.sets ? `Series ou duracao: ${safeText(exercise?.sets)}.` : '',
    exercise?.reps ? `Repeticoes ou tempo: ${safeText(exercise?.reps)}.` : '',
    exercise?.rest ? `Intervalo: ${safeText(exercise?.rest)}.` : ''
  ], 'Planejamento tecnico sem metadados complementares.');
  const titleHeight = measureText(renderer, title, width - 36, { fontSize: 14, lineGap: 1 });
  const summaryHeight = measureText(renderer, summary, width - 36, { fontSize: 10.1, lineGap: 2 });
  const notesHeight = measureText(renderer, notes, width - 36, { fontSize: 10, lineGap: 2 });
  const summaryY = 58 + titleHeight;
  const pillY = summaryY + summaryHeight + 14;
  const notesLabelY = pillY + 56;
  const notesTextY = notesLabelY + 16;
  const cardHeight = notesTextY + notesHeight + 18;
  const pillGap = 10;
  const pillWidth = (width - 36 - pillGap * 2) / 3;

  return {
    left,
    width,
    title,
    focus,
    notes,
    summary,
    titleHeight,
    summaryHeight,
    notesHeight,
    summaryY,
    pillY,
    notesLabelY,
    notesTextY,
    cardHeight,
    pillGap,
    pillWidth
  };
}

function drawExerciseCard(renderer, exercise, index) {
  const { doc } = renderer;
  const metrics = getExerciseCardMetrics(renderer, exercise, index);
  const {
    left,
    width,
    title,
    notes,
    summary,
    cardHeight,
    pillGap,
    pillWidth,
    summaryY,
    pillY,
    notesLabelY,
    notesTextY
  } = metrics;

  checkPageBreak(renderer, cardHeight + 10);

  const startY = doc.y;
  drawRoundedCard(renderer, left, startY, width, cardHeight, {
    fill: COLORS.surface,
    stroke: COLORS.border,
    radius: 16
  });

  drawBadge(renderer, left + 18, startY + 16, 74, `EX ${String(index + 1).padStart(2, '0')}`);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(14)
    .text(title, left + 18, startY + 52, { width: width - 36, lineGap: 1 });
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10.1)
    .text(summary, left + 18, startY + summaryY, { width: width - 36, lineGap: 2 });

  drawExerciseMetaPill(renderer, left + 18, startY + pillY, pillWidth, 'Series ou duracao', safeText(exercise?.sets));
  drawExerciseMetaPill(renderer, left + 18 + pillWidth + pillGap, startY + pillY, pillWidth, 'Repeticoes ou tempo', safeText(exercise?.reps));
  drawExerciseMetaPill(renderer, left + 18 + (pillWidth + pillGap) * 2, startY + pillY, pillWidth, 'Intervalo', safeText(exercise?.rest));

  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(10.8)
    .text('Observacoes tecnicas', left + 18, startY + notesLabelY);
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10)
    .text(notes, left + 18, startY + notesTextY, { width: width - 36, lineGap: 2 });

  doc.y = startY + cardHeight + 12;
}

function drawExerciseSection(renderer, data) {
  const exercises = Array.isArray(data.exercises) ? data.exercises : [];
  checkPageBreak(renderer, 46 + 120);

  drawSectionHeader(renderer, {
    icon: 'dumbbell',
    title: 'Detalhamento tecnico',
    subtitle: 'Cada atividade aparece em um card limpo para manter leitura clara e acabamento profissional.'
  });

  if (!exercises.length) {
    const { left, width } = getPageBounds(renderer);
    checkPageBreak(renderer, 84);
    drawRoundedCard(renderer, left, renderer.doc.y, width, 74, {
      fill: COLORS.surface,
      stroke: COLORS.border,
      radius: 14
    });
    renderer.doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11.5)
      .text('Planejamento sem atividades detalhadas', left + 18, renderer.doc.y + 18);
    renderer.doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10)
      .text('Este treino ainda nao possui atividades registradas. O documento permanece pronto para futuras atualizacoes.', left + 18, renderer.doc.y + 36, {
        width: width - 36
      });
    renderer.doc.y += 92;
    return;
  }

  exercises.forEach((exercise, index) => {
    const metrics = getExerciseCardMetrics(renderer, exercise, index);
    if (renderer.doc.y + metrics.cardHeight + 10 > getContentBottom(renderer)) {
      renderer.doc.addPage();
      drawSectionHeader(renderer, {
        icon: 'dumbbell',
        title: 'Detalhamento tecnico',
        subtitle: 'Continuacao das atividades do planejamento.'
      });
    }
    drawExerciseCard(renderer, exercise, index);
  });
}

function buildWarmupText(workout, exercises) {
  const notes = String(workout?.notes || '').trim();
  const warmupMatch = notes.match(/(aquecimento|mobilidade|alongamento)[\s\S]*/i);
  if (warmupMatch?.[0]) return safeText(warmupMatch[0]);

  if (exercises.length) {
    return 'Inicie com mobilidade geral, ativacao articular e preparacao progressiva antes do bloco principal.';
  }

  return 'Sem aquecimento especifico registrado neste documento.';
}

export function createModernWorkoutPdfStream(data) {
  const { workout, studentName, studentGoal, studentAge, coachName, generatedAt, protocol } = data;
  const doc = new PDFDocument({ size: 'A4', margin: LAYOUT.margin, bufferPages: true });
  const renderer = createRenderer(doc, protocol);
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const category = safeText(workout?.category, 'Planejamento geral');
  const level = studentAge != null ? `${studentAge} anos` : 'Categoria geral';
  const priority = exercises.length >= 6 ? 'Alta' : exercises.length >= 3 ? 'Media' : 'Base';
  const workoutTitle = safeText(workout?.name, 'Planejamento de Treino');
  const summaryText = summarizeWorkoutNotes(workout?.notes);
  const notesText = safeText(workout?.notes, 'Sem observacoes complementares registradas neste documento.');
  const warmupText = buildWarmupText(workout, exercises);

  drawHero(renderer, {
    workoutTitle,
    coachName: safeText(coachName, 'Profissional responsavel'),
    generatedAt: formatDisplayDateTime(generatedAt),
    protocol
  });

  drawStudentSection(renderer, {
    studentName: safeText(studentName, 'Aluno nao informado'),
    studentGoal: safeText(studentGoal, 'Objetivo nao informado'),
    category,
    level,
    priority,
    coachName: safeText(coachName, 'Profissional responsavel')
  });

  drawObjectivesSection(renderer, {
    summaryText,
    notesText,
    warmupText
  });

  drawExerciseSection(renderer, {
    exercises
  });

  return doc;
}

export async function renderWorkoutPdfToBuffer(data) {
  const doc = createModernWorkoutPdfStream(data);
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
