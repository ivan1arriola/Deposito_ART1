import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { PrestamoEditPayload } from "@/app/components/views/FormulariosPrestamosView";
import type { MainView } from "@/types/views";
import type { OficialSuboficial, Personal } from "@/types/entities";
import type {
  EquipoForm,
  OficialSuboficialForm,
  PersonalAltaMovimientoForm,
  PersonalForm,
  PrestamoDraft,
  PrestamoDraftItem,
  StockOperacionDraft,
} from "@/types/forms";
import { EtiquetadoDashboardData } from "@/types/etiquetado";

export type CreationViewsProps = {
  activeView: string;
  ciPlaceholder: string;
  newPersonal: PersonalForm;
  duplicatePersonal: Personal | null;
  ciHasError: boolean;
  ciLooksValid: boolean;
  ciAlreadyExists: boolean;
  canRegisterPersonal: boolean;
  requiredPersonalCompleted: number;
  requiredPersonalFields: boolean[];
  canSubmitPersonal: boolean;
  creatingPersonal: boolean;
  rangos: Array<{ rangoId: number; abreviacion: string; nombreCompleto: string; orden: number }>;
  baterias: Array<{ bateriaId: number; nombre: string; orden: number }>;
  equiposActivos: Array<{ itemId: string; nombre: string; activo: boolean; ordenPdf: number }>;
  tallaOptionsByKey: Record<string, string[]>;
  maxFechaIngreso: string;
  newPersonalMovimientos: PersonalAltaMovimientoForm[];
  newPersonalMovimientoDraft: PersonalAltaMovimientoForm | null;
  newPersonalMovimientoEditIndex: number | null;
  setActiveView: Dispatch<SetStateAction<MainView>>;
  createPersonal: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateNewPersonalField: (field: keyof PersonalForm, value: string | boolean) => void;
  openNewPersonalMovimientoModal: () => void;
  closeNewPersonalMovimientoModal: () => void;
  saveNewPersonalMovimientoFromModal: () => void;
  editNewPersonalMovimiento: (index: number) => void;
  removeNewPersonalMovimiento: (index: number) => void;
  updateNewPersonalMovimientoDraft: (field: "tipo" | "fecha" | "comentarios", value: string) => void;
  updateNewPersonalMovimientoDraftItem: (itemIndex: number, field: "itemId" | "cantidad", value: string) => void;
  addNewPersonalMovimientoDraftItem: () => void;
  removeNewPersonalMovimientoDraftItem: (itemIndex: number) => void;
  editingOficialSuboficialCi: string | null;
  newOficialSuboficial: {
    ci: string;
    tipo: "OFICIAL" | "SUBOFICIAL";
    apellido1: string;
    apellido2: string;
    nombre1: string;
    nombre2: string;
    telefonoContacto: string;
    rangoId: string;
    PARKA: string;
    CAMISACO: string;
    PANTALON: string;
    KEPI: string;
    CALZADO: string;
  };
  duplicateOficialSuboficialLabel: string | null;
  oficialSuboficialCiLooksValid: boolean;
  oficialSuboficialCiAlreadyExists: boolean;
  canRegisterOficialSuboficial: boolean;
  oficialSuboficialRequiredCompleted: number;
  oficialSuboficialRequiredFields: boolean[];
  canSubmitOficialSuboficial: boolean;
  creatingOficialSuboficial: boolean;
  rangosOficialSuboficialDisponibles: Array<{ rangoId: number; abreviacion: string; nombreCompleto: string; orden: number }>;
  cancelOficialSuboficialForm: () => void;
  createOficialSuboficial: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateNewOficialSuboficialField: (field: keyof OficialSuboficialForm, value: string) => void;
  newEquipo: EquipoForm;
  loading: boolean;
  creatingEquipo: boolean;
  createEquipo: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  setNewEquipo: (updater: (prev: EquipoForm) => EquipoForm) => void;
  newBateria: string;
  newBateriaOrden: string;
  createBateria: () => Promise<void>;
  setNewBateria: (value: string) => void;
  setNewBateriaOrden: (value: string) => void;
  newRangoAbreviacion: string;
  newRangoNombreCompleto: string;
  newRangoOrden: string;
  createRango: () => Promise<void>;
  setNewRangoAbreviacion: (value: string) => void;
  setNewRangoNombreCompleto: (value: string) => void;
  setNewRangoOrden: (value: string) => void;
  isAdmin: boolean;
  newUserRangoId: string;
  rangosConfigView: Array<{ rangoId: number; abreviacion: string; nombreCompleto: string; orden: number; tipo?: "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL" }>;
  newNombre: string;
  newApellido: string;
  newUsername: string;
  newPassword: string;
  newPasswordConfirm: string;
  newMailReferencia: string;
  newRole: "ADMIN" | "EDITOR" | "READ_ONLY";
  createUsuario: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  setNewUserRangoId: (value: string) => void;
  setNewNombre: (value: string) => void;
  setNewApellido: (value: string) => void;
  setNewUsername: (value: string) => void;
  setNewPassword: (value: string) => void;
  setNewPasswordConfirm: (value: string) => void;
  setNewMailReferencia: (value: string) => void;
  setNewRole: (role: "ADMIN" | "EDITOR" | "READ_ONLY") => void;
  roleLabel: (role: "ADMIN" | "EDITOR" | "READ_ONLY" | null | undefined) => string;
  roleDescription: (role: "ADMIN" | "EDITOR" | "READ_ONLY" | null | undefined) => string;
  roleScope: (role: "ADMIN" | "EDITOR" | "READ_ONLY" | null | undefined) => string;
};

