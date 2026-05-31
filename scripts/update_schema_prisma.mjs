import fs from "fs";

let schema = fs.readFileSync("prisma/schema.prisma", "utf-8");

// Model Renames
const modelRenames = [
  { from: /model Item \{/g, to: "model Equipo {" },
  { from: /model ItemCodigoSIE \{/g, to: "model EquipoCodigoSIE {" },
  { from: /model CajaItem \{/g, to: "model CajaEquipo {" },
  { from: /model CajaItemCodigoSIE \{/g, to: "model CajaEquipoCodigoSIE {" },
  { from: /model StockOperacionItem \{/g, to: "model StockOperacionEquipo {" },
  { from: /model MovimientoItem \{/g, to: "model MovimientoEquipo {" },
];

for (const { from, to } of modelRenames) {
  schema = schema.replace(from, to);
}

// Field Types
const fieldTypes = [
  { from: /Item\s/g, to: "Equipo " },
  { from: /Item\?/g, to: "Equipo?" },
  { from: /Item\[/g, to: "Equipo[" },
  { from: /ItemCodigoSIE\s/g, to: "EquipoCodigoSIE " },
  { from: /ItemCodigoSIE\?/g, to: "EquipoCodigoSIE?" },
  { from: /ItemCodigoSIE\[/g, to: "EquipoCodigoSIE[" },
  { from: /CajaItem\s/g, to: "CajaEquipo " },
  { from: /CajaItem\[/g, to: "CajaEquipo[" },
  { from: /CajaItemCodigoSIE\s/g, to: "CajaEquipoCodigoSIE " },
  { from: /CajaItemCodigoSIE\[/g, to: "CajaEquipoCodigoSIE[" },
  { from: /StockOperacionItem\s/g, to: "StockOperacionEquipo " },
  { from: /StockOperacionItem\[/g, to: "StockOperacionEquipo[" },
  { from: /MovimientoItem\s/g, to: "MovimientoEquipo " },
  { from: /MovimientoItem\[/g, to: "MovimientoEquipo[" },
];

for (const { from, to } of fieldTypes) {
  schema = schema.replace(from, to);
}

// Map database tables
const mapRenames = [
  { from: /@@map\("item"\)/g, to: '@@map("equipos")' },
  { from: /@@map\("item_codigo_sie"\)/g, to: '@@map("equipo_codigo_sie")' },
  { from: /@@map\("caja_item"\)/g, to: '@@map("caja_equipo")' },
  { from: /@@map\("caja_item_codigo_sie"\)/g, to: '@@map("caja_equipo_codigo_sie")' },
  { from: /@@map\("stock_operacion_item"\)/g, to: '@@map("stock_operacion_equipo")' },
  { from: /@@map\("movimiento_item"\)/g, to: '@@map("movimiento_equipo")' },
];

for (const { from, to } of mapRenames) {
  schema = schema.replace(from, to);
}

// Property Names and relation fields
const propRenames = [
  { from: /itemId/g, to: "equipoId" },
  { from: /itemCodigoSieId/g, to: "equipoCodigoSieId" },
  { from: /cajaItems/g, to: "cajaEquipos" },
  { from: /movimientoItems/g, to: "movimientoEquipos" },
  { from: /stockOperacionItems/g, to: "stockOperacionEquipos" },
  { from: /itemCodigoSIE/g, to: "equipoCodigoSIE" },
];

for (const { from, to } of propRenames) {
  schema = schema.replace(from, to);
}

// Rename the field `item` to `equipo` but only when it is a relation
// It's easier to do targeted replacements for the "item Equipo" lines
schema = schema.replace(/item\s+Equipo/g, "equipo Equipo");
schema = schema.replace(/items\s+Equipo\[\]/g, "equipos Equipo[]");
schema = schema.replace(/items\s+Item\[\]/g, "equipos Equipo[]");
schema = schema.replace(/item\s+Item/g, "equipo Equipo");

fs.writeFileSync("prisma/schema.prisma", schema);
console.log("schema.prisma updated");
