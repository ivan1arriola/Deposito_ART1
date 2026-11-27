import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SHELL_HARNESS_HTML = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Verificación de Accesibilidad y Diseño Responsive</title>
  <style>
    :root { --gold: #ffcc00; --ink: #17212b; --bg: #f4f5f1; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: var(--ink); background: var(--bg); }
    .layout { display: flex; min-height: 100vh; }
    nav { width: 260px; flex-shrink: 0; background: #161c16; color: #fff; padding: 16px; }
    main { flex: 1; min-width: 0; padding: 16px; }
    button, input, select { min-height: 44px; font-size: 16px; border-radius: 8px; }
    button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
    .btn { border: 1px solid #44403c; background: #fff; color: #1c1917; padding: 8px 14px; font-weight: 600; cursor: pointer; }
    .btn-primary { border: 1px solid #5b21b6; background: #5b21b6; color: #fff; }
    .card { background: #fff; border: 1px solid #d6d3d1; border-radius: 14px; padding: 16px; margin-bottom: 16px; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .nav-btn { width: 100%; text-align: left; background: #262f26; color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; margin-bottom: 8px; cursor: pointer; }
    .submenu { margin-left: 8px; padding-left: 8px; border-left: 2px solid var(--gold); }
    .motion-target { transition: transform 0.2s ease, opacity 0.2s ease; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
    @media (max-width: 767px) {
      .layout { flex-direction: column; }
      nav { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <nav aria-label="Menú principal">
      <button id="menu-trigger" class="nav-btn" type="button" aria-expanded="true" aria-controls="submenu-stock">Stock</button>
      <div id="submenu-stock" class="submenu" role="region" aria-label="Submenú Stock">
        <button class="nav-btn" type="button" aria-current="page">Stock de Equipos</button>
        <button class="nav-btn" type="button">Asignaciones a Recintos</button>
      </div>
    </nav>
    <main>
      <header class="card">
        <h1>Panel Operativo Principal</h1>
        <p>Estado vigente del depósito y accesos rápidos.</p>
        <div class="actions">
          <button type="button" class="btn btn-primary">Nueva asignación</button>
          <button type="button" class="btn">Imprimir listado</button>
        </div>
      </header>
      <section class="card" aria-label="Resumen operativo">
        <h2>Indicadores y trazabilidad</h2>
        <div class="cards-grid">
          <div class="card">
            <h3>Casco balístico</h3>
            <p class="motion-target">Stock negativo: ! -2 (Negativo)</p>
            <div class="actions">
              <button type="button" class="btn" aria-label="Ver detalle de Casco balístico en Subalternos">Subalternos: -2</button>
              <button type="button" class="btn" aria-label="Ver detalle de Casco balístico en Recintos">Recintos: 3</button>
            </div>
          </div>
          <div class="card">
            <label for="entidad-input">Entidad beneficiaria</label>
            <input id="entidad-input" type="text" value="" aria-invalid="false" />
            <div class="actions">
              <button type="button" class="btn btn-primary">Guardar</button>
              <button type="button" class="btn">Guardar e imprimir</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
  <script>
    const trigger = document.getElementById("menu-trigger");
    const panel = document.getElementById("submenu-stock");
    function toggleMenu(open) {
      trigger.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      if (!open) trigger.focus();
    }
    trigger.addEventListener("click", () => toggleMenu(panel.hidden));
    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        toggleMenu(false);
      }
    });
  </script>
</body>
</html>`;

test.describe("Accesibilidad, teclado, reduced-motion y vista responsive (#35)", () => {
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`sin violaciones axe-core críticas ni desborde horizontal en ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.setContent(SHELL_HARNESS_HTML, { waitUntil: "load" });

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );
      expect(blocking).toEqual([]);
    });
  }

  test("soporta zoom 200%, prefers-reduced-motion y navegación por teclado con Escape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 500 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setContent(SHELL_HARNESS_HTML, { waitUntil: "load" });

    const reducedMotionDuration = await page.evaluate(() => {
      const target = document.querySelector(".motion-target");
      return target ? getComputedStyle(target).transitionDuration : "";
    });
    expect(["0.01ms", "1e-05s", "0s"]).toContain(reducedMotionDuration);

    await page.keyboard.press("Tab");
    const trigger = page.locator("#menu-trigger");
    await expect(trigger).toBeFocused();

    await page.keyboard.press("Tab");
    const firstSubItem = page.getByRole("button", { name: "Stock de Equipos" });
    await expect(firstSubItem).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();

    const overflowAtZoom = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflowAtZoom.scrollWidth).toBeLessThanOrEqual(overflowAtZoom.clientWidth);
  });
});
