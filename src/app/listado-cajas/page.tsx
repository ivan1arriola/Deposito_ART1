import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  ListadoCajasPrintEmptyState,
  ListadoCajasPrintStyles,
  ListadoCajasPrintTable,
} from "@/app/components/print/ListadoCajasPrint";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { getListadoCajasPrintData } from "@/lib/etiquetado-data";

export const revalidate = 0;
export const metadata = {
  title: "Listado de Cajas",
};

export default async function ListadoCajasPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";
  const cajas = await getListadoCajasPrintData();

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <ListadoCajasPrintStyles />
      {cajas.length === 0 ? (
        <ListadoCajasPrintEmptyState message="No hay cajas registradas para imprimir el listado." />
      ) : (
        <ListadoCajasPrintTable cajas={cajas} generatedAt={formatDateTimeForDisplay(new Date())} />
      )}
    </>
  );
}
