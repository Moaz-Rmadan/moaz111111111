export interface BOMItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantityRequired: number;
  unit: string;
}

export interface BOM {
  id?: string;
  productName: string;
  productCode: string;
  items: BOMItem[];
  notes?: string;
}

export interface WorkCenter {
  id?: string;
  code: string;
  name: string;
  hourlyRate: number;
  isActive: boolean;
}

export type ProductionStageName = 'MATERIAL' | 'CUTTING' | 'CARPENTRY' | 'PAINTING' | 'UPHOLSTERY' | 'QUALITY' | 'PACKAGING' | 'FINISHED';

export interface ProductionStageMetrics {
  planned: number;
  actual: number;
  remaining: number;
  delayed: number;
  rejected: number;
  reworked: number;
}

export interface ProductionCosting {
  directMaterial: number;
  directLabor: number;
  machineCost: number;
  otherDirectCost: number;
  allocatedOverhead: number;
  reworkCost: number;
  scrapCost: number;
  actualProductionCost: number;
  grossProfit: number;
}

export interface ProductionOrder {
  id?: string;
  orderNumber: string;
  productId: string;
  productName: string;
  quantityRequested: number;
  quantityProduced: number;
  status: 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startDate?: string;
  dueDate?: string;
  bomId: string;
  routingId: string;
  notes?: string;
  wipMetrics?: Record<ProductionStageName, ProductionStageMetrics>;
  costing?: ProductionCosting;
  sellingPrice?: number;
}

export interface ProductionRouting {
  id?: string;
  name: string;
  stages: ProductionRoutingStage[];
}

export interface ProductionRoutingStage {
  id: string;
  name: string;
  workCenterId: string;
  durationMinutes: number;
}

export interface MaterialReservation {
  id?: string;
  productionOrderId: string;
  itemId: string;
  quantityReserved: number;
  quantityIssued: number;
}

export interface ProductionOperation {
  id?: string;
  productionOrderId: string;
  routingStageId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  startTime?: string;
  endTime?: string;
}

export interface ProductionLabor {
  id?: string;
  productionOrderId: string;
  operationId: string;
  employeeId: string;
  hours: number;
  cost: number;
}

export interface ProductionMachineTime {
  id?: string;
  productionOrderId: string;
  operationId: string;
  machineId: string;
  hours: number;
  cost: number;
}

export interface ProductionOverhead {
  id?: string;
  productionOrderId: string;
  description: string;
  amount: number;
}

export interface FinishedGood {
  id?: string;
  productionOrderId: string;
  itemId: string;
  quantity: number;
  date: string;
}

export interface ProductionScrap {
  id?: string;
  productionOrderId: string;
  itemId: string;
  quantity: number;
  reason: string;
}

export interface ProductionRework {
  id?: string;
  productionOrderId: string;
  operationId: string;
  description: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface ProductionJob {
  id?: string;
  jobCardNumber: string;
  productId?: string;
  productName: string;
  quantityRequested: number;
  quantityProduced?: number;
  status: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  notes?: string;
  bomId?: string;
  routingId?: string;
}
