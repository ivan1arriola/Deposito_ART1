import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const OUTPUT_DIR = path.resolve(process.cwd(), "public", "docs");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "presentacion-producto-deposito-art1.pdf");

const ASSETS_DIR = path.resolve(process.cwd(), "public", "assets");
const MANUAL_ASSETS_DIR = path.join(ASSETS_DIR, "manual");

// Colors
const COLORS = {
  primary: "#0f172a",    // Slate 900
  secondary: "#334155",  // Slate 700
  accent: "#059669",     // Emerald 600
  text: "#1e293b",       // Slate 800
  lightText: "#64748b",  // Slate 500
  background: "#f8fafc", // Slate 50
  white: "#ffffff",
  border: "#e2e8f0",     // Slate 200
  tip: "#0ea5e9",        // Sky 500
  warning: "#f59e0b",    // Amber 500
};

const PAGE_MARGIN = 50;
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 40;
const CONTENT_TOP_Y = 80;

const today = new Date();
const dateLabel = new Intl.DateTimeFormat("es-UY", {
  year: "numeric",
  month: "long",
  day: "2-digit",
}).format(today);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const doc = new PDFDocument({
  size: "A4",
  margin: 0, 
  bufferPages: true,
  info: {
    Title: "Manual de Usuario - Deposito ART1",
    Author: "Equipo de Desarrollo Deposito ART1",
    Subject: "Manual de uso y aprendizaje del sistema de gestión logística",
    Keywords: "manual, usuario, logística, artillería, depósito, guía",
  },
});

const stream = fs.createWriteStream(OUTPUT_FILE);
doc.pipe(stream);

// --- Helper Components ---

function addHeader(titleText) {
  doc.save();
  doc.rect(0, 0, doc.page.width, HEADER_HEIGHT).fill(COLORS.background);
  doc.fillColor(COLORS.lightText).font("Helvetica-Bold").fontSize(10).text("DEPÓSITO ART1 - MANUAL DE USUARIO", PAGE_MARGIN, 25);
  doc.fillColor(COLORS.lightText).font("Helvetica").fontSize(10).text(titleText.toUpperCase(), PAGE_MARGIN, 25, {
    align: "right",
    width: doc.page.width - PAGE_MARGIN * 2,
  });
  doc.restore();
}

function addFooter(pageNum, totalPages) {
  const oldBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0; 
  doc.save();
  doc.rect(0, doc.page.height - FOOTER_HEIGHT, doc.page.width, FOOTER_HEIGHT).fill(COLORS.background);
  doc.fillColor(COLORS.lightText).font("Helvetica").fontSize(8);
  doc.text(`Página ${pageNum} de ${totalPages}`, PAGE_MARGIN, doc.page.height - 25);
  doc.text("© 2026 Depósito ART1 - Confidencial para Uso Interno", PAGE_MARGIN, doc.page.height - 25, {
    align: "right",
    width: doc.page.width - PAGE_MARGIN * 2,
  });
  doc.restore();
  doc.page.margins.bottom = oldBottomMargin;
}

function resetContentPosition() {
  doc.x = PAGE_MARGIN;
  doc.y = CONTENT_TOP_Y;
}

function h1(text) {
  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(20).text(text);
  doc.moveDown(0.5);
  doc.strokeColor(COLORS.accent).lineWidth(2).moveTo(doc.x, doc.y - 5).lineTo(doc.x + 40, doc.y - 5).stroke();
  doc.moveDown(0.5);
}

function h2(text) {
  doc.fillColor(COLORS.secondary).font("Helvetica-Bold").fontSize(14).text(text);
  doc.moveDown(0.5);
}

function paragraph(text, options = {}) {
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(11).text(text, {
    align: "justify",
    lineGap: 2,
    ...options,
  });
  doc.moveDown(1);
}

function bulletList(items) {
  items.forEach((item) => {
    doc.save();
    doc.fillColor(COLORS.accent).font("Helvetica-Bold").text("• ", { continued: true });
    doc.fillColor(COLORS.text).font("Helvetica").text(item);
    doc.restore();
    doc.moveDown(0.3);
  });
  doc.moveDown(0.5);
}

