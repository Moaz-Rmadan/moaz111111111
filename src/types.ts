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
  status?: string; // available or pending_receipt
  transferOrderId?: string;
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
  totalTips?: number; // إكراميات السيلز
  salesPersonId?: string; // الموظف المسؤول عن البيع
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
  manufactureTarget?: string; // لصنع ماذا بالضبط
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

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  initialBalance: number;
  balance: number;
  status: 'نشط' | 'مغلق';
  createdAt?: any;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  type: 'إيداع' | 'سحب' | 'تحويل' | 'عمولة' | 'شيك';
  amount: number;
  description: string;
  relatedId?: string; // ID of check or transfer or safe transaction
  referenceNumber?: string;
  createdBy: string;
  createdAt?: any;
}

export interface BankCheck {
  id: string;
  type: 'وارد' | 'صادر';
  checkNumber: string;
  bankName: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  beneficiary: string; // From (for Incoming) or To (for Outgoing)
  status: 'قيد الانتظار' | 'تم التحصيل' | 'مرفوض' | 'ملغى';
  accountId?: string; // Bank account associated
  notes?: string;
  createdBy: string;
  createdAt?: any;
}

// --- Manufacturing & Production ---

export interface ProductionStage {
  id: string;
  name: string;
  code: string;
  order: number;
  departmentId?: string;
  supervisorId?: string;
  standardTimeMinutes: number;
  isMandatory: boolean;
  allowParallel: boolean;
  nextStageId?: string;
  failReturnStageId?: string; // Where to go if quality fails
  type: 'manual' | 'machine' | 'quality' | 'packing';
}

export interface ProductionRoute {
  id: string;
  name: string;
  description?: string;
  stages: ProductionStage[];
  targetProductId?: string;
  createdAt: any;
}

export interface ManufacturingOrder {
  id: string;
  moNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  routeId: string;
  startDate: string;
  dueDate: string;
  status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
  currentStageId?: string;
  priority: 'normal' | 'high' | 'urgent';
  notes?: string;
  createdBy: string;
  createdAt: any;
}

export interface WorkOrder {
  id: string;
  woNumber: string;
  moId: string;
  moNumber: string;
  stageId: string;
  stageName: string;
  productId: string;
  productName: string;
  quantity: number;
  operatorId?: string;
  operatorName?: string;
  startTime?: any;
  endTime?: any;
  actualDurationMinutes?: number;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  progress: number; // 0-100
  notes?: string;
  images?: string[];
  attachments?: string[];
  qualityStatus?: 'pending' | 'pass' | 'fail' | 'rework' | 'scrap';
  delayReason?: string;
  createdAt: any;
}

export interface QualityInspection {
  id: string;
  woId: string;
  moId: string;
  inspectorId: string;
  date: any;
  result: 'pass' | 'fail' | 'rework' | 'scrap';
  defects?: string[];
  comments?: string;
  attachments?: string[];
}

export interface PackingRecord {
  id: string;
  moId: string;
  woId: string;
  itemCount: number;
  cartonCount: number;
  totalWeight: number;
  dimensions: { length: number; width: number; height: number };
  qrCode?: string;
  barcode?: string;
  packedBy: string;
  packedAt: any;
  notes?: string;
}

export interface ProductionLog {
  id: string;
  moId: string;
  woId?: string;
  type: 'status_change' | 'quality_result' | 'operator_change' | 'delay';
  description: string;
  timestamp: any;
  userId: string;
}

export interface ProductionMachine {
  id: string;
  name: string;
  code: string;
  status: 'available' | 'maintenance' | 'busy' | 'offline';
  capacityPerDay: number;
  lastMaintenanceDate?: string;
}

export interface ProductionTeam {
  id: string;
  name: string;
  supervisorId: string;
  memberIds: string[];
}

export interface ProductionRouteStage extends ProductionStage {
  routeId: string;
}

export interface WorkOrderEmployee {
  woId: string;
  employeeId: string;
  employeeName: string;
  startTime: any;
  endTime?: any;
}

export interface ProductionTracking {
  id: string;
  moId: string;
  currentStageId: string;
  currentResponsibleId: string; // Team or Employee
  entryTime: any;
  estimatedExitTime: any;
  delayStatus: 'on_track' | 'delayed';
  delayReason?: string;
}

