# 🎨 Guía de Componentes e Implementación

**Componentes React y Endpoints API específicos a implementar**

---

## 📋 TABLA DE CONTENIDOS

1. [Endpoints API Nuevos](#endpoints-api-nuevos)
2. [Componentes React a Crear](#componentes-react-a-crear)
3. [Handlers y Servicios](#handlers-y-servicios)
4. [Ejemplos de Código](#ejemplos-de-código)

---

## 🔌 ENDPOINTS API NUEVOS

### **1. Ficha Individual**

#### GET `/api/ficha/:ci`
```
Descripción: Obtiene datos completos de una persona + historial de registros
Parámetros: ci (string, PK)
Respuesta:
{
  "personal": {
    "ci": "45907815",
    "apellido1": "Perez",
    "apellido2": "Gomez",
    "nombre1": "Juan",
    "nombre2": "Carlos",
    "fechaIngreso": "2026-02-25T00:00:00Z",
    "rango": { "rangoId": 2, "abreviacion": "CABO1", "nombreCompleto": "Cabo 1°" },
    "bateria": { "bateriaId": 1, "nombre": "Cdo. y Serv." }
  },
  "tallas": {
    "PARKA": "M",
    "CAMISACO": "M",
    "PANTALON": "34",
    "KEPI": "58",
    "CALZADO": "42"
  },
  "registros": [
    {
      "fecha": "2026-02-20",
      "tipo": "ENTREGA",
      "comentarios": "",
      "items": [
        { "nombre": "Parka Pixelada", "cantidad": 1 },
        { "nombre": "Pantalón Pixelado", "cantidad": 1 }
      ]
    },
    ...
  ]
}
```

**Archivo:** `src/app/api/ficha/[ci].ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { ci: string } }
) {
  try {
    const { ci } = params;
    
    // Obtener personal
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
      return NextResponse.json({ error: 'Personal no encontrado' }, { status: 404 });
    }

    // Obtener registros
    const registros = await prisma.registro.findMany({
      where: { ci },
      include: { items: { include: { item: true } } },
      orderBy: { fecha: 'desc' }
    });

    // Mapear tallas
    const tallas = {};
    personal.tallas.forEach(t => {
      tallas[t.tallaTipo.nombre] = t.tallaValor;
    });

    // Mapear registros
    const registrosFormato = registros.map(r => ({
      fecha: r.fecha,
      tipo: r.tipo,
      comentarios: r.comentarios,
      items: r.items.map(ri => ({
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
        fechaIngreso: personal.fechaIngreso,
        rango: personal.rango,
        bateria: personal.bateria
      },
      tallas,
      registros: registrosFormato
    });
  } catch (error) {
    console.error('Error fetching ficha:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
```

---

### **2. Generar PDF de Ficha**

#### GET `/api/pdf-ficha/:ci`
```
Descripción: Genera PDF de la ficha individual
Parámetros: ci (string)
Respuesta: Descarga PDF binario
Content-Type: application/pdf
```

**Archivo:** `src/app/api/pdf-ficha/[ci].ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, Font } from 'pdf-lib';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { ci: string } }
) {
  try {
    const { ci } = params;
    
    // Obtener ficha
    const ficha = await fetchFichaData(ci);
    if (!ficha) {
      return NextResponse.json({ error: 'Personal no encontrado' }, { status: 404 });
    }

    // Crear PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Agregar contenido
    const { width, height } = page.getSize();
    page.drawText(`${ficha.personal.rango.nombreCompleto} ${ficha.personal.apellido1}`, {
      x: 50,
      y: height - 50,
      size: 18,
      color: rgb(0, 0, 0)
    });

    page.drawText(`CI: ${ficha.personal.ci}`, {
      x: 50,
      y: height - 80,
      size: 12,
    });

    page.drawText(`Fecha Ingreso: ${ficha.personal.fechaIngreso}`, {
      x: 50,
      y: height - 110,
      size: 12,
    });

    // Agregar tabla de registros
    let yPos = height - 150;
    page.drawText('Historial de Entregas:', { x: 50, y: yPos, size: 14 });
    yPos -= 30;

    for (const registro of ficha.registros) {
      page.drawText(`${registro.fecha} - ${registro.tipo}`, {
        x: 50,
        y: yPos,
        size: 11,
      });
      yPos -= 20;
    }

    const pdfBytes = await pdfDoc.save();
    
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Ficha_${ci}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 });
  }
}

async function fetchFichaData(ci: string) {
  // Mismo código que GET /api/ficha/:ci
}
```

---

### **3. Matriz de Entregas**

#### GET `/api/hoja-matrix`
```
Descripción: Obtiene matriz completa personas x items
Respuesta:
{
  "personas": [
    {
      "ci": "45907815",
      "rango": "CABO1",
      "apellido1": "Perez",
      "apellido2": "Gomez",
      "nombre1": "Juan",
      "tallas": { "PARKA": "M", ... }
    },
    ...
  ],
  "items": [
    { "itemId": 1, "nombre": "Parka Pixelada", "ordenPdf": 1 },
    ...
  ],
  "entregas": {
    "45907815:1": 1,
    "45907815:2": 0,
    ...
  }
}
```

**Archivo:** `src/app/api/hoja-matrix.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Obtener personal con tallas
    const personal = await prisma.personal.findMany({
      include: {
        rango: true,
        bateria: true,
        tallas: { include: { tallaTipo: true } }
      },
      orderBy: [
        { rango: { nombreCompleto: 'asc' } },
        { apellido1: 'asc' }
      ]
    });

    // Obtener items
    const items = await prisma.item.findMany({
      where: { activo: true },
      orderBy: { ordenPdf: 'asc' }
    });

    // Construir matriz de entregas
    const entregas = {};

    for (const person of personal) {
      for (const item of items) {
        // Buscar total de cantidad entregar para este personal + item
        const registro = await prisma.registroItem.aggregate({
          where: {
            registro: { ci: person.ci, tipo: 'ENTREGA' },
            itemId: item.itemId
          },
          _sum: { cantidad: true }
        });

        const cantidad = registro._sum.cantidad || 0;
        entregas[`${person.ci}:${item.itemId}`] = cantidad;
      }
    }

    // Mapear tallas
    const personalData = personal.map(p => {
      const tallas = {};
      p.tallas.forEach(t => {
        tallas[t.tallaTipo.nombre] = t.tallaValor;
      });

      return {
        ci: p.ci,
        rango: p.rango.abreviacion,
        apellido1: p.apellido1,
        apellido2: p.apellido2,
        nombre1: p.nombre1,
        tallas
      };
    });

    return NextResponse.json({
      personas: personalData,
      items,
      entregas
    });
  } catch (error) {
    console.error('Error fetching matriz:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
```

---

### **4. Obtener Registros de una Persona**

#### GET `/api/personal/:ci/registros`
```
Descripción: Obtiene historico de registros (filtrado)
Parámetros:
  - ci (string)
  - tipo? (ENTREGA|DEVOLUCION|AJUSTE)
  - desde? (YYYY-MM-DD)
  - hasta? (YYYY-MM-DD)
Respuesta: Array de registros
```

**Archivo:** `src/app/api/personal/[ci]/registros.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { ci: string } }
) {
  try {
    const { ci } = params;
    const searchParams = req.nextUrl.searchParams;
    
    const tipo = searchParams.get('tipo');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');

    const where = { ci };

    if (tipo) where.tipo = tipo;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = new Date(hasta);
    }

    const registros = await prisma.registro.findMany({
      where,
      include: { items: { include: { item: true } } },
      orderBy: { fecha: 'desc' }
    });

    return NextResponse.json(registros);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
```

---

### **5. CRUD Observaciones**

#### GET `/api/observaciones/:ci`
```
Descripción: Obtiene observaciones de una persona
Respuesta: Array de observaciones
```

#### POST `/api/observaciones`
```
Body: { ci, fecha, texto }
```

#### PUT `/api/observaciones/:observacionId`
```
Body: { ci?, fecha?, texto? }
```

#### DELETE `/api/observaciones/:observacionId`

**Archivo:** `src/app/api/observaciones/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const ci = req.nextUrl.searchParams.get('ci');
  if (!ci) {
    return NextResponse.json({ error: 'CI requerido' }, { status: 400 });
  }

  const observaciones = await prisma.observacion.findMany({
    where: { ci },
    orderBy: { fecha: 'desc' }
  });

  return NextResponse.json(observaciones);
}

export async function POST(req: NextRequest) {
  const { ci, fecha, texto } = await req.json();
  
  if (!ci || !fecha || !texto) {
    return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 });
  }

  const obs = await prisma.observacion.create({
    data: { ci, fecha: new Date(fecha), texto }
  });

  return NextResponse.json(obs);
}
```

---

## 🎨 COMPONENTES REACT A CREAR

### **1. FichaIndividualView.tsx**
```
Ubicación: src/app/components/views/FichaIndividualView.tsx
Funcionalidad: 
  - Mostrar datos de ficha
  - Listar registros/entregas
  - Botón para descargar PDF
```

---

### **2. MatrizEntregasView.tsx**
```
Ubicación: src/app/components/views/MatrizEntregasView.tsx
Funcionalidad:
  - Tabla persona x items
  - Código de colores (0%, 50%, 100%)
  - Filtros por rango/bateria
  - Exportar PDF
```

---

### **3. ObservacionesPanel.tsx**
```
Ubicación: src/app/components/ObservacionesPanel.tsx
Funcionalidad:
  - Listar observaciones por persona
  - Agregar nueva observación
  - Editar/Eliminar existentes
  - Ordenar por fecha
```

---

### **4. RegistroDetallado.tsx**
```
Ubicación: src/app/components/RegistroDetallado.tsx
Funcionalidad:
  - Mostrar detalles de un registro
  - Items involucrados
  - Editar comentarios
  - Eliminar registro
```

---

## 🔧 HANDLERS Y SERVICIOS

### **Archivo:** `src/lib/handlers-ficha.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getFichaByCi(ci: string) {
  // Lógica para obtener ficha
}

export async function getFichaMatrix() {
  // Lógica para obtener matriz
}

export async function generateFichaPDF(ci: string) {
  // Lógica para generar PDF
}
```

---

### **Archivo:** `src/lib/handlers-observaciones.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createObservacion(ci: string, fecha: Date, texto: string) {
  return prisma.observacion.create({
    data: { ci, fecha, texto }
  });
}

export async function updateObservacion(observacionId: bigint, datos: any) {
  return prisma.observacion.update({
    where: { observacionId },
    data: datos
  });
}

export async function deleteObservacion(observacionId: bigint) {
  return prisma.observacion.delete({
    where: { observacionId }
  });
}
```

---

## 📝 EJEMPLOS DE CÓDIGO

### **Ejemplo 1: Componente de Ficha Individual**
```tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Ficha {
  personal: any;
  tallas: any;
  registros: any[];
}

export function FichaIndividualView({ ci }: { ci: string }) {
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFicha = async () => {
      try {
        const response = await api.get(`/api/ficha/${ci}`);
        setFicha(response.data);
      } catch (error) {
        console.error('Error fetching ficha:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFicha();
  }, [ci]);

  if (loading) return <p>Cargando...</p>;
  if (!ficha) return <p>Ficha no encontrada</p>;

  return (
    <div className="ficha-container">
      <h1>
        {ficha.personal.rango.nombreCompleto} {ficha.personal.apellido1}
      </h1>
      
      <section className="datos-personales">
        <h2>Datos Personales</h2>
        <p><strong>CI:</strong> {ficha.personal.ci}</p>
        <p><strong>Nombre:</strong> {ficha.personal.nombre1} {ficha.personal.nombre2}</p>
        <p><strong>Batería:</strong> {ficha.personal.bateria?.nombre}</p>
        <p><strong>Fecha Ingreso:</strong> {ficha.personal.fechaIngreso}</p>
      </section>

      <section className="tallas">
        <h2>Tallas</h2>
        <ul>
          {Object.entries(ficha.tallas).map(([tipo, valor]) => (
            <li key={tipo}>{tipo}: {valor}</li>
          ))}
        </ul>
      </section>

      <section className="registros">
        <h2>Historial de Entregas</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {ficha.registros.map((reg, i) => (
              <tr key={i}>
                <td>{reg.fecha}</td>
                <td>{reg.tipo}</td>
                <td>
                  {reg.items.map(item => (
                    <span key={item.nombre}>{item.nombre} x{item.cantidad}</span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <button onClick={() => window.open(`/api/pdf-ficha/${ci}`)}>
        📥 Descargar PDF
      </button>
    </div>
  );
}
```

---

### **Ejemplo 2: Matriz de Entregas**
```tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface MatrizData {
  personas: any[];
  items: any[];
  entregas: Record<string, number>;
}

export function MatrizEntregasView() {
  const [matriz, setMatriz] = useState<MatrizData | null>(null);

  useEffect(() => {
    const fetchMatriz = async () => {
      const response = await api.get('/api/hoja-matrix');
      setMatriz(response.data);
    };

    fetchMatriz();
  }, []);

  if (!matriz) return <p>Cargando matriz...</p>;

  const getColor = (cantidad: number) => {
    if (cantidad === 0) return 'bg-red-100';
    if (cantidad < matriz.items.length) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <div className="matriz-container overflow-auto">
      <table className="border-collapse border">
        <thead>
          <tr>
            <th className="border p-2">Persona</th>
            {matriz.items.map(item => (
              <th key={item.itemId} className="border p-2 text-sm">
                {item.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.personas.map(persona => (
            <tr key={persona.ci}>
              <td className="border p-2 font-bold">
                {persona.rango} {persona.apellido1}, {persona.nombre1}
              </td>
              {matriz.items.map(item => {
                const cantidad = matriz.entregas[`${persona.ci}:${item.itemId}`] || 0;
                return (
                  <td
                    key={item.itemId}
                    className={`border p-2 text-center ${getColor(cantidad)}`}
                  >
                    {cantidad}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🚀 PRÓXIMOS PASOS

1. Crear los archivos API new endpoints
2. Implementar los componentes React
3. Agregar handlers en lib/
4. Conectar en la vista principal (page.tsx)
5. Testear cada funcionalidad
6. Integrar generación de PDFs

