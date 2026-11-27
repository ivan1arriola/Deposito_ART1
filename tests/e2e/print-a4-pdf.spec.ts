import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { buildFirmasInstitucionalesLineas } from "../../src/lib/firma-lineas";
import { buildListadoEquiposUnidadModel } from "../../src/lib/listado-equipos-unidad-data";

function buildMockDataset() {
  const categorias = [
    { tipoEquipoId: 1, clave: "GENERAL", nombre: "General", orden: 1 },
    { tipoEquipoId: 2, clave: "COMBATE", nombre: "Equipo de Combate", orden: 2 },
    { tipoEquipoId: 3, clave: "OPTICA", nombre: "Óptica y Comunicaciones", orden: 3 },
  ];

  const equipos = Array.from({ length: 48 }, (_, idx) => {
    const num = idx + 1;
    const cat = categorias[idx % categorias.length];
    const longPrefix =
      num % 9 === 0
        ? "Mochila táctica de asalto multicompartimiento reforzada con sistema modular "
        : "Equipo táctico reglamentario modelo ";
    return {
      equipoId: BigInt(num),
      nombre: `${longPrefix}#${String(num).padStart(2, "0")}`,
      tipoEquipoId: cat.tipoEquipoId,
      tipoEquipo: cat,
      ordenPdf: 100 - num,
      existenciaSie: num % 5 === 0 ? 0 : 25 + num,
    };
  });

  const personalByItem = new Map<string, number>();
  const asignacionByItem = new Map<string, number>();
  const prestamoByItem = new Map<string, number>();
  const unidadByItem = new Map<string, number>();

  for (let i = 0; i < equipos.length; i += 1) {
    const id = equipos[i].equipoId.toString();
    if (i % 7 === 0) {
      personalByItem.set(id, 0);
      asignacionByItem.set(id, 0);
      prestamoByItem.set(id, 0);
      unidadByItem.set(id, 0);
    } else {
      const subalternos = (i % 6) + 1;
      const recintos = i % 4 === 0 ? 0 : (i % 5) + 2;
      const prestamos = i % 3;
      const deposito = 10 + (i % 8);
      personalByItem.set(id, subalternos);
      asignacionByItem.set(id, recintos);
      prestamoByItem.set(id, prestamos);
      unidadByItem.set(id, subalternos + recintos + prestamos + deposito);
    }
  }

  return {
    equipos,
    stockSummaryMaps: {
      personalByItem,
      asignacionByItem,
      prestamoByItem,
      unidadByItem,
    },
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderListadoHtml(isAlphaSort: boolean) {
  const { equipos, stockSummaryMaps } = buildMockDataset();
  const model = buildListadoEquiposUnidadModel(equipos, stockSummaryMaps, isAlphaSort);
  const firmaLineas = buildFirmasInstitucionalesLineas({
    encargadoTexto: "Encargado del Depósito General",
    encargadoRango: "Sgto. 1ro.",
    encargadoNombre: "Juan Pérez",
    oficialTexto: "Oficial de Depósito",
    oficialRango: "Tte. 1ro.",
    oficialNombre: "Carlos Silva",
  });

  const sectionsHtml = model.resumenPorTipo
    .map(
      (section) => `
      <section>
        <p class="subtitle">${escapeHtml(section.title)} · ${section.equipos.length} equipos</p>
        <section class="table-wrap">
          <table>
            <colgroup>
              <col class="col-equipo" />
              <col class="col-numeric" />
              <col class="col-numeric" />
              <col class="col-numeric" />
              <col class="col-numeric" />
              <col class="col-numeric" />
              <col class="col-numeric" />
            </colgroup>
            <thead>
              <tr>
                <th>Equipo</th>
                <th class="numeric">Subalternos</th>
                <th class="numeric">Recintos</th>
                <th class="numeric">Préstamo</th>
                <th class="numeric">Depósito</th>
                <th class="numeric">Unidad</th>
                <th class="numeric">Existencia SIE</th>
              </tr>
            </thead>
            <tbody>
              ${section.equipos
                .map(
                  (equipo) => `
                <tr>
                  <td>${escapeHtml(equipo.nombre)}</td>
                  <td class="numeric">${equipo.stockSubalternos}</td>
                  <td class="numeric">${equipo.stockAsignacion}</td>
                  <td class="numeric">${equipo.stockPrestamo}</td>
                  <td class="numeric">${equipo.stockDeposito}</td>
                  <td class="numeric">${equipo.stockUnidad}</td>
                  <td class="numeric">${equipo.existenciaSie}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </section>
      </section>`
    )
    .join("");

  const firmasHtml = firmaLineas
    .map(
      (line) =>
        `<p class="firma-line${line.isBold ? " firma-strong" : ""}">${escapeHtml(line.text)}</p>`
    )
    .join("");

  return {
    model,
    html: `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Listado de Equipos de la Unidad</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: "Times New Roman", serif; }
    .sheet { width: 100%; max-width: 190mm; margin: 0 auto; padding: 6mm; }
    .institutional-print-header { margin: 0 0 2.8mm; padding: 0 0 1.8mm; border-bottom: 1px solid #000; display: grid; gap: 0.55mm; }
    .institutional-print-header-left { text-align: left; font-size: 8.4pt; font-weight: 700; }
    .institutional-print-header-center { text-align: center; font-size: 17pt; font-weight: 700; }
    .institutional-print-header-right { text-align: right; font-size: 8.4pt; font-weight: 700; }
    .title { margin: 0; font-size: 18pt; font-weight: 700; }
    .subtitle { margin: 2mm 0 1mm; font-size: 10pt; font-weight: 600; }
    .meta { margin: 2mm 0 0; font-size: 9pt; }
    .totals { margin: 3.2mm 0 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 2mm; }
    .totals-equipo { border: 1px solid #000; background: #ececec; padding: 1.8mm 2mm; font-size: 9pt; }
    .totals-label { font-weight: 700; text-transform: uppercase; font-size: 8pt; margin: 0; }
    .totals-value { margin: 0.8mm 0 0; font-size: 12pt; font-weight: 700; }
    .table-wrap { margin-top: 2.5mm; border: 1px solid #000; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    col.col-equipo { width: 34%; }
    col.col-numeric { width: 11%; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #000; padding: 1.6mm 1.2mm; vertical-align: middle; word-break: break-word; }
    thead th { background: #e7e7e7; font-size: 8.5pt; font-weight: 700; text-align: left; }
    tbody td { font-size: 8.5pt; }
    .numeric { text-align: right; font-weight: 700; }
    .firma-section { margin-top: 8mm; display: grid; gap: 0; break-inside: avoid; page-break-inside: avoid; }
    .firma-line { font-size: 8pt; line-height: 1.5; margin: 0; }
    .firma-strong { font-weight: 700; }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="institutional-print-header">
      <div class="institutional-print-header-left">Grupo "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1</div>
      <div class="institutional-print-header-right">Montevideo, 27 de noviembre de 2026</div>
      <div class="institutional-print-header-center">Depósito General</div>
    </header>
    <h1 class="title">Listado de Equipos de la Unidad</h1>
    <p class="subtitle">Totales por equipo (subalternos + recintos + préstamo + depósito) · ${isAlphaSort ? "Orden alfabético" : "Orden asignado"}</p>
    <p class="meta">Equipos listados: ${model.resumen.length}</p>
    <section class="totals">
      <article class="totals-equipo"><p class="totals-label">Total subalternos</p><p class="totals-value">${model.totals.totalSubalternos}</p></article>
      <article class="totals-equipo"><p class="totals-label">Total recintos</p><p class="totals-value">${model.totals.totalAsignacion}</p></article>
      <article class="totals-equipo"><p class="totals-label">Total préstamo</p><p class="totals-value">${model.totals.totalPrestamo}</p></article>
      <article class="totals-equipo"><p class="totals-label">Total depósito</p><p class="totals-value">${model.totals.totalDeposito}</p></article>
      <article class="totals-equipo"><p class="totals-label">Total unidad</p><p class="totals-value">${model.totals.totalUnidad}</p></article>
    </section>
    ${sectionsHtml}
    <section class="firma-section">${firmasHtml}</section>
  </main>
</body>
</html>`,
  };
}

test.describe("Impresión A4 multipágina de stock unidad (#19, #28)", () => {
  for (const mode of [
    { label: "orden", isAlpha: false },
    { label: "alpha", isAlpha: true },
  ]) {
    test(`genera e inspecciona PDF A4 multipágina en modo ${mode.label} sin desbordes y conciliado`, async ({
      page,
    }) => {
      const { model, html } = renderListadoHtml(mode.isAlpha);

      expect(
        model.totals.totalSubalternos +
          model.totals.totalAsignacion +
          model.totals.totalPrestamo +
          model.totals.totalDeposito
      ).toBe(model.totals.totalUnidad);

      await page.setViewportSize({ width: 794, height: 1123 });
      await page.setContent(html, { waitUntil: "load" });
      await page.emulateMedia({ media: "print" });

      const layoutMetrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        headerCells: Array.from(document.querySelectorAll("thead th")).map((th) =>
          th.textContent?.trim()
        ),
        signatureCount: document.querySelectorAll(".firma-line").length,
      }));

      expect(layoutMetrics.scrollWidth).toBeLessThanOrEqual(layoutMetrics.clientWidth);
      expect(layoutMetrics.headerCells.slice(0, 7)).toEqual([
        "Equipo",
        "Subalternos",
        "Recintos",
        "Préstamo",
        "Depósito",
        "Unidad",
        "Existencia SIE",
      ]);
      expect(layoutMetrics.signatureCount).toBeGreaterThan(0);

      fs.mkdirSync("test-results", { recursive: true });
      const pdfPath = path.join("test-results", `listado-equipos-unidad-${mode.label}.pdf`);
      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
      });

      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(2);
      const firstPageSize = pdfDoc.getPage(0).getSize();
      expect(firstPageSize.width).toBeGreaterThanOrEqual(594);
      expect(firstPageSize.width).toBeLessThanOrEqual(597);
      expect(firstPageSize.height).toBeGreaterThanOrEqual(840);
      expect(firstPageSize.height).toBeLessThanOrEqual(844);
    });
  }
});
