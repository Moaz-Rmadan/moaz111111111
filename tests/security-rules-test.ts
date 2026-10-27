/**
 * Security Rules Simulation Test Suite
 * Simulates Firestore Security Rules logic against all ERP roles and operations.
 */

export type UserRole = 
  | 'super_admin' 
  | 'admin' 
  | 'manager' 
  | 'finance' 
  | 'accountant' 
  | 'inventory' 
  | 'warehouse'
  | 'purchasing'
  | 'sales' 
  | 'production' 
  | 'hr' 
  | 'maintenance'
  | 'reports'
  | 'showroom'
  | 'worker';

export interface AuthContext {
  uid: string | null;
  email: string | null;
  role?: UserRole;
  isAdmin?: boolean;
}

export interface SecurityRuleContext {
  auth: AuthContext;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  resourceData?: Record<string, any>; // existing data in firestore
  requestData?: Record<string, any>;  // incoming write payload
}

// Master email with hardcoded platform immunity
const MASTER_EMAIL = "cfo.moaz@gmail.com";

/**
 * Proposed Firestore Security Rules Logic Engine
 */
export function evaluateProposedRule(ctx: SecurityRuleContext): { allowed: boolean; reason: string } {
  const { auth, collection, docId, operation, resourceData, requestData } = ctx;

  // 1. Mandatory Authentication Check
  if (!auth.uid) {
    return { allowed: false, reason: "Unauthenticated request (request.auth == null)" };
  }

  // 2. Master Admin / Super Admin Bypass
  if (auth.email === MASTER_EMAIL || auth.role === 'super_admin') {
    return { allowed: true, reason: "Super Admin full access override" };
  }

  const role = auth.role || 'worker';
  const isAdmin = auth.isAdmin || role === 'admin';

  // 3. Collection: users
  if (collection === 'users') {
    if (operation === 'get') {
      // Any authenticated user can read profiles (needed for mentions/assignments)
      return { allowed: true, reason: "Authenticated user can read user profiles" };
    }
    if (operation === 'list') {
      // Only admins and managers can query the entire user list
      if (isAdmin || role === 'manager') {
        return { allowed: true, reason: "Admin/Manager can list users" };
      }
      return { allowed: false, reason: "Listing users requires admin or manager role" };
    }
    if (operation === 'create') {
      if (isAdmin) return { allowed: true, reason: "Admin can create users" };
      // Self registration without elevated privileges
      if (docId === auth.uid && requestData) {
        if (requestData.role && requestData.role !== 'worker') {
          return { allowed: false, reason: "Cannot self-assign non-worker role on creation" };
        }
        if (requestData.isAdmin === true) {
          return { allowed: false, reason: "Cannot self-assign isAdmin on creation" };
        }
        return { allowed: true, reason: "User can create own worker profile" };
      }
      return { allowed: false, reason: "Only admin can create other users" };
    }
    if (operation === 'update') {
      // Check privilege escalation attempt
      if (docId === auth.uid && !isAdmin) {
        if (requestData) {
          if (requestData.role && requestData.role !== (resourceData?.role || 'worker')) {
            return { allowed: false, reason: "Privilege escalation: cannot modify own role" };
          }
          if (requestData.isAdmin !== undefined && requestData.isAdmin !== (resourceData?.isAdmin || false)) {
            return { allowed: false, reason: "Privilege escalation: cannot modify own isAdmin flag" };
          }
          if (requestData.permissions !== undefined) {
            return { allowed: false, reason: "Privilege escalation: cannot modify own permissions" };
          }
        }
        return { allowed: true, reason: "User can update own non-sensitive profile info (name, phone)" };
      }
      if (isAdmin) {
        return { allowed: true, reason: "Admin can update user accounts" };
      }
      return { allowed: false, reason: "Insufficient permissions to update user" };
    }
    if (operation === 'delete') {
      if (isAdmin) return { allowed: true, reason: "Admin can delete user records" };
      return { allowed: false, reason: "Only admin can delete user records" };
    }
  }

  // 4. Collection: settings
  if (collection === 'settings') {
    if (operation === 'get' || operation === 'list') {
      return { allowed: true, reason: "Authenticated users can read company settings" };
    }
    if (isAdmin) return { allowed: true, reason: "Admin can modify settings" };
    return { allowed: false, reason: "Settings write requires admin role" };
  }

  // 5. Financial Collections: safes, safeTransactions, bankAccounts, bankTransactions, checks, safeAudits, safeSettlements
  const financialCollections = [
    'safes', 'safeTransactions', 'bankAccounts', 'bankTransactions', 
    'checks', 'safeAudits', 'safeSettlements', 'treasuryCustodies', 'custodySettlements', 'cashTransactions'
  ];
  if (financialCollections.includes(collection)) {
    const hasFinancialRead = isAdmin || ['finance', 'accountant', 'manager'].includes(role);
    const hasSalesCashWrite = ['sales'].includes(role) && ['safes', 'safeTransactions'].includes(collection);
    const hasPurchasingCashWrite = ['purchasing'].includes(role) && ['safes', 'safeTransactions'].includes(collection);

    if (operation === 'get' || operation === 'list') {
      if (hasFinancialRead) return { allowed: true, reason: "Financial team read access" };
      // Allow sales/purchasing limited get on active safe for point of sale
      if ((role === 'sales' || role === 'purchasing') && collection === 'safes' && operation === 'get') {
        return { allowed: true, reason: "Operational cash safe lookup" };
      }
      return { allowed: false, reason: "Financial collections require finance/accountant/admin access" };
    }

    if (operation === 'create' || operation === 'update') {
      if (isAdmin || ['finance', 'accountant'].includes(role)) {
        return { allowed: true, reason: "Financial team write access" };
      }
      // Sales and purchasing need to record cash movements and update safe balances on invoices
      if (hasSalesCashWrite || hasPurchasingCashWrite) {
        return { allowed: true, reason: "Operational transaction integration (sales/purchases atomic batch)" };
      }
      return { allowed: false, reason: "Financial mutations require authorized role" };
    }

    if (operation === 'delete') {
      if (isAdmin) return { allowed: true, reason: "Admin can delete financial records" };
      return { allowed: false, reason: "Financial deletion restricted to admin" };
    }
  }

  // 6. Sales Collections: salesOrders, customers, customerPayments, lostSales, deliveryDocuments, deliveryReceipts
  const salesCollections = ['salesOrders', 'customers', 'customerPayments', 'lostSales', 'deliveryDocuments', 'deliveryReceipts', 'deliveryLogs'];
  if (salesCollections.includes(collection)) {
    const hasSalesRead = isAdmin || ['sales', 'manager', 'finance', 'accountant', 'reports', 'showroom'].includes(role);
    const hasSalesWrite = isAdmin || ['sales', 'manager', 'showroom'].includes(role);

    if (operation === 'get' || operation === 'list') {
      if (hasSalesRead) return { allowed: true, reason: "Sales read access granted" };
      return { allowed: false, reason: "Sales read access denied" };
    }
    if (operation === 'create' || operation === 'update') {
      if (hasSalesWrite) return { allowed: true, reason: "Sales write access granted" };
      return { allowed: false, reason: "Sales write access denied" };
    }
    if (operation === 'delete') {
      if (isAdmin) return { allowed: true, reason: "Admin can delete sales records" };
      return { allowed: false, reason: "Sales deletion restricted to admin" };
    }
  }

  // 7. Inventory Collections: items, warehouses, units, costCenters, issuances, transferOrders, warehouseTransfers, stockAudits, waste, showroomInventory, showrooms, byproductSales
  const inventoryCollections = [
    'items', 'warehouses', 'units', 'costCenters', 'issuances', 
    'transferOrders', 'warehouseTransfers', 'stockAudits', 'waste', 
    'showroomInventory', 'showrooms', 'byproductSales'
  ];
  if (inventoryCollections.includes(collection)) {
    // Items catalog is read by almost everyone except workers
    if (collection === 'items' && (operation === 'get' || operation === 'list')) {
      if (role !== 'worker') return { allowed: true, reason: "Product catalog read access" };
    }

    const hasInvRead = isAdmin || ['inventory', 'warehouse', 'manager', 'purchasing', 'production', 'finance', 'accountant', 'sales', 'reports', 'showroom'].includes(role);
    const hasInvWrite = isAdmin || ['inventory', 'warehouse', 'manager', 'purchasing'].includes(role);
    // Sales can decrement items, production can register issuances
    const isSalesItemStockUpdate = ['sales', 'showroom'].includes(role) && ['items', 'showroomInventory'].includes(collection) && operation === 'update';
    const isProductionIssuance = ['production'].includes(role) && ['issuances', 'waste', 'items'].includes(collection);

    if (operation === 'get' || operation === 'list') {
      if (hasInvRead) return { allowed: true, reason: "Inventory read access granted" };
      return { allowed: false, reason: "Inventory read access denied" };
    }
    if (operation === 'create' || operation === 'update') {
      if (hasInvWrite || isSalesItemStockUpdate || isProductionIssuance) {
        return { allowed: true, reason: "Inventory write/stock adjustment allowed" };
      }
      return { allowed: false, reason: "Inventory write access denied" };
    }
    if (operation === 'delete') {
      if (isAdmin) return { allowed: true, reason: "Admin can delete inventory records" };
      return { allowed: false, reason: "Inventory deletion restricted to admin" };
    }
  }

  // 8. Purchasing & Suppliers: suppliers, purchases, supplierPayments, supplierTransactions, supplierLedger
  const purchasingCollections = ['suppliers', 'purchases', 'supplierPayments', 'supplierTransactions', 'supplierLedger'];
  if (purchasingCollections.includes(collection)) {
    const hasPurchRead = isAdmin || ['purchasing', 'inventory', 'finance', 'accountant', 'manager', 'reports'].includes(role);
    const hasPurchWrite = isAdmin || ['purchasing', 'manager', 'finance', 'accountant'].includes(role);

    if (operation === 'get' || operation === 'list') {
      if (hasPurchRead) return { allowed: true, reason: "Purchasing read access granted" };
      return { allowed: false, reason: "Purchasing read access denied" };
    }
    if (operation === 'create' || operation === 'update') {
      if (hasPurchWrite) return { allowed: true, reason: "Purchasing write access granted" };
      return { allowed: false, reason: "Purchasing write access denied" };
    }
    if (operation === 'delete') {
      if (isAdmin) return { allowed: true, reason: "Admin can delete purchase records" };
      return { allowed: false, reason: "Purchase deletion restricted to admin" };
    }
  }

  // 9. HR & Payroll: employees, attendance, payrolls, loans, hrTransactions, departments, jobPositions
  const hrCollections = ['employees', 'attendance', 'payrolls', 'loans', 'hrTransactions', 'departments', 'jobPositions', 'beneficiaries', 'disbursement_runs'];
  if (hrCollections.includes(collection)) {
    // Attendance write is needed for kiosk or manager or employee check-in
    if (collection === 'attendance' && (operation === 'create' || operation === 'update')) {
      if (isAdmin || ['hr', 'manager', 'production'].includes(role)) {
        return { allowed: true, reason: "Attendance management allowed" };
      }
    }

    const hasHrRead = isAdmin || ['hr', 'finance', 'accountant', 'manager', 'reports'].includes(role);
    const hasHrWrite = isAdmin || ['hr', 'manager'].includes(role);
    const isFinancePayrollDisburse = ['finance', 'accountant'].includes(role) && ['payrolls', 'loans'].includes(collection) && operation === 'update';

    if (operation === 'get' || operation === 'list') {
      if (hasHrRead) return { allowed: true, reason: "HR read access granted" };
      return { allowed: false, reason: "HR read access denied" };
    }
    if (operation === 'create' || operation === 'update') {
      if (hasHrWrite || isFinancePayrollDisburse) return { allowed: true, reason: "HR write/disbursement allowed" };
      return { allowed: false, reason: "HR write access denied" };
    }
    if (operation === 'delete') {
      if (isAdmin) return { allowed: true, reason: "Admin can delete HR records" };
      return { allowed: false, reason: "HR deletion restricted to admin" };
    }
  }

  // 10. Production & Manufacturing: productionJobs, workOrders, productionRecords, productionRates, manufacturingOperations, boms, productRecipes, workCenters, jobLabors, jobOtherCosts
  const productionCollections = [
    'productionJobs', 'workOrders', 'productionRecords', 'productionRates', 
    'manufacturingOperations', 'boms', 'productRecipes', 'workCenters', 'jobLabors', 'jobOtherCosts'
  ];
  if (productionCollections.includes(collection)) {
    // Workers can view their own production records or work orders
    if (role === 'worker' && (collection === 'productionRecords' || collection === 'productionJobs')) {
      if (operation === 'get') return { allowed: true, reason: "Worker can view assigned job/record" };
      return { allowed: false, reason: "Worker cannot modify production jobs" };
    }

    const hasProdRead = isAdmin || ['production', 'manager', 'inventory', 'warehouse', 'maintenance', 'reports'].includes(role);
    const hasProdWrite = isAdmin || ['production', 'manager'].includes(role);

    if (operation === 'get' || operation === 'list') {
      if (hasProdRead) return { allowed: true, reason: "Production read access granted" };
      return { allowed: false, reason: "Production read access denied" };
    }
    if (operation === 'create' || operation === 'update') {
      if (hasProdWrite) return { allowed: true, reason: "Production write access granted" };
      return { allowed: false, reason: "Production write access denied" };
    }
    if (operation === 'delete') {
      if (isAdmin) return { allowed: true, reason: "Admin can delete production records" };
      return { allowed: false, reason: "Production deletion restricted to admin" };
    }
  }

  // 11. Maintenance & Vehicles: maintenanceOrders, vehicles, vehicleExpenses
  const maintenanceCollections = ['maintenanceOrders', 'vehicles', 'vehicleExpenses'];
  if (maintenanceCollections.includes(collection)) {
    const hasMaintRead = isAdmin || ['maintenance', 'manager', 'production', 'finance', 'reports'].includes(role);
    const hasMaintWrite = isAdmin || ['maintenance', 'manager'].includes(role);

    if (operation === 'get' || operation === 'list') {
      if (hasMaintRead) return { allowed: true, reason: "Maintenance read access granted" };
      return { allowed: false, reason: "Maintenance read access denied" };
    }
    if (operation === 'create' || operation === 'update') {
      if (hasMaintWrite) return { allowed: true, reason: "Maintenance write access granted" };
      return { allowed: false, reason: "Maintenance write access denied" };
    }
    if (operation === 'delete') {
      if (isAdmin) return { allowed: true, reason: "Admin can delete maintenance records" };
      return { allowed: false, reason: "Maintenance deletion restricted to admin" };
    }
  }

  // 12. Utilities & Automation: documentCounters, auditLogs, whatsappDrafts
  if (['documentCounters', 'auditLogs', 'whatsappDrafts'].includes(collection)) {
    if (operation === 'get' || operation === 'list') return { allowed: true, reason: "Operational utility read" };
    if (operation === 'create' || operation === 'update') return { allowed: true, reason: "Operational utility update" };
    if (operation === 'delete') {
      if (isAdmin) return { allowed: true, reason: "Admin can delete logs" };
      return { allowed: false, reason: "Log deletion restricted" };
    }
  }

  // Default fallback: deny
  return { allowed: false, reason: `Unmapped collection: ${collection}` };
}

