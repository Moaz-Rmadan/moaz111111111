import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Employee, Item, Customer, LoadingManifest, DeliveryReceipt, ProductionJob } from '../types';
import { 
  MessageSquare, 
  Sparkles, 
  FileText, 
  Truck, 
  Package, 
  ClipboardCheck, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  User, 
  UserCheck,
  ShoppingCart,
  Printer, 
  Plus, 
  Trash2, 
  Edit, 
  ArrowRight,
  Info,
  Layers,
  MapPin,
  Calendar,
  UploadCloud,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface WhatsAppAssistantProps {
  employees: Employee[];
  items: Item[];
  customers: Customer[];
  companyInfo: any;
  onNavigateToTab?: (tab: string) => void;
}

export default function WhatsAppAssistant({
  employees,
  items,
  customers,
  companyInfo,
  onNavigateToTab
}: WhatsAppAssistantProps) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'auto' | 'loading' | 'delivery' | 'production'>('auto');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Parsed Result state
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [detectedType, setDetectedType] = useState<'loading' | 'delivery' | 'production'>('loading');

  // Form states depending on document type
  const [loadingForm, setLoadingForm] = useState<any>({
    driverName: '',
    carNumber: '',
    destinationType: 'عميل' as 'عميل' | 'معرض',
    clientName: '',
    orderNumbers: '',
    loaderName: '',
    notes: '',
    products: []
  });

  const [deliveryForm, setDeliveryForm] = useState<any>({
    receiptNumber: '',
    orderNumber: '',
    clientName: '',
    salesPerson: '',
    deliveryTeam: '',
    branch: '',
    address: '',
    phone: '',
    nationalId: '',
    products: [],
    notes: ''
  });

  const [productionForm, setProductionForm] = useState<any>({
    workOrderNumber: '',
    clientName: '',
    contractDate: '',
    deliveryDate: '',
    status: 'قيد الانتظار',
    products: [],
    notes: ''
  });

  // Printing State
  const [printDoc, setPrintDoc] = useState<any | null>(null);
  const [printDocType, setPrintDocType] = useState<'loading' | 'delivery' | 'production' | null>(null);

  // Success state after saving to Firestore
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [savedType, setSavedType] = useState<'loading' | 'delivery' | 'production' | null>(null);

  // Handle file upload and drag-and-drop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setParseError('الملفات المدعومة هي الصور (JPEG, PNG, WEBP) وملفات PDF فقط.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setParseError('الحد الأقصى لحجم الملف هو 10 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedFile({
        base64: base64String,
        mimeType: file.type,
        name: file.name
      });
      setParseError(null);
    };
    reader.onerror = () => {
      setParseError('فشل في قراءة الملف.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Parse raw text or file via Gemini Server Route
  const handleParseText = async () => {
    if (!inputText.trim() && !selectedFile) {
      setParseError('من فضلك أدخل نص رسالة الواتساب أو قم برفع ملف صورة / PDF أولاً.');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setParsedResult(null);
    setSavedDocumentId(null);

    try {
      const response = await fetch('/api/whatsapp/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          file: selectedFile ? {
            base64: selectedFile.base64,
            mimeType: selectedFile.mimeType
          } : null
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'حدث خطأ أثناء معالجة المستند بالذكاء الاصطناعي.');
      }

      const data = await response.json();
      setParsedResult(data);
      const type = data.detectedType as 'loading' | 'delivery' | 'production';
      setDetectedType(type);

      // Populate forms with smart defaults, trying to do fuzzy matching with system entities
      if (type === 'loading') {
        const ld = data.loadingData || {};
        
        // Find best employee match for driver
        const matchedDriver = employees.find(emp => 
          emp.name.includes(ld.driverName) || (ld.driverName && ld.driverName.includes(emp.name))
        )?.name || ld.driverName || '';

        // Match customer
        const matchedClient = customers.find(c => 
          c.name.includes(ld.clientName) || (ld.clientName && ld.clientName.includes(c.name))
        )?.name || ld.clientName || '';

        setLoadingForm({
          driverName: matchedDriver,
          carNumber: ld.carNumber || '',
          destinationType: ld.destinationType === 'معرض' ? 'معرض' : 'عميل',
          clientName: matchedClient,
          orderNumbers: ld.orderNumbers || '',
          loaderName: ld.loaderName || '',
          notes: ld.notes || '',
          products: (ld.products || []).map((p: any) => ({
            name: p.name || '',
            components: p.components || '',
            notes: p.notes || '',
            salesPerson: p.salesPerson || '',
            additions: p.additions || '',
            quantity: p.quantity || 1
          }))
        });
      } else if (type === 'delivery') {
        const dd = data.deliveryData || {};

        const matchedClient = customers.find(c => 
          c.name.includes(dd.clientName) || (dd.clientName && dd.clientName.includes(c.name))
        )?.name || dd.clientName || '';

        const matchedTeam = employees.find(emp => 
          emp.name.includes(dd.deliveryTeam) || (dd.deliveryTeam && dd.deliveryTeam.includes(emp.name))
        )?.name || dd.deliveryTeam || '';

        setDeliveryForm({
          receiptNumber: dd.receiptNumber || `REC-${Math.floor(Math.random() * 90000) + 10000}`,
          orderNumber: dd.orderNumber || '',
          clientName: matchedClient,
          salesPerson: dd.salesPerson || '',
          deliveryTeam: matchedTeam,
          branch: dd.branch || '',
          address: dd.address || '',
          phone: dd.phone || '',
          nationalId: dd.nationalId || '',
          products: (dd.products || []).map((p: any) => ({
            name: p.name || '',
            quantity: Number(p.quantity) || 1,
            notes: p.notes || ''
          })),
          notes: dd.notes || ''
        });
      } else {
        const pd = data.productionData || {};

        const matchedClient = customers.find(c => 
          c.name.includes(pd.clientName) || (pd.clientName && pd.clientName.includes(c.name))
        )?.name || pd.clientName || '';

        const todayStr = new Date().toISOString().split('T')[0];

        setProductionForm({
          workOrderNumber: pd.workOrderNumber || `WO-${Math.floor(Math.random() * 90000) + 10000}`,
          clientName: matchedClient,
          contractDate: pd.contractDate || todayStr,
          deliveryDate: pd.deliveryDate || '',
          status: pd.status || 'قيد الانتظار',
          products: (pd.products || []).map((p: any) => ({
            name: p.name || '',
            quantity: Number(p.quantity) || 1,
            notes: p.notes || ''
          })),
          notes: pd.notes || ''
        });
      }

    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'حدث خطأ غير متوقع أثناء الاتصال بـ Gemini API.');
    } finally {
      setIsParsing(false);
    }
  };

  // Reset Component State
  const handleClear = () => {
    setInputText('');
    setSelectedFile(null);
    setParsedResult(null);
    setParseError(null);
    setSavedDocumentId(null);
  };

  // Loading Form handlers
  const handleLoadingProductChange = (index: number, field: string, value: any) => {
    const updatedProducts = [...loadingForm.products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setLoadingForm({ ...loadingForm, products: updatedProducts });
  };

  const addLoadingProduct = () => {
    setLoadingForm({
      ...loadingForm,
      products: [...loadingForm.products, { name: '', components: '', notes: '', salesPerson: '', additions: '', quantity: 1 }]
    });
  };

  const removeLoadingProduct = (index: number) => {
    setLoadingForm({
      ...loadingForm,
      products: loadingForm.products.filter((_: any, i: number) => i !== index)
    });
  };

  // Delivery Form handlers
  const handleDeliveryProductChange = (index: number, field: string, value: any) => {
    const updatedProducts = [...deliveryForm.products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setDeliveryForm({ ...deliveryForm, products: updatedProducts });
  };

  const addDeliveryProduct = () => {
    setDeliveryForm({
      ...deliveryForm,
      products: [...deliveryForm.products, { name: '', quantity: 1, notes: '' }]
    });
  };

  const removeDeliveryProduct = (index: number) => {
    setDeliveryForm({
      ...deliveryForm,
      products: deliveryForm.products.filter((_: any, i: number) => i !== index)
    });
  };

  // Production Form handlers
  const handleProductionProductChange = (index: number, field: string, value: any) => {
    const updatedProducts = [...productionForm.products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setProductionForm({ ...productionForm, products: updatedProducts });
  };

  const addProductionProduct = () => {
    setProductionForm({
      ...productionForm,
      products: [...productionForm.products, { name: '', quantity: 1, notes: '' }]
    });
  };

  const removeProductionProduct = (index: number) => {
    setProductionForm({
      ...productionForm,
      products: productionForm.products.filter((_: any, i: number) => i !== index)
    });
  };

  // Save Document to Firebase Firestore
  const handleSaveDocument = async () => {
    setParseError(null);
    try {
      let docId = '';
      const todayStr = new Date().toISOString().split('T')[0];

      if (detectedType === 'loading') {
        const payload: Partial<LoadingManifest> = {
          date: todayStr,
          driverName: loadingForm.driverName,
          carNumber: loadingForm.carNumber,
          destinationType: loadingForm.destinationType,
          clientName: loadingForm.clientName,
          orderNumbers: loadingForm.orderNumbers,
          loaderName: loadingForm.loaderName,
          notes: loadingForm.notes,
          products: loadingForm.products.map((p: any) => ({
            name: p.name,
            components: p.components || '',
            notes: p.notes || '',
            salesPerson: p.salesPerson || '',
            additions: p.additions || ''
          })),
          createdAt: new Date()
        };

        const docRef = await addDoc(collection(db, 'loadingManifests'), payload);
        docId = docRef.id;
        setSavedType('loading');
        setPrintDoc({ id: docId, ...payload });
        setPrintDocType('loading');

      } else if (detectedType === 'delivery') {
        const payload: Partial<DeliveryReceipt> = {
          date: todayStr,
          receiptNumber: deliveryForm.receiptNumber,
          orderNumber: deliveryForm.orderNumber,
          clientName: deliveryForm.clientName,
          salesPerson: deliveryForm.salesPerson,
          deliveryTeam: deliveryForm.deliveryTeam,
          branch: deliveryForm.branch,
          address: deliveryForm.address,
          phone: deliveryForm.phone,
          nationalId: deliveryForm.nationalId,
          products: deliveryForm.products.map((p: any) => ({
            name: p.name,
            quantity: Number(p.quantity) || 1,
            notes: p.notes || ''
          })),
          notes: deliveryForm.notes,
          createdAt: new Date()
        };

        const docRef = await addDoc(collection(db, 'deliveryReceipts'), payload);
        docId = docRef.id;
        setSavedType('delivery');
        setPrintDoc({ id: docId, ...payload });
        setPrintDocType('delivery');

      } else if (detectedType === 'production') {
        // Save production job for each product to match existing line logic
        for (const p of productionForm.products) {
          const payload: Partial<ProductionJob> = {
            orderNo: productionForm.workOrderNumber,
            clientName: productionForm.clientName,
            productName: p.name,
            components: p.notes || '',
            isCustom: true,
            contractDate: productionForm.contractDate || todayStr,
            deadline: productionForm.deliveryDate || todayStr,
            status: 'waiting', // Match standard first step
            priority: 'متوسطة',
            notes: productionForm.notes || '',
            createdAt: new Date()
          } as any;
          const docRef = await addDoc(collection(db, 'productionJobs'), payload);
          docId = docRef.id;
        }
        setSavedType('production');
        setPrintDoc({
          id: productionForm.workOrderNumber,
          workOrderNumber: productionForm.workOrderNumber,
          clientName: productionForm.clientName,
          contractDate: productionForm.contractDate || todayStr,
          deliveryDate: productionForm.deliveryDate || todayStr,
          status: productionForm.status || 'قيد الانتظار',
          products: productionForm.products,
          notes: productionForm.notes,
          date: todayStr
        });
        setPrintDocType('production');
      }

      setSavedDocumentId(docId || 'SUCCESS');
      setParsedResult(null);
      setInputText('');

    } catch (err: any) {
      console.error(err);
      setParseError(`فشل حفظ المستند في قاعدة البيانات: ${err.message}`);
    }
  };

  // Direct print action
  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Printable Area - Only visible when printing */}
      <div id="whatsapp-print-area" className="hidden print:block p-8 bg-white text-slate-900 h-full">
        {printDoc && (
          <div className="space-y-6">
            {/* Logo and Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  {companyInfo?.companyName || 'شركة النخبة للأثاث والتشغيل'}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {companyInfo?.address || 'العنوان غير محدد'} | {companyInfo?.phone || 'الهاتف غير محدد'}
                </p>
              </div>
              <div className="text-left">
                <span className="px-4 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold block">
                  {printDocType === 'loading' ? 'بون تحميل سيارة' : printDocType === 'delivery' ? 'إذن استلام عميل' : 'أمر تشغيل خارجي'}
                </span>
                <p className="text-xs text-slate-500 mt-2 font-mono">تاريخ الإصدار: {printDoc.date}</p>
              </div>
            </div>

            {/* Document Meta Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border">
              {printDocType === 'loading' && (
                <>
                  <div><span className="text-xs text-slate-500 block">السائق</span> <span className="font-bold">{printDoc.driverName || 'غير محدد'}</span></div>
                  <div><span className="text-xs text-slate-500 block">رقم السيارة</span> <span className="font-bold font-mono">{printDoc.carNumber || 'غير محدد'}</span></div>
                  <div><span className="text-xs text-slate-500 block">الجهة</span> <span className="font-bold">{printDoc.destinationType} - {printDoc.clientName || 'معرض الشركة'}</span></div>
                  <div><span className="text-xs text-slate-500 block">أرقام الأوردرات</span> <span className="font-bold">{printDoc.orderNumbers || 'غير محدد'}</span></div>
                </>
              )}

              {printDocType === 'delivery' && (
                <>
                  <div><span className="text-xs text-slate-500 block">رقم المحضر / الإذن</span> <span className="font-bold font-mono">{printDoc.receiptNumber}</span></div>
                  <div><span className="text-xs text-slate-500 block">رقم أمر البيع</span> <span className="font-bold font-mono">{printDoc.orderNumber || 'غير محدد'}</span></div>
                  <div><span className="text-xs text-slate-500 block">العميل</span> <span className="font-bold">{printDoc.clientName || 'غير محدد'}</span></div>
                  <div><span className="text-xs text-slate-500 block">الهاتف</span> <span className="font-bold font-mono">{printDoc.phone || 'غير محدد'}</span></div>
                  <div><span className="text-xs text-slate-500 block">العنوان</span> <span className="font-bold">{printDoc.address || 'غير محدد'}</span></div>
                  <div><span className="text-xs text-slate-500 block">فريق التوصيل</span> <span className="font-bold">{printDoc.deliveryTeam || 'غير محدد'}</span></div>
                </>
              )}

              {printDocType === 'production' && (
                <>
                  <div><span className="text-xs text-slate-500 block">رقم أمر التشغيل</span> <span className="font-bold font-mono">{printDoc.workOrderNumber}</span></div>
                  <div><span className="text-xs text-slate-500 block">العميل</span> <span className="font-bold">{printDoc.clientName || 'غير محدد'}</span></div>
                  <div><span className="text-xs text-slate-500 block">تاريخ التعاقد</span> <span className="font-bold">{printDoc.contractDate || 'غير محدد'}</span></div>
                  <div><span className="text-xs text-slate-500 block">تاريخ التسليم المتوقع</span> <span className="font-bold text-violet-700">{printDoc.deliveryDate || 'غير محدد'}</span></div>
                  <div><span className="text-xs text-slate-500 block">حالة الأمر الحالية</span> <span className="font-bold text-emerald-700">{printDoc.status || 'غير محدد'}</span></div>
                </>
              )}
            </div>

            {/* Products Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">بيان المنتجات والمكونات</h3>
              <table className="w-full text-right border-collapse border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs">
                    <th className="p-3 border">م</th>
                    <th className="p-3 border">اسم المنتج / البيان</th>
                    {printDocType === 'loading' ? (
                      <>
                        <th className="p-3 border">المكونات</th>
                        <th className="p-3 border">الإضافات / التعديلات</th>
                      </>
                    ) : (
                      <th className="p-3 border">الكمية</th>
                    )}
                    <th className="p-3 border">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {printDoc.products?.map((p: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-3 border text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 border font-bold">{p.name}</td>
                      {printDocType === 'loading' ? (
                        <>
                          <td className="p-3 border">{p.components || '-'}</td>
                          <td className="p-3 border">{p.additions || '-'}</td>
                        </>
                      ) : (
                        <td className="p-3 border font-mono font-bold">{p.quantity || 1}</td>
                      )}
                      <td className="p-3 border text-slate-500">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {printDoc.notes && (
              <div className="p-3 bg-yellow-50/50 rounded-lg border border-yellow-100 text-xs">
                <span className="font-bold text-yellow-800 block mb-1">ملاحظات إضافية:</span>
                <p className="text-slate-600">{printDoc.notes}</p>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-12 grid grid-cols-3 gap-8 text-center text-xs">
              <div className="space-y-8">
                <p className="font-bold text-slate-700">توقيع المستلم / السائق</p>
                <div className="h-0.5 bg-slate-300 w-32 mx-auto" />
              </div>
              <div className="space-y-8">
                <p className="font-bold text-slate-700">توقيع أمين المخزن</p>
                <div className="h-0.5 bg-slate-300 w-32 mx-auto" />
              </div>
              <div className="space-y-8">
                <p className="font-bold text-slate-700">الاعتماد والتشغيل</p>
                <div className="h-0.5 bg-slate-300 w-32 mx-auto" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screen Interface */}
      <div className="print:hidden space-y-6">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="z-10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={10} /> اتمتة الذكاء الاصطناعي
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">معالج أوامر الواتساب الذكي ✨</h1>
            <p className="text-teal-100/90 text-xs font-black max-w-xl">
              انسخ رسائل وأوامر التحميل أو الاستلام المرسلة على جروب الواتساب الخاص بالشركة، والصقها هنا مباشرة. سيقوم الذكاء الاصطناعي باستخراج المنتجات، السائقين، والعملاء ومطابقتها فوراً بالنظام وإتاحة طباعتها بضغطة زر واحدة!
            </p>
          </div>
          <div className="z-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 hidden lg:block">
            <MessageSquare size={48} className="text-emerald-300 animate-pulse" />
          </div>
        </div>

        {/* Success screen after document saved */}
        <AnimatePresence>
          {savedDocumentId && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl shadow-md space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500 text-white rounded-2xl">
                  <CheckCircle size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900">تم تسجيل المستند بنجاح في النظام! 🎉</h3>
                  <p className="text-slate-600 text-xs">
                    تمت المعالجة وحفظ البيانات وتحديث دفاتر {savedType === 'loading' ? 'حمولة وبونات السيارات' : savedType === 'delivery' ? 'أذونات ومحاضر الاستلام' : 'أوامر الشغل والتشغيل'} بنجاح تام.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button 
                  onClick={triggerPrint}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md"
                >
                  <Printer size={16} /> طباعة بون التحميل / الاستلام فوراً 🖨️
                </button>
                <button 
                  onClick={() => {
                    if (onNavigateToTab) {
                      onNavigateToTab(savedType === 'loading' ? 'loading' : savedType === 'delivery' ? 'deliveryReceipts' : 'production');
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-200 transition-all border border-slate-200"
                >
                  {savedType === 'loading' ? 'عرض قائمة حمولات السيارات 🚚' : savedType === 'delivery' ? 'عرض محاضر الاستلام 📄' : 'عرض أوامر الشغل 🛠️'}
                </button>
                <button 
                  onClick={handleClear}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-900 text-xs font-black"
                >
                  معالجة رسالة جديدة
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Text Area and AI Processing */}
        {!parsedResult && !savedDocumentId && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Text Area Column */}
              <div className="lg:col-span-7 space-y-2">
                <label className="text-xs font-black text-slate-700 flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-600" />
                  لصق رسالة الواتساب أو كتابة ملاحظات إضافية:
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`مثال لرسالة بون تحميل:
عربية رقم (أ د ج 123) محملة مع السائق محمد أحمد لعميل شركة الهلال:
1. غرفة نوم كلاسيك كاملة
2. صالون مدهب 4 قطع + رخام البيع عماد سليم

أو يمكنك ترك هذا الحقل فارغاً والرفع مباشرة في الحقل المجاور للتحليل بالذكاء الاصطناعي!`}
                  className="w-full h-64 p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 font-medium resize-none"
                />
              </div>

              {/* Upload File Column */}
              <div className="lg:col-span-5 space-y-2 flex flex-col">
                <label className="text-xs font-black text-slate-700 flex items-center gap-2">
                  <UploadCloud size={16} className="text-indigo-600" />
                  رفع صورة (لقطة شاشة) أو ملف PDF لطلب أو فاتورة:
                </label>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex-1 min-h-[220px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 relative ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50/50' 
                      : selectedFile 
                        ? 'border-emerald-500 bg-emerald-50/20' 
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="whatsapp-file-input"
                  />

                  {selectedFile ? (
                    <div className="text-center space-y-3 z-20 w-full">
                      {selectedFile.mimeType.startsWith('image/') ? (
                        <div className="relative inline-block">
                          <img
                            src={`data:${selectedFile.mimeType};base64,${selectedFile.base64}`}
                            alt="Uploaded preview"
                            className="max-h-28 max-w-full rounded-lg shadow-md mx-auto object-contain border"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                            }}
                            className="absolute -top-2 -left-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="relative inline-block p-4 bg-white border rounded-xl shadow-sm max-w-[200px] mx-auto">
                          <FileText className="text-red-500 mx-auto" size={36} />
                          <p className="text-[10px] text-slate-500 truncate mt-2 font-mono">{selectedFile.name}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                            }}
                            className="absolute -top-2 -left-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <p className="text-xs font-black text-emerald-800">جاهز للتحليل بالذكاء الاصطناعي</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs mx-auto">
                          {selectedFile.name} ({(selectedFile.base64.length * 0.75 / 1024).toFixed(1)} KB)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 pointer-events-none">
                      <div className="p-3 bg-white rounded-full shadow-sm inline-block text-slate-400">
                        <UploadCloud size={28} className="text-slate-500 animate-bounce" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-700">اسحب وأفلت الملف هنا أو اضغط للاختيار</p>
                        <p className="text-[10px] text-slate-400">
                          يدعم صور الواتساب (سيكرين شوت)، صور الفواتير (PNG, JPG) وملفات PDF حتى 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error messaging */}
            {parseError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {parseError}
              </div>
            )}

            {/* Action controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-500">فلتر توجيه ذكي:</span>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['auto', 'loading', 'delivery', 'production'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setSelectedTypeFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${selectedTypeFilter === filter ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {filter === 'auto' ? 'كشف تلقائي ✨' : filter === 'loading' ? 'حمولة سيارة 🚚' : filter === 'delivery' ? 'إذن استلام 📄' : 'أمر تشغيل ⚙️'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                {(inputText || selectedFile) && (
                  <button
                    onClick={handleClear}
                    className="px-4 py-3 text-slate-500 hover:text-slate-800 text-xs font-black"
                  >
                    تفريغ الحقول
                  </button>
                )}
                <button
                  onClick={handleParseText}
                  disabled={isParsing}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/10"
                >
                  {isParsing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> جاري قراءة وتحليل المستند بالذكاء الاصطناعي...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> تحليل النص أو الملف بالذكاء الاصطناعي وإصدار المستند 🚀
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Editing Form of Extracted Data */}
        <AnimatePresence>
          {parsedResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden"
            >
              {/* Type Switcher Banner */}
              <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl">
                    {detectedType === 'loading' ? <Truck size={18} /> : detectedType === 'delivery' ? <FileText size={18} /> : <Layers size={18} />}
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-black block">مستخرج الذكاء الاصطناعي</span>
                    <h2 className="text-sm font-black flex items-center gap-2">
                      مستند مكتشف: {detectedType === 'loading' ? 'بون تحميل سيارة' : detectedType === 'delivery' ? 'إذن استلام عميل' : 'أمر تشغيل في الورشة'}
                      <span className="text-[11px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-mono">ثقة {Math.round((parsedResult.confidence || 0.95) * 100)}%</span>
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">تغيير نوع المستند يدوياً:</span>
                  <select
                    value={detectedType}
                    onChange={(e) => setDetectedType(e.target.value as any)}
                    className="bg-white/10 text-white rounded-lg px-2 py-1 text-xs font-black border border-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  >
                    <option value="loading" className="text-slate-950 font-black">بون تحميل سيارة 🚚</option>
                    <option value="delivery" className="text-slate-950 font-black">إذن استلام عميل 📄</option>
                    <option value="production" className="text-slate-950 font-black">أمر تشغيل مصنع ⚙️</option>
                  </select>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* 1. LOADING MANIFEST FORM */}
                {detectedType === 'loading' && (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                      <Truck size={16} className="text-indigo-600" /> تفاصيل بون التحميل وحمولة السيارة
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Driver match */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">اسم السائق المكتشف:</label>
                        <div className="relative">
                          <User className="absolute right-3 top-3.5 text-slate-400" size={16} />
                          <select
                            value={loadingForm.driverName}
                            onChange={(e) => setLoadingForm({ ...loadingForm, driverName: e.target.value })}
                            className="w-full pl-3 pr-10 py-3 rounded-xl border border-slate-200 text-xs font-black focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">-- اختر السائق من الموظفين --</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.name}>{emp.name} ({emp.position})</option>
                            ))}
                            {loadingForm.driverName && !employees.some(e => e.name === loadingForm.driverName) && (
                              <option value={loadingForm.driverName}>{loadingForm.driverName} (مكتشف من النص)</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Car plate number */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">رقم السيارة / لوحة المرور:</label>
                        <input
                          type="text"
                          value={loadingForm.carNumber}
                          onChange={(e) => setLoadingForm({ ...loadingForm, carNumber: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                          placeholder="مثال: أ د ج 123"
                        />
                      </div>

                      {/* Destination Type */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">نوع جهة التحميل:</label>
                        <select
                          value={loadingForm.destinationType}
                          onChange={(e) => setLoadingForm({ ...loadingForm, destinationType: e.target.value as any })}
                          className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs font-black focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="عميل">عميل (مباشر)</option>
                          <option value="معرض">معرض / فرع</option>
                        </select>
                      </div>

                      {/* Client match */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">اسم العميل / الجهة المستلمة:</label>
                        <select
                          value={loadingForm.clientName}
                          onChange={(e) => setLoadingForm({ ...loadingForm, clientName: e.target.value })}
                          className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs font-black focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- اختر عميل من النظام --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          <option value="المعرض الرئيسي">المعرض الرئيسي</option>
                          {loadingForm.clientName && !customers.some(c => c.name === loadingForm.clientName) && (
                            <option value={loadingForm.clientName}>{loadingForm.clientName} (مكتشف من النص)</option>
                          )}
                        </select>
                      </div>

                      {/* Order Numbers */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">أرقام الفواتير / الأوردرات:</label>
                        <input
                          type="text"
                          value={loadingForm.orderNumbers}
                          onChange={(e) => setLoadingForm({ ...loadingForm, orderNumbers: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                          placeholder="مثال: #12345, #12346"
                        />
                      </div>

                      {/* Loader Name */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">اسم المحمل (أمين المخزن):</label>
                        <input
                          type="text"
                          value={loadingForm.loaderName}
                          onChange={(e) => setLoadingForm({ ...loadingForm, loaderName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                          placeholder="مثال: أحمد عبد الله"
                        />
                      </div>
                    </div>

                    {/* Products list for loading */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-600 flex items-center gap-1">
                          <Package size={14} /> أصناف ومنتجات الحمولة المكتشفة:
                        </h4>
                        <button
                          type="button"
                          onClick={addLoadingProduct}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                        >
                          <Plus size={12} /> إضافة صنف جديد
                        </button>
                      </div>

                      <div className="space-y-2">
                        {loadingForm.products?.map((prod: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div className="md:col-span-3 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">اسم المنتج المكتشف:</label>
                              <select
                                value={prod.name}
                                onChange={(e) => handleLoadingProductChange(idx, 'name', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border text-xs font-black"
                              >
                                <option value="">-- ربط بصنف بالنظام --</option>
                                {items.map(item => (
                                  <option key={item.id} value={item.name}>{item.name}</option>
                                ))}
                                {prod.name && !items.some(it => it.name === prod.name) && (
                                  <option value={prod.name}>{prod.name} (نص واتساب)</option>
                                )}
                              </select>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">مكونات الغرفة/القطع:</label>
                              <input
                                type="text"
                                value={prod.components}
                                onChange={(e) => handleLoadingProductChange(idx, 'components', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border text-xs text-slate-700"
                                placeholder="مثال: سرير + دولاب"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">إضافات/تعديلات:</label>
                              <input
                                type="text"
                                value={prod.additions}
                                onChange={(e) => handleLoadingProductChange(idx, 'additions', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border text-xs text-slate-700"
                                placeholder="مثال: تغيير اللون لذهبي"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">البائع/السيلز:</label>
                              <input
                                type="text"
                                value={prod.salesPerson}
                                onChange={(e) => handleLoadingProductChange(idx, 'salesPerson', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border text-xs text-slate-700"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">ملاحظات التحميل:</label>
                              <input
                                type="text"
                                value={prod.notes}
                                onChange={(e) => handleLoadingProductChange(idx, 'notes', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border text-xs text-slate-700"
                              />
                            </div>
                            <div className="md:col-span-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeLoadingProduct(idx)}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DELIVERY RECEIPT FORM */}
                {detectedType === 'delivery' && (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                      <FileText size={16} className="text-emerald-600" /> تفاصيل محضر استلام عميل
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Receipt number */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">رقم الإذن / المستند:</label>
                        <input
                          type="text"
                          value={deliveryForm.receiptNumber}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, receiptNumber: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                        />
                      </div>

                      {/* Order number */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">رقم أمر البيع (الأوردر):</label>
                        <input
                          type="text"
                          value={deliveryForm.orderNumber}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, orderNumber: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800 font-mono"
                        />
                      </div>

                      {/* Client name */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">العميل المستلم:</label>
                        <select
                          value={deliveryForm.clientName}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, clientName: e.target.value })}
                          className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs font-black focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- اختر عميل من النظام --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          {deliveryForm.clientName && !customers.some(c => c.name === deliveryForm.clientName) && (
                            <option value={deliveryForm.clientName}>{deliveryForm.clientName} (مستخرج من النص)</option>
                          )}
                        </select>
                      </div>

                      {/* Delivery Team */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">فريق التوصيل / السائق المندوب:</label>
                        <select
                          value={deliveryForm.deliveryTeam}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryTeam: e.target.value })}
                          className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs font-black focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- اختر مندوب التوصيل --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.name}>{emp.name} ({emp.position})</option>
                          ))}
                          {deliveryForm.deliveryTeam && !employees.some(e => e.name === deliveryForm.deliveryTeam) && (
                            <option value={deliveryForm.deliveryTeam}>{deliveryForm.deliveryTeam} (مكتشف من النص)</option>
                          )}
                        </select>
                      </div>

                      {/* Phone */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">رقم الهاتف:</label>
                        <input
                          type="text"
                          value={deliveryForm.phone}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800 font-mono"
                          placeholder="مثال: 01002345678"
                        />
                      </div>

                      {/* Address */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">العنوان:</label>
                        <input
                          type="text"
                          value={deliveryForm.address}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, address: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                          placeholder="مثال: التجمع الخامس، القاهرة"
                        />
                      </div>

                      {/* Branch */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">الفرع / المعرض المصدر للطلب:</label>
                        <input
                          type="text"
                          value={deliveryForm.branch}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, branch: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                        />
                      </div>

                      {/* Sales Person */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">البائع / السيلز المتابع:</label>
                        <input
                          type="text"
                          value={deliveryForm.salesPerson}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, salesPerson: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Products list for delivery */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-600 flex items-center gap-1">
                          <Package size={14} /> الأصناف المستلمة المكتشفة:
                        </h4>
                        <button
                          type="button"
                          onClick={addDeliveryProduct}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                        >
                          <Plus size={12} /> إضافة صنف جديد
                        </button>
                      </div>

                      <div className="space-y-2">
                        {deliveryForm.products?.map((prod: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">الصنف والمنتج المكتشف:</label>
                              <select
                                value={prod.name}
                                onChange={(e) => handleDeliveryProductChange(idx, 'name', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border text-xs font-black animate-none"
                              >
                                <option value="">-- ربط بصنف بالنظام --</option>
                                {items.map(item => (
                                  <option key={item.id} value={item.name}>{item.name}</option>
                                ))}
                                {prod.name && !items.some(it => it.name === prod.name) && (
                                  <option value={prod.name}>{prod.name} (نص واتساب)</option>
                                )}
                              </select>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">الكمية:</label>
                              <input
                                type="number"
                                value={prod.quantity}
                                onChange={(e) => handleDeliveryProductChange(idx, 'quantity', Number(e.target.value) || 1)}
                                className="w-full p-2 bg-white rounded-lg border text-xs text-slate-700 font-bold text-center"
                                min="1"
                              />
                            </div>
                            <div className="md:col-span-4 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">ملاحظات التسليم والمكونات:</label>
                              <input
                                type="text"
                                value={prod.notes}
                                onChange={(e) => handleDeliveryProductChange(idx, 'notes', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border text-xs text-slate-700"
                              />
                            </div>
                            <div className="md:col-span-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeDeliveryProduct(idx)}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PRODUCTION WORK ORDER FORM */}
                {detectedType === 'production' && (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                      <Layers size={16} className="text-violet-600" /> تفاصيل أمر التشغيل والانتاج بالورشة
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Work order number */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">رقم أمر التشغيل:</label>
                        <input
                          type="text"
                          value={productionForm.workOrderNumber}
                          onChange={(e) => setProductionForm({ ...productionForm, workOrderNumber: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                        />
                      </div>

                      {/* Client name */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">العميل الطالب:</label>
                        <select
                          value={productionForm.clientName}
                          onChange={(e) => setProductionForm({ ...productionForm, clientName: e.target.value })}
                          className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs font-black focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- اختر العميل --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          {productionForm.clientName && !customers.some(c => c.name === productionForm.clientName) && (
                            <option value={productionForm.clientName}>{productionForm.clientName} (مكتشف من المستند)</option>
                          )}
                        </select>
                      </div>

                      {/* Contract Date */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">تاريخ التعاقد (تاريخ أمر الشغل):</label>
                        <input
                          type="date"
                          value={productionForm.contractDate}
                          onChange={(e) => setProductionForm({ ...productionForm, contractDate: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                        />
                      </div>

                      {/* Expected Delivery Date */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">تاريخ التسليم المتوقع:</label>
                        <input
                          type="date"
                          value={productionForm.deliveryDate}
                          onChange={(e) => setProductionForm({ ...productionForm, deliveryDate: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                        />
                      </div>

                      {/* Status */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">الحالة الحالية للأمر:</label>
                        <select
                          value={productionForm.status}
                          onChange={(e) => setProductionForm({ ...productionForm, status: e.target.value })}
                          className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs font-black focus:ring-2 focus:ring-emerald-500 text-slate-800"
                        >
                          <option value="قيد الانتظار">قيد الانتظار (في الانتظار)</option>
                          <option value="قيد التشغيل">قيد التشغيل (تحت العمل)</option>
                          <option value="جاهز">جاهز للتحميل والتسليم</option>
                          <option value="تم التسليم">تم تسليمه للعميل</option>
                        </select>
                      </div>
                    </div>

                    {/* Products list for production */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-600 flex items-center gap-1">
                          <Package size={14} /> غرف وأصناف التشغيل المكتشفة:
                        </h4>
                        <button
                          type="button"
                          onClick={addProductionProduct}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                        >
                          <Plus size={12} /> إضافة غرفة / صنف
                        </button>
                      </div>

                      <div className="space-y-2">
                        {productionForm.products?.map((prod: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">اسم المنتج / الغرفة المطلوب تصنيعها:</label>
                              <input
                                type="text"
                                value={prod.name}
                                onChange={(e) => handleProductionProductChange(idx, 'name', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border text-xs font-bold text-slate-800"
                                placeholder="مثال: غرفة نوم كاملة"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">العدد المطلوب:</label>
                              <input
                                type="number"
                                value={prod.quantity}
                                onChange={(e) => handleProductionProductChange(idx, 'quantity', Number(e.target.value) || 1)}
                                className="w-full p-2 bg-white rounded-lg border text-xs text-slate-700 font-bold text-center"
                                min="1"
                              />
                            </div>
                            <div className="md:col-span-4 space-y-1">
                              <label className="text-[10px] font-black text-slate-400">مكونات ومواصفات التشغيل والتقطيع:</label>
                              <input
                                type="text"
                                value={prod.notes}
                                onChange={(e) => handleProductionProductChange(idx, 'notes', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border text-xs text-slate-700"
                                placeholder="سرير 160 + كومودينو"
                              />
                            </div>
                            <div className="md:col-span-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeProductionProduct(idx)}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Shared notes/remarks field */}
                <div className="space-y-1 pt-4 border-t border-slate-100">
                  <label className="text-xs font-black text-slate-600">ملاحظات عامة وتوجيهات للعمل والتحميل:</label>
                  <textarea
                    value={detectedType === 'loading' ? loadingForm.notes : detectedType === 'delivery' ? deliveryForm.notes : productionForm.notes}
                    onChange={(e) => {
                      const text = e.target.value;
                      if (detectedType === 'loading') setLoadingForm({ ...loadingForm, notes: text });
                      else if (detectedType === 'delivery') setDeliveryForm({ ...deliveryForm, notes: text });
                      else setProductionForm({ ...productionForm, notes: text });
                    }}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed"
                    rows={2}
                    placeholder="ملاحظات تظهر أسفل المستند المطبوع..."
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-4 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-black flex items-center gap-1"
                    >
                      <ArrowRight size={14} /> معالجة جديدة
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDocument}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md"
                    >
                      <ClipboardCheck size={16} /> تأكيد المستند وحفظه في النظام 💾
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
