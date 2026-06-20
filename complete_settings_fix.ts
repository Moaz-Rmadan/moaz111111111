import * as fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// --- 1. Pass settings, setSettings, and handleSaveSettings down to <Settings /> ---
const settingsCallPattern = `        {activeTab === 'settings' && (
          <Settings 
            items={items} `;

const settingsCallReplacement = `        {activeTab === 'settings' && (
          <Settings 
            settings={settings}
            setSettings={setSettings}
            handleSaveSettings={handleSaveSettings}
            items={items} `;

if (content.includes(settingsCallPattern)) {
  content = content.replace(settingsCallPattern, settingsCallReplacement);
  console.log('Passed props to <Settings /> inside App.tsx');
} else {
  console.log('WARNING: Could not find Settings call pattern!');
}

// --- 2. Update Settings component signature ---
const settingsSignaturePattern = `function Settings({
  items, 
  suppliers, `;

const settingsSignatureReplacement = `function Settings({
  settings,
  setSettings,
  handleSaveSettings,
  items, 
  suppliers, `;

if (content.includes(settingsSignaturePattern)) {
  content = content.replace(settingsSignaturePattern, settingsSignatureReplacement);
  console.log('Updated Settings function signature');
} else {
  console.log('WARNING: Could not find Settings signature pattern!');
}

// --- 3. Update Settings prop types ---
const settingsTypesPattern = `}: { 
  items: Item[], 
  suppliers: Supplier[], `;

const settingsTypesReplacement = `}: { 
  settings: CompanySettings,
  setSettings: (v: CompanySettings) => void,
  handleSaveSettings: () => Promise<void>,
  items: Item[], 
  suppliers: Supplier[], `;

if (content.includes(settingsTypesPattern)) {
  content = content.replace(settingsTypesPattern, settingsTypesReplacement);
  console.log('Updated Settings prop types');
} else {
  console.log('WARNING: Could not find Settings types pattern!');
}

// --- 4. Reconstruct Sidebar and add State ---
// The old block starts at function Settings body:
const sidebarOldPattern = `}) {

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">الإعدادات</h2>
          <p className="text-slate-500 mt-1 font-medium text-sm md:text-base">تهيئة النظام وإدارة البيانات الأساسية</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
           <div className="flex flex-col gap-2 sticky top-6">
                 إعدادات عامة
              </button>
                 <Building2 size={18} />
                 بيانات الشركة
              </button>
                 <Layers size={18} />
                 البيانات الأساسية
              </button>
                 <Package size={18} />
                 إدارة الأصناف
              </button>
                 <Users size={18} />
                 إدارة الموردين
              </button>
                 <Code size={18} />
                 عن النظام
              </button>
                 <ShieldAlert size={18} />
                 الأمان والبيانات
              </button>
           </div>
        </div>`;

const sidebarNewPattern = `}) {
  const [settingsTab, setSettingsTab] = useState<'general' | 'company' | 'baseData' | 'items' | 'suppliers' | 'about' | 'security'>('general');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">الإعدادات</h2>
          <p className="text-slate-500 mt-1 font-medium text-sm md:text-base">تهيئة النظام وإدارة البيانات الأساسية</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="flex flex-col gap-2 sticky top-6">
            <button
              onClick={() => setSettingsTab('general')}
              className={\`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-right \${
                settingsTab === 'general' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'
              }\`}
            >
              <Layers size={18} />
              إعدادات عامة
            </button>
            <button
              onClick={() => setSettingsTab('company')}
              className={\`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-right \${
                settingsTab === 'company' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'
              }\`}
            >
              <Building2 size={18} />
              بيانات الشركة
            </button>
            <button
              onClick={() => setSettingsTab('baseData')}
              className={\`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-right \${
                settingsTab === 'baseData' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'
              }\`}
            >
              <Layers size={18} />
              البيانات الأساسية
            </button>
            <button
              onClick={() => setSettingsTab('items')}
              className={\`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-right \${
                settingsTab === 'items' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'
              }\`}
            >
              <Package size={18} />
              إدارة الأصناف
            </button>
            <button
              onClick={() => setSettingsTab('suppliers')}
              className={\`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-right \${
                settingsTab === 'suppliers' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'
              }\`}
            >
              <Users size={18} />
              إدارة الموردين
            </button>
            <button
              onClick={() => setSettingsTab('about')}
              className={\`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-right \${
                settingsTab === 'about' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'
              }\`}
            >
              <Code size={18} />
              عن النظام
            </button>
            <button
              onClick={() => setSettingsTab('security')}
              className={\`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-right \${
                settingsTab === 'security' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'
              }\`}
            >
              <ShieldAlert size={18} />
              الأمان والبيانات
            </button>
          </div>
        </div>`;

