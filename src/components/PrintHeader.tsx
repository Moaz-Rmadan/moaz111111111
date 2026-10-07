import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Building2, Phone, MapPin, Hash, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface PrintKPI {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  periodText?: string;
  docNumber?: string;
  companyInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    taxId?: string;
    logoUrl?: string;
    managerName?: string;
  };
  kpis?: PrintKPI[];
  className?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  title,
  subtitle,
  periodText,
  docNumber,
  companyInfo,
  kpis = [],
  className = '',
}) => {
  const companyName = companyInfo?.name || 'مصنع النجار للأثاث الراقي';
  const companyAddress = companyInfo?.address || 'دمياط - المنطقة الصناعية';
  const companyPhone = companyInfo?.phone || '01000000000';
  const taxId = companyInfo?.taxId || '123-456-789';
  const printDateStr = format(new Date(), 'yyyy/MM/dd - HH:mm', { locale: ar });

  return (
    <div className={`hidden print:block text-slate-900 pb-5 mb-5 border-b-2 border-slate-900 ${className}`} dir="rtl">
      {/* Top Main Letterhead */}
      <div className="flex justify-between items-start gap-4">
        {/* Company Identity (Right Side in RTL) */}
        <div className="space-y-1 text-right max-w-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
              <Building2 size={16} />
            </div>
            <h1 className="text-xl font-black text-slate-950 tracking-tight leading-none">
              {companyName}
            </h1>
          </div>
          <p className="text-[11px] font-bold text-slate-600 leading-tight">
            صناعة الأثاث والمشروعات الفندقية والتوريدات العامة
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500 pt-1">
            {companyAddress && (
              <span className="flex items-center gap-1">
                <MapPin size={10} className="text-slate-400" />
                {companyAddress}
              </span>
            )}
            {companyPhone && (
              <span className="flex items-center gap-1 font-mono">
                <Phone size={10} className="text-slate-400" />
                {companyPhone}
              </span>
            )}
            {taxId && (
              <span className="flex items-center gap-1 font-mono">
                <Hash size={10} className="text-slate-400" />
                السجل: {taxId}
              </span>
            )}
          </div>
        </div>

        {/* Center Report Title & Badge */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="border-2 border-slate-900 rounded-xl px-6 py-2 bg-slate-50/80 shadow-xs">
            <h2 className="text-lg font-black text-slate-950 tracking-wide">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {periodText && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-700">
              <span>الفترة:</span>
              <span className="font-mono">{periodText}</span>
            </div>
          )}
        </div>

        {/* Left Side: Metadata & Official Badge */}
        <div className="text-left space-y-1.5 min-w-[140px] shrink-0">
          {companyInfo?.logoUrl ? (
            <img
              src={companyInfo.logoUrl}
              alt="Logo"
              className="h-12 w-auto object-contain ml-auto"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>نظام إداري معتمد</span>
            </div>
          )}
          <div className="text-[10px] font-bold text-slate-500 space-y-0.5 pt-1">
            <div>تاريخ الاستخراج: <span className="font-mono text-slate-800">{printDateStr}</span></div>
            {docNumber && <div>رقم المستند: <span className="font-mono text-slate-900 font-black">{docNumber}</span></div>}
            <div className="flex items-center gap-1 text-emerald-700 font-black">
              <CheckCircle2 size={10} />
              <span>بيانات رسمية مدققة</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Financial & Quantitative Summary Strip (if provided) */}
      {kpis.length > 0 && (
        <div className={`grid grid-cols-${Math.min(kpis.length, 5)} gap-2.5 mt-4 pt-3 border-t border-slate-200`}>
          {kpis.map((kpi, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-center ${
                kpi.highlight
                  ? 'bg-slate-100 border-slate-400 text-slate-950 font-black'
                  : 'bg-slate-50/60 border-slate-200 text-slate-800'
              }`}
            >
              <div className="text-[10px] font-bold text-slate-500 mb-0.5">{kpi.label}</div>
              <div className="text-sm font-black font-mono tracking-tight text-slate-950">
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export interface PrintSignaturesProps {
  tafqeetText?: string;
  preparedByTitle?: string;
  preparedByName?: string;
  auditedByTitle?: string;
  approvedByTitle?: string;
  notes?: string;
  className?: string;
}

export const PrintSignatures: React.FC<PrintSignaturesProps> = ({
  tafqeetText,
  preparedByTitle = 'إعداد / المحاسب المسؤول',
  preparedByName,
  auditedByTitle = 'المراجعة والتدقيق المالي',
  approvedByTitle = 'اعتماد الإدارة / المدير العام',
  notes,
  className = '',
}) => {
  return (
    <div className={`hidden print:block mt-6 pt-4 border-t-2 border-slate-900 text-slate-900 break-inside-avoid ${className}`} dir="rtl">
      {/* Tafqeet & Monetary Confirmation */}
      {tafqeetText && (
        <div className="mb-4 p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-right">
          <span className="text-[11px] font-black text-slate-500 ml-2">المبلغ بالحروف:</span>
          <span className="text-xs font-black text-slate-900">{tafqeetText}</span>
        </div>
      )}

      {notes && (
        <div className="mb-3 text-[11px] font-bold text-slate-600 text-right">
          <span className="text-slate-400 ml-1">ملاحظات:</span> {notes}
        </div>
      )}

      {/* Official Signatures Grid */}
      <div className="grid grid-cols-4 gap-4 mt-6 text-center">
        {/* Slot 1: Prepared By */}
        <div className="border border-slate-300 rounded-xl p-3 bg-white space-y-8">
          <div className="text-xs font-black text-slate-900">{preparedByTitle}</div>
          {preparedByName ? (
            <div className="text-xs font-bold text-slate-700">{preparedByName}</div>
          ) : (
            <div className="text-[10px] text-slate-400">التوقيع: ........................</div>
          )}
        </div>

        {/* Slot 2: Audited By */}
        <div className="border border-slate-300 rounded-xl p-3 bg-white space-y-8">
          <div className="text-xs font-black text-slate-900">{auditedByTitle}</div>
          <div className="text-[10px] text-slate-400">التوقيع: ........................</div>
        </div>

        {/* Slot 3: Approved By */}
        <div className="border border-slate-300 rounded-xl p-3 bg-white space-y-8">
          <div className="text-xs font-black text-slate-900">{approvedByTitle}</div>
          <div className="text-[10px] text-slate-400">التوقيع: ........................</div>
        </div>

        {/* Slot 4: Company Seal */}
        <div className="border-2 border-dashed border-slate-400 rounded-xl p-3 flex flex-col items-center justify-center min-h-[90px] bg-slate-50/50">
          <span className="text-[11px] font-black text-slate-400">خاتم المنشأة الرسمي</span>
        </div>
      </div>

      {/* Security Footer Watermark */}
      <div className="mt-5 pt-3 border-t border-slate-200 flex justify-between items-center text-[9px] font-bold text-slate-400">
        <span>وثيقة إلكترونية محاسبية رسمية مستخرجة آلياً من نظام إدارة الموارد المتكامل (ERP)</span>
        <span>صفحة 1 من 1</span>
        <span>الاعتماد سارٍ بموجب اللائحة المالية الداخلية</span>
      </div>
    </div>
  );
};

export default PrintHeader;
