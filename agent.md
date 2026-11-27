# `agent.md` — Metodología de Agentes, Roles y Tiers (`Deposito_ART1`)

Configuración operativa inspirada en una arquitectura multi-agente por separación de responsabilidades, compatible con **Gemini 4** (Antigravity / Gemini CLI) y **OpenAI Codex** (Codex CLI / IDE).

> **Descubrimiento automático:** [`AGENTS.md`](./AGENTS.md) en la raíz es cargado automáticamente por Gemini 4 y Codex, y delega en este archivo. Los roles base viven también como skills reutilizables en `.agents/skills/*/SKILL.md`.

---

## 1. Contexto del Repositorio

- **Stack:** Next.js 16 (App Router), React 19, TypeScript (`strict: true`), Prisma 7 (`@prisma/adapter-pg`), PostgreSQL, NextAuth, Tailwind CSS 4, MUI 7, Vitest.
- **Zonas protegidas y hotspots:**
  - `src/generated/prisma/**`: código autogenerado; **nunca editar manualmente**.
  - `prisma/schema-base.sql` y `prisma/patches/**`: todo cambio de esquema exige parche SQL idempotente y `npm run prisma:generate`.
  - Monolitos de alto churn (`src/app/page.tsx`, `src/app/components/views/ConfigViews.tsx`, `FormulariosPrestamosView.tsx`, `StockView.tsx`, `src/app/api/equipos/[equipoId]/route.ts`): no agregar lógica nueva directamente; extraer módulos o subcomponentes.

---

## 2. Reglas Globales (obligatorias para todos los agentes)

1. **Evidencia:** ningún agente puede afirmar que algo funciona sin haberlo comprobado en archivos leídos o en la salida real de comandos.
2. **Alcance:** cada agente recibe una tarea delimitada (entradas, salidas y restricciones explícitas).
3. **Independencia:** quien implementa (`scoped-implementer`) no aprueba su propio trabajo; `reviewer` y `qa-verifier` verifican de forma independiente.
4. **No duplicación:** dos agentes no modifican simultáneamente los mismos archivos.
5. **Continuidad:** todos los agentes respetan este `agent.md` y el plan/contrato aprobado del incremento.
6. **Trazabilidad:** todo hallazgo incluye ruta exacta, línea (`archivo:línea`) y evidencia observable.
7. **Reversibilidad:** los cambios de base de datos y lógica crítica deben ser reversibles (parches SQL idempotentes, sin `db:rebuild` destructivo).
8. **Transparencia:** cada agente reporta el tier/modelo utilizado, los comandos ejecutados y cualquier punto que no haya podido verificar.

---

## 3. Flujo de Trabajo Estándar

1. **Orchestrator** _(agente principal)_: recibe el objetivo, define el alcance, asigna roles/tiers y conserva el contexto global.
2. **Code Explorer** _(solo lectura)_: investiga código, callers, rutas API y estado actual antes de diseñar.
3. **Architect / Planner** _(solo lectura)_: diseña la solución, contratos, riesgos, estrategia de migración/rollback, criterios de aceptación e incrementos.
4. **Specialists** _(bajo demanda)_: activados solo cuando el incremento toca áreas críticas (ver sección 5).
5. **Scoped Implementer** _(escritura acotada)_: implementa un incremento y sus tests unitarios sin tocar archivos ajenos al alcance.
6. **Reviewer** _(solo lectura)_: revisa el diff completo de forma independiente. Si detecta problemas críticos o altos, devuelve a `Scoped Implementer`.
7. **QA / Verifier** _(ejecuta pruebas, sin editar código de aplicación)_: ejecuta typecheck, lint, tests, cobertura, build y validaciones de texto; verifica casos negativos y borde.
8. **Orchestrator**: consolida resultados, confirma gates en verde y entrega al usuario.

---

## 4. Propuesta de Equipo Inicial y Tiers (Gemini 4 & Codex)

