import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderTree, 
  ChevronDown, 
  ChevronRight, 
  Wallet, 
  Building2, 
  TrendingUp, 
  Receipt, 
  Calculator,
  Search,
  Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Safe, SafeTransaction, Item, Supplier } from '../types';

export interface AccountNode {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance?: number;
  children?: AccountNode[];
}

export const defaultChartOfAccounts: AccountNode[] = [
  {
    id: '1',
    code: '1000',
    name: 'الأصول (Assets)',
    type: 'asset',
    children: [
      {
        id: '11',
        code: '1100',
        name: 'الأصول الثابتة',
        type: 'asset',
        children: [
          { id: '111', code: '1101', name: 'آلات ومعدات تصنيع (ماكينات، تخانات، حلية)', type: 'asset', balance: 0 },
          { id: '112', code: '1102', name: 'عدد وأدوات ومناشير', type: 'asset', balance: 0 },
          { id: '113', code: '1103', name: 'سيارات نقل الأثاث', type: 'asset', balance: 0 },
          { id: '114', code: '1104', name: 'مباني وتجهيزات المصنع والمعارض', type: 'asset', balance: 0 }
        ]
      },
      {
        id: '12',
        code: '1200',
        name: 'الأصول المتداولة',
        type: 'asset',
        children: [
          { id: '121', code: '1201', name: 'النقدية بالخزينة', type: 'asset', balance: 0 },
          { id: '122', code: '1202', name: 'النقدية بالبنوك', type: 'asset', balance: 0 }
        ]
      },
      {
        id: '13',
        code: '1300',
        name: 'المخزون',
        type: 'asset',
        children: [
          { id: '131', code: '1301', name: 'مخزون خامات (أخشاب، أقمشة، إسفنج، بويات)', type: 'asset', balance: 0 },
          { id: '132', code: '1302', name: 'إنتاج تحت التشغيل (WIP)', type: 'asset', balance: 0 },
          { id: '133', code: '1303', name: 'منتجات تامة (أثاث جاهز)', type: 'asset', balance: 0 }
        ]
      },
      {
        id: '14',
        code: '1400',
        name: 'العملاء وأوراق القبض',
        type: 'asset',
        children: [
          { id: '141', code: '1401', name: 'عملاء الجملة والتجار', type: 'asset', balance: 0 },
          { id: '142', code: '1402', name: 'عملاء المعارض (التجزئة)', type: 'asset', balance: 0 }
        ]
      }
    ]
  },
  {
    id: '2',
    code: '2000',
    name: 'الخصوم (Liabilities)',
    type: 'liability',
    children: [
      {
        id: '21',
        code: '2100',
        name: 'الخصوم المتداولة',
        type: 'liability',
        children: [
          { id: '211', code: '2101', name: 'موردين خامات (أخشاب، أبلكاش)', type: 'liability', balance: 0 },
          { id: '212', code: '2102', name: 'موردين إكسسوارات وبويات', type: 'liability', balance: 0 },
          { id: '213', code: '2103', name: 'أجور صنايعية ومقاولين مستحقة', type: 'liability', balance: 0 }
        ]
      }
    ]
  },
  {
    id: '3',
    code: '3000',
    name: 'حقوق الملكية (Equity)',
    type: 'equity',
    children: [
      { id: '31', code: '3001', name: 'رأس المال', type: 'equity', balance: 0 },
      { id: '32', code: '3002', name: 'الأرباح المحتجزة', type: 'equity', balance: 0 }
    ]
  },
  {
    id: '4',
    code: '4000',
    name: 'الإيرادات (Revenues)',
    type: 'revenue',
    children: [
      { id: '41', code: '4001', name: 'إيرادات مبيعات أثاث', type: 'revenue', balance: 0 },
      { id: '42', code: '4002', name: 'إيرادات مبيعات مخلفات (نشارة، هالك خشب)', type: 'revenue', balance: 0 }
    ]
  },
  {
    id: '5',
    code: '5000',
    name: 'التكاليف والمصروفات (Expenses)',
    type: 'expense',
    children: [
      {
        id: '51',
        code: '5100',
        name: 'تكاليف صناعية مباشرة',
        type: 'expense',
        children: [
          { id: '511', code: '5101', name: 'تكلفة الخامات المستخدمة', type: 'expense', balance: 0 },
          { id: '512', code: '5102', name: 'أجور عمالة الإنتاج والصنايعية', type: 'expense', balance: 0 }
        ]
      },
      {
        id: '52',
        code: '5200',
        name: 'تكاليف صناعية غير مباشرة (Overhead)',
        type: 'expense',
        children: [
          { id: '521', code: '5201', name: 'كهرباء وطاقة المصنع', type: 'expense', balance: 0 },
          { id: '522', code: '5202', name: 'صيانة الآلات وقطع الغيار', type: 'expense', balance: 0 },
          { id: '523', code: '5203', name: 'إيجار المصنع والمخازن', type: 'expense', balance: 0 }
        ]
      },
      {
        id: '53',
        code: '5300',
        name: 'مصروفات إدارية وتسويقية',
        type: 'expense',
        children: [
          { id: '531', code: '5301', name: 'عمولات مبيعات وتسويق إلكتروني', type: 'expense', balance: 0 },
          { id: '532', code: '5302', name: 'نولون ونقل ومشال', type: 'expense', balance: 0 },
          { id: '533', code: '5303', name: 'رواتب إدارية ومصروفات ضيافة', type: 'expense', balance: 0 }
        ]
      }
    ]
  }
];