/**
 * Runner for Automated Test Cases
 */
export function runSecurityTestSuite() {
  console.log("=================================================");
  console.log("🚀 STARTING FIRESTORE SECURITY RULES TEST SUITE");
  console.log("=================================================\n");

  const results: { test: string; passed: boolean; message: string }[] = [];

  function test(name: string, fn: () => boolean, expected: boolean) {
    try {
      const outcome = fn();
      const passed = outcome === expected;
      results.push({
        test: name,
        passed,
        message: passed 
          ? `✅ PASS: [Expected: ${expected ? 'ALLOW' : 'DENY'}, Got: ${outcome ? 'ALLOW' : 'DENY'}]`
          : `❌ FAIL: [Expected: ${expected ? 'ALLOW' : 'DENY'}, Got: ${outcome ? 'ALLOW' : 'DENY'}]`
      });
    } catch (err: any) {
      results.push({ test: name, passed: false, message: `💥 ERROR: ${err.message}` });
    }
  }

  // Group 1: Unauthenticated Requests (Must ALWAYS be blocked)
  test("1.1 Unauthenticated read on 'users'", () => {
    return evaluateProposedRule({
      auth: { uid: null, email: null },
      collection: 'users',
      docId: 'user123',
      operation: 'get'
    }).allowed;
  }, false);

  test("1.2 Unauthenticated read on 'safes'", () => {
    return evaluateProposedRule({
      auth: { uid: null, email: null },
      collection: 'safes',
      docId: 'safe1',
      operation: 'list'
    }).allowed;
  }, false);

  test("1.3 Unauthenticated write on 'purchases'", () => {
    return evaluateProposedRule({
      auth: { uid: null, email: null },
      collection: 'purchases',
      docId: 'p1',
      operation: 'create',
      requestData: { total: 5000 }
    }).allowed;
  }, false);

  // Group 2: Privilege Escalation Tests
  test("2.1 Regular worker attempting to update own role to super_admin", () => {
    return evaluateProposedRule({
      auth: { uid: 'worker_01', email: 'worker@factory.com', role: 'worker', isAdmin: false },
      collection: 'users',
      docId: 'worker_01',
      operation: 'update',
      resourceData: { role: 'worker', isAdmin: false },
      requestData: { role: 'super_admin' }
    }).allowed;
  }, false);

  test("2.2 Regular worker attempting to set isAdmin=true on self", () => {
    return evaluateProposedRule({
      auth: { uid: 'worker_01', email: 'worker@factory.com', role: 'worker', isAdmin: false },
      collection: 'users',
      docId: 'worker_01',
      operation: 'update',
      resourceData: { role: 'worker', isAdmin: false },
      requestData: { isAdmin: true }
    }).allowed;
  }, false);

  test("2.3 Super admin updating a user role to manager", () => {
    return evaluateProposedRule({
      auth: { uid: 'cfo_admin', email: 'cfo.moaz@gmail.com', role: 'super_admin', isAdmin: true },
      collection: 'users',
      docId: 'emp_42',
      operation: 'update',
      requestData: { role: 'manager' }
    }).allowed;
  }, true);

  // Group 3: Financial Isolation Tests
  test("3.1 Worker attempting to read 'safes'", () => {
    return evaluateProposedRule({
      auth: { uid: 'w1', email: 'w@f.com', role: 'worker' },
      collection: 'safes',
      docId: 'main_safe',
      operation: 'get'
    }).allowed;
  }, false);

  test("3.2 Finance role reading 'safes'", () => {
    return evaluateProposedRule({
      auth: { uid: 'f1', email: 'fin@f.com', role: 'finance' },
      collection: 'safes',
      docId: 'main_safe',
      operation: 'get'
    }).allowed;
  }, true);

  test("3.3 Accountant reading 'bankAccounts'", () => {
    return evaluateProposedRule({
      auth: { uid: 'acc1', email: 'acc@f.com', role: 'accountant' },
      collection: 'bankAccounts',
      docId: 'cib_bank',
      operation: 'list'
    }).allowed;
  }, true);

  test("3.4 Inventory manager attempting to delete 'safeTransactions'", () => {
    return evaluateProposedRule({
      auth: { uid: 'inv1', email: 'inv@f.com', role: 'inventory' },
      collection: 'safeTransactions',
      docId: 'tx_99',
      operation: 'delete'
    }).allowed;
  }, false);

  // Group 4: Multi-Collection Batch Workflow Tests (Atomic consistency)
  test("4.1 Sales creating a sales order and registering cash receipt in safe", () => {
    const auth = { uid: 'sales1', email: 'sales@f.com', role: 'sales' as UserRole };
    const step1 = evaluateProposedRule({ auth, collection: 'salesOrders', docId: 'so_1', operation: 'create' }).allowed;
    const step2 = evaluateProposedRule({ auth, collection: 'items', docId: 'item_1', operation: 'update' }).allowed;
    const step3 = evaluateProposedRule({ auth, collection: 'safeTransactions', docId: 'st_1', operation: 'create' }).allowed;
    const step4 = evaluateProposedRule({ auth, collection: 'safes', docId: 'safe_1', operation: 'update' }).allowed;
    return step1 && step2 && step3 && step4;
  }, true);

  test("4.2 Purchasing creating purchase bill, updating stock & safe", () => {
    const auth = { uid: 'p1', email: 'purch@f.com', role: 'purchasing' as UserRole };
    const step1 = evaluateProposedRule({ auth, collection: 'purchases', docId: 'pur_1', operation: 'create' }).allowed;
    const step2 = evaluateProposedRule({ auth, collection: 'items', docId: 'item_1', operation: 'update' }).allowed;
    const step3 = evaluateProposedRule({ auth, collection: 'safeTransactions', docId: 'st_1', operation: 'create' }).allowed;
    const step4 = evaluateProposedRule({ auth, collection: 'suppliers', docId: 'sup_1', operation: 'update' }).allowed;
    return step1 && step2 && step3 && step4;
  }, true);

  // Group 5: HR & Payroll Isolation
  test("5.1 Sales representative attempting to read employee payrolls", () => {
    return evaluateProposedRule({
      auth: { uid: 'sales1', email: 'sales@f.com', role: 'sales' },
      collection: 'payrolls',
      docId: 'pr_week_12',
      operation: 'list'
    }).allowed;
  }, false);

  test("5.2 HR officer reading and generating payrolls", () => {
    const auth = { uid: 'hr1', email: 'hr@f.com', role: 'hr' as UserRole };
    const readAllowed = evaluateProposedRule({ auth, collection: 'payrolls', docId: 'pr_1', operation: 'list' }).allowed;
    const writeAllowed = evaluateProposedRule({ auth, collection: 'payrolls', docId: 'pr_1', operation: 'create' }).allowed;
    return readAllowed && writeAllowed;
  }, true);

  // Group 6: Factory Reset Protection
  test("6.1 Production manager attempting Factory Reset (deleting items)", () => {
    return evaluateProposedRule({
      auth: { uid: 'prod1', email: 'prod@f.com', role: 'production' },
      collection: 'items',
      docId: 'item_all',
      operation: 'delete'
    }).allowed;
  }, false);

  test("6.2 Super admin executing Factory Reset (deleting items)", () => {
    return evaluateProposedRule({
      auth: { uid: 'cfo1', email: 'cfo.moaz@gmail.com', role: 'super_admin' },
      collection: 'items',
      docId: 'item_all',
      operation: 'delete'
    }).allowed;
  }, true);

  // Print results
  let passCount = 0;
  for (const r of results) {
    console.log(`${r.test}\n  ${r.message}`);
    if (r.passed) passCount++;
  }

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passCount} / ${results.length} PASSED (${Math.round((passCount / results.length) * 100)}%)`);
  console.log("=================================================\n");

  return passCount === results.length;
}

const success = runSecurityTestSuite();
if (!success) {
  process.exit(1);
}
