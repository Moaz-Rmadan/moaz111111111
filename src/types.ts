export interface Showroom {
  id: string;
  name: string;
  location: string;
  managerName: string;
}

export interface ShowroomInventory {
  id: string;
  showroomId: string;
  itemId: string; // يشير إلى الـ ProductionJob أو المنتج النهائي
  quantity: number;
  costPrice: number; // التكلفة الحقيقية من المصنع
}

export interface TransferOrder {
  id: string;
  date: string;
  fromWarehouse: string; // المصنع
  toShowroomId: string; // المعرض
  items: {
    itemId: string;
    quantity: number;
    costPrice: number;
  }[];
  notes: string;
  status: 'تم التحويل' | 'تم الاستلام';
}

export interface BOMItem {
  itemId: string;
  quantity: number;
}

export interface WorkCenter {
  id: string;
  name: string;
  hourlyRate: number; // تكلفة الساعة في هذا المركز
}

export interface ManufacturingOperation {
  id: string;
  jobId: string;
  workCenterId: string;
  stageName: string; // مثال: تقطيع، تجميع، دهان
  startTime: string;
  endTime: string;
  actualDurationHours: number;
}

export interface BOM {
  id: string;
  productId: string;
  items: BOMItem[];
  totalExpectedMaterialCost: number;
}

export interface LostSale {
  id: string;
  date: string;
  showroomId: string;
  productName: string;
  notes: string;
}

export interface SalesOrder {
  id: string;
  date: string;
  showroomId: string;
  customerName: string;
  customerPhone: string;
  items: {
    jobId: string; // الربط المباشر مع أمر الإنتاج لسحب التكاليف
    sellingPrice: number;
    cogs: number; // تكلفة المصنع (مباشرة)
    logisticsCost: number; // مصاريف النقل والتركيب
    commission: number; // عمولات
  }[];
  totalAmount: number;
  totalCOGS: number; // إجمالي التكلفة المباشرة
  totalLogisticsCost: number;
  totalCommission: number;
  operationalOverheadRate: number; // نسبة التحميل الإداري (مثلاً 0.15 للمصاريف التشغيلية)
  totalOperationalOverhead: number; // المبلغ الفعلي للمصاريف التشغيلية
  netProfit: number; // صافي الربح الحقيقي
  paymentMethod: 'نقدي' | 'شبكة' | 'تحويل بنكي';
  notes: string;
}

export interface Item {
  id: string;
  name: string;
  unit: string;
  price: number;
  department: string;
  category: string;
  warehouseId: string;
  openingBalance: number;
  inward: number;
  outward: number;
  returned: number;
  wasted: number;
  currentBalance: number;
  totalValue: number;
  safetyLimit: number;
}

export interface Waste {
  id: string;
  date: string;
  itemId: string;
  quantity: number;
  unit: string;
  reason: string;
  notes: string;
}

export interface Warehouse {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  name: string;
}

export interface CostCenter {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  totalPurchases: number;
  totalPayments: number;
  balance: number;
  openingBalance: number;
}

export interface Purchase {
  id: string;
  date: string;
  supplierId: string;
  itemId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  paidAmount: number;
  paymentStatus: 'آجل' | 'نقدي' | 'شيك';
  notes: string;
  safeId?: string; // الخزنة التي تم الدفع منها
  safeTransactionId?: string; // رقم الحركة المالية المرتبطة
}

export interface Issuance {
  id: string;
  date: string;
  jobOrderNo: string;
  itemId: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  costCenter: string;
}

export interface ProductionJob {
  id: string;
  orderNo: string;
  clientName: string;
  productName: string;
  salesPerson?: string; // اسم السيلز
  isCustom?: boolean; // طلب مخصوص
  components?: string; // مكونات الغرفة
  referenceImage?: string; // صورة المرجع
  woodType?: string; // نوع الخشب
  dimensions?: string; // المقاسات
  paintColor?: string; // لون الدهان
  fabricType?: string; // نوع القماش
  upholsteryDetails?: string; // تفاصيل التنجيد
  technicalSpecs?: string; // المواصفات الفنية / تفاصيل التصنيع
  cuttingListUrl?: string; // رابط كشف التقطيع
  sellingPrice?: number; // سعر البيع
  estimatedCost?: number; // التكلفة التقديرية (المقايسة)
  contractDate?: string; // تاريخ التعاقد
  startDate: string;
  deadline: string;
  status: string; // This will be the CostCenter ID or name
  workflowStep?: number; // مسار العمل
  priority: 'منخفضة' | 'متوسطة' | 'عالية';
  qualityStatus?: 'pending' | 'approved' | 'failed'; // حالة الجودة
  qualityNotes?: string;
  notes: string;
  totalMaterialCost?: number;
  totalLaborCost?: number;
  totalOtherCost?: number;
  readyForDelivery?: boolean; // جاهز للتسليم
}

