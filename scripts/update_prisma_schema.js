/* eslint-disable @typescript-eslint/no-require-imports -- legacy CommonJS migration scripts */
const fs = require('node:fs');
const filepath = 'prisma/schema.prisma';
let content = fs.readFileSync(filepath, 'utf8');

// Replace Personal model
const personalNew = `model Personal {
  ci                   String          @id @map("ci")
  apellido1            String
  apellido2            String?
  nombre1              String
  nombre2              String?
  telefonoContacto     String?         @map("telefono_contacto")
  rangoId              Int             @map("grado_id") @db.SmallInt
  tipo                 TipoPersonal    @map("tipo")
  esReingreso          Boolean?        @map("es_reingreso")
  fechaIngreso         DateTime?       @map("fecha_ingreso") @db.Date
  fechaIngresoOriginal DateTime?       @map("fecha_ingreso_original") @db.Date
  bateriaId            Int?            @map("bateria_id") @db.SmallInt
  baja                 Boolean         @default(false) @map("baja")
  createdAt            DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime        @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  rango                Rango           @relation(fields: [rangoId], references: [rangoId])
  bateria              Bateria?        @relation(fields: [bateriaId], references: [bateriaId])
  
  tallas               PersonalTalla[]
  movimientosDestinatario MovimientoDestinatarioPersonal[]
  articuloEntregasRecibidas ArticuloEntregaPersonal[] @relation("articulo_entrega_destinatario")
  articuloEntregasOrdenadas ArticuloEntregaPersonal[] @relation("articulo_entrega_ordenante")
  observaciones        Observacion[]

  @@index([rangoId])
  @@map("personal")
}`;

content = content.replace(/model Personal \{[\s\S]*?@@map\("personal"\)\n\}/, personalNew);

// Remove Subalterno, Oficial, Suboficial models
content = content.replace(/model Subalterno \{[\s\S]*?@@map\("subalterno"\)\n\}\n\n?/, '');
content = content.replace(/model Oficial \{[\s\S]*?@@map\("oficial"\)\n\}\n\n?/, '');
content = content.replace(/model Suboficial \{[\s\S]*?@@map\("suboficial"\)\n\}\n\n?/, '');

fs.writeFileSync(filepath, content);
