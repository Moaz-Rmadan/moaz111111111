import React, { useState, useMemo } from 'react';
import { 
  Building2, CreditCard, ArrowUpCircle, ArrowDownCircle, Clock, 
  CheckCircle2, AlertCircle, Plus, Search, Filter, MoreHorizontal,
  History, Landmark, FileText, Calendar, Wallet, ArrowRightLeft,
  DollarSign, CheckSquare, RefreshCcw
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
import { BankAccount, BankTransaction, BankCheck as Check } from '../types';
import { db } from '../firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, increment 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { NumberDisplay } from '../lib/numberUtils';

interface BanksManagerProps {
  accounts: BankAccount[];
  transactions: BankTransaction[];
  checks: Check[];
}

export const BanksManager: React.FC<BanksManagerProps> = ({ 
  accounts = [], 
  transactions = [], 
  checks = [] 
}) => {
  const [activeTab, setActiveTab] = useState('accounts');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddCheck, setShowAddCheck] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    currency: 'EGP',
    initialBalance: 0
  });

  const [txForm, setTxForm] = useState({
    accountId: '',
    type: 'إيداع' as 'إيداع' | 'سحب' | 'عمولة',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    referenceNumber: ''
  });

  const [checkForm, setCheckForm] = useState({
    type: 'وارد' as 'وارد' | 'صادر',
    checkNumber: '',
    bankName: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    beneficiary: '',
    notes: ''
  });

  const handleAddAccount = async () => {
    if (!accountForm.bankName || !accountForm.accountNumber) return;
    try {
      await addDoc(collection(db, 'bankAccounts'), {
        ...accountForm,
        balance: accountForm.initialBalance,
        status: 'نشط',
        createdAt: serverTimestamp()
      });
      setShowAddAccount(false);
      setAccountForm({ bankName: '', accountName: '', accountNumber: '', currency: 'EGP', initialBalance: 0 });
    } catch (err) { console.error(err); }
  };

  const handleAddTransaction = async () => {
    if (!txForm.accountId || !txForm.amount) return;
    try {
      const batch = writeBatch(db);
      const txRef = doc(collection(db, 'bankTransactions'));
      
      batch.set(txRef, {
        ...txForm,
        createdBy: 'system',
        createdAt: serverTimestamp()
      });

      const amountChange = txForm.type === 'إيداع' ? txForm.amount : -txForm.amount;
      batch.update(doc(db, 'bankAccounts', txForm.accountId), {
        balance: increment(amountChange)
      });

      await batch.commit();
      setShowAddTransaction(false);
      setTxForm({ accountId: '', type: 'إيداع', amount: 0, date: new Date().toISOString().split('T')[0], description: '', referenceNumber: '' });
    } catch (err) { console.error(err); }
  };

  const handleAddCheck = async () => {
    if (!checkForm.checkNumber || !checkForm.amount) return;
    try {
      await addDoc(collection(db, 'checks'), {
        ...checkForm,
        status: 'قيد الانتظار',
        createdBy: 'system',
        createdAt: serverTimestamp()
      });
      setShowAddCheck(false);
      setCheckForm({ 
        type: 'وارد', checkNumber: '', bankName: '', amount: 0, 
        dueDate: new Date().toISOString().split('T')[0], 
        issueDate: new Date().toISOString().split('T')[0], 
        beneficiary: '', notes: '' 
      });
    } catch (err) { console.error(err); }
  };

  const handleDepositCheck = async (check: Check, accountId: string) => {
    try {
      const batch = writeBatch(db);
      
      // 1. Update Check Status
      batch.update(doc(db, 'checks', check.id), {
        status: 'تم التحصيل',
        accountId: accountId
      });

      // 2. Create Bank Transaction
      const txRef = doc(collection(db, 'bankTransactions'));
      batch.set(txRef, {
        accountId: accountId,
        type: 'شيك',
        amount: check.amount,
        date: new Date().toISOString().split('T')[0],
        description: `تحصيل شيك رقم ${check.checkNumber} - ${check.beneficiary}`,
        relatedId: check.id,
        createdBy: 'system',
        createdAt: serverTimestamp()
      });

      // 3. Update Bank Balance
      batch.update(doc(db, 'bankAccounts', accountId), {
        balance: increment(check.amount)
      });

      await batch.commit();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">إدارة البنوك والحسابات</h2>
          <p className="text-slate-500 font-medium mt-1">متابعة الأرصدة البنكية، الشيكات، والتسويات المالية</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowAddTransaction(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[14px] h-12 px-6 shadow-lg shadow-emerald-100">
            <Plus size={18} className="ml-2" />
            <span className="font-black">حركة بنكية</span>
          </Button>
          <Button onClick={() => setShowAddCheck(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-[14px] h-12 px-6 shadow-lg shadow-indigo-100">
            <CheckSquare size={18} className="ml-2" />
            <span className="font-black">شيك جديد</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-1 rounded-3xl border border-slate-100 shadow-sm mb-6 sticky top-0 z-10">
          <TabsList className="bg-transparent border-none p-0 flex gap-1">
            <TabsTrigger value="accounts" className="rounded-[14px] px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-xs transition-all">
              <Landmark size={16} className="ml-2" />
              الحسابات البنكية
            </TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-[14px] px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-xs transition-all">
              <History size={16} className="ml-2" />
              كشف الحساب
            </TabsTrigger>
            <TabsTrigger value="checks" className="rounded-[14px] px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black text-xs transition-all">
              <FileText size={16} className="ml-2" />
              حافظة الشيكات
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="accounts" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((acc) => (
              <Card key={acc.id} className="group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-200 border-none bg-white rounded-[32px] overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-[14px] bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Landmark size={28} strokeWidth={2.5} />
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] px-3 py-1">
                      {acc.status}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">{acc.bankName}</h3>
                  <p className="text-slate-400 font-bold text-sm mb-4">{acc.accountName}</p>
                  
                  <div className="bg-slate-50 p-4 rounded-[14px] mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">رقم الحساب</span>
                    <span className="text-sm font-black text-slate-700 font-mono tracking-tighter">{acc.accountNumber}</span>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الرصيد المتاح</span>
                      <span className="text-2xl font-black text-indigo-600 font-mono">
                        <NumberDisplay value={acc.balance} />
                        <span className="text-xs text-slate-400 mr-1">ج.م</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            
            <button 
              onClick={() => setShowAddAccount(true)}
              className="p-6 rounded-[32px] border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]"
            >
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                <Plus size={32} />
              </div>
              <div>
                <p className="font-black text-slate-900">إضافة حساب بنكي</p>
                <p className="text-slate-500 text-xs font-bold mt-1">ربط حساب جديد لإدارة التحويلات</p>
              </div>
            </button>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-0 focus-visible:outline-none">
          <Card className="rounded-[32px] border-none shadow-sm overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-6 px-8">التاريخ</TableHead>
                  <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">الحساب</TableHead>
                  <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">النوع</TableHead>
                  <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">البيان</TableHead>
                  <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">المبلغ</TableHead>
                  <TableHead className="text-left font-black text-slate-400 uppercase tracking-widest text-[10px] py-6 px-8">المرجع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const account = accounts.find(a => a.id === tx.accountId);
                  return (
                    <TableRow key={tx.id} className="group border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <TableCell className="py-6 px-8 font-bold text-slate-600">{tx.date}</TableCell>
                      <TableCell className="py-6 font-black text-slate-900">{account?.bankName || 'حساب محذوف'}</TableCell>
                      <TableCell className="py-6">
                        <Badge className={`rounded-xl px-3 py-1 font-black text-[10px] ${
                          tx.type === 'إيداع' ? 'bg-emerald-50 text-emerald-600' : 
                          tx.type === 'سحب' ? 'bg-rose-50 text-rose-600' :
                          'bg-indigo-50 text-indigo-600'
                        }`}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6 font-bold text-slate-500 max-w-xs truncate">{tx.description}</TableCell>
                      <TableCell className={`py-6 font-black font-mono ${tx.type === 'إيداع' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'سحب' ? '-' : '+'}<NumberDisplay value={tx.amount} />
                      </TableCell>
                      <TableCell className="py-6 px-8 text-left font-mono text-xs text-slate-400">{tx.referenceNumber || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="checks" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {['وارد', 'صادر'].map((type) => (
              <Card key={type} className="rounded-[32px] border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900">شيكات {type}ة</CardTitle>
                    <CardDescription className="font-bold">متابعة الشيكات والتحصيل</CardDescription>
                  </div>
                  <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${type === 'وارد' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {type === 'وارد' ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {checks.filter(c => c.type === type).map((check) => (
                        <TableRow key={check.id} className="border-b border-slate-50 last:border-0">
                          <TableCell className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <FileText size={18} />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-sm">#{check.checkNumber}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{check.bankName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="p-6">
                            <p className="text-xs font-black text-slate-600">{check.beneficiary}</p>
                            <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                              <Calendar size={12} />
                              <span className="text-[10px] font-bold">{check.dueDate}</span>
                            </div>
                          </TableCell>
                          <TableCell className="p-6">
                            <span className="font-black text-slate-900 font-mono text-sm"><NumberDisplay value={check.amount} /></span>
                          </TableCell>
                          <TableCell className="p-6">
                            <Badge className={`rounded-lg px-2 py-0.5 text-[9px] font-black ${
                              check.status === 'تم التحصيل' ? 'bg-emerald-50 text-emerald-600' :
                              check.status === 'قيد الانتظار' ? 'bg-amber-50 text-amber-600' :
                              'bg-rose-50 text-rose-600'
                            }`}>
                              {check.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-6 text-left">
                            {check.status === 'قيد الانتظار' && type === 'وارد' && (
                              <Dialog>
                                <DialogTrigger render={
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600">
                                    <RefreshCcw size={14} />
                                  </Button>
                                } />
                                <DialogContent className="rounded-[32px]">
                                  <DialogHeader>
                                    <DialogTitle className="font-black text-xl">تحصيل شيك في البنك</DialogTitle>
                                    <p className="text-slate-500 font-bold">اختر الحساب البنكي المراد تحويل مبلغ الشيك إليه</p>
                                  </DialogHeader>
                                  <div className="py-4 space-y-4">
                                     {accounts.map(acc => (
                                       <Button 
                                         key={acc.id} 
                                         onClick={() => handleDepositCheck(check, acc.id)}
                                         className="w-full h-14 justify-start rounded-[14px] bg-slate-50 hover:bg-indigo-50 border-none text-slate-900 hover:text-indigo-600 group transition-all"
                                       >
                                         <Landmark size={20} className="ml-3 text-slate-400 group-hover:text-indigo-500" />
                                         <div className="text-right">
                                           <p className="font-black text-sm">{acc.bankName}</p>
                                           <p className="text-[10px] font-bold opacity-60">{acc.accountNumber}</p>
                                         </div>
                                       </Button>
                                     ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-indigo-600 text-white">
            <DialogTitle className="text-2xl font-black">إضافة حساب بنكي</DialogTitle>
            <p className="text-indigo-100 font-bold text-sm mt-1">تسجيل بيانات الحساب والارصدة الافتتاحية</p>
          </DialogHeader>
          <div className="p-6 space-y-6 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">اسم البنك</label>
                <Input 
                  value={accountForm.bankName}
                  onChange={e => setAccountForm({...accountForm, bankName: e.target.value})}
                  placeholder="مثال: البنك الأهلي"
                  className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">نوع الحساب</label>
                <Input 
                  value={accountForm.accountName}
                  onChange={e => setAccountForm({...accountForm, accountName: e.target.value})}
                  placeholder="جاري، توفير..."
                  className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">رقم الحساب / IBAN</label>
              <Input 
                value={accountForm.accountNumber}
                onChange={e => setAccountForm({...accountForm, accountNumber: e.target.value})}
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-black font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الرصيد الافتتاحي</label>
              <Input 
                type="number"
                value={accountForm.initialBalance}
                onChange={e => setAccountForm({...accountForm, initialBalance: Number(e.target.value)})}
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-black text-indigo-600 text-lg"
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
            <Button variant="ghost" onClick={() => setShowAddAccount(false)} className="font-black text-slate-500 hover:text-slate-900">إلغاء</Button>
            <Button onClick={handleAddAccount} className="btn-primary bg-indigo-600 hover:bg-indigo-700 rounded-[14px] h-12 px-10 font-black shadow-lg shadow-indigo-100">حفظ الحساب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-emerald-600 text-white">
            <DialogTitle className="text-2xl font-black">تسجيل حركة بنكية</DialogTitle>
            <p className="text-emerald-100 font-bold text-sm mt-1">إيداع، سحب، أو سداد مصروفات بنكية</p>
          </DialogHeader>
          <div className="p-6 space-y-6 bg-white">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الحساب البنكي</label>
              <Select value={txForm.accountId} onValueChange={v => setTxForm({...txForm, accountId: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold">
                  <SelectValue placeholder="اختر الحساب" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.bankName} ({acc.accountNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">نوع الحركة</label>
                <Select value={txForm.type} onValueChange={v => setTxForm({...txForm, type: v as any})}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="إيداع">إيداع نقدية</SelectItem>
                    <SelectItem value="سحب">سحب نقدية</SelectItem>
                    <SelectItem value="عمولة">مصاريف بنكية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">المبلغ</label>
                <Input 
                  type="number"
                  value={txForm.amount}
                  onChange={e => setTxForm({...txForm, amount: Number(e.target.value)})}
                  className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-black text-emerald-600 text-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">البيان</label>
              <Input 
                value={txForm.description}
                onChange={e => setTxForm({...txForm, description: e.target.value})}
                placeholder="تفاصيل العملية..."
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
            <Button variant="ghost" onClick={() => setShowAddTransaction(false)} className="font-black text-slate-500 hover:text-slate-900">إلغاء</Button>
            <Button onClick={handleAddTransaction} className="btn-primary bg-emerald-600 hover:bg-emerald-700 rounded-[14px] h-12 px-10 font-black shadow-lg shadow-emerald-100">تأكيد العملية</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