export const flattenAccounts = (nodes: AccountNode[]): AccountNode[] => {
  let list: AccountNode[] = [];
  nodes.forEach(node => {
    list.push(node);
    if (node.children) {
      list = list.concat(flattenAccounts(node.children));
    }
  });
  return list;
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'asset': return <Building2 size={16} className="text-blue-500" />;
    case 'liability': return <Wallet size={16} className="text-rose-500" />;
    case 'equity': return <TrendingUp size={16} className="text-emerald-500" />;
    case 'revenue': return <Receipt size={16} className="text-indigo-500" />;
    case 'expense': return <Calculator size={16} className="text-amber-500" />;
    default: return <FolderTree size={16} className="text-slate-500" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'asset': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'liability': return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'equity': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'revenue': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'expense': return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'asset': return 'أصل';
    case 'liability': return 'خصوم';
    case 'equity': return 'ملكية';
    case 'revenue': return 'إيراد';
    case 'expense': return 'مصروف';
    default: return 'حساب';
  }
};

const AccountTree: React.FC<{ node: AccountNode, level?: number, searchTerm?: string }> = ({ node, level = 0, searchTerm = '' }) => {
  const [isExpanded, setIsExpanded] = useState(level < 1 || searchTerm.length > 0);
  
  const hasChildren = node.children && node.children.length > 0;
  const isMatch = searchTerm && (node.name.includes(searchTerm) || node.code.includes(searchTerm));
  
  // Auto-expand if search matches children
  React.useEffect(() => {
    if (searchTerm) setIsExpanded(true);
  }, [searchTerm]);

  return (
    <div className="w-full">
      <div 
        className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${isMatch ? 'border-primary shadow-sm bg-primary/5' : 'border-transparent hover:bg-slate-50'} ${level === 0 ? 'bg-slate-50/50 border-slate-100 mb-2' : ''}`}
        style={{ paddingRight: `${(level * 1.5) + 0.75}rem` }}
      >
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1 rounded-lg transition-colors ${hasChildren ? 'hover:bg-slate-200 text-slate-600' : 'opacity-0 cursor-default'}`}
          disabled={!hasChildren}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="flex items-center gap-2 flex-1">
          {getTypeIcon(node.type)}
          <span className="font-mono text-sm font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            {node.code}
          </span>
          <span className={`font-bold ${level === 0 ? 'text-lg text-slate-800' : 'text-slate-700'}`}>
            {node.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`text-[10px] font-bold px-2 ${getTypeColor(node.type)}`}>
            {getTypeLabel(node.type)}
          </Badge>
          {node.balance !== undefined && (
            <div className="text-left min-w-[100px]">
              <span className="font-mono font-bold text-slate-700">
                {node.balance.toLocaleString('ar-EG')} <span className="text-xs text-slate-400">ج.م</span>
              </span>
            </div>
          )}
          {!hasChildren && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary rounded-full">
              <Plus size={14} />
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {node.children!.map((child) => (
              <AccountTree key={child.id} node={child} level={level + 1} searchTerm={searchTerm} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function ChartOfAccountsView({
  safes = [],
  safeTransactions = [],
  items = [],
  suppliers = [],
  safeSettlements = []
}: {
  safes?: Safe[],
  safeTransactions?: SafeTransaction[],
  items?: Item[],
  suppliers?: Supplier[],
  safeSettlements?: any[]
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate real balances dynamically
  const computedChart = React.useMemo(() => {
    // Helper function to deep clone the chart
    const cloneChart = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => ({
        ...node,
        children: node.children ? cloneChart(node.children) : undefined
      }));
    };

    const chart = cloneChart(defaultChartOfAccounts);

    // Calculate leaf node balances based on existing data:
    let totalCash = safes.reduce((sum, s) => sum + s.balance, 0);
    let totalInventory = items.reduce((sum, i) => sum + ((i.currentBalance || 0) * (i.price || 0)), 0);
    let totalSuppliers = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
    
    // Accumulate transaction balances into their linked accounts
    const accountBalances: Record<string, number> = {};
    safeTransactions.forEach(tx => {
      // Don't double count if it's a settlement transaction
      if (tx.category === 'تسوية عهد') return;
      
      if (tx.accountId) {
        const amount = Number(tx.amount) || 0;
        if (!accountBalances[tx.accountId]) accountBalances[tx.accountId] = 0;
        accountBalances[tx.accountId] += amount;
      }
    });

    // Accumulate settlement line items
    safeSettlements.forEach(settlement => {
      if (Array.isArray(settlement.expenses)) {
        settlement.expenses.forEach((expense: any) => {
          if (expense.accountId) {
            const amount = Number(expense.amount) || 0;
            if (!accountBalances[expense.accountId]) accountBalances[expense.accountId] = 0;
            accountBalances[expense.accountId] += amount;
          }
        });
      }
    });

    // Helper to traverse and assign balances
    const applyBalances = (nodes: AccountNode[]): number => {
      let total = 0;
      nodes.forEach(node => {
        let nodeBalance = 0;
        if (node.children) {
          nodeBalance = applyBalances(node.children);
        } else {
          // Leaf nodes specific manual overrides based on system state
          if (node.code === '1201') {
            nodeBalance = totalCash;
          } else if (node.code === '1301') {
            nodeBalance = totalInventory;
          } else if (node.code === '2101') {
            nodeBalance = totalSuppliers;
          } else if (accountBalances[node.code]) {
            nodeBalance = accountBalances[node.code];
          } else {
            nodeBalance = 0; // Default
          }
        }
        node.balance = nodeBalance;
        total += nodeBalance;
      });
      return total;
    };

    applyBalances(chart);
    return chart;
  }, [safes, safeTransactions, items, suppliers, safeSettlements]);

  // Aggregate root types for the cards
  const summary = React.useMemo(() => {
    const sum = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 };
    computedChart.forEach(root => {
      if (root.type in sum) {
        sum[root.type as keyof typeof sum] += root.balance || 0;
      }
    });
    return sum;
  }, [computedChart]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 border-none text-white text-[10px] font-bold py-0.5 px-2 rounded-md">
              هيكلة احترافية
            </Badge>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">الدليل المحاسبي (شجرة الحسابات)</h2>
          </div>
          <p className="text-sm font-semibold text-slate-500">
            شجرة حسابات مبنية وفق المعايير المحاسبية المخصصة لمصانع الأثاث لربط التكاليف والمصروفات.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input 
              placeholder="بحث برقم أو اسم الحساب..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 w-64 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all font-bold"
            />
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg gap-2 font-bold">
            <Plus size={16} /> حساب جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-[14px] border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600/70 mb-0.5">الأصول</p>
              <h3 className="font-black text-xl text-blue-900">{summary.asset.toLocaleString('ar-EG')}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[14px] border-none shadow-sm bg-rose-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-600/70 mb-0.5">الخصوم</p>
              <h3 className="font-black text-xl text-rose-900">{summary.liability.toLocaleString('ar-EG')}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[14px] border-none shadow-sm bg-indigo-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Receipt size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-600/70 mb-0.5">الإيرادات</p>
              <h3 className="font-black text-xl text-indigo-900">{summary.revenue.toLocaleString('ar-EG')}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[14px] border-none shadow-sm bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Calculator size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600/70 mb-0.5">المصروفات</p>
              <h3 className="font-black text-xl text-amber-900">{summary.expense.toLocaleString('ar-EG')}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <div className="p-6">
          <div className="bg-slate-50/50 rounded-[14px] p-2 border border-slate-100">
            {computedChart.map(node => (
              <AccountTree key={node.id} node={node} searchTerm={searchTerm} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
