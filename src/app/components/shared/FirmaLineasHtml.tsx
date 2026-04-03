import type { CSSProperties } from "react";
import {
  type FirmaLinea,
  getFirmaLineBaseIndentCss,
  getFirmaLineInlineOffsetCss,
} from "@/lib/firma-lineas";

type FirmaLineasHtmlProps = {
  lineas: FirmaLinea[];
  lineClassName: string;
  lineStrongClassName: string;
  keyPrefix?: string;
};

export function FirmaLineasHtml({
  lineas,
  lineClassName,
  lineStrongClassName,
  keyPrefix = "firma",
}: FirmaLineasHtmlProps) {
  return (
    <>
      {lineas.map((linea, index) => {
        const hasInlineOffset = (linea.inlineOffsetChars ?? 0) > 0;
        const lineStyle: CSSProperties = {
          marginLeft: getFirmaLineBaseIndentCss(linea),
        };
        const spacerStyle: CSSProperties = {
          display: "inline-block",
          width: getFirmaLineInlineOffsetCss(linea),
        };

        return (
          <div
            key={`${keyPrefix}-${linea.key}-${index}`}
            className={linea.isBold ? `${lineClassName} ${lineStrongClassName}` : lineClassName}
            style={lineStyle}
          >
            {hasInlineOffset ? <span aria-hidden="true" style={spacerStyle} /> : null}
            <span>{linea.text}</span>
          </div>
        );
      })}
    </>
  );
}
