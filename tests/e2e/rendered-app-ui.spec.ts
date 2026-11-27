import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

type MockRole = "ADMIN" | "LECTURA";

function buildPersonalList(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const num = index + 1;
    const padded = String(num).padStart(2, "0");
    const ci = String(41000000 + num);
    const isFirst = num === 1;
    return {
      ci,
      apellido1: isFirst ? "Álvarez" : `Apellido${padded}`,
      apellido2: isFirst ? "Pérez" : "Silva",
      nombre1: isFirst ? "José" : `Soldado${padded}`,
      nombre2: isFirst ? "María" : null,
      telefonoContacto: null,
      esReingreso: false,
      fechaIngreso: "2022-03-01T00:00:00.000Z",
      fechaIngresoOriginal: null,
      rangoId: 10,
      bateriaId: num % 2 === 0 ? 2 : 1,
      tallas: [],
      bateria: {
        bateriaId: num % 2 === 0 ? 2 : 1,
        nombre: num % 2 === 0 ? "Batería B" : "Batería A",
        orden: num % 2 === 0 ? 2 : 1,
      },
      rango: {
        rangoId: 10,
        abreviacion: "Sdo. 1ra.",
        nombreCompleto: "Soldado de Primera",
        orden: 10,
      },
    };
  });
}

