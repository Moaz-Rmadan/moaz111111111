import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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
    crNumber?: string;
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
  const companyPhone = companyInfo?.phone;
  const taxId = companyInfo?.taxId;
  const printDateStr = format(new Date(), 'yyyy/MM/dd - HH:mm', { locale: ar });
  const generatedDocNo = docNumber || `DOC-${format(new Date(), 'yyyyMMdd-HHmm')}`;

  return (
    <div className={`hidden print:block text-slate-900 pb-2 mb-3 border-b-2 border-slate-800 ${className}`} dir="rtl">
      {/* Sleek, Clean & Minimal Accounting Header */}
      <div className="flex justify-between items-center gap-4">
        {/* Company Info */}
        <div className="text-right">
          <h1 className="text-base font-extrabold text-slate-950 tracking-tight leading-tight">
            {companyName}
          </h1>
          <div className="text-[9px] font-bold text-slate-500 flex items-center gap-2 mt-0.5">
            <span>إدارة الحسابات وشؤون العاملين</span>
            {taxId && <span>• ب.ض: {taxId}</span>}
            {companyPhone && <span>• هاتف: {companyPhone}</span>}
          </div>
        </div>

        {/* Document Title & Period */}
        <div className="text-center flex-1">
          <h2 className="text-sm font-black text-slate-950 uppercase tracking-wide">
            {title}
          </h2>
          {(subtitle || periodText) && (
            <p className="text-[10px] font-bold text-slate-600 mt-0.5">
              {periodText ? `الفترة: ${periodText}` : subtitle}
            </p>
          )}
        </div>

        {/* Date & Document Ref */}
        <div className="text-left text-[9px] font-bold text-slate-500 space-y-0.5">
          <div>التاريخ: <span className="font-mono text-slate-800">{printDateStr}</span></div>
          <div>رقم المستند: <span className="font-mono text-slate-800">{generatedDocNo}</span></div>
        </div>
      </div>

      {/* Optional Minimal Inline Summary (Only if KPIs exist, single clean row without bulky boxes) */}
      {kpis.length > 0 && (
        <div className="mt-2 pt-1.5 border-t border-slate-300 flex flex-wrap items-center justify-between text-[10px] font-bold text-slate-700 bg-slate-50/80 px-2 py-1 rounded">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-slate-500">{kpi.label}:</span>
              <span className="font-mono font-black text-slate-900">{kpi.value}</span>
              {idx < kpis.length - 1 && <span className="text-slate-300 mr-2">|</span>}
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
  preparedByTitle = 'المسؤول المالي / إعداد',
  preparedByName,
  auditedByTitle = 'المراجعة والتدقيق',
  approvedByTitle = 'اعتماد الإدارة العامة',
  notes,
  className = '',
}) => {
  return (
    <div className={`hidden print:block mt-4 pt-2 border-t border-slate-400 text-slate-900 break-inside-avoid ${className}`} dir="rtl">
      {/* Simple Tafqeet (Amount in Words) */}
      {tafqeetText && (
        <div className="mb-2 text-[10px] font-bold text-slate-800 text-right">
          <span className="text-slate-500 ml-1">المبلغ الإجمالي بالحروف:</span>
          <span className="font-black text-slate-950 font-sans">فقط وقدره {tafqeetText} لا غير.</span>
        </div>
      )}

      {notes && (
        <div className="mb-2 text-[9px] font-bold text-slate-600 text-right">
          <span className="text-slate-400 ml-1">ملاحظات:</span> {notes}
        </div>
      )}

      {/* Clean 3 Signature Lines (Simple, Elegant, Clean Paper) */}
      <div className="grid grid-cols-3 gap-6 pt-3 text-center text-[10px] font-bold text-slate-800">
        <div className="flex flex-col items-center">
          <span className="mb-4">{preparedByTitle}</span>
          <span className="text-slate-400 font-mono text-[9px]">التوقيع: ............................</span>
          {preparedByName && <span className="text-[9px] text-slate-600 mt-1">{preparedByName}</span>}
        </div>

        <div className="flex flex-col items-center">
          <span className="mb-4">{auditedByTitle}</span>
          <span className="text-slate-400 font-mono text-[9px]">التوقيع: ............................</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="mb-4">{approvedByTitle}</span>
          <span className="text-slate-400 font-mono text-[9px]">التوقيع: ............................</span>
        </div>
      </div>

      {/* Tiny Clean Footer */}
      <div className="mt-3 pt-1 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-medium">
        <span>مستند محاسبي رسمي مستخرج آلياً من المنظومة</span>
        <span>صفحة معتمدة</span>
      </div>
    </div>
  );
};

export default PrintHeader;
