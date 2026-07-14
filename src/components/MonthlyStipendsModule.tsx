import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HeartHandshake, 
  Users, 
  TrendingUp, 
  Wallet, 
  Coins, 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Building2, 
  UserPlus, 
  Send, 
  Mail, 
  Phone, 
  Check, 
  X, 
  Info,
  ChevronDown,
  Printer,
  ChevronRight,
  Download,
  DollarSign,
  MoreHorizontal,
  Upload
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  writeBatch,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { Safe, SafeTransaction } from '../types';

interface Beneficiary {
  id?: string;
  name: string;
  category: 'تبع معتز' | 'تبع كريمة ابو العنين' | 'تبع وليد العدوي' | 'تبع اسماعيل نبهان' | 'تبع معاذ' | 'تبع محمد سليم' | 'حوالات رقمية' | 'أخرى';
  phone: string;
  monthlyAmount: number;
  paymentMethod: 'ظرف مالي' | 'انستا باي' | 'فودافون كاش' | 'نقدي باليد';
  paymentDetails: string; // Phone number for V-Cash, Address for InstaPay, etc.
  status: 'نشط' | 'موقوف';
  notes: string;
  createdAt?: any;
}

interface StipendPayment {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  category: string;
  phone: string;
  amount: number;
  paymentMethod: 'ظرف مالي' | 'انستا باي' | 'فودافون كاش' | 'نقدي باليد';
  paymentDetails: string;
  status: 'معلق' | 'تم التعبئة' | 'تم التحويل' | 'تم التسليم';
  transactionId?: string; // Reference number for InstaPay/Vodafone Cash
  paidAt?: string;
  paidFromSafeId?: string;
}

interface DisbursementRun {
  id?: string;
  monthYear: string; // e.g. "2026-07"
  status: 'مسودة' | 'مكتمل الجزئي' | 'مكتمل بالكامل';
  createdAt: any;
  createdBy: string;
  totalAmount: number;
  paidAmount: number;
  safeId: string; // Safe used for this run
  payments: StipendPayment[];
}

const ORIGINAL_ISMAIL_LIST = [
  { name: 'ام احمد زوجه محمود الصياد', phone: '01026716371', address: '', amount: 500 },
  { name: 'زوجه محمد المطري', phone: '01066689625', address: '', amount: 500 },
  { name: 'عطيات الكفافي', phone: '01066689625', address: '', amount: 500 },
  { name: 'احلام عبد الباسط عبد الحميد قراميط زوجه رضا الشرباصى', phone: '01022520106', address: '', amount: 500 },
  { name: 'مديحة برهام محمد السيد', phone: '01090670330', address: '', amount: 500 },
  { name: 'ابراهيم نزهه', phone: '01062960258', address: 'وسط البلد منزل القطب شمس الدين', amount: 500 },
  { name: 'السعيد محمد عثمان جبل', phone: '01025606151', address: 'ارض راشد بجوار قهوه السويسي', amount: 500 },
  { name: 'فوزيه نزهه', phone: '01028731458', address: 'وسط البلد بجوار جامع السالوس', amount: 500 },
  { name: 'ام عادل زينب وهبه', phone: '01019169421', address: 'اول البلد بجوار قهوه المرسي', amount: 500 },
  { name: 'سهى محمود عتمان', phone: '01032542103', address: '', amount: 500 },
  { name: 'سمر مجدى فوزى برغوث', phone: '', address: 'ش الثلاثينى بجوار اسعد ابو اسماعيل', amount: 500 },
  { name: 'هبة محروس مسلم ( زوجة الشحات عبد الله )', phone: '01010065296', address: '', amount: 500 },
  { name: 'ام رقية عبد الله محمد العراقى عبد الله', phone: '01023481605', address: '', amount: 500 },
  { name: 'نجوى محفوظ محمد حسن', phone: '01002676392', address: 'فودافون كاش', amount: 500 },
  { name: 'فاطمة نزهه', phone: '01093368931', address: 'فودافون كاش', amount: 500 },
  { name: 'رشا السعيد الشحات', phone: '', address: 'وسط البلد بجوار محل عصفور', amount: 500 },
  { name: 'اسماعيل فكرى عويس', phone: '01022721649', address: 'ش الشباروة', amount: 500 },
  { name: 'فوزيه زوجه صديق العادلي', phone: '', address: '', amount: 500 },
  { name: 'ام مريم نصار', phone: '01021837717', address: '', amount: 1000 },
  { name: 'مريم رضا حسن عبد السلام', phone: '01002778735', address: 'احمد بجوار جامع راشد', amount: 200 },
  { name: 'عفاف صابر السيد ابو العز', phone: '', address: 'تبع ا / اسماعيل نبهان', amount: 200 },
  { name: 'هدى احمد السعدنى', phone: '', address: 'الساحة امام ا / عبده ابو العز', amount: 200 },
  { name: 'عزة سالم', phone: '01024249201', address: 'الساحة بجوار حضانة السالوس', amount: 200 },
  { name: 'هالة حسن عبد الحميد رضوان', phone: '01060596294', address: 'الحدادين بجوار فرن الجوجرى', amount: 200 },
  { name: 'زوجة مجدى مصطفى اسماعيل', phone: '', address: 'ش الثلاثيني حارة السماعنة', amount: 200 },
  { name: 'اميرة محمود عبده ابو الوفا', phone: '01095764886', address: 'بجوار مسجد راشد', amount: 200 },
  { name: 'رحاب محمد محمد رفاعى', phone: '01006229114', address: 'بجوار جامع راشد قهوة السويسى', amount: 200 },
  { name: 'ايمن حامد جابر', phone: '01065832121', address: 'بجوار سنترال الغوانم - عمال مجلس المدينة م / عماد داوود (01066490720)', amount: 200 },
  { name: 'خميس حلمى زكى', phone: '010069190115', address: 'عند الجامع الكبير - عمال مجلس المدينة م / عماد داوود (01066490720)', amount: 200 },
  { name: 'شعبان السيد الطنطاوى', phone: '01001661437', address: 'المحطة الجديدة - عمال مجلس المدينة م / عماد داوود (01066490720)', amount: 200 },
  { name: 'رفعت سلامة السيد الركابية', phone: '010015211047', address: 'عمال مجلس المدينة م / عماد داوود (01066490720)', amount: 200 },
  { name: 'رضا عبد البديع الركابية', phone: '01065167950', address: 'عمال مجلس المدينة م / عماد داوود (01066490720)', amount: 200 },
  { name: 'عبد الحميد فتحى السالوس', phone: '01009436598', address: 'الحدادين - عمال معهد الازهرى م/ امل سليم (01090096228) او ا/ محمد فودة (01067257999)', amount: 200 },
  { name: 'عيد سليمان ام الرضا', phone: '01061248724', address: 'عمال معهد الازهرى م/ امل سليم (01090096228) او ا/ محمد فودة (01067257999)', amount: 200 },
  { name: 'هداية رزق عبد الباقى', phone: '01092897584', address: 'ش النقطة القديمة - عمال معهد الازهرى م/ امل سليم (01090096228) او ا/ محمد فودة (01067257999)', amount: 200 },
  { name: 'احمد فرحات', phone: '', address: 'قرية الاسماعيلية - عمال معهد الازهرى م/ امل سليم (01090096228) او ا/ محمد فودة (01067257999)', amount: 200 },
  { name: 'اولاد المرحوم صلاح الضبع', phone: '', address: 'ش الثلاثينى بجوار ا / السيد شرشيرة ش البوسطة', amount: 200 }
];

