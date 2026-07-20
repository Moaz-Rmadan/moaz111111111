#!/bin/bash
sed -i 's/<Select value={typeFilter} onValueChange={setTypeFilter}>/<select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50">/g' src/components/CustomersManager.tsx

sed -i 's/<Select value={formData.type} onValueChange={(val: any) => setFormData({\.\.\.formData, type: val})}>/<select value={formData.type} onChange={(e: any) => setFormData({...formData, type: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50">/g' src/components/CustomersManager.tsx

sed -i 's/<Select value={formData.status} onValueChange={(val: any) => setFormData({\.\.\.formData, status: val})}>/<select value={formData.status} onChange={(e: any) => setFormData({...formData, status: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50">/g' src/components/CustomersManager.tsx

sed -i 's/<Select value={paymentData.customerId} onValueChange={(val) => {/<select value={paymentData.customerId} onChange={(e: any) => { const val = e.target.value;/g' src/components/CustomersManager.tsx

sed -i 's/<Select value={paymentData.paymentMethod} onValueChange={(val: any) => setPaymentData({\.\.\.paymentData, paymentMethod: val})}>/<select value={paymentData.paymentMethod} onChange={(e: any) => setPaymentData({...paymentData, paymentMethod: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50">/g' src/components/CustomersManager.tsx

sed -i 's/<Select value={paymentData.safeId} onValueChange={(val) => setPaymentData({\.\.\.paymentData, safeId: val})}>/<select value={paymentData.safeId} onChange={(e: any) => setPaymentData({...paymentData, safeId: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50">/g' src/components/CustomersManager.tsx

sed -i 's/<\/Select>/<\/select>/g' src/components/CustomersManager.tsx
sed -i 's/<SelectTrigger.*//g' src/components/CustomersManager.tsx
sed -i 's/<SelectValue.*//g' src/components/CustomersManager.tsx
sed -i 's/<\/SelectTrigger>//g' src/components/CustomersManager.tsx
sed -i 's/<SelectContent>//g' src/components/CustomersManager.tsx
sed -i 's/<\/SelectContent>//g' src/components/CustomersManager.tsx

sed -i 's/<SelectItem value=/<option value=/g' src/components/CustomersManager.tsx
sed -i 's/<\/SelectItem>/<\/option>/g' src/components/CustomersManager.tsx
sed -i 's/<SelectItem key=/<option key=/g' src/components/CustomersManager.tsx