function infoBox(text, title = "NOTA", color = COLORS.accent) {
  const startY = doc.y;
  const startX = PAGE_MARGIN;
  const boxWidth = doc.page.width - PAGE_MARGIN * 2;
  const textX = startX + 15;
  const textWidth = boxWidth - 25;
  doc.save();
  
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(10);
  const textHeight = doc.heightOfString(text, { width: textWidth });
  const height = Math.max(40, textHeight + 30);
  
  doc.rect(startX, startY, boxWidth, height).fill(COLORS.background);
  doc.rect(startX, startY, 4, height).fill(color);
  
  doc.fillColor(color).font("Helvetica-Bold").fontSize(9).text(title, textX, startY + 8);
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(10).text(text, textX, startY + 22, { width: textWidth });
  
  doc.restore();
  doc.y = startY + height + 15;
}

function imageBox(imagePath, caption, width = 300) {
  if (!fs.existsSync(imagePath)) {
    console.warn(`Image not found: ${imagePath}`);
    return;
  }

  const image = doc.openImage(imagePath);
  const renderWidth = Math.min(width, doc.page.width - PAGE_MARGIN * 2);
  const renderHeight = (image.height / image.width) * renderWidth;
  const startY = doc.y;
  const startX = (doc.page.width - renderWidth) / 2;

  doc.image(imagePath, startX, startY, { width: renderWidth });

  let nextY = startY + renderHeight + 8;
  if (caption) {
    doc.fillColor(COLORS.lightText)
      .font("Helvetica-Oblique")
      .fontSize(9)
      .text(caption, PAGE_MARGIN, nextY, {
        align: "center",
        width: doc.page.width - PAGE_MARGIN * 2,
      });
    nextY += 18;
  }

  doc.y = nextY + 6;
}

// --- Document Sections ---

function renderCover() {
  const heroPath = path.join(MANUAL_ASSETS_DIR, "hero.png");
  const logoPath = path.join(ASSETS_DIR, "logo-deposito.png");
  
  if (fs.existsSync(heroPath)) {
    doc.image(heroPath, 0, 0, { width: doc.page.width, height: doc.page.height });
  }
  
  doc.save();
  doc.rect(0, doc.page.height * 0.6, doc.page.width, doc.page.height * 0.4).fillOpacity(0.9).fill(COLORS.primary);
  
  doc.fillColor(COLORS.white).fillOpacity(1);
  doc.font("Helvetica-Bold").fontSize(42).text("DEPÓSITO ART1", 50, doc.page.height * 0.65);
  doc.font("Helvetica").fontSize(20).text("Manual de Usuario y Guía de Aprendizaje", 50, doc.page.height * 0.73);
  
  doc.rect(50, doc.page.height * 0.78, 60, 4).fill(COLORS.accent);
  
  doc.fontSize(12).fillColor("#cbd5e1").text(`Version 2.1  |  ${dateLabel}`, 50, doc.page.height * 0.85);
  
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, doc.page.width - 150, doc.page.height * 0.82, { width: 100 });
  }
  doc.restore();
  doc.addPage({ margin: PAGE_MARGIN });
}

function renderIntro() {
  addHeader("Introducción");
  resetContentPosition();
  h1("1. Bienvenido al Depósito ART1");
  paragraph(
    "Este manual ha sido diseñado para facilitar el aprendizaje y la operación diaria del sistema de gestión de depósitos. Nuestra plataforma centraliza la información crítica para asegurar que cada equipo, prenda y movimiento esté registrado con precisión."
  );
  
  infoBox(
    "Este documento es de uso interno exclusivo. Asegúrese de mantener su sesión segura y no compartir sus credenciales de acceso.",
    "SEGURIDAD",
    COLORS.warning
  );
  
  h2("Objetivos del Sistema");
  bulletList([
    "Estandarizar el registro de personal y tallas.",
    "Garantizar la trazabilidad total del stock.",
    "Agilizar la entrega y devolución de equipo mediante documentos automatizados.",
    "Facilitar la toma de decisiones basada en datos reales de inventario."
  ]);
  
  const inventoryPath = path.join(MANUAL_ASSETS_DIR, "inventory.png");
  imageBox(inventoryPath, "Figura 1: Representación del ecosistema de gestión del depósito.");
}

