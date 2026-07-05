import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../AuthContext';
import { Button } from '@/components/ui/button';
import { Trash2, UserPlus, Save, Loader2, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function UsersManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newUserEmail || !newUserName) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    
    setIsAdding(true);
    try {
      const uid = newUserEmail.toLowerCase().trim();

      // Create default profile
      const newProfile: UserProfile = {
        uid,
        email: uid,
        name: newUserName,
        isAdmin: false,
        permissions: {
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
        }
      };

      await setDoc(doc(db, 'users', uid), newProfile);
      
      setUsers([...users.filter(u => u.uid !== uid), newProfile]);
      setNewUserEmail('');
      setNewUserName('');
    } catch (err: any) {
      console.error("Error creating user:", err);
      setError(err.message || 'حدث خطأ أثناء إضافة المستخدم');
    } finally {
      setIsAdding(false);
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

    const updatedProfile = { ...userToUpdate, isAdmin: !userToUpdate.isAdmin };

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
    if (!confirm('هل أنت متأكد من حذف حساب هذا المستخدم نهائياً من قاعدة البيانات؟')) return;
    
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(users.filter(u => u.uid !== uid));
    } catch (err) {
      console.error("Error deleting user profile:", err);
      alert('حدث خطأ أثناء حذف المستخدم');
    }
  };

  const permissionLabels: Record<keyof UserProfile['permissions'], string> = {
    dashboard: 'الرئيسية',
    inventory: 'المخازن',
    production: 'الإنتاج',
    maintenance: 'الصيانة',
    purchases: 'المشتريات',
    hr: 'الموارد البشرية',
    reports: 'التقارير',
    suppliers: 'الموردين',
    settings: 'الإعدادات',
    finance: 'المالية',
    sales: 'المبيعات',
    canDelete: 'صلاحية الحذف'
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
      <Card className="border-none shadow-2xl rounded-[2rem] bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <UserPlus size={24} />
            </div>
            <div>
              <CardTitle className="text-2xl font-black text-slate-900">إضافة مستخدم جديد</CardTitle>
              <CardDescription className="text-base font-bold text-slate-500 mt-1">
                إضافة حساب جديد للموظفين ليتمكنوا من تسجيل الدخول.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleAddUser} className="space-y-6">
            {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl font-bold">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">الاسم بالكامل</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="محمد أحمد"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">البريد الإلكتروني (Google Account)</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="user@gmail.com"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isAdding} className="bg-primary hover:bg-primary/90 text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-primary/20">
                {isAdding ? <Loader2 className="animate-spin ml-2" size={20} /> : <Save className="ml-2" size={20} />}
                إضافة المستخدم
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-2xl rounded-[2rem] bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <CardTitle className="text-2xl font-black text-slate-900">إدارة المستخدمين والصلاحيات</CardTitle>
              <CardDescription className="text-base font-bold text-slate-500 mt-1">
                التحكم الكامل في صلاحيات الوصول للموظفين والمديرين.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow>
                  <TableHead className="text-right py-5 px-6 font-black text-slate-700 text-base">المستخدم</TableHead>
                  <TableHead className="text-right py-5 px-6 font-black text-slate-700 text-base">مدير عام؟</TableHead>
                  <TableHead className="text-right py-5 px-6 font-black text-slate-700 text-base">الصلاحيات الفردية</TableHead>
                  <TableHead className="text-center py-5 px-6 font-black text-slate-700 text-base">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                    <TableCell className="py-5 px-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-lg">{user.name}</span>
                        <span className="font-bold text-slate-500 text-sm" dir="ltr">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={user.isAdmin}
                          onChange={() => handleToggleAdmin(user.uid)}
                          disabled={user.email === 'cfo.moaz@gmail.com'}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </TableCell>
                    <TableCell className="py-5 px-6">
                      <div className="flex flex-wrap gap-2 max-w-xl">
                        {(Object.keys(user.permissions) as Array<keyof UserProfile['permissions']>).map((perm) => (
                          <button
                            key={perm}
                            disabled={user.isAdmin}
                            onClick={() => handleTogglePermission(user.uid, perm)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              user.isAdmin 
                                ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                                : user.permissions[perm]
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {permissionLabels[perm]}
                          </button>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 text-center">
                      {user.email !== 'cfo.moaz@gmail.com' && (
                        <Button 
                          variant="ghost" 
                          onClick={() => handleDeleteUser(user.uid)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                        >
                          <Trash2 size={20} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