async function installSyntheticAppMocks(page: Page, options?: { role?: MockRole }) {
  const role: MockRole = options?.role ?? "ADMIN";
  const personalList = buildPersonalList(27);
  const tareas: Array<{
    tareaId: string;
    usuarioId: string;
    titulo: string;
    nota: string;
    fechaLimite: string | null;
    prioridad: "NORMAL" | "URGENTE";
    completada: boolean;
    createdAt: string;
    updatedAt: string;
  }> = [
    {
      tareaId: "t-1",
      usuarioId: "u-e2e-1",
      titulo: "Revisar botas Batería A",
      nota: "Control semanal de tallas",
      fechaLimite: "2026-12-01",
      prioridad: "NORMAL",
      completada: false,
      createdAt: "2026-11-20T10:00:00.000Z",
      updatedAt: "2026-11-20T10:00:00.000Z",
    },
  ];

  const user = {
    usuarioId: "u-e2e-1",
    username: role === "ADMIN" ? "admin_e2e" : "lectura_e2e",
    nombre: role === "ADMIN" ? "Ana" : "Luis",
    apellido: role === "ADMIN" ? "García" : "Acosta",
    rol: role,
    accountType: "SISTEMA" as const,
    mailReferencia: "deposito.e2e@art1.test",
    rango: {
      rangoId: 1,
      abreviacion: "Cap.",
      nombreCompleto: "Capitán",
      orden: 1,
    },
  };

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(body),
    });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === "/api/auth/session") {
      return json(route, {
        user: {
          name: user.username,
          email: user.mailReferencia,
          rol: user.rol,
          accountType: user.accountType,
        },
        expires: "2099-01-01T00:00:00.000Z",
      });
    }
    if (pathname === "/api/auth/me") return json(route, { user });
    if (pathname === "/api/db-status") return json(route, { ok: true });

    if (pathname === "/api/rangos") {
      const tipo = url.searchParams.get("tipo");
      if (tipo === "OFICIAL") {
        return json(route, [
          { rangoId: 1, abreviacion: "Cap.", nombreCompleto: "Capitán", orden: 1 },
        ]);
      }
      if (tipo === "SUBOFICIAL") {
        return json(route, [
          { rangoId: 2, abreviacion: "Sgto.", nombreCompleto: "Sargento", orden: 2 },
        ]);
      }
      return json(route, [
        { rangoId: 10, abreviacion: "Sdo. 1ra.", nombreCompleto: "Soldado de Primera", orden: 10 },
      ]);
    }

    if (pathname === "/api/baterias") {
      return json(route, [
        { bateriaId: 1, nombre: "Batería A", orden: 1 },
        { bateriaId: 2, nombre: "Batería B", orden: 2 },
      ]);
    }

    if (pathname === "/api/articulos") return json(route, []);
    if (pathname === "/api/equipos/tipos") {
      return json(route, [{ tipoEquipoId: 1, nombre: "Uniforme", orden: 1, activo: true }]);
    }
    if (pathname === "/api/equipos") {
      return json(route, [
        {
          equipoId: "eq-1",
          nombre: "Camisa Pixelada",
          tipo: "UNIFORME",
          tipoEquipoId: 1,
          activo: true,
          ordenPdf: 1,
          existenciaSie: 30,
        },
        {
          equipoId: "eq-2",
          nombre: "Botas Tácticas",
          tipo: "UNIFORME",
          tipoEquipoId: 1,
          activo: true,
          ordenPdf: 2,
          existenciaSie: 25,
        },
      ]);
    }

    if (pathname === "/api/personal") return json(route, personalList);
    if (pathname === "/api/oficiales-suboficiales") {
      return json(route, [
        {
          ci: "31234567",
          apellido1: "Méndez",
          apellido2: null,
          nombre1: "Carlos",
          nombre2: null,
          telefonoContacto: null,
          rangoId: 1,
          nombre: "Carlos",
          apellido: "Méndez",
          tipo: "OFICIAL",
          gradoMandoId: 1,
          gradoMando: { rangoId: 1, abreviacion: "Cap.", nombreCompleto: "Capitán", orden: 1 },
          tallas: [],
        },
      ]);
    }

    if (pathname === "/api/registros") return json(route, { total: 4 });
    if (pathname === "/api/usuarios") {
      return json(route, [
        {
          ...user,
          rangoId: 1,
          grado: "Cap.",
          mailVerificadaAt: null,
          activo: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          personalCi: null,
        },
      ]);
    }
    if (pathname === "/api/auditoria") return json(route, []);
    if (pathname === "/api/firma-config") {
      return json(route, {
        encargadoRango: "Sgto.",
        encargadoNombre: "Encargado Depósito",
        oficialRango: "Cap.",
        oficialNombre: "Oficial S-4",
        updatedAt: null,
      });
    }

    if (pathname === "/api/stock") {
      return json(route, {
        generatedAt: "2026-11-27T12:00:00.000Z",
        resumen: [],
        historial: [],
        prestamos: [],
      });
    }

    if (pathname === "/api/movimientos/recintos") {
      return json(route, { generatedAt: "2026-11-27T12:00:00.000Z", total: 0, rows: [] });
    }

    if (pathname === "/api/hoja-matrix") {
      return json(route, {
        generatedAt: "2026-11-27T12:00:00.000Z",
        equipos: [
          { equipoId: "eq-1", nombre: "Camisa Pixelada" },
          { equipoId: "eq-2", nombre: "Botas Tácticas" },
        ],
        rows: personalList.slice(0, 4).map((p, idx) => ({
          ci: p.ci,
          apellido1: p.apellido1,
          apellido2: p.apellido2,
          nombre1: p.nombre1,
          nombre2: p.nombre2,
          bateria: p.bateria.nombre,
          bateriaOrden: p.bateria.orden,
          grado: p.rango.nombreCompleto,
          gradoOrden: p.rango.orden,
          gradoAbreviacion: p.rango.abreviacion,
          totales: [idx + 1, 1],
          totalGeneral: idx + 2,
        })),
      });
    }

    if (pathname === "/api/tareas") {
      if (method === "POST") {
        const payload = request.postDataJSON() as {
          titulo?: string;
          nota?: string;
          fechaLimite?: string | null;
          prioridad?: "NORMAL" | "URGENTE";
        };
        const created = {
          tareaId: `t-${Date.now()}`,
          usuarioId: "u-e2e-1",
          titulo: payload.titulo ?? "Nueva tarea",
          nota: payload.nota ?? "",
          fechaLimite: payload.fechaLimite ?? null,
          prioridad: payload.prioridad ?? "NORMAL",
          completada: false,
          createdAt: "2026-11-27T12:05:00.000Z",
          updatedAt: "2026-11-27T12:05:00.000Z",
        };
        tareas.push(created);
        return json(route, created, 201);
      }
      return json(route, tareas);
    }

    if (pathname === "/api/tareas/config") {
      return json(route, { mostrarMuneco: true });
    }

    return json(route, {});
  });
}

