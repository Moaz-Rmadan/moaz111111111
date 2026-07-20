import React, { useState, useMemo, useEffect, useRef } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { SearchableSelect } from './SearchableSelect';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { FurnitureWorkOrder, Customer, UserProfile, CustomerPayment, Safe } from '../types';
import {
  ClipboardList,
  Search,
  Plus,
  Edit2,
  Trash2,
  Printer,
  Calendar,
  User,
  Sofa,
  Paintbrush,
  Ruler,
  FileText,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  Hammer,
  Image as ImageIcon,
  DollarSign,
  Briefcase,
  Layers,
  ArrowRight,
  ArrowLeft,
  Truck,
  CheckSquare,
  FileSpreadsheet,
  X,
  CreditCard,
  Building,
  Check,
  ChevronDown
} from 'lucide-react';

const Card = ({ children, className }: any) => <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className || ''}`}>{children}</div>;
const CardHeader = ({ children, className }: any) => <div className={`p-6 border-b border-slate-100 ${className || ''}`}>{children}</div>;
const CardTitle = ({ children, className }: any) => <h3 className={`text-xl font-bold ${className || ''}`}>{children}</h3>;
const CardDescription = ({ children, className }: any) => <p className={`text-sm text-slate-500 ${className || ''}`}>{children}</p>;
const CardContent = ({ children, className }: any) => <div className={`p-6 ${className || ''}`}>{children}</div>;
const Button = ({ children, className, variant, size, ...props }: any) => { 
  const base = 'inline-flex items-center justify-center rounded-xl font-black transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs'; 
  const v = variant === 'outline' ? 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-800' : 
            variant === 'ghost' ? 'bg-transparent hover:bg-slate-100 text-slate-600' : 
            variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700 text-white' :
            variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
            'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-100'; 
  const s = size === 'icon' ? 'h-9 w-9 p-0' : size === 'sm' ? 'h-8 px-3 py-1.5' : 'h-10 px-4 py-2'; 
  return <button className={`${base} ${v} ${s} ${className || ''}`} {...props}>{children}</button>; 
};

interface WorkOrdersManagerProps {
  customers: Customer[];
  profile: UserProfile | null;
}

export function WorkOrdersManager({ customers, profile }: WorkOrdersManagerProps) {
  const customerOptions = useMemo(() => {
    return customers.map(c => ({
      id: c.id,
      name: c.name,
      subtext: c.phone || ''
    }));
  }, [customers]);

  // Collections State
  const [workOrders, setWorkOrders] = useState<FurnitureWorkOrder[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [safes, setSafes] = useState<Safe[]>([]);

  // Navigation State
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'production_line' | 'customer_accounts' | 'whatsapp_hub' | 'monthly_folders' | 'shipping_hub' | 'analytics_hub'>('orders');

  // Helper States for Active Production Board
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineCostCenterFilter, setPipelineCostCenterFilter] = useState('الكل');
  const [expandedSpecs, setExpandedSpecs] = useState<{ [key: string]: boolean }>({});
  const [printingRoom, setPrintingRoom] = useState<any | null>(null);

  // New States for WhatsApp, Monthly Folders, Combined Receipts, and Manifests
  const [whatsappDrafts, setWhatsappDrafts] = useState<any[]>([]);
  const [loadingManifests, setLoadingManifests] = useState<any[]>([]);
  const [deliveryReceipts, setDeliveryReceipts] = useState<any[]>([]);
  
  // Excel-Style interactive sheet states
  const [excelRows, setExcelRows] = useState<any[]>([]);
  
  // Modals / Print Selections for combined receipt and manifest
  const [selectedManifestForPrint, setSelectedManifestForPrint] = useState<any | null>(null);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<any | null>(null);
  
  const [showManifestAddModal, setShowManifestAddModal] = useState(false);
  const [manifestForm, setManifestForm] = useState({
    driverName: '',
    carNumber: '',
    loaderName: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    selectedRoomKeys: [] as string[] // "orderId-roomIndex"
  });

  // Search & Precise Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [salesPersonFilter, setSalesPersonFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [monthFilter, setMonthFilter] = useState('الكل');
  const [yearFilter, setYearFilter] = useState('الكل');
  const [contractDateFrom, setContractDateFrom] = useState('');
  const [contractDateTo, setContractDateTo] = useState('');
  const [deliveryDateFrom, setDeliveryDateFrom] = useState('');
  const [deliveryDateTo, setDeliveryDateTo] = useState('');

  // Modals & Selections
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<FurnitureWorkOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<FurnitureWorkOrder | null>(null);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);

  // States for WhatsApp Split-Screen Entry Workspace and Exhibition Price Catalog
  const [recipes, setRecipes] = useState<any[]>([]);
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');
  const [showSplitScreenModal, setShowSplitScreenModal] = useState(false);
  const [activeDraft, setActiveDraft] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isAiParsingInProgress, setIsAiParsingInProgress] = useState(false);
  const [aiParseStatusMessage, setAiParseStatusMessage] = useState('');
  
  // Quick Customer Creation State inside modal
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [quickCustomerType, setQuickCustomerType] = useState<'أفراد' | 'شركات'>('أفراد');
  const [isCreatingQuickCustomer, setIsCreatingQuickCustomer] = useState(false);

  // Split Screen Form State
  const [splitForm, setSplitForm] = useState({
    orderNumber: '',
    customerId: '',
    customerName: '',
    roomCode: '',
    contractDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    salesPerson: '',
    generalSpecs: '',
    dimensionsAndStructure: '',
    paintSpecs: '',
    upholsterySpecs: '',
    totalAmount: 0,
    depositPaid: 0,
    notes: ''
  });

  // Print references
  const printRef = useRef<HTMLDivElement>(null);
  const printListRef = useRef<HTMLDivElement>(null);

  // Form States
  const [formData, setFormData] = useState<Partial<FurnitureWorkOrder>>({
    orderNumber: '',
    customerId: '',
    customerName: '',
    roomCode: '',
    contractDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    salesPerson: '',
    attachmentImage: '',
    rooms: [
      {
        roomCode: '',
        generalSpecs: '',
        dimensionsAndStructure: '',
        paintSpecs: '',
        upholsterySpecs: '',
        status: 'بانتظار التعميد'
      }
    ],
    generalSpecs: '',
    dimensionsAndStructure: '',
    paintSpecs: '',
    upholsterySpecs: '',
    status: 'بانتظار التعميد',
    costCenterId: '',
    totalAmount: 0,
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    customerId: '',
    amount: 0,
    paymentMethod: 'نقدي' as any,
    safeId: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Subscribe to Firestore collections
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'workOrders'), (snap) => {
      setWorkOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as FurnitureWorkOrder)));
    });
    const unsubCenters = onSnapshot(collection(db, 'costCenters'), (snap) => {
      setCostCenters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPayments = onSnapshot(collection(db, 'customerPayments'), (snap) => {
      setCustomerPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerPayment)));
    });
    const unsubSafes = onSnapshot(collection(db, 'safes'), (snap) => {
      setSafes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Safe)));
    });
    const unsubDrafts = onSnapshot(collection(db, 'whatsappDrafts'), (snap) => {
      setWhatsappDrafts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubManifests = onSnapshot(collection(db, 'loadingManifests'), (snap) => {
      setLoadingManifests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubReceipts = onSnapshot(collection(db, 'deliveryReceipts'), (snap) => {
      setDeliveryReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snap) => {
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubOrders();
      unsubCenters();
      unsubPayments();
      unsubSafes();
      unsubDrafts();
      unsubManifests();
      unsubReceipts();
      unsubRecipes();
    };
  }, []);

  // Update paymentForm safe default
  useEffect(() => {
    if (safes.length > 0 && !paymentForm.safeId) {
      setPaymentForm(prev => ({ ...prev, safeId: safes[0].id }));
    }
  }, [safes]);

  // Handle auto-orderNumber on modal open
  const initNewOrder = () => {
    setFormData({
      orderNumber: `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: '',
      customerName: '',
      roomCode: '',
      contractDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      salesPerson: '',
      attachmentImage: '',
      rooms: [
        {
          roomCode: '',
          generalSpecs: '',
          dimensionsAndStructure: '',
          paintSpecs: '',
          upholsterySpecs: '',
          status: 'بانتظار التعميد'
        }
      ],
      generalSpecs: '',
      dimensionsAndStructure: '',
      paintSpecs: '',
      upholsterySpecs: '',
      status: 'بانتظار التعميد',
      costCenterId: '',
      totalAmount: 0,
      notes: ''
    });
    setEditingOrder(null);
    setShowAddModal(true);
  };

  // Multiple rooms handlers
  const addRoomField = () => {
    const rooms = formData.rooms ? [...formData.rooms] : [];
    rooms.push({
      roomCode: '',
      generalSpecs: '',
      dimensionsAndStructure: '',
      paintSpecs: '',
      upholsterySpecs: '',
      status: 'بانتظار التعميد'
    });
    setFormData(prev => ({ ...prev, rooms }));
  };

  const removeRoomField = (index: number) => {
    if (!formData.rooms || formData.rooms.length <= 1) return;
    const rooms = formData.rooms.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, rooms }));
  };

  const updateRoomField = (index: number, key: string, value: any) => {
    if (!formData.rooms) return;
    const rooms = [...formData.rooms];
    rooms[index] = { ...rooms[index], [key]: value };
    setFormData(prev => ({ ...prev, rooms }));
  };

  // Image upload with compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75); // compress
        setFormData(prev => ({ ...prev, attachmentImage: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save/Edit Work Order
  const handleSave = async () => {
    if (!formData.customerId) {
      alert('الرجاء اختيار العميل أولاً');
      return;
    }
    if (!formData.orderNumber) {
      alert('الرجاء تعبئة رقم أمر الشغل');
      return;
    }

    // fallback mapping first room to general fields for backward compatibility
    const firstRoom = formData.rooms?.[0];
    const generalRoomCode = firstRoom?.roomCode || formData.roomCode || 'غرفة عامة';
    const finalData = {
      ...formData,
      roomCode: generalRoomCode,
      generalSpecs: firstRoom?.generalSpecs || formData.generalSpecs || '',
      dimensionsAndStructure: firstRoom?.dimensionsAndStructure || formData.dimensionsAndStructure || '',
      paintSpecs: firstRoom?.paintSpecs || formData.paintSpecs || '',
      upholsterySpecs: firstRoom?.upholsterySpecs || formData.upholsterySpecs || '',
      totalAmount: Number(formData.totalAmount) || 0,
      createdAt: editingOrder ? (editingOrder.createdAt || new Date().toISOString()) : new Date().toISOString(),
      createdBy: profile?.name || 'مستخدم النظام'
    };

    try {
      if (editingOrder) {
        await updateDoc(doc(db, 'workOrders', editingOrder.id), finalData);
      } else {
        await addDoc(collection(db, 'workOrders'), finalData);
      }
      setShowAddModal(false);
      setEditingOrder(null);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء حفظ أمر الشغل في النظام.');
    }
  };

  // Delete Order
  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد تماماً من حذف أمر التشغيل هذا؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        await deleteDoc(doc(db, 'workOrders', id));
      } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء حذف أمر الشغل.');
      }
    }
  };

  // Production Line stages tracking list
  const productionRooms = useMemo(() => {
    const list: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      deliveryDate: string;
      salesPerson: string;
      costCenterId?: string;
      roomIndex: number;
      roomCode: string;
      generalSpecs: string;
      dimensionsAndStructure: string;
      paintSpecs: string;
      upholsterySpecs: string;
      status: string;
      notes: string;
      attachmentImage?: string;
    }[] = [];

    workOrders.forEach(order => {
      // Only track active orders that are NOT delivered or cancelled
      if (order.status !== 'سلم للعميل' && order.status !== 'ملغى') {
        const orderRooms = order.rooms || [];
        if (orderRooms.length === 0) {
          // Fallback legacy order single room specs
          list.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            deliveryDate: order.deliveryDate,
            salesPerson: order.salesPerson || '',
            costCenterId: order.costCenterId,
            roomIndex: 0,
            roomCode: order.roomCode || 'غرفة عامة',
            generalSpecs: order.generalSpecs || '',
            dimensionsAndStructure: order.dimensionsAndStructure || '',
            paintSpecs: order.paintSpecs || '',
            upholsterySpecs: order.upholsterySpecs || '',
            status: order.status || 'بانتظار التعميد',
            notes: order.notes || '',
            attachmentImage: order.attachmentImage
          });
        } else {
          orderRooms.forEach((r, idx) => {
            list.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              deliveryDate: order.deliveryDate,
              salesPerson: order.salesPerson || '',
              costCenterId: order.costCenterId,
              roomIndex: idx,
              roomCode: r.roomCode || `بند #${idx + 1}`,
              generalSpecs: r.generalSpecs || '',
              dimensionsAndStructure: r.dimensionsAndStructure || '',
              paintSpecs: r.paintSpecs || '',
              upholsterySpecs: r.upholsterySpecs || '',
              status: r.status || 'بانتظار التعميد',
              notes: order.notes || '',
              attachmentImage: order.attachmentImage
            });
          });
        }
      }
    });

    return list;
  }, [workOrders]);

  // Update specific room's stage/status inside an order
  const updateRoomStage = async (orderId: string, roomIndex: number, newStage: string) => {
    try {
      const order = workOrders.find(o => o.id === orderId);
      if (!order) return;

      let updatedRooms = order.rooms ? [...order.rooms] : [];
      if (updatedRooms.length === 0) {
        // Legacy order with single room specs
        const updatedOrder = {
          ...order,
          status: newStage === 'جاهز للتسليم' ? 'في المخزن تام التشطيب' : 'في أحد مراكز التكلفة',
          roomCode: order.roomCode || 'غرفة عامة',
          rooms: [{
            roomCode: order.roomCode || 'غرفة عامة',
            generalSpecs: order.generalSpecs || '',
            dimensionsAndStructure: order.dimensionsAndStructure || '',
            paintSpecs: order.paintSpecs || '',
            upholsterySpecs: order.upholsterySpecs || '',
            status: newStage
          }]
        };
        await updateDoc(doc(db, 'workOrders', orderId), updatedOrder);
      } else {
        updatedRooms[roomIndex] = {
          ...updatedRooms[roomIndex],
          status: newStage
        };

        // Determine overall order status dynamically!
        const allReady = updatedRooms.every(r => r.status === 'جاهز للتسليم');
        const allAwaiting = updatedRooms.every(r => r.status === 'بانتظار التعميد');
        
        let overallStatus = order.status;
        if (allReady) {
          overallStatus = 'في المخزن تام التشطيب';
        } else if (allAwaiting) {
          overallStatus = 'بانتظار التعميد';
        } else {
          overallStatus = 'في أحد مراكز التكلفة';
        }

        await updateDoc(doc(db, 'workOrders', orderId), {
          rooms: updatedRooms,
          status: overallStatus
        });
      }
    } catch (error) {
      console.error('Error updating room stage:', error);
      alert('حدث خطأ أثناء تحديث مرحلة الإنتاج.');
    }
  };

  // Update specific order's cost center / workshop
  const updateOrderCostCenter = async (orderId: string, costCenterId: string) => {
    try {
      await updateDoc(doc(db, 'workOrders', orderId), { costCenterId });
    } catch (error) {
      console.error('Error updating cost center:', error);
      alert('حدث خطأ أثناء تحديث ورشة العمل.');
    }
  };

  // Helper to calculate and display countdown days for delivery
  const getRemainingDaysBadge = (deliveryDate: string) => {
    if (!deliveryDate) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const delDate = new Date(deliveryDate);
    delDate.setHours(0,0,0,0);
    
    const diffTime = delDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <span className="bg-rose-50 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-rose-100">متأخر {-diffDays} يوم ⚠️</span>;
    } else if (diffDays === 0) {
      return <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-amber-100">التسليم اليوم 📅</span>;
    } else if (diffDays <= 3) {
      return <span className="bg-orange-50 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-orange-100">متبقي {diffDays} يوم ⏳</span>;
    } else {
      return <span className="bg-slate-50 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-slate-100">متبقي {diffDays} يوم</span>;
    }
  };

  // Convert to Delivery Receipt (محضر استلام)
  const convertToDeliveryReceipt = async (order: FurnitureWorkOrder) => {
    try {
      const receiptNumber = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
      const productsList = order.rooms && order.rooms.length > 0 
        ? order.rooms.map(r => ({ name: r.roomCode, quantity: 1, notes: `${r.generalSpecs || ''} | الدهان: ${r.paintSpecs || ''}` }))
        : [{ name: order.roomCode, quantity: 1, notes: `${order.generalSpecs || ''} | الدهان: ${order.paintSpecs || ''}` }];

      await addDoc(collection(db, 'deliveryReceipts'), {
        receiptNumber,
        orderNumber: order.orderNumber,
        clientName: order.customerName,
        salesPerson: order.salesPerson || '',
        deliveryTeam: '',
        branch: '',
        address: '',
        phone: '',
        nationalId: '',
        products: productsList,
        productRating: 'ممتاز',
        teamRating: 'ممتاز',
        notes: `تم تحويله تلقائياً من أمر التشغيل رقم ${order.orderNumber}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });
      alert(`🎉 تم بنجاح إنشاء محضر الاستلام برقم ${receiptNumber}! يمكنك الآن طباعته من قسم محاضر الاستلام.`);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء تحويل أمر الشغل لمشهد أو محضر استلام.');
    }
  };

  // Convert to Loading Manifest (حمولة سيارة)
  const convertToLoadingManifest = async (order: FurnitureWorkOrder) => {
    try {
      const productsList = order.rooms && order.rooms.length > 0
        ? order.rooms.map(r => ({ 
            name: r.roomCode, 
            components: r.dimensionsAndStructure || '', 
            notes: r.upholsterySpecs || '', 
            salesPerson: order.salesPerson || '', 
            additions: '' 
          }))
        : [{ 
            name: order.roomCode, 
            components: order.dimensionsAndStructure || '', 
            notes: order.upholsterySpecs || '', 
            salesPerson: order.salesPerson || '', 
            additions: '' 
          }];

      await addDoc(collection(db, 'loadingManifests'), {
        driverName: '',
        carNumber: '',
        destinationType: 'عميل',
        clientName: order.customerName,
        orderNumbers: order.orderNumber,
        loaderName: '',
        notes: `تم تحويله تلقائياً من أمر التشغيل رقم ${order.orderNumber}`,
        products: productsList,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });
      alert(`🎉 تم بنجاح إنشاء حمولة السيارة للعميل ${order.customerName}! يمكنك تعبئة تفاصيل السيارة والسائق من قسم حمولة السيارات.`);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء تحويل أمر الشغل لحمولة سيارة.');
    }
  };

  // Customer ledger metrics calculation
  const customerLedgers = useMemo(() => {
    return customers.map(cust => {
      const custOrders = workOrders.filter(o => o.customerId === cust.id);
      const custPayments = customerPayments.filter(p => p.customerId === cust.id);
      
      const totalOrdersValue = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalPaid = custPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingAmount = totalOrdersValue - totalPaid;

      return {
        customer: cust,
        orders: custOrders,
        payments: custPayments,
        totalOrdersValue,
        totalPaid,
        remainingAmount
      };
    });
  }, [customers, workOrders, customerPayments]);

  const selectedLedger = useMemo(() => {
    if (!selectedLedgerCustomer) return null;
    return customerLedgers.find(l => l.customer.id === selectedLedgerCustomer.id) || null;
  }, [selectedLedgerCustomer, customerLedgers]);

  // Handle register payment
  const handleSavePayment = async () => {
    if (!paymentForm.customerId || !paymentForm.amount || paymentForm.amount <= 0) {
      alert('الرجاء التحقق من اختيار العميل وتحديد قيمة المدفوع / العربون.');
      return;
    }

    try {
      const selectedCust = customers.find(c => c.id === paymentForm.customerId);
      if (!selectedCust) return;

      const paymentRef = await addDoc(collection(db, 'customerPayments'), {
        customerId: paymentForm.customerId,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        safeId: paymentForm.safeId,
        notes: paymentForm.notes || 'عربون / دفعة حساب أمر شغل',
        date: paymentForm.date
      });

      // Update customer balance on firestore
      const currentBalance = selectedCust.balance || 0;
      await updateDoc(doc(db, 'customers', selectedCust.id), {
        balance: currentBalance - Number(paymentForm.amount)
      });

      // Register safe transaction
      if (paymentForm.safeId) {
        await addDoc(collection(db, 'safeTransactions'), {
          safeId: paymentForm.safeId,
          date: paymentForm.date,
          type: 'مبيعات',
          amount: Number(paymentForm.amount),
          description: `عربون/دفعة من العميل: ${selectedCust.name} (${paymentForm.notes || 'عربون أمر شغل'})`,
          relatedId: paymentRef.id,
          category: 'إيرادات مبيعات',
          createdBy: profile?.name || 'مستلم العربون'
        });

        // Update safe balance
        const safe = safes.find(s => s.id === paymentForm.safeId);
        if (safe) {
          await updateDoc(doc(db, 'safes', safe.id), {
            balance: (safe.balance || 0) + Number(paymentForm.amount)
          });
        }
      }

      alert('🎉 تم بنجاح تسجيل الدفعة/العربون وتغذية الخزنة وتحديث رصيد العميل!');
      setShowPaymentModal(false);
      setPaymentForm({
        customerId: '',
        amount: 0,
        paymentMethod: 'نقدي',
        safeId: safes[0]?.id || '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء حفظ الحركة المالية لدفعة العميل.');
    }
  };

  // ==========================================
  // NEW WHATSAPP & EXCEL FAST-ENTRY CORE LOGIC
  // ==========================================

  // Process WhatsApp screenshot/PDF upload to Firestore Drafts
  const handleWhatsAppDraftUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.70); // compress

          try {
            await addDoc(collection(db, 'whatsappDrafts'), {
              fileName: file.name,
              imageUrl: dataUrl,
              status: 'جديد بانتظار التفريغ',
              createdAt: new Date().toISOString()
            });
          } catch (err) {
            console.error('Error saving WhatsApp draft:', err);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Delete WhatsApp draft
  const deleteWhatsAppDraft = async (id: string) => {
    if (confirm('هل ترغب في حذف مرفق الواتساب هذا؟')) {
      try {
        await deleteDoc(doc(db, 'whatsappDrafts', id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Create an Excel sheet row from a WhatsApp draft with AI Extraction
  const convertDraftToExcelRow = async (draft: any) => {
    try {
      await updateDoc(doc(db, 'whatsappDrafts', draft.id), { status: 'جاري التحليل بالذكاء الاصطناعي... ⏳' });
    } catch (err) {
      console.error(err);
    }

    try {
      const base64Parts = draft.imageUrl.split(',');
      const base64Data = base64Parts[1] || draft.imageUrl;
      const mimeType = draft.imageUrl.split(';')[0]?.split(':')[1]?.split(';')[0] || 'image/jpeg';

      const response = await fetch('/api/whatsapp/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '',
          file: {
            base64: base64Data,
            mimeType: mimeType
          }
        })
      });

      if (!response.ok) {
        throw new Error('فشل الاتصال بـ Gemini API أو حدث خطأ أثناء التحليل.');
      }

      const data = await response.json();
      const todayStr = new Date().toISOString().split('T')[0];
      let resolvedCustomerId = '';
      let resolvedCustomerName = '';

      const parsedClientName = data.productionData?.clientName || data.deliveryData?.clientName || data.loadingData?.clientName || '';
      if (parsedClientName) {
        const matched = customers.find(c => 
          c.name.includes(parsedClientName) || parsedClientName.includes(c.name)
        );
        if (matched) {
          resolvedCustomerId = matched.id;
          resolvedCustomerName = matched.name;
        } else {
          resolvedCustomerName = parsedClientName;
        }
      }

      const pd = data.productionData || {};
      const roomCode = pd.roomCode || pd.products?.[0]?.name || 'غرفة مخصصة';
      const generalSpecs = pd.generalSpecs || pd.products?.[0]?.notes || pd.notes || '';
      const dimensionsAndStructure = pd.dimensionsAndStructure || '';
      const paintSpecs = pd.paintSpecs || '';
      const upholsterySpecs = pd.upholsterySpecs || '';
      const totalAmount = Number(pd.totalAmount) || 0;
      const salesPerson = pd.salesPerson || '';
      const contractDate = pd.contractDate || todayStr;
      const deliveryDate = pd.deliveryDate || '';

      const newRow = {
        tempId: `temp-${Math.random()}`,
        orderNumber: pd.workOrderNumber || `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: resolvedCustomerId,
        customerName: resolvedCustomerName,
        roomCode: roomCode,
        contractDate: contractDate,
        deliveryDate: deliveryDate,
        salesPerson: salesPerson,
        attachmentImage: draft.imageUrl,
        generalSpecs: generalSpecs,
        dimensionsAndStructure: dimensionsAndStructure,
        paintSpecs: paintSpecs,
        upholsterySpecs: upholsterySpecs,
        totalAmount: totalAmount,
        status: 'بانتظار التعميد'
      };

      setExcelRows(prev => [newRow, ...prev]);
      setActiveSubTab('whatsapp_hub');
      await updateDoc(doc(db, 'whatsappDrafts', draft.id), { status: 'تم التفريغ للشيت ✨' });
    } catch (err: any) {
      console.error(err);
      alert(`❌ فشل التفريغ التلقائي بالذكاء الاصطناعي: ${err.message || err}\nسيتم إدراج سطر فارغ يحتوي على الصورة لتعبئته يدوياً.`);
      
      const fallbackRow = {
        tempId: `temp-${Math.random()}`,
        orderNumber: `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: '',
        customerName: '',
        roomCode: '',
        contractDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        salesPerson: '',
        attachmentImage: draft.imageUrl,
        generalSpecs: '',
        dimensionsAndStructure: '',
        paintSpecs: '',
        upholsterySpecs: '',
        totalAmount: 0,
        status: 'بانتظار التعميد'
      };
      setExcelRows(prev => [fallbackRow, ...prev]);
      setActiveSubTab('whatsapp_hub');
      await updateDoc(doc(db, 'whatsappDrafts', draft.id), { status: 'فشل التفريغ التلقائي (يدوي)' });
    }
  };

  // Open Split-Screen Unpacker Modal
  const handleOpenSplitUnpacker = (draft: any) => {
    setActiveDraft(draft);
    setZoomLevel(1);
    setRotation(0);
    setAiParseStatusMessage('');
    setIsAiParsingInProgress(false);
    
    setSplitForm({
      orderNumber: `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: '',
      customerName: '',
      roomCode: '',
      contractDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      salesPerson: '',
      generalSpecs: '',
      dimensionsAndStructure: '',
      paintSpecs: '',
      upholsterySpecs: '',
      totalAmount: 0,
      depositPaid: 0,
      notes: ''
    });
    
    setShowSplitScreenModal(true);
  };

  // Create quick customer inside the modal
  const handleCreateQuickCustomer = async () => {
    if (!quickCustomerName) {
      alert('الرجاء إدخال اسم العميل');
      return;
    }
    setIsCreatingQuickCustomer(true);
    try {
      const newCustomer = {
        name: quickCustomerName,
        phone: quickCustomerPhone || '01000000000',
        email: '',
        address: '',
        type: quickCustomerType,
        status: 'نشط',
        balance: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      const docRef = await addDoc(collection(db, 'customers'), newCustomer);
      setSplitForm(prev => ({
        ...prev,
        customerId: docRef.id,
        customerName: quickCustomerName
      }));
      setQuickCustomerName('');
      setQuickCustomerPhone('');
      alert('تم إضافة العميل الجديد وتحديده بنجاح! 🎉');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة العميل.');
    } finally {
      setIsCreatingQuickCustomer(false);
    }
  };

  // Run AI analysis inside the split-screen modal
  const runAiAnalysisInModal = async () => {
    if (!activeDraft) return;
    setIsAiParsingInProgress(true);
    setAiParseStatusMessage('جاري تحليل الصورة بالذكاء الاصطناعي... ⏳');
    try {
      const base64Parts = activeDraft.imageUrl.split(',');
      const base64Data = base64Parts[1] || activeDraft.imageUrl;
      const mimeType = activeDraft.imageUrl.split(';')[0]?.split(':')[1]?.split(';')[0] || 'image/jpeg';

      const response = await fetch('/api/whatsapp/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '',
          file: {
            base64: base64Data,
            mimeType: mimeType
          }
        })
      });

      if (!response.ok) {
        throw new Error('الخوادم مشغولة حالياً.');
      }

      const data = await response.json();
      const pd = data.productionData || {};
      
      const parsedClientName = pd.clientName || data.deliveryData?.clientName || '';
      let resolvedId = '';
      let resolvedName = parsedClientName || '';
      
      if (parsedClientName) {
        const matched = customers.find(c => 
          c.name.includes(parsedClientName) || parsedClientName.includes(c.name)
        );
        if (matched) {
          resolvedId = matched.id;
          resolvedName = matched.name;
        }
      }

      setSplitForm(prev => ({
        ...prev,
        orderNumber: pd.workOrderNumber || prev.orderNumber,
        customerId: resolvedId,
        customerName: resolvedName,
        roomCode: pd.roomCode || pd.products?.[0]?.name || prev.roomCode,
        generalSpecs: pd.generalSpecs || pd.products?.[0]?.notes || pd.notes || '',
        dimensionsAndStructure: pd.dimensionsAndStructure || '',
        paintSpecs: pd.paintSpecs || '',
        upholsterySpecs: pd.upholsterySpecs || '',
        totalAmount: Number(pd.totalAmount) || prev.totalAmount,
        depositPaid: Number(pd.depositPaid) || prev.depositPaid,
        deliveryDate: pd.deliveryDate || prev.deliveryDate,
        salesPerson: pd.salesPerson || prev.salesPerson,
      }));

      setAiParseStatusMessage('✨ تم التفريغ المقترح بنجاح! راجع البيانات وأكد الحفظ.');
    } catch (err: any) {
      console.error(err);
      setAiParseStatusMessage('⚠️ خوادم جوجل مشغولة حالياً بالضغط الشديد. تم تفعيل التفريغ اليدوي، يمكنك ملء الخانات بنفسك فوراً.');
    } finally {
      setIsAiParsingInProgress(false);
    }
  };

  // Add the unpacked form to the Excel sheet
  const handleSaveFromSplitToExcel = async () => {
    const customerName = splitForm.customerId 
      ? (customers.find(c => c.id === splitForm.customerId)?.name || splitForm.customerName)
      : splitForm.customerName;
      
    if (!customerName) {
      alert('الرجاء اختيار العميل أو كتابة اسمه.');
      return;
    }

    const newRow = {
      tempId: `temp-${Math.random()}`,
      orderNumber: splitForm.orderNumber || `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: splitForm.customerId,
      customerName: customerName,
      roomCode: splitForm.roomCode,
      contractDate: splitForm.contractDate,
      deliveryDate: splitForm.deliveryDate,
      salesPerson: splitForm.salesPerson,
      attachmentImage: activeDraft.imageUrl,
      generalSpecs: splitForm.generalSpecs,
      dimensionsAndStructure: splitForm.dimensionsAndStructure,
      paintSpecs: splitForm.paintSpecs,
      upholsterySpecs: splitForm.upholsterySpecs,
      totalAmount: splitForm.totalAmount,
      depositPaid: splitForm.depositPaid,
      notes: splitForm.notes,
      status: 'بانتظار التعميد'
    };

    setExcelRows(prev => [newRow, ...prev]);
    
    try {
      await updateDoc(doc(db, 'whatsappDrafts', activeDraft.id), { status: 'تم التفريغ للشيت ✨' });
    } catch (err) {
      console.error(err);
    }

    setShowSplitScreenModal(false);
    alert('تم إدراج البند لشيت الإدخال التفاعلي المجمع! راجعه ثم احفظ الشيت بالكامل لتثبيته بالإنتاج.');
  };

  // Save direct to production & accounting
  const handleSaveDirectToFirestore = async () => {
    const customerName = splitForm.customerId 
      ? (customers.find(c => c.id === splitForm.customerId)?.name || splitForm.customerName)
      : splitForm.customerName;

    if (!customerName) {
      alert('الرجاء اختيار العميل أو كتابة اسمه.');
      return;
    }

    let finalCustomerId = splitForm.customerId;
    if (!finalCustomerId && customerName) {
      const matched = customers.find(c => c.name === customerName);
      if (matched) {
        finalCustomerId = matched.id;
      } else {
        try {
          const newCustRef = await addDoc(collection(db, 'customers'), {
            name: customerName,
            phone: '01000000000',
            email: '',
            address: '',
            type: 'أفراد',
            status: 'نشط',
            balance: 0,
            createdAt: new Date().toISOString().split('T')[0]
          });
          finalCustomerId = newCustRef.id;
        } catch (e) {
          console.error(e);
        }
      }
    }

    try {
      const newOrder = {
        orderNumber: splitForm.orderNumber || `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: finalCustomerId,
        customerName: customerName,
        roomCode: splitForm.roomCode,
        contractDate: splitForm.contractDate,
        deliveryDate: splitForm.deliveryDate,
        salesPerson: splitForm.salesPerson,
        attachmentImage: activeDraft.imageUrl,
        generalSpecs: splitForm.generalSpecs,
        dimensionsAndStructure: splitForm.dimensionsAndStructure,
        paintSpecs: splitForm.paintSpecs,
        upholsterySpecs: splitForm.upholsterySpecs,
        totalAmount: splitForm.totalAmount,
        depositPaid: splitForm.depositPaid,
        remainingAmount: splitForm.totalAmount - splitForm.depositPaid,
        status: 'بانتظار التعميد',
        rooms: [
          {
            roomCode: splitForm.roomCode,
            generalSpecs: splitForm.generalSpecs,
            dimensionsAndStructure: splitForm.dimensionsAndStructure,
            paintSpecs: splitForm.paintSpecs,
            upholsterySpecs: splitForm.upholsterySpecs,
            status: 'بانتظار التعميد'
          }
        ],
        notes: splitForm.notes,
        createdBy: profile?.email || 'مدير التشغيل',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'workOrders'), newOrder);

      // If deposit > 0, record in accounting
      if (splitForm.depositPaid > 0) {
        await addDoc(collection(db, 'customerPayments'), {
          customerId: finalCustomerId,
          date: splitForm.contractDate,
          amount: splitForm.depositPaid,
          paymentMethod: 'نقدي',
          notes: `عربون مستلم مع أمر شغل ${newOrder.orderNumber}`,
          safeId: safes[0]?.id || ''
        });
      }

      await updateDoc(doc(db, 'whatsappDrafts', activeDraft.id), { status: 'مؤرشف ومثبت بالكامل 💾' });
      
      setShowSplitScreenModal(false);
      alert('🎉 تم تثبيت أمر الشغل بالكامل وتوجيهه لخطوط الإنتاج، وتسجيل العربون في حساب العميل والنيابة!');
    } catch (err: any) {
      console.error(err);
      alert(`حدث خطأ أثناء الحفظ المباشر: ${err.message}`);
    }
  };

  // Add clean empty Excel row
  const addExcelRow = () => {
    const newRow = {
      tempId: `temp-${Math.random()}`,
      orderNumber: `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: '',
      customerName: '',
      roomCode: '',
      contractDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      salesPerson: '',
      attachmentImage: '',
      generalSpecs: '',
      dimensionsAndStructure: '',
      paintSpecs: '',
      upholsterySpecs: '',
      totalAmount: 0,
      status: 'بانتظار التعميد'
    };
    setExcelRows(prev => [...prev, newRow]);
  };

  // Remove Excel Row
  const removeExcelRow = (tempId: string) => {
    setExcelRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  // Update Specific field inside Excel sheet row
  const updateExcelRow = (tempId: string, field: string, value: any) => {
    setExcelRows(prev => prev.map(r => {
      if (r.tempId === tempId) {
        if (field === 'customerId') {
          const selectedCust = customers.find(c => c.id === value);
          return { ...r, customerId: value, customerName: selectedCust ? selectedCust.name : '' };
        }
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  // Compress and set image inside Excel sheet row
  const handleExcelRowImageUpload = (tempId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.70);
        updateExcelRow(tempId, 'attachmentImage', dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save Excel Spreadsheet Rows to Firestore in Bulk
  const saveExcelSheet = async () => {
    const validRows = excelRows.filter(r => r.customerId && r.roomCode);
    if (validRows.length === 0) {
      alert('⚠️ الرجاء التحقق من تعبئة "العميل" و "اسم الغرفة" لسطر واحد على الأقل قبل الحفظ.');
      return;
    }

    if (!confirm(`هل أنت متأكد من حفظ عدد (${validRows.length}) أوامر شغل مجمعة وتنزيلها في حسابات العملاء؟`)) {
      return;
    }

    try {
      for (const row of validRows) {
        const orderData = {
          orderNumber: row.orderNumber,
          customerId: row.customerId,
          customerName: row.customerName,
          roomCode: row.roomCode,
          contractDate: row.contractDate,
          deliveryDate: row.deliveryDate || '',
          salesPerson: row.salesPerson || '',
          attachmentImage: row.attachmentImage || '',
          generalSpecs: row.generalSpecs || '',
          dimensionsAndStructure: row.dimensionsAndStructure || '',
          paintSpecs: row.paintSpecs || '',
          upholsterySpecs: row.upholsterySpecs || '',
          status: row.status || 'بانتظار التعميد',
          totalAmount: Number(row.totalAmount) || 0,
          rooms: [
            {
              roomCode: row.roomCode,
              generalSpecs: row.generalSpecs || '',
              dimensionsAndStructure: row.dimensionsAndStructure || '',
              paintSpecs: row.paintSpecs || '',
              upholsterySpecs: row.upholsterySpecs || '',
              status: row.status || 'بانتظار التعميد'
            }
          ],
          createdAt: new Date().toISOString(),
          createdBy: profile?.name || 'مستخدم النظام (شيت)'
        };
        await addDoc(collection(db, 'workOrders'), orderData);
      }
      alert(`🎉 تم بنجاح حفظ وتثبيت عدد ${validRows.length} أوامر شغل في قاعدة البيانات!`);
      setExcelRows([]);
    } catch (err) {
      console.error('Error saving excel rows:', err);
      alert('حدث خطأ أثناء الحفظ المجمع للبيانات.');
    }
  };

  // ==========================================
  // MONTHLY FOLDERS & GROUPING CALCULATIONS
  // ==========================================
  const arabicMonthNames: { [key: string]: string } = {
    '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
    '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
    '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
  };

  const monthlyFolders = useMemo(() => {
    const folders: {
      [key: string]: {
        [customerId: string]: {
          customerName: string;
          customerPhone: string;
          orders: FurnitureWorkOrder[];
          totalAmount: number;
          isFullyFinished: boolean; // all orders are completed
        }
      }
    } = {};

    workOrders.forEach(order => {
      // Extract month/year from contractDate (YYYY-MM-DD)
      let folderKey = 'غير مصنف / مجهول';
      if (order.contractDate && order.contractDate.includes('-')) {
        const parts = order.contractDate.split('-');
        const monthNum = parts[1];
        const yearNum = parts[0];
        const monthAr = arabicMonthNames[monthNum] || monthNum;
        folderKey = `${monthAr} ${yearNum}`;
      }

      if (!folders[folderKey]) {
        folders[folderKey] = {};
      }

      const custId = order.customerId || 'unassigned';
      if (!folders[folderKey][custId]) {
        const custObj = customers.find(c => c.id === custId);
        folders[folderKey][custId] = {
          customerName: order.customerName || 'عميل غير محدد',
          customerPhone: custObj ? custObj.phone : '-',
          orders: [],
          totalAmount: 0,
          isFullyFinished: true
        };
      }

      folders[folderKey][custId].orders.push(order);
      folders[folderKey][custId].totalAmount += (order.totalAmount || 0);

      // Check if order status is NOT finished
      const isFinished = order.status === 'في المخزن تام التشطيب' || order.status === 'تم إرساله للمعارض' || order.status === 'سلم للعميل';
      if (!isFinished) {
        folders[folderKey][custId].isFullyFinished = false;
      }
    });

    return folders;
  }, [workOrders, customers]);

  // Create Combined Customer Delivery Receipt
  const generateCombinedCustomerReceipt = async (customerId: string, ordersList: FurnitureWorkOrder[]) => {
    if (ordersList.length === 0) return;
    try {
      const receiptNumber = `REC-COMB-${Math.floor(1000 + Math.random() * 9000)}`;
      const clientName = ordersList[0].customerName;
      
      const products: any[] = [];
      ordersList.forEach(o => {
        if (o.rooms && o.rooms.length > 0) {
          o.rooms.forEach(r => {
            products.push({
              name: r.roomCode,
              quantity: 1,
              notes: `${r.generalSpecs || ''} | النجارة: ${r.dimensionsAndStructure || ''} | الدهان: ${r.paintSpecs || ''}`
            });
          });
        } else {
          products.push({
            name: o.roomCode,
            quantity: 1,
            notes: `${o.generalSpecs || ''} | النجارة: ${o.dimensionsAndStructure || ''} | الدهان: ${o.paintSpecs || ''}`
          });
        }
      });

      const newReceipt = {
        receiptNumber,
        clientName,
        customerId,
        orderNumber: ordersList.map(o => o.orderNumber).join(' + '),
        date: new Date().toISOString().split('T')[0],
        products,
        notes: 'تم إنشاء محضر استلام مجمع لكافة بنود العميل الجاهزة.',
        productRating: 'ممتاز',
        teamRating: 'ممتاز',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'deliveryReceipts'), newReceipt);
      setSelectedReceiptForPrint({ id: docRef.id, ...newReceipt });
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إصدار محضر الاستلام المجمع للعميل.');
    }
  };

  // Compile Loading Manifest from Checked Items
  const saveLoadingManifest = async () => {
    if (!manifestForm.driverName || !manifestForm.carNumber) {
      alert('الرجاء كتابة اسم السائق ورقم السيارة لتسليم بيان الحمولة.');
      return;
    }
    if (manifestForm.selectedRoomKeys.length === 0) {
      alert('الرجاء اختيار بند أو غرفة واحدة على الأقل لتحميلها في السيارة.');
      return;
    }

    try {
      const selectedItems: any[] = [];
      manifestForm.selectedRoomKeys.forEach(key => {
        const parts = key.split('-');
        const orderId = parts[0];
        const roomIndex = Number(parts[1]);
        
        const orderObj = workOrders.find(o => o.id === orderId);
        if (orderObj) {
          let roomName = orderObj.roomCode;
          let specs = `${orderObj.generalSpecs || ''} ${orderObj.dimensionsAndStructure || ''}`;
          
          if (orderObj.rooms && orderObj.rooms[roomIndex]) {
            roomName = orderObj.rooms[roomIndex].roomCode;
            specs = `${orderObj.rooms[roomIndex].generalSpecs || ''} ${orderObj.rooms[roomIndex].dimensionsAndStructure || ''}`;
          }

          selectedItems.push({
            orderId,
            roomIndex,
            orderNumber: orderObj.orderNumber,
            customerName: orderObj.customerName,
            roomCode: roomName,
            specs
          });
        }
      });

      const newManifest = {
        driverName: manifestForm.driverName,
        carNumber: manifestForm.carNumber,
        loaderName: manifestForm.loaderName || 'مسؤول التحميل بالمستودع',
        date: manifestForm.date,
        notes: manifestForm.notes || 'بيان حمولة سيارة شحن بضائع',
        items: selectedItems,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'loadingManifests'), newManifest);
      
      // Opt-in: Automatically advance the status of loaded rooms to 'سلم للعميل' or log it!
      if (confirm('هل ترغب في تغيير حالة كافة الغرف والبنود المحملة تلقائياً في قاعدة البيانات إلى "سلم للعميل"؟')) {
        for (const item of selectedItems) {
          await updateRoomStage(item.orderId, item.roomIndex, 'سلم للعميل');
        }
      }

      alert('🎉 تم حفظ بيان الحمولة بنجاح! جاري عرض قالب الطباعة للسائق...');
      setSelectedManifestForPrint({ id: docRef.id, ...newManifest });
      setShowManifestAddModal(false);
      setManifestForm({
        driverName: '',
        carNumber: '',
        loaderName: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        selectedRoomKeys: []
      });

      setTimeout(() => {
        window.print();
      }, 300);

    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ بيان حمولة السيارة.');
    }
  };

  // Toggle checklist selection in Loading manifest form
  const toggleRoomLoadingSelection = (key: string) => {
    setManifestForm(prev => {
      const keys = [...prev.selectedRoomKeys];
      const idx = keys.indexOf(key);
      if (idx > -1) {
        keys.splice(idx, 1);
      } else {
        keys.push(key);
      }
      return { ...prev, selectedRoomKeys: keys };
    });
  };

  // Filtering Logic for Orders
  const filteredOrders = useMemo(() => {
    return workOrders.filter(o => {
      const clientName = o.customerName || '';
      const orderNo = o.orderNumber || '';
      const rCode = o.roomCode || '';
      const roomsStr = o.rooms?.map(r => r.roomCode).join(' ') || '';
      const sales = o.salesPerson || '';

      const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           rCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           roomsStr.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSales = !salesPersonFilter || sales.toLowerCase().includes(salesPersonFilter.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter !== 'الكل') {
        matchesStatus = o.status === statusFilter;
      }

      // Month & Year filtering (from contractDate YYYY-MM-DD)
      let matchesMonth = true;
      if (monthFilter !== 'الكل') {
        const orderMonth = o.contractDate ? o.contractDate.split('-')[1] : '';
        matchesMonth = orderMonth === monthFilter;
      }

      let matchesYear = true;
      if (yearFilter !== 'الكل') {
        const orderYear = o.contractDate ? o.contractDate.split('-')[0] : '';
        matchesYear = orderYear === yearFilter;
      }

      // Dates filtering
      let matchesContract = true;
      if (contractDateFrom) {
        matchesContract = matchesContract && o.contractDate >= contractDateFrom;
      }
      if (contractDateTo) {
        matchesContract = matchesContract && o.contractDate <= contractDateTo;
      }

      let matchesDelivery = true;
      if (deliveryDateFrom) {
        matchesDelivery = matchesDelivery && o.deliveryDate >= deliveryDateFrom;
      }
      if (deliveryDateTo) {
        matchesDelivery = matchesDelivery && o.deliveryDate <= deliveryDateTo;
      }

      return matchesSearch && matchesSales && matchesStatus && matchesMonth && matchesYear && matchesContract && matchesDelivery;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [workOrders, searchTerm, salesPersonFilter, statusFilter, monthFilter, yearFilter, contractDateFrom, contractDateTo, deliveryDateFrom, deliveryDateTo]);

  // Quick Action: Print summary report of filtered items
  const printFilteredSummary = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'بانتظار التعميد': 
        return <span className="px-2.5 py-1 text-xs font-black rounded-lg border bg-amber-50 text-amber-700 border-amber-200">بانتظار التعميد</span>;
      case 'في أحد مراكز التكلفة': 
        return <span className="px-2.5 py-1 text-xs font-black rounded-lg border bg-orange-50 text-orange-700 border-orange-200">في أحد الورش / مراكز التكلفة</span>;
      case 'في المخزن تام التشطيب': 
        return <span className="px-2.5 py-1 text-xs font-black rounded-lg border bg-sky-50 text-sky-700 border-sky-200">في مخزن تام التشطيب ✨</span>;
      case 'تم إرساله للمعارض': 
        return <span className="px-2.5 py-1 text-xs font-black rounded-lg border bg-purple-50 text-purple-700 border-purple-200">تم إرساله للمعارض 🏛️</span>;
      case 'سلم للعميل': 
        return <span className="px-2.5 py-1 text-xs font-black rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200">سلم للعميل 🏠</span>;
      case 'ملغى': 
        return <span className="px-2.5 py-1 text-xs font-black rounded-lg border bg-rose-50 text-rose-700 border-rose-200">ملغى</span>;
      default: 
        return <span className="px-2.5 py-1 text-xs font-black rounded-lg border bg-slate-100 text-slate-700 border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-active, .print-active * { visibility: visible !important; }
          .print-active { position: absolute; left: 0; top: 0; width: 100%; direction: rtl; display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Primary Tab Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-indigo-600" size={28} />
            أوامر التشغيل وتتبع العملاء الفني والمالي
          </h2>
          <p className="text-slate-500 font-bold text-xs">
            إصدار ومتابعة أوامر إنتاج غرف الأثاث المتعددة للعملاء وربطها بالمدفوعات والحسابات والتحويل السريع
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'orders' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            📋 أوامر الشغل ({workOrders.length})
          </button>
          <button
            onClick={() => setActiveSubTab('production_line')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'production_line' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            🏭 خط الإنتاج وتتبع المراحل
          </button>
          <button
            onClick={() => setActiveSubTab('whatsapp_hub')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'whatsapp_hub' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            🟢 أرشفة الواتساب والشيت السريع
          </button>
          <button
            onClick={() => setActiveSubTab('monthly_folders')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'monthly_folders' 
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-100' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            📂 الأرشيف الشهري والعملاء
          </button>
          <button
            onClick={() => setActiveSubTab('shipping_hub')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'shipping_hub' 
                ? 'bg-sky-600 text-white shadow-md shadow-sky-100' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            🚚 الشحن والتحميل المجمع
          </button>
          <button
            onClick={() => setActiveSubTab('analytics_hub')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'analytics_hub' 
                ? 'bg-purple-600 text-white shadow-md shadow-purple-100' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            📊 التقارير والذكاء التنفيذي
          </button>
          <button
            onClick={() => setActiveSubTab('customer_accounts')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'customer_accounts' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            💰 الحسابات والعرابين
          </button>
        </div>
      </div>

      {activeSubTab === 'orders' && (
        <>
          {/* Action Buttons & Advanced Search Filter Header */}
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-2">
              <Button onClick={initNewOrder}>
                <Plus size={16} className="ml-1.5" />
                إصدار أمر تشغيل جديد (متعدد الغرف)
              </Button>
              <Button variant="outline" onClick={printFilteredSummary}>
                <Printer size={16} className="ml-1.5 text-indigo-600" />
                طباعة تقرير الفرز الحالي 🖨️
              </Button>
            </div>
          </div>

          {/* Precision Filters Panel */}
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-slate-50/50 py-3 px-6">
              <CardTitle className="text-xs font-black text-slate-600 flex items-center gap-2">
                <Search size={14} className="text-indigo-500" /> لوحة الفرز والبحث الدقيق
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Term */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">بحث بالعميل / رقم الأمر / كود الغرفة:</label>
                  <input
                    type="text"
                    placeholder="اكتب العميل، رقم أمر الشغل، كود الغرفة..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Sales agent filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">مبيعات / السيلز:</label>
                  <input
                    type="text"
                    placeholder="اسم السيلز..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    value={salesPersonFilter}
                    onChange={(e) => setSalesPersonFilter(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">حالة أمر الشغل:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="الكل">كل الحالات</option>
                    <option value="بانتظار التعميد">بانتظار التعميد</option>
                    <option value="في أحد مراكز التكلفة">في أحد مراكز التكلفة</option>
                    <option value="في المخزن تام التشطيب">في المخزن تام التشطيب</option>
                    <option value="تم إرساله للمعارض">تم إرساله للمعارض</option>
                    <option value="سلم للعميل">سلم للعميل</option>
                    <option value="ملغى">ملغى</option>
                  </select>
                </div>

                {/* Month Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">شهر التعاقد:</label>
                  <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="الكل">كل الشهور</option>
                    <option value="01">شهر 1 (يناير)</option>
                    <option value="02">شهر 2 (فبراير)</option>
                    <option value="03">شهر 3 (مارس)</option>
                    <option value="04">شهر 4 (أبريل)</option>
                    <option value="05">شهر 5 (مايو)</option>
                    <option value="06">شهر 6 (يونيو)</option>
                    <option value="07">شهر 7 (يوليو)</option>
                    <option value="08">شهر 8 (أغسطس)</option>
                    <option value="09">شهر 9 (سبتمبر)</option>
                    <option value="10">شهر 10 (أكتوبر)</option>
                    <option value="11">شهر 11 (نوفمبر)</option>
                    <option value="12">شهر 12 (ديسمبر)</option>
                  </select>
                </div>

                {/* Year Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">سنة التعاقد:</label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="الكل">كل السنوات</option>
                    <option value="2024">سنة 24 (2024)</option>
                    <option value="2025">سنة 25 (2025)</option>
                    <option value="2026">سنة 26 (2026)</option>
                    <option value="2027">سنة 27 (2027)</option>
                    <option value="2028">سنة 28 (2028)</option>
                  </select>
                </div>

                {/* Date Filters */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">تاريخ التعاقد (من):</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    value={contractDateFrom}
                    onChange={(e) => setContractDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">تاريخ التعاقد (إلى):</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    value={contractDateTo}
                    onChange={(e) => setContractDateTo(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">تاريخ الاستلام (من):</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    value={deliveryDateFrom}
                    onChange={(e) => setDeliveryDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">تاريخ الاستلام (إلى):</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    value={deliveryDateTo}
                    onChange={(e) => setDeliveryDateTo(e.target.value)}
                  />
                </div>

                <div className="flex items-end justify-end">
                  <Button
                    variant="outline"
                    className="w-full py-2 bg-slate-100 border-none text-slate-600 hover:bg-slate-200"
                    onClick={() => {
                      setSearchTerm('');
                      setSalesPersonFilter('');
                      setStatusFilter('الكل');
                      setMonthFilter('الكل');
                      setYearFilter('الكل');
                      setContractDateFrom('');
                      setContractDateTo('');
                      setDeliveryDateFrom('');
                      setDeliveryDateTo('');
                    }}
                  >
                    مسح الفلاتر 🔄
                  </Button>
                </div>
              </div>

              {/* Quick Filters Row */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-black text-slate-500 ml-2">⚡ فلاتر سريعة:</span>
                
                <button
                  onClick={() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
                    
                    setSearchTerm('');
                    setSalesPersonFilter('');
                    setStatusFilter('الكل');
                    setMonthFilter('الكل');
                    setYearFilter('الكل');
                    setContractDateFrom('');
                    setContractDateTo('');
                    setDeliveryDateFrom(`${year}-${month}-01`);
                    setDeliveryDateTo(`${year}-${month}-${lastDay}`);
                  }}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all border border-indigo-100 cursor-pointer"
                >
                  📅 تسليمات مجدولة هذا الشهر
                </button>

                <button
                  onClick={() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
                    
                    setSearchTerm('');
                    setSalesPersonFilter('');
                    setStatusFilter('سلم للعميل');
                    setMonthFilter('الكل');
                    setYearFilter('الكل');
                    setContractDateFrom('');
                    setContractDateTo('');
                    setDeliveryDateFrom(`${year}-${month}-01`);
                    setDeliveryDateTo(`${year}-${month}-${lastDay}`);
                  }}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all border border-emerald-100 cursor-pointer"
                >
                  🏠 تم تسليمه للعملاء هذا الشهر
                </button>

                <button
                  onClick={() => {
                    const today = new Date();
                    const todayStr = today.toISOString().split('T')[0];
                    const future = new Date();
                    future.setDate(today.getDate() + 14);
                    const futureStr = future.toISOString().split('T')[0];
                    
                    setSearchTerm('');
                    setSalesPersonFilter('');
                    setStatusFilter('الكل');
                    setMonthFilter('الكل');
                    setYearFilter('الكل');
                    setContractDateFrom('');
                    setContractDateTo('');
                    setDeliveryDateFrom(todayStr);
                    setDeliveryDateTo(futureStr);
                  }}
                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all border border-amber-100 cursor-pointer"
                >
                  ⏰ أوردرات تقترب من التسليم (خلال 14 يوم)
                </button>

                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSalesPersonFilter('');
                    setStatusFilter('بانتظار التعميد');
                    setMonthFilter('الكل');
                    setYearFilter('الكل');
                    setContractDateFrom('');
                    setContractDateTo('');
                    setDeliveryDateFrom('');
                    setDeliveryDateTo('');
                  }}
                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                >
                  ⏳ بانتظار التعميد
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Statistics Bar / Dynamic Counts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-indigo-600 block uppercase tracking-wider">عدد الأوردرات المفلترة</span>
                <span className="text-xl font-black text-indigo-950 block mt-1">{filteredOrders.length} أوردر تشغيل</span>
              </div>
              <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-600">
                <ClipboardList size={20} />
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-600 block uppercase tracking-wider">إجمالي القيمة المالية</span>
                <span className="text-xl font-black text-emerald-950 block mt-1">
                  {filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()} ج.م
                </span>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600">
                <DollarSign size={20} />
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-purple-600 block uppercase tracking-wider">إجمالي البنود / الغرف</span>
                <span className="text-xl font-black text-purple-950 block mt-1">
                  {filteredOrders.reduce((sum, o) => sum + (o.rooms?.length || 1), 0)} غرفة 🛋️
                </span>
              </div>
              <div className="bg-purple-500/10 p-2.5 rounded-xl text-purple-600">
                <Layers size={20} />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-600 block uppercase tracking-wider">متوسط قيمة التعاقد</span>
                <span className="text-xl font-black text-amber-950 block mt-1">
                  {filteredOrders.length > 0 
                    ? Math.round(filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / filteredOrders.length).toLocaleString()
                    : 0} ج.م
                </span>
              </div>
              <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-600">
                <Briefcase size={20} />
              </div>
            </div>
          </div>

          {/* Orders Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100">
                <ClipboardList size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold">لا توجد أوامر تشغيل مطابقة لمعايير البحث الدقيق</p>
              </div>
            ) : (
              filteredOrders.map(order => {
                const totalRoomsCount = order.rooms?.length || 1;
                return (
                  <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    <div>
                      {/* Top bar with status and ref */}
                      <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                        <div>
                          <div className="text-[10px] font-black text-slate-400 font-mono">{order.orderNumber}</div>
                          <div className="font-black text-slate-800 text-sm">{order.customerName}</div>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>

                      {/* Content details */}
                      <div className="p-5 space-y-4">
                        {/* Rooms badge */}
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-indigo-100">
                            {totalRoomsCount} غرف / بنود تعاقدية 🛋️
                          </span>
                          {order.salesPerson && (
                            <span className="bg-violet-50 text-violet-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-violet-100">
                              السيلز: {order.salesPerson}
                            </span>
                          )}
                        </div>

                        {/* Room codes preview */}
                        <div className="text-xs space-y-1">
                          <span className="font-black text-slate-500 block">الغرف المشمولة:</span>
                          <p className="text-slate-800 font-bold truncate">
                            {order.rooms && order.rooms.length > 0 
                              ? order.rooms.map(r => r.roomCode).join(' + ') 
                              : order.roomCode}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-black">تاريخ التعاقد:</span>
                            <span className="font-bold text-slate-700">{order.contractDate}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-black">تاريخ الاستلام:</span>
                            <span className="font-bold text-slate-700">{order.deliveryDate || 'غير محدد'}</span>
                          </div>
                        </div>

                        {/* Financial snapshot */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                          <span className="font-black text-slate-500">القيمة الإجمالية:</span>
                          <span className="font-black text-indigo-700">{order.totalAmount?.toLocaleString() || 0} ج.م</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons at bottom */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/20 flex flex-wrap gap-2 justify-between">
                      <Button 
                        variant="outline" 
                        className="flex-1 font-bold text-[11px] h-9"
                        onClick={() => setViewingOrder(order)}
                      >
                        <Eye size={13} className="ml-1" />
                        عرض وطباعة
                      </Button>

                      <div className="flex gap-1">
                        {/* Quick transformation actions */}
                        <button
                          title="تحويل لمستند استلام للعميل"
                          onClick={() => convertToDeliveryReceipt(order)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 border border-slate-100 rounded-lg"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          title="تحويل لحمولة سيارة"
                          onClick={() => convertToLoadingManifest(order)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 border border-slate-100 rounded-lg"
                        >
                          <Truck size={14} />
                        </button>
                        <button
                          title="تعديل"
                          onClick={() => {
                            setEditingOrder(order);
                            setFormData({
                              ...order,
                              rooms: order.rooms || [
                                {
                                  roomCode: order.roomCode || '',
                                  generalSpecs: order.generalSpecs || '',
                                  dimensionsAndStructure: order.dimensionsAndStructure || '',
                                  paintSpecs: order.paintSpecs || '',
                                  upholsterySpecs: order.upholsterySpecs || '',
                                  status: order.status || 'بانتظار التعميد'
                                }
                              ]
                            });
                            setShowAddModal(true);
                          }}
                          className="p-2 text-slate-500 hover:bg-slate-100 border border-slate-100 rounded-lg"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          title="حذف"
                          onClick={() => handleDelete(order.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 border border-slate-100 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Active Production Line / Stages Kanban board */}
      {activeSubTab === 'production_line' && (
        <div className="space-y-6">
          {/* Header Controls for Production Line */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-800">تتبع مراحل خط الإنتاج والتصنيع الفعلي</h3>
              <p className="text-slate-400 font-bold text-[11px]">تابع سير الغرف والبنود في أقسام المصنع المختلفة من التجهيز وحتى التعبئة وجاهزية الاستلام</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Pipeline Search */}
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالعميل، كود الغرفة..."
                  className="w-full pr-8 pl-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={pipelineSearch}
                  onChange={(e) => setPipelineSearch(e.target.value)}
                />
              </div>

              {/* Cost Center / Workshop Filter */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">الورشة / القسم الفعلي:</span>
                <select
                  value={pipelineCostCenterFilter}
                  onChange={(e) => setPipelineCostCenterFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="الكل">كل الورش والمراكز</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Production Analytics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'بانتظار التعميد', count: productionRooms.filter(r => r.status === 'بانتظار التعميد').length, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' },
              { label: 'في قسم النجارة', count: productionRooms.filter(r => r.status === 'نجارة').length, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
              { label: 'في كابينة الدهان', count: productionRooms.filter(r => r.status === 'دهان').length, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
              { label: 'في قسم التنجيد', count: productionRooms.filter(r => r.status === 'تنجيد').length, bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
              { label: 'في التجميع والتعبئة', count: productionRooms.filter(r => r.status === 'تجميع وتعبئة').length, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
              { label: 'جاهز للتسليم', count: productionRooms.filter(r => r.status === 'جاهز للتسليم').length, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
            ].map((stat, i) => (
              <div key={i} className={`${stat.bg} ${stat.border} border rounded-xl p-3 text-center shadow-xs`}>
                <span className="text-[10px] font-black text-slate-500 block">{stat.label}</span>
                <span className={`text-lg font-black block mt-0.5 ${stat.text}`}>{stat.count} غرف / بنود</span>
              </div>
            ))}
          </div>

          {/* Kanban Board of Stages */}
          <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 snap-x select-none">
            {[
              { id: 'بانتظار التعميد', name: 'بانتظار التعميد', icon: <Clock size={15} />, colorClass: 'border-slate-200 bg-slate-50/50 text-slate-700', cardHighlight: 'hover:border-slate-300' },
              { id: 'نجارة', name: 'قسم النجارة', icon: <Hammer size={15} />, colorClass: 'border-orange-200 bg-orange-50/30 text-orange-700', cardHighlight: 'hover:border-orange-300' },
              { id: 'دهان', name: 'قسم الدهان', icon: <Paintbrush size={15} />, colorClass: 'border-amber-200 bg-amber-50/30 text-amber-700', cardHighlight: 'hover:border-amber-300' },
              { id: 'تنجيد', name: 'قسم التنجيد', icon: <Sofa size={15} />, colorClass: 'border-indigo-200 bg-indigo-50/30 text-indigo-700', cardHighlight: 'hover:border-indigo-300' },
              { id: 'تجميع وتعبئة', name: 'التجميع والتعبئة', icon: <Layers size={15} />, colorClass: 'border-purple-200 bg-purple-50/30 text-purple-700', cardHighlight: 'hover:border-purple-300' },
              { id: 'جاهز للتسليم', name: 'جاهز للتسليم ✨', icon: <CheckCircle2 size={15} />, colorClass: 'border-emerald-200 bg-emerald-50/30 text-emerald-700', cardHighlight: 'hover:border-emerald-300' },
            ].map((stage) => {
              // Filter rooms for this specific stage
              const stageRooms = productionRooms.filter(r => {
                const matchesSearch = r.customerName.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
                                      r.orderNumber.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
                                      r.roomCode.toLowerCase().includes(pipelineSearch.toLowerCase());
                
                const matchesWorkshop = pipelineCostCenterFilter === 'الكل' || r.costCenterId === pipelineCostCenterFilter;
                
                return r.status === stage.id && matchesSearch && matchesWorkshop;
              });

              return (
                <div key={stage.id} className="flex-shrink-0 w-80 bg-slate-50/60 border border-slate-100 rounded-2xl p-4 flex flex-col snap-start min-h-[550px]">
                  {/* Stage Header */}
                  <div className={`flex items-center justify-between border rounded-xl p-2.5 mb-4 ${stage.colorClass}`}>
                    <div className="flex items-center gap-2">
                      {stage.icon}
                      <span className="text-xs font-black">{stage.name}</span>
                    </div>
                    <span className="bg-white/90 text-[10px] font-black px-2 py-0.5 rounded-md border shadow-xs">
                      {stageRooms.length}
                    </span>
                  </div>

                  {/* Stage Body - Items List */}
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-0.5" dir="rtl">
                    {stageRooms.length === 0 ? (
                      <div className="h-28 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] font-bold p-3 text-center">
                        لا توجد بنود حالياً في هذه المرحلة
                      </div>
                    ) : (
                      stageRooms.map((room) => {
                        const roomKey = `${room.orderId}-${room.roomIndex}`;
                        const isExpanded = expandedSpecs[roomKey] || false;

                        return (
                          <div 
                            key={roomKey} 
                            className={`bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs transition-all ${stage.cardHighlight} group relative`}
                          >
                            {/* Card Header: Client Name & Order */}
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                                {room.orderNumber}
                              </span>
                              {getRemainingDaysBadge(room.deliveryDate)}
                            </div>

                            {/* Client name */}
                            <h4 className="text-[10px] font-black text-slate-800 line-clamp-1">{room.customerName}</h4>

                            {/* Item name - Bold Display */}
                            <h3 className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5 border-t border-dashed border-slate-100 pt-1.5">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                              {room.roomCode}
                            </h3>

                            {/* Attachment thumbnail if available */}
                            {room.attachmentImage && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 h-20 w-full relative">
                                <img 
                                  src={room.attachmentImage} 
                                  alt="تصميم البند" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            {/* Dynamic Workshop/Cost Center Select dropdown directly inside card! */}
                            <div className="mt-3 bg-slate-50 p-2 rounded-lg border border-slate-200/50 space-y-1">
                              <div className="flex justify-between items-center text-[9px] font-black text-slate-500">
                                <span>الورشة المسؤولة:</span>
                                <span className="text-indigo-600">
                                  {costCenters.find(cc => cc.id === room.costCenterId)?.name || 'غير محدد ⚠️'}
                                </span>
                              </div>
                              <select
                                value={room.costCenterId || ''}
                                onChange={(e) => updateOrderCostCenter(room.orderId, e.target.value)}
                                className="w-full text-[9px] font-bold bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700"
                              >
                                <option value="">اختر ورشة عمل...</option>
                                {costCenters.map(cc => (
                                  <option key={cc.id} value={cc.id}>{cc.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Expandable Technical Specs Button */}
                            <button
                              onClick={() => setExpandedSpecs(prev => ({ ...prev, [roomKey]: !isExpanded }))}
                              className="w-full mt-2 text-[9px] font-black text-slate-500 bg-slate-100/50 hover:bg-slate-100 p-1.5 rounded-lg border border-slate-200/30 flex items-center justify-between"
                            >
                              <span>📋 المواصفات الفنية للبند</span>
                              <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Expanded Technical Specs Details */}
                            {isExpanded && (
                              <div className="mt-2 space-y-2 text-[9px] border-t border-dashed border-slate-100 pt-2 text-right font-bold text-slate-700">
                                {room.dimensionsAndStructure && (
                                  <div className="bg-red-50/30 p-1.5 rounded border border-red-100/50">
                                    <span className="text-red-700 font-black block">📐 المقاسات والتقسيم:</span>
                                    <p className="text-slate-700 whitespace-pre-line leading-relaxed mt-0.5">{room.dimensionsAndStructure}</p>
                                  </div>
                                )}
                                {room.paintSpecs && (
                                  <div className="bg-amber-50/30 p-1.5 rounded border border-amber-100/50">
                                    <span className="text-amber-700 font-black block">🎨 الدهانات والرش:</span>
                                    <p className="text-slate-700 whitespace-pre-line leading-relaxed mt-0.5">{room.paintSpecs}</p>
                                  </div>
                                )}
                                {room.upholsterySpecs && (
                                  <div className="bg-indigo-50/30 p-1.5 rounded border border-indigo-100/50">
                                    <span className="text-indigo-700 font-black block">🛋️ التنجيد والفرش:</span>
                                    <p className="text-slate-700 whitespace-pre-line leading-relaxed mt-0.5">{room.upholsterySpecs}</p>
                                  </div>
                                )}
                                {room.generalSpecs && (
                                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                                    <span className="text-slate-600 font-black block">📝 مواصفات عامة:</span>
                                    <p className="text-slate-700 whitespace-pre-line leading-relaxed mt-0.5">{room.generalSpecs}</p>
                                  </div>
                                )}
                                {room.notes && (
                                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                                    <span className="text-slate-500 font-black block">💬 ملاحظات أمر الشغل:</span>
                                    <p className="text-slate-700 whitespace-pre-line leading-relaxed mt-0.5">{room.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Interaction Action Row (Shifting stages + Printing workshop ticket) */}
                            <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                              {/* Revert button */}
                              <button
                                disabled={stage.id === 'بانتظار التعميد'}
                                onClick={() => {
                                  const stagesArray = ['بانتظار التعميد', 'نجارة', 'دهان', 'تنجيد', 'تجميع وتعبئة', 'جاهز للتسليم'];
                                  const currentIdx = stagesArray.indexOf(room.status);
                                  if (currentIdx > 0) {
                                    updateRoomStage(room.orderId, room.roomIndex, stagesArray[currentIdx - 1]);
                                  }
                                }}
                                className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${
                                  stage.id === 'بانتظار التعميد'
                                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                                title="إرجاع للمرحلة السابقة"
                              >
                                <ArrowRight size={13} />
                              </button>

                              {/* Print Department Ticket */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setPrintingRoom(room);
                                  setTimeout(() => {
                                    window.print();
                                  }, 250);
                                }}
                                className="flex-1 h-8 text-[10px] font-black border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                <Printer size={12} className="ml-1" /> كارت التشغيل 🖨
                              </Button>

                              {/* Advance button */}
                              <button
                                disabled={stage.id === 'جاهز للتسليم'}
                                onClick={() => {
                                  const stagesArray = ['بانتظار التعميد', 'نجارة', 'دهان', 'تنجيد', 'تجميع وتعبئة', 'جاهز للتسليم'];
                                  const currentIdx = stagesArray.indexOf(room.status);
                                  if (currentIdx < stagesArray.length - 1) {
                                    updateRoomStage(room.orderId, room.roomIndex, stagesArray[currentIdx + 1]);
                                  }
                                }}
                                className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${
                                  stage.id === 'جاهز للتسليم'
                                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                                title="تطوير للمرحلة القادمة"
                              >
                                <ArrowLeft size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Accounts and Ledger Sub-tab */}
      {activeSubTab === 'customer_accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customers List for Selection */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black text-slate-800">قائمة حسابات العملاء</CardTitle>
                  <CardDescription className="font-bold text-[11px] text-slate-500">اختر العميل لاستعراض حساب تفصيلي كامل لأمر الشغل</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => {
                    if (customers.length > 0) {
                      setPaymentForm(prev => ({ ...prev, customerId: customers[0].id }));
                      setShowPaymentModal(true);
                    } else {
                      alert('الرجاء إضافة عميل أولاً من قائمة العملاء');
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 h-8"
                >
                  <DollarSign size={13} className="ml-1" /> سداد عربون/دفعة
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Micro Search inside ledger */}
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث عن العميل..."
                    className="w-full pr-8 pl-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={(e) => {
                      const text = e.target.value.toLowerCase();
                      setSearchTerm(text);
                    }}
                  />
                </div>

                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                  {customerLedgers
                    .filter(ledger => ledger.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(ledger => {
                      const isActive = selectedLedgerCustomer?.id === ledger.customer.id;
                      return (
                        <div
                          key={ledger.customer.id}
                          onClick={() => setSelectedLedgerCustomer(ledger.customer)}
                          className={`p-3 rounded-xl border text-right cursor-pointer transition-all ${
                            isActive 
                              ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' 
                              : 'border-slate-100 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-black text-slate-800 text-xs">{ledger.customer.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{ledger.customer.phone}</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 text-center font-bold">
                            <div>
                              <span>إجمالي التعاقدات</span>
                              <span className="block text-slate-800 font-black mt-0.5">{ledger.totalOrdersValue?.toLocaleString() || 0} ج.م</span>
                            </div>
                            <div>
                              <span>العربون والمسدد</span>
                              <span className="block text-emerald-700 font-black mt-0.5">{ledger.totalPaid?.toLocaleString() || 0} ج.م</span>
                            </div>
                            <div>
                              <span>المتبقي لسه كام</span>
                              <span className={`block font-black mt-0.5 ${ledger.remainingAmount > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                {ledger.remainingAmount?.toLocaleString() || 0} ج.م
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ledger Detailed View */}
          <div className="lg:col-span-2 space-y-6">
            {selectedLedger ? (
              <div className="space-y-6">
                {/* Ledger metrics header */}
                <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-indigo-900 to-indigo-950 text-white">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="bg-indigo-800 text-indigo-200 text-[10px] font-black px-2.5 py-1 rounded-full">كشف حساب فني ومالي كامل 🧾</span>
                        <h3 className="text-lg font-black text-white mt-2">{selectedLedger.customer.name}</h3>
                        <p className="text-indigo-300 text-xs font-bold mt-1">رقم الهاتف: {selectedLedger.customer.phone} | العنوان: {selectedLedger.customer.address || 'غير مسجل'}</p>
                      </div>

                      <div className="flex gap-4">
                        <div className="bg-white/10 p-3 rounded-xl border border-white/5 text-center min-w-[100px]">
                          <span className="text-[10px] text-indigo-200 font-bold block">إجمالي القيمة</span>
                          <span className="text-sm font-black text-white block mt-1">{selectedLedger.totalOrdersValue?.toLocaleString() || 0}</span>
                        </div>
                        <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center min-w-[100px]">
                          <span className="text-[10px] text-emerald-300 font-bold block">المسدد (العربون)</span>
                          <span className="text-sm font-black text-emerald-400 block mt-1">{selectedLedger.totalPaid?.toLocaleString() || 0}</span>
                        </div>
                        <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-center min-w-[100px]">
                          <span className="text-[10px] text-rose-300 font-bold block">لسه كام (المتبقي)</span>
                          <span className="text-sm font-black text-rose-400 block mt-1">{selectedLedger.remainingAmount?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ledger Orders section */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <ClipboardList size={16} className="text-indigo-600" /> أوامر تشغيل العميل الحالي ({selectedLedger.orders.length})
                    </CardTitle>
                    <span className="text-xs font-bold text-slate-500">انقر للتحويل المباشر لمحاضر استلام أو سيارات الشحن</span>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-black">
                            <th className="p-3">رقم أمر الشغل</th>
                            <th className="p-3">تاريخ التعاقد / الاستلام</th>
                            <th className="p-3">الغرف المشمولة</th>
                            <th className="p-3">قيمة الأمر</th>
                            <th className="p-3">حالة التشغيل</th>
                            <th className="p-3 text-center">خيارات سريعة للتحويل والطباعة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedLedger.orders.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-slate-400 font-bold">لا توجد أوامر شغل مسجلة لهذا العميل.</td>
                            </tr>
                          ) : (
                            selectedLedger.orders.map(order => (
                              <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 font-bold text-slate-800">
                                <td className="p-3 font-mono font-black">{order.orderNumber}</td>
                                <td className="p-3">
                                  <span>تعاقد: {order.contractDate}</span>
                                  <span className="block text-[10px] text-slate-400">استلام: {order.deliveryDate || 'غير محدد'}</span>
                                </td>
                                <td className="p-3 max-w-[200px] truncate">
                                  {order.rooms && order.rooms.length > 0 
                                    ? order.rooms.map(r => r.roomCode).join(' + ') 
                                    : order.roomCode}
                                </td>
                                <td className="p-3 font-black text-indigo-700">{order.totalAmount?.toLocaleString() || 0} ج.م</td>
                                <td className="p-3">{getStatusBadge(order.status)}</td>
                                <td className="p-3 flex items-center justify-center gap-1.5">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setViewingOrder(order)}
                                    title="عرض وطباعة كارت التشغيل"
                                  >
                                    <Eye size={12} className="ml-1" /> كارت
                                  </Button>
                                  <button
                                    onClick={() => convertToDeliveryReceipt(order)}
                                    className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black hover:bg-indigo-100"
                                    title="تحويل لمحضر استلام"
                                  >
                                    محضر استلام 📄
                                  </button>
                                  <button
                                    onClick={() => convertToLoadingManifest(order)}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black hover:bg-emerald-100"
                                    title="تحويل لحمولة سيارة"
                                  >
                                    شحن 🚚
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Ledger Payments History section */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <CreditCard size={16} className="text-emerald-600" /> سجل مدفوعات العميل وعرابينه ({selectedLedger.payments.length})
                    </CardTitle>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setPaymentForm({
                          customerId: selectedLedger.customer.id,
                          amount: 0,
                          paymentMethod: 'نقدي',
                          safeId: safes[0]?.id || '',
                          notes: 'دفعة عربون / دفعة حساب أمر شغل',
                          date: new Date().toISOString().split('T')[0]
                        });
                        setShowPaymentModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 h-8"
                    >
                      <Plus size={13} className="ml-1" /> إضافة عربون جديد
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-black">
                            <th className="p-3">التاريخ</th>
                            <th className="p-3">المبلغ المستلم</th>
                            <th className="p-3">طريقة الدفع</th>
                            <th className="p-3">الملاحظات</th>
                            <th className="p-3 text-center">حذف الحركة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedLedger.payments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-6 text-slate-400 font-bold">لم يسدد العميل أي دفعات أو عرابين حتى الآن.</td>
                            </tr>
                          ) : (
                            selectedLedger.payments.map(payment => (
                              <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50 font-bold text-slate-700">
                                <td className="p-3 font-mono">{payment.date}</td>
                                <td className="p-3 font-black text-emerald-600">{(payment.amount || 0).toLocaleString()} ج.م</td>
                                <td className="p-3">
                                  <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px]">
                                    {payment.paymentMethod}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-500">{payment.notes || '-'}</td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={async () => {
                                      if (confirm('هل أنت متأكد من حذف دفعة العميل المالية هذه؟')) {
                                        try {
                                          await deleteDoc(doc(db, 'customerPayments', payment.id));
                                          alert('تم حذف الدفعة وتحديث الرصيد بنجاح!');
                                        } catch (error) {
                                          console.error(error);
                                          alert('حدث خطأ أثناء محاولة حذف الدفعة المالية.');
                                        }
                                      }
                                    }}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center">
                <DollarSign size={48} className="text-slate-300 mb-4 animate-pulse" />
                <h4 className="font-black text-slate-800 text-sm">بانتظار اختيار عميل من القائمة الجانبية</h4>
                <p className="text-slate-500 font-bold text-xs mt-2">اختر عميل لعرض كشف حساب شامل وتتبع المبالغ لسه كام عليه ودفع كام عربون بالتاريخ.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Tab: WhatsApp Archive & Fast Grid Entry */}
      {/* ========================================== */}
      {activeSubTab === 'whatsapp_hub' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" dir="rtl">
          {/* WhatsApp uploads column (35%) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-emerald-50/50 pb-4 border-b border-emerald-100">
                <CardTitle className="text-sm font-black text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  🟢 وارد الواتساب والأوراق المؤرشفة
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1 font-bold">نزّل صور أوامر الشغل المستلمة على الجروب واسحبها هنا للتفريغ السريع</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Drag and Drop Zone */}
                <div className="border-2 border-dashed border-emerald-200 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-emerald-50/10 hover:bg-emerald-50/30 transition-all relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleWhatsAppDraftUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <ImageIcon size={32} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-xs font-black text-emerald-800">اسحب صور أوامر الشغل هنا أو تصفح الجهاز 📁</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">التنسيقات المدعومة: JPG, PNG, WEBP (حجم مثالي مضغوط)</p>
                </div>

                {/* Drafts List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-600 flex items-center gap-1">
                    <span>صندوق الوارد النشط</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-mono font-black">
                      {whatsappDrafts.length}
                    </span>
                  </h4>

                  {whatsappDrafts.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                      <ImageIcon size={24} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-[11px] text-slate-400 font-bold">لا توجد صور واردة حالياً. اسحب أول صورة لبدء العمل.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {whatsappDrafts.map(draft => (
                        <div key={draft.id} className="p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm flex gap-3 justify-between items-center hover:border-emerald-200 transition-all">
                          <img
                            src={draft.imageUrl}
                            alt="WhatsApp attachment"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-100 hover:scale-150 transition-transform duration-200 cursor-zoom-in"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-700 truncate">{draft.fileName || 'ملف مستند'}</p>
                            <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-black mt-1 ${
                              draft.status === 'جديد بانتظار التفريغ' 
                                ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                                : draft.status.includes('جاري')
                                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 animate-pulse'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {draft.status}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {draft.status === 'جديد بانتظار التفريغ' && (
                              <button
                                onClick={() => handleOpenSplitUnpacker(draft)}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-black transition-all"
                              >
                                تفريغ 📝
                              </button>
                            )}
                            <button
                              onClick={() => deleteWhatsAppDraft(draft.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] text-center"
                            >
                              حذف 🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Showroom Exhibition Selling Price Lookup Card */}
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-indigo-50/50 pb-3 border-b border-indigo-100/50">
                <CardTitle className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  🛋️ دليل أسعار الموديلات بالمعارض
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500 font-bold mt-1">
                  ابحث عن الموديل لمعرفة السعر الرسمي المعتمد لتفريغه بدقة
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-right" dir="rtl">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث بكود أو اسم الموديل (نوم، صالون)..."
                    value={recipeSearchTerm}
                    onChange={(e) => setRecipeSearchTerm(e.target.value)}
                    className="w-full pr-3 pl-8 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                </div>
                
                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                  {recipes.filter((r: any) => {
                    if (!recipeSearchTerm) return true;
                    return r.name?.toLowerCase().includes(recipeSearchTerm.toLowerCase()) ||
                           r.category?.toLowerCase().includes(recipeSearchTerm.toLowerCase());
                  }).slice(0, recipeSearchTerm ? 15 : 5).length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-[10px] font-bold">
                      لا توجد موديلات مسجلة أو مطابقة للبحث
                    </div>
                  ) : (
                    recipes.filter((r: any) => {
                      if (!recipeSearchTerm) return true;
                      return r.name?.toLowerCase().includes(recipeSearchTerm.toLowerCase()) ||
                             r.category?.toLowerCase().includes(recipeSearchTerm.toLowerCase());
                    }).slice(0, recipeSearchTerm ? 15 : 5).map((recipe: any) => (
                      <div key={recipe.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between hover:bg-slate-100 transition-colors">
                        <div className="text-right">
                          <p className="text-[11px] font-black text-slate-800">{recipe.name}</p>
                          <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">{recipe.category || 'أخرى'}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-black text-indigo-700">{(recipe.sellingPrice || 0).toLocaleString()} ج.م</p>
                          <span className="text-[9px] text-slate-400 font-bold">السعر الرسمي بالمعرض</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Excel spreadsheet grid (65%) */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-indigo-50/30 pb-4 border-b border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-sm font-black text-indigo-900 flex items-center gap-1.5">
                    <FileSpreadsheet size={16} />
                    الشيت السريع لإدخال الأوامر (تفريغ مجمع)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1 font-bold">
                    اكتب كافة الأوامر والبنود دفعة واحدة هنا كشيت إكسيل تفاعلي ثم احفظ بضغطة زر واحدة
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addExcelRow} variant="outline" size="sm" className="text-[11px] h-8">
                    إضافة سطر فارغ +
                  </Button>
                  <Button onClick={saveExcelSheet} variant="success" size="sm" className="text-[11px] h-8 bg-emerald-600 hover:bg-emerald-700">
                    💾 حفظ وتثبيت الشيت بالكامل
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {excelRows.length === 0 ? (
                  <div className="text-center py-16 bg-white flex flex-col justify-center items-center">
                    <FileSpreadsheet size={48} className="text-slate-300 mb-4 animate-bounce" />
                    <h4 className="font-black text-slate-800 text-sm">الشيت فارغ حالياً</h4>
                    <p className="text-slate-500 font-bold text-xs mt-2 max-w-sm">
                      قم بالنقر على "تفريغ 📝" بجانب صور الواتساب، أو انقر على "إضافة سطر فارغ" لإدخال أوامر الشغل يدوياً وبسرعة فائقة.
                    </p>
                    <Button onClick={addExcelRow} className="mt-4">
                      افتح سطر جديد بالشيت 📝
                    </Button>
                  </div>
                ) : (
                  <table className="w-full text-right border-collapse text-xs min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50/80 font-black text-slate-600 border-b border-slate-100">
                        <th className="p-3">رقم الأمر</th>
                        <th className="p-3 w-44">العميل</th>
                        <th className="p-3 w-36">الغرفة/البند</th>
                        <th className="p-3">مسؤول المبيعات</th>
                        <th className="p-3 w-48">مواصفات النجارة والدهان</th>
                        <th className="p-3">تاريخ التعاقد / التسليم</th>
                        <th className="p-3">المبلغ المالي</th>
                        <th className="p-3">مرفق</th>
                        <th className="p-3 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelRows.map(row => (
                        <tr key={row.tempId} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="p-2.5 font-mono">
                            <input
                              type="text"
                              value={row.orderNumber}
                              onChange={(e) => updateExcelRow(row.tempId, 'orderNumber', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold"
                            />
                          </td>
                          <td className="p-2.5">
                            <SearchableSelect
                              options={customerOptions}
                              selectedValue={row.customerId}
                              onChange={(id) => updateExcelRow(row.tempId, 'customerId', id)}
                              placeholder="اختر عميل..."
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              placeholder="غرفة نوم، صالون..."
                              value={row.roomCode}
                              onChange={(e) => updateExcelRow(row.tempId, 'roomCode', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              placeholder="اسم السيلز..."
                              value={row.salesPerson}
                              onChange={(e) => updateExcelRow(row.tempId, 'salesPerson', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold"
                            />
                          </td>
                          <td className="p-2.5 space-y-1">
                            <input
                              type="text"
                              placeholder="النجارة والمقاسات"
                              value={row.dimensionsAndStructure}
                              onChange={(e) => updateExcelRow(row.tempId, 'dimensionsAndStructure', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-[10px] font-bold"
                            />
                            <input
                              type="text"
                              placeholder="مواصفات الدهان والتنجيد"
                              value={row.paintSpecs}
                              onChange={(e) => updateExcelRow(row.tempId, 'paintSpecs', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-[10px] font-bold"
                            />
                          </td>
                          <td className="p-2.5 space-y-1">
                            <input
                              type="date"
                              value={row.contractDate}
                              onChange={(e) => updateExcelRow(row.tempId, 'contractDate', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-[10px] font-bold"
                            />
                            <input
                              type="date"
                              value={row.deliveryDate}
                              placeholder="تاريخ التسليم"
                              onChange={(e) => updateExcelRow(row.tempId, 'deliveryDate', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-[10px] font-bold"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={row.totalAmount}
                              onChange={(e) => updateExcelRow(row.tempId, 'totalAmount', e.target.value)}
                              className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-indigo-700"
                            />
                          </td>
                          <td className="p-2.5">
                            {row.attachmentImage ? (
                              <div className="relative group">
                                <img
                                  src={row.attachmentImage}
                                  alt="Attached"
                                  className="w-8 h-8 object-cover rounded-lg border border-slate-200"
                                />
                                <button
                                  onClick={() => updateExcelRow(row.tempId, 'attachmentImage', '')}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full text-[8px]"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] relative">
                                  رفع 📸
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleExcelRowImageUpload(row.tempId, e)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                </Button>
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => removeExcelRow(row.tempId)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Tab: Monthly Folders File System */}
      {/* ========================================== */}
      {activeSubTab === 'monthly_folders' && (
        <div className="space-y-6" dir="rtl">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-slate-50 pb-4 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <span>📂 نظام المجلدات الشهرية لتعاقدات العملاء</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 font-bold mt-1">
                تصفح الأرشيف حسب الشهور والسنوات. يتلخص كل شهر في عدد العملاء، أوامرهم، ومجموع مبيعاتهم، مع ميزة متابعة المنتجات التامة.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {Object.keys(monthlyFolders).length === 0 ? (
                <div className="text-center py-16 bg-white">
                  <ClipboardList size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-bold">لا توجد أوامر شغل حالياً لفرزها في مجلدات شهرية.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(monthlyFolders).map(([folderName, clientMap]) => {
                    const clientsCount = Object.keys(clientMap).length;
                    const totalFolderAmount = Object.values(clientMap).reduce((sum, item) => sum + item.totalAmount, 0);
                    const totalFolderOrders = Object.values(clientMap).reduce((sum, item) => sum + item.orders.length, 0);
                    
                    return (
                      <Card key={folderName} className="border border-slate-100 hover:shadow-lg transition-all overflow-hidden duration-300 bg-white">
                        <div className="p-5 bg-gradient-to-r from-sky-50 to-indigo-50/20 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">📂</span>
                            <div>
                              <h4 className="font-black text-slate-900 text-sm">{folderName}</h4>
                              <p className="text-[10px] text-indigo-600 font-black mt-0.5">{clientsCount} عميل متعاقد</p>
                            </div>
                          </div>
                          <span className="bg-white/80 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-black font-mono">
                            {totalFolderOrders} أمر شغل
                          </span>
                        </div>
                        
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                            <span>إجمالي المبيعات المؤرشفة:</span>
                            <span className="font-black text-indigo-700 text-sm">{totalFolderAmount.toLocaleString()} ج.م</span>
                          </div>

                          <div className="border-t border-slate-100 pt-3 space-y-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">العملاء وحالات الاستلام الفنية:</span>
                            
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                              {Object.entries(clientMap).map(([clientId, data]) => (
                                <div key={clientId} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-all border border-slate-100 text-xs">
                                  <div className="flex justify-between items-start gap-2 mb-1.5">
                                    <div>
                                      <span className="font-black text-slate-800 block">{data.customerName}</span>
                                      <span className="text-[9px] text-slate-400 font-bold block">{data.orders.length} أمر شغل | {data.customerPhone}</span>
                                    </div>
                                    {data.isFullyFinished ? (
                                      <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                                        منتج تام وواقف للتسليم 📦
                                      </span>
                                    ) : (
                                      <span className="bg-amber-50 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                                        قيد التشغيل بالورش 🔧
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] bg-white border border-slate-100 p-1.5 rounded-lg mt-2 font-bold text-slate-500">
                                    <span>مجموع المبيعات:</span>
                                    <span className="text-slate-800 font-black">{data.totalAmount.toLocaleString()} ج.م</span>
                                  </div>

                                  {/* Quick Combined Action buttons for fully completed customer in this folder */}
                                  <div className="flex gap-1.5 mt-2.5">
                                    <button
                                      onClick={() => generateCombinedCustomerReceipt(clientId, data.orders)}
                                      className="flex-1 py-1.5 px-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-[9px] font-black transition-all text-center border border-indigo-100"
                                    >
                                      محضر استلام مجمع 📄
                                    </button>
                                    <button
                                      onClick={() => {
                                        // Auto-load items of this customer to manifest wizard
                                        const roomKeys: string[] = [];
                                        data.orders.forEach(o => {
                                          if (o.rooms && o.rooms.length > 0) {
                                            o.rooms.forEach((r, idx) => {
                                              roomKeys.push(`${o.id}-${idx}`);
                                            });
                                          } else {
                                            roomKeys.push(`${o.id}-0`);
                                          }
                                        });
                                        setManifestForm(prev => ({
                                          ...prev,
                                          selectedRoomKeys: roomKeys
                                        }));
                                        setActiveSubTab('shipping_hub');
                                        setShowManifestAddModal(true);
                                      }}
                                      className="flex-1 py-1.5 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-[9px] font-black transition-all text-center border border-emerald-100"
                                    >
                                      إلى بيان حمولة 🚚
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================== */}
      {/* Tab: Shipping & Vehicle Loading Hub */}
      {/* ========================================== */}
      {activeSubTab === 'shipping_hub' && (
        <div className="space-y-6" dir="rtl">
          {/* Header Action Control */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="font-black text-slate-800 text-sm">🚚 تخطيط حركة الشحن وتحميل السيارات والسائقين</h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">اصنع بيان حمولة السيارة متضمناً قائمة الغرف والمنتجات الجاهزة والمسافر مع السائق للمحافظات أو المعارض.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowManifestAddModal(true)} className="bg-sky-600 hover:bg-sky-700 shadow-sky-50">
                <Plus size={16} className="ml-1.5" />
                تحميل سيارة شحن جديدة 🚚
              </Button>
            </div>
          </div>

          {/* Historical Manifests List */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-1">
                <span>📦 أرشيف بيانات حمولات السيارات المؤرشفة للمحافظات والمعارض</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {loadingManifests.length === 0 ? (
                <div className="text-center py-16 bg-white">
                  <Truck size={48} className="mx-auto text-slate-300 mb-4 animate-pulse" />
                  <h4 className="font-black text-slate-800 text-sm">لا توجد بيانات حمولة مسجلة</h4>
                  <p className="text-slate-500 font-bold text-xs mt-2">انقر على زر "تحميل سيارة شحن جديدة" لتوثيق حمولة السائقين وطباعتها فوراً.</p>
                </div>
              ) : (
                <table className="w-full text-right border-collapse text-xs min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 font-black text-slate-600 border-b border-slate-100">
                      <th className="p-3">تاريخ الحمولة</th>
                      <th className="p-3">اسم السائق</th>
                      <th className="p-3">رقم السيارة</th>
                      <th className="p-3">مسؤول التحميل</th>
                      <th className="p-3">ملاحظات خط السير</th>
                      <th className="p-3">عدد البنود المشحونة</th>
                      <th className="p-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingManifests.map(manifest => (
                      <tr key={manifest.id} className="border-b border-slate-50 hover:bg-slate-50/50 font-bold text-slate-700">
                        <td className="p-3 font-mono">{manifest.date}</td>
                        <td className="p-3 font-black text-slate-800">{manifest.driverName}</td>
                        <td className="p-3 font-mono">{manifest.carNumber}</td>
                        <td className="p-3">{manifest.loaderName || '-'}</td>
                        <td className="p-3 text-slate-500">{manifest.notes || '-'}</td>
                        <td className="p-3">
                          <span className="bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-sky-100">
                            {manifest.items?.length || 0} غرف وبنود
                          </span>
                        </td>
                        <td className="p-3 text-center flex gap-1.5 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[10px] font-black border-sky-200 text-sky-700 hover:bg-sky-50"
                            onClick={() => {
                              setSelectedManifestForPrint(manifest);
                              setTimeout(() => {
                                window.print();
                              }, 300);
                            }}
                          >
                            <Printer size={12} className="ml-1" />
                            طباعة 🖨️
                          </Button>
                          <button
                            onClick={async () => {
                              if (confirm('هل ترغب في حذف مستند الحمولة المؤرشف؟ (لن يؤثر على حالة الأوردرات)')) {
                                try {
                                  await deleteDoc(doc(db, 'loadingManifests', manifest.id));
                                  alert('تم الحذف بنجاح!');
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Historical Delivery Receipts List */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <span>🧾 أرشيف محاضر الاستلام المعتمدة (الفردية والمجمعة)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {deliveryReceipts.length === 0 ? (
                <div className="text-center py-12 bg-white">
                  <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                  <h4 className="font-black text-slate-800 text-sm">لا توجد محاضر استلام معتمدة بعد</h4>
                  <p className="text-slate-500 font-bold text-xs mt-2">محاضر الاستلام الفردية أو المجمعة التي تصدرها للعملاء ستظهر هنا لتتمكن من طباعتها في أي وقت.</p>
                </div>
              ) : (
                <table className="w-full text-right border-collapse text-xs min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 font-black text-slate-600 border-b border-slate-100 font-bold">
                      <th className="p-3">رقم المحضر</th>
                      <th className="p-3">تاريخ الاستلام</th>
                      <th className="p-3">اسم العميل</th>
                      <th className="p-3">أرقام أوامر الشغل المشمولة</th>
                      <th className="p-3 text-center">التقييم الفني</th>
                      <th className="p-3 text-center">عدد البنود</th>
                      <th className="p-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryReceipts.map(receipt => (
                      <tr key={receipt.id} className="border-b border-slate-50 hover:bg-slate-50/50 font-bold text-slate-700">
                        <td className="p-3 font-mono font-black text-indigo-700">{receipt.receiptNumber}</td>
                        <td className="p-3 font-mono">{receipt.date}</td>
                        <td className="p-3 font-black text-slate-800">{receipt.clientName}</td>
                        <td className="p-3 font-mono text-slate-500">{receipt.orderNumber}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                            ⭐ {receipt.productRating || 'ممتاز'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                            {receipt.products?.length || 1} بنود
                          </span>
                        </td>
                        <td className="p-3 text-center flex gap-1.5 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[10px] font-black border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            onClick={() => {
                              setSelectedReceiptForPrint(receipt);
                              setTimeout(() => {
                                window.print();
                              }, 300);
                            }}
                          >
                            <Printer size={12} className="ml-1" />
                            طباعة 🖨️
                          </Button>
                          <button
                            onClick={async () => {
                              if (confirm('هل ترغب في حذف محضر الاستلام المؤرشف هذا؟')) {
                                try {
                                  await deleteDoc(doc(db, 'deliveryReceipts', receipt.id));
                                  alert('تم الحذف بنجاح!');
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================== */}
      {/* Tab: Advanced Executive BI Analytics */}
      {/* ========================================== */}
      {activeSubTab === 'analytics_hub' && (
        <div className="space-y-6 animate-in fade-in-50 duration-300" dir="rtl">
          {/* Financial and Production KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-black uppercase opacity-80 tracking-wider block">القيمة الإجمالية للتعاقدات</span>
              <span className="text-2xl font-black block mt-2 font-mono">
                {workOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()} ج.م
              </span>
              <p className="text-[10px] opacity-80 mt-2 font-bold">بمعدل {workOrders.length} أمر تشغيل كامل بالسيستم</p>
              <DollarSign size={80} className="absolute -bottom-4 -left-4 opacity-10" />
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-black uppercase opacity-80 tracking-wider block">إجمالي المقبوضات والعرابين</span>
              <span className="text-2xl font-black block mt-2 font-mono">
                {customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()} ج.م
              </span>
              <p className="text-[10px] opacity-80 mt-2 font-bold">نسبة المقبوض: {Math.round((customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / (workOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 1)) * 100)}% من التعاقدات</p>
              <CheckCircle2 size={80} className="absolute -bottom-4 -left-4 opacity-10" />
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-black uppercase opacity-80 tracking-wider block">إجمالي المتبقي المستحق للتحصيل</span>
              <span className="text-2xl font-black block mt-2 font-mono">
                {(workOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) - customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0)).toLocaleString()} ج.م
              </span>
              <p className="text-[10px] opacity-80 mt-2 font-bold">مستحقات معلقة بانتظار تسليم المنتجات التامة</p>
              <AlertCircle size={80} className="absolute -bottom-4 -left-4 opacity-10" />
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-black uppercase opacity-80 tracking-wider block">نسبة الإنجاز الفني العام بالورش</span>
              <span className="text-2xl font-black block mt-2 font-mono">
                {productionRooms.length > 0 
                  ? Math.round((productionRooms.filter(r => r.status === 'جاهز للتسليم' || r.status === 'في المخزن تام التشطيب' || r.status === 'سلم للعميل').length / productionRooms.length) * 100)
                  : 0}%
              </span>
              <p className="text-[10px] opacity-80 mt-2 font-bold">بمعدل {productionRooms.filter(r => r.status === 'جاهز للتسليم' || r.status === 'سلم للعميل').length} بند تام من أصل {productionRooms.length}</p>
              <Layers size={80} className="absolute -bottom-4 -left-4 opacity-10" />
            </div>
          </div>

          {/* Visual Interactive Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Workshop Production Status (Bar Chart) */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider">توزيع أحمال الأخشاب والتنجيد والدهان بالورش الحالية</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-bold">عدد الغرف والبنود النشطة في كل ورشة (مركز تكلفة)</CardDescription>
              </CardHeader>
              <CardContent className="p-6 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'النجارة والقطع', العدد: productionRooms.filter(r => r.status === 'بانتظار التعميد' || r.status === 'نجارة').length },
                      { name: 'الدهان والرش', العدد: productionRooms.filter(r => r.status === 'دهان' || r.status === 'قيد الدهان').length },
                      { name: 'التنجيد والفرش', العدد: productionRooms.filter(r => r.status === 'تنجيد' || r.status === 'تنجيد وتفصيل').length },
                      { name: 'التجميع والتشطيب', العدد: productionRooms.filter(r => r.status === 'تجميع').length },
                      { name: 'المخزن تام التشطيب', العدد: productionRooms.filter(r => r.status === 'جاهز للتسليم' || r.status === 'في المخزن تام التشطيب').length }
                    ]}
                  >
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ fontFamily: 'sans-serif', fontSize: '12px' }} />
                    <Bar dataKey="العدد" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart 2: Sales representatives performance (Pie Chart) */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider">مبيعات مناديب المبيعات (السيلز) ومسؤولي العلاقات</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-bold">توزيع القيم المالية لأوامر الشغل حسب المندوب المسؤول</CardDescription>
              </CardHeader>
              <CardContent className="p-6 h-[260px] flex flex-col justify-between">
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const salesMap: { [key: string]: number } = {};
                          workOrders.forEach(o => {
                            const sales = o.salesPerson || 'غير مسند';
                            salesMap[sales] = (salesMap[sales] || 0) + (o.totalAmount || 0);
                          });
                          return Object.entries(salesMap).map(([name, value]) => ({ name, value }));
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map((color, idx) => (
                          <Cell key={`cell-${idx}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toLocaleString()} ج.م`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom list description */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-[10px] font-bold text-slate-600 pt-2">
                  {Object.entries(
                    workOrders.reduce((acc: { [key: string]: number }, o) => {
                      const sp = o.salesPerson || 'غير مسند';
                      acc[sp] = (acc[sp] || 0) + (o.totalAmount || 0);
                      return acc;
                    }, {})
                  ).map(([name, value], i) => (
                    <div key={name} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5] }}></span>
                      <span>{name}: {value.toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chart 3: Month over Month Billing Performance (Line Chart) */}
            <Card className="border-none shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider">نمو التعاقدات والأوردرات الشهرية (خط زمني للأرشيف)</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-bold">مجموع قيم أوامر الشغل والبنود المفتوحة عبر الشهور</CardDescription>
              </CardHeader>
              <CardContent className="p-6 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={(() => {
                      const monthTotals: { [key: string]: number } = {};
                      workOrders.forEach(o => {
                        let k = 'غير مصنف';
                        if (o.contractDate && o.contractDate.includes('-')) {
                          const parts = o.contractDate.split('-');
                          const monthNum = parts[1];
                          const yearNum = parts[0];
                          const monthAr = arabicMonthNames[monthNum] || monthNum;
                          k = `${monthAr} ${yearNum}`;
                        }
                        monthTotals[k] = (monthTotals[k] || 0) + (o.totalAmount || 0);
                      });
                      return Object.entries(monthTotals).map(([month, total]) => ({ month, total }));
                    })()}
                  >
                    <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip formatter={(value) => `${value.toLocaleString()} ج.م`} />
                    <Line type="monotone" dataKey="total" name="المبيعات والتعاقدات" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. Shipping Manifest Selection Modal */}
      {/* ========================================== */}
      {showManifestAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-none shadow-2xl">
            <CardHeader className="border-b border-slate-100 pb-4 sticky top-0 bg-white z-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-slate-800">تجهيز وتخطيط حمولة سيارة جديدة 🚚</CardTitle>
                <CardDescription className="text-xs text-slate-500 font-bold mt-0.5">اختر البنود التامة من المخزن واكتب تفاصيل السائق لإصدار بيان الحمولة المعتمد.</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setShowManifestAddModal(false)} className="text-slate-500 font-black text-xs">
                إغلاق ×
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Form inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">اسم سائق السيارة المندوب:</label>
                  <input
                    type="text"
                    required
                    value={manifestForm.driverName}
                    onChange={(e) => setManifestForm(prev => ({ ...prev, driverName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    placeholder="اكتب اسم السائق كاملاً"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">رقم لوحة السيارة ونوعها:</label>
                  <input
                    type="text"
                    required
                    value={manifestForm.carNumber}
                    onChange={(e) => setManifestForm(prev => ({ ...prev, carNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    placeholder="مثال: د ن ر 8569 / ربع نقل"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">اسم أمين المخزن / مسؤول التحميل:</label>
                  <input
                    type="text"
                    value={manifestForm.loaderName}
                    onChange={(e) => setManifestForm(prev => ({ ...prev, loaderName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    placeholder="أمين مستودع غرف الأثاث"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500">تاريخ الشحن الفعلي:</label>
                  <input
                    type="date"
                    value={manifestForm.date}
                    onChange={(e) => setManifestForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500">ملاحظات ووجهة الشحن (المعرض/محافظة العميل):</label>
                <input
                  type="text"
                  value={manifestForm.notes}
                  onChange={(e) => setManifestForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                  placeholder="مثال: شحنة محافظة المنيا - معرض الشرفاء الرئيسي"
                />
              </div>

              {/* Select items list */}
              <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50">
                <h4 className="text-xs font-black text-slate-700">📋 حدد البنود الجاهزة للتحميل (منتجات تامة في المخزن):</h4>
                
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {productionRooms.length === 0 ? (
                    <p className="text-[11px] text-slate-400 font-bold text-center py-4">لا توجد غرف أو بنود نشطة مسجلة حالياً بالخطوط.</p>
                  ) : (
                    productionRooms.map(room => {
                      const key = `${room.orderId}-${room.roomIndex}`;
                      const isSelected = manifestForm.selectedRoomKeys.includes(key);
                      return (
                        <div
                          key={key}
                          onClick={() => toggleRoomLoadingSelection(key)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs font-bold ${
                            isSelected 
                              ? 'bg-sky-50 border-sky-300 text-sky-950 shadow-sm' 
                              : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="accent-sky-600 w-4 h-4"
                            />
                            <div>
                              <span className="font-black block">{room.customerName} - {room.roomCode}</span>
                              <span className="text-[10px] text-slate-400 block font-bold font-mono">أمر شغل رقم: #{room.orderNumber} | الحالة بالورشة: {room.status}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setShowManifestAddModal(false)}>إلغاء</Button>
                <Button onClick={saveLoadingManifest} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  💾 حفظ بيان الحمولة وبدء الطباعة الفورية
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-5xl max-h-[92vh] overflow-y-auto border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-100 pb-4 sticky top-0 bg-white z-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-800">
                  {editingOrder ? 'تعديل وتحديث أمر التشغيل الفني' : 'إصدار أمر تشغيل وإنتاج جديد للعميل'}
                </CardTitle>
                <CardDescription className="font-bold text-xs mt-1 text-slate-500">قم بتوصيف المواصفات الفنية للورش بدقة كاملة</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setShowAddModal(false)} className="text-slate-500 font-black">
                إغلاق
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Header Info Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">العميل الحالي <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={customerOptions}
                    selectedValue={formData.customerId}
                    onChange={(id) => {
                      const c = customers.find(x => x.id === id);
                      setFormData({...formData, customerId: id, customerName: c ? c.name : ''});
                    }}
                    placeholder="اختر العميل..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">رقم أمر الشغل الفني <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    value={formData.orderNumber}
                    onChange={e => setFormData({...formData, orderNumber: e.target.value})}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
                    placeholder="رقم تلقائي"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">مسؤول المبيعات / السيلز:</label>
                  <input 
                    type="text"
                    value={formData.salesPerson || ''}
                    onChange={e => setFormData({...formData, salesPerson: e.target.value})}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    placeholder="اسم السيلز"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">مجموع قيمة التعاقد الإجمالية ج.م:</label>
                  <input 
                    type="number"
                    value={formData.totalAmount || 0}
                    onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    placeholder="إجمالي قيمة الغرف المتفق عليها"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">تاريخ التعاقد (تاريخ أمر الشغل):</label>
                  <input 
                    type="date"
                    value={formData.contractDate}
                    onChange={e => setFormData({...formData, contractDate: e.target.value})}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">تاريخ الاستلام النهائي المتوقع:</label>
                  <input 
                    type="date"
                    value={formData.deliveryDate}
                    onChange={e => setFormData({...formData, deliveryDate: e.target.value})}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Status and Cost Center Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Clock size={14} className="text-indigo-600" /> حالة التشغيل العامة للأمر
                  </label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="بانتظار التعميد">بانتظار التعميد (جديد)</option>
                    <option value="في أحد مراكز التكلفة">في أحد مراكز التكلفة (بالورشة)</option>
                    <option value="في المخزن تام التشطيب">في المخزن تام التشطيب (جاهز للتعبئة)</option>
                    <option value="تم إرساله للمعارض">تم إرساله للمعارض 🏛️</option>
                    <option value="سلم للعميل">سلم للعميل 🏠</option>
                    <option value="ملغى">ملغى ❌</option>
                  </select>
                </div>

                {formData.status === 'في أحد مراكز التكلفة' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-xs font-black text-slate-700">حدد الورشة / مركز التكلفة الحالي:</label>
                    <select
                      value={formData.costCenterId || ''}
                      onChange={(e) => setFormData({...formData, costCenterId: e.target.value})}
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- اختر الورشة المراد توجيه الأمر لها --</option>
                      {costCenters.map(cc => (
                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Attachment image of work order */}
              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-slate-500" /> إرفاق صورة مستند أمر الشغل (رسومات أو فاتورة)
                </label>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs font-bold text-slate-500"
                  />
                  {formData.attachmentImage && (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-100 shadow-sm max-w-[200px]">
                      <img src={formData.attachmentImage} alt="Attachment" className="max-h-24 object-cover" />
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, attachmentImage: '' }))}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full text-xs shadow-md"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Multiple rooms / items */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <Layers size={16} className="text-indigo-600" /> بنود الغرف والمقاسات التفصيلية للعميل ({formData.rooms?.length || 0})
                  </h4>
                  <Button variant="outline" size="sm" onClick={addRoomField} className="text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100">
                    <Plus size={12} className="ml-1" /> إضافة غرفة / بند جديد لطلب العميل 🛋️
                  </Button>
                </div>

                <div className="space-y-6">
                  {formData.rooms?.map((room, idx) => (
                    <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4 relative">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">الغرفة / البند #{idx + 1}</span>
                        {formData.rooms!.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-full" onClick={() => removeRoomField(idx)}>
                            <X size={14} />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500">كود الغرفة / اسم الموديل:</label>
                          <input 
                            type="text"
                            value={room.roomCode}
                            onChange={(e) => updateRoomField(idx, 'roomCode', e.target.value)}
                            placeholder="مثال: غرفة نوم ماستر مخصوص"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500">حالة إنتاج الغرفة بالقسم:</label>
                          <select
                            value={room.status || 'بانتظار التعميد'}
                            onChange={(e) => updateRoomField(idx, 'status', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                          >
                            <option value="بانتظار التعميد">بانتظار التعميد</option>
                            <option value="نجارة">نجارة (ورشة النجارة)</option>
                            <option value="دهان">دهان (كابينة الرش)</option>
                            <option value="تنجيد">تنجيد (قسم التنجيد)</option>
                            <option value="تجميع وتعبئة">تجميع وتعبئة</option>
                            <option value="جاهز للتسليم">جاهز للتسليم</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500">المواصفات العامة للغرفة:</label>
                          <textarea 
                            value={room.generalSpecs}
                            onChange={(e) => updateRoomField(idx, 'generalSpecs', e.target.value)}
                            placeholder="سرير مقاس 160 + دولاب درفة جرار + كومودينو..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 min-h-[60px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500">الهيكل الخشبي والمقاسات بالكامل (نجارة):</label>
                          <textarea 
                            value={room.dimensionsAndStructure}
                            onChange={(e) => updateRoomField(idx, 'dimensionsAndStructure', e.target.value)}
                            placeholder="السرير خشب زان بالكامل... المقاسات 160*200 سم..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-red-600 min-h-[60px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500">الدهان والتشطيب المطلوبة:</label>
                          <textarea 
                            value={room.paintSpecs}
                            onChange={(e) => updateRoomField(idx, 'paintSpecs', e.target.value)}
                            placeholder="أوف وايت مطفي بالكامل مع قشور طبيعية..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 min-h-[60px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500">التنجيد ونوع الأقمشة المستخدمة:</label>
                          <textarea 
                            value={room.upholsterySpecs}
                            onChange={(e) => updateRoomField(idx, 'upholsterySpecs', e.target.value)}
                            placeholder="قماش هامر قطيفة تركي كود 4022..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 min-h-[60px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Order Notes */}
              <div className="space-y-1.5 pt-4 border-t border-slate-100">
                <label className="text-xs font-black text-slate-700">ملاحظات إضافية على أمر الشغل بالكامل:</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 min-h-[60px]"
                  placeholder="ملاحظات التسليم والتغليف أو أي شروط خاصة..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setShowAddModal(false)} className="font-black text-slate-500">
                  إلغاء
                </Button>
                <Button onClick={handleSave} className="font-black px-8 bg-indigo-600 text-white">
                  حفظ وتخزين أمر التشغيل الفني 💾
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Payment / Downpayment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <DollarSign size={16} className="text-emerald-600" /> سداد عربون أو دفعة حساب أمر الشغل
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowPaymentModal(false)}>
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Select Customer */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">العميل المستلم منه العربون <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={customerOptions}
                  selectedValue={paymentForm.customerId}
                  onChange={(id) => {
                    setPaymentForm({ ...paymentForm, customerId: id });
                  }}
                  placeholder="اختر العميل..."
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">قيمة الدفعة / العربون المستلم ج.م <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  placeholder="المبلغ بالأرقام"
                />
              </div>

              {/* Safe selection */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">الخزنة المراد إيداع الدفعة بها <span className="text-red-500">*</span></label>
                <select
                  value={paymentForm.safeId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, safeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="">-- اختر الخزنة المستلمة --</option>
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (الرصيد الحالي: {s.balance?.toLocaleString()} ج.م)</option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">طريقة استلام الدفعة:</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="نقدي">نقدي (كاش)</option>
                  <option value="شيك">شيك بنكي</option>
                  <option value="تحويل بنكي">تحويل بنكي / محافظ إلكترونية</option>
                  <option value="فيزا">فيزا / شبكة</option>
                </select>
              </div>

              {/* Payment Date */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">تاريخ الدفع / القبض:</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              {/* Payment Notes */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">ملاحظات القبض:</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="مثال: عربون تعاقد بخصوص أمر شغل غرف النوم"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 min-h-[50px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setShowPaymentModal(false)}>إلغاء</Button>
                <Button variant="success" onClick={handleSavePayment}>تأكيد استلام وتغذية الخزنة 💵</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View & Print Document Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[92vh] overflow-y-auto border-none shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <div className="sticky top-0 bg-white z-10 border-b border-slate-100 p-4 flex justify-between items-center no-print">
              <Button variant="outline" onClick={() => window.print()} className="font-black text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100">
                <Printer size={18} className="ml-2" />
                طباعة أمر التشغيل للعميل 🖨️
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setViewingOrder(null)} className="text-slate-500 hover:bg-slate-100 rounded-full h-10 w-10">
                ×
              </Button>
            </div>

            {/* Printable Area matching the PDF layout with image renders */}
            <div id="print-area" className={`p-8 bg-white min-h-[800px] font-sans text-right ${viewingOrder ? "print-active" : "hidden print:hidden"}`} dir="rtl">
              {/* Document Header */}
              <div className="text-center border-b-2 border-black pb-4 mb-6 relative">
                <h1 className="text-4xl font-black text-black">أمر تشغـــــــــــــــــــــيل فني وإنتاجي</h1>
                <p className="text-xs text-slate-500 font-bold mt-1">Ref: {viewingOrder.orderNumber} | تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400 flex items-center justify-center rounded-lg font-serif text-3xl font-bold text-white shadow-lg">
                  A
                </div>
              </div>

              {/* Client & Date Info Block */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-base font-bold border-b border-black pb-4 mb-6 leading-loose">
                <div>
                  <span className="underline decoration-2 underline-offset-4">اسم العميل</span> : <span className="text-blue-700">{viewingOrder.customerName}</span>
                </div>
                <div>
                  <span className="underline decoration-2 underline-offset-4">تاريخ التعاقد</span> : <span className="text-blue-700">{viewingOrder.contractDate}</span>
                </div>
                <div>
                  <span className="underline decoration-2 underline-offset-4">تاريخ الاستلام</span> : <span className="text-blue-700">{viewingOrder.deliveryDate || '...................'}</span>
                </div>
                {viewingOrder.salesPerson && (
                  <div>
                    <span className="underline decoration-2 underline-offset-4">مسؤول المبيعات (السيلز)</span> : <span className="text-violet-700">{viewingOrder.salesPerson}</span>
                  </div>
                )}
                <div>
                  <span className="underline decoration-2 underline-offset-4">حالة الطلب الإجمالية</span> : <span className="text-emerald-700">{viewingOrder.status}</span>
                </div>
                <div>
                  <span className="underline decoration-2 underline-offset-4">مجموع القيمة</span> : <span className="text-indigo-700">{(viewingOrder.totalAmount || 0).toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Attachment Image Render if exists */}
              {viewingOrder.attachmentImage && (
                <div className="mb-6 p-4 border border-slate-200 rounded-2xl flex flex-col items-center">
                  <h4 className="text-sm font-black text-slate-700 mb-2 underline">مستند مرفق لأمر التشغيل (رسم أو كارت الشغل الأصلي)</h4>
                  <img 
                    src={viewingOrder.attachmentImage} 
                    alt="Work Order" 
                    className="max-h-96 object-contain rounded-xl border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Rooms & Specs Table / Render */}
              <div className="space-y-6">
                <h3 className="text-2xl font-black underline decoration-4 underline-offset-4 mb-4 inline-block">تفاصيل الغرف والبنود المتعددة المطلوبة:</h3>
                
                {viewingOrder.rooms && viewingOrder.rooms.length > 0 ? (
                  viewingOrder.rooms.map((room, index) => (
                    <div key={index} className="p-4 border-2 border-black rounded-xl mb-4 space-y-3 page-break-inside-avoid">
                      <div className="bg-slate-100 p-2 rounded-lg font-black text-lg border-b border-black">
                        البند #{index + 1}: {room.roomCode} | الحالة: {room.status}
                      </div>

                      {room.generalSpecs && (
                        <div>
                          <span className="font-black text-slate-800 underline block text-sm">المواصفات العامة:</span>
                          <p className="text-blue-700 font-bold text-base whitespace-pre-line leading-relaxed">{room.generalSpecs}</p>
                        </div>
                      )}

                      {room.dimensionsAndStructure && (
                        <div>
                          <span className="font-black text-slate-800 underline block text-sm">التفاصيل الفنية (النجارة والتقسيم الداخلي):</span>
                          <p className="text-red-600 font-bold text-base whitespace-pre-line leading-relaxed">{room.dimensionsAndStructure}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {room.paintSpecs && (
                          <div>
                            <span className="font-black text-slate-800 underline block text-sm">الدهانات والرش المطلوبة:</span>
                            <p className="text-slate-800 font-bold text-sm whitespace-pre-line leading-relaxed">{room.paintSpecs}</p>
                          </div>
                        )}
                        {room.upholsterySpecs && (
                          <div>
                            <span className="font-black text-slate-800 underline block text-sm">التنجيد والفرش والأقمشة:</span>
                            <p className="text-slate-800 font-bold text-sm whitespace-pre-line leading-relaxed">{room.upholsterySpecs}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-4">
                    {/* Fallback to legacy single specs if rooms empty */}
                    {viewingOrder.generalSpecs && (
                      <div className="p-4 border border-black rounded-xl">
                        <h4 className="font-black text-slate-800">المواصفات العامة:</h4>
                        <p className="text-blue-700 font-bold text-base whitespace-pre-line leading-relaxed">{viewingOrder.generalSpecs}</p>
                      </div>
                    )}
                    {viewingOrder.dimensionsAndStructure && (
                      <div className="p-4 border border-black rounded-xl">
                        <h4 className="font-black text-red-600">التفاصيل والمقاسات (نجارة):</h4>
                        <p className="text-red-600 font-bold text-base whitespace-pre-line leading-relaxed">{viewingOrder.dimensionsAndStructure}</p>
                      </div>
                    )}
                    {viewingOrder.paintSpecs && (
                      <div className="p-4 border border-black rounded-xl">
                        <h4 className="font-black text-slate-800">الدهان:</h4>
                        <p className="text-slate-800 font-bold text-sm whitespace-pre-line leading-relaxed">{viewingOrder.paintSpecs}</p>
                      </div>
                    )}
                    {viewingOrder.upholsterySpecs && (
                      <div className="p-4 border border-black rounded-xl">
                        <h4 className="font-black text-slate-800">التنجيد:</h4>
                        <p className="text-slate-800 font-bold text-sm whitespace-pre-line leading-relaxed">{viewingOrder.upholsterySpecs}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* General order notes */}
              {viewingOrder.notes && (
                <div className="mt-6 p-4 border border-dashed border-black rounded-xl">
                  <span className="font-black text-slate-800 block">شروط أو ملاحظات تسليم عامة:</span>
                  <p className="font-bold text-slate-700 whitespace-pre-line leading-relaxed">{viewingOrder.notes}</p>
                </div>
              )}

              {/* Footer Signatures */}
              <div className="mt-20 flex justify-between items-end text-lg font-black px-12">
                <div className="text-center">
                  <p className="mb-8">العميل</p>
                  <p className="text-slate-400">.......................</p>
                </div>
                <div className="text-center">
                  <p className="mb-8">يعتمد / مدير الإنتاج</p>
                  <p className="text-slate-400">.......................</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Complete print layout for all filtered work orders as a summary list/table */}
      <div id="print-list-area" className={`hidden print:block p-8 bg-white min-h-[800px] font-sans text-right ${(!viewingOrder && !printingRoom && !selectedManifestForPrint && !selectedReceiptForPrint) ? "print-active" : "hidden print:hidden"}`} dir="rtl">
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-black text-black">تقرير فرز وتتبع أوامر التشغيل والإنتاج</h1>
          <p className="text-xs text-slate-500 font-bold mt-1">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')} | عدد الأوامر: {filteredOrders.length}</p>
        </div>

        <table className="w-full text-right border-collapse text-xs border border-black">
          <thead>
            <tr className="bg-slate-100 text-black border-b border-black font-black">
              <th className="p-2 border border-black">رقم الأمر</th>
              <th className="p-2 border border-black">اسم العميل</th>
              <th className="p-2 border border-black">مسؤول المبيعات</th>
              <th className="p-2 border border-black">الغرف المشمولة</th>
              <th className="p-2 border border-black">تاريخ التعاقد</th>
              <th className="p-2 border border-black">تاريخ الاستلام</th>
              <th className="p-2 border border-black">القيمة</th>
              <th className="p-2 border border-black">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id} className="border-b border-black font-bold">
                <td className="p-2 border border-black font-mono font-black">{order.orderNumber}</td>
                <td className="p-2 border border-black">{order.customerName}</td>
                <td className="p-2 border border-black">{order.salesPerson || '-'}</td>
                <td className="p-2 border border-black">
                  {order.rooms && order.rooms.length > 0 
                    ? order.rooms.map(r => r.roomCode).join(' + ') 
                    : order.roomCode}
                </td>
                <td className="p-2 border border-black">{order.contractDate}</td>
                <td className="p-2 border border-black">{order.deliveryDate || 'غير محدد'}</td>
                <td className="p-2 border border-black">{(order.totalAmount || 0).toLocaleString()} ج.م</td>
                <td className="p-2 border border-black">{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total stats */}
        <div className="mt-6 flex justify-end gap-6 text-sm font-black">
          <div>
            <span>إجمالي قيمة الأوامر المفلترة:</span>
            <span className="underline block text-lg">{filteredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0).toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>

      {/* 3. Room Workshop Ticket Print */}
      {printingRoom && (
        <div id="print-room-card-area" className={`hidden print:block p-8 bg-white min-h-[800px] font-sans text-right ${printingRoom ? "print-active" : "hidden print:hidden"}`} dir="rtl">
          <div className="text-center border-b-4 border-black pb-4 mb-6">
            <h1 className="text-3xl font-black text-black">كارت تشغيل الورشة الفني 🏭</h1>
            <p className="text-sm text-slate-600 font-black mt-1">رقم أمر الشغل: {printingRoom.orderNumber} | العميل: {printingRoom.customerName}</p>
            <p className="text-xs text-slate-500 font-mono mt-1">تاريخ الاستلام المطلوب: {printingRoom.deliveryDate || 'غير محدد'}</p>
          </div>

          {/* Big Section for Room Code */}
          <div className="bg-slate-100 p-4 border-2 border-black rounded-xl mb-6 text-center">
            <span className="text-xs font-black text-slate-500 block uppercase tracking-wider">البند المطلوب تصنيعه</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">{printingRoom.roomCode}</span>
          </div>

          {/* Technical Specifications */}
          <div className="grid grid-cols-1 gap-6">
            {printingRoom.dimensionsAndStructure && (
              <div className="border-2 border-black p-4 rounded-xl bg-red-50/20">
                <h3 className="text-lg font-black text-red-700 border-b border-black pb-1 mb-2">📐 مقاسات الهيكل والنجارة والتقسيم الداخلي:</h3>
                <p className="text-red-700 font-bold text-base whitespace-pre-line leading-relaxed">{printingRoom.dimensionsAndStructure}</p>
              </div>
            )}

            {printingRoom.paintSpecs && (
              <div className="border-2 border-black p-4 rounded-xl bg-amber-50/20">
                <h3 className="text-lg font-black text-amber-700 border-b border-black pb-1 mb-2">🎨 مواصفات دهان ورش الأخشاب:</h3>
                <p className="text-slate-800 font-bold text-base whitespace-pre-line leading-relaxed">{printingRoom.paintSpecs}</p>
              </div>
            )}

            {printingRoom.upholsterySpecs && (
              <div className="border-2 border-black p-4 rounded-xl bg-indigo-50/20">
                <h3 className="text-lg font-black text-indigo-700 border-b border-black pb-1 mb-2">🛋️ تفاصيل التنجيد والأقمشة المطلوبة:</h3>
                <p className="text-slate-800 font-bold text-base whitespace-pre-line leading-relaxed">{printingRoom.upholsterySpecs}</p>
              </div>
            )}

            {printingRoom.generalSpecs && (
              <div className="border-2 border-black p-4 rounded-xl bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-700 border-b border-black pb-1 mb-2">📋 مواصفات عامة أخرى للبند:</h3>
                <p className="text-slate-700 font-bold text-base whitespace-pre-line leading-relaxed">{printingRoom.generalSpecs}</p>
              </div>
            )}
          </div>

          {/* Progress Checkboxes for craftsmen to sign */}
          <div className="mt-8 border-2 border-black rounded-xl overflow-hidden">
            <div className="bg-black text-white p-2.5 font-black text-center text-sm">
              تتبع مراحل الإنجاز والاعتماد بالورشة
            </div>
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 font-black border-b border-black">
                  <th className="p-3 border-l border-black">المرحلة</th>
                  <th className="p-3 border-l border-black">اسم الفني المسؤول</th>
                  <th className="p-3 border-l border-black">توقيع الفني</th>
                  <th className="p-3">اعتماد الجودة للخط</th>
                </tr>
              </thead>
              <tbody className="font-bold text-slate-800">
                <tr className="border-b border-black">
                  <td className="p-4 border-l border-black bg-orange-50/20 text-orange-700 font-black">1. النجارة والقطع</td>
                  <td className="p-4 border-l border-black">............................</td>
                  <td className="p-4 border-l border-black">...................</td>
                  <td className="p-4">▢ مقبول ▢ مرفوض</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-4 border-l border-black bg-amber-50/20 text-amber-700 font-black">2. الدهان والرش</td>
                  <td className="p-4 border-l border-black">............................</td>
                  <td className="p-4 border-l border-black">...................</td>
                  <td className="p-4">▢ مقبول ▢ مرفوض</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-4 border-l border-black bg-indigo-50/20 text-indigo-700 font-black">3. التنجيد والفرش</td>
                  <td className="p-4 border-l border-black">............................</td>
                  <td className="p-4 border-l border-black">...................</td>
                  <td className="p-4">▢ مقبول ▢ مرفوض</td>
                </tr>
                <tr>
                  <td className="p-4 border-l border-black bg-purple-50/20 text-purple-700 font-black">4. التجميع والتعبئة</td>
                  <td className="p-4 border-l border-black">............................</td>
                  <td className="p-4 border-l border-black">...................</td>
                  <td className="p-4">▢ مقبول ▢ مرفوض</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="mt-12 flex justify-between items-end text-sm font-black px-8">
            <div>
              <p className="mb-6">مسؤول قسم الجودة</p>
              <p className="text-slate-400">.......................</p>
            </div>
            <div>
              <p className="mb-6">مدير المصنع / المشرف</p>
              <p className="text-slate-400">.......................</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Shipping Vehicle Manifest Print Layout */}
      {selectedManifestForPrint && (
        <div id="print-manifest-area" className={`hidden print:block p-8 bg-white min-h-[800px] font-sans text-right ${selectedManifestForPrint ? "print-active" : "hidden print:hidden"}`} dir="rtl">
          <div className="text-center border-b-4 border-black pb-4 mb-6 relative">
            <h1 className="text-3xl font-black text-black">بيان حمولة سيارة شحن بضائع وموبيليا 🚚</h1>
            <p className="text-sm text-slate-600 font-black mt-1">Ref: {selectedManifestForPrint.id?.substring(0, 8) || 'N/A'} | تاريخ الشحن: {selectedManifestForPrint.date}</p>
            <p className="text-xs text-slate-500 font-bold mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
          </div>

          {/* Transport Info Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-black border border-black p-4 rounded-xl mb-6 bg-slate-50">
            <div>
              <span className="text-slate-500 block">اسم سائق السيارة المندوب:</span>
              <span className="text-slate-900 text-sm">{selectedManifestForPrint.driverName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">رقم لوحة السيارة ونوعها:</span>
              <span className="text-slate-900 text-sm font-mono">{selectedManifestForPrint.carNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block">المسؤول عن التحميل:</span>
              <span className="text-slate-900 text-sm">{selectedManifestForPrint.loaderName || 'أمين مستودع غرف الأثاث'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">خط السير / الوجهة:</span>
              <span className="text-slate-900 text-sm">{selectedManifestForPrint.notes || '-'}</span>
            </div>
          </div>

          <h3 className="text-sm font-black text-slate-800 mb-3 border-r-4 border-indigo-500 pr-2">📦 تفاصيل الأثاث والبنود المحملة بالسيارة:</h3>
          <table className="w-full text-right border-collapse text-xs border border-black mb-8">
            <thead>
              <tr className="bg-slate-100 font-black border-b border-black">
                <th className="p-2 border-l border-black">ت</th>
                <th className="p-2 border-l border-black">اسم العميل</th>
                <th className="p-2 border-l border-black">رقم أمر الشغل</th>
                <th className="p-2 border-l border-black">الغرفة / البند المطلوب</th>
                <th className="p-2">تفاصيل البند وملاحظات التحميل</th>
              </tr>
            </thead>
            <tbody className="font-bold text-slate-800">
              {selectedManifestForPrint.items?.map((item: any, index: number) => (
                <tr key={index} className="border-b border-black">
                  <td className="p-2 border-l border-black font-mono">{index + 1}</td>
                  <td className="p-2 border-l border-black font-black">{item.customerName}</td>
                  <td className="p-2 border-l border-black font-mono">{item.orderNumber}</td>
                  <td className="p-2 border-l border-black text-indigo-800">{item.roomCode}</td>
                  <td className="p-2">{item.specs || 'تام التشطيب بالمواصفات المعتمدة.'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Delivery terms */}
          <div className="border border-black p-3 rounded-xl bg-slate-50/50 text-[10px] font-bold leading-relaxed mb-12">
            <span className="font-black text-slate-800 block mb-1">✍️ تعهد وإقرار السائق المندوب:</span>
            <p className="text-slate-700">
              أقر أنا السائق المذكور أعلاه بأنني استلمت البنود والمشغولات الخشبية والموبيليا الموضحة في هذا البيان بحالة سليمة ومغلفة بالكامل وتامة التشطيب، وأتعهد بتسليمها كاملة لعنوان العميل أو المعرض وتسليم محضر استلام موقع من العميل وإلا أتحمل المسؤولية كاملة.
            </p>
          </div>

          {/* Signatures */}
          <div className="mt-12 flex justify-between items-end text-sm font-black px-8">
            <div>
              <p className="mb-6">توقيع السائق المستلم</p>
              <p className="text-slate-400">.......................</p>
            </div>
            <div>
              <p className="mb-6">أمين المستودع (التحميل)</p>
              <p className="text-slate-400">.......................</p>
            </div>
            <div>
              <p className="mb-6">مدير إدارة الشحن</p>
              <p className="text-slate-400">.......................</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Combined Customer Delivery Receipt Print Layout */}
      {selectedReceiptForPrint && (
        <div id="print-receipt-area" className={`hidden print:block p-8 bg-white min-h-[800px] font-sans text-right ${selectedReceiptForPrint ? "print-active" : "hidden print:hidden"}`} dir="rtl">
          <div className="text-center border-b-4 border-black pb-4 mb-6 relative">
            <h1 className="text-3xl font-black text-black">محضـــــــــــــــــــر تسليم واستلام موبيليا وأثاث ✨</h1>
            <p className="text-sm text-slate-600 font-black mt-1">Ref: {selectedReceiptForPrint.receiptNumber} | تاريخ الاستلام: {selectedReceiptForPrint.date}</p>
            <p className="text-xs text-slate-500 font-bold mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
          </div>

          {/* Receipt Info Block */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-black border border-black p-4 rounded-xl mb-6 bg-indigo-50/10">
            <div>
              <span className="text-slate-500 block">اسم العميل المستلم:</span>
              <span className="text-slate-900 text-sm font-black">{selectedReceiptForPrint.clientName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">أرقام أوامر الشغل المشمولة:</span>
              <span className="text-slate-900 text-sm font-mono">{selectedReceiptForPrint.orderNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block">مندوب مبيعات العميل (السيلز):</span>
              <span className="text-slate-900 text-sm">{selectedReceiptForPrint.salesPerson || 'إدارة المصنع'}</span>
            </div>
          </div>

          <h3 className="text-sm font-black text-slate-800 mb-3 border-r-4 border-emerald-500 pr-2">📋 كشف البنود والغرف المستلمة فعلياً:</h3>
          <table className="w-full text-right border-collapse text-xs border border-black mb-8">
            <thead>
              <tr className="bg-slate-100 font-black border-b border-black">
                <th className="p-2 border-l border-black">ت</th>
                <th className="p-2 border-l border-black">الغرفة / البند</th>
                <th className="p-2 border-l border-black">الكمية</th>
                <th className="p-2">مواصفات الفرز والنجارة والدهان المستلمة</th>
              </tr>
            </thead>
            <tbody className="font-bold text-slate-800">
              {selectedReceiptForPrint.products?.map((prod: any, idx: number) => (
                <tr key={idx} className="border-b border-black">
                  <td className="p-2 border-l border-black font-mono">{idx + 1}</td>
                  <td className="p-2 border-l border-black font-black text-slate-900">{prod.name}</td>
                  <td className="p-2 border-l border-black font-mono">{prod.quantity || 1}</td>
                  <td className="p-2">{prod.notes || 'تام التشطيب مطبق للمواصفات المتفق عليها.'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Customer Feedback Checkboxes */}
          <div className="border-2 border-black rounded-xl p-4 mb-10 space-y-4">
            <h4 className="text-xs font-black text-slate-800 border-b border-dashed border-black pb-2">📊 تقييم العميل الفني للجودة ومستوى الخدمة (اختياري):</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
              <div className="space-y-1">
                <span>1. تقييم جودة النجارة والدهان والتشطيب النهائي للأثاث:</span>
                <div className="flex gap-4 mt-1 font-black">
                  <span>▢ ممتاز</span>
                  <span>▢ جيد جداً</span>
                  <span>▢ مقبول</span>
                  <span>▢ ملاحظات فنية</span>
                </div>
              </div>
              <div className="space-y-1">
                <span>2. تقييم سلوك مندوبي الشحن وفنيي التركيب والتوصيل:</span>
                <div className="flex gap-4 mt-1 font-black">
                  <span>▢ ممتاز</span>
                  <span>▢ جيد جداً</span>
                  <span>▢ مقبول</span>
                  <span>▢ ملاحظات</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Note */}
          <div className="border border-black p-3 rounded-xl bg-slate-50 text-[10px] font-bold leading-relaxed mb-12">
            <span className="font-black text-slate-800 block mb-1">✍️ إقرار العميل بالاستلام الفعلي:</span>
            <p className="text-slate-700">
              أقر أنا الموقع أدناه بأنني استلمت الغرف والبنود والقطع الموضحة أعلاه تامة التشطيب والدهان والتنجيد وخالية تماماً من العيوب الفنية والظاهرة وتم تركيبها في منزلي على الوجه الأكمل وتعتبر ذمتي المالية والتعاقدية مشغولة بباقي مبالغ العقد المستحقة.
            </p>
          </div>

          {/* Signatures */}
          <div className="mt-12 flex justify-between items-end text-sm font-black px-8">
            <div>
              <p className="mb-6">توقيع العميل المستلم</p>
              <p className="text-slate-400">.......................</p>
            </div>
            <div>
              <p className="mb-6">فني التركيب / المندوب</p>
              <p className="text-slate-400">.......................</p>
            </div>
            <div>
              <p className="mb-6">اعتماد إدارة الجودة</p>
              <p className="text-slate-400">.......................</p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Dynamic Split Screen Unpacker & Data Extraction Console */}
      {/* ======================================================== */}
      {showSplitScreenModal && activeDraft && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  📝 منصة تفريغ أوراق وأوامر الشغل المؤرشفة (مقسمة الشاشة)
                </h3>
                <p className="text-[11px] text-slate-300 font-bold mt-1">
                  شاهد صورة الواتساب على اليسار، وانقل المواصفات الفنية والمالية على اليمين بدقة متناهية
                </p>
              </div>
              <button 
                onClick={() => setShowSplitScreenModal(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden h-[75vh]">
              {/* Right Panel: Form and Details (7/12) */}
              <div className="lg:col-span-7 p-6 overflow-y-auto space-y-5 border-l border-slate-100 text-right">
                {/* Optional AI Assistant Button */}
                <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-xl border border-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-black text-indigo-900">🪄 المساعد الذكي لقراءة الصور بالذكاء الاصطناعي</p>
                    <p className="text-[10px] text-slate-500 font-bold">يقوم بتحليل الصورة وتخمين البنود. يمكنك تفعيله أو تجاوزه وتعبئة البيانات يدوياً بمرونة.</p>
                  </div>
                  <button
                    type="button"
                    disabled={isAiParsingInProgress}
                    onClick={runAiAnalysisInModal}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {isAiParsingInProgress ? 'جاري التحليل فورا... ⏳' : 'تحليل الصورة بالذكاء الاصطناعي ✨'}
                  </button>
                </div>

                {aiParseStatusMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${aiParseStatusMessage.includes('⚠️') ? 'bg-amber-50 text-amber-800 border border-amber-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
                    {aiParseStatusMessage}
                  </div>
                )}

                {/* Form Sections */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-600 mb-1">رقم أمر الشغل:</label>
                    <input
                      type="text"
                      value={splitForm.orderNumber}
                      onChange={(e) => setSplitForm(prev => ({ ...prev, orderNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-600 mb-1">مسؤول المبيعات (السيلز):</label>
                    <input
                      type="text"
                      placeholder="اسم موظف المعرض"
                      value={splitForm.salesPerson}
                      onChange={(e) => setSplitForm(prev => ({ ...prev, salesPerson: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Customer Account selection with quick add inline */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-black text-slate-700">العميل المتعاقد:</label>
                    <span className="text-[10px] text-indigo-600 font-bold">مربوط فوراً بدفتر حسابات العملاء</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <SearchableSelect
                        options={customerOptions}
                        selectedValue={splitForm.customerId}
                        onChange={(id) => {
                          const name = customers.find(c => c.id === id)?.name || '';
                          setSplitForm(prev => ({ ...prev, customerId: id, customerName: name }));
                        }}
                        placeholder="اختر عميل..."
                      />
                      {!splitForm.customerId && (
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="أو اكتب اسم عميل جديد مباشرة هنا"
                            value={splitForm.customerName}
                            onChange={(e) => setSplitForm(prev => ({ ...prev, customerName: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Fast add button/form inside modal */}
                    <div className="border-r border-slate-200 pr-3 flex flex-col gap-1 text-right">
                      <span className="text-[9px] text-slate-400 font-bold block">إضافة عميل سريعاً لقائمة الحسابات:</span>
                      <input
                        type="text"
                        placeholder="الاسم"
                        value={quickCustomerName}
                        onChange={(e) => setQuickCustomerName(e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg text-[10px] font-bold"
                      />
                      <input
                        type="text"
                        placeholder="رقم الهاتف"
                        value={quickCustomerPhone}
                        onChange={(e) => setQuickCustomerPhone(e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg text-[10px] font-bold mt-1"
                      />
                      <button
                        type="button"
                        onClick={handleCreateQuickCustomer}
                        disabled={isCreatingQuickCustomer}
                        className="mt-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black text-center"
                      >
                        {isCreatingQuickCustomer ? 'جاري الحفظ...' : 'حفظ واختيار العميل ✅'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Model lookup & room description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-600 mb-1">اسم الغرفة / الموديل:</label>
                    <input
                      type="text"
                      placeholder="مثال: غرفة نوم رويال رئيسية"
                      value={splitForm.roomCode}
                      onChange={(e) => setSplitForm(prev => ({ ...prev, roomCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                    
                    {/* Quick selection from catalog */}
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="text-[9px] text-slate-400 font-bold ml-1">تعبئة سريعة من الكتالوج:</span>
                      {recipes.slice(0, 4).map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setSplitForm(prev => ({
                              ...prev,
                              roomCode: r.name,
                              totalAmount: r.sellingPrice || 0,
                              generalSpecs: `موديل رسمي معتمد: ${r.name}\nالفئة: ${r.category || 'أخرى'}\nأبعاد ومواصفات المصنع القياسية`
                            }));
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-indigo-100 transition-colors"
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-600 mb-1">مسؤولية المعرض (التكلفة المتفق عليها):</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block mb-0.5">القيمة التعاقدية الكاملة:</span>
                        <input
                          type="number"
                          value={splitForm.totalAmount || ''}
                          onChange={(e) => setSplitForm(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-black text-indigo-800"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block mb-0.5">العربون / المقدم المدفوع:</span>
                        <input
                          type="number"
                          value={splitForm.depositPaid || ''}
                          onChange={(e) => setSplitForm(prev => ({ ...prev, depositPaid: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-black text-emerald-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dates selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-600 mb-1">تاريخ التعاقد:</label>
                    <input
                      type="date"
                      value={splitForm.contractDate}
                      onChange={(e) => setSplitForm(prev => ({ ...prev, contractDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-600 mb-1">تاريخ الاستلام المستهدف:</label>
                    <input
                      type="date"
                      value={splitForm.deliveryDate}
                      onChange={(e) => setSplitForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Specs Specifications (Manual Copy) */}
                <div className="space-y-3">
                  <span className="block text-xs font-black text-slate-700 border-r-4 border-indigo-500 pr-2">📋 التفاصيل والمواصفات الفنية (انقلها من ورقة الواتساب المقابلة):</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-0.5">مواصفات النجارة والملل والسرير والدولاب:</label>
                      <textarea
                        rows={3}
                        placeholder="مثال: سرير مقاس 160 سم بالملل الزان، دولاب 3 ضلفة جرار..."
                        value={splitForm.generalSpecs}
                        onChange={(e) => setSplitForm(prev => ({ ...prev, generalSpecs: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-0.5">الأبعاد والهيكل الخارجي والإضافات:</label>
                      <textarea
                        rows={3}
                        placeholder="مقاس الباف والتسريحة والكومود بدقة..."
                        value={splitForm.dimensionsAndStructure}
                        onChange={(e) => setSplitForm(prev => ({ ...prev, dimensionsAndStructure: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-0.5">الدهانات والألوان والتشطيب النهائي:</label>
                      <textarea
                        rows={3}
                        placeholder="مثال: دهان دوكو أبيض مطعم بالذهبي، قشرة أرو طبيعي..."
                        value={splitForm.paintSpecs}
                        onChange={(e) => setSplitForm(prev => ({ ...prev, paintSpecs: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-0.5">التنجيد والأقمشة والملاحظات المتفق عليها:</label>
                      <textarea
                        rows={3}
                        placeholder="قماش قطيفة مستورد هامر رقم 45..."
                        value={splitForm.upholsterySpecs}
                        onChange={(e) => setSplitForm(prev => ({ ...prev, upholsterySpecs: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-0.5">ملاحظات عامة وملحوظات العميل الخاصة:</label>
                    <textarea
                      rows={2}
                      placeholder="أي ملحوظة تخص الاستلام أو فك وتوصيل القطع..."
                      value={splitForm.notes}
                      onChange={(e) => setSplitForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Left Panel: Image View & Tools (5/12) */}
              <div className="lg:col-span-5 bg-slate-900 flex flex-col justify-between overflow-hidden">
                {/* Image Toolbar */}
                <div className="bg-slate-950 p-3 flex justify-between items-center border-b border-slate-800 text-white">
                  <span className="text-[10px] font-bold text-slate-400">🔍 أدوات تصفح ورقة العمل الفنية</span>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-black transition-colors"
                      title="تصغير"
                    >
                      ➖
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(4, prev + 0.25))}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-black transition-colors"
                      title="تكبير"
                    >
                      ➕
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(prev => (prev + 90) % 360)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-black transition-colors"
                      title="تدوير 90 درجة"
                    >
                      🔄 تدوير
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomLevel(1);
                        setRotation(0);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold transition-colors"
                      title="إعادة تعيين الافتراضي"
                    >
                      إعادة تعيين
                    </button>
                  </div>
                </div>

                {/* Active Image Box */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-slate-950/70 max-h-[58vh]">
                  <div className="relative inline-block overflow-visible">
                    <img
                      src={activeDraft.imageUrl}
                      alt="WhatsApp original work order"
                      className="max-h-[500px] object-contain rounded-lg border border-slate-800 transition-all shadow-2xl"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s ease-in-out'
                      }}
                      draggable={false}
                    />
                  </div>
                </div>

                {/* Helper info banner */}
                <div className="bg-slate-950 p-3 border-t border-slate-800 text-center text-[10px] text-slate-400 font-bold">
                  💡 تلميح: يمكنك استخدام الفأرة للتمرير، أو أزرار التكبير والتدوير أعلاه لقراءة الملاحظات المكتوبة يدوياً بخط اليد بوضوح.
                </div>
              </div>
            </div>

            {/* Modal Footer / Save Buttons */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 font-bold">
                أوامر الشغل المستوردة يتم توجيهها لخطوط الإنتاج، مع تتبع حسابات العملاء بدقة في "دفتر الحسابات"
              </span>
              
              <div className="flex flex-wrap gap-2.5 justify-end w-full sm:w-auto">
                <Button 
                  onClick={() => setShowSplitScreenModal(false)}
                  variant="outline"
                  className="text-xs h-9"
                >
                  تراجع وإغلاق ❌
                </Button>
                
                <button
                  onClick={handleSaveFromSplitToExcel}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                >
                  إدراج في الشيت السريع للمراجعة المجمعة 📝
                </button>
                
                <button
                  onClick={handleSaveDirectToFirestore}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                >
                  🚀 حفظ فوري كأمر مـُعتمد (توجه للمصنع والمالية)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