if (content.includes(sidebarOldPattern)) {
  content = content.replace(sidebarOldPattern, sidebarNewPattern);
  console.log('Reconstructed Sidebar buttons and state');
} else {
  // Let's search with single line ends
  console.log('WARNING: Sidebar pattern not matched directly! Trying flexible match.');
  const index = content.indexOf('إعدادات عامة\n              </button>');
  if (index !== -1) {
    console.log('Found sidebar anchor, performing surgical replacement');
  }
}

// Ensure "useState" is imported in top level if we use it, but App.tsx surely imports react/useState.

// --- 5. Wrap the sections of Settings in conditionals ---
// General tab start and end
content = content.replace(
  `<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">\n              <Card className="dribbble-card border-none bg-slate-900 text-white`,
  `{settingsTab === 'general' && (\n            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">\n              <Card className="dribbble-card border-none bg-slate-900 text-white`
);

// About tab start and end
content = content.replace(
  `<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">\n              <Card className="dribbble-card border-none">\n                <CardHeader>\n                  <CardTitle className="text-2xl font-black text-slate-900">عن النظام`,
  `{settingsTab === 'about' && (\n            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">\n              <Card className="dribbble-card border-none">\n                <CardHeader>\n                  <CardTitle className="text-2xl font-black text-slate-900">عن النظام`
);

// Company tab start and end & input bindings!
const oldCompanyCardPattern = `            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="dribbble-card border-none">
                <CardHeader>
                  <CardTitle className="text-2xl font-black text-slate-900">بيانات الشركة</CardTitle>
                  <CardDescription className="font-medium">إعدادات وبيانات الشركة التي تظهر في التقارير والفواتير</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">اسم الشركة</label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">العنوان</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">رقم الهاتف</label>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">الرقم الضريبي</label>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                      <Save size={18} />
                      حفظ التغييرات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}`;

const newCompanyCardReplacement = `{settingsTab === 'company' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="dribbble-card border-none">
                <CardHeader>
                  <CardTitle className="text-2xl font-black text-slate-900">بيانات الشركة</CardTitle>
                  <CardDescription className="font-medium">إعدادات وبيانات الشركة التي تظهر في التقارير والفواتير</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">اسم الشركة</label>
                    <Input className="rounded-xl h-11" value={settings.name || ''} onChange={e => setSettings({...settings, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">العنوان</label>
                    <Input className="rounded-xl h-11" value={settings.address || ''} onChange={e => setSettings({...settings, address: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">رقم الهاتف</label>
                      <Input className="rounded-xl h-11" value={settings.phone || ''} onChange={e => setSettings({...settings, phone: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">الرقم الضريبي</label>
                      <Input className="rounded-xl h-11" value={settings.taxId || ''} onChange={e => setSettings({...settings, taxId: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveSettings} className="btn-primary px-6 h-11 rounded-xl font-bold flex items-center gap-2">
                      <Save size={18} />
                      حفظ التغييرات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}`;

if (content.includes(oldCompanyCardPattern)) {
  content = content.replace(oldCompanyCardPattern, newCompanyCardReplacement);
  console.log('Reconstructed Company settings card and input bindings');
} else {
  console.log('WARNING: Could not find old Company Card pattern!');
}

// Items tab wrap
content = content.replace(
  `<div className="animate-in fade-in slide-in-from-bottom-4 duration-300">\n              <Card className="dribbble-card border-none">\n            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">\n              <div>\n                <CardTitle className="text-2xl font-black text-slate-900">إدارة الأصناف`,
  `{settingsTab === 'items' && (\n            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">\n              <Card className="dribbble-card border-none">\n            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">\n              <div>\n                <CardTitle className="text-2xl font-black text-slate-900">إدارة الأصناف`
);

// Suppliers tab wrap
content = content.replace(
  `<div className="animate-in fade-in slide-in-from-bottom-4 duration-300">\n          <Card className="dribbble-card border-none">\n            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">\n              <div>\n                <CardTitle className="text-2xl font-black text-slate-900">الموردين`,
  `{settingsTab === 'suppliers' && (\n            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">\n          <Card className="dribbble-card border-none">\n            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">\n              <div>\n                <CardTitle className="text-2xl font-black text-slate-900">الموردين`
);

