import { notFound } from "next/navigation";
import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  getCurrentHojaEntregaPrintDate,
  HojaEntregaPrintSheet,
  HojaEntregaPrintStyles,
} from "@/app/components/print/HojaEntregaPrint";
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
  searchParams?: Promise<{ autoprint?: string }>;
}) {
  const { ci } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";
  const ciValue = decodeURIComponent(ci).trim();

  const data = await getHojaEntregaData(ciValue);

  if (!data) {
    notFound();
  }

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <HojaEntregaPrintStyles />
      <HojaEntregaPrintSheet data={data} fechaImpresion={getCurrentHojaEntregaPrintDate()} />
    </>
  );
}