export type PersonnelAndSummaryViewsProps = {
  activeView: string;
  loading: boolean;
  personal: Personal[];
  personalFiltrado: Personal[];
  personalFiltradoPaginado: Personal[];
  baterias: Array<{ bateriaId: number; nombre: string; orden: number }>;
  rangos: Array<{ rangoId: number; abreviacion: string; nombreCompleto: string; orden: number }>;
  canWrite: boolean;
  isAdmin: boolean;
  searchCedula: string;
  searchApellidos: string;
  searchNombres: string;
  bateriaFilter: string;
  hasPersonalFilters: boolean;
  personalPage: number;
  personalPageSize: number;
  expandedTallasByCi: Record<string, boolean>;
  editPersonalCi: string | null;
  editPersonal: PersonalForm;
  tallaOptionsByKey: Record<string, string[]>;
  maxFechaIngreso: string;
  setSearchCedula: (value: string) => void;
  setSearchApellidos: (value: string) => void;
  setSearchNombres: (value: string) => void;
  setBateriaFilter: (value: string) => void;
  setPersonalPage: (value: number) => void;
  setPersonalPageSize: (value: number) => void;
  printAllDeliverySheets: () => Promise<void>;
  emailAllDeliverySheets: () => Promise<void>;
  cancelBulkDeliveryEmailJob: () => void;
  bulkDeliveryEmailBusy: boolean;
  bulkDeliveryEmailDisabledReason: string | null;
  printPersonnelByBattery: () => void;
  openMassRegistro: (tipo: "ENTREGA" | "DEVOLUCION") => void;
  setActiveView: Dispatch<SetStateAction<MainView>>;
  toggleTallas: (ci: string) => void;
  deletePersonal: (ci: string) => void;
  openRegistro: (ci: string, tipo: "ENTREGA" | "DEVOLUCION", options?: { incluirFueraDeHoja?: boolean }) => void;
  openPersonalObservacion: (persona: Personal) => Promise<void>;
  openRegistroViewer: (persona: Personal) => Promise<void>;
  openPersonaProfileFromPersonal: (persona: Personal) => Promise<void>;
  setFichaViewingCi: (ci: string | null) => void;
  startEditPersonal: (persona: Personal) => void;
  setEditPersonalCi: (ci: string | null) => void;
  setEditPersonal: (updater: (prev: PersonalForm) => PersonalForm) => void;
  EMPTY_PERSONAL_FORM: PersonalForm;
  updatePersonal: (ci: string) => Promise<void>;
  canPromoteEditPersonalToSuboficial: boolean;
  promotingSubalternoCi: string | null;
  promoteSargentoToSuboficial: (ci: string, adminPassword: string) => Promise<void>;
  openAscensoDeliverySheet: (ci: string) => boolean;
  oficialesSuboficiales: OficialSuboficial[];
  startEditOficialSuboficial: (registro: OficialSuboficial) => void;
  openOficialSuboficialCreate: (tipo: "OFICIAL" | "SUBOFICIAL") => void;
  openPersonaProfileFromOficialSuboficial: (registro: OficialSuboficial) => Promise<void>;
  reloadCurrentViewData: (showSpinner?: boolean) => Promise<void>;
  hojaMatrixData: import("@/types/views").HojaMatrixData | null;
  hojaMatrixLoading: boolean;
  hojaMatrixError: string | null;
  loadHojaMatrix: () => Promise<void>;
  equipoResumenData: import("@/types/views").EquipoResumenData | null;
  equipoResumenLoading: boolean;
  equipoResumenError: string | null;
  loadEquipoResumen: () => Promise<void>;
};