function renderRoles() {
  doc.addPage({ margin: PAGE_MARGIN });
  addHeader("Configuración de Usuarios");
  resetContentPosition();
  h1("2. Roles y Permisos");
  paragraph(
    "El sistema utiliza un modelo de control de acceso basado en roles (RBAC) para garantizar que cada usuario tenga las herramientas necesarias según su responsabilidad administrativa."
  );
  
  const roles = [
    { name: "ADMIN (SISTEMA)", desc: "Control total del sistema, gestion de usuarios y acceso a auditoria." },
    { name: "EDITOR (SISTEMA)", desc: "Operacion diaria: altas, bajas, prestamos y edicion de datos operativos." },
    { name: "READ_ONLY (SISTEMA)", desc: "Consulta de reportes y estado de stock sin permisos de modificacion." },
    { name: "PERSONAL", desc: "Acceso individual para consultar su propia ficha y acciones personales habilitadas." }
  ];
  
  roles.forEach((role) => {
    const y = doc.y;
    doc.save();
    doc.rect(50, y, doc.page.width - 100, 45).strokeColor(COLORS.border).lineWidth(1).stroke();
    doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(11).text(role.name, 70, y + 10);
    doc.fillColor(COLORS.text).font("Helvetica").fontSize(10).text(role.desc, 70, y + 25);
    doc.restore();
    doc.y = y + 55;
  });
  
  doc.y += 10;
  h2("2.1 Matriz de permisos reales");
  paragraph(
    "La siguiente matriz replica la logica de permisos implementada en backend (read_data, write_data, delete_data, manage_users, view_audit, read_own_data, change_own_password)."
  );

  const permissionLabels = [
    { key: "read_data", label: "Lectura operativa" },
    { key: "write_data", label: "Escritura operativa" },
    { key: "delete_data", label: "Eliminacion" },
    { key: "manage_users", label: "Gestion usuarios" },
    { key: "view_audit", label: "Ver auditoria" },
    { key: "read_own_data", label: "Leer datos propios" },
    { key: "change_own_password", label: "Cambiar clave propia" },
  ];

  const matrix = {
    ADMIN: {
      read_data: true,
      write_data: true,
      delete_data: true,
      manage_users: true,
      view_audit: true,
      read_own_data: true,
      change_own_password: true,
    },
    EDITOR: {
      read_data: true,
      write_data: true,
      delete_data: true,
      manage_users: false,
      view_audit: false,
      read_own_data: true,
      change_own_password: true,
    },
    READ_ONLY: {
      read_data: true,
      write_data: false,
      delete_data: false,
      manage_users: false,
      view_audit: false,
      read_own_data: true,
      change_own_password: false,
    },
    PERSONAL: {
      read_data: false,
      write_data: false,
      delete_data: false,
      manage_users: false,
      view_audit: false,
      read_own_data: true,
      change_own_password: true,
    },
  };

  const tableX = PAGE_MARGIN;
  const tableWidth = doc.page.width - PAGE_MARGIN * 2;
  const rowHeight = 22;
  const colWidths = [tableWidth * 0.38, tableWidth * 0.155, tableWidth * 0.155, tableWidth * 0.155, tableWidth * 0.155];
  const headers = ["Permiso", "ADMIN", "EDITOR", "READ_ONLY", "PERSONAL"];
  const tableY = doc.y;

  doc.save();
  headers.forEach((header, index) => {
    const x = tableX + colWidths.slice(0, index).reduce((sum, n) => sum + n, 0);
    doc.rect(x, tableY, colWidths[index], rowHeight).fillAndStroke(COLORS.background, COLORS.border);
    doc.fillColor(COLORS.secondary).font("Helvetica-Bold").fontSize(9).text(header, x + 6, tableY + 7, {
      width: colWidths[index] - 12,
      align: index === 0 ? "left" : "center",
    });
  });

  permissionLabels.forEach((permission, rowIndex) => {
    const y = tableY + rowHeight * (rowIndex + 1);
    const bg = rowIndex % 2 === 0 ? COLORS.white : "#f8fafc";
    const values = [
      permission.label,
      matrix.ADMIN[permission.key] ? "SI" : "NO",
      matrix.EDITOR[permission.key] ? "SI" : "NO",
      matrix.READ_ONLY[permission.key] ? "SI" : "NO",
      matrix.PERSONAL[permission.key] ? "SI" : "NO",
    ];

    values.forEach((value, colIndex) => {
      const x = tableX + colWidths.slice(0, colIndex).reduce((sum, n) => sum + n, 0);
      doc.rect(x, y, colWidths[colIndex], rowHeight).fillAndStroke(bg, COLORS.border);
      doc.fillColor(COLORS.text).font(colIndex === 0 ? "Helvetica" : "Helvetica-Bold").fontSize(9).text(value, x + 6, y + 7, {
        width: colWidths[colIndex] - 12,
        align: colIndex === 0 ? "left" : "center",
      });
    });
  });
  doc.restore();
  doc.y = tableY + rowHeight * (permissionLabels.length + 1) + 16;

  infoBox(
    "Si necesita cambiar su nivel de acceso, contacte con el oficial de S4 o el administrador del sistema. Evite compartir usuarios entre personas.",
    "CONSEJO"
  );
}