test.describe("Aplicación renderizada sin MUI ni Emotion", () => {
  test.use({ serviceWorkers: "block" });

  test("HTML servido y DOM carecen de data-emotion y clases .Mui*", async ({ page }) => {
    await installSyntheticAppMocks(page, { role: "ADMIN" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/#personal");
    await expect(page.getByText("27 resultados")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Personal subalterno" })).toBeVisible();

    const rawHtml = await page.content();
    expect(rawHtml).not.toContain("data-emotion");
    expect(rawHtml).not.toMatch(/class="[^"]*\bMui/);

    const domMuiAudit = await page.evaluate(() => {
      const emotionStyles = document.querySelectorAll("style[data-emotion]").length;
      const muiClasses = Array.from(document.querySelectorAll("*")).filter((el) =>
        typeof el.className === "string" ? /\bMui[A-Z]/.test(el.className) : false
      ).length;
      return { emotionStyles, muiClasses };
    });
    expect(domMuiAudit).toEqual({ emotionStyles: 0, muiClasses: 0 });
  });

  test("Personal ADMIN: avisos, 5 operaciones, paginación y foco menú -> confirmar -> cancelar", async ({
    page,
  }) => {
    await installSyntheticAppMocks(page, { role: "ADMIN" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/#personal");
    await expect(page.getByText("27 resultados")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Personal subalterno" })).toBeVisible();

    // Avisos visibles para ADMIN (notificaciones e instalación PWA)
    await expect(page.getByText("Notificaciones admin")).toBeVisible();
    await expect(page.getByText("Instalar la aplicación")).toBeVisible({ timeout: 5000 });

    // Cinco operaciones visibles en Personal
    const operationsGroup = page.getByRole("group", { name: "Operaciones de personal" });
    await expect(operationsGroup.getByRole("button")).toHaveCount(5);

    // Filtros de subalternos
    const apellidoFilter = page.getByPlaceholder("Buscar apellido");
    await apellidoFilter.fill("Álvarez");
    await expect(page.getByText("1 resultado de 27")).toBeVisible();
    await page.getByRole("button", { name: "Limpiar" }).click();
    await expect(page.getByText("27 resultados")).toBeVisible();

    // Paginación en español
    const pagination = page.getByRole("navigation", { name: "Páginas de personal subalterno" });
    await expect(page.getByText("Mostrando 1 a 25 de 27 subalternos")).toBeVisible();
    await expect(pagination.getByRole("button", { name: "Página 1, actual" })).toBeVisible();
    await pagination.getByRole("button", { name: "Página siguiente" }).click();
    await expect(page.getByText("Mostrando 26 a 27 de 27 subalternos")).toBeVisible();
    await expect(pagination.getByRole("button", { name: "Página 2, actual" })).toBeVisible();
    await pagination.getByRole("button", { name: "Página anterior" }).click();
    await expect(page.getByText("Mostrando 1 a 25 de 27 subalternos")).toBeVisible();

    // Menú de fila: navegación por teclado, confirmación destructiva y retorno de foco al disparador
    const moreBtn = page.getByRole("button", {
      name: "Más acciones para Álvarez Pérez, José María",
    });
    await moreBtn.focus();
    await expect(moreBtn).toBeFocused();
    await page.keyboard.press("Enter");

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await page.keyboard.press("End");
    const borrarItem = menu.getByRole("menuitem", { name: "Borrar" });
    await expect(borrarItem).toBeFocused();
    await page.keyboard.press("Enter");

    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(alertDialog).toBeHidden();
    await expect(moreBtn).toBeFocused();
  });

  test("Personal LECTURA: respeta permisos de solo lectura y oculta acciones de escritura", async ({
    page,
  }) => {
    await installSyntheticAppMocks(page, { role: "LECTURA" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/#personal");
    await expect(page.getByText("27 resultados")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Personal subalterno" })).toBeVisible();
    await expect(page.getByText("Notificaciones admin")).toHaveCount(0);

    const operationsGroup = page.getByRole("group", { name: "Operaciones de personal" });
    await expect(operationsGroup.getByRole("button")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Registrar subalterno" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Registrar entrega masiva" })).toHaveCount(0);

    const moreBtn = page.getByRole("button", {
      name: "Más acciones para Álvarez Pérez, José María",
    });
    await moreBtn.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Ver movimientos" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Borrar" })).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("Búsqueda global: foco inicial, normalización sin tildes y retorno de foco con Escape", async ({
    page,
  }) => {
    await installSyntheticAppMocks(page, { role: "ADMIN" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/#personal");
    await expect(page.getByText("27 resultados")).toBeVisible();

    const searchBtn = page.getByRole("button", { name: "Buscar personal" });
    await searchBtn.click();

    const searchInput = page.getByRole("textbox", { name: "Buscar por cédula o nombre" });
    await expect(searchInput).toBeFocused();

    await searchInput.fill("alvarez");
    await expect(page.getByRole("button", { name: /José Álvarez/i })).toBeVisible();

    await searchInput.fill("41000001");
    await expect(page.getByRole("button", { name: /José Álvarez/i })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(searchInput).toBeHidden();
    await expect(searchBtn).toBeFocused();
  });

  test("Navegación: popover contraído con Escape, umbral 900 px y Hoja matriz", async ({
    page,
  }) => {
    await installSyntheticAppMocks(page, { role: "ADMIN" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/#personal");
    await expect(page.getByText("27 resultados")).toBeVisible();

    // Colapsar menú y verificar Popover fuera del contenedor
    await page.getByRole("button", { name: "Colapsar menú" }).click();
    const collapsedPersonalTrigger = page
      .locator('nav[data-home-sidebar="true"]')
      .getByRole("button", { name: "Personal", exact: true });
    await expect(collapsedPersonalTrigger).toBeVisible();
    await collapsedPersonalTrigger.focus();
    await page.keyboard.press("Enter");

    const popoverRegion = page.getByRole("region", { name: "Personal", exact: true });
    await expect(popoverRegion).toBeVisible();
    const popoverBox = await popoverRegion.boundingBox();
    expect(popoverBox).not.toBeNull();
    expect(popoverBox!.width).toBeGreaterThan(150);

    // Escape cierra popover y devuelve el foco al botón disparador
    await page.keyboard.press("Escape");
    await expect(popoverRegion).toBeHidden();
    await expect(collapsedPersonalTrigger).toBeFocused();

    // Abrir Hoja Matriz desde popover
    await page.keyboard.press("Enter");
    await popoverRegion.getByRole("button", { name: "Hoja matriz" }).click();
    await expect(
      page.getByRole("heading", { name: "Hoja Matriz General de Entrega" })
    ).toBeVisible();
    await expect(page.getByText("Unidad Completa")).toBeVisible();

    // Umbral de 900 px vs 899 px
    const sidebar = page.locator('nav[data-home-sidebar="true"]');
    await page.setViewportSize({ width: 900, height: 800 });
    await expect(sidebar).toBeVisible();

    await page.setViewportSize({ width: 899, height: 800 });
    await expect(sidebar).toBeHidden();

    const mobileTrigger = page.getByRole("button", { name: "Abrir menú" });
    await expect(mobileTrigger).toBeVisible();
    await mobileTrigger.click();
    await expect(page.getByRole("dialog", { name: "Menú principal móvil" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menú principal móvil" })).toBeHidden();
  });

  test("Recordatorios: acciones en escritorio y panel inferior en móvil (< 600 px)", async ({
    page,
  }) => {
    await installSyntheticAppMocks(page, { role: "ADMIN" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/#personal");
    await expect(page.getByText("27 resultados")).toBeVisible();

    const widgetBtn = page.getByRole("button", { name: "Recordatorios del soldado" });
    await expect(widgetBtn).toBeVisible();
    await widgetBtn.click();

    await page.getByRole("button", { name: /pendiente\(s\)/i }).click();
    await expect(page.getByText("Revisar botas Batería A")).toBeVisible();

    // Vista móvil (< 600 px) abre panel inferior Dialog
    await page.setViewportSize({ width: 390, height: 844 });
    const drawerDialog = page.getByRole("dialog", { name: "Recordatorios" });
    await expect(drawerDialog).toBeVisible();
    await expect(drawerDialog.getByText("Revisar botas Batería A")).toBeVisible();
    const drawerOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    );
    expect(drawerOverflow).toBe(true);
  });

  test("Sweep responsive (320 a 1536 px), zoom 200%, movimiento reducido y WCAG AA", async ({
    page,
  }) => {
    await installSyntheticAppMocks(page, { role: "ADMIN" });
    await page.emulateMedia({ reducedMotion: "reduce" });

    const viewports = [320, 599, 600, 899, 900, 1200, 1536];
    await page.goto("/#personal");
    await expect(page.getByText("27 resultados")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Personal subalterno" })).toBeVisible();

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 800 });
      const overflowOk = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1
      );
      expect(overflowOk, `Sin desbordamiento horizontal en ${width}px`).toBe(true);
    }

    // Simulación equivalente a zoom al 200% sobre viewport de 1280px (ancho efectivo CSS 640px)
    await page.setViewportSize({ width: 640, height: 400 });
    const zoomOverflowOk = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    );
    expect(zoomOverflowOk).toBe(true);

    // Verificar prefers-reduced-motion en elemento animado
    const reducedTransitionMs = await page.evaluate(() => {
      const btn = document.querySelector("button");
      if (!btn) return 0;
      return parseFloat(getComputedStyle(btn).transitionDuration || "0") * 1000;
    });
    expect(reducedTransitionMs).toBeLessThanOrEqual(1);

    // Auditoría Axe WCAG A/AA en vista real Personal y Hoja Matriz
    await page.setViewportSize({ width: 1280, height: 800 });
    const personalAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const seriousPersonal = personalAxe.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousPersonal).toEqual([]);

    await page.goto("/#hoja_matrix");
    await expect(
      page.getByRole("heading", { name: "Hoja Matriz General de Entrega" })
    ).toBeVisible();
    const matrixAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const seriousMatrix = matrixAxe.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousMatrix).toEqual([]);
  });
});