export interface ProductionTransferOrder {
  id: string;
  toNumber: string;
  fromWarehouse: string;
  toWarehouse: string;
  moId?: string;
  items: { productId: string; productName: string; quantity: number }[];
  status: 'pending' | 'shipped' | 'received';
  createdAt: any;
}

export interface DeliveryOrder {
  id: string;
  doNumber: string;
  customerId: string;
  customerName: string;
  moId?: string;
  items: { productId: string; productName: string; quantity: number }[];
  status: 'pending' | 'delivered';
  createdAt: any;
}

export interface Department {
  id: string;
  name: string;
  managerId?: string;
  parentId?: string; // For sub-departments
  description?: string;
  createdAt?: any;
}

export interface JobPosition {
  id: string;
  title: string;
  departmentId?: string;
  description?: string;
  requirements?: string;
  baseSalaryRange?: { min: number; max: number };
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  jobId?: string;
  department?: string;
  departmentId?: string;
  managerId?: string; // For org structure
  dailyRate: number;
  hourlyRate?: number;
  payMethod: 'daily' | 'production';
  pieceRate?: number;
  phone?: string;
  email?: string;
  hireDate: string;
  status: 'نشط' | 'موقوف' | 'مستقيل';
  shiftStart?: string;
  shiftEnd?: string;
  baseSalary?: number;
  commissionRate?: number; // % commission if applicable
  allowances?: number; // Badalat
  productionGroup?: 'A' | 'B' | '';
  address?: string;
  nationalId?: string;
  documents?: { name: string; url: string; date: string }[];
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'حضور' | 'غياب' | 'تأخير' | 'إجازة';
  isExcused?: boolean;
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

export interface LoanPayment {
  date: string;
  amount: number;
  type: 'initial' | 'payroll' | 'manual';
  notes?: string;
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
  deductionMode?: 'auto_percentage' | 'auto_installment' | 'manual';
  payments?: LoanPayment[];
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
  monthNumber?: number; // For showroom (monthly)
  weekNumber?: number; // For factory (weekly)
  year: number;
  startDate: string;
  endDate: string;
  dailyRate: number;
  daysWorked: number;
  baseSalary: number;
  totalCommission: number; // عمولات المبيعات
  totalTips: number; // إكراميات
  totalBonuses: number;
  totalOvertime: number;
  totalProduction: number;
  totalDeductions: number;
  totalExpenses: number;
  totalLoans: number;
  netSalary: number;
  status: 'مسودة' | 'مدفوع';
  paymentDate?: string;
  payMethod?: 'daily' | 'production' | 'monthly';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  roomId: string; // 'global' or 'direct_{id1}_{id2}'
  attachments?: {
    url: string;
    type: 'image' | 'file';
    name: string;
  }[];
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'global' | 'direct';
  participants: string[]; // employee IDs
  lastMessage?: string;
  lastTimestamp?: string;
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
  phone?: string;
  password?: string;
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
    vehicles: boolean;
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
  accountId?: string; // لربط المصروف او الايراد بحساب معين من شجرة الحسابات
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
  numberSystem?: 'western' | 'eastern'; // نظام عرض الأرقام: غربي (123) أو شرقي (١٢٣)
  currencyStyle?: 'standard' | 'badge' | 'abbreviated'; // نمط عرض العملة
  currencySymbol?: string; // رمز العملة (مثال: ج.م، ر.س، د.إ)
  vatRate?: number; // نسبة ضريبة القيمة المضافة %
  defaultProfitMargin?: number; // هامش الربح الافتراضي %
  defaultScrapTolerance?: number; // نسبة الهدر المسموح بها %
  laborHourlyRate?: number; // تكلفة ساعة العمل الافتراضية
  overtimeMultiplier?: number; // مضاعف ساعة العمل الإضافي
  lowStockThreshold?: number; // حد الإنذار بنقص المخزون
  invoiceFooterNote?: string; // تذييل الفواتير المطبوعة
  invoiceTerms?: string; // شروط وأحكام الفاتورة
  deductLateArrival?: boolean; // تفعيل خصم التأخر
  deductEarlyDeparture?: boolean; // تفعيل خصم الانصراف المبكر
}

export interface ByproductSale {
  id: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  materialType: 'نشارة' | 'كسر خشب' | 'خردة حديد' | 'مخلفات عامة' | 'أخرى';
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'مسدد بالكامل' | 'غير مسدد' | 'مسدد جزئياً';
  safeId?: string;
  notes?: string;
  scheduledPayments?: {
    id: string;
    dueDate: string;
    amount: number;
    status: 'pending' | 'collected';
    collectedDate?: string;
    collectedSafeId?: string;
    safeTransactionId?: string;
  }[];
}


export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  type: 'أفراد' | 'شركات' | 'مقاولين' | 'تجار' | 'مهندسين ديكور';
  status: 'نشط' | 'غير نشط' | 'محتمل' | 'محظور';
  balance: number; // Positive means they owe us (debt), negative means they paid in advance (credit)
  creditLimit?: number; // Maximum debt allowed
  taxId?: string; // For companies
  notes?: string;
  createdAt: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  paymentMethod: 'نقدي' | 'شيك' | 'تحويل بنكي' | 'فيزا';
  referenceNumber?: string;
  safeId?: string; // The safe where money was deposited
  safeTransactionId?: string;
  notes: string;
}