export interface JobLabor {
  id: string;
  jobId: string;
  employeeId: string;
  stage: string;
  date: string;
  hours: number;
  rate: number;
  total: number;
  notes: string;
}

export interface JobOtherCost {
  id: string;
  jobId: string;
  stage: string;
  date: string;
  description: string;
  amount: number;
  notes: string;
}

export interface LoadingManifest {
  id: string;
  date: string;
  driverName: string;
  carNumber: string;
  destinationType: 'عميل' | 'معرض';
  clientName: string; // Can be "المعرض" or actual client name
  orderNumbers: string; // Can be multiple orders comma separated or just text
  products: {
    name: string;
    components: string;
    notes: string;
    salesPerson: string;
    additions: string;
  }[];
  loaderName: string;
  notes: string;
  createdAt?: any;
}

export interface BladeSharpening {
  id: string;
  date: string;
  bladeName: string;
  quantity: number;
  cost: number;
  notes: string;
  safeId?: string;
  safeTransactionId?: string;
}

export interface PlateSharpening {
  id: string;
  date: string;
  plateName: string;
  quantity: number;
  cost: number;
  notes: string;
  safeId?: string;
  safeTransactionId?: string;
}

export interface MaintenanceOrder {
  id: string;
  type: 'معدة/ماكينة' | 'سن صواني' | 'سن صفايح' | 'أخرى';
  itemName: string;
  costCenterId: string;
  receiveDate: string;
  externalCenterName: string;
  sendDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  cost: number;
  status: 'جاري الصيانة' | 'مكتملة';
  notes: string;
  safeId?: string;
  safeTransactionId?: string;
}

export interface MachineMaintenance {
  id: string;
  date: string;
  machineName: string;
  maintenanceType: string;
  cost: number;
  notes: string;
  safeId?: string;
  safeTransactionId?: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  department?: string;
  dailyRate: number;
  hourlyRate?: number;
  payMethod: 'daily' | 'production';
  pieceRate?: number;
  phone?: string;
  hireDate: string;
  status: 'نشط' | 'موقوف' | 'مستقيل';
  shiftStart?: string;
  shiftEnd?: string;
  baseSalary?: number;
  productionGroup?: 'A' | 'B' | '';
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'حضور' | 'غياب' | 'تأخير' | 'إجازة';
}

export interface FinancialTransaction {
  id: string;
  employeeId: string;
  date: string;
  type: 'مكافأة' | 'خصم' | 'بدل' | 'إضافي' | 'مصروف' | 'خصم سلف' | 'أوفرتايم' | 'مكافآت' | 'سلفة' | 'عهدة' | 'سلفة مستردة' | 'جزاء';
  amount: number;
  description: string;
  overtimeHours?: number;
  overtimeRate?: 1.33 | 1.5 | 2;
}

export interface Loan {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  remainingAmount: number;
  installments?: number;
  paidAlready?: number;
  notes?: string;
  status: 'نشط' | 'مسدد';
}

export interface ProductionRecord {
  id: string;
  employeeId: string;
  date: string;
  itemName: string;
  quantity: number;
  rate: number;
  total: number;
  contractorName?: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  dailyRate: number;
  daysWorked: number;
  baseSalary: number;
  totalBonuses: number;
  totalOvertime: number;
  totalProduction: number;
  totalDeductions: number;
  totalExpenses: number;
  totalLoans: number;
  netSalary: number;
  status: 'مسودة' | 'مدفوع';
  paymentDate?: string;
  payMethod?: 'daily' | 'production';
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  date: string;
  amount: number;
  paymentMethod: 'نقدي' | 'شيك' | 'تحويل بنكي';
  referenceNumber?: string;
  notes: string;
}

