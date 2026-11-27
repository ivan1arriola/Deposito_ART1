import { formatHojaEntregaDisplayDate } from "@/lib/hoja-entrega-sheet";

export function getCurrentHojaEntregaPrintDate() {
  return formatHojaEntregaDisplayDate(new Date());
}
