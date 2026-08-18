import type { Post } from "./types";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function loadImage(dataUri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUri;
  });
}

const PAGE_MARGIN = 40;
const LINE_HEIGHT = 13;
const CELL_PADDING = 6;
const HEADER_HEIGHT = 22;
const IMG_MAX_WIDTH = 70;
const IMG_MAX_HEIGHT = 55;
const IMG_GAP = 4;

const COL_WIDTHS = {
  data: 70,
  descricao: 300,
};

export async function exportPostsToPdf(cliente: string, rotuloMes: string, posts: Post[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = pageWidth - PAGE_MARGIN * 2;

  const colX = {
    data: PAGE_MARGIN,
    descricao: PAGE_MARGIN + COL_WIDTHS.data,
    referencia: PAGE_MARGIN + COL_WIDTHS.data + COL_WIDTHS.descricao,
  };
  const colWidths = {
    data: COL_WIDTHS.data,
    descricao: COL_WIDTHS.descricao,
    referencia: tableWidth - COL_WIDTHS.data - COL_WIDTHS.descricao,
  };

  let y = PAGE_MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Cronograma de Conteúdo, ${cliente}, ${rotuloMes}`, PAGE_MARGIN, y);
  y += 26;

  const ordenados = [...posts].sort((a, b) => a.data.localeCompare(b.data));

  if (ordenados.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Nenhum post cadastrado para este cliente.", PAGE_MARGIN, y);
    doc.save(`cronograma-${slugify(cliente)}-${slugify(rotuloMes)}.pdf`);
    return;
  }

  function drawHeaderRow() {
    doc.setFillColor(242, 242, 245);
    doc.rect(PAGE_MARGIN, y, tableWidth, HEADER_HEIGHT, "F");
    doc.setDrawColor(200, 200, 200);
    doc.rect(colX.data, y, colWidths.data, HEADER_HEIGHT);
    doc.rect(colX.descricao, y, colWidths.descricao, HEADER_HEIGHT);
    doc.rect(colX.referencia, y, colWidths.referencia, HEADER_HEIGHT);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Data", colX.data + CELL_PADDING, y + HEADER_HEIGHT / 2 + 3);
    doc.text("Descrição", colX.descricao + CELL_PADDING, y + HEADER_HEIGHT / 2 + 3);
    doc.text("Referência", colX.referencia + CELL_PADDING, y + HEADER_HEIGHT / 2 + 3);

    y += HEADER_HEIGHT;
  }

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
      drawHeaderRow();
    }
  }

  drawHeaderRow();

  for (const post of ordenados) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const descricaoLines = doc.splitTextToSize(post.descricao, colWidths.descricao - CELL_PADDING * 2);

    let referenciaLines: string[] = [];
    const imagensCarregadas: { dataUri: string; width: number; height: number }[] = [];

    if (post.referenciaTipo === "link" && post.referenciaValor) {
      referenciaLines = doc.splitTextToSize(post.referenciaValor, colWidths.referencia - CELL_PADDING * 2);
    } else if (post.referenciaTipo === "imagem" && post.referenciaImagens.length > 0) {
      for (const dataUri of post.referenciaImagens) {
        try {
          const { width, height } = await loadImage(dataUri);
          const scale = Math.min(IMG_MAX_WIDTH / width, IMG_MAX_HEIGHT / height, 1);
          imagensCarregadas.push({ dataUri, width: width * scale, height: height * scale });
        } catch {
          // ignora imagens que falharem ao carregar
        }
      }
      if (imagensCarregadas.length === 0) referenciaLines = ["Sem referência."];
    } else {
      referenciaLines = ["Sem referência."];
    }

    const imagensPorLinha = Math.max(1, Math.floor((colWidths.referencia - CELL_PADDING * 2 + IMG_GAP) / (IMG_MAX_WIDTH + IMG_GAP)));
    const linhasDeImagens = Math.ceil(imagensCarregadas.length / imagensPorLinha);

    const textLineCount = Math.max(descricaoLines.length, referenciaLines.length, 1);
    const textBlockHeight = textLineCount * LINE_HEIGHT + CELL_PADDING * 2;
    const imgBlockHeight =
      imagensCarregadas.length > 0
        ? linhasDeImagens * IMG_MAX_HEIGHT + (linhasDeImagens - 1) * IMG_GAP + CELL_PADDING * 2
        : 0;
    const rowHeight = Math.max(textBlockHeight, imgBlockHeight, HEADER_HEIGHT);

    ensureSpace(rowHeight);

    const rowTop = y;

    doc.setDrawColor(220, 220, 220);
    doc.rect(colX.data, rowTop, colWidths.data, rowHeight);
    doc.rect(colX.descricao, rowTop, colWidths.descricao, rowHeight);
    doc.rect(colX.referencia, rowTop, colWidths.referencia, rowHeight);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(formatDate(post.data), colX.data + CELL_PADDING, rowTop + CELL_PADDING + LINE_HEIGHT - 3);

    descricaoLines.forEach((line: string, i: number) => {
      doc.text(line, colX.descricao + CELL_PADDING, rowTop + CELL_PADDING + LINE_HEIGHT * (i + 1) - 3);
    });

    if (post.referenciaTipo === "link" && post.referenciaValor) {
      doc.setTextColor(79, 70, 229);
      referenciaLines.forEach((line: string, i: number) => {
        const lineY = rowTop + CELL_PADDING + LINE_HEIGHT * (i + 1) - 3;
        doc.textWithLink(line, colX.referencia + CELL_PADDING, lineY, { url: post.referenciaValor });
      });
      doc.setTextColor(0, 0, 0);
    } else if (imagensCarregadas.length > 0) {
      imagensCarregadas.forEach((img, index) => {
        const col = index % imagensPorLinha;
        const row = Math.floor(index / imagensPorLinha);
        const imgX = colX.referencia + CELL_PADDING + col * (IMG_MAX_WIDTH + IMG_GAP);
        const imgY = rowTop + CELL_PADDING + row * (IMG_MAX_HEIGHT + IMG_GAP);
        const format = img.dataUri.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(img.dataUri, format, imgX, imgY, img.width, img.height);
      });
    } else {
      referenciaLines.forEach((line: string, i: number) => {
        doc.text(line, colX.referencia + CELL_PADDING, rowTop + CELL_PADDING + LINE_HEIGHT * (i + 1) - 3);
      });
    }

    y = rowTop + rowHeight;
  }

  doc.save(`cronograma-${slugify(cliente)}-${slugify(rotuloMes)}.pdf`);
}