function renderModules() {
  doc.addPage({ margin: PAGE_MARGIN });
  addHeader("Módulos Funcionales");
  resetContentPosition();
  h1("3. Guía de Operación Detallada");
  
  h2("3.1 Gestión de Personal y Tallas");
  paragraph(
    "La base del sistema es el registro preciso del personal. Cada individuo tiene una ficha donde se centralizan sus tallas de equipo y su historial de movimientos."
  );
  
  const sizesPath = path.join(MANUAL_ASSETS_DIR, "sizes.png");
  imageBox(sizesPath, "Figura 2: Registro de tallas y personal.", 250);
  
  bulletList([
    "Actualice las tallas periódicamente para evitar errores en las Hojas de Entrega.",
    "Utilice el campo de 'Observaciones' para detalles médicos o excepciones de equipo."
  ]);

  doc.addPage({ margin: PAGE_MARGIN });
  addHeader("Documentación y Reportes");
  resetContentPosition();
  h2("3.2 Hoja de Entrega y Hoja Matriz");
  paragraph(
    "Estos son los pilares documentales del sistema, diseñados para control individual y colectivo."
  );

  const reportsPath = path.join(MANUAL_ASSETS_DIR, "reports.png");
  imageBox(reportsPath, "Figura 3: Documentación institucional generada por el sistema.", 200);

  doc.save();
  doc.font("Helvetica-Bold").text("Hoja de Entrega Individual:", { continued: true }).font("Helvetica").text(" Es el documento legal de compromiso. Registra qué recibió el soldado, en qué fecha y bajo qué responsabilidad. Debe imprimirse y firmarse en cada entrega física.");
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").text("Hoja Matriz:", { continued: true }).font("Helvetica").text(" Una vista consolidada por batería que permite al administrador ver de un vistazo qué tallas predominan y quién tiene equipo pendiente. Es fundamental para la planificación de compras y logística.");
  doc.restore();
  doc.moveDown(1);

  h2("3.3 Gestión de Préstamos y Recibos");
  paragraph(
    "El módulo de préstamos gestiona el equipo que sale del depósito de forma temporal (ej: para una misión o desfile)."
  );
  
  bulletList([
    "Recibo de Préstamo: Genera un comprobante con un código único de seguimiento.",
    "Trazabilidad: El sistema asocia el código al equipo y al personal, facilitando la devolución.",
    "Estado de Equipo: Permite registrar si el equipo vuelve en las mismas condiciones."
  ]);

  infoBox(
    "El código del recibo es vital para procesar la devolución de forma rápida en el sistema. Siempre entregue una copia al personal.",
    "PRO-TIP"
  );
}

function renderFullFunctionalMap() {
  doc.addPage({ margin: PAGE_MARGIN });
  addHeader("Mapa de Funcionalidades");
  resetContentPosition();
  h1("4. Mapa de Funcionalidades");
  
  const functions = [
    { mod: "Personal", desc: "Gestión de fichas, tallas e historial individual." },
    { mod: "Stock", desc: "Control de existencias reales, altas, bajas y movimientos internos." },
    { mod: "Préstamos", desc: "Registro de salidas temporales, recibos con código y control de devoluciones." },
    { mod: "Etiquetado", desc: "Generación de códigos SIE y etiquetas para cajas y estanterías." },
    { mod: "Resúmenes", desc: "Paneles de tallas por batería y grupo jerárquico para análisis rápido." },
    { mod: "Configuración", desc: "Administración de grados, firmas institucionales y permisos de usuario." },
    { mod: "Auditoría", desc: "Registro de quién hizo qué y cuándo, garantizando transparencia total." }
  ];

  functions.forEach((f) => {
    doc.save();
    doc.font("Helvetica-Bold").fillColor(COLORS.accent).text(`${f.mod}: `, { continued: true });
    doc.font("Helvetica").fillColor(COLORS.text).text(f.desc);
    doc.restore();
    doc.moveDown(0.8);
  });
}

