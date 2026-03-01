# 🔄 Plan de Migración de Datos Viejos → Nueva BD

**Datos a migrar desde CSV y artefactos HTML**

---

## 📦 ARCHIVOS ORIGEN

### 1. Datos Personales CSV
```
📄 DATOS VIEJOS/Datos Personales y Vestuario - Datos Personales.csv
```

**Columnas:**
```csv
Hoja, Rango, Apellido 1, Apellido 2, Nombre 1, Nombre 2, CI, 
Parka, Camisaco, Pantalón, Kepí, Calzado, Fecha Ingreso, Batería
```

**Ejemplo:**
```csv
Sdo 1°. Acuña.M, Sdo 1°, Acuña, Fuentes, Mauricio, Gaston, 56876110, 
L, XL, XL, 56, 41, 1/3/2022, Cdo. y Serv.
```

**Cantidad:** 79 registros (1 encabezado + 78 datos)

---

### 2. Vestuario CSV
```
📄 DATOS VIEJOS/Datos Personales y Vestuario - Vestuario.csv
```

**Columnas:**
```csv
Persona, CI, Fecha, TipoRegistro, 
[28 columnas de items de vestuario]
```

**Items tratados:** 28 diferentes tipos de prendas
- Buzos
- Parkas
- Birretes
- Camisacos
- Pantalones
- Botas
- Accesorios (medias, frazada, etc.)

**Cantidad:** ~226 registros de movimientos

---

### 3. Fichas Individuales HTML
```
📁 DATOS VIEJOS/hoja de entrega/
├── Cabo 1°. Casaravilla.A.html
├── Cabo 1°. Coitiño.J.html
├── ... (78+ fichas por persona)
└── Matriz (NO TOCAR).html
```

**Contenido:** Cada HTML contiene tabla con historial de entregas/devoluciones

---

## 🗂️ MAPEO DE DATOS

### CSV → Prisma: Personal

```
CSV Column          → Prisma Field
─────────────────────────────────
CI                  → personal.ci (PK)
Rango               → personal.rangoId (FK a tabla grado)
Apellido 1          → personal.apellido1
Apellido 2          → personal.apellido2
Nombre 1            → personal.nombre1
Nombre 2            → personal.nombre2
Fecha Ingreso       → personal.fechaIngreso
Batería             → personal.bateriaId (FK a tabla bateria)
Parka               → personal_talla(ci, talla_tipo_id=1, talla_valor)
Camisaco            → personal_talla(ci, talla_tipo_id=2, talla_valor)
Pantalón            → personal_talla(ci, talla_tipo_id=3, talla_valor)
Kepí                → personal_talla(ci, talla_tipo_id=4, talla_valor)
Calzado             → personal_talla(ci, talla_tipo_id=5, talla_valor)
```

### CSV → Prisma: Registros (Vestuario)

```
CSV Column          → Prisma Field
─────────────────────────────────
Persona             → registro.personal.nombre (info)
CI                  → registro.ci (FK)
Fecha               → registro.fecha
TipoRegistro        → registro.tipo (ENTREGA→DEVOLUCION, DISTRIBUCIÓN→ENTREGA)
Item_001            → registro_item.itemId + registro_item.cantidad
Item_002            → registro_item.itemId + registro_item.cantidad
... (28 items)
```

---

## 🔀 TRANSFORMACIONES NECESARIAS

### 1. Rangos (Enumeración)
```
CSV            → DB (abreviacion)
─────────────────────────────
Sgto            → SGTO
Cabo 1°         → CABO1
Cabo 2º         → CABO2
Sdo 1°          → SDO1
```

**Query preparada:**
```sql
INSERT INTO grado (abreviacion, nombre_completo) VALUES
('SGTO', 'Sargento'),
('CABO1', 'Cabo 1°'),
('CABO2', 'Cabo 2°'),
('SDO1', 'Soldado 1°'),
ON CONFLICT DO NOTHING;
```

### 2. Baterías
```
Encontrar valores únicos en columna "Batería" del CSV:
- "Cdo. y Serv." (Comando y Servicio)
- ... (buscar otros)
```

**Query preparada:**
```sql
INSERT INTO bateria (nombre) VALUES
('Cdo. y Serv.'),
ON CONFLICT DO NOTHING;
```

### 3. Items (Vestuario)
```
Mapear 28 columnas CSV a tabla item:
```

| ID | Nombre Completo | Abreviación de CSV |
|----|------|---|
| 1 | Buzo verde m/c Escote redondo | BUZO_VERDE |
| 2 | Buzo Manga Larga V/ Oliva | BUZO_MANGA_LARGA |
| 3 | Parka Pixelada con Forro Polar | PARKA_POLAR |
| 4 | Parka Pixelada con Forro Polar 4A | PARKA_POLAR_4A |
| ... | ... | ... |

