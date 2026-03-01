import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  getCurrentHojaEntregaEmissionDate,
  HojaEntregaPrintEmptyState,
  HojaEntregaPrintSheet,
  HojaEntregaPrintStyles,
} from "@/app/components/print/HojaEntregaPrint";
import { getAllHojasEntregaData } from "@/lib/hoja-entrega-data";

export const revalidate = 0;
export const metadata = {
  title: "Hojas de Entrega",
};

export default async function HojasDeEntregaPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";
  const hojas = await getAllHojasEntregaData();
  const fechaEmision = getCurrentHojaEntregaEmissionDate();

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <HojaEntregaPrintStyles />
      {hojas.length === 0 ? (
        <HojaEntregaPrintEmptyState message="No hay personal para generar hojas de entrega." />
      ) : (
        hojas.map((hoja) => (
          <HojaEntregaPrintSheet key={hoja.persona.ci} data={hoja} fechaEmision={fechaEmision} />
        ))
      )}
    </>
  );
}
