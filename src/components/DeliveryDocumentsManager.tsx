import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, FileText, CheckCircle2, Truck, Calendar, User, UserCheck, Edit2, Trash2, AlertCircle, PenTool } from 'lucide-react';
import { DeliveryDocument, DeliveryItem } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { TouchSignaturePad } from './TouchSignaturePad';
import { TouchStepper } from './TouchStepper';

export const DeliveryDocumentsManager = () => {
  const [documents, setDocuments] = useState<DeliveryDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewingDoc, setIsViewingDoc] = useState<DeliveryDocument | null>(null);
  const [signatureModal, setSignatureModal] = useState<{
    open: boolean;
    signerRole: 'recipient' | 'driver';
    signerName: string;
  } | null>(null);

  const handleSaveSignature = async (signatureDataUrl: string) => {
    if (!signatureModal || !isViewingDoc) return;
    try {
      const fieldToUpdate = signatureModal.signerRole === 'recipient' ? 'recipientSignature' : 'driverSignature';
      await updateDoc(doc(db, 'deliveryDocuments', isViewingDoc.id), {
        [fieldToUpdate]: signatureDataUrl,
        signature: signatureDataUrl
      });
      setIsViewingDoc(prev => prev ? { ...prev, [fieldToUpdate]: signatureDataUrl } : null);
      setSignatureModal(null);
    } catch (err) {
      console.error('Error saving signature:', err);
    }
  };

  const [newDoc, setNewDoc] = useState<Partial<DeliveryDocument>>({
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    vehicleDetails: '',
    driverName: '',
    recipientName: '',
    notes: '',
    items: [],
  });

  const [newItem, setNewItem] = useState<DeliveryItem>({
    orderNumber: '',
    productName: '',
    requestedQuantity: 1,
    deliveredQuantity: 1,
    remainingQuantity: 0,
  });

  useEffect(() => {
    const q = query(collection(db, 'deliveryDocuments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData: DeliveryDocument[] = [];
      snapshot.forEach((docSnap) => {
        docsData.push({ id: docSnap.id, ...docSnap.data() } as DeliveryDocument);
      });
      setDocuments(docsData);
    });
    return () => unsubscribe();
  }, []);

  const handleAddItem = () => {
    if (!newItem.productName) return;
    const remaining = newItem.requestedQuantity - newItem.deliveredQuantity;
    setNewDoc(prev => ({
      ...prev,
      items: [...(prev.items || []), { ...newItem, remainingQuantity: remaining > 0 ? remaining : 0 }]
    }));
    setNewItem({
      orderNumber: '',
      productName: '',
      requestedQuantity: 1,
      deliveredQuantity: 1,
      remainingQuantity: 0,
    });
  };

  const handleRemoveItem = (index: number) => {
    setNewDoc(prev => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== index)
    }));
  };

  const handleSaveDocument = async () => {
    if (!newDoc.customerName || !newDoc.items?.length) return;

    try {
      const isPartial = newDoc.items.some(item => item.remainingQuantity > 0);
      const docData = {
        ...newDoc,
        documentNumber: `DEL-${Date.now().toString().slice(-6)}`,
        status: isPartial ? 'جزئي' : 'مكتمل',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'deliveryDocuments'), docData);
      setIsDialogOpen(false);
      setNewDoc({
        date: new Date().toISOString().split('T')[0],
        customerName: '',
        vehicleDetails: '',
        driverName: '',
        recipientName: '',
        notes: '',
        items: [],
      });
    } catch (error) {
      console.error('Error saving delivery document:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف مستند التسليم؟')) {
      await deleteDoc(doc(db, 'deliveryDocuments', id));
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.driverName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Truck className="h-6 w-6 text-indigo-600" />
          أوامر الاستلام والتسليم
        </h2>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-xl font-bold px-6 h-12"
        >
          <Plus className="h-5 w-5" />
          مستند تسليم جديد
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <Input 
            placeholder="بحث برقم المستند، العميل، أو السائق..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 h-12 rounded-xl border-slate-200 font-bold bg-slate-50"
          />
        </div>
      </div>

      <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-black text-slate-600 text-right">رقم المستند</TableHead>
              <TableHead className="font-black text-slate-600 text-right">التاريخ</TableHead>
              <TableHead className="font-black text-slate-600 text-right">العميل</TableHead>
              <TableHead className="font-black text-slate-600 text-right">السائق / السيارة</TableHead>
              <TableHead className="font-black text-slate-600 text-right">الحالة</TableHead>
              <TableHead className="font-black text-slate-600 text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.map((doc) => (
              <TableRow key={doc.id} className="hover:bg-slate-50/50">
                <TableCell className="font-bold text-indigo-600">{doc.documentNumber}</TableCell>
                <TableCell className="font-bold text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {doc.date}
                  </div>
                </TableCell>
                <TableCell className="font-black text-slate-800">{doc.customerName}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700 text-sm">{doc.driverName || '-'}</span>
                    <span className="text-xs text-slate-500 font-bold">{doc.vehicleDetails || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 ${
                    doc.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {doc.status === 'مكتمل' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {doc.status === 'مكتمل' ? 'تسليم كامل' : 'تسليم جزئي'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsViewingDoc(doc)}
                      className="h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold rounded-lg"
                    >
                      عرض التفاصيل
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredDocs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 font-bold">
                  لا توجد مستندات تسليم
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* New Document Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              مستند تسليم جديد
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <h3 className="font-black text-slate-800 text-sm border-b pb-2">بيانات التسليم الأساسية</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">التاريخ</Label>
                  <Input 
                    type="date"
                    value={newDoc.date}
                    onChange={e => setNewDoc({...newDoc, date: e.target.value})}
                    className="font-bold rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">اسم العميل</Label>
                  <Input 
                    value={newDoc.customerName}
                    onChange={e => setNewDoc({...newDoc, customerName: e.target.value})}
                    className="font-bold rounded-xl"
                    placeholder="اسم العميل..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">اسم السائق</Label>
                  <Input 
                    value={newDoc.driverName}
                    onChange={e => setNewDoc({...newDoc, driverName: e.target.value})}
                    className="font-bold rounded-xl"
                    placeholder="السائق..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">بيانات السيارة</Label>
                  <Input 
                    value={newDoc.vehicleDetails}
                    onChange={e => setNewDoc({...newDoc, vehicleDetails: e.target.value})}
                    className="font-bold rounded-xl"
                    placeholder="رقم اللوحة / نوع السيارة"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">اسم المستلم</Label>
                <Input 
                  value={newDoc.recipientName}
                  onChange={e => setNewDoc({...newDoc, recipientName: e.target.value})}
                  className="font-bold rounded-xl"
                  placeholder="الشخص المستلم للبضاعة"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">ملاحظات</Label>
                <Textarea 
                  value={newDoc.notes}
                  onChange={e => setNewDoc({...newDoc, notes: e.target.value})}
                  className="font-bold rounded-xl h-20"
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-slate-800 text-sm border-b pb-2">المنتجات المسلمة</h3>
              
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-indigo-900">المنتج</Label>
                    <Input 
                      value={newItem.productName}
                      onChange={e => setNewItem({...newItem, productName: e.target.value})}
                      className="h-9 rounded-lg font-bold bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-indigo-900">رقم الأمر (اختياري)</Label>
                    <Input 
                      value={newItem.orderNumber}
                      onChange={e => setNewItem({...newItem, orderNumber: e.target.value})}
                      className="h-9 rounded-lg font-bold bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-indigo-900">المطلوب</Label>
                    <TouchStepper
                      value={newItem.requestedQuantity || 1}
                      onChange={val => setNewItem({...newItem, requestedQuantity: val})}
                      min={1}
                      size="sm"
                      className="w-full justify-between"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-indigo-900">المُسلَّم</Label>
                    <TouchStepper
                      value={newItem.deliveredQuantity || 1}
                      onChange={val => setNewItem({...newItem, deliveredQuantity: val})}
                      min={0}
                      size="sm"
                      className="w-full justify-between"
                    />
                  </div>
                  <div>
                    <Button 
                      onClick={handleAddItem}
                      className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-sm active:scale-95 transition-all"
                    >
                      إضافة للصنف
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead className="font-bold text-slate-600 text-right text-xs">المنتج</TableHead>
                      <TableHead className="font-bold text-slate-600 text-center text-xs">مطلوب</TableHead>
                      <TableHead className="font-bold text-slate-600 text-center text-xs">تم التسليم</TableHead>
                      <TableHead className="font-bold text-slate-600 text-center text-xs">متبقي</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newDoc.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-bold text-sm text-slate-800">
                          {item.productName}
                          {item.orderNumber && <span className="block text-[10px] text-slate-400">أمر: {item.orderNumber}</span>}
                        </TableCell>
                        <TableCell className="text-center font-bold text-sm text-slate-600">{item.requestedQuantity}</TableCell>
                        <TableCell className="text-center font-black text-sm text-emerald-600">{item.deliveredQuantity}</TableCell>
                        <TableCell className="text-center font-bold text-sm text-rose-500">{item.remainingQuantity}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)} className="h-6 w-6 p-0 text-rose-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!newDoc.items?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400 font-bold text-sm">
                          لم يتم إضافة منتجات للتسليم
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button onClick={handleSaveDocument} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-8">
              حفظ مستند التسليم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Details */}
      <Dialog open={!!isViewingDoc} onOpenChange={(open) => !open && setIsViewingDoc(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          {isViewingDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    مستند تسليم #{isViewingDoc.documentNumber}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 ${
                    isViewingDoc.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isViewingDoc.status === 'مكتمل' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {isViewingDoc.status === 'مكتمل' ? 'تسليم كامل' : 'تسليم جزئي'}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-400 mb-1">العميل</span>
                  <span className="font-black text-slate-800">{isViewingDoc.customerName}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 mb-1">التاريخ</span>
                  <span className="font-black text-slate-800">{isViewingDoc.date}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 mb-1">السائق</span>
                  <span className="font-black text-slate-800">{isViewingDoc.driverName || '-'}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 mb-1">السيارة</span>
                  <span className="font-black text-slate-800">{isViewingDoc.vehicleDetails || '-'}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 mb-1">المستلم</span>
                  <span className="font-black text-slate-800">{isViewingDoc.recipientName || '-'}</span>
                </div>
                <div className="col-span-3">
                  <span className="block text-xs font-bold text-slate-400 mb-1">الملاحظات</span>
                  <span className="font-bold text-slate-700 text-sm">{isViewingDoc.notes || '-'}</span>
                </div>
              </div>

              <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-600 text-right">المنتج</TableHead>
                      <TableHead className="font-bold text-slate-600 text-center">المطلوب</TableHead>
                      <TableHead className="font-bold text-slate-600 text-center">تم التسليم</TableHead>
                      <TableHead className="font-bold text-slate-600 text-center">المتبقي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isViewingDoc.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-bold text-sm text-slate-800">
                          {item.productName}
                          {item.orderNumber && <span className="block text-[10px] text-slate-400">أمر: {item.orderNumber}</span>}
                        </TableCell>
                        <TableCell className="text-center font-bold text-sm text-slate-600">{item.requestedQuantity}</TableCell>
                        <TableCell className="text-center font-black text-sm text-emerald-600">{item.deliveredQuantity}</TableCell>
                        <TableCell className="text-center font-bold text-sm text-rose-500">{item.remainingQuantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 px-2 border-t border-slate-100 pt-6">
                 {/* Recipient Touch Signature */}
                 <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 flex flex-col items-center text-center">
                    <span className="block text-xs font-black text-slate-700 mb-2">توقيع المستلم: {isViewingDoc.recipientName || 'المستلم'}</span>
                    {isViewingDoc.recipientSignature ? (
                      <div className="flex flex-col items-center">
                        <img 
                          src={isViewingDoc.recipientSignature} 
                          alt="توقيع المستلم" 
                          className="h-20 max-w-[200px] object-contain bg-white rounded-xl border border-slate-200 shadow-xs p-1"
                        />
                        <button
                          type="button"
                          onClick={() => setSignatureModal({
                            open: true,
                            signerRole: 'recipient',
                            signerName: isViewingDoc.recipientName || 'المستلم'
                          })}
                          className="text-[11px] font-bold text-blue-600 hover:underline mt-2 flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          إعادة التوقيع باللمس
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-40 border-b-2 border-dashed border-slate-300 py-3 text-[11px] text-slate-400">
                          لم يتم التوقيع بعد
                        </div>
                        <Button
                          type="button"
                          onClick={() => setSignatureModal({
                            open: true,
                            signerRole: 'recipient',
                            signerName: isViewingDoc.recipientName || 'المستلم'
                          })}
                          className="h-9 px-4 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <PenTool size={14} />
                          <span>وقّع باللمس (Touch)</span>
                        </Button>
                      </div>
                    )}
                 </div>

                 {/* Driver Touch Signature */}
                 <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 flex flex-col items-center text-center">
                    <span className="block text-xs font-black text-slate-700 mb-2">توقيع السائق: {isViewingDoc.driverName || 'السائق'}</span>
                    {isViewingDoc.driverSignature ? (
                      <div className="flex flex-col items-center">
                        <img 
                          src={isViewingDoc.driverSignature} 
                          alt="توقيع السائق" 
                          className="h-20 max-w-[200px] object-contain bg-white rounded-xl border border-slate-200 shadow-xs p-1"
                        />
                        <button
                          type="button"
                          onClick={() => setSignatureModal({
                            open: true,
                            signerRole: 'driver',
                            signerName: isViewingDoc.driverName || 'السائق'
                          })}
                          className="text-[11px] font-bold text-blue-600 hover:underline mt-2 flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          إعادة التوقيع باللمس
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-40 border-b-2 border-dashed border-slate-300 py-3 text-[11px] text-slate-400">
                          لم يتم التوقيع بعد
                        </div>
                        <Button
                          type="button"
                          onClick={() => setSignatureModal({
                            open: true,
                            signerRole: 'driver',
                            signerName: isViewingDoc.driverName || 'السائق'
                          })}
                          className="h-9 px-4 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <PenTool size={14} />
                          <span>وقّع باللمس (Touch)</span>
                        </Button>
                      </div>
                    )}
                 </div>
              </div>

            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Touch Electronic Signature Modal */}
      {signatureModal?.open && (
        <TouchSignaturePad
          title={`توقيع ${signatureModal.signerRole === 'recipient' ? 'المستلم' : 'السائق'} باللمس`}
          subtitle="توقيع إلكتروني فوري بالإصبع أو القلم الرقمي"
          signerName={signatureModal.signerName}
          signerRole={signatureModal.signerRole === 'recipient' ? 'المستلم المعتمد' : 'سائق التوصيل'}
          onSave={handleSaveSignature}
          onCancel={() => setSignatureModal(null)}
          isOpen={true}
        />
      )}
    </div>
  );
};