const ORIGINAL_DIGITAL_LIST = [
  { name: 'سمر جمعة', phone: '01022384723', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'ايمان مبروك ابراهيم اسماعيل كفر سعد التفتيش', phone: '01030526552', address: 'كفر سعد التفتيش', amount: 200, method: 'فودافون كاش' },
  { name: 'صلاح عبد الغفار فوزى عبد الغفار', phone: '01009320923', address: 'جمصة', amount: 200, method: 'فودافون كاش' },
  { name: 'صفاء صالح صبرى منصور', phone: '01010382676', address: 'منزل حاتم شهاب ش الثلاثينى', amount: 200, method: 'فودافون كاش' },
  { name: 'رشا يوسف ابراهيم الحلو', phone: '01026452567', address: 'عزبة ابو العز بجوار السد', amount: 200, method: 'فودافون كاش' },
  { name: 'هانم محمد محمد ابراهيم خليل', phone: '01065084521', address: 'طريق الغرب المشدل بعد المشروع الجديد', amount: 200, method: 'فودافون كاش' },
  { name: 'حنان رمضان الدسوقى مجاهد', phone: '01029761545', address: 'من الزرقا', amount: 200, method: 'فودافون كاش' },
  { name: 'صفاء النجار', phone: '01026026577', address: 'ش الشباروة مدخل مدرسة عاطف سليم', amount: 200, method: 'فودافون كاش' },
  { name: 'نورا محمد يونس حسن', phone: '01062071727', address: 'معرض سيارات رضا لاشين طريق الميناء', amount: 200, method: 'فودافون كاش' },
  { name: 'سماح محمد حطاب', phone: '01013560419', address: 'امام موقف عزبة البرج بجوار مسجد الحطاب', amount: 200, method: 'فودافون كاش' },
  { name: 'الشيخ عمرو بلال', phone: '01012103985', address: 'ش الثلاثينى', amount: 200, method: 'فودافون كاش' },
  { name: 'جيهان المتولى عبد الحليم', phone: '01024071744', address: 'من دمياط الجديدة', amount: 200, method: 'فودافون كاش' },
  { name: 'صابر محمد عاطف', phone: '01009170181', address: 'ترعة حلاوة اول عزبة الكسابية', amount: 200, method: 'فودافون كاش' },
  { name: 'احمد عادل مصطفى', phone: '01018243462', address: 'ش العنامة', amount: 200, method: 'فودافون كاش' },
  { name: 'سميرة مصطفى معوض اسماعيل', phone: '01006301459', address: 'المحطة القديمة', amount: 200, method: 'فودافون كاش' },
  { name: 'محمد بيومى لبيبيه عدلى احمد على', phone: '01027572722', address: 'جمصة', amount: 200, method: 'فودافون كاش' },
  { name: 'خالد حسن السيد محمد عوض', phone: '01099211373', address: 'جمصة ت الاب', amount: 200, method: 'فودافون كاش' },
  { name: 'عبد الرؤوف على محمد على', phone: '01025275210', address: 'جمصة البلد شرق بجوار نادى الشباب', amount: 200, method: 'فودافون كاش' },
  { name: 'محمد لطفى عبد الرؤوف احمد', phone: '01098244063', address: 'جمصة البلد غرب ش البحر', amount: 200, method: 'فودافون كاش' },
  { name: 'عزه السعيد مطر', phone: '01020139782', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'غادة عبد السلام سالم', phone: '01001941412', address: 'بوسط الكحيل', amount: 200, method: 'فودافون كاش' },
  { name: 'نجوى نعيم محمد الزنارى', phone: '01007135183', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'فاطمة السيد محمد هاشم الصياد', phone: '01019629408', address: '(طرف رضا الغرق)', amount: 200, method: 'فودافون كاش' },
  { name: 'مايسة مصطفى احمد مصطفى', phone: '01022294611', address: 'المجموعة مدخل المدارس', amount: 200, method: 'فودافون كاش' },
  { name: 'ام دنيا عزيز لطفى زكريا', phone: '01094382687', address: 'حمايل عامة نظافة', amount: 200, method: 'فودافون كاش' },
  { name: 'ناهد السيد اسماعيل اسماعيل', phone: '01017596256', address: '(طرف رضا الغرق)', amount: 200, method: 'فودافون كاش' },
  { name: 'امنية محمد محمود حسن', phone: '01023842321', address: 'ش ابو سليم منزل ام يحيى الرفاعى', amount: 200, method: 'فودافون كاش' },
  { name: 'ام شادى توفيق', phone: '01092045013', address: 'تبع ا/ اسماعيل نبهان', amount: 200, method: 'فودافون كاش' },
  { name: 'ام محمد عامة نظافة', phone: '01023187525', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'شيماء مجدى صابر بلح', phone: '01012304742', address: 'ش الشباروة مدخل 1/عيد وهبة', amount: 200, method: 'فودافون كاش' },
  { name: 'احمد ممدوح عيسى', phone: '01012919551', address: 'مؤذن جامع ابو عيسى', amount: 200, method: 'فودافون كاش' },
  { name: 'مريم رفعت هلال', phone: '01095760942', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'ام حاتم النادى', phone: '01096030960', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'ام عادل حمادة المغنى', phone: '01098225016', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'امل رياض احمد المغربى', phone: '01069519148', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'فتحيه ابراهيم', phone: '01016992421', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'ايمان حامد قته', phone: '01092053978', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'اولاد محمد ابو ناسو', phone: '01092928868', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'ام كنده الحبشى', phone: '01005282145', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'اماني حامد عبد الحنان', phone: '01067484194', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'اولاد حماده فاصل', phone: '01044568490', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'هانى محمد حامد عبده', phone: '01042956620', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'ام ملك سليمان', phone: '01099288078', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'عفو سعد صادق', phone: '01027880594', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'هاله الشحات عبد الوهاب رمضان', phone: '01012860051', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'نوران عماد بسيونى', phone: '01140675596', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'هانم محمد حامد عبده', phone: '01042956622', address: '', amount: 200, method: 'فودافون كاش' },
  { name: 'جمال الدين على السيد', phone: '01050670475', address: '(بشر بشير)', amount: 300, method: 'فودافون كاش' },
  { name: 'سالى محمد الهادى صالح', phone: '01064206430', address: '(بشر بشير)', amount: 300, method: 'فودافون كاش' },
  { name: 'صفاء موسى بهنسى خلف', phone: '01062173007', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام محمد السعيد محمد', phone: '01066250745', address: 'طريق الميناء الشوايحية', amount: 500, method: 'فودافون كاش' },
  { name: 'ام محمد رمضان طاهر على البوهى', phone: '01099142522', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'بشير الصياد', phone: '01097090999', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام عادل شلبى', phone: '01006401054', address: 'المحطة القديمة فرن ابو عبد الله', amount: 500, method: 'فودافون كاش' },
  { name: 'فريال عثمان كسبة', phone: '01090710232', address: 'ترعة حلاوة كوبرى العمدة', amount: 500, method: 'فودافون كاش' },
  { name: 'الشيخ محمد مسلم', phone: '01016162323', address: 'بجوار المقابر', amount: 500, method: 'فودافون كاش' },
  { name: 'زوجة ميمى السيد حنكة', phone: '01044665974', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام حنين', phone: '01030327751', address: 'يتبعها الى اسماعيل مسعد عبد الحميد الجوجرى بجوار الكباس', amount: 500, method: 'فودافون كاش' },
  { name: 'دنيا وفيق العدوى', phone: '01025704100', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'عمر شبيش', phone: '01002698126', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام محمد شحاتة', phone: '01095269967', address: 'مع د / اسماعيل الحفناوى', amount: 500, method: 'فودافون كاش' },
  { name: 'ام كريم محمد عطية غنيم', phone: '01025760509', address: 'الخارج الملقى', amount: 500, method: 'فودافون كاش' },
  { name: 'مريم محمد رضا', phone: '01065695983', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'نجلاء بتوصلها الى عادل ضبش', phone: '01099341558', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'رائد مجاهد', phone: '01094024448', address: 'بجوار المدرسة المشتركة', amount: 500, method: 'فودافون كاش' },
  { name: 'ام فؤاد', phone: '01091622089', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'امل ابو العز', phone: '01068064066', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام يوسف بحيره', phone: '01062740473', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'اخت مها صابر بدير', phone: '01092204953', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'احمد صديق العدوى', phone: '01097241054', address: 'النجارين', amount: 500, method: 'فودافون كاش' },
  { name: 'ام مازن مسلم', phone: '01008905900', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'نسمه الحراوى', phone: '01004084507', address: 'شارع الثلاثينى بجوار منزل اسعد ابو اسماعيل', amount: 500, method: 'فودافون كاش' },
  { name: 'منى مصطفى عبد الخالق الصياد', phone: '01023182462', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'رشا محمد على المياح', phone: '01022811602', address: 'من دمياط', amount: 500, method: 'فودافون كاش' },
  { name: 'انجى ابراهيم الشرايدى', phone: '01064881459', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'سهير متولى نصر لاشين', phone: '01090578524', address: 'عزبة الكحيل', amount: 500, method: 'فودافون كاش' },
  { name: 'اماني لاشين', phone: '01551759796', address: 'عزبة الكحيل - بجوار قهوه سامى المرفى', amount: 500, method: 'فودافون كاش' },
  { name: 'ام سلمى', phone: '01098502323', address: 'الساحة وسط البلد منزل الاستاذ زكريا وسط البلد', amount: 500, method: 'فودافون كاش' },
  { name: 'اسماء حسين العربى', phone: '01016611162', address: 'شارع مصنع راشد منزل اسماعيل عامر شارع الساحه', amount: 500, method: 'فودافون كاش' },
  { name: 'جمالات عبده الشرايدى', phone: '01063010327', address: 'منزل الحاج جمعه غانم (هرى الخياط)', amount: 500, method: 'فودافون كاش' },
  { name: 'ام محمد غنيم', phone: '01099221316', address: 'كبرى المدرسه منزل محمد عبد الفتاح غنيم', amount: 500, method: 'فودافون كاش' },
  { name: 'ام هشام عبده جبل (امى ايوب شرشيرة)', phone: '01062507955', address: 'كوبرى ابو المجد', amount: 500, method: 'فودافون كاش' },
  { name: 'زوجة ابراهيم الضخام', phone: '01026132582', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'عبير سعد الدين سليمان بلج (ام كريم)', phone: '01061309486', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'وفاء عبد العظيم حويت', phone: '01099621696', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'غالية محمود خليل ابراهيم', phone: '01062012942', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'حنان البلاطى', phone: '01094624371', address: 'بالضياعية', amount: 500, method: 'فودافون كاش' },
  { name: 'شيماء عبد الحميد حسن على', phone: '01007297275', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام فارس اسامة امبابى احمد امبابى', phone: '01023429953', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'امل عبد البديع عبد الله درويش', phone: '01005269829', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'انشراح رزق محمد (ام ايه)', phone: '01091210035', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام يوسف حسن يوسف رزق', phone: '01070848235', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'حنان محمد سليمان على سليمان', phone: '01098290996', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام حمدى حسين', phone: '01080549627', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'هبة ربيع صديق عبد النبى النادى', phone: '01098657113', address: 'من الزرقا حالة خاصة', amount: 500, method: 'فودافون كاش' },
  { name: 'ام على محمد محمد فتحى اللاوندي', phone: '01015742200', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام محمود مسعد نزهه', phone: '01014912408', address: 'شارع طلعة الحدادين', amount: 500, method: 'فودافون كاش' },
  { name: 'ربي الحبيشى (البنا)', phone: '01008178311', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'زوجة محمد الباروجى', phone: '01023181059', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'زوجة عماد محمد مصطفى جبل', phone: '01097674706', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'عنايات عبد النبى احمد الغرباوي', phone: '01062806821', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام اسلام ابراهيم جبل', phone: '01080815047', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'زوجة ابراهيم يوسف', phone: '01030103527', address: 'اخو محمد يوسف', amount: 500, method: 'فودافون كاش' },
  { name: 'سامية وفيق محمد اسماعيل', phone: '01099432885', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'اسراء داوود', phone: '01008010404', address: 'رقم والدها الكاش', amount: 500, method: 'فودافون كاش' },
  { name: 'امنية محمد عوض الضبع', phone: '01040130182', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'اسامه الكروى', phone: '01020308688', address: 'بجوار حلوانى الجوهرة - الحاج محمود بدر', amount: 500, method: 'فودافون كاش' },
  { name: 'احمد الشاذلى', phone: '01024455618', address: 'تبع وليد العدوى', amount: 500, method: 'فودافون كاش' },
  { name: 'رجب صادق داوود', phone: '01001255647', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'شريهان', phone: '01081154471', address: 'تبع الحاج', amount: 500, method: 'فودافون كاش' },
  { name: 'قرة ابو تمام', phone: '01001828185', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام سماح ممرضة فارسكور', phone: '01070481759', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'الحاجه عاليه ام اشرف بغداد', phone: '01021899920', address: 'بجوار فندق كازابلانكا', amount: 500, method: 'فودافون كاش' },
  { name: 'اماني فاضل', phone: '01019194444', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'رانيا جديد (السوالم)', phone: '015555181683', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'هيثم نصر الزمالك', phone: '01281542319', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ام همسه', phone: '01099782883', address: 'يتجهز بنتها عامله وزوجها مريض', amount: 500, method: 'فودافون كاش' },
  { name: 'ميرفت الحديدى', phone: '01008876446', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ناهد الجوجرى', phone: '01028615132', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ايمان سمير عيسى', phone: '01061216747', address: '', amount: 500, method: 'فودافون كاش' },
  { name: 'ماجدة عبد الرازق عبد السلام', phone: '01094625159', address: 'بنت خالتى /بنت ماجدة بنت خالتى ١/بنت ماجدة بنت خالتى ٢/ بنت ماجدة بنت خالتى ٣', amount: 800, method: 'فودافون كاش' },
  { name: 'محمد / فتحى الحمادى', phone: '', address: 'م معهد سهر/سمير بنتها', amount: 800, method: 'فودافون كاش' },
  { name: 'زوجة ضياء/مسعد /سعد/جمال خضر', phone: '01021545552', address: '', amount: 800, method: 'فودافون كاش' },
  { name: 'عماد/السيد/السعيد/حسن عبد الرازق', phone: '01015591955', address: '', amount: 800, method: 'فودافون كاش' },
  { name: 'آية / اسماء / بنت على وجيهه', phone: '01093032571', address: '', amount: 900, method: 'فودافون كاش' },
  { name: 'ام كريم 5%', phone: '01066250924', address: '', amount: 900, method: 'فودافون كاش' },
  { name: 'هدى', phone: '01096181002', address: 'تبع الحاج', amount: 1000, method: 'فودافون كاش' },
  { name: 'ام علاء العزيزى', phone: '01007923195', address: '', amount: 1000, method: 'فودافون كاش' },
  { name: 'اسرة خالد محمود رضوان', phone: '01004151969', address: '', amount: 1000, method: 'فودافون كاش' },
  { name: 'الشيخ محمد بكر القاهره', phone: '01001060805', address: '', amount: 1000, method: 'فودافون كاش' },
  { name: 'هبه عوض بنت خالى', phone: '01026320117', address: '', amount: 1000, method: 'فودافون كاش' },
  { name: 'الشيخ سعيد', phone: '01063049616', address: 'سهر بنت عمى عبد الباسط', amount: 1000, method: 'فودافون كاش' },
  { name: 'غاده احمد سالم', phone: '01069874757', address: '', amount: 1000, method: 'فودافون كاش' },
  { name: 'رضا حماقى', phone: '01154281377', address: '', amount: 1000, method: 'فودافون كاش' },
  { name: 'محمد احمد عزام', phone: '01008129604', address: '', amount: 1000, method: 'فودافون كاش' },
  { name: 'sاهر احمد يعقوب', phone: '01145287400', address: '', amount: 1000, method: 'فودافون كاش' },
  { name: 'خالد سيد عبد النعيم', phone: '01008298920', address: 'كاش', amount: 1000, method: 'فودافون كاش' },
  { name: 'نجلاء / سميرة بنت اختى ( ميت غمر )', phone: '01027926952', address: 'الرقم للتواصل فقط وليس الكاش', amount: 1000, method: 'فودافون كاش' },
  { name: 'منى مصطفى نزهه', phone: '01099680201', address: '', amount: 1000, method: 'فودافون كاش' },
  { name: 'عزيزة بنت اختى ليلى اختى كوثر ٢/احمد احمد / كوثر السنباطى', phone: '01066282887', address: '', amount: 1400, method: 'فودافون كاش' },
  { name: 'زوجة عبده الباروجى/عمى الحاجه افراج ام خالد/زوجة خالد العدوى/زوجة وحيد العدوى /زوجة سامى العدوى /زوجة عمار العدوى', phone: '01097656743', address: 'كاش', amount: 2100, method: 'فودافون كاش' },
  { name: 'الادارة الصحية تبع م/ مى الدياشطى مدير الادارة الصحية', phone: '01229857613', address: '( 33 موظف)', amount: 6600, method: 'فودافون كاش' },
  { name: 'الحاج /عاطف زجاج .. ساكن فى بيت الحج يوسف رخا', phone: '01022984663', address: '', amount: 500, method: 'انستا باي' },
  { name: 'احمد اخويا', phone: '01006340455', address: '', amount: 1500, method: 'انستا باي' }
];

export const MonthlyStipendsModule: React.FC = () => {
  const { profile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'beneficiaries' | 'runs'>('overview');
  
  // Data States
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [disbursementRuns, setDisbursementRuns] = useState<DisbursementRun[]>([]);
  const [safes, setSafes] = useState<Safe[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showAddBeneficiaryModal, setShowAddBeneficiaryModal] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState<Omit<Beneficiary, 'id'>>({
    name: '',
    category: 'تبع معتز',
    phone: '',
    monthlyAmount: 0,
    paymentMethod: 'ظرف مالي',
    paymentDetails: '',
    status: 'نشط',
    notes: ''
  });

  // Disbursement Run Creation State
  const [showCreateRunModal, setShowCreateRunModal] = useState(false);
  const [runMonth, setRunMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedSafeId, setSelectedSafeId] = useState('');

  // Active Run Detail view
  const [selectedRun, setSelectedRun] = useState<DisbursementRun | null>(null);

  // Karima Abu El-Anin Import State
  const [showImportKarimaPanel, setShowImportKarimaPanel] = useState(false);
  const [karimaList, setKarimaList] = useState([
    { name: 'فريال حسن المهدى خضر', phone: '01091442250', address: 'بجوار منزل العمدة القديم', amount: 200 },
    { name: 'سميرة السعيد سليمان الشرايدى', phone: '01063352020', address: 'بجوار منزل العمدة القديم', amount: 200 },
    { name: 'عزيزة السيد محمد ابو الغيط', phone: '01014920500', address: 'بجوار منزل العمدة القديم', amount: 200 },
    { name: 'كوثر عبده محمد على الصياد', phone: '01018094320 / 01068094320', address: 'الكحيل امام المدرسة المشتركة', amount: 200 },
    { name: 'صباح عاطف السيد البياع', phone: '01023696856', address: 'الكحيل', amount: 200 },
    { name: 'عثمان ابراهيم محمد عثمان', phone: '01021568589', address: 'خلف الجمعية الزراعية م فؤاد عسل', amount: 200 },
    { name: 'جيهان ابراهيم عبد الفتاح ابراهيم', phone: '01019904068', address: 'خلف الجمعية الزراعية م علاء عسل', amount: 200 },
    { name: 'عرفة محمد عرفة مسعود', phone: '', address: 'الكحيل تبع اكريمة ابو العنين', amount: 500 },
    { name: 'يوسف طارق لاشين', phone: '', address: 'الكحيل تبع اكريمة ابو العنين', amount: 500 },
    { name: 'جمال الشحات محمد جاد', phone: '01008707281 / 01008707385', address: 'بجوار فيلا العمدة سليمان زين الدين', amount: 200 },
    { name: 'مالية عبد الجوهرى', phone: '01091499625 / 0573666171', address: 'بجوار مسجد الكحيل السرايا', amount: 200 },
    { name: 'ناهد ابراهيم على الحضرى', phone: '01090171908 / 01027586235', address: 'الكحيل ماجرة بمنزل ايوب سيف', amount: 200 },
    { name: 'عزة توفيق محمد توفيق', phone: '01097504553', address: 'الكحيل بجوار بيت العمدة القديم', amount: 200 },
    { name: 'الهام بديع المتولى الجوهرى', phone: '01017304678', address: 'الكحيل', amount: 200 }
  ]);
  const [karimaImportSuccess, setKarimaImportSuccess] = useState(false);

  // Others Import State
  const [showImportOthersPanel, setShowImportOthersPanel] = useState(false);
  const [othersList, setOthersList] = useState([
    { name: 'عم بلال', phone: '', address: '', amount: 200 },
    { name: 'الحاجه سعاد محمد', phone: '', address: '', amount: 200 }
  ]);
  const [othersImportSuccess, setOthersImportSuccess] = useState(false);

  const handleUpdateKarimaItem = (index: number, field: string, value: any) => {
    setKarimaList(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveKarimaItem = (index: number) => {
    setKarimaList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleImportKarimaList = async () => {
    if (karimaList.length === 0) {
      setErrorMessage('لا توجد عناصر في القائمة للاستيراد.');
      return;
    }
    setActionLoading(true);
    try {
      // Delete all existing beneficiaries under 'تبع كريمة ابو العنين' to ensure synchronization and order
      const q = query(collection(db, 'beneficiaries'), where('category', '==', 'تبع كريمة ابو العنين'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'beneficiaries', docSnap.id)));
      await Promise.all(deletePromises);

      // Import all items from karimaList in order
      const batchPromises = karimaList.map((item) => {
        return addDoc(collection(db, 'beneficiaries'), {
          name: item.name,
          category: 'تبع كريمة ابو العنين',
          phone: item.phone,
          monthlyAmount: Number(item.amount),
          paymentMethod: 'ظرف مالي',
          paymentDetails: item.address,
          status: 'نشط',
          notes: 'مستورد من كشف صورة كريمة أبو العنين بالترتيب الاحترافي',
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(batchPromises);

      setSuccessMessage(`تم بنجاح حذف الكشف القديم واستيراد عدد ${karimaList.length} مستفيد تحت تصنيف "تبع كريمة ابو العنين" بالترتيب الصحيح.`);
      setKarimaImportSuccess(true);
      setShowImportKarimaPanel(false);
      setKarimaList([]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`حدث خطأ أثناء استيراد البيانات: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Moataz Abu Hanna Import State
  const [showImportMoatazPanel, setShowImportMoatazPanel] = useState(false);
  const [moatazList, setMoatazList] = useState([
    { name: 'مروة مجدي عبد الغني بنت اختي', phone: '', address: 'بنت اختي', amount: 200 },
    { name: 'مي مجدي عبد الغني بنت اختي', phone: '', address: 'بنت اختي', amount: 200 },
    { name: 'مدحت السيد حنة', phone: '', address: '', amount: 200 },
    { name: 'معتز السيد حنة', phone: '', address: '', amount: 200 },
    { name: 'مدحت السيد حنة', phone: '', address: '', amount: 200 },
    { name: 'السعيد السيد حنة', phone: '', address: '', amount: 200 },
    { name: 'مرات خالي حسن ابو حنة', phone: '', address: '', amount: 200 },
    { name: 'هدير بنت خالي حسن', phone: '', address: '', amount: 200 },
    { name: 'دعاء بنت خالي حسن', phone: '', address: '', amount: 200 },
    { name: 'محمد ابو نيشه ( كفر البطيخ )', phone: '01098142964', address: 'كفر البطيخ', amount: 200 },
    { name: 'اسامه كفر البطيخ', phone: '', address: 'كفر البطيخ', amount: 200 },
    { name: 'مرفت السيد حنه', phone: '', address: '', amount: 1000 },
    { name: 'الحاجه /ام محسن / زوج خالي / الحاج/ سيد', phone: '', address: 'زوج خالي / الحاج/ سيد', amount: 500 },
    { name: 'الاستاذه / منال (اختي الكبيره)', phone: '', address: 'اختي الكبيره', amount: 500 },
    { name: 'ام حمادة/ ماجدة السيد حنة', phone: '', address: '', amount: 500 },
    { name: 'مهاب السيد حنة', phone: '', address: '', amount: 500 },
    { name: 'محسن السيد حنة', phone: '', address: '', amount: 500 },
    { name: 'مها زوجة صابر بديراسمائيل شارع الثلاثيني', phone: '', address: 'شارع الثلاثيني', amount: 500 },
    { name: 'فوزي دعادير شارع الشهابه', phone: '', address: 'شارع الشهابه', amount: 500 },
    { name: 'عمي عبده غنيم ابو رشاد', phone: '01093385196', address: '', amount: 500 },
    { name: 'محسن البيومي شطا', phone: '', address: 'شطا', amount: 500 },
    { name: 'اولاد محمد الكفافي ( مستوره)', phone: '01092214082', address: '', amount: 500 }
  ]);
  const [moatazImportSuccess, setMoatazImportSuccess] = useState(false);

  const handleUpdateMoatazItem = (index: number, field: string, value: any) => {
    setMoatazList(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveMoatazItem = (index: number) => {
    setMoatazList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleImportMoatazList = async () => {
    if (moatazList.length === 0) {
      setErrorMessage('لا توجد عناصر في القائمة للاستيراد.');
      return;
    }
    setActionLoading(true);
    try {
      // Delete all existing beneficiaries under 'تبع معتز' to match the image exactly in order and values
      const q = query(collection(db, 'beneficiaries'), where('category', '==', 'تبع معتز'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'beneficiaries', docSnap.id)));
      await Promise.all(deletePromises);

      // Import all items from moatazList in order
      const batchPromises = moatazList.map((item) => {
        return addDoc(collection(db, 'beneficiaries'), {
          name: item.name,
          category: 'تبع معتز',
          phone: item.phone,
          monthlyAmount: Number(item.amount),
          paymentMethod: 'ظرف مالي',
          paymentDetails: item.address,
          status: 'نشط',
          notes: 'مستورد من كشف صورة معتز بالترتيب الصحيح وباحترافية شديدة',
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(batchPromises);

      setSuccessMessage(`تم بنجاح حذف الكشف القديم واستيراد عدد ${moatazList.length} مستفيد تحت تصنيف "تبع معتز" بالترتيب الصحيح وباحترافية شديدة.`);
      setMoatazImportSuccess(true);
      setShowImportMoatazPanel(false);
      setMoatazList([]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`حدث خطأ أثناء استيراد البيانات: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Waleed Al-Adawy Import State
  const [showImportWaleedPanel, setShowImportWaleedPanel] = useState(false);
  const [waleedList, setWaleedList] = useState([
    { name: 'زوجه / محمد وفيق العدوي ( اخي )', phone: '', address: 'اخي', amount: 200 },
    { name: 'زوجه / عمرو وفيق العدوي ( اخي )', phone: '', address: 'اخي', amount: 200 },
    { name: 'حسام وفيق العدوي ( اخي )', phone: '', address: 'اخي', amount: 200 },
    { name: 'ايمان بنت عمي رضا', phone: '', address: '', amount: 200 },
    { name: 'رياض العدوي ابو احمد', phone: '', address: '', amount: 200 },
    { name: 'علاء العدوي', phone: '', address: '', amount: 200 },
    { name: 'زوجة / طارق العدوي', phone: '', address: '', amount: 500 },
    { name: 'زوجة / معتز العدوي', phone: '', address: '', amount: 500 },
    { name: 'زوجة وفيق رخا بنت عمتي', phone: '', address: 'بنت عمتي', amount: 200 },
    { name: 'زوجة حسني رخا بنت عمتي', phone: '', address: 'بنت عمتي', amount: 200 },
    { name: 'بنت رياض عبد الباسط', phone: '', address: '', amount: 200 },
    { name: 'ليلى محمد رخا', phone: '', address: '', amount: 200 },
    { name: 'زوجة مصطفى الباروجي', phone: '', address: '', amount: 200 },
    { name: 'عمي رضا العدوي (ابو يحيي)', phone: '', address: 'ابو يحيى', amount: 500 },
    { name: 'زوجة عمي رضا العدوي', phone: '', address: '', amount: 500 },
    { name: 'الحاجه /ام وفيق رخا / عمتي / سوسن', phone: '', address: 'عمتي / سوسن', amount: 500 },
    { name: 'بديع عتمان', phone: '01018543922', address: '', amount: 500 },
    { name: 'مسعود الحنفي', phone: '', address: '', amount: 500 },
    { name: 'محمد الزملكاوى - علي كوبري ابو العز', phone: '01011499360', address: 'علي كوبري ابو العز', amount: 500 },
    { name: 'زوجه محمود الشهابي', phone: '', address: 'اول البلد بجوار حامد الشهابي', amount: 500 },
    { name: 'تامر مصطفى سلامة', phone: '01002360822', address: '', amount: 250 }
  ]);
  const [waleedImportSuccess, setWaleedImportSuccess] = useState(false);

  const handleUpdateWaleedItem = (index: number, field: string, value: any) => {
    setWaleedList(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveWaleedItem = (index: number) => {
    setWaleedList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleImportWaleedList = async () => {
    if (waleedList.length === 0) {
      setErrorMessage('لا توجد عناصر في القائمة للاستيراد.');
      return;
    }
    setActionLoading(true);
    try {
      // Delete all existing beneficiaries under 'تبع وليد العدوي'
      const q = query(collection(db, 'beneficiaries'), where('category', '==', 'تبع وليد العدوي'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'beneficiaries', docSnap.id)));
      await Promise.all(deletePromises);

      // Import all items from waleedList in order
      const batchPromises = waleedList.map((item) => {
        return addDoc(collection(db, 'beneficiaries'), {
          name: item.name,
          category: 'تبع وليد العدوي',
          phone: item.phone,
          monthlyAmount: Number(item.amount),
          paymentMethod: 'ظرف مالي',
          paymentDetails: item.address,
          status: 'نشط',
          notes: 'مستورد من كشف صورة وليد العدوي المحدّث وبترتيب الصورة',
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(batchPromises);

      setSuccessMessage(`تم بنجاح حذف الكشف القديم واستيراد عدد ${waleedList.length} مستفيد تحت تصنيف "تبع وليد العدوي" بالترتيب الصحيح.`);
      setWaleedImportSuccess(true);
      setShowImportWaleedPanel(false);
      setWaleedList([]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`حدث خطأ أثناء استيراد البيانات: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Ismail Nabhan Import State
  const [showImportIsmailPanel, setShowImportIsmailPanel] = useState(false);
  const [ismailList, setIsmailList] = useState([...ORIGINAL_ISMAIL_LIST]);
  const [ismailImportSuccess, setIsmailImportSuccess] = useState(false);

  const handleUpdateIsmailItem = (index: number, field: string, value: any) => {
    setIsmailList(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveIsmailItem = (index: number) => {
    setIsmailList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleImportIsmailList = async () => {
    if (ismailList.length === 0) {
      setErrorMessage('لا توجد عناصر في القائمة للاستيراد.');
      return;
    }
    setActionLoading(true);
    try {
      // Delete all existing beneficiaries under both spellings of 'تبع اسماعيل نبهان' to ensure synchronization
      const q1 = query(collection(db, 'beneficiaries'), where('category', '==', 'تبع اسماعيل نبهان'));
      const q2 = query(collection(db, 'beneficiaries'), where('category', '==', 'تبع إسماعيل نبهان'));
      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const deletePromises = [
        ...snapshot1.docs.map(docSnap => deleteDoc(doc(db, 'beneficiaries', docSnap.id))),
        ...snapshot2.docs.map(docSnap => deleteDoc(doc(db, 'beneficiaries', docSnap.id)))
      ];
      await Promise.all(deletePromises);

      // Import all items from ismailList in order
      const batchPromises = ismailList.map((item) => {
        return addDoc(collection(db, 'beneficiaries'), {
          name: item.name,
          category: 'تبع اسماعيل نبهان',
          phone: item.phone,
          monthlyAmount: Number(item.amount),
          paymentMethod: 'ظرف مالي',
          paymentDetails: item.address,
          status: 'نشط',
          notes: 'مستورد من كشف صورة اسماعيل نبهان المحدّث وبترتيب الصورة',
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(batchPromises);

      setSuccessMessage(`تم بنجاح حذف الكشف القديم واستيراد عدد ${ismailList.length} مستفيد تحت تصنيف "تبع اسماعيل نبهان" بالترتيب الصحيح.`);
      setIsmailImportSuccess(true);
      setShowImportIsmailPanel(false);
      setIsmailList([]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`حدث خطأ أثناء استيراد البيانات: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Mohamed Selim Import State
  const [showImportSelimPanel, setShowImportSelimPanel] = useState(false);
  const [selimList, setSelimList] = useState([
    { name: 'الجمعية الشرعية ا/ مجدي قراميط', phone: '', address: 'الجمعية الشرعية ا/ مجدي قراميط', amount: 10000 },
    { name: 'سمعان عامر', phone: '0100228755', address: 'بجوار مصنع راشد - بجوار محل التكاتك', amount: 500 },
    { name: 'ام عطيه', phone: '', address: 'شارع مجدى شطا', amount: 500 }
  ]);
  const [selimImportSuccess, setSelimImportSuccess] = useState(false);

  const handleUpdateSelimItem = (index: number, field: string, value: any) => {
    setSelimList(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveSelimItem = (index: number) => {
    setSelimList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleImportSelimList = async () => {
    if (selimList.length === 0) {
      setErrorMessage('لا توجد عناصر في القائمة للاستيراد.');
      return;
    }
    setActionLoading(true);
    try {
      const existingNames = new Set(beneficiaries.map(b => b.name.trim()));
      const importedNamesInThisBatch = new Set<string>();
      const itemsToImport = [];
      let skippedCount = 0;

      for (const item of selimList) {
        const nameTrimmed = item.name.trim();
        if (nameTrimmed !== 'مدحت السيد حنة' && (existingNames.has(nameTrimmed) || importedNamesInThisBatch.has(nameTrimmed))) {
          skippedCount++;
          continue;
        }
        importedNamesInThisBatch.add(nameTrimmed);
        itemsToImport.push(item);
      }

      if (itemsToImport.length === 0) {
        setSuccessMessage('جميع الأسماء في الكشف مسجلة بالفعل في النظام، تم تخطيها بالكامل.');
        setSelimImportSuccess(true);
        setShowImportSelimPanel(false);
        setSelimList([]);
        return;
      }

      const batchPromises = itemsToImport.map((item) => {
        return addDoc(collection(db, 'beneficiaries'), {
          name: item.name,
          category: 'تبع محمد سليم',
          phone: item.phone,
          monthlyAmount: Number(item.amount),
          paymentMethod: 'ظرف مالي',
          paymentDetails: item.address,
          status: 'نشط',
          notes: 'مستورد من كشف صورة محمد سليم',
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(batchPromises);
      let msg = `تم استيراد ${itemsToImport.length} مستفيد بنجاح تحت تصنيف "تبع محمد سليم".`;
      if (skippedCount > 0) {
        msg += ` (تم تخطي ${skippedCount} مكرر تلقائياً)`;
      }
      setSuccessMessage(msg);
      setSelimImportSuccess(true);
      setShowImportSelimPanel(false);
      setSelimList([]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('حدث خطأ أثناء استيراد البيانات.');
    } finally {
      setActionLoading(false);
    }
  };

  // Digital Transfers Import State
  const [showImportDigitalPanel, setShowImportDigitalPanel] = useState(false);
  const [digitalList, setDigitalList] = useState(ORIGINAL_DIGITAL_LIST.map(item => ({ ...item })));
  const [digitalImportSuccess, setDigitalImportSuccess] = useState(false);

  const handleUpdateDigitalItem = (index: number, field: string, value: any) => {
    setDigitalList(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveDigitalItem = (index: number) => {
    setDigitalList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleImportDigitalList = async () => {
    if (digitalList.length === 0) {
      setErrorMessage('لا توجد عناصر في القائمة للاستيراد.');
      return;
    }
    setActionLoading(true);
    try {
      // Delete all existing beneficiaries under 'حوالات رقمية'
      const q = query(collection(db, 'beneficiaries'), where('category', '==', 'حوالات رقمية'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'beneficiaries', docSnap.id)));
      await Promise.all(deletePromises);

      // Import all items from digitalList in order
      const batchPromises = digitalList.map((item) => {
        return addDoc(collection(db, 'beneficiaries'), {
          name: item.name,
          category: 'حوالات رقمية',
          phone: item.phone,
          monthlyAmount: Number(item.amount),
          paymentMethod: item.method === 'انستا باي' ? 'انستا باي' : 'فودافون كاش',
          paymentDetails: item.address || item.phone,
          status: 'نشط',
          notes: 'مستورد من كشف الحوالات الرقمية بالترتيب باحترافية شديدة',
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(batchPromises);

      setSuccessMessage(`تم بنجاح حذف الكشف القديم واستيراد عدد ${digitalList.length} مستفيد تحت تصنيف "حوالات رقمية" بالترتيب الصحيح وباحترافية شديدة.`);
      setDigitalImportSuccess(true);
      setShowImportDigitalPanel(false);
      setDigitalList([]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`حدث خطأ أثناء استيراد البيانات: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Moaz Import State
  const [showImportMoazPanel, setShowImportMoazPanel] = useState(false);
  const [moazList, setMoazList] = useState([
    { name: 'رشا ابراهيم محمد سالم سعيد', phone: '01092433992', address: 'تبع معاذ المحاسب', amount: 500 }
  ]);
  const [moazImportSuccess, setMoazImportSuccess] = useState(false);

  const handleUpdateMoazItem = (index: number, field: string, value: any) => {
    setMoazList(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveMoazItem = (index: number) => {
    setMoazList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleImportMoazList = async () => {
    if (moazList.length === 0) {
      setErrorMessage('لا توجد عناصر في القائمة للاستيراد.');
      return;
    }
    setActionLoading(true);
    try {
      // Delete all existing beneficiaries under 'تبع معاذ'
      const q = query(collection(db, 'beneficiaries'), where('category', '==', 'تبع معاذ'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'beneficiaries', docSnap.id)));
      await Promise.all(deletePromises);

      // Import all items from moazList in order
      const batchPromises = moazList.map((item) => {
        return addDoc(collection(db, 'beneficiaries'), {
          name: item.name,
          category: 'تبع معاذ',
          phone: item.phone,
          monthlyAmount: Number(item.amount),
          paymentMethod: 'ظرف مالي',
          paymentDetails: item.address,
          status: 'نشط',
          notes: 'مستورد من كشف صورة معاذ بالترتيب وباحترافية شديدة',
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(batchPromises);

      setSuccessMessage(`تم بنجاح حذف الكشف القديم واستيراد عدد ${moazList.length} مستفيد تحت تصنيف "تبع معاذ" بالترتيب الصحيح وباحترافية شديدة.`);
      setMoazImportSuccess(true);
      setShowImportMoazPanel(false);
      setMoazList([]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`حدث خطأ أثناء استيراد البيانات: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportOthersList = async () => {
    if (othersList.length === 0) {
      setErrorMessage('لا توجد عناصر في القائمة للاستيراد.');
      return;
    }
    setActionLoading(true);
    try {
      // Delete all existing beneficiaries under 'أخرى' to ensure synchronization
      const q = query(collection(db, 'beneficiaries'), where('category', '==', 'أخرى'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'beneficiaries', docSnap.id)));
      await Promise.all(deletePromises);

      // Import all items from othersList in order
      const batchPromises = othersList.map((item) => {
        return addDoc(collection(db, 'beneficiaries'), {
          name: item.name,
          category: 'أخرى',
          phone: item.phone,
          monthlyAmount: Number(item.amount),
          paymentMethod: 'ظرف مالي',
          paymentDetails: item.address,
          status: 'نشط',
          notes: 'مستورد من كشف المصنع - أخرى',
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(batchPromises);

      setSuccessMessage(`تم بنجاح حذف الكشف القديم واستيراد عدد ${othersList.length} مستفيد تحت تصنيف "أخرى" بالترتيب الصحيح.`);
      setOthersImportSuccess(true);
      setShowImportOthersPanel(false);
      setOthersList([]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`حدث خطأ أثناء استيراد البيانات: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateOthersItem = (index: number, field: string, value: any) => {
    setOthersList(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveOthersItem = (index: number) => {
    setOthersList(prev => prev.filter((_, idx) => idx !== index));
  };

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [methodFilter, setMethodFilter] = useState('الكل');
  const [runSearchTerm, setRunSearchTerm] = useState('');
  const [runStatusFilter, setRunStatusFilter] = useState('معلق'); // For payment filtering within active run

  // Advanced Filters
  const [statusFilter, setStatusFilter] = useState('الكل'); // 'الكل', 'نشط', 'موقوف'
  const [minAmount, setMinAmount] = useState<number | ''>('');
  const [maxAmount, setMaxAmount] = useState<number | ''>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState<string[]>([]);

  // Batch Actions
  const handleBatchStatusChange = async (newStatus: 'نشط' | 'موقوف') => {
    if (selectedBeneficiaryIds.length === 0) return;
    const confirmMsg = `هل أنت متأكد من تغيير حالة عدد ${selectedBeneficiaryIds.length} مستفيدين إلى "${newStatus}"؟`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const batch = writeBatch(db);
      selectedBeneficiaryIds.forEach(id => {
        batch.update(doc(db, 'beneficiaries', id), { status: newStatus });
      });
      await batch.commit();
      setSuccessMessage(`تم بنجاح تحديث حالة عدد ${selectedBeneficiaryIds.length} مستفيد إلى "${newStatus}".`);
      setSelectedBeneficiaryIds([]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`فشل التحديث المجمع: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedBeneficiaryIds.length === 0) return;
    const confirmMsg = `⚠️ تحذير نهائي:\n\nهل أنت متأكد من رغبتك في حذف عدد ${selectedBeneficiaryIds.length} مستفيدين نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء!`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const batch = writeBatch(db);
      selectedBeneficiaryIds.forEach(id => {
        batch.delete(doc(db, 'beneficiaries', id));
      });
      await batch.commit();
      setSuccessMessage(`تم بنجاح حذف عدد ${selectedBeneficiaryIds.length} مستفيد من النظام.`);
      setSelectedBeneficiaryIds([]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`فشل الحذف المجمع: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Print current beneficiaries list
  const handlePrintBeneficiariesList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const filtered = filteredBeneficiaries;
    const totalAmount = filtered.reduce((sum, b) => sum + b.monthlyAmount, 0);
    const avgAmount = filtered.length > 0 ? Math.round(totalAmount / filtered.length) : 0;

    let html = `
      <html dir="rtl">
        <head>
          <title>كشف مستفيدي الشهريات - نظام الإدارة المالي</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; background: #fff; }
            .header-container { border-bottom: 3px double #cbd5e1; padding-bottom: 15px; margin-bottom: 25px; text-align: center; }
            h2 { margin: 0 0 5px 0; font-weight: 900; font-size: 24px; color: #0f172a; }
            h4 { margin: 0; color: #475569; font-size: 14px; }
            .meta-info { display: flex; justify-content: space-between; margin-top: 15px; font-size: 12px; color: #64748b; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: right; font-size: 11px; }
            th { background-color: #f8fafc; font-weight: 800; color: #0f172a; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .amount { font-family: monospace; font-weight: 900; text-align: left; font-size: 12px; color: #0f172a; }
            .badge { padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; display: inline-block; }
            .badge-active { background-color: #dcfce7; color: #15803d; }
            .badge-suspended { background-color: #fee2e2; color: #b91c1c; }
            .summary-cards { display: grid; grid-template-cols: repeat(3, 1fr); gap: 15px; margin-top: 25px; }
            .card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; background: #f8fafc; }
            .card-title { font-size: 11px; color: #64748b; font-weight: bold; margin-bottom: 4px; }
            .card-value { font-size: 16px; font-weight: 900; color: #0f172a; }
            .signatures { display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; margin-top: 50px; text-align: center; font-size: 12px; }
            .sig-box { border-top: 1px dashed #94a3b8; padding-top: 10px; margin-top: 40px; font-weight: bold; color: #475569; }
            .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            @media print {
              body { padding: 0; }
              @page { size: A4 portrait; margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <h2>كشف مستفيدي الشهريات والمساعدات المنتظمة</h2>
            <h4>بوابة الإدارة المالية والضمان الاجتماعي الموحد</h4>
            <div class="meta-info">
              <span>التصنيف المفلتر: ${categoryFilter}</span>
              <span>طريقة الصرف: ${methodFilter}</span>
              <span>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 25%">اسم المستفيد</th>
                <th style="width: 15%">التصنيف</th>
                <th style="width: 15%">طريقة الصرف</th>
                <th style="width: 12%">المبلغ الشهري</th>
                <th style="width: 13%">رقم الهاتف</th>
                <th style="width: 15%">الحالة</th>
              </tr>
            </thead>
            <tbody>
    `;

    filtered.forEach((b, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${b.name}</strong><br/><span style="font-size: 9px; color: #64748b; font-weight: normal;">${b.notes || ''}</span></td>
          <td>${b.category}</td>
          <td>${b.paymentMethod} ${b.paymentDetails ? `(${b.paymentDetails})` : ''}</td>
          <td class="amount">${b.monthlyAmount.toLocaleString()} ج.م</td>
          <td>${b.phone || '-'}</td>
          <td>
            <span class="badge ${b.status === 'نشط' ? 'badge-active' : 'badge-suspended'}">
              ${b.status}
            </span>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>

          <div class="summary-cards">
            <div class="card">
              <div class="card-title">إجمالي عدد المستفيدين المدرجين</div>
              <div class="card-value">${filtered.length} مستفيد</div>
            </div>
            <div class="card">
              <div class="card-title">إجمالي المخصص المالي الشهري</div>
              <div class="card-value">${totalAmount.toLocaleString()} ج.م</div>
            </div>
            <div class="card">
              <div class="card-title">متوسط المخصص المالي للفرد</div>
              <div class="card-value">${avgAmount.toLocaleString()} ج.م</div>
            </div>
          </div>

          <div class="signatures">
            <div>
              <p>توقيع المحاسب المختص</p>
              <div class="sig-box">أ/ معاذ المحاسب</div>
            </div>
            <div>
              <p>توقيع المراجعة والرقابة</p>
              <div class="sig-box">أ/ إسماعيل نبهان</div>
            </div>
            <div>
              <p>اعتماد وتفويض الصرف</p>
              <div class="sig-box">المدير العام للمركز</div>
            </div>
          </div>

          <div class="footer">
            النظام المالي الإلكتروني المتكامل للمصنع - تم توليد وطباعة هذا التقرير آلياً - صفحة 1 من 1
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // Loading indicator for operations
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto Dismiss Alert
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // Load Safes
  useEffect(() => {
    const unsubSafes = onSnapshot(collection(db, 'safes'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Safe));
      setSafes(list);
      if (list.length > 0 && !selectedSafeId) {
        setSelectedSafeId(list[0].id);
      }
    });

    // Load Beneficiaries
    const unsubBeneficiaries = onSnapshot(collection(db, 'beneficiaries'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Beneficiary));
      setBeneficiaries(list);
    });

    // Load Disbursement Runs
    const unsubRuns = onSnapshot(collection(db, 'disbursement_runs'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DisbursementRun));
      // Sort by monthYear descending
      list.sort((a, b) => b.monthYear.localeCompare(a.monthYear));
      setDisbursementRuns(list);
      setLoading(false);
    });

    return () => {
      unsubSafes();
      unsubBeneficiaries();
      unsubRuns();
    };
  }, []);

  // Update selectedRun if disbursementRuns updates
  useEffect(() => {
    if (selectedRun) {
      const updated = disbursementRuns.find(r => r.id === selectedRun.id);
      if (updated) {
        setSelectedRun(updated);
      }
    }
  }, [disbursementRuns]);

  const handleOpenAddBeneficiary = () => {
    setEditingBeneficiary(null);
    setBeneficiaryForm({
      name: '',
      category: 'تبع معتز',
      phone: '',
      monthlyAmount: 0,
      paymentMethod: 'ظرف مالي',
      paymentDetails: '',
      status: 'نشط',
      notes: ''
    });
    setShowAddBeneficiaryModal(true);
  };

  const handleOpenEditBeneficiary = (b: Beneficiary) => {
    setEditingBeneficiary(b);
    setBeneficiaryForm({
      name: b.name,
      category: b.category,
      phone: b.phone,
      monthlyAmount: b.monthlyAmount,
      paymentMethod: b.paymentMethod,
      paymentDetails: b.paymentDetails,
      status: b.status,
      notes: b.notes
    });
    setShowAddBeneficiaryModal(true);
  };

  const handleSaveBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiaryForm.name) {
      setErrorMessage('يرجى إدخال اسم المستفيد.');
      return;
    }
    if (beneficiaryForm.monthlyAmount <= 0) {
      setErrorMessage('يجب أن يكون المبلغ الشهري أكبر من صفر.');
      return;
    }

    const nameToCheck = beneficiaryForm.name.trim();
    if (nameToCheck !== 'مدحت السيد حنة') {
      const duplicateExists = beneficiaries.some(b => 
        b.name.trim() === nameToCheck && 
        b.id !== editingBeneficiary?.id
      );
      if (duplicateExists) {
        setErrorMessage(`خطأ: الاسم "${nameToCheck}" مسجل مسبقاً بالفعل في النظام لتفادي التكرار.`);
        return;
      }
    }

    setActionLoading(true);
    try {
      if (editingBeneficiary?.id) {
        // Edit
        await updateDoc(doc(db, 'beneficiaries', editingBeneficiary.id), {
          ...beneficiaryForm
        });
        setSuccessMessage('تم تحديث بيانات المستفيد بنجاح.');
      } else {
        // Add
        await addDoc(collection(db, 'beneficiaries'), {
          ...beneficiaryForm,
          createdAt: serverTimestamp()
        });
        setSuccessMessage('تم إضافة المستفيد الجديد بنجاح.');
      }
      setShowAddBeneficiaryModal(false);
    } catch (err: any) {
      setErrorMessage(`حدث خطأ أثناء الحفظ: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBeneficiary = async (id: string) => {
    if (!window.confirm('هل أنت متأكد تماماً من حذف هذا المستفيد؟ سيتم إزالته كلياً من القائمة الكلية.')) return;
    try {
      await deleteDoc(doc(db, 'beneficiaries', id));
      setSuccessMessage('تم حذف المستفيد بنجاح.');
    } catch (err: any) {
      setErrorMessage(`حدث خطأ أثناء الحذف: ${err.message || err}`);
    }
  };

  const handleCleanDuplicates = async () => {
    if (beneficiaries.length === 0) return;
    if (!window.confirm('هل أنت متأكد من رغبتك في فحص وحذف كافة الأسماء المكررة من قاعدة البيانات؟ (سيتم الاحتفاظ بنسخة واحدة من كل اسم باستثناء "مدحت السيد حنة")')) return;
    
    setActionLoading(true);
    try {
      // Group beneficiaries by name
      const grouped: { [key: string]: Beneficiary[] } = {};
      beneficiaries.forEach(b => {
        const nameKey = b.name.trim();
        if (!grouped[nameKey]) {
          grouped[nameKey] = [];
        }
        grouped[nameKey].push(b);
      });

      let deleteCount = 0;
      const batch = writeBatch(db);

      Object.entries(grouped).forEach(([name, list]) => {
        // Skip allowed duplicates: "مدحت السيد حنة"
        if (name === 'مدحت السيد حنة') return;

        if (list.length > 1) {
          // Sort list by createdAt or id so we keep the first/oldest one
          list.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeA - timeB; // ascending, oldest first
          });

          // Keep the first one, delete the rest
          const toDelete = list.slice(1);
          toDelete.forEach(bToDelete => {
            if (bToDelete.id) {
              batch.delete(doc(db, 'beneficiaries', bToDelete.id));
              deleteCount++;
            }
          });
        }
      });

      if (deleteCount > 0) {
        await batch.commit();
        setSuccessMessage(`تم تنظيف قاعدة البيانات بنجاح وحذف عدد ${deleteCount} اسم مكرر.`);
      } else {
        setSuccessMessage('لا توجد أسماء مكررة في قاعدة البيانات حالياً لتنظيفها.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`فشل في تنظيف المكرر: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintCards = () => {
    const selected = beneficiaries.filter(b => selectedBeneficiaryIds.includes(b.id));
    if (selected.length === 0) {
      alert("يرجى اختيار مستفيدين للطباعة");
      return;
    }

    // Chunk beneficiaries into groups of 20 (2 columns * 10 rows)
    const pages = [];
    for (let i = 0; i < selected.length; i += 20) {
      pages.push(selected.slice(i, i + 20));
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");
      return;
    }

    const content = `
      <html dir="rtl">
        <head>
          <title>طباعة بطاقات المستفيدين</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; }
            .page {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              grid-template-rows: repeat(10, 27mm);
              gap: 5mm;
              height: 277mm;
              width: 190mm;
              page-break-after: always;
            }
            .card {
              border: 1px solid #333;
              padding: 10px;
              border-radius: 8px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              overflow: hidden;
            }
            h2 { font-size: 14px; margin: 0 0 4px 0; font-weight: bold; color: #000; }
            p { font-size: 11px; margin: 2px 0; color: #333; }
            strong { font-weight: bold; }
          </style>
        </head>
        <body>
          ${pages.map(pageBeneficiaries => `
            <div class="page">
              ${pageBeneficiaries.map(b => `
                <div class="card">
                  <h2>${b.name}</h2>
                  <p><strong>العنوان:</strong> ${b.address || 'غير محدد'}</p>
                  <p><strong>الهاتف:</strong> ${b.phone || 'لا يوجد'}</p>
                  <p><strong>تفاصيل الصرف:</strong> ${b.paymentDetails || 'لا يوجد'}</p>
                </div>
              `).join('')}
            </div>
          `).join('')}
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleCreateDisbursementRun = async () => {
    const existing = disbursementRuns.find(r => r.monthYear === runMonth);
    if (existing) {
      alert(`توجد دورة صرف مسجلة بالفعل لشهر ${runMonth}. يمكنك تعديلها أو صرفها من تبويب دورات الصرف.`);
      return;
    }

    const activeBeneficiaries = beneficiaries.filter(b => b.status === 'نشط');
    if (activeBeneficiaries.length === 0) {
      alert('لا يوجد أي مستفيدين نشطين حالياً لإنشاء دورة صرف لهم.');
      return;
    }

    const selectedSafe = safes.find(s => s.id === selectedSafeId);
    if (!selectedSafe) {
      alert('يرجى اختيار خزنة صالحة لصرف الدورة منها.');
      return;
    }

    const totalNeeded = activeBeneficiaries.reduce((sum, b) => sum + b.monthlyAmount, 0);

    const confirmCreate = window.confirm(
      `سيتم إنشاء دورة صرف جديدة لشهر (${runMonth}) تشمل عدد ${activeBeneficiaries.length} مستفيدين نشطين، بإجمالي مبالغ: ${totalNeeded} ج.م.\n\nالمصدر المالي المختار: ${selectedSafe.name} (الرصيد الحالي: ${selectedSafe.balance} ج.م)\n\nهل ترغب في المتابعة والتجهيز؟`
    );

    if (!confirmCreate) return;

    setActionLoading(true);
    try {
      const paymentsList: StipendPayment[] = activeBeneficiaries.map(b => ({
        id: `${b.id || Math.random().toString(36).substring(2)}-${Date.now()}`,
        beneficiaryId: b.id || '',
        beneficiaryName: b.name,
        category: b.category,
        phone: b.phone,
        amount: b.monthlyAmount,
        paymentMethod: b.paymentMethod,
        paymentDetails: b.paymentDetails || '',
        status: 'معلق'
      }));

      const newRun: Omit<DisbursementRun, 'id'> = {
        monthYear: runMonth,
        status: 'مسودة',
        createdAt: serverTimestamp(),
        createdBy: profile?.email || 'المدير',
        totalAmount: totalNeeded,
        paidAmount: 0,
        safeId: selectedSafeId,
        payments: paymentsList
      };

      const docRef = await addDoc(collection(db, 'disbursement_runs'), newRun);
      setSuccessMessage(`تم تجهيز دورة صرف ${runMonth} بنجاح.`);
      setShowCreateRunModal(false);
      
      // Open the created run
      setSelectedRun({ id: docRef.id, ...newRun });
      setActiveSubTab('runs');
    } catch (err: any) {
      setErrorMessage(`فشل في إنشاء دورة الصرف: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark stipend as Packed, Sent, or Delivered and handle Safe transactions cleanly
  const handleUpdatePaymentStatus = async (
    run: DisbursementRun, 
    paymentId: string, 
    newStatus: StipendPayment['status'], 
    txRefId?: string
  ) => {
    if (!run.id) return;

    const paymentIndex = run.payments.findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) return;

    const payment = run.payments[paymentIndex];
    
    // Check safe balance if we are changing to a paid state (e.g. تم التعبئة, تم التحويل, تم التسليم)
    const isPayingNow = newStatus !== 'معلق' && payment.status === 'معلق';
    const isRevertingToPending = newStatus === 'معلق' && payment.status !== 'معلق';

    const safe = safes.find(s => s.id === run.safeId);
    if (isPayingNow) {
      if (!safe) {
        alert('الخزنة المحددة لهذه الدورة لم تعد موجودة!');
        return;
      }
      if (safe.balance < payment.amount) {
        alert(`رصيد الخزنة المحددة (${safe.name}) غير كافٍ للصرف! الرصيد الحالي: ${safe.balance} ج.م والمطلوب: ${payment.amount} ج.م`);
        return;
      }
    }

    setActionLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Prepare updated payments array
      const updatedPayments = [...run.payments];
      const previousStatus = payment.status;
      
      updatedPayments[paymentIndex] = {
        ...payment,
        status: newStatus,
        transactionId: txRefId || payment.transactionId || '',
        paidAt: isPayingNow ? new Date().toISOString() : (newStatus === 'معلق' ? undefined : payment.paidAt),
        paidFromSafeId: isPayingNow ? run.safeId : (newStatus === 'معلق' ? undefined : payment.paidFromSafeId)
      };

      // 2. Calculate new totals
      let addedPaidAmount = 0;
      if (isPayingNow) {
        addedPaidAmount = payment.amount;
      } else if (isRevertingToPending) {
        addedPaidAmount = -payment.amount;
      }

      const newPaidAmount = run.paidAmount + addedPaidAmount;
      const isCompleted = newPaidAmount >= run.totalAmount;
      const newRunStatus = newPaidAmount === 0 ? 'مسودة' : (isCompleted ? 'مكتمل بالكامل' : 'مكتمل الجزئي');

      // 3. Update the Disbursement Run document
      batch.update(doc(db, 'disbursement_runs', run.id), {
        payments: updatedPayments,
        paidAmount: newPaidAmount,
        status: newRunStatus
      });

      // 4. Update Safe balance and write transaction
      if (isPayingNow && safe) {
        // Deduct from Safe
        batch.update(doc(db, 'safes', run.safeId), {
          balance: increment(-payment.amount)
        });

        // Add Safe Transaction
        const txRef = doc(collection(db, 'safeTransactions'));
        const txDesc = `صرف شهرية - ${payment.beneficiaryName} (${payment.paymentMethod}) - دورة ${run.monthYear}`;
        batch.set(txRef, {
          safeId: run.safeId,
          date: format(new Date(), 'yyyy-MM-dd'),
          type: 'مصروفات',
          amount: payment.amount,
          description: txDesc,
          category: 'شهريات ومساعدات',
          createdBy: profile?.email || 'المدير',
          createdAt: serverTimestamp()
        });
      } else if (isRevertingToPending && safe) {
        // Revert Safe deduction (refund)
        batch.update(doc(db, 'safes', run.safeId), {
          balance: increment(payment.amount)
        });

        // Add Refund Transaction
        const txRef = doc(collection(db, 'safeTransactions'));
        const txDesc = `إرجاع شهرية ملغاة - ${payment.beneficiaryName} - دورة ${run.monthYear}`;
        batch.set(txRef, {
          safeId: run.safeId,
          date: format(new Date(), 'yyyy-MM-dd'),
          type: 'إيداع',
          amount: payment.amount,
          description: txDesc,
          category: 'شهريات ومساعدات',
          createdBy: profile?.email || 'المدير',
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      setSuccessMessage('تم تحديث حالة الصرف بنجاح وتسجيل الحركة المالية.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`فشل تحديث الحالة: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk pay all remaining/pending payments in a run
  const handleBulkPayRemaining = async (run: DisbursementRun) => {
    const pendingPayments = run.payments.filter(p => p.status === 'معلق');
    if (pendingPayments.length === 0) {
      alert('لا توجد أي مستحقات معلقة للصرف في هذه الدورة.');
      return;
    }

    const totalNeeded = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const safe = safes.find(s => s.id === run.safeId);

    if (!safe) {
      alert('الخزنة المحددة لهذه الدورة غير موجودة.');
      return;
    }

    if (safe.balance < totalNeeded) {
      alert(`رصيد الخزنة المحددة غير كافٍ للصرف الكلي المجمع! الرصيد الحالي: ${safe.balance} ج.م والمطلوب الإجمالي: ${totalNeeded} ج.م`);
      return;
    }

    const confirmBulk = window.confirm(
      `تحذير مالي مجمع:\n\nسيتم صرف كافة الشهريات المعلقة المتبقية في هذه الدورة دفعة واحدة لعدد ${pendingPayments.length} مستفيدين.\nإجمالي المبلغ المخصوم: ${totalNeeded} ج.م\nالخزنة المستهدفة: ${safe.name}\n\nهل ترغب في تعميد الصرف المجمع وتأكيده فوراً؟`
    );

    if (!confirmBulk) return;

    setActionLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Prepare updated payments array
      const updatedPayments = run.payments.map(p => {
        if (p.status === 'معلق') {
          return {
            ...p,
            status: p.paymentMethod === 'ظرف مالي' ? 'تم التعبئة' as const : 
                    (p.paymentMethod === 'انستا باي' || p.paymentMethod === 'فودافون كاش' ? 'تم التحويل' as const : 'تم التسليم' as const),
            paidAt: new Date().toISOString(),
            paidFromSafeId: run.safeId
          };
        }
        return p;
      });

      // 2. Deduct total amount from Safe
      batch.update(doc(db, 'safes', run.safeId), {
        balance: increment(-totalNeeded)
      });

      // 3. Record Safe Transactions for each pending payment
      pendingPayments.forEach(p => {
        const txRef = doc(collection(db, 'safeTransactions'));
        const txDesc = `صرف شهرية مجمع - ${p.beneficiaryName} (${p.paymentMethod}) - دورة ${run.monthYear}`;
        batch.set(txRef, {
          safeId: run.safeId,
          date: format(new Date(), 'yyyy-MM-dd'),
          type: 'مصروفات',
          amount: p.amount,
          description: txDesc,
          category: 'شهريات ومساعدات',
          createdBy: profile?.email || 'المدير',
          createdAt: serverTimestamp()
        });
      });

      // 4. Update the Disbursement Run status and payments
      batch.update(doc(db, 'disbursement_runs', run.id!), {
        payments: updatedPayments,
        paidAmount: run.totalAmount, // all paid
        status: 'مكتمل بالكامل'
      });

      await batch.commit();
      setSuccessMessage(`تم تصفية وصرف الدورة كلياً بنجاح ومزامنة الخزنة المصرفية.`);
    } catch (err: any) {
      setErrorMessage(`فشل في الصرف المجمع: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDisbursementRun = async (run: DisbursementRun) => {
    if (run.paidAmount > 0) {
      alert('لا يمكن حذف دورة صرف تم البدء في سدادها أو صرف أجزاء منها لضمان دقة السجلات والخزائن المالية.');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من رغبتك في إيقاف وإلغاء دورة صرف شهر (${run.monthYear}) بالكامل؟`)) return;

    try {
      await deleteDoc(doc(db, 'disbursement_runs', run.id!));
      setSelectedRun(null);
      setSuccessMessage('تم إلغاء دورة الصرف وحذف مسودتها بنجاح.');
    } catch (err: any) {
      setErrorMessage(`حدث خطأ أثناء الإلغاء: ${err.message || err}`);
    }
  };

  // Helper values for display stats
  const totalActiveBeneficiaries = beneficiaries.filter(b => b.status === 'نشط').length;
  const totalMonthlyAllocations = beneficiaries
    .filter(b => b.status === 'نشط')
    .reduce((sum, b) => sum + b.monthlyAmount, 0);

  const statsByMethod = {
    envelope: beneficiaries.filter(b => b.status === 'نشط' && b.paymentMethod === 'ظرف مالي').length,
    envelopeAmount: beneficiaries.filter(b => b.status === 'نشط' && b.paymentMethod === 'ظرف مالي').reduce((sum, b) => sum + b.monthlyAmount, 0),
    instapay: beneficiaries.filter(b => b.status === 'نشط' && b.paymentMethod === 'انستا باي').length,
    instapayAmount: beneficiaries.filter(b => b.status === 'نشط' && b.paymentMethod === 'انستا باي').reduce((sum, b) => sum + b.monthlyAmount, 0),
    vodafone: beneficiaries.filter(b => b.status === 'نشط' && b.paymentMethod === 'فودافون كاش').length,
    vodafoneAmount: beneficiaries.filter(b => b.status === 'نشط' && b.paymentMethod === 'فودافون كاش').reduce((sum, b) => sum + b.monthlyAmount, 0),
    hand: beneficiaries.filter(b => b.status === 'نشط' && b.paymentMethod === 'نقدي باليد').length,
    handAmount: beneficiaries.filter(b => b.status === 'نشط' && b.paymentMethod === 'نقدي باليد').reduce((sum, b) => sum + b.monthlyAmount, 0),
  };

  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.phone.includes(searchTerm) || 
                          (b.paymentDetails && b.paymentDetails.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (b.notes && b.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'الكل' || b.category === categoryFilter;
    const matchesMethod = methodFilter === 'الكل' || b.paymentMethod === methodFilter;
    const matchesStatus = statusFilter === 'الكل' || b.status === statusFilter;
    const matchesMinAmount = minAmount === '' || b.monthlyAmount >= Number(minAmount);
    const matchesMaxAmount = maxAmount === '' || b.monthlyAmount <= Number(maxAmount);
    return matchesSearch && matchesCategory && matchesMethod && matchesStatus && matchesMinAmount && matchesMaxAmount;
  });

  // Export custom print styles
  const handlePrintEnvelopeList = (run: DisbursementRun) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const filtered = run.payments.filter(p => p.paymentMethod === 'ظرف مالي');
    
    let html = `
      <html dir="rtl">
        <head>
          <title>مسير أظرف الشهريات - دورة ${run.monthYear}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; margin-bottom: 5px; font-weight: 800; color: #0f172a; }
            h4 { text-align: center; margin-top: 0; color: #64748b; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: right; }
            th { bg-color: #f1f5f9; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .amount { font-family: monospace; font-weight: bold; text-align: left; }
            .signature { width: 120px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h2>كشف تجهيز وتعبئة الأظرف المالية</h2>
          <h4>دورة صرف: ${run.monthYear} | خزنة الصرف: ${safes.find(s => s.id === run.safeId)?.name || 'غير معروف'}</h4>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم المستفيد</th>
                <th>التصنيف</th>
                <th>المبلغ المطلوب</th>
                <th>الهاتف</th>
                <th>تفاصيل الصرف</th>
                <th>حالة التعبئة</th>
                <th class="signature">التوقيع بالاستلام</th>
              </tr>
            </thead>
            <tbody>
    `;

    filtered.forEach((p, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${p.beneficiaryName}</strong></td>
          <td>${p.category}</td>
          <td class="amount">${p.amount} ج.م</td>
          <td>${p.phone || 'بدون'}</td>
          <td>${p.paymentDetails || 'تعبئة كاش'}</td>
          <td>[  ] معبأ | [  ] تم التسليم</td>
          <td></td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
          <p style="margin-top: 25px; font-size: 13px;"><strong>إجمالي عدد الأظرف المطلوب تجهيزها:</strong> ${filtered.length} ظرف مالي</p>
          <p style="font-size: 13px;"><strong>إجمالي القيمة المالية الإجمالية للأظرف:</strong> ${filtered.reduce((sum, p) => sum + p.amount, 0)} ج.م</p>
          <div class="footer">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - تم استخراج الكشف إلكترونياً من نظام إدارة المصنع الحديث</div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm font-black shadow-sm"
          >
            <CheckCircle className="text-emerald-500 shrink-0" size={18} />
            <span>{successMessage}</span>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3 text-sm font-black shadow-sm"
          >
            <AlertCircle className="text-red-500 shrink-0" size={18} />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section with Stats */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-slate-700/30">
        <div className="absolute top-0 left-0 w-64 h-64 bg-slate-700/10 rounded-full blur-3xl -translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/5 text-xs text-slate-300 font-bold">
              <HeartHandshake size={14} className="text-red-400" />
              المساعدات والدفعات الشهرية المنتظمة
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">إدارة الشهريات والأظرف المالية</h2>
            <p className="text-slate-300 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
              بوابة إلكترونية مخصصة لتجهيز وتعبئة أظرف الشهريات المالية وإرسال الحوالات الرقمية عبر انستا باي ومحافظ فودافون كاش للمستحقين والعمال بمرونة فائقة وربط مالي متكامل مع الخزائن.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={() => {
                setSelectedRun(null);
                setActiveSubTab('beneficiaries');
              }}
              className="px-5 h-12 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs transition-all border border-white/10 flex items-center gap-2"
            >
              <Users size={16} />
              شجرة المستفيدين ({beneficiaries.length})
            </button>

            <button
              onClick={() => setShowCreateRunModal(true)}
              className="px-6 h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Plus size={18} />
              تجهيز دورة صرف جديدة
            </button>
          </div>
        </div>

        {/* Dynamic mini KPIs inside header */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0 border border-red-500/10">
              <Users className="text-red-400" size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">المستفيدين النشطين</span>
              <span className="text-lg font-black font-mono">{totalActiveBeneficiaries} مستفيد</span>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/10">
              <Coins className="text-emerald-400" size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">إجمالي مخصص الشهريات</span>
              <span className="text-lg font-black font-mono">{totalMonthlyAllocations.toLocaleString()} ج.م</span>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/10">
              <Wallet className="text-amber-400" size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">الأظرف المغلقة</span>
              <span className="text-lg font-black font-mono">{statsByMethod.envelope} ظرف ({statsByMethod.envelopeAmount.toLocaleString()} ج.م)</span>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/10">
              <CreditCard className="text-blue-400" size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">الحوالات الرقمية (محافظ/انستا)</span>
              <span className="text-lg font-black font-mono">{statsByMethod.instapay + statsByMethod.vodafone} حوالة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Module Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setSelectedRun(null);
            setActiveSubTab('overview');
          }}
          className={`px-6 py-3.5 font-black text-sm relative transition-colors ${activeSubTab === 'overview' && !selectedRun ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          نظرة عامة والتحليلات
          {activeSubTab === 'overview' && !selectedRun && (
            <motion.div layoutId="subtab_underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>

        <button
          onClick={() => {
            setSelectedRun(null);
            setActiveSubTab('beneficiaries');
          }}
          className={`px-6 py-3.5 font-black text-sm relative transition-colors ${activeSubTab === 'beneficiaries' ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          شجرة المستفيدين ومبالغهم
          {activeSubTab === 'beneficiaries' && (
            <motion.div layoutId="subtab_underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveSubTab('runs');
          }}
          className={`px-6 py-3.5 font-black text-sm relative transition-colors ${activeSubTab === 'runs' || selectedRun ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          دورات الصرف الشهرية {disbursementRuns.length > 0 && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px] mr-1">{disbursementRuns.length}</span>}
          {(activeSubTab === 'runs' || selectedRun) && (
            <motion.div layoutId="subtab_underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </div>

      {/* Main Tab Contents */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="py-20 flex flex-col items-center text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
            <p className="mt-4 font-bold text-sm">جاري مزامنة بيانات الصندوق والشهريات...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Overview / Analytics Sub-Tab */}
            {activeSubTab === 'overview' && !selectedRun && (
              <motion.div
                key="overview-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Visual grid / Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Latest run progress card */}
                  <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                        <Clock className="text-slate-500" size={18} />
                        حالة آخر دورة صرف نشطة
                      </h3>
                      {disbursementRuns.length > 0 ? (
                        (() => {
                          const latestRun = disbursementRuns[0];
                          const percent = latestRun.totalAmount > 0 
                            ? Math.round((latestRun.paidAmount / latestRun.totalAmount) * 100) 
                            : 0;
                          return (
                            <div className="mt-4 space-y-4">
                              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div>
                                  <h4 className="font-extrabold text-slate-900 text-sm">دورة صرف شهر: {latestRun.monthYear}</h4>
                                  <span className={`inline-block mt-1 text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                    latestRun.status === 'مكتمل بالكامل' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    latestRun.status === 'مكتمل الجزئي' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {latestRun.status}
                                  </span>
                                </div>

                                <div className="text-left">
                                  <span className="text-[10px] font-bold text-slate-400 block">إجمالي الدورة</span>
                                  <span className="text-lg font-black font-mono text-primary">{latestRun.totalAmount.toLocaleString()} ج.م</span>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                  <span>معدل الصرف والتحويل الكلي:</span>
                                  <span className="font-mono">{percent}% ({latestRun.paidAmount.toLocaleString()} من {latestRun.totalAmount.toLocaleString()} ج.م)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                  <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                                </div>
                              </div>

                              <div className="pt-2 flex justify-end">
                                <button
                                  onClick={() => {
                                    setSelectedRun(latestRun);
                                    setActiveSubTab('runs');
                                  }}
                                  className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-2"
                                >
                                  شغل وتوزيع مبالغ الدورة
                                  <ChevronRight size={14} className="rotate-180" />
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="py-12 text-center text-slate-400">
                          <p className="text-xs font-bold">لا يوجد دورات صرف منشأة حالياً. ابدأ بتجهيز دورة جديدة.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment methodology guide info card */}
                  <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-6 border border-slate-100 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                        <Info className="text-primary" size={18} />
                        قنوات وتعبئة المبالغ الرقمية
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        يتيح النظام تحديد وسيلة الصرف المثالية لكل مستفيد، مما يسهل الفرز المجمع للأظرف لتعبئتها نقداً، أو نسخ أرقام المحافظ الرقمية وحسابات انستا باي وتفريغها دفعة واحدة.
                      </p>

                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            تعبئة الأظرف (الكاش)
                          </span>
                          <span className="font-mono">{statsByMethod.envelopeAmount.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                            محافظ فودافون كاش
                          </span>
                          <span className="font-mono">{statsByMethod.vodafoneAmount.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            حسابات انستا باي
                          </span>
                          <span className="font-mono">{statsByMethod.instapayAmount.toLocaleString()} ج.م</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories & Beneficiaries split overview */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <h3 className="font-black text-slate-900 text-sm">توزيع المستفيدين حسب التصنيفات والفئات</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                    {(['تبع معتز', 'تبع كريمة ابو العنين', 'تبع وليد العدوي', 'تبع اسماعيل نبهان', 'تبع معاذ', 'تبع محمد سليم', 'أخرى'] as const).map(cat => {
                      const count = beneficiaries.filter(b => b.category === cat).length;
                      const activeCount = beneficiaries.filter(b => b.category === cat && b.status === 'نشط').length;
                      const sumAmount = beneficiaries.filter(b => b.category === cat && b.status === 'نشط').reduce((sum, b) => sum + b.monthlyAmount, 0);

                      return (
                        <div key={cat} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-right space-y-1">
                          <span className="text-xs font-black text-slate-700 block">{cat}</span>
                          <span className="text-lg font-black font-mono text-slate-900 block">{activeCount} <span className="text-[10px] text-slate-400">نشط</span></span>
                          <span className="text-[10px] font-bold text-primary block">القيمة: {sumAmount.toLocaleString()} ج.م</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Beneficiaries Directory Sub-Tab */}
            {activeSubTab === 'beneficiaries' && (
              <motion.div
                key="beneficiaries-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Karima Abu El-Anin Image Import Panel */}
                {!karimaImportSuccess && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl p-6 border border-amber-200/60 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                          <HeartHandshake size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">استيراد كشف "تبع كريمة أبو العنين" المكتشف من الصورة</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            تم تحليل الكشف واستخراج <span className="text-amber-600 font-black">{karimaList.length} مستفيداً</span> مع كامل تفاصيلهم (الاسم، الهاتف، العنوان، والمبلغ). يمكنك تعديل أي حقل أو حذف أي صف مباشرة أدناه قبل إضافتهم نهائياً لقاعدة البيانات.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImportKarimaPanel(!showImportKarimaPanel)}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        {showImportKarimaPanel ? 'إخفاء المعاينة والتعديل' : 'عرض الكشف والمعاينة والتعديل'}
                        <ChevronDown className={`transition-transform duration-200 ${showImportKarimaPanel ? 'rotate-180' : ''}`} size={16} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showImportKarimaPanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-4 border-t border-amber-200/40 space-y-4"
                        >
                          <div className="bg-white rounded-2xl border border-amber-200/50 shadow-inner overflow-hidden max-h-[450px] overflow-y-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase">
                                  <th className="py-3 px-4 w-[25%]">اسم المستفيد</th>
                                  <th className="py-3 px-4 w-[20%]">رقم الاتصال (الهاتف)</th>
                                  <th className="py-3 px-4 w-[35%]">العنوان وموقع التسليم</th>
                                  <th className="py-3 px-4 w-[12%]">المبلغ (ج.م)</th>
                                  <th className="py-3 px-4 text-center w-[8%]">إجراء</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-xs">
                                {karimaList.map((item, index) => (
                                  <tr key={index} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
                                        value={item.name}
                                        onChange={(e) => handleUpdateKarimaItem(index, 'name', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-left font-bold text-slate-700 focus:outline-none focus:border-amber-500"
                                        value={item.phone}
                                        placeholder="لا يوجد"
                                        onChange={(e) => handleUpdateKarimaItem(index, 'phone', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
                                        value={item.address}
                                        onChange={(e) => handleUpdateKarimaItem(index, 'address', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="number"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black font-mono text-left text-slate-700 focus:outline-none focus:border-amber-500"
                                        value={item.amount}
                                        onChange={(e) => handleUpdateKarimaItem(index, 'amount', Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveKarimaItem(index)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                        title="إزالة من القائمة"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setKarimaList([
                                  { name: 'فريال حسن المهدى خضر', phone: '01091442250', address: 'بجوار منزل العمدة القديم', amount: 200 },
                                  { name: 'سميرة السعيد سليمان الشرايدى', phone: '01063352020', address: 'بجوار منزل العمدة القديم', amount: 200 },
                                  { name: 'عزيزة السيد محمد ابو الغيط', phone: '01014920500', address: 'بجوار منزل العمدة القديم', amount: 200 },
                                  { name: 'كوثر عبده محمد على الصياد', phone: '01018094320 / 01068094320', address: 'الكحيل امام المدرسة المشتركة', amount: 200 },
                                  { name: 'صباح عاطف السيد البياع', phone: '01023696856', address: 'الكحيل', amount: 200 },
                                  { name: 'عثمان ابراهيم محمد عثمان', phone: '01021568589', address: 'خلف الجمعية الزراعية م فؤاد عسل', amount: 200 },
                                  { name: 'جيهان ابراهيم عبد الفتاح ابراهيم', phone: '01019904068', address: 'خلف الجمعية الزراعية م علاء عسل', amount: 200 },
                                  { name: 'عرفة محمد عرفة مسعود', phone: '', address: 'الكحيل تبع اكريمة ابو العنين', amount: 500 },
                                  { name: 'يوسف طارق لاشين', phone: '', address: 'الكحيل تبع اكريمة ابو العنين', amount: 500 },
                                  { name: 'جمال الشحات محمد جاد', phone: '01008707281 / 01008707385', address: 'بجوار فيلا العمدة سليمان زين الدين', amount: 200 },
                                  { name: 'مالية عبد الجوهرى', phone: '01091499625 / 0573666171', address: 'بجوار مسجد الكحيل السرايا', amount: 200 },
                                  { name: 'ناهد ابراهيم على الحضرى', phone: '01090171908 / 01027586235', address: 'الكحيل ماجرة بمنزل ايوب سيف', amount: 200 },
                                  { name: 'عزة توفيق محمد توفيق', phone: '01097504553', address: 'الكحيل بجوار بيت العمدة القديم', amount: 200 },
                                  { name: 'الهام بديع المتولى الجوهرى', phone: '01017304678', address: 'الكحيل', amount: 200 }
                                ]);
                                setSuccessMessage('تم إعادة تعيين القائمة الأصلية.');
                              }}
                              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
                            >
                              إعادة تعيين القائمة
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={handleImportKarimaList}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            >
                              {actionLoading ? 'جاري الاستيراد...' : `حفظ واستيراد كافة المستفيدين (${karimaList.length})`}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Others Image Import Panel */}
                {!othersImportSuccess && (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                          <MoreHorizontal size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">استيراد كشف "أخرى" من الصورة</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            تم تحليل الكشف واستخراج <span className="text-slate-600 font-black">{othersList.length} مستفيداً</span>.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImportOthersPanel(!showImportOthersPanel)}
                        className="px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        {showImportOthersPanel ? 'إخفاء المعاينة والتعديل' : 'عرض الكشف والمعاينة والتعديل'}
                        <ChevronDown className={`transition-transform duration-200 ${showImportOthersPanel ? 'rotate-180' : ''}`} size={16} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showImportOthersPanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-4 border-t border-slate-200/40 space-y-4"
                        >
                          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-inner overflow-hidden max-h-[300px] overflow-y-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase">
                                  <th className="py-3 px-4 w-[25%]">اسم المستفيد</th>
                                  <th className="py-3 px-4 w-[20%]">رقم الاتصال (الهاتف)</th>
                                  <th className="py-3 px-4 w-[35%]">العنوان</th>
                                  <th className="py-3 px-4 w-[12%]">المبلغ (ج.م)</th>
                                  <th className="py-3 px-4 text-center w-[8%]">إجراء</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-xs">
                                {othersList.map((item, index) => (
                                  <tr key={index} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-500"
                                        value={item.name}
                                        onChange={(e) => handleUpdateOthersItem(index, 'name', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-left font-bold text-slate-700 focus:outline-none focus:border-slate-500"
                                        value={item.phone}
                                        placeholder="لا يوجد"
                                        onChange={(e) => handleUpdateOthersItem(index, 'phone', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-500"
                                        value={item.address}
                                        onChange={(e) => handleUpdateOthersItem(index, 'address', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="number"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black font-mono text-left text-slate-700 focus:outline-none focus:border-slate-500"
                                        value={item.amount}
                                        onChange={(e) => handleUpdateOthersItem(index, 'amount', Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveOthersItem(index)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                        title="إزالة من القائمة"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={handleImportOthersList}
                              disabled={actionLoading}
                              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
                            >
                              {actionLoading ? 'جاري الاستيراد...' : 'تأكيد واستيراد القائمة'}
                              <Upload size={14} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Moataz Abu Hanna Image Import Panel */}
                {!moatazImportSuccess && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-3xl p-6 border border-blue-200/60 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                          <HeartHandshake size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">استيراد كشف "تبع معتز" المكتشف من الصورة</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            تم تحليل الكشف واستخراج <span className="text-blue-600 font-black">{moatazList.length} مستفيداً</span> مع كامل تفاصيلهم (الاسم، الهاتف، العنوان، والمبلغ). يمكنك تعديل أي حقل أو حذف أي صف مباشرة أدناه قبل إضافتهم نهائياً لقاعدة البيانات.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImportMoatazPanel(!showImportMoatazPanel)}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        {showImportMoatazPanel ? 'إخفاء المعاينة والتعديل' : 'عرض الكشف والمعاينة والتعديل'}
                        <ChevronDown className={`transition-transform duration-200 ${showImportMoatazPanel ? 'rotate-180' : ''}`} size={16} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showImportMoatazPanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-4 border-t border-blue-200/40 space-y-4"
                        >
                          <div className="bg-white rounded-2xl border border-blue-200/50 shadow-inner overflow-hidden max-h-[450px] overflow-y-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase">
                                  <th className="py-3 px-4 w-[25%]">اسم المستفيد</th>
                                  <th className="py-3 px-4 w-[20%]">رقم الاتصال (الهاتف)</th>
                                  <th className="py-3 px-4 w-[35%]">العنوان وموقع التسليم</th>
                                  <th className="py-3 px-4 w-[12%]">المبلغ (ج.م)</th>
                                  <th className="py-3 px-4 text-center w-[8%]">إجراء</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-xs">
                                {moatazList.map((item, index) => (
                                  <tr key={index} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                                        value={item.name}
                                        onChange={(e) => handleUpdateMoatazItem(index, 'name', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-left font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                                        value={item.phone}
                                        placeholder="لا يوجد"
                                        onChange={(e) => handleUpdateMoatazItem(index, 'phone', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                                        value={item.address}
                                        onChange={(e) => handleUpdateMoatazItem(index, 'address', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="number"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black font-mono text-left text-slate-700 focus:outline-none focus:border-blue-500"
                                        value={item.amount}
                                        onChange={(e) => handleUpdateMoatazItem(index, 'amount', Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMoatazItem(index)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                        title="إزالة من القائمة"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setMoatazList([
                                  { name: 'مروة مجدي عبد الغني بنت اختي', phone: '', address: 'بنت اختي', amount: 200 },
                                  { name: 'مي مجدي عبد الغني بنت اختي', phone: '', address: 'بنت اختي', amount: 200 },
                                  { name: 'مدحت السيد حنة', phone: '', address: '', amount: 200 },
                                  { name: 'معتز السيد حنة', phone: '', address: '', amount: 200 },
                                  { name: 'مدحت السيد حنة', phone: '', address: '', amount: 200 },
                                  { name: 'السعيد السيد حنة', phone: '', address: '', amount: 200 },
                                  { name: 'مرات خالي حسن ابو حنة', phone: '', address: '', amount: 200 },
                                  { name: 'هدير بنت خالي حسن', phone: '', address: '', amount: 200 },
                                  { name: 'دعاء بنت خالي حسن', phone: '', address: '', amount: 200 },
                                  { name: 'محمد ابو نيشه ( كفر البطيخ )', phone: '01098142964', address: 'كفر البطيخ', amount: 200 },
                                  { name: 'اسامه كفر البطيخ', phone: '', address: 'كفر البطيخ', amount: 200 },
                                  { name: 'مرفت السيد حنه', phone: '', address: '', amount: 1000 },
                                  { name: 'الحاجه /ام محسن / زوج خالي / الحاج/ سيد', phone: '', address: 'زوج خالي / الحاج/ سيد', amount: 500 },
                                  { name: 'الاستاذه / منال (اختي الكبيره)', phone: '', address: 'اختي الكبيره', amount: 500 },
                                  { name: 'ام حمادة/ ماجدة السيد حنة', phone: '', address: '', amount: 500 },
                                  { name: 'مهاب السيد حنة', phone: '', address: '', amount: 500 },
                                  { name: 'محسن السيد حنة', phone: '', address: '', amount: 500 },
                                  { name: 'مها زوجة صابر بديراسمائيل شارع الثلاثيني', phone: '', address: 'شارع الثلاثيني', amount: 500 },
                                  { name: 'فوزي دعادير شارع الشهابه', phone: '', address: 'شارع الشهابه', amount: 500 },
                                  { name: 'عمي عبده غنيم ابو رشاد', phone: '01093385196', address: '', amount: 500 },
                                  { name: 'محسن البيومي شطا', phone: '', address: 'شطا', amount: 500 },
                                  { name: 'اولاد محمد الكفافي ( مستوره)', phone: '01092214082', address: '', amount: 500 }
                                ]);
                                setSuccessMessage('تم إعادة تعيين القائمة الأصلية.');
                              }}
                              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
                            >
                              إعادة تعيين القائمة
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={handleImportMoatazList}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            >
                              {actionLoading ? 'جاري الاستيراد...' : `حفظ واستيراد كافة المستفيدين (${moatazList.length})`}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Waleed Al-Adawy Image Import Panel */}
                {!waleedImportSuccess && (
                  <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50/50 rounded-3xl p-6 border border-purple-200/60 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0 mt-0.5">
                          <HeartHandshake size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">استيراد كشف "تبع وليد العدوي" المكتشف من الصورة</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            تم تحليل الكشف واستخراج <span className="text-purple-600 font-black">{waleedList.length} مستفيداً</span> مع كامل تفاصيلهم (الاسم، الهاتف، العنوان والمبلغ). يمكنك تعديل أي حقل أو حذف أي صف مباشرة أدناه قبل إضافتهم نهائياً لقاعدة البيانات.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImportWaleedPanel(!showImportWaleedPanel)}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        {showImportWaleedPanel ? 'إخفاء المعاينة والتعديل' : 'عرض الكشف والمعاينة والتعديل'}
                        <ChevronDown className={`transition-transform duration-200 ${showImportWaleedPanel ? 'rotate-180' : ''}`} size={16} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showImportWaleedPanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-4 border-t border-purple-200/40 space-y-4"
                        >
                          <div className="bg-white rounded-2xl border border-purple-200/50 shadow-inner overflow-hidden max-h-[450px] overflow-y-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase">
                                  <th className="py-3 px-4 w-[25%]">اسم المستفيد</th>
                                  <th className="py-3 px-4 w-[20%]">رقم الاتصال (الهاتف)</th>
                                  <th className="py-3 px-4 w-[35%]">العنوان وموقع التسليم</th>
                                  <th className="py-3 px-4 w-[12%]">المبلغ (ج.م)</th>
                                  <th className="py-3 px-4 text-center w-[8%]">إجراء</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-xs">
                                {waleedList.map((item, index) => (
                                  <tr key={index} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500"
                                        value={item.name}
                                        onChange={(e) => handleUpdateWaleedItem(index, 'name', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-left font-bold text-slate-700 focus:outline-none focus:border-purple-500"
                                        value={item.phone}
                                        placeholder="لا يوجد"
                                        onChange={(e) => handleUpdateWaleedItem(index, 'phone', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500"
                                        value={item.address}
                                        onChange={(e) => handleUpdateWaleedItem(index, 'address', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="number"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black font-mono text-left text-slate-700 focus:outline-none focus:border-purple-500"
                                        value={item.amount}
                                        onChange={(e) => handleUpdateWaleedItem(index, 'amount', Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveWaleedItem(index)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                        title="إزالة من القائمة"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setWaleedList([
                                  { name: 'زوجه / محمد وفيق العدوي ( اخي )', phone: '', address: 'اخي', amount: 200 },
                                  { name: 'زوجه / عمرو وفيق العدوي ( اخي )', phone: '', address: 'اخي', amount: 200 },
                                  { name: 'حسام وفيق العدوي ( اخي )', phone: '', address: 'اخي', amount: 200 },
                                  { name: 'ايمان بنت عمي رضا', phone: '', address: '', amount: 200 },
                                  { name: 'رياض العدوي ابو احمد', phone: '', address: '', amount: 200 },
                                  { name: 'علاء العدوي', phone: '', address: '', amount: 200 },
                                  { name: 'زوجة / طارق العدوي', phone: '', address: '', amount: 500 },
                                  { name: 'زوجة / معتز العدوي', phone: '', address: '', amount: 500 },
                                  { name: 'زوجة وفيق رخا بنت عمتي', phone: '', address: 'بنت عمتي', amount: 200 },
                                  { name: 'زوجة حسني رخا بنت عمتي', phone: '', address: 'بنت عمتي', amount: 200 },
                                  { name: 'بنت رياض عبد الباسط', phone: '', address: '', amount: 200 },
                                  { name: 'ليلى محمد رخا', phone: '', address: '', amount: 200 },
                                  { name: 'زوجة مصطفى الباروجي', phone: '', address: '', amount: 200 },
                                  { name: 'عمي رضا العدوي (ابو يحيي)', phone: '', address: 'ابو يحيى', amount: 500 },
                                  { name: 'زوجة عمي رضا العدوي', phone: '', address: '', amount: 500 },
                                  { name: 'الحاجه /ام وفيق رخا / عمتي / سوسن', phone: '', address: 'عمتي / سوسن', amount: 500 },
                                  { name: 'بديع عتمان', phone: '01018543922', address: '', amount: 500 },
                                  { name: 'مسعود الحنفي', phone: '', address: '', amount: 500 },
                                  { name: 'محمد الزملكاوى - علي كوبري ابو العز', phone: '01011499360', address: 'علي كوبري ابو العز', amount: 500 },
                                  { name: 'زوجه محمود الشهابي', phone: '', address: 'اول البلد بجوار حامد الشهابي', amount: 500 },
                                  { name: 'تامر مصطفى سلامة', phone: '01002360822', address: '', amount: 250 }
                                ]);
                                setSuccessMessage('تم إعادة تعيين القائمة الأصلية.');
                              }}
                              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
                            >
                              إعادة تعيين القائمة
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={handleImportWaleedList}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            >
                              {actionLoading ? 'جاري الاستيراد...' : `حفظ واستيراد كافة المستفيدين (${waleedList.length})`}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Ismail Nabhan Image Import Panel */}
                {!ismailImportSuccess && (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-3xl p-6 border border-emerald-200/60 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                          <HeartHandshake size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">استيراد كشف "تبع إسماعيل نبهان" المكتشف من الصورة</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            تم تحليل الكشف واستخراج <span className="text-emerald-600 font-black">{ismailList.length} مستفيداً</span> مع كامل تفاصيلهم (الاسم، الهاتف المرفق، العنوان والمبلغ). يمكنك تعديل أي حقل أو حذف أي صف مباشرة أدناه قبل إضافتهم نهائياً لقاعدة البيانات.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImportIsmailPanel(!showImportIsmailPanel)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        {showImportIsmailPanel ? 'إخفاء المعاينة والتعديل' : 'عرض الكشف والمعاينة والتعديل'}
                        <ChevronDown className={`transition-transform duration-200 ${showImportIsmailPanel ? 'rotate-180' : ''}`} size={16} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showImportIsmailPanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-4 border-t border-emerald-200/40 space-y-4"
                        >
                          <div className="bg-white rounded-2xl border border-emerald-200/50 shadow-inner overflow-hidden max-h-[450px] overflow-y-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase">
                                  <th className="py-3 px-4 w-[25%]">اسم المستفيد</th>
                                  <th className="py-3 px-4 w-[20%]">رقم الاتصال (الهاتف)</th>
                                  <th className="py-3 px-4 w-[35%]">العنوان وموقع التسليم</th>
                                  <th className="py-3 px-4 w-[12%]">المبلغ (ج.م)</th>
                                  <th className="py-3 px-4 text-center w-[8%]">إجراء</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-xs">
                                {ismailList.map((item, index) => (
                                  <tr key={index} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                                        value={item.name}
                                        onChange={(e) => handleUpdateIsmailItem(index, 'name', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-left font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                                        value={item.phone}
                                        placeholder="لا يوجد"
                                        onChange={(e) => handleUpdateIsmailItem(index, 'phone', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                                        value={item.address}
                                        onChange={(e) => handleUpdateIsmailItem(index, 'address', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="number"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black font-mono text-left text-slate-700 focus:outline-none focus:border-emerald-500"
                                        value={item.amount}
                                        onChange={(e) => handleUpdateIsmailItem(index, 'amount', Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveIsmailItem(index)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                        title="إزالة من القائمة"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsmailList(ORIGINAL_ISMAIL_LIST.map(item => ({ ...item })));
                                setSuccessMessage('تم إعادة تعيين القائمة الأصلية.');
                              }}
                              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
                            >
                              إعادة تعيين القائمة
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={handleImportIsmailList}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            >
                              {actionLoading ? 'جاري الاستيراد...' : `حفظ واستيراد كافة المستفيدين (${ismailList.length})`}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Mohamed Selim Image Import Panel */}
                {!selimImportSuccess && (
                  <div className="bg-gradient-to-br from-blue-50 to-sky-50/50 rounded-3xl p-6 border border-blue-200/60 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                          <HeartHandshake size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">استيراد كشف "تبع محمد سليم" المكتشف من الصورة</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            تم تحليل الكشف واستخراج <span className="text-blue-600 font-black">{selimList.length} مستفيدين</span> مع كامل تفاصيلهم (الاسم، الهاتف، العنوان والمبلغ). يمكنك تعديل أي حقل أو حذف أي صف مباشرة أدناه قبل إضافتهم نهائياً لقاعدة البيانات.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImportSelimPanel(!showImportSelimPanel)}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        {showImportSelimPanel ? 'إخفاء المعاينة والتعديل' : 'عرض الكشف والمعاينة والتعديل'}
                        <ChevronDown className={`transition-transform duration-200 ${showImportSelimPanel ? 'rotate-180' : ''}`} size={16} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showImportSelimPanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-4 border-t border-blue-200/40 space-y-4"
                        >
                          <div className="bg-white rounded-2xl border border-blue-200/50 shadow-inner overflow-hidden max-h-[300px] overflow-y-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase">
                                  <th className="py-3 px-4 w-[25%]">اسم المستفيد</th>
                                  <th className="py-3 px-4 w-[20%]">رقم الاتصال (الهاتف)</th>
                                  <th className="py-3 px-4 w-[35%]">العنوان وموقع التسليم</th>
                                  <th className="py-3 px-4 w-[12%]">المبلغ (ج.م)</th>
                                  <th className="py-3 px-4 text-center w-[8%]">إجراء</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-xs">
                                {selimList.map((item, index) => (
                                  <tr key={index} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                                        value={item.name}
                                        onChange={(e) => handleUpdateSelimItem(index, 'name', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-left font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                                        value={item.phone}
                                        placeholder="لا يوجد"
                                        onChange={(e) => handleUpdateSelimItem(index, 'phone', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                                        value={item.address}
                                        onChange={(e) => handleUpdateSelimItem(index, 'address', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="number"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black font-mono text-left text-slate-700 focus:outline-none focus:border-blue-500"
                                        value={item.amount}
                                        onChange={(e) => handleUpdateSelimItem(index, 'amount', Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSelimItem(index)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                        title="إزالة من القائمة"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelimList([
                                  { name: 'الجمعية الشرعية ا/ مجدي قراميط', phone: '', address: 'الجمعية الشرعية ا/ مجدي قراميط', amount: 10000 },
                                  { name: 'سمعان عامر', phone: '0100228755', address: 'بجوار مصنع راشد - بجوار محل التكاتك', amount: 500 },
                                  { name: 'ام عطيه', phone: '', address: 'شارع مجدى شطا', amount: 500 }
                                ]);
                                setSuccessMessage('تم إعادة تعيين القائمة الأصلية.');
                              }}
                              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
                            >
                              إعادة تعيين القائمة
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={handleImportSelimList}
                              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            >
                              {actionLoading ? 'جاري الاستيراد...' : `حفظ واستيراد كافة المستفيدين (${selimList.length})`}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Digital Transfers Image Import Panel */}
                {!digitalImportSuccess && (
                  <div className="bg-gradient-to-br from-indigo-50 to-violet-50/50 rounded-3xl p-6 border border-indigo-200/60 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                          <HeartHandshake size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">استيراد كشف "الحوالات الرقمية" المكتشف من الصورة</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            تم تحليل كشف الحوالات الرقمية (فودافون كاش وإنستاباي) واستخراج <span className="text-indigo-600 font-black">{digitalList.length} مستفيداً</span> بالترتيب الدقيق مع كامل تفاصيلهم. يمكنك تعديل أي حقل أو حذف أي صف مباشرة أدناه قبل إضافتهم نهائياً لقاعدة البيانات.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImportDigitalPanel(!showImportDigitalPanel)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        {showImportDigitalPanel ? 'إخفاء المعاينة والتعديل' : 'عرض الكشف والمعاينة والتعديل'}
                        <ChevronDown className={`transition-transform duration-200 ${showImportDigitalPanel ? 'rotate-180' : ''}`} size={16} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showImportDigitalPanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-4 border-t border-indigo-200/40 space-y-4"
                        >
                          <div className="bg-white rounded-2xl border border-indigo-200/50 shadow-inner overflow-hidden max-h-[450px] overflow-y-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase">
                                  <th className="py-3 px-4 w-[25%]">اسم المستفيد</th>
                                  <th className="py-3 px-4 w-[20%]">رقم الاتصال (الهاتف)</th>
                                  <th className="py-3 px-4 w-[25%]">العنوان وتفاصيل الصرف</th>
                                  <th className="py-3 px-4 w-[12%]">طريقة الصرف</th>
                                  <th className="py-3 px-4 w-[10%]">المبلغ (ج.م)</th>
                                  <th className="py-3 px-4 text-center w-[8%]">إجراء</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-xs">
                                {digitalList.map((item, index) => (
                                  <tr key={index} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                                        value={item.name}
                                        onChange={(e) => handleUpdateDigitalItem(index, 'name', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-left font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                                        value={item.phone}
                                        placeholder="لا يوجد"
                                        onChange={(e) => handleUpdateDigitalItem(index, 'phone', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                                        value={item.address}
                                        placeholder="لا يوجد"
                                        onChange={(e) => handleUpdateDigitalItem(index, 'address', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <select
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                                        value={item.method}
                                        onChange={(e) => handleUpdateDigitalItem(index, 'method', e.target.value)}
                                      >
                                        <option value="فودافون كاش">فودافون كاش</option>
                                        <option value="انستا باي">انستا باي</option>
                                      </select>
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="number"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black font-mono text-left text-slate-700 focus:outline-none focus:border-indigo-500"
                                        value={item.amount}
                                        onChange={(e) => handleUpdateDigitalItem(index, 'amount', Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveDigitalItem(index)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                        title="إزالة من القائمة"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setDigitalList(ORIGINAL_DIGITAL_LIST.map(item => ({ ...item })));
                                setSuccessMessage('تم إعادة تعيين القائمة الأصلية للتحويلات الرقمية.');
                              }}
                              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
                            >
                              إعادة تعيين القائمة
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={handleImportDigitalList}
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            >
                              {actionLoading ? 'جاري الاستيراد...' : `حفظ واستيراد كافة مستفيدي الحوالات الرقمية (${digitalList.length})`}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Moaz Image Import Panel */}
                {!moazImportSuccess && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl p-6 border border-amber-200/60 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                          <HeartHandshake size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">استيراد كشف "تبع معاذ المحاسب" المكتشف من الصورة</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            تم تحليل الكشف واستخراج <span className="text-amber-600 font-black">{moazList.length} مستفيداً</span> مع كامل تفاصيلهم (الاسم، الهاتف المرفق، العنوان والمبلغ) بالترتيب الصحيح. يمكنك تعديل أي حقل أو حذف أي صف مباشرة أدناه قبل إضافتهم نهائياً لقاعدة البيانات.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImportMoazPanel(!showImportMoazPanel)}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        {showImportMoazPanel ? 'إخفاء المعاينة والتعديل' : 'عرض الكشف والمعاينة والتعديل'}
                        <ChevronDown className={`transition-transform duration-200 ${showImportMoazPanel ? 'rotate-180' : ''}`} size={16} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showImportMoazPanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-4 border-t border-amber-200/40 space-y-4"
                        >
                          <div className="bg-white rounded-2xl border border-amber-200/50 shadow-inner overflow-hidden max-h-[300px] overflow-y-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase">
                                  <th className="py-3 px-4 w-[25%]">اسم المستفيد</th>
                                  <th className="py-3 px-4 w-[20%]">رقم الاتصال (الهاتف)</th>
                                  <th className="py-3 px-4 w-[35%]">العنوان وموقع التسليم</th>
                                  <th className="py-3 px-4 w-[12%]">المبلغ (ج.م)</th>
                                  <th className="py-3 px-4 text-center w-[8%]">إجراء</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-xs">
                                {moazList.map((item, index) => (
                                  <tr key={index} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
                                        value={item.name}
                                        onChange={(e) => handleUpdateMoazItem(index, 'name', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-left font-bold text-slate-700 focus:outline-none focus:border-amber-500"
                                        value={item.phone}
                                        placeholder="لا يوجد"
                                        onChange={(e) => handleUpdateMoazItem(index, 'phone', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="text"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
                                        value={item.address}
                                        onChange={(e) => handleUpdateMoazItem(index, 'address', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-2 px-4">
                                      <input
                                        type="number"
                                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black font-mono text-left text-slate-700 focus:outline-none focus:border-amber-500"
                                        value={item.amount}
                                        onChange={(e) => handleUpdateMoazItem(index, 'amount', Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMoazItem(index)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                        title="إزالة من القائمة"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setMoazList([
                                  { name: 'رشا ابراهيم محمد سالم سعيد', phone: '01092433992', address: 'تبع معاذ المحاسب', amount: 500 }
                                ]);
                                setSuccessMessage('تم إعادة تعيين القائمة الأصلية لـ تبع معاذ.');
                              }}
                              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
                            >
                              إعادة تعيين القائمة
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={handleImportMoazList}
                              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            >
                              {actionLoading ? 'جاري الاستيراد...' : `حفظ واستيراد كافة مستفيدي معاذ المحاسب (${moazList.length})`}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Advanced Multi-category interactive KPIs / Quick Filters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3 mt-4">
                  <button
                    onClick={() => setCategoryFilter('الكل')}
                    className={`p-3.5 rounded-2xl text-right border transition-all flex flex-col justify-between h-20 ${
                      categoryFilter === 'الكل'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700 shadow-sm'
                    }`}
                  >
                    <span className="text-[10px] font-bold opacity-80 block">كل المستفيدين</span>
                    <span className="text-sm font-black font-mono block mt-1">
                      {beneficiaries.length} فرد
                    </span>
                  </button>

                  {(['تبع معتز', 'تبع كريمة ابو العنين', 'تبع وليد العدوي', 'تبع اسماعيل نبهان', 'تبع معاذ', 'تبع محمد سليم', 'حوالات رقمية', 'أخرى'] as const).map((cat) => {
                    const count = beneficiaries.filter(b => b.category === cat).length;
                    const amount = beneficiaries.filter(b => b.category === cat).reduce((sum, b) => sum + b.monthlyAmount, 0);
                    const isActive = categoryFilter === cat;

                    return (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`p-3.5 rounded-2xl text-right border transition-all flex flex-col justify-between h-20 ${
                          isActive
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700 shadow-sm'
                        }`}
                      >
                        <span className="text-[10px] font-bold block truncate" title={cat}>{cat}</span>
                        <div className="mt-1 flex items-baseline justify-between w-full">
                          <span className="text-xs font-black font-mono">{count} فرد</span>
                          <span className="text-[9px] font-bold opacity-80 font-mono">{(amount / 1000).toFixed(1)}k ج.م</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Filter and Search Actions */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    
                    {/* Search bar */}
                    <div className="relative w-full lg:max-w-md">
                      <input
                        type="text"
                        placeholder="ابحث باسم المستفيد، رقم الهاتف، الملاحظات، أو تفاصيل الصرف..."
                        className="w-full h-11 pr-11 pl-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    </div>

                    {/* Quick controls */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`px-4 h-11 border rounded-2xl font-bold text-xs transition-all flex items-center gap-2 ${
                          showAdvancedFilters 
                            ? 'bg-blue-50 border-blue-200 text-blue-600' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Filter size={15} />
                        خيارات البحث المتقدم
                        <ChevronDown className={`transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`} size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintBeneficiariesList}
                        className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all flex items-center gap-2"
                        title="طباعة كشف المستفيدين الحالي المفلتر"
                      >
                        <Printer size={15} />
                        طباعة الكشف الحالي
                      </button>

                      <button
                        type="button"
                        onClick={handleCleanDuplicates}
                        disabled={actionLoading}
                        className="px-4 h-11 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-2xl font-bold text-xs transition-all flex items-center gap-2"
                        title="فحص وحذف الأسماء المكررة من قاعدة البيانات"
                      >
                        <Trash2 size={15} />
                        تنظيف التكرار
                      </button>

                      <button
                        onClick={handleOpenAddBeneficiary}
                        className="px-5 h-11 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
                      >
                        <UserPlus size={16} />
                        إضافة مستفيد جديد
                      </button>
                    </div>
                  </div>

                  {/* Advanced Filters Drawer/Panel */}
                  <AnimatePresence>
                    {showAdvancedFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4"
                      >
                        {/* Status Filter */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 block">حالة ملف المستفيد:</label>
                          <select
                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                          >
                            <option value="الكل">جميع الحالات</option>
                            <option value="نشط">نشط فقط (تلقائي الصرف)</option>
                            <option value="موقوف">موقوف فقط (مجمد)</option>
                          </select>
                        </div>

                        {/* Preferred payment method filter */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 block">طريقة الدفع المعتمدة:</label>
                          <select
                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                            value={methodFilter}
                            onChange={(e) => setMethodFilter(e.target.value)}
                          >
                            <option value="الكل">جميع الطرق</option>
                            <option value="ظرف مالي">ظرف مالي</option>
                            <option value="انستا باي">انستا باي</option>
                            <option value="فودافون كاش">فودافون كاش</option>
                            <option value="نقدي باليد">نقدي باليد</option>
                          </select>
                        </div>

                        {/* Amount Range: Min */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 block">الحد الأدنى للمبلغ الشهري (ج.م):</label>
                          <input
                            type="number"
                            placeholder="مثال: 200"
                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 font-mono text-left"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          />
                        </div>

                        {/* Amount Range: Max */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 block">الحد الأقصى للمبلغ الشهري (ج.م):</label>
                          <input
                            type="number"
                            placeholder="مثال: 1000"
                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 font-mono text-left"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          />
                        </div>

                        {/* Reset button inside advanced filter */}
                        <div className="md:col-span-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter('الكل');
                              setCategoryFilter('الكل');
                              setMethodFilter('الكل');
                              setMinAmount('');
                              setMaxAmount('');
                              setSearchTerm('');
                              setSelectedBeneficiaryIds([]);
                            }}
                            className="text-xs font-extrabold text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1.5"
                          >
                            إعادة تعيين كافة فلاتر البحث والخيارات المتقدمة
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Batch Action Toolbar when items are selected */}
                <AnimatePresence>
                  {selectedBeneficiaryIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg border border-slate-800 mt-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm">
                          {selectedBeneficiaryIds.length}
                        </div>
                        <div>
                          <p className="text-xs font-black">مستفيدون محددون للعمليات المجمعة</p>
                          <p className="text-[10px] text-slate-400 font-medium">يمكنك تطبيق الإجراء المالي أو الإداري على كافة المحددين دفعة واحدة.</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={() => handleBatchStatusChange('نشط')}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors"
                        >
                          تنشيط المحددين
                        </button>
                        <button
                          onClick={() => handleBatchStatusChange('موقوف')}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-colors"
                        >
                          إيقاف مجمع (تجميد)
                        </button>
                        <button
                          onClick={handleBatchDelete}
                          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-colors"
                        >
                          حذف المحددين نهائياً
                        </button>
                        <button
                          onClick={handlePrintCards}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5"
                        >
                          <Printer size={14} />
                          طباعة بطاقات
                        </button>
                        <button
                          onClick={() => setSelectedBeneficiaryIds([])}
                          className="px-3 py-2 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                        >
                          إلغاء التحديد
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Beneficiaries Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-500 uppercase">
                          <th className="py-4 px-4 text-center w-12">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                              checked={filteredBeneficiaries.length > 0 && selectedBeneficiaryIds.length === filteredBeneficiaries.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBeneficiaryIds(filteredBeneficiaries.map(b => b.id!));
                                } else {
                                  setSelectedBeneficiaryIds([]);
                                }
                              }}
                            />
                          </th>
                          <th className="py-4 px-6">المستفيد</th>
                          <th className="py-4 px-6">التصنيف</th>
                          <th className="py-4 px-6">المبلغ الشهري</th>
                          <th className="py-4 px-6">طريقة الصرف المعتمدة</th>
                          <th className="py-4 px-6">رقم الهاتف</th>
                          <th className="py-4 px-6">تفاصيل الصرف / العنوان</th>
                          <th className="py-4 px-6 text-center">الحالة</th>
                          <th className="py-4 px-6 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                        {filteredBeneficiaries.length > 0 ? (
                          filteredBeneficiaries.map((b) => (
                            <tr key={b.id} className={`hover:bg-slate-50/50 transition-all ${selectedBeneficiaryIds.includes(b.id!) ? 'bg-blue-50/30' : ''}`}>
                              <td className="py-4 px-4 text-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                  checked={selectedBeneficiaryIds.includes(b.id!)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedBeneficiaryIds([...selectedBeneficiaryIds, b.id!]);
                                    } else {
                                      setSelectedBeneficiaryIds(selectedBeneficiaryIds.filter(id => id !== b.id));
                                    }
                                  }}
                                />
                              </td>
                              <td className="py-4 px-6">
                                <div className="font-extrabold text-slate-900 text-sm">{b.name}</div>
                                {b.notes && <div className="text-[10px] text-slate-400 font-medium mt-0.5">{b.notes}</div>}
                              </td>
                              <td className="py-4 px-6">
                                <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 font-bold">{b.category}</span>
                              </td>
                              <td className="py-4 px-6">
                                <span className="font-mono text-slate-900 font-black text-sm">{b.monthlyAmount.toLocaleString()} ج.م</span>
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                                  b.paymentMethod === 'ظرف مالي' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' :
                                  b.paymentMethod === 'انستا باي' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' :
                                  b.paymentMethod === 'فودافون كاش' ? 'bg-red-50 text-red-600 border border-red-100/50' :
                                  'bg-blue-50 text-blue-600 border border-blue-100/50'
                                }`}>
                                  {b.paymentMethod === 'ظرف مالي' && <Wallet size={12} />}
                                  {b.paymentMethod === 'انستا باي' && <CreditCard size={12} />}
                                  {b.paymentMethod === 'فودافون كاش' && <Phone size={12} />}
                                  {b.paymentMethod === 'نقدي باليد' && <Coins size={12} />}
                                  {b.paymentMethod}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                {b.phone ? (
                                  <div className="font-mono bg-slate-50 px-2 py-1 rounded-lg inline-block text-slate-600 font-bold">{b.phone}</div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                {b.paymentDetails ? (
                                  <div className="font-mono bg-slate-50 px-2 py-1 rounded-lg inline-block text-slate-600 font-bold">{b.paymentDetails}</div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                  b.status === 'نشط' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleOpenEditBeneficiary(b)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                    title="تعديل"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBeneficiary(b.id!)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                    title="حذف"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400">
                              لا يوجد مستفيدين يطابقون خيارات البحث والفلترة.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Disbursement Runs & Active Session Detail Sub-Tab */}
            {(activeSubTab === 'runs' || selectedRun) && (
              <motion.div
                key="runs-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {!selectedRun ? (
                  /* List of previous runs */
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                      <h3 className="font-black text-slate-900 text-sm">أرشيف دورات الصرف الشهرية</h3>
                      <button
                        onClick={() => setShowCreateRunModal(true)}
                        className="px-5 h-10 bg-primary text-white rounded-xl font-black text-xs hover:bg-primary/90 transition-all flex items-center gap-2"
                      >
                        <Plus size={16} />
                        إنشاء وتجهيز دورة جديدة
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {disbursementRuns.length > 0 ? (
                        disbursementRuns.map((run) => {
                          const percent = run.totalAmount > 0 ? Math.round((run.paidAmount / run.totalAmount) * 100) : 0;
                          return (
                            <div 
                              key={run.id} 
                              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold block">دورة الصرف الشهرية</span>
                                  <h4 className="font-extrabold text-slate-900 text-base">شهر {run.monthYear}</h4>
                                  <span className={`inline-block mt-1 text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                    run.status === 'مكتمل بالكامل' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    run.status === 'مكتمل الجزئي' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {run.status}
                                  </span>
                                </div>

                                <div className="text-left font-mono">
                                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي مخصص الدورة</span>
                                  <span className="font-black text-slate-900 text-base">{run.totalAmount.toLocaleString()} ج.م</span>
                                </div>
                              </div>

                              <div className="space-y-1.5 mt-4">
                                <div className="flex justify-between text-xs text-slate-500 font-bold">
                                  <span>معدل الصرف والتحويل:</span>
                                  <span>{percent}% ({run.paidAmount.toLocaleString()} ج.م)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
                                </div>
                              </div>

                              <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-bold">بواسطة: {run.createdBy}</span>
                                
                                <div className="flex gap-2">
                                  {run.paidAmount === 0 && (
                                    <button
                                      onClick={() => handleDeleteDisbursementRun(run)}
                                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                      title="حذف المسودة"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setSelectedRun(run)}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                                  >
                                    دخول وتفاصيل الصرف
                                    <ChevronRight size={14} className="rotate-180" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="md:col-span-2 py-20 text-center text-slate-400">
                          <p className="text-xs font-bold">لا يوجد سجل لدورات الصرف الشهرية من قبل.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Active Single Run detailed view & distribution */
                  <div className="space-y-6">
                    {/* Run Header controls */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedRun(null)}
                          className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">دورة الصرف الجارية</span>
                          <h3 className="font-black text-slate-900 text-lg">تفاصيل دورة صرف شهر ({selectedRun.monthYear})</h3>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        <button
                          onClick={() => handlePrintEnvelopeList(selectedRun)}
                          className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-2"
                        >
                          <Printer size={14} />
                          طباعة كشف تعبئة الأظرف
                        </button>

                        {selectedRun.status !== 'مكتمل بالكامل' && (
                          <button
                            onClick={() => handleBulkPayRemaining(selectedRun)}
                            className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-emerald-600/10 flex items-center gap-2"
                          >
                            <Check className="shrink-0" size={16} />
                            صرف وتأكيد مجمع لكافة المتبقي
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress details widget */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                        <span className="text-[10px] text-slate-400 font-bold block">الخزنة المصدرية</span>
                        <span className="font-extrabold text-slate-800 text-sm mt-1 block">
                          {safes.find(s => s.id === selectedRun.safeId)?.name || 'غير محددة'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                        <span className="text-[10px] text-slate-400 font-bold block">إجمالي المستحقين المشمولين</span>
                        <span className="font-black text-slate-900 text-lg mt-1 block font-mono">
                          {selectedRun.payments.length} فرد
                        </span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                        <span className="text-[10px] text-slate-400 font-bold block">ما تم صرفه حتى الآن</span>
                        <span className="font-black text-emerald-600 text-lg mt-1 block font-mono">
                          {selectedRun.paidAmount.toLocaleString()} ج.م
                        </span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                        <span className="text-[10px] text-slate-400 font-bold block">المتبقي للصرف</span>
                        <span className="font-black text-amber-600 text-lg mt-1 block font-mono">
                          {(selectedRun.totalAmount - selectedRun.paidAmount).toLocaleString()} ج.م
                        </span>
                      </div>
                    </div>

                    {/* Distribution workspace table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                          <h4 className="font-black text-slate-800 text-sm">بيانات وحالات تسليم المستفيدين للدورة</h4>
                        </div>

                        {/* Search and view filter of payments */}
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            placeholder="بحث باسم المستفيد في الدورة..."
                            className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                            value={runSearchTerm}
                            onChange={(e) => setRunSearchTerm(e.value || e.target.value)}
                          />

                          <div className="flex bg-slate-100 p-1 rounded-lg">
                            {(['الكل', 'معلق', 'مدفوع'] as const).map((st) => (
                              <button
                                key={st}
                                onClick={() => setRunStatusFilter(st)}
                                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                                  runStatusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {st === 'الكل' ? 'كل الدفعات' : st === 'معلق' ? 'المتبقي (معلق)' : 'تم الصرف (مدفوع)'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase">
                              <th className="py-3.5 px-6">المستفيد</th>
                              <th className="py-3.5 px-6">المبلغ</th>
                              <th className="py-3.5 px-6">وسيلة الصرف المطلوبة</th>
                              <th className="py-3.5 px-6">رقم التحويل / المحفظة</th>
                              <th className="py-3.5 px-6">الحالة المالية للدورة</th>
                              <th className="py-3.5 px-6 text-center">تحديث وتأكيد الحالة المباشر</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                            {selectedRun.payments
                              .filter(p => {
                                const matchesSearch = p.beneficiaryName.toLowerCase().includes(runSearchTerm.toLowerCase());
                                const matchesStatus = runStatusFilter === 'الكل' || 
                                                      (runStatusFilter === 'معلق' && p.status === 'معلق') ||
                                                      (runStatusFilter === 'مدفوع' && p.status !== 'معلق');
                                return matchesSearch && matchesStatus;
                              })
                              .map((p) => {
                                return (
                                  <tr key={p.id} className="hover:bg-slate-50/30 transition-all">
                                    <td className="py-4 px-6">
                                      <div className="font-extrabold text-slate-900">{p.beneficiaryName}</div>
                                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{p.category} | {p.phone || 'بدون اتصال'}</div>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-slate-900 font-black">
                                      {p.amount.toLocaleString()} ج.م
                                    </td>
                                    <td className="py-4 px-6">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                        p.paymentMethod === 'ظرف مالي' ? 'bg-amber-50 text-amber-600 border border-amber-100/30' :
                                        p.paymentMethod === 'انستا باي' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30' :
                                        p.paymentMethod === 'فودافون كاش' ? 'bg-red-50 text-red-600 border border-red-100/30' :
                                        'bg-blue-50 text-blue-600 border border-blue-100/30'
                                      }`}>
                                        {p.paymentMethod}
                                      </span>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-slate-500">
                                      {p.paymentDetails || '-'}
                                    </td>
                                    <td className="py-4 px-6">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                        p.status === 'معلق' ? 'bg-amber-100 text-amber-800' :
                                        p.status === 'تم التعبئة' ? 'bg-yellow-100 text-yellow-800' :
                                        p.status === 'تم التحويل' ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {p.status}
                                      </span>
                                      {p.transactionId && (
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">رقم المعاملة: {p.transactionId}</div>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        {p.status === 'معلق' ? (
                                          <div className="flex gap-1">
                                            {p.paymentMethod === 'ظرف مالي' && (
                                              <button
                                                onClick={() => handleUpdatePaymentStatus(selectedRun, p.id, 'تم التعبئة')}
                                                disabled={actionLoading}
                                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-black text-[10px] transition-colors"
                                              >
                                                تعبئة الظرف
                                              </button>
                                            )}

                                            {(p.paymentMethod === 'انستا باي' || p.paymentMethod === 'فودافون كاش') && (
                                              <button
                                                onClick={() => {
                                                  const txId = prompt(`أدخل كود المعاملة أو رقم العملية المرجعي لتأكيد التحويل لـ ${p.beneficiaryName}:`);
                                                  if (txId !== null) {
                                                    handleUpdatePaymentStatus(selectedRun, p.id, 'تم التحويل', txId);
                                                  }
                                                }}
                                                disabled={actionLoading}
                                                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-black text-[10px] transition-colors"
                                              >
                                                تأكيد التحويل
                                              </button>
                                            )}

                                            {(p.paymentMethod === 'نقدي باليد' || p.paymentMethod === 'ظرف مالي') && (
                                              <button
                                                onClick={() => handleUpdatePaymentStatus(selectedRun, p.id, 'تم التسليم')}
                                                disabled={actionLoading}
                                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[10px] transition-colors"
                                              >
                                                تسليم باليد
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              if (window.confirm('هل تريد إلغاء تأكيد صرف هذه الدفعة وإرجاع رصيدها للخزنة؟')) {
                                                handleUpdatePaymentStatus(selectedRun, p.id, 'معلق');
                                              }
                                            }}
                                            disabled={actionLoading}
                                            className="px-2 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-lg text-[10px] font-bold transition-all"
                                          >
                                            إلغاء التأكيد وإرجاع
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* MODAL: Add/Edit Beneficiary */}
      <AnimatePresence>
        {showAddBeneficiaryModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-base">
                  {editingBeneficiary ? 'تعديل بيانات المستفيد' : 'إضافة مستفيد جديد للشهريات'}
                </h3>
                <button 
                  onClick={() => setShowAddBeneficiaryModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveBeneficiary} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-600 block">اسم المستفيد الكامل:</label>
                  <input
                    type="text"
                    required
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-primary"
                    placeholder="مثال: محمد أحمد علي"
                    value={beneficiaryForm.name}
                    onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">الفئة / التصنيف:</label>
                    <select
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                      value={beneficiaryForm.category}
                      onChange={(e: any) => setBeneficiaryForm({ ...beneficiaryForm, category: e.target.value })}
                    >
                      <option value="تبع معتز">تبع معتز</option>
                      <option value="تبع كريمة ابو العنين">تبع كريمة ابو العنين</option>
                      <option value="تبع وليد العدوي">تبع وليد العدوي</option>
                      <option value="تبع اسماعيل نبهان">تبع اسماعيل نبهان</option>
                      <option value="تبع معاذ">تبع معاذ</option>
                      <option value="تبع محمد سليم">تبع محمد سليم</option>
                      <option value="حوالات رقمية">حوالات رقمية</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">رقم الاتصال (الهاتف):</label>
                    <input
                      type="text"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 font-mono text-left"
                      placeholder="01xxxxxxxxx"
                      value={beneficiaryForm.phone}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">المبلغ المالي الشهري (ج.م):</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 font-mono text-left"
                      value={beneficiaryForm.monthlyAmount || ''}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, monthlyAmount: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">قناة وصيغة الدفع المعتمدة:</label>
                    <select
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                      value={beneficiaryForm.paymentMethod}
                      onChange={(e: any) => setBeneficiaryForm({ ...beneficiaryForm, paymentMethod: e.target.value })}
                    >
                      <option value="ظرف مالي">تعبئة ظرف مالي (كاش)</option>
                      <option value="انستا باي">تحويل انستا باي (InstaPay)</option>
                      <option value="فودافون كاش">تحويل محفظة فودافون كاش</option>
                      <option value="نقدي باليد">تسليم نقدي باليد مباشرة</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-600 block">تفاصيل حساب الدفع (العنوان / رقم المحفظة):</label>
                  <input
                    type="text"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                    placeholder="مثال: عنوان InstaPay أو رقم محفظة الكاش المستلمة"
                    value={beneficiaryForm.paymentDetails}
                    onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, paymentDetails: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">حالة المستفيد الحالية:</label>
                    <select
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                      value={beneficiaryForm.status}
                      onChange={(e: any) => setBeneficiaryForm({ ...beneficiaryForm, status: e.target.value })}
                    >
                      <option value="نشط">نشط (مدرج بالصرف التلقائي)</option>
                      <option value="موقوف">موقوف (مجمد مؤقتاً)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">ملاحظات إضافية:</label>
                    <input
                      type="text"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      placeholder="مثل: صلة القرابة، الحالة الصحية، إلخ"
                      value={beneficiaryForm.notes}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setShowAddBeneficiaryModal(false)}
                    className="flex-1 h-11 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                    حفظ المستفيد
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Create New Disbursement Run */}
      <AnimatePresence>
        {showCreateRunModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-xl border border-slate-100 w-full max-w-md overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-base">تجهيز دورة صرف جديدة كلياً</h3>
                <button 
                  onClick={() => setShowCreateRunModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-xs font-bold text-slate-500">عدد المستفيدين المستحقين حالياً:</p>
                  <p className="text-base font-black text-slate-900">{totalActiveBeneficiaries} فرد نشط مدرجين بقوائم الدفع.</p>
                  <p className="text-xs font-bold text-primary">المبالغ المطلوبة إجمالاً: {totalMonthlyAllocations.toLocaleString()} ج.م</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-600 block">حدد شهر وسنة الدورة:</label>
                  <input
                    type="month"
                    required
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 font-mono text-left"
                    value={runMonth}
                    onChange={(e) => setRunMonth(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-600 block">حدد الخزنة المصرفية لصرف المبالغ منها:</label>
                  <select
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                    value={selectedSafeId}
                    onChange={(e) => setSelectedSafeId(e.target.value)}
                  >
                    {safes.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (الرصيد: {s.balance.toLocaleString()} ج.م)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setShowCreateRunModal(false)}
                    className="flex-1 h-11 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleCreateDisbursementRun}
                    disabled={actionLoading || safes.length === 0}
                    className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                    توليد وتأكيد الدورة
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
