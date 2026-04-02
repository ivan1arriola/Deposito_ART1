import { notFound } from "next/navigation";
import { HojaEntregaCanonicalSheet } from "@/app/components/print/HojaEntregaCanonicalSheet";
import {
  getCurrentHojaEntregaPrintDate,
} from "@/app/components/print/HojaEntregaPrint";
import styles from "@/app/components/views/hoja-de-entrega.module.css";
import { getHojaEntregaData } from "@/lib/hoja-entrega-data";

export const revalidate = 0;
export const metadata = {
  title: "Hoja de Entrega",
};

export default async function HojaEntregaPage({
  params,
  searchParams,
}: {
  params: Promise<{ ci: string }>;
  searchParams?: Promise<{ pdf?: string }>;
}) {
  const { ci } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isPdfExport = resolvedSearchParams?.pdf === "1";
  const ciValue = decodeURIComponent(ci).trim();

  const data = await getHojaEntregaData(ciValue);

  if (!data) {
    notFound();
  }

  return (
    <main
      className={`${styles.page}${isPdfExport ? ` ${styles.pdfExport}` : ""}`}
      data-hoja-entrega-ready="1"
    >
      <HojaEntregaCanonicalSheet data={data} fechaImpresion={getCurrentHojaEntregaPrintDate()} />
    </main>
  );
}