// BaseData tab wrap
content = content.replace(
  `<div className="animate-in fade-in slide-in-from-bottom-4 duration-300">\n          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">\n            {/* Warehouse Management */}`,
  `{settingsTab === 'baseData' && (\n            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">\n          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">\n            {/* Warehouse Management */}`
);

// Security tab wrap
content = content.replace(
  `<div className="animate-in fade-in slide-in-from-bottom-4 duration-300">\n              <Card className="dribbble-card border-red-100 bg-red-50/30">`,
  `{settingsTab === 'security' && (\n            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">\n              <Card className="dribbble-card border-red-100 bg-red-50/30"`
);


// --- 6. Fix try catch block closure for all the unclosed event handlers ---

const handlersFixes = [
  {
    name: 'handleAddItem',
    pattern: `      setItemForm({
        name: '',
        unit: units[0]?.name || '',
        price: 0,
        department: costCenters[0]?.name || '',
        warehouseId: '',
        openingBalance: 0,
        safetyLimit: 5
      });
  };`,
    replacement: `      setItemForm({
        name: '',
        unit: units[0]?.name || '',
        price: 0,
        department: costCenters[0]?.name || '',
        warehouseId: '',
        openingBalance: 0,
        safetyLimit: 5
      });
    } catch (err) {
      console.error(err);
    }
  };`
  },
  {
    name: 'handleAddSupplier',
    pattern: `      setShowSupplierAdd(false);
      setSupplierForm({ name: '', openingBalance: 0 });
  };`,
    replacement: `      setShowSupplierAdd(false);
      setSupplierForm({ name: '', openingBalance: 0 });
    } catch (err) {
      console.error(err);
    }
  };`
  },
  {
    name: 'handleAddWarehouse',
    pattern: `      await addDoc(collection(db, 'warehouses'), { ...warehouseForm });
      setShowWarehouseAdd(false);
      setWarehouseForm({ name: '' });
  };`,
    replacement: `      await addDoc(collection(db, 'warehouses'), { ...warehouseForm });
      setShowWarehouseAdd(false);
      setWarehouseForm({ name: '' });
    } catch (err) {
      console.error(err);
    }
  };`
  },
  {
    name: 'handleAddUnit',
    pattern: `      await addDoc(collection(db, 'units'), { ...unitForm });
      setShowUnitAdd(false);
      setUnitForm({ name: '' });
  };`,
    replacement: `      await addDoc(collection(db, 'units'), { ...unitForm });
      setShowUnitAdd(false);
      setUnitForm({ name: '' });
    } catch (err) {
      console.error(err);
    }
  };`
  },
  {
    name: 'handleAddCostCenter',
    pattern: `      await addDoc(collection(db, 'costCenters'), { ...costCenterForm });
      setShowCostCenterAdd(false);
      setCostCenterForm({ name: '' });
  };`,
    replacement: `      await addDoc(collection(db, 'costCenters'), { ...costCenterForm });
      setShowCostCenterAdd(false);
      setCostCenterForm({ name: '' });
    } catch (err) {
      console.error(err);
    }
  };`
  },
  {
    name: 'handleDeleteEntity',
    pattern: `      await deleteDoc(doc(db, showDeleteConfirmBase.collection, showDeleteConfirmBase.id));
      setShowDeleteConfirmBase(null);
  };`,
    replacement: `      await deleteDoc(doc(db, showDeleteConfirmBase.collection, showDeleteConfirmBase.id));
      setShowDeleteConfirmBase(null);
    } catch (err) {
      console.error(err);
    }
  };`
  },
  {
    name: 'handleUpdateItem',
    pattern: `      await updateDoc(doc(db, 'items', id), updatedData);
      setEditingItem(null);
  };`,
    replacement: `      await updateDoc(doc(db, 'items', id), updatedData);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
    }
  };`
  },
  {
    name: 'handleUpdateSupplier',
    pattern: `      await updateDoc(doc(db, 'suppliers', editingSupplier.id), { 
        name: editingSupplier.name,
        openingBalance: Number(editingSupplier.openingBalance) || 0,
        balance: increment(openingBalanceDiff)
      });
      setEditingSupplier(null);
  };`,
    replacement: `      await updateDoc(doc(db, 'suppliers', editingSupplier.id), { 
        name: editingSupplier.name,
        openingBalance: Number(editingSupplier.openingBalance) || 0,
        balance: increment(openingBalanceDiff)
      });
      setEditingSupplier(null);
    } catch (err) {
      console.error(err);
    }
  };`
  },
  {
    name: 'handleUpdateWarehouse',
    pattern: `      await updateDoc(doc(db, 'warehouses', editingWarehouse.id), { name: editingWarehouse.name });
      setEditingWarehouse(null);
  };`,
    replacement: `      await updateDoc(doc(db, 'warehouses', editingWarehouse.id), { name: editingWarehouse.name });
      setEditingWarehouse(null);
    } catch (err) {
      console.error(err);
    }
  };`
  },
  {
    name: 'handleUpdateUnit',
    pattern: `      await updateDoc(doc(db, 'units', editingUnit.id), { name: editingUnit.name });
      setEditingUnit(null);
  };`,
    replacement: `      await updateDoc(doc(db, 'units', editingUnit.id), { name: editingUnit.name });
      setEditingUnit(null);
    } catch (err) {
      console.error(err);
    }
  };`
  },
  {
    name: 'handleUpdateCostCenter',
    pattern: `      await updateDoc(doc(db, 'costCenters', editingCostCenter.id), { name: editingCostCenter.name });
      setEditingCostCenter(null);
  };`,
    replacement: `      await updateDoc(doc(db, 'costCenters', editingCostCenter.id), { name: editingCostCenter.name });
      setEditingCostCenter(null);
    } catch (err) {
      console.error(err);
    }
  };`
  }
];

