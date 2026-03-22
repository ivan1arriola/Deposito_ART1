import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  EtiquetaCajaPrintSheet,
  EtiquetasCajaPrintEmptyState,
  EtiquetasCajaPrintStyles,
  type EtiquetaOrientacion,
} from "@/app/components/print/EtiquetasCajaPrint";
import { getEtiquetasCajaData } from "@/lib/etiquetado-data";

export const revalidate = 0;
export const metadata = {
  title: "Etiquetas de Cajas",
};

function parseOrientacion(value: string | undefined): EtiquetaOrientacion {
  return value === "vertical" ? "vertical" : "horizontal";
}

function parseCodigosCaja(value: string | undefined) {
  if (!value) return [] as number[];
  const codigos = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => /^\d+$/.test(entry))
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);

  return Array.from(new Set(codigos));
}

export default async function EtiquetasCajasPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string; orientacion?: string; cajas?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const orientacion = parseOrientacion(resolvedSearchParams?.orientacion);
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";
  const codigosCaja = parseCodigosCaja(resolvedSearchParams?.cajas);
  const cajas = await getEtiquetasCajaData({
    codigosDepositoGeneral: codigosCaja.length > 0 ? codigosCaja : undefined,
  });

  const noDataMessage =
    codigosCaja.length > 0
      ? "No hay etiquetas para las cajas solicitadas."
      : "No hay cajas registradas para imprimir etiquetas.";

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <EtiquetasCajaPrintStyles orientacion={orientacion} />
      {cajas.length === 0 ? (
        <EtiquetasCajaPrintEmptyState message={noDataMessage} />
      ) : (
        <main>
          {cajas.map((caja) => (
            <EtiquetaCajaPrintSheet
              key={`etiqueta-caja-${caja.codigoDepositoGeneral}`}
              caja={caja}
              orientacion={orientacion}
            />
          ))}
        </main>
      )}
    </>
  );
}