export interface DeliveryReceipt {
  id: string;
  date: string;
  receiptNumber: string;
  orderNumber: string;
  clientName: string;
  salesPerson: string;
  deliveryTeam: string;
  branch: string;
  address?: string;
  phone?: string;
  nationalId?: string;
  products: {
    name: string;
    quantity: number;
    notes?: string;
  }[];
  productRating?: 'مقبول' | 'جيد' | 'جيد جداً' | 'ممتاز';
  teamRating?: 'مقبول' | 'جيد' | 'جيد جداً' | 'ممتاز';
  notes?: string;
  createdAt?: any;
}

export interface StockAudit {
  id: string;
  date: string;
  warehouseId: string;
  auditItems: {
    itemId: string;
    itemName: string;
    systemStock: number;
    actualStock: number;
    difference: number;
  }[];
  notes: string;
  createdBy: string;
}

export type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | undefined;
    providerInfo: any[];
  };
}

export interface RecipeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  type?: 'material' | 'labor' | 'overhead'; // Odoo-style classification
}

export interface DepartmentRecipe {
  departmentId: string;
  departmentName: string;
  items: RecipeItem[];
  totalCost: number;
  notes?: string;
}

export interface ProductRecipe {
  id: string;
  name: string;
  category: 'نوم' | 'سفرة' | 'انتريه' | 'أخرى';
  departments: DepartmentRecipe[];
  totalEstimatedCost: number;
  lastUpdated: string;
  costingMethod?: 'standard' | 'avco' | 'latest'; // Odoo valuation costing method
  sellingPrice?: number; // Target or actual selling price
  indirectOverheadPercent?: number; // Indirect cost percentage (rent, electricity, etc.)
  wasteOverheadPercent?: number; // Scrap/waste rate
  targetMarginPercent?: number; // Margin target
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  isAdmin: boolean;
  permissions: {
    dashboard: boolean;
    inventory: boolean;
    production: boolean;
    maintenance: boolean;
    purchases: boolean;
    hr: boolean;
    reports: boolean;
    suppliers: boolean;
    settings: boolean;
    finance: boolean;
    sales: boolean;
    canDelete: boolean;
  };
}

export interface Safe {
  id: string;
  name: string;
  balance: number;
  type?: 'خزنة رئيسية' | 'عهدة موظف' | 'بنك';
}

export interface SafeAudit {
  id: string;
  safeId: string;
  date: string;
  systemBalance: number;
  physicalBalance: number;
  difference: number;
  notes: string;
  createdBy: string;
}

export interface SafeSettlement {
  id: string;
  safeId: string;
  date: string;
  totalAmount: number;
  notes: string;
  expenses: SettledExpense[];
  createdBy: string;
  safeTransactionId?: string;
}

export interface SettledExpense {
  description: string;
  category: string;
  amount: number;
  date: string;
  costCenterId?: string;
  productionJobId?: string; // ربط المصروف بأمر إنتاج معين
  driverId?: string; // ربط بالسائق (Employee)
  manifestId?: string; // ربط ببيان تحميل معين (LoadingManifest)
}

export interface SafeTransaction {
  id: string;
  safeId: string;
  date: string;
  type: 'إيداع' | 'سحب' | 'تحويل' | 'مصروفات' | 'مبيعات' | 'مشتريات' | 'رواتب' | 'قرض شخصي' | 'سداد قرض' | 'جرد' | 'أخرى';
  amount: number;
  description: string;
  relatedId?: string; // Used for Transfer (destination safeId), Purchase ID, or other related entity
  costCenterId?: string; // لربط المصروف بمركز تكلفة معين (معرض، مصنع، إلخ)
  productionJobId?: string; // ربط المصروف بأمر إنتاج معين للدراسة التكاليفية
  driverId?: string; // ربط المصروف بسائق معين
  manifestId?: string; // ربط المصروف ببيان تحميل معين
  category?: string;
  createdBy: string;
}

export interface CompanySettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId?: string;
  logoUrl?: string;
  managerName?: string;
}