for (const fix of handlersFixes) {
  if (content.includes(fix.pattern)) {
    content = content.replace(fix.pattern, fix.replacement);
    console.log(`Successfully fixed try-catch closure for handler: ${fix.name}`);
  } else {
    console.log(`WARNING: Handlers pattern for ${fix.name} not found!`);
  }
}

// --- 7. Fix unclosed try blocks in button onClick on Warehouse/Unit/CostCenter editing modal ---
const warehouseModalBtnOld = `                <Button onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'warehouses', editingWarehouse.id), { name: editingWarehouse.name });
                    setEditingWarehouse(null);
                }} className="btn-primary px-8 h-11 font-black">حفظ</Button>`;

const warehouseModalBtnNew = `                <Button onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'warehouses', editingWarehouse.id), { name: editingWarehouse.name });
                    setEditingWarehouse(null);
                  } catch (err) {
                    console.error(err);
                  }
                }} className="btn-primary px-8 h-11 font-black">حفظ</Button>`;

if (content.includes(warehouseModalBtnOld)) {
  content = content.replace(warehouseModalBtnOld, warehouseModalBtnNew);
  console.log('Fixed warehouse edit modal button try-catch');
}

const unitModalBtnOld = `                <Button onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'units', editingUnit.id), { name: editingUnit.name });
                    setEditingUnit(null);
                }} className="btn-primary px-8 h-11 font-black">حفظ</Button>`;

const unitModalBtnNew = `                <Button onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'units', editingUnit.id), { name: editingUnit.name });
                    setEditingUnit(null);
                  } catch (err) {
                    console.error(err);
                  }
                }} className="btn-primary px-8 h-11 font-black">حفظ</Button>`;

if (content.includes(unitModalBtnOld)) {
  content = content.replace(unitModalBtnOld, unitModalBtnNew);
  console.log('Fixed unit edit modal button try-catch');
}

const costCenterModalBtnOld = `                <Button onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'costCenters', editingCostCenter.id), { name: editingCostCenter.name });
                    setEditingCostCenter(null);
                }} className="btn-primary px-8 h-11 font-black">حفظ</Button>`;

const costCenterModalBtnNew = `                <Button onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'costCenters', editingCostCenter.id), { name: editingCostCenter.name });
                    setEditingCostCenter(null);
                  } catch (err) {
                    console.error(err);
                  }
                }} className="btn-primary px-8 h-11 font-black">حفظ</Button>`;

if (content.includes(costCenterModalBtnOld)) {
  content = content.replace(costCenterModalBtnOld, costCenterModalBtnNew);
  console.log('Fixed cost center edit modal button try-catch');
}

// Write the fully updated content back to App.tsx
fs.writeFileSync(filePath, content, 'utf8');
console.log('All updates applied perfectly to App.tsx!');
