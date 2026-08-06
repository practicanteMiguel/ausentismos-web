import "server-only";
import { readFileSync } from "fs";
import { join } from "path";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from "pdf-lib";
import {
  LEAVE_ORIGIN_GROUP_LABEL,
  LEAVE_TYPE_GROUPS,
  LEAVE_TYPE_LABEL,
  OTRA_LEAVE_TYPES,
  SUPPORT_METHOD_LABEL,
  type LeaveRequest,
} from "@/types/domain";

export const TEMPLATE_VERSION = 2;

const BLACK: RGB = rgb(0, 0, 0);
const GRAY_BAR: RGB = rgb(0.85, 0.85, 0.85);
const MUTED: RGB = rgb(0.35, 0.35, 0.35);

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function decodeDataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? dataUrl;
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Fechas de solo-día (`startDate`/`endDate`/notificación) se guardan como medianoche UTC
 * (a partir de "YYYY-MM-DD" del formulario) — se formatean fijadas a UTC para que el día
 * mostrado no dependa de la zona horaria del servidor (en local puede no ser UTC).
 */
function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  });
}

/** Para momentos reales (ej. `createdAt`), en la hora local del servidor — no fijada a UTC. */
function formatInstant(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
}

interface Ctx {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
}

function drawRect(ctx: Ctx, x: number, y: number, width: number, height: number, fill?: RGB) {
  ctx.page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: BLACK,
    borderWidth: 0.75,
    color: fill,
  });
}

function drawText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  opts: { size?: number; bold?: boolean; color?: RGB; maxWidth?: number } = {}
) {
  const size = opts.size ?? 8;
  const font = opts.bold ? ctx.bold : ctx.font;
  let value = text;
  if (opts.maxWidth) {
    while (value.length > 1 && font.widthOfTextAtSize(value, size) > opts.maxWidth) {
      value = value.slice(0, -1);
    }
    if (value !== text) value = value.slice(0, -1) + "…";
  }
  ctx.page.drawText(value, { x, y, size, font, color: opts.color ?? BLACK });
}

/** Etiqueta + valor subrayado (línea completa hasta `width`). Devuelve el y siguiente. */
function drawFieldLine(
  ctx: Ctx,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
): void {
  drawText(ctx, label, x, y, { size: 8, bold: true });
  const labelWidth = ctx.bold.widthOfTextAtSize(label, 8) + 4;
  const lineStartX = x + labelWidth;
  const lineEndX = x + width;
  ctx.page.drawLine({
    start: { x: lineStartX, y: y - 2 },
    end: { x: lineEndX, y: y - 2 },
    thickness: 0.5,
    color: BLACK,
  });
  drawText(ctx, value, lineStartX + 2, y, { size: 8, maxWidth: lineEndX - lineStartX - 4 });
}

/** Texto con salto de línea manual por palabras. Devuelve el y tras la última línea dibujada. */
function drawWrappedText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  opts: { size?: number; bold?: boolean; color?: RGB; maxWidth: number; lineHeight?: number }
): number {
  const size = opts.size ?? 8;
  const font = opts.bold ? ctx.bold : ctx.font;
  const lineHeight = opts.lineHeight ?? size + 2.5;
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const tentative = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(tentative, size) > opts.maxWidth) {
      ctx.page.drawText(line, { x, y: cursorY, size, font, color: opts.color ?? BLACK });
      cursorY -= lineHeight;
      line = word;
    } else {
      line = tentative;
    }
  }
  if (line) {
    ctx.page.drawText(line, { x, y: cursorY, size, font, color: opts.color ?? BLACK });
    cursorY -= lineHeight;
  }
  return cursorY;
}

function drawSectionBar(ctx: Ctx, text: string, x: number, y: number, width: number, height = 14) {
  drawRect(ctx, x, y - height, width, height, GRAY_BAR);
  const size = 9;
  const textWidth = ctx.bold.widthOfTextAtSize(text.toUpperCase(), size);
  drawText(ctx, text.toUpperCase(), x + (width - textWidth) / 2, y - height / 2 - size / 2 + 2, {
    size,
    bold: true,
  });
}

