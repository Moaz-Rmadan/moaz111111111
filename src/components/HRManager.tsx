import React, { useState, useMemo } from 'react';
import { 
  Users, Briefcase, Network, TreePalm, Plus, Search, Edit2, Trash2, 
  ChevronRight, ChevronDown, UserPlus, Building2, MapPin, Phone, 
  Mail, Calendar, CreditCard, ShieldCheck, FileText, Download,
  Filter, MoreHorizontal, ArrowRightLeft, UserCheck, UserX, UserMinus, Activity, FolderTree
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
import { Employee, Department, JobPosition } from '../types';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface HRManagerProps {
  employees: Employee[];
  departments: Department[];
  jobs: JobPosition[];
}

interface OrgDeptNodeProps {
  dept: Department;
  allDepts: Department[];
  allJobs: JobPosition[];
  allEmployees: Employee[];
  depth?: number;
}

const OrgDeptNode: React.FC<OrgDeptNodeProps> = ({ 
  dept, 
  allDepts, 
  allJobs, 
  allEmployees, 
  depth = 0 
}) => {
  const subDepts = allDepts.filter(d => d.parentId === dept.id);
  const deptJobs = allJobs.filter(j => j.departmentId === dept.id);
  const deptEmps = allEmployees.filter(e => e.departmentId === dept.id);

  return (
    <div className={`space-y-4 ${depth > 0 ? 'mr-8 border-r-2 border-slate-100 pr-8 mt-4' : ''}`}>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${depth === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50'} transition-colors`}>
              <Building2 size={24} />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900">{dept.name}</h4>
              <p className="text-xs font-bold text-slate-400 mt-0.5">{dept.description || 'لا يوجد وصف'}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-left">
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">الموظفين</span>
              <span className="text-lg font-black text-slate-900">{deptEmps.length}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">المسميات</span>
              <span className="text-lg font-black text-slate-900">{deptJobs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {subDepts.length > 0 && (
        <div className="space-y-4">
          {subDepts.map(sub => (
            <OrgDeptNode 
              key={sub.id} 
              dept={sub} 
              allDepts={allDepts} 
              allJobs={allJobs} 
              allEmployees={allEmployees} 
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const HRManager: React.FC<HRManagerProps> = ({ 
  employees = [], 
  departments = [], 
  jobs = [] 
}) => {
  const [activeTab, setActiveTab] = useState('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  
  // Modals state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);

  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', description: '', parentId: '' });
  const [jobForm, setJobForm] = useState({ title: '', departmentId: '', description: '', minSalary: 0, maxSalary: 0 });

  const handleAddDept = async () => {
    if (!deptForm.name) return;
    try {
      await addDoc(collection(db, 'departments'), {
        ...deptForm,
        createdAt: serverTimestamp()
      });
      setShowAddDept(false);
      setDeptForm({ name: '', description: '', parentId: '' });
    } catch (err) { console.error(err); }
  };

  const handleAddJob = async () => {
    if (!jobForm.title) return;
    try {
      await addDoc(collection(db, 'jobPositions'), {
        title: jobForm.title,
        departmentId: jobForm.departmentId,
        description: jobForm.description,
        baseSalaryRange: { min: jobForm.minSalary, max: jobForm.maxSalary }
      });
      setShowAddJob(false);
      setJobForm({ title: '', departmentId: '', description: '', minSalary: 0, maxSalary: 0 });
    } catch (err) { console.error(err); }
  };

  // Filtered Data
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           emp.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'all' || emp.departmentId === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [employees, searchTerm, selectedDept]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">إدارة الموارد البشرية</h2>
          <p className="text-slate-500 font-medium mt-1">تطوير الكوادر البشرية، الهيكل التنظيمي، والعمليات الإدارية</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowAddEmployee(true)} className="btn-primary rounded-[14px] h-12 px-6 shadow-lg shadow-indigo-200">
            <UserPlus size={18} className="ml-2" />
            <span className="font-black">توظيف جديد</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-1 rounded-3xl border border-slate-100 shadow-sm mb-6 sticky top-0 z-10">
          <TabsList className="bg-transparent border-none p-0 flex gap-1">
            <TabsTrigger value="employees" className="rounded-[14px] px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-xs transition-all">
              <Users size={16} className="ml-2" />
              الموظفين
            </TabsTrigger>
            <TabsTrigger value="departments" className="rounded-[14px] px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-xs transition-all">
              <Building2 size={16} className="ml-2" />
              الأقسام
            </TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-[14px] px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-xs transition-all">
              <Briefcase size={16} className="ml-2" />
              المسميات الوظيفية
            </TabsTrigger>
            <TabsTrigger value="structure" className="rounded-[14px] px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-xs transition-all">
              <Network size={16} className="ml-2" />
              الهيكل التنظيمي
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 px-2">
            <div className="relative group">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث سريع..." 
                className="h-10 w-48 lg:w-64 border-none bg-slate-50/50 rounded-[14px] pr-10 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all text-xs"
              />
            </div>
          </div>
        </div>

        <TabsContent value="employees" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode='popLayout'>
              {filteredEmployees.map((emp) => (
                <motion.div
                  key={emp.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className="group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-200 border-none bg-white rounded-[32px] overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                    <CardHeader className="p-6 pb-2">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-14 h-14 rounded-[14px] bg-indigo-50 flex items-center justify-center text-indigo-500 font-black text-xl">
                          {emp.name.charAt(0)}
                        </div>
                        <Badge className={`rounded-xl px-3 py-1 border-none font-black text-[10px] uppercase tracking-widest ${
                          emp.status === 'نشط' ? 'bg-emerald-50 text-emerald-600' : 
                          emp.status === 'موقوف' ? 'bg-red-50 text-red-600' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {emp.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-black text-slate-900 leading-tight mb-1">{emp.name}</CardTitle>
                      <CardDescription className="font-bold text-indigo-500 flex items-center gap-1.5">
                        <Briefcase size={14} />
                        {emp.position}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-4 space-y-4">
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                          <Building2 size={14} />
                        </div>
                        <span className="text-xs font-black">{emp.department || 'بدون قسم'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                          <Phone size={14} />
                        </div>
                        <span className="text-xs font-black font-mono tracking-tighter">{emp.phone || 'لا يوجد هاتف'}</span>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الراتب / اليومية</span>
                          <span className="text-sm font-black text-slate-900 font-mono">{(emp.baseSalary || emp.dailyRate).toLocaleString()} <span className="text-[10px] text-slate-400">ج.م</span></span>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                            <Edit2 size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <Card key={dept.id} className="rounded-[32px] border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden bg-white">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 rounded-[24px] bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                      <Building2 size={28} strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                      <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px]">
                        {employees.filter(e => e.departmentId === dept.id).length} موظف
                      </Badge>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{dept.name}</h3>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
                    {dept.description || 'لا يوجد وصف لهذا القسم'}
                  </p>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex -space-x-3 rtl:space-x-reverse">
                      {employees.filter(e => e.departmentId === dept.id).slice(0, 4).map((e, idx) => (
                        <div key={idx} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400 ring-2 ring-transparent group-hover:ring-indigo-50 transition-all">
                          {e.name.charAt(0)}
                        </div>
                      ))}
                      {employees.filter(e => e.departmentId === dept.id).length > 4 && (
                        <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-indigo-500">
                          +{employees.filter(e => e.departmentId === dept.id).length - 4}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" className="rounded-xl h-10 px-4 font-black text-xs text-indigo-600 hover:bg-indigo-50">
                      عرض التفاصيل
                      <ChevronRight size={14} className="mr-1 rotate-180" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            
            <button 
              onClick={() => setShowAddDept(true)}
              className="p-6 rounded-[32px] border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                <Plus size={32} />
              </div>
              <div>
                <p className="font-black text-slate-900">إضافة قسم جديد</p>
                <p className="text-slate-500 text-xs font-bold mt-1">توسيع الهيكل الإداري للشركة</p>
              </div>
            </button>
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="mt-0 focus-visible:outline-none">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-6 px-8">المسمى الوظيفي</TableHead>
                  <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">القسم</TableHead>
                  <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">نطاق الراتب</TableHead>
                  <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">عدد الموظفين</TableHead>
                  <TableHead className="text-left font-black text-slate-400 uppercase tracking-widest text-[10px] py-6 px-8">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="group border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="py-6 px-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                          <Briefcase size={18} />
                        </div>
                        <span className="font-black text-slate-900">{job.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <Badge variant="outline" className="rounded-lg border-slate-200 text-slate-500 font-bold px-3">
                        {departments.find(d => d.id === job.departmentId)?.name || 'غير محدد'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 font-mono text-sm">
                          {job.baseSalaryRange?.min.toLocaleString()} - {job.baseSalaryRange?.max.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 tracking-tighter">جنية مصري / شهرياً</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        <span className="font-black text-slate-900">{employees.filter(e => e.jobId === job.id).length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 px-8 text-left">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal size={18} className="text-slate-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {jobs.length === 0 && (
              <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 rounded-[28px] bg-slate-50 flex items-center justify-center text-slate-200">
                  <Briefcase size={40} />
                </div>
                <div className="max-w-xs mx-auto">
                  <h3 className="text-xl font-black text-slate-900">لا توجد وظائف مضافة</h3>
                  <p className="text-slate-500 font-medium text-sm mt-1 leading-relaxed">ابدأ بتحديد المسميات الوظيفية والأدوار داخل شركتك لتنظيم عملية التوظيف</p>
                </div>
                <Button onClick={() => setShowAddJob(true)} className="btn-primary rounded-[14px] h-12 px-8 mt-4">
                  إضافة أول وظيفة
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="structure" className="mt-8 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-[32px] border-none shadow-xl shadow-slate-200/50 overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-md sticky top-0 z-10 text-right">
                <div className="flex items-center justify-between flex-row-reverse">
                  <div>
                    <CardTitle className="text-2xl font-black text-slate-900">الهيكل التنظيمي</CardTitle>
                    <CardDescription className="text-slate-500 font-bold mt-1">توزيع الإدارات والأقسام في المصنع</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddDept(true)} className="rounded-[14px] bg-indigo-600 hover:bg-indigo-700 font-black shadow-lg shadow-indigo-100">
                    <Plus size={18} className="ml-2" />
                    إضافة قسم
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 bg-white/30" dir="rtl">
                <div className="space-y-4">
                  {departments.filter(d => !d.parentId || d.parentId === 'none').map(dept => (
                    <OrgDeptNode 
                      key={dept.id} 
                      dept={dept} 
                      allDepts={departments} 
                      allJobs={jobs}
                      allEmployees={employees}
                    />
                  ))}
                  {departments.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                      <FolderTree size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 font-bold">لا يوجد هيكل تنظيمي معرف حالياً</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-[32px] border-none shadow-xl shadow-slate-200/50 bg-indigo-600 text-white overflow-hidden relative text-right">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <CardHeader className="relative z-10 p-6">
                  <div className="w-12 h-12 bg-white/20 rounded-[14px] flex items-center justify-center backdrop-blur-md mb-4">
                    <Activity size={24} />
                  </div>
                  <CardTitle className="text-2xl font-black">إحصائيات الهيكل</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 px-8 pb-8 space-y-6">
                  <div className="flex items-center justify-between flex-row-reverse">
                    <span className="font-bold opacity-80">إجمالي الأقسام</span>
                    <span className="text-3xl font-black">{departments.length}</span>
                  </div>
                  <div className="flex items-center justify-between flex-row-reverse">
                    <span className="font-bold opacity-80">إجمالي الوظائف</span>
                    <span className="text-3xl font-black">{jobs.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={showAddDept} onOpenChange={setShowAddDept}>
        <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-indigo-600 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-[14px] flex items-center justify-center backdrop-blur-md">
                <Building2 size={24} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">إضافة قسم جديد</DialogTitle>
                <p className="text-indigo-100 font-bold text-sm mt-1">تحديد الإدارات والأقسام الرئيسية والفرعية</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-6 bg-white">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">اسم القسم</label>
              <Input 
                value={deptForm.name}
                onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                placeholder="مثال: إدارة الحسابات، قسم الإنتاج..."
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">القسم الرئيسي (اختياري)</label>
              <Select value={deptForm.parentId} onValueChange={v => setDeptForm({...deptForm, parentId: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold">
                  <SelectValue placeholder="اختر القسم الأب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون (قسم رئيسي)</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الوصف</label>
              <Input 
                value={deptForm.description}
                onChange={e => setDeptForm({...deptForm, description: e.target.value})}
                placeholder="وصف مختصر لمهام القسم"
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
            <Button variant="ghost" onClick={() => setShowAddDept(false)} className="font-black text-slate-500 hover:text-slate-900">إلغاء</Button>
            <Button onClick={handleAddDept} className="btn-primary bg-indigo-600 hover:bg-indigo-700 rounded-[14px] h-12 px-10 font-black shadow-lg shadow-indigo-100">حفظ القسم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddJob} onOpenChange={setShowAddJob}>
        <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-indigo-600 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-[14px] flex items-center justify-center backdrop-blur-md">
                <Briefcase size={24} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">إضافة مسمى وظيفي</DialogTitle>
                <p className="text-indigo-100 font-bold text-sm mt-1">تحديد المسميات والأدوار الوظيفية</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-6 bg-white">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">المسمى الوظيفي</label>
              <Input 
                value={jobForm.title}
                onChange={e => setJobForm({...jobForm, title: e.target.value})}
                placeholder="مثال: مدير مبيعات، مهندس تصنيع..."
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">القسم المرتبط</label>
              <Select value={jobForm.departmentId} onValueChange={v => setJobForm({...jobForm, departmentId: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold">
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الحد الأدنى للراتب</label>
                <Input 
                  type="number"
                  value={jobForm.minSalary}
                  onChange={e => setJobForm({...jobForm, minSalary: Number(e.target.value)})}
                  className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الحد الأقصى للراتب</label>
                <Input 
                  type="number"
                  value={jobForm.maxSalary}
                  onChange={e => setJobForm({...jobForm, maxSalary: Number(e.target.value)})}
                  className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
            <Button variant="ghost" onClick={() => setShowAddJob(false)} className="font-black text-slate-500 hover:text-slate-900">إلغاء</Button>
            <Button onClick={handleAddJob} className="btn-primary bg-indigo-600 hover:bg-indigo-700 rounded-[14px] h-12 px-10 font-black shadow-lg shadow-indigo-100">حفظ الوظيفة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
