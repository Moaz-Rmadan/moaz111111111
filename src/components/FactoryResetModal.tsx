import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Lock, 
  Eye, 
  EyeOff, 
  Trash2, 
  X, 
  Loader2, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  writeBatch, 
  doc, 
  setDoc 
} from 'firebase/firestore';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FactoryResetModal: React.FC<FactoryResetModalProps> = ({ 
  isOpen, 
  onClose,
  onSuccess 
}) => {
  const { profile, logout } = useAuth();
  
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailConfirmInput, setEmailConfirmInput] = useState('');
  
  const [step, setStep] = useState<'auth' | 'confirm' | 'progress' | 'success'>('auth');
  const [currentProgressText, setCurrentProgressText] = useState('');
  const [errorText, setErrorText] = useState('');

  if (!isOpen) return null;

  const isGoogleUser = !profile?.password;

  const handleVerifyAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (isGoogleUser) {
      if (emailConfirmInput.trim().toLowerCase() !== profile?.email?.trim().toLowerCase()) {
        setErrorText('البريد الإلكتروني المدخل لا يتطابق مع بريدك الحالي.');
        return;
      }
    } else {
      if (passwordInput !== profile?.password) {
        setErrorText('كلمة المرور الإدارية غير صحيحة. يرجى المحاولة مرة أخرى.');
        return;
      }
    }

    // Auth succeeded, proceed to final confirmation step
    setStep('confirm');
  };

  const handleExecuteFactoryReset = async () => {
    setStep('progress');
    setErrorText('');

    try {
      const collectionsToClear = [
        // Financial & Safes
        'safeTransactions', 'safeSettlements', 'safeAudits', 'safes',
        // Sales & Showrooms
        'salesOrders', 'transferOrders', 'showroomInventory', 'showrooms', 'lostSales',
        // Manufacturing & Production
        'productionJobs', 'productionRecords', 'productionRates', 'jobLabors', 'jobOtherCosts', 
        'manufacturingOperations', 'boms', 'workCenters', 'productRecipes',
        // HR & Attendance
        'attendance', 'hrTransactions', 'loans', 'payrolls', 'employees',
        // Inventory & Logistics
        'purchases', 'issuances', 'waste', 'stockAudits', 'loadingManifests', 
        'deliveryReceipts', 'items', 'suppliers', 'warehouses', 'units', 'costCenters'
      ];

      // Total collections to show progress
      const total = collectionsToClear.length;
      
      // Step 1: Wipe transactional and master collections
      for (let i = 0; i < total; i++) {
        const colName = collectionsToClear[i];
        setCurrentProgressText(`جاري تهيئة وحذف جدول: ${colName} (${i + 1}/${total})`);
        
        const querySnapshot = await getDocs(query(collection(db, colName)));
        if (!querySnapshot.empty) {
          const batch = writeBatch(db);
          querySnapshot.forEach((d) => {
            batch.delete(d.ref);
          });
          await batch.commit();
        }
      }

      // Step 2: Wipe users collection except the active administrator
      setCurrentProgressText('جاري تطهير قائمة المستخدمين والحفاظ على حساب المدير الحالي...');
      const usersSnapshot = await getDocs(query(collection(db, 'users')));
      if (!usersSnapshot.empty) {
        const usersBatch = writeBatch(db);
        usersSnapshot.forEach((uDoc) => {
          if (uDoc.id.toLowerCase().trim() !== profile?.uid?.toLowerCase().trim()) {
            usersBatch.delete(uDoc.ref);
          }
        });
        await usersBatch.commit();
      }

      // Step 3: Write factory settings
      setCurrentProgressText('جاري إعادة ضبط إعدادات المصنع الافتراضية للمنشأة...');
      const settingsRef = doc(db, 'settings', 'company');
      await setDoc(settingsRef, {
        name: 'مصنع الأثاث الراقي والحديث',
        address: 'المنطقة الصناعية الجديدة',
        phone: '01000000000',
        email: profile?.email || 'admin@factory.com',
        numberSystem: 'western',
        currencyStyle: 'standard',
        currencySymbol: 'ج.م',
        vatRate: 14,
        defaultProfitMargin: 20,
        defaultScrapTolerance: 5,
        laborHourlyRate: 25,
        overtimeMultiplier: 1.5,
        lowStockThreshold: 10,
        invoiceFooterNote: 'شكراً لثقتكم الغالية وتعاملكم معنا',
        invoiceTerms: 'البضاعة المباعة لا ترد ولا تستبدل بعد مرور 14 يوماً من الاستلام. الضمان يشمل عيوب التصنيع فقط.'
      });

      // Clear local storage settings cache
      localStorage.removeItem('company_settings');

      // Success
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error during factory reset:', err);
      setErrorText(`حدث خطأ غير متوقع أثناء الفرمتة: ${err.message || err}`);
      setStep('auth');
    }
  };

  const handleFinishReset = async () => {
    onClose();
    // Log out to ensure session and local cache are cleanly re-synchronized
    await logout();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]" dir="rtl">
      <div className="relative w-full max-w-xl bg-white rounded-[14px] shadow-2xl border border-slate-100 overflow-hidden text-right">
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
        
        {step !== 'progress' && step !== 'success' && (
          <button 
            onClick={onClose}
            className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        )}

        <div className="p-6 md:p-6">
          <AnimatePresence mode="wait">
            {step === 'auth' && (
              <motion.div 
                key="auth"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-red-50 rounded-[14px] flex items-center justify-center shrink-0 border border-red-100">
                    <ShieldAlert className="text-red-600" size={28} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full uppercase border border-red-100">تحقق أمني صارم</span>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">تأكيد الصلاحية الإدارية</h3>
                  </div>
                </div>

                <div className="p-5 bg-red-50/50 rounded-[14px] border border-red-100/50 space-y-2">
                  <p className="text-sm font-black text-red-800 flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    تنبيه أمني خطير للغاية
                  </p>
                  <p className="text-xs text-red-700/90 leading-relaxed font-bold">
                    عملية فرمتة النظام ستقوم بمسح كافة المعاملات المالية، الجرد، الرواتب، الموظفين، الخزائن، والبيانات كلياً للبدء من الصفر تماماً. للتأكيد، يرجى إثبات هويتك كمدير للنظام أولاً.
                  </p>
                </div>

                <form onSubmit={handleVerifyAuth} className="space-y-4">
                  {isGoogleUser ? (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-600 block">
                        لتأكيد الهوية (حساب Google)، يرجى كتابة بريدك الإلكتروني الإداري الحالي:
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          placeholder={profile?.email || 'اكتب البريد الإلكتروني هنا'}
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-bold text-slate-700 placeholder:text-slate-300 text-left"
                          value={emailConfirmInput}
                          onChange={(e) => setEmailConfirmInput(e.target.value)}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold">
                        البريد الإداري النشط: <span className="font-mono text-slate-600">{profile?.email}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-600 block">
                        يرجى إدخال كلمة المرور الإدارية الخاصة بحسابك:
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="كلمة مرور المدير الحالي"
                          className="w-full h-12 pr-11 pl-4 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-bold text-slate-700 placeholder:text-slate-300 text-left"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Lock size={18} />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {errorText && (
                    <div className="text-xs font-black text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                      {errorText}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 h-12 rounded-xl border border-slate-200 font-black text-sm text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      إلغاء العملية
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                    >
                      <Lock size={16} />
                      التحقق والتقدم
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div 
                key="confirm"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-50 rounded-[14px] flex items-center justify-center shrink-0 border border-amber-100">
                    <AlertTriangle className="text-amber-600" size={28} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase border border-amber-100">تأكيد نهائي وحاسم</span>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">هل أنت متأكد تماماً؟</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-600 leading-relaxed">
                    لقد قمت بإثبات صلاحيتك الإدارية بنجاح. الآن، هل ترغب في تهيئة ومسح كل شيء وبدء النظام كصفحة بيضاء جديدة بالكامل؟
                  </p>
                  <ul className="space-y-2 text-xs text-slate-500 font-bold bg-slate-50 p-4 rounded-xl border border-slate-100 list-disc list-inside">
                    <li>سيتم تفريغ كافة حركات المشتريات والمنصرف والمخازن.</li>
                    <li>سيتم إزالة أسماء الأصناف، الموردين، وبيانات جميع الموظفين وسجلات الحضور والغياب.</li>
                    <li>سيتم تصفير جميع الخزائن المالية والحسابات وسجلات الأرباح وتكاليف المنتجات.</li>
                    <li>سيتم الاحتفاظ <strong className="text-slate-900">فقط وحصرياً</strong> ببيانات حسابك الإداري الحالي المسجل به الآن لضمان إمكانية دخولك مباشرة.</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep('auth')}
                    className="flex-1 h-12 rounded-xl border border-slate-200 font-black text-sm text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    رجوع للخطوة السابقة
                  </button>
                  <button
                    onClick={handleExecuteFactoryReset}
                    className="flex-1 h-12 rounded-xl bg-red-600 text-white font-black text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    نعم، فرمتة النظام بالكامل
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'progress' && (
              <motion.div 
                key="progress"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 flex flex-col items-center text-center space-y-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-40" />
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center border border-red-100 relative">
                    <Loader2 className="text-red-600 animate-spin" size={36} />
                  </div>
                </div>
                
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-xl font-black text-slate-900">جاري إعادة ضبط المصنع...</h3>
                  <p className="text-sm font-bold text-slate-400">يرجى الانتظار، لا تقم بإغلاق الصفحة أو فصل الاتصال حتى انتهاء الفرمتة بنجاح.</p>
                </div>

                <div className="px-5 py-3 bg-slate-50 border border-slate-100 rounded-[14px] max-w-md w-full">
                  <span className="font-mono text-xs text-red-600 font-black block">{currentProgressText}</span>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
                  <CheckCircle className="text-emerald-500" size={44} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">اكتملت الفرمتة بنجاح!</h3>
                  <p className="text-sm font-bold text-slate-500 max-w-md leading-relaxed">
                    تم تصفير النظام وإعادة ضبط المصنع بالكامل كصفحة بيضاء جديدة بنجاح فائق! تم تنظيف كافة الجداول المالية والتنظيمية مع الإبقاء على حسابك الحالي للدخول.
                  </p>
                </div>

                <div className="w-full bg-amber-50 p-4 rounded-xl border border-amber-100 text-right space-y-1">
                  <h5 className="font-black text-xs text-amber-800">إجراء هام مطلوب:</h5>
                  <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                    سيقوم النظام الآن بإنهاء الجلسة وإعادة توجيهك إلى شاشة تسجيل الدخول وإعادة تشغيل قاعدة البيانات المحلية للتأكد من مزامنة الهيكل الجديد 0ms بنجاح كلي.
                  </p>
                </div>

                <button
                  onClick={handleFinishReset}
                  className="w-full h-12 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                >
                  إعادة تشغيل التطبيق بالكامل
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