export interface FurnitureWorkOrder {
  id: string;
  orderNumber: string; // رقم أمر الشغل
  customerId: string;
  customerName: string;
  roomCode: string; // كود الغرفة / اسم الموديل (كود افتراضي أو رئيسي)
  contractDate: string;
  deliveryDate: string;
  salesPerson?: string; // اسم مسؤول المبيعات (السيلز)
  salesPersonId?: string; // معرف الموظف (لربط العمولات)
  contractNumber?: string; // رقم العقد
  isContracted?: boolean; // هل تم تحويله لعقد؟
  contractManagerId?: string; // المدير الذي اعتمد العقد
  contractImage?: string; // صورة العقد المعتمد
  tipAmount?: number; // إكراميات السيلز المخصصة لهذا الأوردر
  attachmentImage?: string; // صورة أمر الشغل (مرفق)
  
  // البنود/الغرف المتعددة
  rooms?: {
    roomCode: string;
    generalSpecs: string;
    dimensionsAndStructure: string;
    paintSpecs: string;
    upholsterySpecs: string;
    status?: string;
  }[];
  
  // المواصفات والتفاصيل الافتراضية
  generalSpecs: string; // المواصفات العامة
  dimensionsAndStructure: string; // التفاصيل (مقاسات، تقسيم داخلي، إلخ)
  paintSpecs: string; // مواصفات الدهان
  upholsterySpecs: string; // مواصفات التنجيد
  
  // التتبع وحالة التشغيل
  status: string; // 'بانتظار التعميد' | 'في أحد مراكز التكلفة' | 'في المخزن تام التشطيب' | 'تم إرساله للمعارض' | 'سلم للعميل' | 'ملغى'
  costCenterId?: string; // مركز التكلفة المرتبط إذا كان في أحد مراكز التكلفة
  
  // المالية (ارتباط بأمر البيع)
  totalAmount: number;
  depositPaid?: number; // العربون المدفوع
  remainingAmount?: number; // المتبقي
  
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface WarehouseTransferItem {
  sourceItemId: string;
  destinationItemId: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
}

export interface WarehouseTransfer {
  id: string;
  date: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  items: WarehouseTransferItem[];
  notes: string;
  createdBy: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: string; // مثال: شاحنة جامبو، ربع نقل، ملاكي
  brand: string; // ماركة السيارة
  modelYear: number;
  driverId: string; // الموظف المسؤول (السائق)
  driverName?: string;
  status: 'نشط' | 'في الصيانة' | 'خارج الخدمة';
  licenseExpiryDate: string; // تاريخ انتهاء الرخصة
  insuranceExpiryDate: string; // تاريخ انتهاء التأمين
  inspectionExpiryDate?: string; // تاريخ انتهاء الفحص الفني
  odometerReading: number; // آخر قراءة لعداد الكيلومتر
  lastMaintenanceOdometer?: number; // قراءة العداد عند آخر صيانة
  maintenanceInterval?: number; // المسافة المحددة بين الصيانات (مثلاً كل 5000 كم)
  notes?: string;
  createdAt: string;
}

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  date: string;
  type: 'بنزين' | 'سولار' | 'زيت' | 'صيانة' | 'رخصة' | 'أخرى';
  amount: number;
  fuelQuantity?: number; // كمية الوقود باللتر (لحساب الاستهلاك)
  odometerReading?: number; // القراءة عند الصرف
  description: string;
  safeId?: string;
  safeTransactionId?: string;
  supplierId?: string; // المورد المرتبط (مثل محطة البنزين أو مركز الصيانة)
  createdBy: string;
}

