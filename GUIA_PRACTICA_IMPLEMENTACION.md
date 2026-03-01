# 🔨 Guía Práctica: Primeros Pasos de Implementación

**Copy-paste listo para ejecutar**

---

## 📋 TABLA DE CONTENIDOS

1. [Setup Inicial](#setup-inicial)
2. [Verificar Estado Actual](#verificar-estado-actual)
3. [Crear Endpoint: Ficha Individual](#crear-endpoint-ficha-individual)
4. [Crear Endpoint: PDF Ficha](#crear-endpoint-pdf-ficha)
5. [Crear Componente React](#crear-componente-react)
6. [Testing](#testing)

---

## 🚀 SETUP INICIAL

### Paso 1: Preparar el Workspace
```bash
cd c:\\Users\\ivan1\\Downloads\\Soldados_APP
ls -la
```

### Paso 2: Instalar Dependencias (si no están)
```bash
npm install
```

### Paso 3: Generar Cliente Prisma
```bash
npx prisma generate
```

### Paso 4: Verificar Conexión BD
```bash
npm run prisma:studio
```
Si abre Prisma Studio en `http://localhost:5555`, ✅ OK

---

## ✅ VERIFICAR ESTADO ACTUAL

### Comandos Diagnóstico
```bash
# 1. Ver estructura de archivos API
ls -R src/app/api/

# 2. Ver estructura de componentes
ls -R src/app/components/

# 3. Ver tipos
ls -R src/types/

# 4. Ver lib de utilidades
ls -R src/lib/
```

### Endpoints Existentes (Testear)
```bash
# Iniciar servidor
npm run dev

# En otra terminal, testear endpoints:

# 1. Obtener personal
curl http://localhost:3000/api/personal

# 2. Obtener rangos
curl http://localhost:3000/api/rangos

# 3. Obtener items
curl http://localhost:3000/api/items

# 4. Crear personal (ejemplo)
curl -X POST http://localhost:3000/api/personal \
  -H "Content-Type: application/json" \
  -d '{
    "ci": "45907815",
    "apellido1": "Perez",
    "apellido2": "Gomez",
    "nombre1": "Juan",
    "nombre2": "Carlos",
    "fechaIngreso": "2026-02-25",
    "rangoId": 1,
    "bateriaId": 1,
    "tallas": { "PARKA": "M", "CAMISACO": "M", "PANTALON": "34", "KEPI": "58", "CALZADO": "42" }
  }'
```

---

## 🆕 CREAR ENDPOINT: FICHA INDIVIDUAL

### Archivo 1: `src/app/api/ficha/[ci].ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ci: string }> }
) {
  try {
    const { ci } = await params;

    // Obtener personal con relaciones
    const personal = await prisma.personal.findUnique({
      where: { ci },
      include: {
        rango: true,
        bateria: true,
        tallas: {
          include: { tallaTipo: true }
        }
      }
    });

    if (!personal) {
      return NextResponse.json(
        { error: 'Personal no encontrado' },
        { status: 404 }
      );
    }

    // Obtener registros de entregas/devoluciones
    const registros = await prisma.registro.findMany({
      where: { ci },
      include: {
        items: {
          include: { item: true }
        }
      },
      orderBy: { fecha: 'desc' }
    });

    // Mapear tallas
    const tallas: Record<string, string> = {};
    personal.tallas.forEach(t => {
      tallas[t.tallaTipo.nombre] = t.tallaValor;
    });

    // Mapear registros
    const registrosFormato = registros.map(r => ({
      registroId: r.registroId,
      fecha: r.fecha.toISOString().split('T')[0],
      tipo: r.tipo,
      comentarios: r.comentarios,
      items: r.items.map(ri => ({
        itemId: ri.itemId,
        nombre: ri.item.nombre,
        cantidad: ri.cantidad
      }))
    }));

    return NextResponse.json({
      personal: {
        ci: personal.ci,
        apellido1: personal.apellido1,
        apellido2: personal.apellido2,
        nombre1: personal.nombre1,
        nombre2: personal.nombre2,
        fechaIngreso: personal.fechaIngreso?.toISOString().split('T')[0],
        rango: personal.rango,
        bateria: personal.bateria
      },
      tallas,
      registros: registrosFormato
    });
  } catch (error) {
    console.error('Error fetching ficha:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

### Crear Carpeta
```bash
mkdir -p src/app/api/ficha
```

### Crear Archivo
Copiar código arriba a: `src/app/api/ficha/[ci].ts`

### Testear
```bash
# Asumiendo CI 45907815 existe en BD
curl http://localhost:3000/api/ficha/45907815

# Debería retornar JSON con estructura de ficha
```

---

## 📄 CREAR ENDPOINT: PDF FICHA

### Archivo: `src/app/api/pdf-ficha/[ci].ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FichaData {
  personal: {
    ci: string;
    apellido1: string;
    apellido2?: string;
    nombre1: string;
    nombre2?: string;
    rango: { nombreCompleto: string };
    bateria: { nombre: string } | null;
  };
  tallas: Record<string, string>;
  registros: Array<{
    fecha: string;
    tipo: string;
    items: Array<{ nombre: string; cantidad: number }>;
  }>;
}

async function getFichaData(ci: string): Promise<FichaData | null> {
  const personal = await prisma.personal.findUnique({
    where: { ci },
    include: {
      rango: true,
      bateria: true,
      tallas: { include: { tallaTipo: true } }
    }
  });

  if (!personal) return null;

  const registros = await prisma.registro.findMany({
    where: { ci },
    include: { items: { include: { item: true } } },
    orderBy: { fecha: 'desc' }
  });

  const tallas: Record<string, string> = {};
  personal.tallas.forEach(t => {
    tallas[t.tallaTipo.nombre] = t.tallaValor;
  });

  return {
    personal: {
      ci: personal.ci,
      apellido1: personal.apellido1,
      apellido2: personal.apellido2,
      nombre1: personal.nombre1,
      nombre2: personal.nombre2,
      rango: personal.rango,
      bateria: personal.bateria
    },
    tallas,
    registros: registros.map(r => ({
      fecha: r.fecha.toISOString().split('T')[0],
      tipo: r.tipo,
      items: r.items.map(ri => ({
        nombre: ri.item.nombre,
        cantidad: ri.cantidad
      }))
    }))
  };
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  fontSize: number = 12
) {
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    color: rgb(0, 0, 0)
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ci: string }> }
) {
  try {
    const { ci } = await params;
    const ficha = await getFichaData(ci);

    if (!ficha) {
      return NextResponse.json(
        { error: 'Personal no encontrado' },
        { status: 404 }
      );
    }

    // Crear documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    let yPos = height - 50;
    const margin = 50;
    const lineHeight = 20;

    // Encabezado
    drawText(
      page,
      `FICHA INDIVIDUAL - ${ficha.personal.rango.nombreCompleto} ${ficha.personal.apellido1}`,
      margin,
      yPos,
      16
    );
    yPos -= 30;

    // Datos personales
    drawText(page, 'DATOS PERSONALES', margin, yPos, 14);
    yPos -= lineHeight;

    const personalLines = [
      `CI: ${ficha.personal.ci}`,
      `Nombre: ${ficha.personal.nombre1}${ficha.personal.nombre2 ? ' ' + ficha.personal.nombre2 : ''}`,
      `Apellido: ${ficha.personal.apellido1}${ficha.personal.apellido2 ? ' ' + ficha.personal.apellido2 : ''}`,
      `Rango: ${ficha.personal.rango.nombreCompleto}`,
      `Batería: ${ficha.personal.bateria?.nombre || 'N/A'}`
    ];

    personalLines.forEach(line => {
      drawText(page, line, margin, yPos, 11);
      yPos -= lineHeight;
    });

    yPos -= 10;

    // Tallas
    drawText(page, 'TALLAS', margin, yPos, 14);
    yPos -= lineHeight;

    Object.entries(ficha.tallas).forEach(([tipo, valor]) => {
      drawText(page, `${tipo}: ${valor}`, margin, yPos, 11);
      yPos -= lineHeight;
    });

    yPos -= 10;

    // Historial de entregas
    drawText(page, 'HISTORIAL DE ENTREGAS', margin, yPos, 14);
    yPos -= lineHeight;

    ficha.registros.slice(0, 10).forEach(registro => {
      drawText(
        page,
        `${registro.fecha} - ${registro.tipo}`,
        margin,
        yPos,
        11
      );
      yPos -= lineHeight;

      registro.items.forEach(item => {
        drawText(
          page,
          `  • ${item.nombre} (x${item.cantidad})`,
          margin + 20,
          yPos,
          10
        );
        yPos -= lineHeight - 5;
      });

      yPos -= 5;
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Ficha_${ci}.pdf"`,
        'Content-Length': pdfBytes.length.toString()
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Error generando PDF' },
      { status: 500 }
    );
  }
}
```

### Crear Carpeta
```bash
mkdir -p src/app/api/pdf-ficha
```

### Crear Archivo
Copiar código arriba a: `src/app/api/pdf-ficha/[ci].ts`

### Testear
```bash
# Descargar PDF en navegador
curl http://localhost:3000/api/pdf-ficha/45907815 --output test.pdf
```

---

## 🎨 CREAR COMPONENTE REACT

### Archivo: `src/app/components/views/FichaIndividualView.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Ficha {
  personal: {
    ci: string;
    apellido1: string;
    apellido2?: string;
    nombre1: string;
    nombre2?: string;
    fechaIngreso?: string;
    rango: { nombreCompleto: string };
    bateria: { nombre: string } | null;
  };
  tallas: Record<string, string>;
  registros: Array<{
    fecha: string;
    tipo: string;
    items: Array<{ nombre: string; cantidad: number }>;
  }>;
}

export function FichaIndividualView({ ci }: { ci: string }) {
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFicha = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/ficha/${ci}`);
        setFicha(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching ficha:', err);
        setError('No se pudo cargar la ficha');
      } finally {
        setLoading(false);
      }
    };

    if (ci) {
      fetchFicha();
    }
  }, [ci]);

  if (loading) {
    return <div className="p-4">⏳ Cargando ficha...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>;
  }

  if (!ficha) {
    return <div className="p-4">Ficha no encontrada</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      {/* Encabezado */}
      <div className="border-b-2 pb-4 mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {ficha.personal.rango.nombreCompleto} {ficha.personal.apellido1}
          {ficha.personal.apellido2 && ` ${ficha.personal.apellido2}`}
        </h1>
        <p className="text-gray-600">
          {ficha.personal.nombre1}
          {ficha.personal.nombre2 && ` ${ficha.personal.nombre2}`}
        </p>
      </div>

      {/* Datos Personales */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-xl font-bold mb-3">Datos Personales</h2>
          <div className="space-y-2">
            <p>
              <strong>CI:</strong> {ficha.personal.ci}
            </p>
            <p>
              <strong>Rango:</strong> {ficha.personal.rango.nombreCompleto}
            </p>
            <p>
              <strong>Batería:</strong> {ficha.personal.bateria?.nombre || 'N/A'}
            </p>
            {ficha.personal.fechaIngreso && (
              <p>
                <strong>Fecha Ingreso:</strong> {ficha.personal.fechaIngreso}
              </p>
            )}
          </div>
        </div>

        {/* Tallas */}
        <div>
          <h2 className="text-xl font-bold mb-3">Tallas</h2>
          <div className="space-y-2">
            {Object.entries(ficha.tallas).map(([tipo, valor]) => (
              <p key={tipo}>
                <strong>{tipo}:</strong> {valor}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Historial de Registros */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3">Historial de Entregas</h2>
        {ficha.registros.length === 0 ? (
          <p className="text-gray-500">Sin registros</p>
        ) : (
          <div className="space-y-4">
            {ficha.registros.map((registro, idx) => (
              <div
                key={idx}
                className="border p-4 rounded bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold">{registro.fecha}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {registro.tipo}
                  </span>
                </div>
                <ul className="space-y-1">
                  {registro.items.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      • {item.nombre} <span className="text-gray-500">(x{item.cantidad})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón Descargar PDF */}
      <div className="text-center">
        <button
          onClick={() => {
            const link = document.createElement('a');
            link.href = `/api/pdf-ficha/${ci}`;
            link.download = `Ficha_${ci}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          📥 Descargar PDF
        </button>
      </div>
    </div>
  );
}
```

### Crear Carpeta
```bash
mkdir -p src/app/components/views
```

### Crear Archivo
Copiar código arriba a: `src/app/components/views/FichaIndividualView.tsx`

---

## 🧪 TESTING

### Test 1: Ficha Individual JSON
```bash
# Abrir navegador o curl
curl http://localhost:3000/api/ficha/45907815 | jq .
```

**Salida esperada:**
```json
{
  "personal": {
    "ci": "45907815",
    "apellido1": "Perez",
    ...
  },
  "tallas": { ... },
  "registros": [ ... ]
}
```

### Test 2: Descargar PDF
```bash
# Descargar archivo
curl -L http://localhost:3000/api/pdf-ficha/45907815 --output ficha_test.pdf

# Verificar que el archivo existe
ls -lh ficha_test.pdf
```

### Test 3: En la UI React
1. Ir a `http://localhost:3000`
2. Buscar opción "Ficha Individual"
3. Ingresar CI: `45907815`
4. Verificar que muestra datos
5. Clickear "Descargar PDF"

---

## 📊 PRÓXIMO PASO: MATRIZ DE ENTREGAS

```bash
# Después de confirmar que fichas funcionan:
# 1. Crear src/app/api/hoja-matrix.ts
# 2. Crear src/app/components/views/MatrizEntregasView.tsx
# 3. Integrar en page.tsx
```

---

## 🐛 TROUBLESHOOTING

### Error: "Personal no encontrado"
```
Solución: Verificar que existe el CI en BD
npx prisma studio → Buscar en tabla personal
```

### Error: "Error interno del servidor"
```
Solución: Revisar logs en terminal
npm run dev (ver consola para errores)
```

### PDF está vacío
```
Solución: Verificar que pdf-lib está instalado
npm install pdf-lib
```

---

## 📝 CHECKLIST

- [ ] Crear carpeta `src/app/api/ficha`
- [ ] Crear archivo `[ci].ts` con endpoint
- [ ] Crear carpeta `src/app/api/pdf-ficha`
- [ ] Crear archivo `[ci].ts` con PDF
- [ ] Crear carpeta `src/app/components/views`
- [ ] Crear archivo `FichaIndividualView.tsx`
- [ ] Testear endpoint JSON
- [ ] Testear descarga PDF
- [ ] Integrar componente en `page.tsx`
- [ ] Verificar en navegador

---

**¡Listo para implementar! Copiar y pegar, y comenzar a testear.** 🚀

