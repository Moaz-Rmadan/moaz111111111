import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from './ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, 
  UserPlus, 
  Save, 
  Loader2, 
  Shield, 
  Search, 
  Filter, 
  Edit2, 
  X, 
  Check, 
  Copy, 
  UserCheck, 
  RefreshCw, 
  Eye, 
  ShieldAlert, 
  ArrowRightLeft,
  Users,
  Settings,
  Briefcase,
  Cpu,
  Package,
  ShoppingBag,
  Clock,
  Menu,
  Sparkles,
  Info
} from 'lucide-react';

interface RoleTemplate {
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  permissions: UserProfile['permissions'];
}

const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  storekeeper: {
    name: 'أمين مخزن',
    description: 'إدارة المخازن، الأرصدة، جرد المخزن، وحركات الصرف والمرتجع',
    icon: Package,
    color: 'text-amber-600 border-amber-200',
    bgColor: 'bg-amber-50',
    permissions: {
      dashboard: true,
      inventory: true,
      production: false,
      maintenance: false,
      purchases: false,
      hr: false,
      reports: false,
      suppliers: true,
      settings: false,
      finance: false,
      sales: false,
      vehicles: false,
      canDelete: false,
    }
  },
  production_mgr: {
    name: 'مدير إنتاج',
    description: 'إدارة أوامر الشغل، سجل الإنتاج، وسن الصفايح وبطاقات الشغل',
    icon: Cpu,
    color: 'text-indigo-600 border-indigo-200',
    bgColor: 'bg-indigo-50',
    permissions: {
      dashboard: true,
      inventory: true,
      production: true,
      maintenance: true,
      purchases: false,
      hr: false,
      reports: true,
      suppliers: false,
      settings: false,
      finance: false,
      sales: false,
      vehicles: true,
      canDelete: false,
    }
  },
  accountant: {
    name: 'محاسب / مدير مالي',
    description: 'التحكم بالمالية والخزنة، المشتريات، الموردين، والتقارير المالية',
    icon: Briefcase,
    color: 'text-emerald-600 border-emerald-200',
    bgColor: 'bg-emerald-50',
    permissions: {
      dashboard: true,
      inventory: true,
      production: false,
      maintenance: false,
      purchases: true,
      hr: false,
      reports: true,
      suppliers: true,
      settings: false,
      finance: true,
      sales: true,
      vehicles: true,
      canDelete: false,
    }
  },
  hr_mgr: {
    name: 'مدير الموارد البشرية',
    description: 'إدارة الموظفين، الحضور والانصراف، السلف، ومسير الرواتب',
    icon: Users,
    color: 'text-blue-600 border-blue-200',
    bgColor: 'bg-blue-50',
    permissions: {
      dashboard: true,
      inventory: false,
      production: false,
      maintenance: false,
      purchases: false,
      hr: true,
      reports: true,
      suppliers: false,
      settings: false,
      finance: false,
      sales: false,
      vehicles: false,
      canDelete: false,
    }
  },
  sales_officer: {
    name: 'مسؤول مبيعات ومعارض',
    description: 'إدارة موديول المبيعات والمعارض ومتابعة فواتير البيع والأرصدة',
    icon: ShoppingBag,
    color: 'text-rose-600 border-rose-200',
    bgColor: 'bg-rose-50',
    permissions: {
      dashboard: true,
      inventory: true,
      production: false,
      maintenance: false,
      purchases: false,
      hr: false,
      reports: false,
      suppliers: false,
      settings: false,
      finance: false,
      sales: true,
      vehicles: false,
      canDelete: false,
    }
  },
  viewer: {
    name: 'مستعرض (مشاهد فقط)',
    description: 'عرض لوحة التحكم والتقارير العامة دون صلاحية الإدخال أو الحذف',
    icon: Eye,
    color: 'text-slate-600 border-slate-200',
    bgColor: 'bg-slate-50',
    permissions: {
      dashboard: true,
      inventory: false,
      production: false,
      maintenance: false,
      purchases: false,
      hr: false,
      reports: true,
      suppliers: false,
      settings: false,
      finance: false,
      sales: false,
      vehicles: false,
      canDelete: false,
    }
  }
};

