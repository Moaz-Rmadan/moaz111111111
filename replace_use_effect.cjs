const fs = require('fs');

const appFile = 'src/App.tsx';
const content = fs.readFileSync(appFile, 'utf8');
const lines = content.split('\n');

let startLineIndex = -1;
let endLineIndex = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('useEffect(() => {') && lines[i+1].includes('if (!user || !profile) return;')) {
    startLineIndex = i;
  }
  if (startLineIndex !== -1 && line.includes('}, [user, profile]);')) {
    endLineIndex = i;
  }
}

if (startLineIndex === -1 || endLineIndex === -1) {
  console.error(`Could not locate useEffect block boundaries: start=${startLineIndex}, end=${endLineIndex}`);
  process.exit(1);
}

console.log(`Locating useEffect block: lines ${startLineIndex + 1} to ${endLineIndex + 1}`);

const pristineUseEffect = `  useEffect(() => {
    if (!user || !profile) return;

    // Declarations
    let unsubWarehouses = () => {};
    let unsubUnits = () => {};
    let unsubCostCenters = () => {};
    let unsubItems = () => {};
    let unsubSuppliers = () => {};
    let unsubPurchases = () => {};
    let unsubIssuances = () => {};
    let unsubProductionJobs = () => {};
    let unsubLoadingManifests = () => {};
    let unsubWaste = () => {};
    let unsubBladeSharpening = () => {};
    let unsubPlateSharpening = () => {};
    let unsubMaintenanceOrders = () => {};
    let unsubEmployees = () => {};
    let unsubAttendance = () => {};
    let unsubHrTransactions = () => {};
    let unsubLoans = () => {};
    let unsubPayrolls = () => {};
    let unsubProductionRecords = () => {};
    let unsubSupplierPayments = () => {};
    let unsubJobLabors = () => {};
    let unsubJobOtherCosts = () => {};
    let unsubDeliveryReceipts = () => {};
    let unsubStockAudits = () => {};
    let unsubBoms = () => {};
    let unsubWorkCenters = () => {};
    let unsubManufacturingOperations = () => {};
    let unsubLostSales = () => {};
    let unsubSalesOrders = () => {};
    let unsubSafeAudits = () => {};
    let unsubProductRecipes = () => {};
    let unsubSafes = () => {};
    let unsubSafeTransactions = () => {};

    // 1. unsubWarehouses
    if (profile.isAdmin || profile.permissions.inventory || profile.permissions.reports) {
      unsubWarehouses = onSnapshot(
        collection(db, 'warehouses'),
        (snap) => {
          setWarehouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse)));
        },
        (error) => console.error('Permission error in collection warehouses:', error)
      );
    }

    // 2. unsubUnits
    if (profile.isAdmin || profile.permissions.inventory || profile.permissions.reports) {
      unsubUnits = onSnapshot(
        collection(db, 'units'),
        (snap) => {
          setUnits(snap.docs.map(d => ({ id: d.id, ...d.data() } as Unit)));
        },
        (error) => console.error('Permission error in collection units:', error)
      );
    }

    // 3. unsubCostCenters
    if (profile.isAdmin || profile.permissions.inventory || profile.permissions.production || profile.permissions.reports) {
      unsubCostCenters = onSnapshot(
        collection(db, 'costCenters'),
        (snap) => {
          setCostCenters(snap.docs.map(d => ({ id: d.id, ...d.data() } as CostCenter)));
        },
        (error) => console.error('Permission error in collection costCenters:', error)
      );
    }

    // 4. unsubItems
    if (profile.isAdmin || profile.permissions.inventory || profile.permissions.reports) {
      unsubItems = onSnapshot(
        collection(db, 'items'),
        (snap) => {
          setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Item)));
        },
        (error) => console.error('Permission error in collection items:', error)
      );
    }

    // 5. unsubSuppliers
    if (profile.isAdmin || profile.permissions.suppliers || profile.permissions.reports) {
      unsubSuppliers = onSnapshot(
        collection(db, 'suppliers'),
        (snap) => {
          setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
        },
        (error) => console.error('Permission error in collection suppliers:', error)
      );
    }

    // 6. unsubPurchases
    if (profile.isAdmin || profile.permissions.purchases || profile.permissions.reports) {
      unsubPurchases = onSnapshot(
        collection(db, 'purchases'),
        (snap) => {
          setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase)));
        },
        (error) => console.error('Permission error in collection purchases:', error)
      );
    }

    // 7. unsubIssuances
    if (profile.isAdmin || profile.permissions.inventory || profile.permissions.reports) {
      unsubIssuances = onSnapshot(
        collection(db, 'issuances'),
        (snap) => {
          setIssuances(snap.docs.map(d => ({ id: d.id, ...d.data() } as Issuance)));
        },
        (error) => console.error('Permission error in collection issuances:', error)
      );
    }

    // 8. unsubProductionJobs
    if (profile.isAdmin || profile.permissions.production || profile.permissions.reports) {
      unsubProductionJobs = onSnapshot(
        collection(db, 'productionJobs'),
        (snap) => {
          setProductionJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductionJob)));
        },
        (error) => console.error('Permission error in collection productionJobs:', error)
      );
    }

    // 9. unsubLoadingManifests
    if (profile.isAdmin || profile.permissions.production || profile.permissions.reports) {
      unsubLoadingManifests = onSnapshot(
        collection(db, 'loadingManifests'),
        (snap) => {
          setLoadingManifests(snap.docs.map(d => ({ id: d.id, ...d.data() } as LoadingManifest)));
        },
        (error) => console.error('Permission error in collection loadingManifests:', error)
      );
    }

    // 10. unsubWaste
    if (profile.isAdmin || profile.permissions.inventory || profile.permissions.reports) {
      unsubWaste = onSnapshot(
        collection(db, 'waste'),
        (snap) => {
          setWasteRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as Waste)));
        },
        (error) => console.error('Permission error in collection waste:', error)
      );
    }

    // 11. unsubBladeSharpening
    if (profile.isAdmin || profile.permissions.maintenance || profile.permissions.reports) {
      unsubBladeSharpening = onSnapshot(
        collection(db, 'bladeSharpening'),
        (snap) => {
          setBladeSharpening(snap.docs.map(d => ({ id: d.id, ...d.data() } as BladeSharpening)));
        },
        (error) => console.error('Permission error in collection bladeSharpening:', error)
      );
    }

    // 12. unsubPlateSharpening
    if (profile.isAdmin || profile.permissions.maintenance || profile.permissions.reports) {
      unsubPlateSharpening = onSnapshot(
        collection(db, 'plateSharpening'),
        (snap) => {
          setPlateSharpening(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlateSharpening)));
        },
        (error) => console.error('Permission error in collection plateSharpening:', error)
      );
    }

    // 13. unsubMaintenanceOrders
    if (profile.isAdmin || profile.permissions.maintenance || profile.permissions.reports) {
      unsubMaintenanceOrders = onSnapshot(
        collection(db, 'maintenanceOrders'),
        (snap) => {
          setMaintenanceOrder(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceOrder)));
        },
        (error) => console.error('Permission error in collection maintenanceOrders:', error)
      );
    }

    // 14. unsubEmployees
    if (profile.isAdmin || profile.permissions.hr || profile.permissions.reports) {
      unsubEmployees = onSnapshot(
        collection(db, 'employees'),
        (snap) => {
          setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
        },
        (error) => console.error('Permission error in collection employees:', error)
      );
    }

    // 15. unsubAttendance
    if (profile.isAdmin || profile.permissions.hr || profile.permissions.reports) {
      unsubAttendance = onSnapshot(
        collection(db, 'attendance'),
        (snap) => {
          setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
        },
        (error) => console.error('Permission error in collection attendance:', error)
      );
    }

    // 16. unsubHrTransactions
    if (profile.isAdmin || profile.permissions.hr || profile.permissions.reports) {
      unsubHrTransactions = onSnapshot(
        collection(db, 'hrTransactions'),
        (snap) => {
          setHrTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialTransaction)));
        },
        (error) => console.error('Permission error in collection hrTransactions:', error)
      );
    }

    // 17. unsubLoans
    if (profile.isAdmin || profile.permissions.hr || profile.permissions.reports) {
      const q = query(collection(db, 'loans'), where('status', '==', 'نشط'));
      unsubLoans = onSnapshot(
        q,
        (snap) => {
          setLoans(snap.docs.map(d => ({ id: d.id, ...d.data() } as Loan)));
        },
        (error) => console.error('Permission error in collection loans:', error)
      );
    }

    // 18. unsubPayrolls
    if (profile.isAdmin || profile.permissions.hr || profile.permissions.reports) {
      const q = query(collection(db, 'payrolls'), where('status', '==', 'مسودة'));
      unsubPayrolls = onSnapshot(
        q,
        (snap) => {
          setPayrolls(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payroll)));
        },
        (error) => console.error('Permission error in collection payrolls:', error)
      );
    }

    // 19. unsubProductionRecords
    if (profile.isAdmin || profile.permissions.hr || profile.permissions.reports) {
      unsubProductionRecords = onSnapshot(
        collection(db, 'productionRecords'),
        (snap) => {
          setProductionRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductionRecord)));
        },
        (error) => console.error('Permission error in collection productionRecords:', error)
      );
    }

    // 20. unsubSupplierPayments
    if (profile.isAdmin || profile.permissions.suppliers || profile.permissions.reports) {
      unsubSupplierPayments = onSnapshot(
        collection(db, 'supplierPayments'),
        (snap) => {
          setSupplierPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupplierPayment)));
        },
        (error) => console.error('Permission error in collection supplierPayments:', error)
      );
    }

    // 21. unsubJobLabors
    if (profile.isAdmin || profile.permissions.production || profile.permissions.reports) {
      unsubJobLabors = onSnapshot(
        collection(db, 'jobLabors'),
        (snap) => {
          setJobLabors(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobLabor)));
        },
        (error) => console.error('Permission error in collection jobLabors:', error)
      );
    }

    // 22. unsubJobOtherCosts
    if (profile.isAdmin || profile.permissions.production || profile.permissions.reports) {
      unsubJobOtherCosts = onSnapshot(
        collection(db, 'jobOtherCosts'),
        (snap) => {
          setJobOtherCosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobOtherCost)));
        },
        (error) => console.error('Permission error in collection jobOtherCosts:', error)
      );
    }

    // 23. unsubDeliveryReceipts
    if (profile.isAdmin || profile.permissions.production || profile.permissions.reports) {
      unsubDeliveryReceipts = onSnapshot(
        collection(db, 'deliveryReceipts'),
        (snap) => {
          setDeliveryReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() } as DeliveryReceipt)));
        },
        (error) => console.error('Permission error in collection deliveryReceipts:', error)
      );
    }

    // 24. unsubStockAudits
    if (profile.isAdmin || profile.permissions.inventory || profile.permissions.reports) {
      unsubStockAudits = onSnapshot(
        collection(db, 'stockAudits'),
        (snap) => {
          setStockAudits(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockAudit)));
        },
        (error) => console.error('Permission error in collection stockAudits:', error)
      );
    }

    // 25. unsubBoms
    if (profile.isAdmin || profile.permissions.production || profile.permissions.reports) {
      unsubBoms = onSnapshot(
        collection(db, 'boms'),
        (snap) => {
          setBoms(snap.docs.map(d => ({ id: d.id, ...d.data() } as BOM)));
        },
        (error) => console.error('Permission error in collection boms:', error)
      );
    }

    // 26. unsubWorkCenters
    if (profile.isAdmin || profile.permissions.production || profile.permissions.reports) {
      unsubWorkCenters = onSnapshot(
        collection(db, 'workCenters'),
        (snap) => {
          setWorkCenters(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkCenter)));
        },
        (error) => console.error('Permission error in collection workCenters:', error)
      );
    }

    // 27. unsubManufacturingOperations
    if (profile.isAdmin || profile.permissions.production || profile.permissions.reports) {
      unsubManufacturingOperations = onSnapshot(
        collection(db, 'manufacturingOperations'),
        (snap) => {
          setManufacturingOperations(snap.docs.map(d => ({ id: d.id, ...d.data() } as ManufacturingOperation)));
        },
        (error) => console.error('Permission error in collection manufacturingOperations:', error)
      );
    }

    // 28. unsubLostSales
    if (profile.isAdmin || profile.permissions.dashboard || profile.permissions.reports) {
      unsubLostSales = onSnapshot(
        collection(db, 'lostSales'),
        (snap) => {
          setLostSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as LostSale)));
        },
        (error) => console.error('Permission error in collection lostSales:', error)
      );
    }

    // 29. unsubSalesOrders
    if (profile.isAdmin || profile.permissions.dashboard || profile.permissions.reports) {
      unsubSalesOrders = onSnapshot(
        collection(db, 'salesOrders'),
        (snap) => {
          setSalesOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as SalesOrder)));
        },
        (error) => console.error('Permission error in collection salesOrders:', error)
      );
    }

    // 30. unsubSafeAudits
    if (profile.isAdmin || profile.permissions.finance || profile.permissions.reports) {
      unsubSafeAudits = onSnapshot(
        collection(db, 'safeAudits'),
        (snap) => {
          setSafeAudits(snap.docs.map(d => ({ id: d.id, ...d.data() } as SafeAudit)));
        },
        (error) => console.error('Permission error in collection safeAudits:', error)
      );
    }

    // 31. unsubProductRecipes
    if (profile.isAdmin || profile.permissions.production || profile.permissions.reports) {
      unsubProductRecipes = onSnapshot(
        collection(db, 'productRecipes'),
        (snap) => {
          setProductRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductRecipe)));
        },
        (error) => console.error('Permission error in collection productRecipes:', error)
      );
    }

    // 32. unsubSafes
    if (profile.isAdmin || profile.permissions.finance || profile.permissions.reports) {
      unsubSafes = onSnapshot(
        collection(db, 'safes'),
        (snap) => {
          setSafes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Safe)));
        },
        (error) => console.error('Permission error in collection safes:', error)
      );
    }

    // 33. unsubSafeTransactions
    if (profile.isAdmin || profile.permissions.finance || profile.permissions.reports) {
      unsubSafeTransactions = onSnapshot(
        collection(db, 'safeTransactions'),
        (snap) => {
          setSafeTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as SafeTransaction)));
        },
        (error) => console.error('Permission error in collection safeTransactions:', error)
      );
    }

    return () => {
      unsubWarehouses();
      unsubUnits();
      unsubCostCenters();
      unsubItems();
      unsubSuppliers();
      unsubPurchases();
      unsubIssuances();
      unsubProductionJobs();
      unsubLoadingManifests();
      unsubWaste();
      unsubBladeSharpening();
      unsubPlateSharpening();
      unsubMaintenanceOrders();
      unsubEmployees();
      unsubAttendance();
      unsubHrTransactions();
      unsubLoans();
      unsubPayrolls();
      unsubProductionRecords();
      unsubSupplierPayments();
      unsubJobLabors();
      unsubJobOtherCosts();
      unsubDeliveryReceipts();
      unsubStockAudits();
      unsubBoms();
      unsubWorkCenters();
      unsubManufacturingOperations();
      unsubLostSales();
      unsubSalesOrders();
      unsubSafeAudits();
      unsubProductRecipes();
      unsubSafes();
      unsubSafeTransactions();
    };
  }, [user, profile]);`;

const newLines = [
  ...lines.slice(0, startLineIndex),
  pristineUseEffect,
  ...lines.slice(endLineIndex + 1)
];

fs.writeFileSync(appFile, newLines.join('\n'), 'utf8');
console.log('Successfully replaced the useEffect block with a pristine, balanced block with full error handling!');