function renderUserDetailedGuide() {
  doc.addPage({ margin: PAGE_MARGIN });
  addHeader("Guía Práctica para Usuarios");
  resetContentPosition();
  h1("5. Guía Práctica para Usuarios");

  h2("5.1 Navegación recomendada");
  bulletList([
    "Utilice el menú lateral para moverse por módulo sin perder contexto.",
    "En búsquedas, empiece por CI o apellido para encontrar registros más rápido.",
    "Antes de crear un registro nuevo, verifique si el personal o el equipo ya existe.",
    "Use el botón de recarga cuando sospeche que otra persona actualizó datos en paralelo.",
  ]);

  h2("5.2 Datos obligatorios por operación");
  bulletList([
    "Alta de personal: CI, nombres, apellidos, grado y batería.",
    "Préstamo: destinatario, fecha, ítems y cantidad por ítem.",
    "Devolución: estado de cada ítem y comentario si aplica.",
    "Impresión: revisar que el documento muestre los datos del titular correcto.",
  ]);

  h2("5.3 Validaciones clave del sistema");
  bulletList([
    "No permite cerrar devolución si faltan estados en ítems prestados.",
    "No permite operaciones sobre usuarios sin permisos de escritura.",
    "Los resúmenes muestran únicamente datos vigentes para evitar confusiones operativas.",
  ]);

  infoBox(
    "Si una operación no aparece guardada, valide la conexión y vuelva a abrir el detalle del registro para confirmar el estado real en base de datos.",
    "VALIDACIÓN OPERATIVA",
    COLORS.tip
  );

  doc.addPage({ margin: PAGE_MARGIN });
  addHeader("Guía Práctica para Usuarios");
  resetContentPosition();

  h2("5.4 Errores frecuentes y cómo resolverlos");
  doc.save();
  doc.font("Helvetica-Bold").fillColor(COLORS.primary).text("Error: ");
  doc.font("Helvetica").fillColor(COLORS.text).text("No encuentro a una persona por nombre.");
  doc.font("Helvetica-Bold").fillColor(COLORS.secondary).text("Acción sugerida: ", { continued: true });
  doc.font("Helvetica").fillColor(COLORS.text).text("buscar por CI o por primer apellido.");
  doc.moveDown(0.6);

  doc.font("Helvetica-Bold").fillColor(COLORS.primary).text("Error: ");
  doc.font("Helvetica").fillColor(COLORS.text).text("El PDF sale incompleto o con datos antiguos.");
  doc.font("Helvetica-Bold").fillColor(COLORS.secondary).text("Acción sugerida: ", { continued: true });
  doc.font("Helvetica").fillColor(COLORS.text).text("recargar la vista y volver a generar el documento.");
  doc.moveDown(0.6);

  doc.font("Helvetica-Bold").fillColor(COLORS.primary).text("Error: ");
  doc.font("Helvetica").fillColor(COLORS.text).text("No permite confirmar devolución.");
  doc.font("Helvetica-Bold").fillColor(COLORS.secondary).text("Acción sugerida: ", { continued: true });
  doc.font("Helvetica").fillColor(COLORS.text).text("completar estado y comentario en todos los ítems pendientes.");
  doc.restore();
  doc.moveDown(1);

  h2("5.5 Checklist antes de imprimir");
  bulletList([
    "Confirmar identidad: CI, grado y nombre completo.",
    "Verificar ítems y cantidades del documento.",
    "Revisar observaciones y comentarios del movimiento.",
    "Comprobar firmas configuradas al final del reporte.",
    "Asegurar fecha correcta del documento antes de archivar.",
  ]);

  h2("5.6 Preguntas frecuentes");
  doc.save();
  doc.font("Helvetica-Bold").fillColor(COLORS.primary).text("¿Qué hago si un ítem volvió dañado?");
  doc.font("Helvetica").fillColor(COLORS.text).text("Registre el estado real (REGULAR o MALO) y detalle el daño en comentario de devolución.");
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fillColor(COLORS.primary).text("¿Puedo editar un préstamo ya devuelto?");
  doc.font("Helvetica").fillColor(COLORS.text).text("No. Debe revisarse en historial y, si corresponde, generar una nueva operación administrativa.");
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fillColor(COLORS.primary).text("¿Quién puede cambiar permisos de usuarios?");
  doc.font("Helvetica").fillColor(COLORS.text).text("Solo perfiles ADMIN, bajo autorización de la cadena de mando correspondiente.");
  doc.restore();
}