| Rol                     | Skill                               | Permisos                          | Tier                        | **Gemini 4** (Antigravity) | **Codex** (CLI / IDE)                                  |
| ----------------------- | ----------------------------------- | --------------------------------- | --------------------------- | -------------------------- | ------------------------------------------------------ |
| **Orchestrator**        | —                                   | Coordina y consolida              | **Tier 3 (Alto)**           | Sesión principal           | Sesión principal (`reasoning: high`)                   |
| **Code Explorer**       | `.agents/skills/code-explorer`      | Solo lectura                      | **Tier 1 (Bajo / rápido)**  | `flash_lite` / `flash`     | Modelo ligero (`mini`) · `reasoning: low`              |
| **Architect / Planner** | `.agents/skills/architect`          | Solo lectura                      | **Tier 3 (Alto)**           | `pro`                      | Modelo principal · `reasoning: high`                   |
| **Scoped Implementer**  | `.agents/skills/scoped-implementer` | Escritura acotada                 | **Tier 2 (Medio)**          | `inherit` / `Hydrogen`     | Modelo estándar · `reasoning: medium`                  |
| **Reviewer**            | `.agents/skills/reviewer`           | Solo lectura                      | **Tier 3 (Alto)**           | `pro`                      | Modelo principal · `reasoning: high`                   |
| **QA / Verifier**       | `.agents/skills/qa-verifier`        | Ejecuta comandos (sin editar app) | **Tier 2–3 (Medio / alto)** | `inherit` o `pro`          | Modelo estándar/principal · `reasoning: medium`/`high` |

### Criterio de selección de Tier

- **Tier 1 (Bajo / rápido):** exploración, grep de símbolos, lectura de logs y tareas mecánicas sin riesgo lógico.
- **Tier 2 (Medio / estándar):** implementación acotada con plan claro, tests unitarios y ejecución de suites de verificación.
- **Tier 3 (Alto / profundo):** decisiones de arquitectura, descomposición de monolitos, seguridad/auth, transacciones de stock/préstamos y code review final.

---

## 5. Especialistas Bajo Demanda

Activar únicamente cuando el incremento lo requiera, asignando el tier indicado:

- **Security & Auth Auditor** _(Tier 3 — Alto)_: NextAuth, control de roles (`ADMIN`/`EDITOR`), `src/lib/handlers-auth.ts`, exposición de datos personales (CI, teléfonos, emails) y validación de inputs en `src/app/api/**`.
- **Database & Prisma Specialist** _(Tier 3 — Alto)_: esquema PostgreSQL, `prisma/patches/**`, integridad transaccional (`$transaction`) en movimientos de stock, préstamos y entregas.
- **UX/UI & PDF Specialist** _(Tier 2 — Medio / alto)_: vistas en React 19 / Tailwind 4 / MUI 7, extracción de subcomponentes desde `page.tsx`/`ConfigViews.tsx` y plantillas PDF (`@react-pdf/renderer`, `pdfkit`, `pdf-lib`).
- **Tech Debt & Quality Analyst** _(Tier 2 — Medio / alto)_: auditoría exigente con ESLint, Prettier, Knip, Dependency Cruiser, cobertura Vitest y monitoreo de hotspots.
- **Spanish & Docs Writer** _(Tier 1 — Bajo / medio)_: `README.md`, `CHANGELOG.md`, manuales e integridad lingüística (`check:encoding`, `check:spanish`).

---

## 6. Gates de Verificación y Reglas de Seguridad

Todo incremento debe reportar la ejecución real de los gates aplicables antes de considerarse terminado:

```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run check:encoding
npm run check:spanish
```

Para auditorías exigentes o cierre de hitos se recomienda además evaluar cobertura (`npx vitest run --coverage`, objetivo >= 80% / meta aspiracional 90%), código muerto (`knip`), arquitectura de dependencias (`dependency-cruiser`) y formato (`prettier --check`).

### Reglas inviolables

- Prohibido ejecutar `npm run db:rebuild`, `DROP` o `TRUNCATE` sin confirmación explícita del usuario.
- Prohibido leer, exponer o commitear secretos de `.env` o claves VAPID.
- Prohibido introducir `any` explícito, `@ts-ignore` o `eslint-disable` sin justificación técnica documentada.
