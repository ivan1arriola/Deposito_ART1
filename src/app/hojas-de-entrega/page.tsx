import { HojaEntregaCanonicalSheet } from "@/app/components/print/HojaEntregaCanonicalSheet";
import {
  getCurrentHojaEntregaPrintDate,
} from "@/app/components/print/HojaEntregaPrint";
import styles from "@/app/components/views/hoja-de-entrega.module.css";
import { getAllHojasEntregaData } from "@/lib/hoja-entrega-data";

export const revalidate = 0;
export const metadata = {
  title: "Hojas de Entrega",
};

export default async function HojasDeEntregaPage({
  searchParams,
}: {
  searchParams?: Promise<{ pdf?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isPdfExport = resolvedSearchParams?.pdf === "1";
  const hojas = await getAllHojasEntregaData();
  const fechaImpresion = getCurrentHojaEntregaPrintDate();

  return (
    <main className={`${styles.page}${isPdfExport ? ` ${styles.pdfExport}` : ""}`}>
      {hojas.length === 0 ? (
        <div className={styles.statusLine}>No hay personal para generar hojas de entrega.</div>
      ) : (
        hojas.map((hoja, index) => (
          <section
            key={hoja.persona.ci}
            style={
              index < hojas.length - 1
                ? { breakAfter: "page", pageBreakAfter: "always" }
                : undefined
            }
          >
            <HojaEntregaCanonicalSheet data={hoja} fechaImpresion={fechaImpresion} />
          </section>
        ))
      )}
    </main>
  );
}