**Query preparada:**
```sql
INSERT INTO item (nombre, activo, orden_pdf) VALUES
('Buzo verde m/c Escote redondo', true, 1),
('Buzo Manga Larga V/ Oliva', true, 2),
('Parka Pixelada con Forro Polar', true, 3),
... (28 items)
ON CONFLICT DO NOTHING;
```

### 4. Talla Tipos
```
Fixed en DB:
- PARKA
- CAMISACO
- PANTALON
- KEPI
- CALZADO

Valores posibles: XS, S, M, L, XL, XXL, XXXL (texto)
                  34-47 (número para calzado)
                  54-63 (número para kepi)
```

### 5. Fechas
```
CSV: "1/3/2022" → Múltiples formatos
Conversión: Usar parseFloat + validación

Estandarizar a: "2022-03-01" (ISO 8601)
```

### 6. Validación de CIs
```
Algunas CIs pueden ser inválidas
Usar: librería 'ciuy' (ya en paquete.json)

import { validate } from 'ciuy';
if (!validate(ci)) {
  console.warn(`⚠️ CI inválida: ${ci}`);
  // Registrar para revisión manual
}
```

---

## 📋 ORDEN DE MIGRACIÓN

```
1. Crear Rangos (grado)
2. Crear Baterías
3. Crear Items
4. Crear Talla Tipos (ya en seed probablemente)
5. Crear Personal (con validación de CI)
6. Crear Personal_Talla
7. Crear Registros
8. Crear Registros_Item
```

---

## 🛠️ SCRIPT DE MIGRACIÓN REQUERIDOS

### Script 1: `import-personal-legacy.mjs`
```javascript
// nodes scripts/import-personal-legacy.mjs --file DATOS\ VIEJOS/Datos\ Personales\ y\ Vestuario\ -\ Datos\ Personales.csv

import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const file = process.argv[3] || 'DATOS VIEJOS/Datos Personales y Vestuario - Datos Personales.csv';
  const content = fs.readFileSync(file, 'utf-8');
  
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Mapeos
  const rangoMap = {
    'Sgto': 'SGTO',
    'Cabo 1°': 'CABO1',
    'Cabo 2º': 'CABO2',
    'Sdo 1°': 'SDO1'
  };

  const bateriaMap = {};
  const rangoIds = {};
  const bateriaIds = {};

  // Cargar rangos/baterías del DB
  const rangos = await prisma.rango.findMany();
  const baterias = await prisma.bateria.findMany();

  rangos.forEach(r => rangoIds[r.abreviacion] = r.rangoId);
  baterias.forEach(b => bateriaIds[b.nombre] = b.bateriaId);

  // Procesar personal
  for (const row of records) {
    const ci = row['CI'].trim();
    const rangoAbrev = rangoMap[row['Rango']];
    const bateriaName = row['Batería'];

    if (!ci || !rangoAbrev) {
      console.warn(`⚠️ Fila inválida:`, row);
      continue;
    }

    // Crear o actualizar personal
    const personal = await prisma.personal.upsert({
      where: { ci },
      update: {
        apellido1: row['Apellido 1'],
        apellido2: row['Apellido 2'] || null,
        nombre1: row['Nombre 1'],
        nombre2: row['Nombre 2'] || null,
        fechaIngreso: new Date(row['Fecha Ingreso']),
        rangoId: rangoIds[rangoAbrev],
        bateriaId: bateriaIds[bateriaName] || null,
      },
      create: {
        ci,
        apellido1: row['Apellido 1'],
        apellido2: row['Apellido 2'] || null,
        nombre1: row['Nombre 1'],
        nombre2: row['Nombre 2'] || null,
        fechaIngreso: new Date(row['Fecha Ingreso']),
        rangoId: rangoIds[rangoAbrev],
        bateriaId: bateriaIds[bateriaName] || null,
      }
    });

    // Crear tallas
    const tallaMap = {
      'Parka': 'PARKA',
      'Camisaco': 'CAMISACO',
      'Pantalón': 'PANTALON',
      'Kepí': 'KEPI',
      'Calzado': 'CALZADO',
    };

    for (const [csvKey, dbtKey] of Object.entries(tallaMap)) {
      const value = row[csvKey];
      if (value) {
        const tallaTipo = await prisma.tallaTipo.findUnique({ where: { nombre: dbtKey } });
        if (tallaTipo) {
          await prisma.personalTalla.upsert({
            where: { ci_tallaTipoId: { ci, tallaTipoId: tallaTipo.tallaTipoId } },
            update: { tallaValor: value },
            create: { ci, tallaTipoId: tallaTipo.tallaTipoId, tallaValor: value },
          });
        }
      }
    }

    console.log(`✅ Importado: ${ci} - ${row['Nombre 1']} ${row['Apellido 1']}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
