import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Item, Warehouse, Purchase, Issuance, Waste } from '../types';
import { Box, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';

interface InventoryReportsProps {
  items: Item[];
  warehouses: Warehouse[];
  purchases: Purchase[];
  issuances: Issuance[];
  wasteRecords: Waste[];
}

export function InventoryReports({ items, warehouses, purchases, issuances, wasteRecords }: InventoryReportsProps) {
  
  // Inventory Value and Totals
  const totalValue = useMemo(() => items.reduce((sum, item) => sum + (item.price * item.openingBalance), 0), [items]);
  const totalItems = useMemo(() => items.length, [items]);

  // Inventory by Warehouse
  const inventoryByWarehouse = useMemo(() => {
    return warehouses.map(w => {
      const warehouseItems = items.filter(i => i.warehouseId === w.id);
      return {
        name: w.name,
        value: warehouseItems.reduce((sum, i) => sum + (i.price * i.openingBalance), 0)
      };
    });
  }, [items, warehouses]);

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#10b981', '#34d399', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">إجمالي قيمة المخزون</CardTitle>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">عدد الأصناف</CardTitle>
            <Box className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>توزيع المخزون حسب المستودع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={inventoryByWarehouse} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                    {inventoryByWarehouse.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>الأصناف ذات القيمة العالية</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>الصنف</TableHead>
                   <TableHead className="text-right">الكمية</TableHead>
                   <TableHead className="text-right">القيمة</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {items.sort((a,b) => (b.price * b.openingBalance) - (a.price * a.openingBalance)).slice(0, 5).map(item => (
                   <TableRow key={item.id}>
                     <TableCell>{item.name}</TableCell>
                     <TableCell className="text-right">{item.openingBalance}</TableCell>
                     <TableCell className="text-right">{(item.price * item.openingBalance).toLocaleString('ar-EG')}</TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
