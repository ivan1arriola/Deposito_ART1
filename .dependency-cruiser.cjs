/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "No se permiten dependencias circulares en src/.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "error",
      comment: "No se permiten módulos huérfanos sin consumidores.",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$",
          "\\.d\\.ts$",
          "(^|/)src/app/.*(page|layout|loading|error|not-found|route|global-error|template|default)\\.(ts|tsx)$",
          "(^|/)src/app/globals\\.css$",
          "(^|/)src/generated/",
          "(^|/)src/lib/server-only-mock\\.ts$",
          "(^|/)src/types/",
        ],
      },
      to: {},
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment: "Todos los imports deben resolverse correctamente.",
      from: {},
      to: {
        couldNotResolve: true,
        pathNot: ["^server-only$"],
      },
    },
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment: "El código de producción en src/ no debe importar devDependencies.",
      from: {
        path: "^src/",
        pathNot: ["^src/lib/server-only-mock\\.ts$"],
      },
      to: {
        dependencyTypes: ["npm-dev"],
        pathNot: ["node_modules/@types/", "server-only"],
      },
    },
    {
      name: "lib-no-app-imports",
      severity: "error",
      comment: "La capa src/lib/ no debe depender de src/app/.",
      from: { path: "^src/lib/" },
      to: { path: "^src/app/" },
    },
    {
      name: "components-no-server-only",
      severity: "error",
      comment: "Los componentes UI no deben importar módulos exclusivos de servidor.",
      from: { path: "^src/app/components/" },
      to: {
        path: [
          "^src/lib/server/",
          "^src/lib/prisma\\.ts$",
          "^src/lib/auth\\.ts$",
          "^src/lib/handlers-",
          "^src/lib/mailer\\.ts$",
          "^src/lib/web-push\\.ts$",
        ],
      },
    },
  ],
  options: {
    doNotFollow: {
      path: ["node_modules", "^src/generated/prisma"],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["module", "main", "types", "typings"],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
