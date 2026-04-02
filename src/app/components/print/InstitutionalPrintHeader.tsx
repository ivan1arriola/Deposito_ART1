const INSTITUTION_LABEL = 'Grupo "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1';
const APP_LABEL = "Deposito General";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-UY", {
  timeZone: "America/Montevideo",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const INSTITUTIONAL_PRINT_HEADER_STYLES = `
  .institutional-print-header {
    margin: 0 0 2.8mm;
    padding: 0 0 1.8mm;
    border-bottom: 1px solid #000;
    display: grid;
    gap: 0.55mm;
  }

  .institutional-print-header-row {
    min-height: 4.2mm;
  }

  .institutional-print-header-left {
    text-align: left;
    font-size: 8.4pt;
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1.15;
  }

  .institutional-print-header-center {
    text-align: center;
    font-size: 17pt;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.05;
  }

  .institutional-print-header-right {
    text-align: right;
    font-size: 8.4pt;
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1.15;
  }

  .institutional-print-header--compact {
    margin-bottom: 2mm;
    padding-bottom: 1.2mm;
    gap: 0.3mm;
  }

  .institutional-print-header--compact .institutional-print-header-row {
    min-height: 3.2mm;
  }

  .institutional-print-header--compact .institutional-print-header-left,
  .institutional-print-header--compact .institutional-print-header-right {
    font-size: 7.2pt;
  }

  .institutional-print-header--compact .institutional-print-header-center {
    font-size: 13pt;
  }
`;

export function formatInstitutionalPrintDate(date = new Date()) {
  return `Montevideo, ${DATE_FORMATTER.format(date)}`;
}

export function InstitutionalPrintHeader({
  printedAt,
  compact = false,
}: {
  printedAt: string;
  compact?: boolean;
}) {
  const className = compact ? "institutional-print-header institutional-print-header--compact" : "institutional-print-header";

  return (
    <header className={className}>
      <div className="institutional-print-header-row institutional-print-header-left">{INSTITUTION_LABEL}</div>
      <div className="institutional-print-header-row institutional-print-header-center">{APP_LABEL}</div>
      <div className="institutional-print-header-row institutional-print-header-right">{printedAt}</div>
    </header>
  );
}