function renderPractical() {
  doc.addPage({ margin: PAGE_MARGIN });
  addHeader("Buenas Prácticas");
  resetContentPosition();
  h1("6. Procedimientos Rapidos por Tarea");

  const procedures = [
    {
      title: "A) Alta de subalterno con tallas",
      steps: [
        "Ir a Altas > Alta de subalterno.",
        "Completar CI, nombres, apellidos, rango, bateria y fechas de ingreso.",
        "Cargar tallas (parka, camisaco, pantalon, kepi y calzado).",
        "Guardar y validar que aparezca en la vista de Personal.",
      ],
    },
    {
      title: "B) Registrar prestamo",
      steps: [
        "Ingresar a Prestamos > Registrar prestamo.",
        "Seleccionar destinatario, fecha estimada y equipos con cantidad.",
        "Guardar operacion y emitir recibo PDF.",
        "Entregar copia y conservar referencia del recibo.",
      ],
    },
    {
      title: "C) Registrar devolucion",
      steps: [
        "Ir a Prestamos > Vigentes y abrir devolucion del recibo correspondiente.",
        "Completar estado de cada item (NUEVO/BUENO/REGULAR/MALO) y comentario.",
        "Confirmar para mover el prestamo al historial.",
      ],
    },
    {
      title: "D) Emitir resumenes",
      steps: [
        "Abrir Resumen de tallas y seleccionar subvista segun necesidad.",
        "Validar datos en pantalla y usar botones de impresion PDF.",
        "Archivar documento firmado en carpeta operativa.",
      ],
    },
  ];

  procedures.forEach((procedure) => {
    h2(procedure.title);
    bulletList(procedure.steps);
  });

  doc.addPage({ margin: PAGE_MARGIN });
  addHeader("Buenas Prácticas");
  resetContentPosition();
  h1("7. Flujo de Trabajo Sugerido");
  
  const steps = [
    "Inicio: Verificar alertas en el Dashboard.",
    "Operativa: Registrar movimientos (Entrega/Préstamo) en tiempo real.",
    "Documentación: Emitir y firmar Hojas de Entrega o Recibos.",
    "Control: Validar devoluciones contra el código del recibo.",
    "Cierre: Revisar el historial de auditoría para asegurar consistencia."
  ];
  
  steps.forEach((step, i) => {
    doc.save();
    doc.circle(70, doc.y + 10, 12).fill(COLORS.primary);
    doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(10).text(`${i + 1}`, 67, doc.y + 5);
    doc.fillColor(COLORS.text).font("Helvetica").fontSize(11).text(step, 95, doc.y + 3, { width: doc.page.width - 150 });
    doc.restore();
    doc.y += 35;
  });
  
  doc.y += 20;
  h1("8. Conclusión");
  paragraph(
    "El Depósito ART1 garantiza que el patrimonio institucional esté protegido mediante una trazabilidad rigurosa y una documentación estandarizada."
  );
  
  doc.moveDown(2);
  doc.fillColor(COLORS.lightText).font("Helvetica-Bold").fontSize(12).text("¡Gracias por su compromiso con la excelencia operativa!", { align: "center" });
}

async function main() {
  console.log("Iniciando generación de manual expandido...");
  
  renderCover();
  renderIntro();
  renderRoles();
  renderModules();
  renderFullFunctionalMap();
  renderUserDetailedGuide();
  renderPractical();
  
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    if (i > 0) {
      addFooter(i, pages.count - 1);
    }
  }
  
  doc.end();
  
  stream.on("finish", () => {
    console.log(`Manual expandido generado exitosamente: ${OUTPUT_FILE}`);
  });
}

main().catch((err) => {
  console.log(err);
  process.exit(1);
});
