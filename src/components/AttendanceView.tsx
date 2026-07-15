import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle2, Calendar, Edit2, Trash2, Users, Settings, AlertCircle, RefreshCw, Search, X } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, limit, writeBatch, startAfter, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Attendance, Employee } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function AttendanceView({ employees }: { employees: Employee[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('الكل');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchStartDate, setSearchStartDate] = useState<string>('');
  const [searchEndDate, setSearchEndDate] = useState<string>('');
  const [allLoaded, setAllLoaded] = useState<boolean>(false);
  
  // Custom shift/grace settings (initialized to standard values)
  const [shiftStart, setShiftStart] = useState<string>('08:00');
  const [shiftEnd, setShiftEnd] = useState<string>('18:00');
  const [gracePeriod, setGracePeriod] = useState<number>(15);

  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '08:00',
    checkOut: '18:00',
    status: 'حضور' as 'حضور' | 'غياب' | 'تأخير' | 'إجازة'
  });

  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [departments, setDepartments] = useState<string[]>(['الكل']);

  // Fetch today's records and all history on mount / employees refresh
  useEffect(() => {
    const depts = ['الكل', ...new Set(employees.filter(e => e.department).map(e => e.department!))];
    setDepartments(depts);
    fetchTodayAttendance();
    fetchAttendanceHistory(true);
  }, [employees]);

  // Handle dynamic time check-in change
  const handleCheckInTime = (time: string, isEdit = false, editObj?: Attendance) => {
    const [hours, minutes] = time.split(':').map(Number);
    const checkInMins = hours * 60 + minutes;
    
    // Default official start from employee or system settings
    const officialMins = 8 * 60; // 08:00 am

    const isLate = checkInMins > officialMins + gracePeriod;

    if (isEdit && editObj) {
      setEditingAttendance({
        ...editObj,
        checkIn: time,
        status: isLate ? 'تأخير' : 'حضور'
      });
    } else {
      setFormData(prev => ({
        ...prev,
        checkIn: time,
        status: isLate ? 'تأخير' : 'حضور'
      }));
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const q = query(collection(db, 'attendance'));
      const snap = await getDocs(q);
      const allDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      setTodayAttendance(allDocs.filter(a => a.date === todayStr));
    } catch (err) {
      console.error("Error fetching today's attendance:", err);
    }
  };

  const fetchAttendanceHistory = async (isInitial = false, loadAll = false) => {
    if (loading) return;
    if (!isInitial && !hasMore && !loadAll) return;
    setLoading(true);

    try {
      let q = query(
        collection(db, 'attendance'), 
        orderBy('date', 'desc')
      );

      if (!loadAll) {
        q = query(q, limit(150));
      }

      if (!isInitial && lastVisible && !loadAll) {
        q = query(q, startAfter(lastVisible));
      }

      const snap = await getDocs(q);
      const newDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      
      if (loadAll) {
        setHasMore(false);
        setAllLoaded(true);
        setAttendanceHistory(newDocs);
      } else {
        if (snap.docs.length < 150) setHasMore(false);
        setLastVisible(snap.docs[snap.docs.length - 1]);
        
        if (isInitial) {
          setAttendanceHistory(newDocs);
        } else {
          setAttendanceHistory(prev => [...prev, ...newDocs]);
        }
      }
    } catch (err) {
      console.error("Error fetching attendance history:", err);
    } finally {
      setLoading(false);
    }
  };

  const employeeStatus = employees.map(emp => {
    const att = todayAttendance.find(a => a.employeeId === emp.id);
    return { ...emp, attendance: att };
  });

  const missingAttendance = employeeStatus.filter(e => !e.attendance);
  const presentCount = employeeStatus.filter(e => e.attendance?.status === 'حضور' || e.attendance?.status === 'تأخير').length;
  const absentCount = employeeStatus.filter(e => e.attendance?.status === 'غياب').length;
  const lateCount = employeeStatus.filter(e => e.attendance?.status === 'تأخير').length;

  const quickMarkAllPresent = async () => {
    const batch = writeBatch(db);
    const todayStr = new Date().toISOString().split('T')[0];
    
    missingAttendance.forEach(emp => {
      const newRef = doc(collection(db, 'attendance'));
      batch.set(newRef, {
        employeeId: emp.id,
        date: todayStr,
        checkIn: shiftStart,
        checkOut: shiftEnd,
        status: 'حضور'
      });
    });
    
    await batch.commit();
    fetchTodayAttendance();
    fetchAttendanceHistory(true);
  };

  const handleAdd = async () => {
    if (!formData.employeeId || !formData.date) return;
    try {
      let finalStatus = formData.status;

      // Automatically re-evaluate delay if registered checkIn exists
      if (formData.status === 'حضور' || formData.status === 'تأخير') {
        const [hours, minutes] = formData.checkIn.split(':').map(Number);
        const checkInTime = hours * 60 + minutes;
        const [sH, sM] = shiftStart.split(':').map(Number);
        const officialTime = sH * 60 + sM;
        
        if (checkInTime > officialTime + gracePeriod) {
          finalStatus = 'تأخير';
        } else {
          finalStatus = 'حضور';
        }
      }

      await addDoc(collection(db, 'attendance'), {
        employeeId: formData.employeeId,
        date: formData.date,
        checkIn: formData.status === 'غياب' || formData.status === 'إجازة' ? '' : formData.checkIn,
        checkOut: formData.status === 'غياب' || formData.status === 'إجازة' ? '' : formData.checkOut,
        status: finalStatus
      });
      
      setShowAdd(false);
      setFormData({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        checkIn: '08:00',
        checkOut: '18:00',
        status: 'حضور'
      });
      
      fetchTodayAttendance();
      fetchAttendanceHistory(true);
    } catch (err) {
      console.error("Error adding attendance:", err);
    }
  };

  const handleUpdate = async () => {
    if (!editingAttendance) return;
    try {
      let finalStatus = editingAttendance.status;
      if (editingAttendance.status === 'حضور' || editingAttendance.status === 'تأخير') {
        const [hours, minutes] = editingAttendance.checkIn.split(':').map(Number);
        const checkInTime = hours * 60 + minutes;
        const [sH, sM] = shiftStart.split(':').map(Number);
        const officialTime = sH * 60 + sM;
        finalStatus = checkInTime > officialTime + gracePeriod ? 'تأخير' : 'حضور';
      }

      const { id, ...data } = editingAttendance;
      await updateDoc(doc(db, 'attendance', id), { 
        ...data, 
        status: finalStatus,
        checkIn: finalStatus === 'غياب' || finalStatus === 'إجازة' ? '' : editingAttendance.checkIn,
        checkOut: finalStatus === 'غياب' || finalStatus === 'إجازة' ? '' : editingAttendance.checkOut,
        isExcused: finalStatus === 'غياب' || finalStatus === 'إجازة' ? false : (editingAttendance.isExcused || false),
      });

      setEditingAttendance(null);
      fetchTodayAttendance();
      fetchAttendanceHistory(true);
    } catch (err) {
      console.error("Error updating attendance:", err);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'attendance', deletingId));
      setDeletingId(null);
      fetchTodayAttendance();
      fetchAttendanceHistory(true);
    } catch (err) {
      console.error("Error deleting attendance:", err);
    }
  };

  const filteredEmployeeStatus = employeeStatus.filter(e => {
    const matchesDept = selectedDept === 'الكل' || e.department === selectedDept;
    const empName = e.name ? String(e.name).toLowerCase() : '';
    const matchesSearch = empName.includes(searchTerm.trim().toLowerCase());
    return matchesDept && matchesSearch;
  });

  const filteredHistory = attendanceHistory.filter(att => {
    if (!att) return false;
    const emp = employees.find(e => e.id === att.employeeId);
    const matchesDept = selectedDept === 'الكل' || emp?.department === selectedDept;
    const empName = emp?.name ? String(emp.name).toLowerCase() : '';
    const matchesSearch = empName.includes(searchTerm.trim().toLowerCase());
    
    let matchesDateRange = true;
    if (searchStartDate) {
      matchesDateRange = matchesDateRange && att.date >= searchStartDate;
    }
    if (searchEndDate) {
      matchesDateRange = matchesDateRange && att.date <= searchEndDate;
    }
    
    return matchesDept && matchesSearch && matchesDateRange;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header section with explicit configuration info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">دفتر الحضور والانصراف</h2>
          <div className="flex flex-wrap gap-2 items-center text-slate-500 font-medium text-xs md:text-sm mt-1">
            <span className="bg-slate-100 px-2.5 py-1 rounded-full text-slate-700">بداية الوردية (الافتراضي): <strong className="font-bold text-primary">{shiftStart}</strong></span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-full text-slate-700">نهاية الوردية: <strong className="font-bold text-primary">{shiftEnd}</strong></span>
            <span className="bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full text-amber-800 flex items-center gap-1 font-bold">
              <Clock size={14} /> فترة سماح للتأخير: {gracePeriod} دقيقة (حتى {( () => {
                const [h, m] = shiftStart.split(':').map(Number);
                const total = h * 60 + m + gracePeriod;
                const rH = Math.floor(total / 60);
                const rM = total % 60;
                return `${String(rH).padStart(2, '0')}:${String(rM).padStart(2, '0')}`;
              })()})
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 mr-1">تصفية حسب القسم</label>
            <select 
              className="h-11 rounded-xl border border-slate-200 px-3 bg-slate-50 font-bold text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-xs text-transparent">إجراء</span>
            <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/95 text-white font-black rounded-xl h-11 px-5 shadow-md shadow-primary/10">
              <Plus size={18} className="ml-1.5" />
              تسجيل يدوي
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Cards for Today */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/10 rounded-2xl relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-blue-100 font-bold text-xs tracking-wide">الغياب اليوم</p>
                <h3 className="text-3xl font-black">{absentCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <AlertCircle className="text-white" size={20} />
              </div>
            </div>
            {missingAttendance.length > 0 && (
              <Button 
                onClick={quickMarkAllPresent}
                variant="ghost" 
                className="w-full mt-4 bg-white/15 hover:bg-white/20 border border-white/10 text-white font-black text-xs h-9 rounded-xl transition-all"
              >
                تسجيل حضور للكل المستحق ({missingAttendance.length})
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-sm rounded-2xl border border-slate-100">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-400 font-bold text-xs">حضور اليوم</p>
              <h3 className="text-3xl font-black text-slate-900">{presentCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-sm rounded-2xl border border-slate-100">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-400 font-bold text-xs">تأخير اليوم</p>
              <h3 className="text-3xl font-black text-amber-600">{lateCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Configurations Quick Panel */}
        <Card className="border-none bg-slate-900 text-white shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <h4 className="text-xs font-black text-slate-400 flex items-center gap-1 mb-2">
              <Settings size={14} className="text-primary" />
              إعدادات فترة السماح
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-[10px] text-slate-400 font-bold">بدء الوردية</span>
                <input 
                  type="time" 
                  value={shiftStart} 
                  onChange={e => setShiftStart(e.target.value)} 
                  className="w-full bg-slate-800 text-white border-none rounded-lg p-1 text-xs font-black mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold">دقائق السماح</span>
                <input 
                  type="number" 
                  value={gracePeriod} 
                  onChange={e => setGracePeriod(Number(e.target.value))} 
                  className="w-full bg-slate-800 text-white border-none rounded-lg p-1 text-xs font-black mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  min="0"
                  max="120"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters Row */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col lg:flex-row gap-4 items-center w-full xl:w-auto">
          {/* Employee Name Search */}
          <div className="relative w-full lg:w-72">
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={18} />
            </span>
            <Input
              type="text"
              placeholder="البحث باسم الموظف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-bold text-sm text-right"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Date Range: From Date */}
          <div className="relative w-full lg:w-48">
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 h-11 w-full text-slate-700">
              <span className="text-[10px] font-black text-slate-400 ml-2 shrink-0">من تاريخ:</span>
              <input
                type="date"
                value={searchStartDate}
                onChange={(e) => setSearchStartDate(e.target.value)}
                className="bg-transparent border-none text-xs font-black text-slate-700 outline-none w-full cursor-pointer text-right"
                title="تصفية من تاريخ"
              />
              {searchStartDate && (
                <button
                  onClick={() => setSearchStartDate('')}
                  className="mr-2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  X
                </button>
              )}
            </div>
          </div>

          {/* Date Range: To Date */}
          <div className="relative w-full lg:w-48">
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 h-11 w-full text-slate-700">
              <span className="text-[10px] font-black text-slate-400 ml-2 shrink-0">إلى تاريخ:</span>
              <input
                type="date"
                value={searchEndDate}
                onChange={(e) => setSearchEndDate(e.target.value)}
                className="bg-transparent border-none text-xs font-black text-slate-700 outline-none w-full cursor-pointer text-right"
                title="تصفية إلى تاريخ"
              />
              {searchEndDate && (
                <button
                  onClick={() => setSearchEndDate('')}
                  className="mr-2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  X
                </button>
              )}
            </div>
          </div>

          {/* Load all data button if not loaded yet */}
          {!allLoaded ? (
            <Button
              onClick={() => fetchAttendanceHistory(true, true)}
              disabled={loading}
              variant="outline"
              className="h-11 rounded-xl border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/5 font-bold text-xs px-4 w-full lg:w-auto"
            >
              {loading ? (
                <>جاري جلب السجل...</>
              ) : (
                <>جلب كامل السجل التاريخي للبحث المتقدم</>
              )}
            </Button>
          ) : (
            <Badge className="bg-green-50 text-green-700 border border-green-200 font-bold text-xs py-2 px-3 rounded-xl">
              تم تحميل كامل السجل التاريخي بنجاح
            </Badge>
          )}
        </div>

        {/* Info indicators */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-400 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 w-full xl:w-auto justify-center xl:justify-start">
          <span>نتائج البحث الحالية:</span>
          <span className="text-primary font-black bg-white px-2 py-0.5 rounded-lg border border-slate-200">
            {filteredHistory.length} حركة مسجلة
          </span>
          {searchTerm && (
            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
              الموظف: "{searchTerm}"
            </span>
          )}
          {(searchStartDate || searchEndDate) && (
            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
              الفترة: {searchStartDate || 'البداية'} ⟸ {searchEndDate || 'النهاية'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Today's Checklist Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-primary" />
              حالة حضور الموظفين اليوم
            </h3>
            <span className="text-[11px] font-bold text-slate-400">{filteredEmployeeStatus.length} موظف</span>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 max-h-[500px] overflow-y-auto divide-y divide-slate-50">
            {filteredEmployeeStatus.map(emp => (
              <div key={emp.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{emp.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold">{emp.position} - {emp.department || 'عام'}</p>
                  </div>
                </div>
                
                {emp.attendance ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                    <Badge className={`border-none font-bold text-[10px] px-2 py-0.5 ${
                      emp.attendance.status === 'حضور' ? 'bg-green-50 text-green-700' :
                      emp.attendance.status === 'تأخير' ? 'bg-amber-50 text-amber-700' :
                      emp.attendance.status === 'إجازة' ? 'bg-blue-50 text-blue-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {emp.attendance.status}
                      {emp.attendance.checkIn && ` (${emp.attendance.checkIn})`}
                    </Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="w-7 h-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                      onClick={() => setEditingAttendance(emp.attendance!)}
                      title="تعديل حركة اليوم"
                    >
                      <Edit2 size={10} />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 text-primary font-black text-xs bg-primary/5 hover:bg-primary/10 rounded-lg"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        employeeId: emp.id,
                        date: new Date().toISOString().split('T')[0],
                        status: 'حضور'
                      });
                      setShowAdd(true);
                    }}
                  >
                    رصد حضور
                  </Button>
                )}
              </div>
            ))}
            {filteredEmployeeStatus.length === 0 && (
              <p className="text-center text-slate-400 font-bold text-xs py-6">لا يوجد موظفين في هذا القسم</p>
            )}
          </div>
        </div>

        {/* History Table Panel */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              سجل حركات الحضور والانصراف
            </h3>
            <Button variant="ghost" size="sm" onClick={() => fetchAttendanceHistory(true)} className="h-8 font-bold text-xs text-slate-500 hover:bg-slate-50">
              <RefreshCw size={12} className="ml-1" /> تحديث السجل
            </Button>
          </div>

          <Card className="border-none shadow-sm border border-slate-100 rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="text-right font-black text-slate-700 text-xs py-3.5">المرسل / الموظف</TableHead>
                    <TableHead className="text-right font-black text-slate-700 text-xs">التاريخ</TableHead>
                    <TableHead className="text-right font-black text-slate-700 text-xs">الحضور</TableHead>
                    <TableHead className="text-right font-black text-slate-700 text-xs">الانصراف</TableHead>
                    <TableHead className="text-right font-black text-slate-700 text-xs">الحالة</TableHead>
                    <TableHead className="text-left font-black text-slate-700 text-xs px-4">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((record) => {
                    const emp = employees.find(e => e.id === record.employeeId);
                    return (
                      <TableRow key={record.id} className="group hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">
                              {emp?.name.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-black text-xs text-slate-900">{emp?.name || 'موظف محذوف'}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{emp?.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-xs text-slate-600">{record.date}</TableCell>
                        <TableCell className="font-bold text-xs text-slate-500">{record.checkIn || '-'}</TableCell>
                        <TableCell className="font-bold text-xs text-slate-500">{record.checkOut || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`border-none font-bold text-[10px] px-2 py-0.5 ${
                            record.status === 'حضور' ? 'bg-green-50 text-green-700' :
                            record.status === 'تأخير' ? 'bg-amber-50 text-amber-700' :
                            record.status === 'إجازة' ? 'bg-blue-50 text-blue-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                setEditingAttendance(record);
                              }} 
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg"
                            >
                              <Edit2 size={12} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                setDeletingId(record.id);
                              }} 
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-bold text-xs">
                        لا يوجد حركات حضور وانصراف حالية مسجلة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {hasMore && (
              <div className="p-3 flex justify-center bg-slate-50/50 border-t border-slate-100">
                <Button 
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-6 font-bold rounded-xl h-8.5 text-xs transition-colors"
                  onClick={() => fetchAttendanceHistory()}
                  disabled={loading}
                >
                  {loading ? 'جاري التحميل...' : 'عرض المزيد من السجل'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add manually card modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-md overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-5">
              <CardTitle className="font-black text-xl flex items-center gap-2 text-slate-900">
                <Plus size={20} className="text-primary" />
                رصد حركة حضور وانصراف
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs font-bold font-sans">تسجيل حركة حضور جديدة وتطبيق فترة السماح تلقائياً</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">الموظف</label>
                <select 
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formData.employeeId} 
                  onChange={e => setFormData({...formData, employeeId: e.target.value})}
                >
                  <option value="">-- اختر موظف --</option>
                  {employees.filter(e => e.status === 'نشط').map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">التاريخ</label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-11 rounded-xl bg-slate-50 font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الحالة العامة</label>
                  <select 
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-sm focus:outline-none"
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="حضور">حضور</option>
                    <option value="غياب">غياب</option>
                    <option value="تأخير">تأخير</option>
                    <option value="إجازة">إجازة</option>
                  </select>
                </div>
              </div>

              {formData.status !== 'غياب' && formData.status !== 'إجازة' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">وقت الحضور</label>
                    <Input 
                      type="time" 
                      value={formData.checkIn} 
                      onChange={e => handleCheckInTime(e.target.value, false)} 
                      className="h-10 rounded-lg bg-white font-black" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">وقت الانصراف</label>
                    <Input 
                      type="time" 
                      value={formData.checkOut} 
                      onChange={e => setFormData({...formData, checkOut: e.target.value})} 
                      className="h-10 rounded-lg bg-white font-black" 
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2.5 p-5 bg-slate-50 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setShowAdd(false)} className="rounded-xl font-bold h-11 px-4 text-xs">إلغاء</Button>
              <Button onClick={handleAdd} className="bg-primary hover:bg-primary/95 text-white rounded-xl h-11 px-6 font-black text-xs shadow-md">تسجيل الحركة</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Edit modal */}
      {editingAttendance && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-md overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-5">
              <CardTitle className="font-black text-xl flex items-center gap-2 text-slate-900">
                <Edit2 size={24} className="text-blue-500" />
                تعديل حركة الحضور والانصراف
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs font-bold font-sans">تحديث تفاصيل الرصد وتصحيح الحركات لتسجيلها بشكل دقيق</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs animate-pulse">
                  {employees.find(e => e.id === editingAttendance.employeeId)?.name.charAt(0) || 'م'}
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400">اسم الموظف</h4>
                  <p className="text-xs font-black text-slate-800">{employees.find(e => e.id === editingAttendance.employeeId)?.name || 'موظف غير معروف'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">التاريخ</label>
                  <Input type="date" value={editingAttendance.date} onChange={e => setEditingAttendance({...editingAttendance, date: e.target.value})} className="h-11 rounded-xl bg-slate-50 font-bold" disabled />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الحالة</label>
                  <select 
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-sm focus:outline-none"
                    value={editingAttendance.status} 
                    onChange={e => setEditingAttendance({...editingAttendance, status: e.target.value as any})}
                  >
                    <option value="حضور">حضور</option>
                    <option value="تأخير">تأخير</option>
                    <option value="غياب">غياب</option>
                    <option value="إجازة">إجازة</option>
                  </select>
                </div>
              </div>

              {editingAttendance.status !== 'غياب' && editingAttendance.status !== 'إجازة' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">وقت الحضور</label>
                      <Input 
                        type="time" 
                        value={editingAttendance.checkIn} 
                        onChange={e => handleCheckInTime(e.target.value, true, editingAttendance)} 
                        className="h-10 rounded-lg bg-white font-black" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">وقت الانصراف</label>
                      <Input 
                        type="time" 
                        value={editingAttendance.checkOut} 
                        onChange={e => setEditingAttendance({...editingAttendance, checkOut: e.target.value})} 
                        className="h-10 rounded-lg bg-white font-black" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                    <input
                      type="checkbox"
                      id="isExcusedCheck"
                      checked={editingAttendance.isExcused || false}
                      onChange={e => setEditingAttendance({...editingAttendance, isExcused: e.target.checked})}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 accent-amber-600 cursor-pointer"
                    />
                    <label htmlFor="isExcusedCheck" className="text-xs font-bold text-amber-900 cursor-pointer select-none">
                      إعفاء الموظف من استقطاعات هذا اليوم (التأخير والانصراف المبكر)
                    </label>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2.5 p-5 bg-slate-50 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setEditingAttendance(null)} className="rounded-xl font-bold h-11 px-4 text-xs">إلغاء</Button>
              <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-black text-xs shadow-md">حفظ وتحديث</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
            <CardHeader className="bg-red-50 text-red-900 p-5 border-b border-red-100">
              <CardTitle className="font-black text-lg flex items-center gap-2">
                <AlertCircle size={20} className="text-red-600 animate-pulse" />
                حذف الحركة؟
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-sm font-bold text-slate-600 font-sans">هل أنت متأكد من رغبتك في حذف حركة اليوم لمنتسب الحضور هذا؟ هذا الإجراء لا يمكن الرجوع عنه.</p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 p-5 bg-slate-50 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setDeletingId(null)} className="rounded-xl font-bold text-xs h-10 px-4">إلغاء</Button>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs h-10 px-5">تأكيد الحذف</Button>
            </CardFooter>
          </Card>
        </div>
      )}

    </div>
  );
}