export function UsersManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Form State
  const [newUserIdentifier, setNewUserIdentifier] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [customPermissions, setCustomPermissions] = useState<UserProfile['permissions']>({
    dashboard: true,
    inventory: false,
    production: false,
    maintenance: false,
    purchases: false,
    hr: false,
    reports: false,
    suppliers: false,
    settings: false,
    finance: false,
    sales: false,
    vehicles: false,
    canDelete: false
  });
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'admin' | 'standard'>('all');
  const [filterPermission, setFilterPermission] = useState<string>('all');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editPermissions, setEditPermissions] = useState<UserProfile['permissions']>({
    dashboard: true,
    inventory: false,
    production: false,
    maintenance: false,
    purchases: false,
    hr: false,
    reports: false,
    suppliers: false,
    settings: false,
    finance: false,
    sales: false,
    vehicles: false,
    canDelete: false
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Custom Delete Confirm state
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const fetchedUsers: UserProfile[] = [];
      snapshot.forEach(doc => {
        fetchedUsers.push({ ...doc.data(), uid: doc.id } as UserProfile);
      });
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActivePermissions = (templateKey: string) => {
    if (templateKey === 'custom') return customPermissions;
    return ROLE_TEMPLATES[templateKey]?.permissions || customPermissions;
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!newUserIdentifier || !newUserName) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    setIsAdding(true);
    try {
      const uid = newUserIdentifier.toLowerCase().trim();
      const cleanPassword = newUserPassword.trim();

      // Check if user already exists
      if (users.some(u => u.uid === uid)) {
        throw new Error('هذا البريد أو رقم الهاتف مسجل بالفعل');
      }

      // Determine permissions based on template
      const permissions = getActivePermissions(selectedTemplate);

      const isEmail = uid.includes('@');

      // Create profile
      const newProfile: UserProfile = {
        uid,
        email: isEmail ? uid : '',
        phone: isEmail ? '' : uid,
        password: cleanPassword, // Optional if they choose to log in with Google
        name: newUserName.trim(),
        isAdmin: false,
        permissions
      };

      await setDoc(doc(db, 'users', uid), newProfile);
      
      setUsers([...users, newProfile]);
      setSuccessMsg('تم إضافة المستخدم وتعيين الصلاحيات بنجاح!');
      setNewUserIdentifier('');
      setNewUserPassword('');
      setNewUserName('');
      setSelectedTemplate('custom');
      setCustomPermissions({
        dashboard: true,
        inventory: false,
        production: false,
        maintenance: false,
        purchases: false,
        hr: false,
        reports: false,
        suppliers: false,
        settings: false,
        finance: false,
        sales: false,
        canDelete: false
      });

      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error("Error creating user:", err);
      setError(err.message || 'حدث خطأ أثناء إضافة المستخدم');
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditIsAdmin(user.isAdmin);
    setEditPermissions({ ...user.permissions });
    setEditPassword(user.password || '');
  };

  const handleApplyTemplateToEdit = (templateKey: string) => {
    if (templateKey === 'custom') return;
    const template = ROLE_TEMPLATES[templateKey];
    if (template) {
      setEditPermissions({ ...template.permissions });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSavingEdit(true);
    setError('');

    const updatedProfile: UserProfile = {
      ...editingUser,
      name: editName.trim(),
      isAdmin: editIsAdmin,
      password: editPassword.trim(),
      permissions: editIsAdmin ? {
        dashboard: true,
        inventory: true,
        production: true,
        maintenance: true,
        purchases: true,
        hr: true,
        reports: true,
        suppliers: true,
        settings: true,
        finance: true,
        sales: true,
        vehicles: true,
        canDelete: true,
      } : editPermissions
    };

    try {
      await setDoc(doc(db, 'users', editingUser.uid), updatedProfile);
      setUsers(users.map(u => u.uid === editingUser.uid ? updatedProfile : u));
      setEditingUser(null);
      setSuccessMsg('تم تحديث بيانات المستخدم وصلاحياته بنجاح!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error("Error updating user:", err);
      setError('حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleTogglePermission = async (uid: string, permission: keyof UserProfile['permissions']) => {
    const userToUpdate = users.find(u => u.uid === uid);
    if (!userToUpdate) return;

    const updatedPermissions = {
      ...userToUpdate.permissions,
      [permission]: !userToUpdate.permissions[permission]
    };

    const updatedProfile = { ...userToUpdate, permissions: updatedPermissions };

    // Optimistic update
    setUsers(users.map(u => u.uid === uid ? updatedProfile : u));

    try {
      await setDoc(doc(db, 'users', uid), updatedProfile);
    } catch (err) {
      console.error("Error updating permissions:", err);
      // Revert on error
      setUsers(users.map(u => u.uid === uid ? userToUpdate : u));
    }
  };

  const handleToggleAdmin = async (uid: string) => {
    const userToUpdate = users.find(u => u.uid === uid);
    if (!userToUpdate) return;

    const newIsAdmin = !userToUpdate.isAdmin;
    
    // If making admin, grant all permissions
    const updatedPermissions = newIsAdmin ? {
      dashboard: true,
      inventory: true,
      production: true,
      maintenance: true,
      purchases: true,
      hr: true,
      reports: true,
      suppliers: true,
      settings: true,
      finance: true,
      sales: true,
      vehicles: true,
      canDelete: true,
    } : userToUpdate.permissions;

    const updatedProfile = { 
      ...userToUpdate, 
      isAdmin: newIsAdmin,
      permissions: updatedPermissions 
    };

    // Optimistic update
    setUsers(users.map(u => u.uid === uid ? updatedProfile : u));

    try {
      await setDoc(doc(db, 'users', uid), updatedProfile);
    } catch (err) {
      console.error("Error updating admin status:", err);
      // Revert on error
      setUsers(users.map(u => u.uid === uid ? userToUpdate : u));
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(users.filter(u => u.uid !== uid));
      setDeletingUserId(null);
      setSuccessMsg('تم حذف حساب المستخدم نهائياً');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Error deleting user profile:", err);
      setError('حدث خطأ أثناء حذف المستخدم');
    }
  };

  const handleCopyPermissions = (user: UserProfile) => {
    setCustomPermissions({ ...user.permissions });
    setSuccessMsg(`تم نسخ صلاحيات الموظف (${user.name}) جاهزة للصق في النموذج!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleToggleAllPermissions = (action: 'grant' | 'revoke') => {
    const val = action === 'grant';
    setCustomPermissions({
      dashboard: true,
      inventory: val,
      production: val,
      maintenance: val,
      purchases: val,
      hr: val,
      reports: val,
      suppliers: val,
      settings: val,
      finance: val,
      sales: val,
      vehicles: val,
      canDelete: val
    });
  };

  const permissionLabels: Record<keyof UserProfile['permissions'], { label: string, desc: string, group: string }> = {
    dashboard: { label: 'لوحة التحكم', desc: 'عرض المؤشرات والاحصائيات الأساسية والمختصرة', group: 'عام' },
    reports: { label: 'التقارير والتحليلات', desc: 'استعراض تحليلات الأرباح والمبيعات ومستويات المخزون المتقدمة', group: 'عام' },
    settings: { label: 'الإعدادات الأساسية', desc: 'التحكم في بيانات الشركة والعملات وهيكل النظام العام', group: 'عام' },
    
    inventory: { label: 'إدارة المخازن', desc: 'متابعة الأرصدة، كارت حركة الصنف، وجرد المستودع والهوالك', group: 'المخزون والتشغيل' },
    production: { label: 'أوامر الإنتاج والتشغيل', desc: 'متابعة بطاقات وتكاليف التشغيل ومحاضر الاستلام والتحميل', group: 'المخزون والتشغيل' },
    maintenance: { label: 'سجلات صيانة المعدات', desc: 'متابعة صيانة الآلات الخارجية وسجل سن مناشير وصفايح الحديد', group: 'المخزون والتشغيل' },
    
    purchases: { label: 'المشتريات وفواتير الوارد', desc: 'إدخال ومراجعة فواتير الشراء وحسابات التكلفة مع الموردين', group: 'التجارة والمالية' },
    suppliers: { label: 'إدارة الموردين', desc: 'تسجيل الموردين الجدد، ضبط كشوف الحسابات وتفاصيل العقود', group: 'التجارة والمالية' },
    sales: { label: 'المبيعات والمعارض', desc: 'إصدار فواتير البيع وإدارة مبيعات المعارض والعملاء الفرديين', group: 'التجارة والمالية' },
    finance: { label: 'المالية والخزن', desc: 'التحكم في حركات الصندوق (الخزنة)، التحويلات والتسويات المالية والعهد', group: 'التجارة والمالية' },
    
    hr: { label: 'إدارة الموارد البشرية (HR)', desc: 'شؤون الموظفين، الحضور والانصراف المباشر، وتعديل الرواتب والسلف', group: 'الموارد البشرية' },
    vehicles: { label: 'إدارة السيارات والأسطول', desc: 'متابعة أسطول السيارات، الصيانات، الزيوت، الوقود، وتراخيص المركبات', group: 'عام' },
    canDelete: { label: 'صلاحية الحذف النهائي', desc: 'القدرة على حذف أي مستند أو قيد أو فاتورة داخل النظام نهائياً', group: 'الأمان والرقابة' }
  };

  // Group permissions for elegant visual separation
  const groupedPermissions = Object.entries(permissionLabels).reduce((acc, [key, value]) => {
    if (!acc[value.group]) acc[value.group] = [];
    acc[value.group].push({ key: key as keyof UserProfile['permissions'], ...value });
    return acc;
  }, {} as Record<string, Array<{ key: keyof UserProfile['permissions'], label: string, desc: string }>>);

  // Filter & Search Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = 
      filterType === 'all' ? true :
      filterType === 'admin' ? user.isAdmin : !user.isAdmin;
    
    const matchesPermission = 
      filterPermission === 'all' ? true :
      user.permissions[filterPermission as keyof UserProfile['permissions']] === true;

    return matchesSearch && matchesType && matchesPermission;
  });

  // Dynamic Avatar Background Generator
  const getAvatarStyles = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      { bg: 'bg-indigo-50 text-indigo-600 border-indigo-100', gradient: 'from-indigo-500 to-purple-600' },
      { bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', gradient: 'from-emerald-500 to-teal-600' },
      { bg: 'bg-blue-50 text-blue-600 border-blue-100', gradient: 'from-blue-500 to-cyan-600' },
      { bg: 'bg-amber-50 text-amber-600 border-amber-100', gradient: 'from-amber-500 to-orange-600' },
      { bg: 'bg-rose-50 text-rose-600 border-rose-100', gradient: 'from-rose-500 to-pink-600' },
      { bg: 'bg-violet-50 text-violet-600 border-violet-100', gradient: 'from-violet-500 to-fuchsia-600' },
    ];
    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-[14px] border border-slate-100 h-[140px] flex flex-col justify-between shadow-sm">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-16" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-[14px] p-6 border border-slate-100 shadow-sm">
          <div className="flex justify-between mb-6">
            <Skeleton className="h-10 w-48 rounded-[10px]" />
            <Skeleton className="h-10 w-32 rounded-[10px]" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate high-level stats
  const totalUsersCount = users.length;
  const adminUsersCount = users.filter(u => u.isAdmin).length;
  const standardUsersCount = totalUsersCount - adminUsersCount;

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12" dir="rtl">
      
      {/* Dynamic Alerts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[14px] font-black text-base flex items-center gap-3 shadow-md"
          >
            <div className="p-1.5 bg-emerald-500 text-white rounded-full">
              <Check size={16} />
            </div>
            <span>{successMsg}</span>
          </motion.div>
        )}
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-[14px] font-black text-base flex items-center gap-3 shadow-md"
          >
            <div className="p-1.5 bg-rose-500 text-white rounded-full">
              <X size={16} />
            </div>
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bento-Style Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-100/50 flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-sm font-bold text-slate-400">إجمالي الحسابات</span>
            <h3 className="text-4xl font-black text-slate-800">{totalUsersCount}</h3>
            <p className="text-xs text-slate-500">حسابات نشطة في النظام</p>
          </div>
          <div className="p-5 bg-indigo-50 text-indigo-600 rounded-[14px]">
            <Users size={32} />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-100/50 flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-sm font-bold text-slate-400">مدراء النظام (Admins)</span>
            <h3 className="text-4xl font-black text-emerald-600">{adminUsersCount}</h3>
            <p className="text-xs text-slate-500">يمتلكون صلاحيات كاملة ومطلقة</p>
          </div>
          <div className="p-5 bg-emerald-50 text-emerald-600 rounded-[14px]">
            <Shield size={32} />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-100/50 flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-sm font-bold text-slate-400">الموظفين العاديين</span>
            <h3 className="text-4xl font-black text-amber-600">{standardUsersCount}</h3>
            <p className="text-xs text-slate-500">صلاحيات مخصصة حسب القسم</p>
          </div>
          <div className="p-5 bg-amber-50 text-amber-600 rounded-[14px]">
            <UserCheck size={32} />
          </div>
        </motion.div>
      </div>

      {/* Main Panel - Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column - Add User Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-2xl rounded-[14px] bg-white overflow-hidden border border-slate-100">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-[14px]">
                  <UserPlus size={20} />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-slate-900">مستخدم جديد</CardTitle>
                  <CardDescription className="text-xs font-bold text-slate-500 mt-1">
                    إنشاء ملف وصلاحيات لموظف جديد
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddUser} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">الاسم بالكامل</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="مثال: محمد أحمد علي"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">البريد الإلكتروني أو رقم الهاتف (المعرف)</label>
                  <input
                    type="text"
                    required
                    value={newUserIdentifier}
                    onChange={(e) => setNewUserIdentifier(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 font-bold text-slate-800 shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="example@gmail.com أو 0100000000"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-slate-400 font-bold">يمكن للمستخدم استخدام هذا المعرف لتسجيل الدخول.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">كلمة المرور الحالية/المؤقتة</label>
                  <input
                    type="text"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="أدخل كلمة مرور قوية"
                  />
                  <p className="text-[10px] text-slate-400 font-bold">يجب تزويد الموظف بكلمة المرور هذه ليتمكن من الدخول إلى حسابه.</p>
                </div>

                <div className="border-t border-slate-100 my-4 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-500" />
                      قالب الصلاحيات الجاهز
                    </label>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">ذكي</span>
                  </div>
                  
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm cursor-pointer"
                  >
                    <option value="custom">⚙️ تخصيص يدوي (Custom)</option>
                    {Object.entries(ROLE_TEMPLATES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.name}
                      </option>
                    ))}
                  </select>

                  {/* Template description mini box */}
                  {selectedTemplate !== 'custom' && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed font-semibold">
                      {ROLE_TEMPLATES[selectedTemplate]?.description}
                    </div>
                  )}
                </div>

                {/* Show/Hide Manual Checkbox selection when custom is selected */}
                {selectedTemplate === 'custom' && (
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">تحديد الصلاحيات يدوياً:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAllPermissions('grant')}
                          className="text-[10px] text-indigo-600 hover:underline font-bold"
                        >
                          منح الكل
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAllPermissions('revoke')}
                          className="text-[10px] text-slate-500 hover:underline font-bold"
                        >
                          تصفير
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                      {Object.entries(permissionLabels).map(([key, value]) => (
                        <label 
                          key={key} 
                          className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={customPermissions[key as keyof UserProfile['permissions']]}
                            onChange={() => {
                              setCustomPermissions({
                                ...customPermissions,
                                [key]: !customPermissions[key as keyof UserProfile['permissions']]
                              });
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-slate-700 truncate">{value.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isAdding} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black h-11 rounded-xl shadow-lg shadow-indigo-100/50 text-sm mt-2 transition-all"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="animate-spin ml-2" size={18} />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <UserPlus className="ml-2" size={18} />
                      إضافة الموظف للنظام
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Info / Security tips Card */}
          <Card className="border-none shadow-xl rounded-[1.5rem] bg-indigo-950 text-indigo-100 overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Info size={18} />
                <h4 className="font-black text-sm">نصيحة أمنية للنظام</h4>
              </div>
              <p className="text-[11px] text-indigo-200/90 leading-relaxed font-semibold">
                حساب المدير العام يمتلك صلاحية مطلقة ولا تتأثر صلاحياته الفردية بالتغييرات. تأكد دائماً من عدم منح صلاحية المدير العام إلا للمخولين قانونياً بذلك فقط.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns - User Management List, Search & Advanced Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-2xl rounded-[14px] bg-white overflow-hidden border border-slate-100">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-[14px]">
                    <Shield size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900">شجرة الصلاحيات والتحكم</CardTitle>
                    <CardDescription className="text-xs font-bold text-slate-500 mt-1">
                      إدارة وتعديل صلاحيات الوصول والمسؤوليات التفصيلية
                    </CardDescription>
                  </div>
                </div>

                {/* Quick Refresh */}
                <Button 
                  variant="outline" 
                  onClick={fetchUsers} 
                  className="h-9 px-3 rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-600 gap-1.5 self-start md:self-auto"
                >
                  <RefreshCw size={14} />
                  تحديث البيانات
                </Button>
              </div>
            </CardHeader>

            {/* Filter / Search Bar */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو البريد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pr-10 pl-3 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400 shrink-0" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-xs text-slate-800 shadow-sm focus:outline-none"
                >
                  <option value="all">كل أنواع الحسابات</option>
                  <option value="admin">المدراء العامين فقط</option>
                  <option value="standard">الموظفين فقط</option>
                </select>
              </div>

              <div>
                <select
                  value={filterPermission}
                  onChange={(e) => setFilterPermission(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-xs text-slate-800 shadow-sm focus:outline-none"
                >
                  <option value="all">فلترة حسب صلاحية معينة...</option>
                  {Object.entries(permissionLabels).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/30 border-b border-slate-100">
                    <TableRow>
                      <TableHead className="text-right py-4 px-6 font-black text-slate-600 text-xs">المستخدم والموظف</TableHead>
                      <TableHead className="text-right py-4 px-6 font-black text-slate-600 text-xs">حالة الحساب</TableHead>
                      <TableHead className="text-right py-4 px-6 font-black text-slate-600 text-xs">الصلاحيات النشطة</TableHead>
                      <TableHead className="text-center py-4 px-6 font-black text-slate-600 text-xs">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-slate-400 font-bold text-sm">
                            لا يوجد مستخدمين يطابقون خيارات البحث الحالية.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => {
                          const avatar = getAvatarStyles(user.name);
                          const isMasterUser = user.email === 'cfo.moaz@gmail.com';
                          
                          return (
                            <TableRow 
                              key={user.uid} 
                              className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors"
                            >
                              {/* Name & Avatar Column */}
                              <TableCell className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center font-black text-base border shrink-0 ${avatar.bg}`}>
                                    {user.name.trim().charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-black text-slate-900 text-sm truncate">{user.name}</span>
                                      {isMasterUser && (
                                        <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                                          مالك النظام
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-slate-400 text-[11px] truncate" dir="ltr">{user.email || user.phone || user.uid}</span>
                                      {user.password && (
                                        <span className="text-[10px] text-indigo-500 font-bold">كلمة المرور: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{user.password}</span></span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Admin Status Switcher */}
                              <TableCell className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer" 
                                      checked={user.isAdmin}
                                      onChange={() => handleToggleAdmin(user.uid)}
                                      disabled={isMasterUser}
                                    />
                                    <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-500 disabled:opacity-50"></div>
                                  </label>
                                  <span className={`text-[11px] font-black ${user.isAdmin ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {user.isAdmin ? 'مدير عام' : 'موظف مخصص'}
                                  </span>
                                </div>
                              </TableCell>

                              {/* Permissions Tags */}
                              <TableCell className="py-4 px-6">
                                {user.isAdmin ? (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-black inline-flex items-center gap-1">
                                    <Shield size={12} />
                                    كل الصلاحيات مفتوحة تلقائياً
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1 max-w-xs md:max-w-md">
                                    {Object.entries(user.permissions)
                                      .filter(([_, active]) => active)
                                      .slice(0, 4)
                                      .map(([perm]) => (
                                        <span 
                                          key={perm} 
                                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold"
                                        >
                                          {permissionLabels[perm as keyof UserProfile['permissions']]?.label || perm}
                                        </span>
                                      ))}
                                    {Object.entries(user.permissions).filter(([_, active]) => active).length > 4 && (
                                      <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-black">
                                        +{Object.entries(user.permissions).filter(([_, active]) => active).length - 4} أخرى
                                      </span>
                                    )}
                                    {Object.values(user.permissions).every(v => !v) && (
                                      <span className="text-[10px] text-slate-400 italic font-semibold">بلا أي صلاحية</span>
                                    )}
                                  </div>
                                )}
                              </TableCell>

                              {/* Actions Column */}
                              <TableCell className="py-4 px-6 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {/* Copy template button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyPermissions(user)}
                                    title="نسخ هذه الصلاحيات لاستخدامها لاحقاً"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                  >
                                    <Copy size={15} />
                                  </Button>

                                  {/* Edit permissions & profile */}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleOpenEdit(user)}
                                    className="h-8 px-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-black gap-1"
                                  >
                                    <Edit2 size={14} />
                                    تعديل الصلاحيات
                                  </Button>

                                  {/* Deletion Confirm State */}
                                  {!isMasterUser && (
                                    <>
                                      {deletingUserId === user.uid ? (
                                        <div className="flex items-center gap-1 animate-in zoom-in duration-200">
                                          <button
                                            onClick={() => handleDeleteUser(user.uid)}
                                            className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm hover:bg-red-700 transition-colors"
                                          >
                                            حذف أكيد
                                          </button>
                                          <button
                                            onClick={() => setDeletingUserId(null)}
                                            className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-1 rounded-md hover:bg-slate-200 transition-colors"
                                          >
                                            إلغاء
                                          </button>
                                        </div>
                                      ) : (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => setDeletingUserId(user.uid)}
                                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                        >
                                          <Trash2 size={15} />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Editing / Permissions Modal (Full Profile and Permission Customizer) */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[14px] shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-[14px]">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">تحديث حساب: {editingUser.name}</h3>
                    <p className="text-[11px] text-slate-500 font-bold" dir="ltr">{editingUser.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* User Basics Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">اسم الموظف بالكامل</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">نوع الصلاحيات الشاملة</label>
                    <div className="flex items-center gap-4 h-11 px-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="editRoleType"
                          checked={editIsAdmin}
                          onChange={() => setEditIsAdmin(true)}
                          disabled={editingUser.email === 'cfo.moaz@gmail.com'}
                          className="text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                        />
                        <span className="text-xs font-black text-slate-800">مدير عام للنظام</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="editRoleType"
                          checked={!editIsAdmin}
                          onChange={() => setEditIsAdmin(false)}
                          disabled={editingUser.email === 'cfo.moaz@gmail.com'}
                          className="text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                        />
                        <span className="text-xs font-black text-slate-800">موظف بصلاحيات مخصصة</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">كلمة المرور الحالية/الجديدة</label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder="تعديل كلمة المرور"
                    />
                  </div>
                </div>

                {/* Templates Quick Apply inside Edit */}
                {!editIsAdmin && (
                  <div className="p-4 bg-slate-50 rounded-[14px] border border-slate-100 space-y-3">
                    <div className="flex items-center gap-1 text-slate-700 font-bold text-xs">
                      <ArrowRightLeft size={14} className="text-indigo-500" />
                      تطبيق قالب سريع على هذا الموظف:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ROLE_TEMPLATES).map(([key, template]) => {
                        const Icon = template.icon;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleApplyTemplateToEdit(key)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                          >
                            <Icon size={14} className="text-slate-500" />
                            {template.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Detailed Permissions Matrix */}
                {!editIsAdmin ? (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-500 border-b border-slate-100 pb-2">تفاصيل الصلاحيات الفردية</h4>
                    
                    {Object.entries(groupedPermissions).map(([group, permissions]) => (
                      <div key={group} className="space-y-2">
                        <h5 className="text-[11px] font-black text-slate-400 bg-slate-50/50 px-2.5 py-1 rounded-md w-fit">{group}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {permissions.map((p) => {
                            const isChecked = editPermissions[p.key];
                            return (
                              <div 
                                key={p.key}
                                onClick={() => {
                                  setEditPermissions({
                                    ...editPermissions,
                                    [p.key]: !isChecked
                                  });
                                }}
                                className={`p-3 rounded-[14px] border cursor-pointer transition-all flex items-start gap-3 select-none ${
                                  isChecked 
                                    ? 'bg-emerald-50/60 border-emerald-200/80 shadow-sm shadow-emerald-50/50' 
                                    : 'bg-white border-slate-150 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  readOnly
                                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5 border-slate-300 mt-0.5"
                                />
                                <div className="space-y-0.5">
                                  <p className="text-xs font-black text-slate-800">{p.label}</p>
                                  <p className="text-[10px] text-slate-400 font-bold leading-normal">{p.desc}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-emerald-200 bg-emerald-50/20 rounded-[14px] text-center space-y-3">
                    <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full w-fit mx-auto">
                      <ShieldAlert size={36} />
                    </div>
                    <h4 className="text-base font-black text-emerald-800">حساب مدير عام نشط</h4>
                    <p className="text-xs font-bold text-emerald-600/90 max-w-md mx-auto leading-relaxed">
                      المدير العام يمتلك حق الوصول الفوري والكامل لكل موديولات وتطبيقات النظام شاملة مراجعة التقارير، الصرف، وتعديل الموظفين والمالية والحذف دون قيود.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border-slate-200 font-bold text-xs"
                >
                  إلغاء التعديل
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs h-10 px-6 gap-1.5 shadow-lg shadow-emerald-100/50"
                >
                  {isSavingEdit ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  حفظ الصلاحيات الجديدة
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