```

### Script 2: `import-registros-legacy.mjs`
```javascript
// node scripts/import-registros-legacy.mjs --file DATOS\ VIEJOS/Datos\ Personales\ y\ Vestuario\ -\ Vestuario.csv

import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const file = process.argv[3] || 'DATOS VIEJOS/Datos Personales y Vestuario - Vestuario.csv';
  const content = fs.readFileSync(file, 'utf-8');
  
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Cargar items
  const items = await prisma.item.findMany();
  const itemMap = {};
  items.forEach(i => itemMap[i.nombre] = i.itemId);

  // Mapeo de columnas CSV a item
  const csvItemMap = {
    'Buzo verde m/c Escote redondo': 'BUZO_VERDE',
    // ... (mapear todas las 28 columnas)
  };

  // Procesar registros
  let contador = 0;
  for (const row of records) {
    const ci = row['CI'];
    const fecha = new Date(row['Fecha']);
    const tipo = row['TipoRegistro'] === 'Distribución' ? 'ENTREGA' : 'DEVOLUCION';

    if (!ci || !fecha) {
      console.warn(`⚠️ Fila inválida:`, row);
      continue;
    }

    // Crear registro cabecera
    const registro = await prisma.registro.create({
      data: {
        ci,
        fecha,
        tipo,
        comentarios: `Importado de datos legacy - ${row['TipoRegistro']}`
      }
    });

    // Procesar items
    for (const [csvCol, itemName] of Object.entries(csvItemMap)) {
      const cantidad = parseInt(row[csvCol]) || 0;
      if (cantidad !== 0) {
        const itemId = itemMap[csvCol];
        if (itemId) {
          await prisma.registroItem.create({
            data: {
              registroId: registro.registroId,
              itemId,
              cantidad
            }
          });
        }
      }
    }

    contador++;
    if (contador % 10 === 0) console.log(`✅ Procesados ${contador} registros...`);
  }

  console.log(`🏁 Total importado: ${contador} registros`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
```

---

## ✅ CHECKLIST DE MIGRACIÓN

### Pre-migración
- [ ] Backup de BD actual
- [ ] Backup de CSV viejos
- [ ] Verificar estructura de schema.prisma
- [ ] Verificar catálogos: Rango, Bateria, Item, TallaTipo

### Ejecución
- [ ] Ejecutar script de Personal
  ```bash
  node scripts/import-personal-legacy.mjs
  ```
- [ ] Validar personal importado
  ```bash
  npm run prisma:studio
  ```
- [ ] Ejecutar script de Registros
  ```bash
  node scripts/import-registros-legacy.mjs
  ```
- [ ] Validar registros importados

### Post-migración
- [ ] Verificar cantidad de registros
- [ ] Validar integridad de FK
- [ ] Buscar CIs inválidas
- [ ] Comparar con CSV original
- [ ] Generar reporte de discrepancias

---

## 📊 ESTADÍSTICAS ESPERADAS

| Entidad | Cantidad Esperada | Fuente |
|---------|---|---|
| Personal | ~78 | Datos Personales.csv (79 - encabezado) |
| Registros de Vestuario | ~226 | Vestuario.csv |
| Items | 28 | Columnas únicas en Vestuario.csv |
| Rangos | 4 | SGTO, CABO1, CABO2, SDO1 |
| Baterías | 1+ | Cdo. y Serv., ... (buscar únicos) |

---

## 🚨 PROBLEMAS POTENCIALES & SOLUCIONES

### Problema 1: CIs Inválidas
```
Solución: 
- Validar con ciuy.validate()
- Listar CIs inválidas
- Requerir corrección manual o usar campo alternativo
```

### Problema 2: Fechas en Formatos Diferentes
```
CSV contiene:
- "1/3/2022"
- "01/11/2001"
- "01/01/2025"

Solución:
- Usar parseDate() con manejo de múltiples formatos
- O marcar para revisión manual
```

### Problema 3: Items con Nombres Largos sin ID Único
```
Solución:
- Usar ID Auto-incremental
- Mapear por nombre exacto
- Crear tabla de mapeo si hay inconsistencias
```

### Problema 4: Cantidades Negativas en Vestuario
```
CSV original: Valores negativos = Devolución
Solución:
- Detectar signo
- Ajustar tipo de registro (ENTREGA vs DEVOLUCION)
```

---

## 📝 NOTAS IMPORTANTES

1. **Datos históricos:** Los datos viejos van a 2018+, son válidos para contexto pero pueden tener errores
2. **Auditoría:** Los registros importados NO tendrán user_id (serán NULL)
3. **Validación:** Revisar resultado con `prisma studio` antes de deploying
4. **Rollback:** Guardar SQL de antes de migración para rollback

---

