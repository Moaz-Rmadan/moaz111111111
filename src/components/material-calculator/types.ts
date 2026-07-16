export interface WoodCalculation {
  id: string;
  type: 'plank' | 'log';
  woodType: string;
  dimensionUnit: 'cm' | 'inch';
  thickness: number;
  width: number;
  length: number;
  girth?: number;
  diameter?: number;
  logMethod?: 'hoppus' | 'cylinder';
  density: number;
  quantity: number;
  pricePerM3: number;
  volumeM3: number;
  weightKg: number;
  totalCost: number;
  label: string;
}

export interface MarbleCalculation {
  id: string;
  type: 'slab' | 'linear';
  stoneType: string;
  length: number;
  width?: number;
  thicknessCm: number;
  quantity: number;
  pricePerUnit: number;
  cuttingRate: number;
  polishingRate: number;
  installRate: number;
  wastePercent: number;
  netQty: number;
  grossQty: number;
  weightKg: number;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  label: string;
}

export interface GlassCalculation {
  id: string;
  type: 'plain' | 'tinted' | 'securit' | 'double';
  thicknessMm: number;
  length: number;
  width: number;
  quantity: number;
  pricePerM2: number;
  bevelingRate: number;
  boringRate: number;
  boringCount: number;
  netAreaM2: number;
  weightKg: number;
  perimeterM: number;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  label: string;
}

export interface PlywoodPart {
  id: string;
  label: string;
  width: number;
  length: number;
  quantity: number;
}

export interface PlywoodCalculation {
  id: string;
  sheetWidth: number;
  sheetLength: number;
  sheetPrice: number;
  parts: PlywoodPart[];
  cuttingGapMm: number;
  wasteMarginMm: number;
  estimatedSheets: number;
  totalNetAreaM2: number;
  totalSheetAreaM2: number;
  utilizationPercent: number;
  totalCost: number;
}

export interface EstimationProject {
  id?: string;
  projectName: string;
  clientName: string;
  date: string;
  woodCalcs: WoodCalculation[];
  marbleCalcs: MarbleCalculation[];
  glassCalcs: GlassCalculation[];
  plywoodCalcs: PlywoodCalculation | null;
  totalCost: number;
  notes: string;
}
