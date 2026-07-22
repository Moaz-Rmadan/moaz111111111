import React, { useState, useMemo } from 'react';
import { 
  Truck, Fuel, Wrench, Settings, Plus, Search, Filter, 
  MoreHorizontal, AlertTriangle, CheckCircle, Clock, 
  Calendar, MapPin, User, FileText, Activity, Droplets,
  CreditCard, Gauge, ShieldCheck, History
} from 'lucide-react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Vehicle, VehicleExpense, Employee, Safe } from '../types';
import { db } from '../firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, 
  query, where, orderBy, limit 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { NumberDisplay } from '../lib/numberUtils';

interface FleetManagerProps {
  vehicles: Vehicle[];
  expenses: VehicleExpense[];
  employees: Employee[];
  safes: Safe[];
}

export const FleetManager: React.FC<FleetManagerProps> = ({ 
  vehicles = [], 
  expenses = [], 
  employees = [],
  safes = []
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  const handleAddVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newVehicle = {
      plateNumber: formData.get('plateNumber'),
      type: formData.get('type'),
      brand: formData.get('brand'),
      modelYear: Number(formData.get('modelYear')),
      driverId: formData.get('driverId'),
      driverName: employees.find(emp => emp.id === formData.get('driverId'))?.name || '',
      status: 'نشط',
      licenseExpiryDate: formData.get('licenseExpiryDate'),
      insuranceExpiryDate: formData.get('insuranceExpiryDate'),
      odometerReading: Number(formData.get('odometerReading')),
      maintenanceInterval: Number(formData.get('maintenanceInterval')),
      lastMaintenanceOdometer: Number(formData.get('odometerReading')),
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'vehicles'), newVehicle);
      setShowAddVehicle(false);
    } catch (error) {
      console.error("Error adding vehicle:", error);
    }
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const vehicleId = formData.get('vehicleId') as string;
    const type = formData.get('type') as any;
    const amount = Number(formData.get('amount'));
    const odometerReading = Number(formData.get('odometerReading'));

    const newExpense = {
      vehicleId,
      date: formData.get('date'),
      type,
      amount,
      fuelQuantity: type === 'بنزين' || type === 'سولار' ? Number(formData.get('fuelQuantity')) : null,
      odometerReading,
      description: formData.get('description'),
      safeId: formData.get('safeId'),
      createdBy: 'مدير النظام',
      createdAt: serverTimestamp()
    };

    try {
      // 1. Add expense record
      await addDoc(collection(db, 'vehicleExpenses'), newExpense);

      // 2. Update vehicle odometer and maintenance if needed
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        const updates: any = {
          odometerReading: Math.max(vehicle.odometerReading, odometerReading)
        };

        if (type === 'زيت' || type === 'صيانة') {
          updates.lastMaintenanceOdometer = odometerReading;
        }

        await updateDoc(doc(db, 'vehicles', vehicleId), updates);
      }

      setShowAddExpense(false);
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <Truck size={24} />
            </div>
            إدارة الأسطول والحركة
          </h2>
          <p className="text-slate-500 font-bold mt-2 mr-15">متابعة صيانة السيارات، تغيير الزيت، استهلاك الوقود والتراخيص</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowAddExpense(true)}
            variant="outline"
            className="h-12 px-6 rounded-2xl font-black text-sm border-amber-200 text-amber-700 hover:bg-amber-50 flex items-center gap-2"
          >
            <Fuel size={18} />
            تسجيل مصروف / وقود
          </Button>
          <Button 
            onClick={() => setShowAddVehicle(true)}
            className="h-12 px-6 rounded-2xl font-black text-sm bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 flex items-center gap-2"
          >
            <Plus size={18} />
            إضافة سيارة جديدة
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-1.5 rounded-[2rem] border border-slate-100 shadow-sm h-16 mb-6">
          <TabsTrigger value="overview" className="rounded-full px-8 font-black text-sm data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <Activity size={18} className="ml-2" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="rounded-full px-8 font-black text-sm data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <Truck size={18} className="ml-2" />
            قائمة السيارات
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-8 font-black text-sm data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <Droplets size={18} className="ml-2" />
            تغيير الزيت والصيانة
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-full px-8 font-black text-sm data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <CreditCard size={18} className="ml-2" />
            سجل المصروفات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="rounded-[2.5rem] border-none shadow-sm bg-gradient-to-br from-white to-amber-50/30">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                  <Truck size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-500 uppercase tracking-wider">إجمالي السيارات</p>
                  <h3 className="text-4xl font-black text-slate-900">{vehicles.length}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-sm bg-gradient-to-br from-white to-blue-50/30">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <Wrench size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-500 uppercase tracking-wider">سيارات في الصيانة</p>
                  <h3 className="text-4xl font-black text-slate-900">{vehicles.filter(v => v.status === 'في الصيانة').length}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-sm bg-gradient-to-br from-white to-red-50/30">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                  <AlertTriangle size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-500 uppercase tracking-wider">تنبيهات تغيير الزيت</p>
                  <h3 className="text-4xl font-black text-slate-900">
                    {vehicles.filter(v => (v.odometerReading - (v.lastMaintenanceOdometer || 0)) >= (v.maintenanceInterval || 5000)).length}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <Fuel size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-500 uppercase tracking-wider">مصروفات الشهر (ر.س)</p>
                  <h3 className="text-3xl font-black text-slate-900">
                    <NumberDisplay value={expenses.reduce((acc, curr) => acc + curr.amount, 0)} />
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black text-slate-900">قائمة سيارات المصنع</CardTitle>
                <div className="relative w-72">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    placeholder="ابحث برقم اللوحة أو الماركة..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 rounded-xl bg-slate-50 border-slate-100 h-11 text-sm font-bold"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-right font-black text-slate-700 p-6">السيارة</TableHead>
                    <TableHead className="text-right font-black text-slate-700">السائق</TableHead>
                    <TableHead className="text-right font-black text-slate-700">الحالة</TableHead>
                    <TableHead className="text-center font-black text-slate-700">العداد الحالي</TableHead>
                    <TableHead className="text-center font-black text-slate-700">انتهاء الرخصة</TableHead>
                    <TableHead className="text-left font-black text-slate-700 p-6">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map(vehicle => (
                    <TableRow key={vehicle.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-black">
                            {vehicle.plateNumber}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{vehicle.brand}</p>
                            <p className="text-xs font-bold text-slate-400">{vehicle.type} - {vehicle.modelYear}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <User size={14} />
                          </div>
                          <span className="font-bold text-slate-700">{vehicle.driverName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`rounded-lg px-3 py-1 font-black ${
                          vehicle.status === 'نشط' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          vehicle.status === 'في الصيانة' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-black text-slate-900 text-lg">{vehicle.odometerReading.toLocaleString()}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">KM</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-600">
                        {vehicle.licenseExpiryDate}
                      </TableCell>
                      <TableCell className="p-6 text-left">
                         <div className="flex items-center justify-end gap-2">
                           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-amber-500">
                             <Wrench size={16} />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-blue-500">
                             <History size={16} />
                           </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
           <div className="grid grid-cols-1 gap-6">
             {vehicles.map(vehicle => {
               const kmSinceLast = vehicle.odometerReading - (vehicle.lastMaintenanceOdometer || 0);
               const progress = Math.min(100, (kmSinceLast / (vehicle.maintenanceInterval || 5000)) * 100);
               const needsMaintenance = kmSinceLast >= (vehicle.maintenanceInterval || 5000);

               return (
                 <Card key={vehicle.id} className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden group">
                   <div className="flex flex-col md:flex-row">
                     <div className={`w-full md:w-48 flex flex-col items-center justify-center p-8 border-l border-slate-50 transition-colors ${needsMaintenance ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${needsMaintenance ? 'bg-red-500 text-white shadow-red-200' : 'bg-white text-slate-600'}`}>
                          <Droplets size={32} />
                        </div>
                        <h4 className="font-black text-slate-900 text-lg">{vehicle.plateNumber}</h4>
                        <p className="text-xs font-bold text-slate-400 mt-1">{vehicle.brand}</p>
                     </div>
                     <div className="flex-1 p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                           <div className="flex-1 space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-slate-500">مؤشر استهلاك الزيت / الصيانة</span>
                                <span className={`text-sm font-black ${needsMaintenance ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {kmSinceLast.toLocaleString()} / {(vehicle.maintenanceInterval || 5000).toLocaleString()} كم
                                </span>
                              </div>
                              <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  className={`h-full rounded-full ${needsMaintenance ? 'bg-red-500' : 'bg-amber-500'} shadow-sm`}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                {needsMaintenance ? (
                                  <div className="flex items-center gap-2 text-red-600 font-black text-sm">
                                    <AlertTriangle size={16} />
                                    <span>يجب تغيير الزيت أو إجراء الصيانة فوراً!</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                                    <CheckCircle size={16} />
                                    <span>الحالة جيدة - متبقي {( (vehicle.maintenanceInterval || 5000) - kmSinceLast ).toLocaleString()} كم</span>
                                  </div>
                                )}
                              </div>
                           </div>
                           <div className="flex flex-col gap-2 shrink-0">
                              <Button className="h-12 px-6 rounded-2xl font-black text-sm bg-slate-900 text-white hover:bg-slate-800">
                                تسجيل صيانة جديدة
                              </Button>
                              <Button variant="outline" className="h-12 px-6 rounded-2xl font-black text-sm">
                                عرض السجل
                              </Button>
                           </div>
                        </div>
                     </div>
                   </div>
                 </Card>
               );
             })}
           </div>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
             <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black text-slate-900">سجل مصروفات الوقود والصيانة</CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-right font-black text-slate-700 p-6">التاريخ</TableHead>
                      <TableHead className="text-right font-black text-slate-700">السيارة</TableHead>
                      <TableHead className="text-right font-black text-slate-700">النوع</TableHead>
                      <TableHead className="text-right font-black text-slate-700">العداد</TableHead>
                      <TableHead className="text-right font-black text-slate-700">المبلغ</TableHead>
                      <TableHead className="text-right font-black text-slate-700">الوصف</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => {
                      const v = vehicles.find(veh => veh.id === exp.vehicleId);
                      return (
                        <TableRow key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="p-6 font-bold text-slate-600">{exp.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-lg font-black border-slate-200">
                              {v?.plateNumber || 'غير معروف'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 font-black text-slate-700">
                              {exp.type === 'بنزين' || exp.type === 'سولار' ? <Fuel size={14} className="text-amber-500" /> : <Wrench size={14} className="text-blue-500" />}
                              {exp.type}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-500 italic">{exp.odometerReading?.toLocaleString()} KM</TableCell>
                          <TableCell className="font-black text-slate-900">{exp.amount.toLocaleString()} ر.س</TableCell>
                          <TableCell className="text-xs font-bold text-slate-400">{exp.description}</TableCell>
                        </TableRow>
                      );
                    })}
                 </TableBody>
               </Table>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Vehicle Dialog */}
      <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
        <DialogContent className="rounded-[2.5rem] max-w-2xl overflow-hidden p-0 border-none shadow-2xl">
          <form onSubmit={handleAddVehicle}>
            <DialogHeader className="p-8 bg-slate-900 text-white text-right">
              <DialogTitle className="text-2xl font-black">إضافة سيارة جديدة للمصنع</DialogTitle>
              <CardDescription className="text-slate-400 font-bold mt-1 text-right">أدخل بيانات السيارة الأساسية وبيانات الترخيص</CardDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">رقم اللوحة</label>
                  <Input name="plateNumber" placeholder="مثلاً: ب ط ص 123" required className="h-12 rounded-2xl border-slate-100 font-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">الماركة / النوع</label>
                  <Input name="brand" placeholder="مثلاً: ايسوزو جامبو" required className="h-12 rounded-2xl border-slate-100 font-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">سنة الصنع</label>
                  <Input name="modelYear" type="number" placeholder="2024" required className="h-12 rounded-2xl border-slate-100 font-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">نوع السيارة</label>
                  <Select name="type" required>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 font-black">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="شاحنة نقل">شاحنة نقل</SelectItem>
                      <SelectItem value="دينا">دينا</SelectItem>
                      <SelectItem value="وانيت">وانيت</SelectItem>
                      <SelectItem value="ملاكي">ملاكي</SelectItem>
                      <SelectItem value="أخرى">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">السائق المسؤول</label>
                  <Select name="driverId" required>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 font-black">
                      <SelectValue placeholder="اختر السائق" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">عداد الكيلومتر الحالي</label>
                  <Input name="odometerReading" type="number" placeholder="0" required className="h-12 rounded-2xl border-slate-100 font-black" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">تاريخ انتهاء الرخصة</label>
                  <Input name="licenseExpiryDate" type="date" required className="h-12 rounded-2xl border-slate-100 font-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">دورة الصيانة (كم)</label>
                  <Input name="maintenanceInterval" type="number" defaultValue="5000" required className="h-12 rounded-2xl border-slate-100 font-black text-blue-600" />
                </div>
              </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex-row-reverse">
              <Button type="button" variant="ghost" onClick={() => setShowAddVehicle(false)} className="rounded-2xl h-12 px-6 font-black">إلغاء</Button>
              <Button type="submit" className="rounded-2xl h-12 px-8 font-black bg-slate-900 text-white hover:bg-slate-800">حفظ السيارة</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent className="rounded-[2.5rem] max-w-xl overflow-hidden p-0 border-none shadow-2xl">
          <form onSubmit={handleAddExpense}>
            <DialogHeader className="p-8 bg-amber-500 text-white text-right">
              <DialogTitle className="text-2xl font-black">تسجيل مصروف / وقود لسيارة</DialogTitle>
              <CardDescription className="text-amber-100 font-bold mt-1 text-right">تسجيل استهلاك البنزين، الزيت، أو تكاليف الصيانة</CardDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">السيارة</label>
                  <Select name="vehicleId" required>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 font-black text-right">
                      <SelectValue placeholder="اختر السيارة" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.plateNumber} ({v.brand})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">التاريخ</label>
                  <Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="h-12 rounded-2xl border-slate-100 font-black text-right" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">نوع المصروف</label>
                  <Select name="type" required>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 font-black text-right">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="بنزين">بنزين</SelectItem>
                      <SelectItem value="سولار">سولار</SelectItem>
                      <SelectItem value="زيت">تغيير زيت</SelectItem>
                      <SelectItem value="صيانة">صيانة عامة</SelectItem>
                      <SelectItem value="رخصة">تجديد رخصة</SelectItem>
                      <SelectItem value="أخرى">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">المبلغ (ر.س)</label>
                  <Input name="amount" type="number" step="0.01" required className="h-12 rounded-2xl border-slate-100 font-black text-emerald-600 text-right" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">قراءة العداد (كم)</label>
                  <Input name="odometerReading" type="number" required className="h-12 rounded-2xl border-slate-100 font-black text-right" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">من خزنة</label>
                  <Select name="safeId" required>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 font-black text-right">
                      <SelectValue placeholder="اختر الخزنة" />
                    </SelectTrigger>
                    <SelectContent>
                      {safes.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">الوصف / ملاحظات</label>
                <Input name="description" placeholder="تفاصيل المصروف..." className="h-12 rounded-2xl border-slate-100 font-black text-right" />
              </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex-row-reverse">
              <Button type="button" variant="ghost" onClick={() => setShowAddExpense(false)} className="rounded-2xl h-12 px-6 font-black">إلغاء</Button>
              <Button type="submit" className="rounded-2xl h-12 px-8 font-black bg-amber-500 text-white hover:bg-amber-600">تسجيل المصروف</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
