"use client";

import { EtiquetadoView } from "@/app/components/views/EtiquetadoView";
import type { EtiquetadoSectionProps } from "./types";

export function EtiquetadoSection(props: EtiquetadoSectionProps) {
  const {
    inEtiquetadoView,
    activeEtiquetadoSection,
    etiquetadoData,
    etiquetadoLoading,
    etiquetadoError,
    canWrite,
    reloadEtiquetadoData,
    createEtiquetadoItem,
    createEtiquetadoEstanteria,
    deleteEtiquetadoEstanteria,
    createEtiquetadoCodigoSIE,
    updateEtiquetadoCodigoSIE,
    deleteEtiquetadoCodigoSIE,
    createEtiquetadoCaja,
    deleteEtiquetadoCaja,
    printEtiquetaCaja,
    printListadoCajas,
    printTodasEtiquetas,
  } = props;

  if (!inEtiquetadoView || !activeEtiquetadoSection) return null;

  return (
    <EtiquetadoView
      section={activeEtiquetadoSection}
      data={etiquetadoData}
      loading={etiquetadoLoading}
      error={etiquetadoError}
      canWrite={canWrite}
      onReload={() => void reloadEtiquetadoData()}
      onCreateItem={(input) => void createEtiquetadoItem(input)}
      onCreateEstanteria={(codigo, piso) => void createEtiquetadoEstanteria(codigo, piso)}
      onDeleteEstanteria={(codigo, piso) => void deleteEtiquetadoEstanteria(codigo, piso)}
      onCreateCodigoSIE={(input) => void createEtiquetadoCodigoSIE(input)}
      onUpdateCodigoSIE={(input) => void updateEtiquetadoCodigoSIE(input)}
      onDeleteCodigoSIE={(codigoSIEId, codigo) =>
        void deleteEtiquetadoCodigoSIE(codigoSIEId, codigo)
      }
      onCreateCaja={(input) => void createEtiquetadoCaja(input)}
      onDeleteCaja={(codigoDepositoGeneral) => void deleteEtiquetadoCaja(codigoDepositoGeneral)}
      onPrintCaja={(codigoDepositoGeneral, orientacion) =>
        printEtiquetaCaja(codigoDepositoGeneral, orientacion)
      }
      onPrintListadoCajas={printListadoCajas}
      onPrintTodas={(cajas) => printTodasEtiquetas(cajas)}
    />
  );
}