function drawCheckbox(ctx: Ctx, x: number, y: number, checked: boolean, size = 7) {
  ctx.page.drawRectangle({ x, y, width: size, height: size, borderColor: BLACK, borderWidth: 0.75 });
  if (checked) {
    ctx.page.drawLine({ start: { x, y }, end: { x: x + size, y: y + size }, thickness: 0.8, color: BLACK });
    ctx.page.drawLine({ start: { x, y: y + size }, end: { x: x + size, y }, thickness: 0.8, color: BLACK });
  }
}

interface TemplateContext {
  leaveRequest: LeaveRequest;
  contractName: string;
  contractNumber: string;
  fieldName: string;
}

export async function generateLeaveRequestPdf(ctxData: TemplateContext): Promise<Uint8Array> {
  const { leaveRequest } = ctxData;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { page, font, bold };

  let y = PAGE_HEIGHT - MARGIN;

  // ---- Encabezado: logo + tabla GESTIÓN HUMANA / FORMATO / SOLICITUD... ----
  const headerHeight = 66;
  const logoColWidth = 130;
  const codeColWidth = 150;
  const labelColWidth = CONTENT_WIDTH - logoColWidth - codeColWidth;

  drawRect(ctx, MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight);
  drawRect(ctx, MARGIN, y - headerHeight, logoColWidth, headerHeight);

  try {
    const logoBytes = readFileSync(join(process.cwd(), "public", "assets", "img", "logo-sas.png"));
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDrawWidth = logoColWidth - 16;
    const logoDrawHeight = (logoDrawWidth * logoImage.height) / logoImage.width;
    page.drawImage(logoImage, {
      x: MARGIN + 8,
      y: y - headerHeight / 2 - logoDrawHeight / 2,
      width: logoDrawWidth,
      height: logoDrawHeight,
    });
  } catch {
    drawText(ctx, "SAS", MARGIN + 8, y - headerHeight / 2, { size: 14, bold: true });
  }

  const headerRows: [string, string][] = [
    ["GESTIÓN HUMANA", "CÓDIGO: GH-FO-37"],
    ["FORMATO", "VIGENCIA: 05/08/2026"],
    ["SOLICITUD AUSENTISMO LABORAL", "VERSIÓN: 5"],
  ];
  const rowHeight = headerHeight / 3;
  headerRows.forEach(([label, value], i) => {
    const rowY = y - rowHeight * i;
    const labelX = MARGIN + logoColWidth;
    drawRect(ctx, labelX, rowY - rowHeight, labelColWidth, rowHeight);
    const labelWidth = ctx.bold.widthOfTextAtSize(label, 9);
    drawText(ctx, label, labelX + (labelColWidth - labelWidth) / 2, rowY - rowHeight / 2 - 3, {
      size: 9,
      bold: true,
    });
    const codeX = labelX + labelColWidth;
    drawRect(ctx, codeX, rowY - rowHeight, codeColWidth, rowHeight);
    drawText(ctx, value, codeX + 6, rowY - rowHeight / 2 - 3, { size: 8 });
  });

  y -= headerHeight;

  // ---- Información general ----
  drawSectionBar(ctx, "Información general", MARGIN, y, CONTENT_WIDTH);
  y -= 14;
  const infoBoxTop = y;
  y -= 12;
  drawFieldLine(
    ctx,
    "Fecha de diligenciamiento:",
    formatInstant(leaveRequest.createdAt.toDate()),
    MARGIN + 6,
    y,
    CONTENT_WIDTH - 12
  );
  y -= 14;
  drawFieldLine(ctx, "Nombre:", leaveRequest.employeeName, MARGIN + 6, y, CONTENT_WIDTH / 2 - 12);
  drawFieldLine(ctx, "CC:", leaveRequest.employeeCedula, MARGIN + CONTENT_WIDTH / 2, y, CONTENT_WIDTH / 2 - 12);
  y -= 14;
  drawFieldLine(ctx, "Cargo:", leaveRequest.position, MARGIN + 6, y, CONTENT_WIDTH - 12);
  y -= 14;
  drawFieldLine(
    ctx,
    "Contrato:",
    `${ctxData.contractNumber} - ${ctxData.contractName}`,
    MARGIN + 6,
    y,
    CONTENT_WIDTH / 2 - 12
  );
  drawFieldLine(ctx, "Campo:", ctxData.fieldName, MARGIN + CONTENT_WIDTH / 2, y, CONTENT_WIDTH / 2 - 12);
  y -= 10;
  drawRect(ctx, MARGIN, y, CONTENT_WIDTH, infoBoxTop - y);

  // ---- Fechas ----
  y -= 14;
  const datesBoxTop = y;
  y -= 12;
  drawFieldLine(
    ctx,
    "Fecha de inicio:",
    formatDate(leaveRequest.startDate.toDate()),
    MARGIN + 6,
    y,
    CONTENT_WIDTH / 2 - 12
  );
  drawFieldLine(
    ctx,
    "Hora de inicio:",
    leaveRequest.startTime ?? "",
    MARGIN + CONTENT_WIDTH / 2,
    y,
    CONTENT_WIDTH / 2 - 12
  );
  y -= 14;
  drawFieldLine(
    ctx,
    "Fecha de finalización:",
    formatDate(leaveRequest.endDate.toDate()),
    MARGIN + 6,
    y,
    CONTENT_WIDTH / 2 - 12
  );
  drawFieldLine(
    ctx,
    "Hora de finalización:",
    leaveRequest.endTime ?? "",
    MARGIN + CONTENT_WIDTH / 2,
    y,
    CONTENT_WIDTH / 2 - 12
  );
  y -= 14;
  drawFieldLine(ctx, "No. días:", String(leaveRequest.numDays), MARGIN + 6, y, CONTENT_WIDTH / 2 - 12);
  drawFieldLine(
    ctx,
    "No. de horas:",
    leaveRequest.numHours != null ? String(leaveRequest.numHours) : "",
    MARGIN + CONTENT_WIDTH / 2,
    y,
    CONTENT_WIDTH / 2 - 12
  );
  y -= 10;
  drawRect(ctx, MARGIN, y, CONTENT_WIDTH, datesBoxTop - y);

  // ---- Remunerado ----
  y -= 16;
  drawRect(ctx, MARGIN, y - 2, CONTENT_WIDTH, 18);
  drawText(ctx, "REMUNERADO:", MARGIN + 6, y + 4, { size: 8, bold: true });
  drawCheckbox(ctx, MARGIN + 90, y + 2, leaveRequest.isPaid === true);
  drawText(ctx, "SI", MARGIN + 101, y + 4, { size: 8, bold: true });
  drawCheckbox(ctx, MARGIN + 130, y + 2, leaveRequest.isPaid === false);
  drawText(ctx, "NO", MARGIN + 141, y + 4, { size: 8, bold: true });
  y -= 2;

  // ---- Motivo de ausentismo ----
  drawSectionBar(ctx, "Motivo de ausentismo", MARGIN, y, CONTENT_WIDTH);
  y -= 14;
  drawText(
    ctx,
    "Marque con una (X) la casilla correspondiente al motivo de su ausentismo. Seleccione únicamente la opción que describa la causa principal de la ausencia.",
    MARGIN + 4,
    y - 8,
    { size: 6.5, color: MUTED, maxWidth: CONTENT_WIDTH - 8 }
  );
  y -= 18;
  const motivoTop = y;
  const colWidth = CONTENT_WIDTH / 3;
  const rowH = 10.5;
  const groupLabelHeight = 11;
  let minColY = y;

  LEAVE_TYPE_GROUPS.forEach((g, colIndex) => {
    const colX = MARGIN + colWidth * colIndex;
    drawText(ctx, LEAVE_ORIGIN_GROUP_LABEL[g.group].toUpperCase(), colX + 3, y - 8, {
      size: 7,
      bold: true,
    });
    let colY = y - groupLabelHeight;
    g.types.forEach((t) => {
      const selected = leaveRequest.type === t;
      drawCheckbox(ctx, colX + 3, colY - 7, selected, 6);
      drawText(ctx, LEAVE_TYPE_LABEL[t], colX + 13, colY - 7, { size: 7, maxWidth: colWidth - 16 });
      colY -= rowH;
      if (OTRA_LEAVE_TYPES.includes(t) && selected && leaveRequest.otherReasonText) {
        drawText(ctx, `→ ${leaveRequest.otherReasonText}`, colX + 13, colY - 5, {
          size: 6.5,
          color: MUTED,
          maxWidth: colWidth - 16,
        });
        colY -= rowH;
      }
    });
    if (colY < minColY) minColY = colY;
    if (colIndex > 0) {
      ctx.page.drawLine({
        start: { x: colX, y: motivoTop + 4 },
        end: { x: colX, y: minColY },
        thickness: 0.5,
        color: BLACK,
      });
    }
  });
  y = minColY - 4;
  drawRect(ctx, MARGIN, y, CONTENT_WIDTH, motivoTop - y + 4);

  // ---- Soporte origen médico ----
  const group = LEAVE_TYPE_GROUPS.find((g) => g.types.includes(leaveRequest.type))?.group;
  if (group === "MEDICO") {
    y -= 16;
    drawSectionBar(ctx, "Documento soporte origen médico", MARGIN, y, CONTENT_WIDTH);
    y -= 14;
    const boxTop = y;
    y -= 12;
    drawFieldLine(
      ctx,
      "Fecha de notificación:",
      formatDate(leaveRequest.medicalSupport?.notifiedAt.toDate() ?? null),
      MARGIN + 6,
      y,
      CONTENT_WIDTH / 2 - 12
    );
    y -= 14;
    drawCheckbox(ctx, MARGIN + 6, y - 6, leaveRequest.medicalSupport?.method === "CORREO_ELECTRONICO", 6);
    drawText(ctx, SUPPORT_METHOD_LABEL.CORREO_ELECTRONICO, MARGIN + 16, y - 6, { size: 8 });
    drawCheckbox(
      ctx,
      MARGIN + 150,
      y - 6,
      leaveRequest.medicalSupport?.method === "RADICADO_PRESENCIAL",
      6
    );
    drawText(ctx, SUPPORT_METHOD_LABEL.RADICADO_PRESENCIAL, MARGIN + 160, y - 6, { size: 8 });
    y -= 10;
    drawRect(ctx, MARGIN, y, CONTENT_WIDTH, boxTop - y);
  } else if (group === "NO_MEDICO" || group === "EXTRALEGAL") {
    y -= 16;
    drawSectionBar(ctx, "Soporte origen no médico - origen extralegal", MARGIN, y, CONTENT_WIDTH);
    y -= 14;
    const boxHeight = 34;
    drawRect(ctx, MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight);
    drawText(ctx, leaveRequest.nonMedicalSupportDescription ?? "", MARGIN + 6, y - 12, {
      size: 8,
      maxWidth: CONTENT_WIDTH - 12,
    });
    y -= boxHeight;
  }

  // ---- Firmas ----
  y -= 16;
  const halfWidth = CONTENT_WIDTH / 2;
  drawSectionBar(ctx, "Ausentismo solicitado por:", MARGIN, y, halfWidth);
  drawSectionBar(ctx, "Autorizado por:", MARGIN + halfWidth, y, halfWidth);
  y -= 14;

  // Área reservada para la firma: ancho casi completo de la columna, alto tope (evita firmas
  // desproporcionadamente altas); firmas "planas" y anchas (lo usual) llenan todo el ancho.
  const maxSigWidth = halfWidth - 20;
  const maxSigHeight = 44;
  const fieldsHeight = 4 + maxSigHeight + 16 + 12 * 3; // imagen + "Firma" + Nombre/Cédula/Cargo
  const certTextHeight = 26; // texto de certificación (hasta 2 líneas) dentro del mismo cuadro
  const signatureBlockHeight = fieldsHeight + certTextHeight;
  const sigBoxTop = y;
  drawRect(ctx, MARGIN, y - signatureBlockHeight, halfWidth, signatureBlockHeight);
  drawRect(ctx, MARGIN + halfWidth, y - signatureBlockHeight, halfWidth, signatureBlockHeight);

  function fitSignature(width: number, height: number): { w: number; h: number } {
    let w = maxSigWidth;
    let h = (w * height) / width;
    if (h > maxSigHeight) {
      h = maxSigHeight;
      w = (h * width) / height;
    }
    return { w, h };
  }

  if (leaveRequest.employeeSignature) {
    const image = await pdfDoc.embedPng(decodeDataUrl(leaveRequest.employeeSignature.dataUrl));
    const { w, h } = fitSignature(image.width, image.height);
    page.drawImage(image, { x: MARGIN + 10, y: sigBoxTop - 4 - h, width: w, height: h });
  }
  if (leaveRequest.supervisorSignature) {
    const image = await pdfDoc.embedPng(decodeDataUrl(leaveRequest.supervisorSignature.dataUrl));
    const { w, h } = fitSignature(image.width, image.height);
    page.drawImage(image, { x: MARGIN + halfWidth + 10, y: sigBoxTop - 4 - h, width: w, height: h });
  }

  // La fila "Firma"/Nombre/Cédula/Cargo arranca en un offset fijo (no depende del alto real de
  // cada firma), así ambas columnas quedan alineadas sin importar la proporción de cada imagen.
  let leftY = sigBoxTop - maxSigHeight - 16;
  let rightY = leftY;
  drawText(ctx, "Firma", MARGIN + 10, leftY, { size: 7, color: MUTED });
  drawText(ctx, "Firma", MARGIN + halfWidth + 10, rightY, { size: 7, color: MUTED });
  leftY -= 12;
  rightY -= 12;
  drawFieldLine(ctx, "Nombre:", leaveRequest.employeeName, MARGIN + 10, leftY, halfWidth - 20);
  drawFieldLine(
    ctx,
    "Nombre:",
    leaveRequest.supervisorSignature?.signedByName ?? "",
    MARGIN + halfWidth + 10,
    rightY,
    halfWidth - 20
  );
  leftY -= 12;
  rightY -= 12;
  drawFieldLine(ctx, "Cédula:", leaveRequest.employeeCedula, MARGIN + 10, leftY, halfWidth - 20);
  drawFieldLine(
    ctx,
    "Cédula:",
    leaveRequest.supervisorSignature?.signedByCedula ?? "",
    MARGIN + halfWidth + 10,
    rightY,
    halfWidth - 20
  );
  leftY -= 12;
  rightY -= 12;
  drawFieldLine(ctx, "Cargo:", leaveRequest.employeeSignature?.position ?? "", MARGIN + 10, leftY, halfWidth - 20);
  drawFieldLine(
    ctx,
    "Cargo:",
    leaveRequest.supervisorSignature?.position ?? "",
    MARGIN + halfWidth + 10,
    rightY,
    halfWidth - 20
  );

  // Línea divisoria + texto de certificación, dentro del mismo cuadro, debajo de "Cargo".
  const certDividerY = sigBoxTop - fieldsHeight;
  ctx.page.drawLine({
    start: { x: MARGIN, y: certDividerY },
    end: { x: MARGIN + CONTENT_WIDTH, y: certDividerY },
    thickness: 0.5,
    color: BLACK,
  });
  drawWrappedText(
    ctx,
    "Con mi firma certifico que la información suministrada en el presente formato es veraz y que los documentos soporte adjuntos corresponden al motivo del ausentismo reportado.",
    MARGIN + 6,
    certDividerY - 9,
    { size: 6.5, bold: true, maxWidth: CONTENT_WIDTH - 12 }
  );

  y = sigBoxTop - signatureBlockHeight;

  if (leaveRequest.rejectionReason) {
    y -= 22;
    drawText(ctx, `Motivo de rechazo previo: ${leaveRequest.rejectionReason}`, MARGIN, y, {
      size: 7,
      color: MUTED,
      maxWidth: CONTENT_WIDTH,
    });
  }

  drawText(
    ctx,
    `Generado automáticamente - Plataforma de Gestión de Ausentismos - v${TEMPLATE_VERSION}`,
    MARGIN,
    16,
    { size: 6, color: MUTED }
  );

  return pdfDoc.save();
}