export type StockPrestamoViewsProps = {
  activeView: string;
  stockData: import("@/types/views").StockDashboardData | null;
  stockLoading: boolean;
  stockError: string | null;
  canWrite: boolean;
  isAdmin: boolean;
  equiposOrdenados: import("@/types/entities").Equipo[];
  stockDraft: StockOperacionDraft;
  stockSaving: boolean;
  maxFechaIngreso: string;
  setStockDraft: (updater: (prev: StockOperacionDraft) => StockOperacionDraft) => void;
  updateStockDraftItem: (index: number, field: "itemId" | "cantidad", value: string) => void;
  addStockDraftItem: () => void;
  removeStockDraftItem: (index: number) => void;
  saveStockOperation: () => Promise<void>;
  personal: import("@/types/entities").Personal[];
  oficialesSuboficiales: import("@/types/entities").OficialSuboficial[];
  prestamoDraft: PrestamoDraft;
  prestamoSaving: boolean;
  returningPrestamoId: string | null;
  setPrestamoDraft: (updater: (prev: PrestamoDraft) => PrestamoDraft) => void;
  updatePrestamoDraftItem: (index: number, field: keyof PrestamoDraftItem, value: string) => void;
  addPrestamoDraftItem: () => void;
  removePrestamoDraftItem: (index: number) => void;
  savePrestamo: (printAfterSave?: boolean) => Promise<void>;
  returnPrestamo: (
    prestamoId: string,
    fechaDevolucion: string,
    items?: Array<{ itemId: string; estadoDevolucion: "NUEVO" | "BUENO" | "REGULAR" | "MALO"; comentarioDevolucion?: string }>,
  ) => Promise<void>;
  reloadActiveStockData: () => Promise<void>;
  editingPrestamoId: string | null;
  editPrestamo: (prestamoId: string, payload: PrestamoEditPayload) => Promise<void>;
  deletePrestamo: (prestamoId: string) => Promise<void>;
  openPersonaProfileByCi: (ci: string) => Promise<boolean>;
};

export type EtiquetadoSectionProps = {
  inEtiquetadoView: boolean;
  activeEtiquetadoSection: "codigos_sie" | "listado_cajas" | "imprimir_todas" | null;
  etiquetadoData: EtiquetadoDashboardData | null;
  etiquetadoLoading: boolean;
  etiquetadoError: string | null;
  canWrite: boolean;
  reloadEtiquetadoData: () => Promise<void>;
  createEtiquetadoItem: (input: { nombre: string }) => Promise<void>;
  createEtiquetadoEstanteria: (nombreEstanteria: string, piso: number) => Promise<void>;
  deleteEtiquetadoEstanteria: (codigo: string, piso: number) => Promise<void>;
  createEtiquetadoCodigoSIE: (input: { codigo: string; talla: string; itemId: string; allowDuplicateCodigo?: boolean }) => Promise<void>;
  updateEtiquetadoCodigoSIE: (input: { originalCodigoSIEId: string; originalCodigo: string; codigo: string; talla: string; itemId: string }) => Promise<void>;
  deleteEtiquetadoCodigoSIE: (codigoSIEId: string, codigo: string) => Promise<void>;
  createEtiquetadoCaja: (input: {
    codigoDepositoGeneral: number;
    estanteria: string;
    piso: number;
    items: Array<{ itemId: string; cantidad: number }>;
    codigosSIEIds: string[];
  }) => Promise<void>;
  deleteEtiquetadoCaja: (codigoDepositoGeneral: number) => Promise<void>;
  printEtiquetaCaja: (codigoDepositoGeneral: number, orientacion: "horizontal" | "vertical") => void;
  printListadoCajas: () => void;
  printTodasEtiquetas: (cajas: Array<{ codigoDepositoGeneral: number; orientacion: "horizontal" | "vertical" }>) => void;
};

export type HomeViewRouterProps = CreationViewsProps &
  PersonnelAndSummaryViewsProps &
  StockPrestamoViewsProps &
  EtiquetadoSectionProps;
