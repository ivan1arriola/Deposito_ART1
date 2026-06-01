import fs from 'fs';
import path from 'path';

const DIRS_TO_SCAN = ['src', 'tests', 'prisma'];
const EXTENSIONS = ['.ts', '.tsx', '.sql', '.prisma'];

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'generated') {
        walk(filePath, fileList);
      }
    } else {
      if (EXTENSIONS.some(ext => filePath.endsWith(ext))) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const allFiles = DIRS_TO_SCAN.flatMap(dir => walk(dir));

let filesModified = 0;

function replaceContent(content) {
  let newContent = content;

  const replacements = [
    { regex: /\bitem_id\b/g, to: 'equipo_id' },
    { regex: /\bitemId\b/g, to: 'equipoId' },
    { regex: /\bItemId\b/g, to: 'EquipoId' },
    { regex: /\bitem_codigo_sie\b/g, to: 'equipo_codigo_sie' },
    { regex: /\bitemCodigoSie\b/g, to: 'equipoCodigoSie' },
    { regex: /\bItemCodigoSie\b/g, to: 'EquipoCodigoSie' },
    { regex: /\bitemCodigosSIE\b/g, to: 'equipoCodigosSIE' },
    { regex: /\bItemCodigosSIE\b/g, to: 'EquipoCodigosSIE' },
    { regex: /\btipo_item\b/g, to: 'tipo_equipo' },
    { regex: /\btipoItem\b/g, to: 'tipoEquipo' },
    { regex: /\bTipoItem\b/g, to: 'TipoEquipo' },
    { regex: /\bcaja_item\b/g, to: 'caja_equipo' },
    { regex: /\bcajaItem\b/g, to: 'cajaEquipo' },
    { regex: /\bCajaItem\b/g, to: 'CajaEquipo' },
    { regex: /\bcaja_item_codigo_sie\b/g, to: 'caja_equipo_codigo_sie' },
    { regex: /\bcajaItemCodigoSie\b/g, to: 'cajaEquipoCodigoSie' },
    { regex: /\bCajaItemCodigoSie\b/g, to: 'CajaEquipoCodigoSie' },
    { regex: /\bstock_operacion_item\b/g, to: 'stock_operacion_equipo' },
    { regex: /\bstockOperacionItem\b/g, to: 'stockOperacionEquipo' },
    { regex: /\bStockOperacionItem\b/g, to: 'StockOperacionEquipo' },
    { regex: /\bmovimiento_item\b/g, to: 'movimiento_equipo' },
    { regex: /\bmovimientoItem\b/g, to: 'movimientoEquipo' },
    { regex: /\bMovimientoItem\b/g, to: 'MovimientoEquipo' },
    { regex: /\bItemConfig\b/g, to: 'EquipoConfig' },
    { regex: /\bItemForm\b/g, to: 'EquipoForm' },
    { regex: /\bRegistroDraftItem\b/g, to: 'RegistroDraftEquipo' },
    { regex: /\bHojaMatrixItem\b/g, to: 'HojaMatrixEquipo' },
    { regex: /\bPrestamoDraftItem\b/g, to: 'PrestamoDraftEquipo' },
    { regex: /\bPrestamoItem\b/g, to: 'PrestamoEquipo' },
    { regex: /\bEtiquetadoItem\b/g, to: 'EtiquetadoEquipo' },
    { regex: /\bStockOperacionDraftItem\b/g, to: 'StockOperacionDraftEquipo' },
    { regex: /\bPersonalAltaMovimientoItemForm\b/g, to: 'PersonalAltaMovimientoEquipoForm' },
    { regex: /\bEMPTY_ITEM_FORM\b/g, to: 'EMPTY_EQUIPO_FORM' },
    { regex: /\buseStockPrestamoDraftItems\b/g, to: 'useStockPrestamoDraftEquipos' },
    { regex: /\bitemNombre\b/g, to: 'equipoNombre' },
    { regex: /\bitemNombres\b/g, to: 'equipoNombres' },
    { regex: /\bitemCount\b/g, to: 'equipoCount' },
    { regex: /\bitemIndex\b/g, to: 'equipoIndex' },
    { regex: /\bitemColumnWidth\b/g, to: 'equipoColumnWidth' },
    { regex: /\bitemUpdate\b/g, to: 'equipoUpdate' },
    { regex: /\bitemUpdates\b/g, to: 'equipoUpdates' },
    { regex: /\bitemsSummary\b/g, to: 'equiposSummary' },
    { regex: /\bitemChanges\b/g, to: 'equipoChanges' },
    { regex: /\bitemCallbacks\b/g, to: 'equipoCallbacks' },
    { regex: /\bonRemoveItem\b/g, to: 'onRemoveEquipo' },
    { regex: /\bsetItems\b/g, to: 'setEquipos' },
    { regex: /\bitemIdAntes\b/g, to: 'equipoIdAntes' },
    { regex: /\bitemIdDespues\b/g, to: 'equipoIdDespues' },
    { regex: /\bitemNombreAntes\b/g, to: 'equipoNombreAntes' },
    { regex: /\bitemNombreDespues\b/g, to: 'equipoNombreDespues' },
    { regex: /\bseenItemIds\b/g, to: 'seenEquipoIds' },
    { regex: /\bexistingItemsById\b/g, to: 'existingEquiposById' },
    { regex: /\bexistingItem\b/g, to: 'existingEquipo' },
    { regex: /\btargetItemId\b/g, to: 'targetEquipoId' },
    { regex: /\bitemIdKey\b/g, to: 'equipoIdKey' },
    { regex: /\bitemIdSet\b/g, to: 'equipoIdSet' },
    { regex: /\bitemNameById\b/g, to: 'equipoNameById' },
    { regex: /\bitemsModificados\b/g, to: 'equiposModificados' },
    { regex: /\bitemsFound\b/g, to: 'equiposFound' },
    { regex: /\bdevolucionInputByItemId\b/g, to: 'devolucionInputByEquipoId' },
    { regex: /\bbuildItemChanges\b/g, to: 'buildEquipoChanges' },
    { regex: /\bsetItemTraceDialog\b/g, to: 'setEquipoTraceDialog' },
    { regex: /\bsetItemTraceLoading\b/g, to: 'setEquipoTraceLoading' },
    { regex: /\bsetItemTraceError\b/g, to: 'setEquipoTraceError' },
    // Finally replace the base word "item" and "items" ONLY when they are exact words, keeping cases.
    { regex: /\bitem\b/g, to: 'equipo' },
    { regex: /\bItem\b/g, to: 'Equipo' },
    { regex: /\bITEM\b/g, to: 'EQUIPO' },
    { regex: /\bitems\b/g, to: 'equipos' },
    { regex: /\bItems\b/g, to: 'Equipos' },
    { regex: /\bITEMS\b/g, to: 'EQUIPOS' },
  ];

  for (const { regex, to } of replacements) {
    newContent = newContent.replace(regex, to);
  }

  return newContent;
}

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = replaceContent(content);
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    filesModified++;
  }
}

console.log(`Content replaced in ${filesModified} files.`);

function renameFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'generated') {
        renameFilesRecursively(filePath);
      }
    }
    
    let newFileName = file;
    newFileName = newFileName.replace(/Item/g, 'Equipo');
    newFileName = newFileName.replace(/item/g, 'equipo');
    
    if (file !== newFileName) {
      const newFilePath = path.join(dir, newFileName);
      fs.renameSync(filePath, newFilePath);
      console.log(`Renamed: ${filePath} -> ${newFilePath}`);
    }
  }
}

for (const dir of DIRS_TO_SCAN) {
  renameFilesRecursively(dir);
}
console.log('File renaming completed.');
