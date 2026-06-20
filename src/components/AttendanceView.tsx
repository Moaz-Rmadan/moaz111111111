import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, limit, writeBatch, startAfter, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Attendance, Employee } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { handleFirestoreError } from '../lib/firestore-utils';

export function AttendanceView({ employees }: { employees: Employee[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('الكل');
  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    checkIn: '08:00',
    checkOut: '18:00',
    status: 'حضور' as 'حضور' | 'غياب' | 'تأخير' | 'إجازة'
  });

  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [departments, setDepartments] = useState<string[]>(['الكل']);

  useEffect(() => {
    // Populate departments from employees
    const depts = ['الكل', ...new Set(employees.filter(e => e.department).map(e => e.department!))];
    setDepartments(depts);
    fetchTodayAttendance();
    fetchAttendanceHistory(true);
  }, [employees]);

  const fetchTodayAttendance = async () => {
    try {
      const q = query(collection(db, 'attendance')); // Needs better filter (today)
      const snap = await getDocs(q);
      setTodayAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
    } catch (err) { console.error(err); }
  };

  const fetchAttendanceHistory = async (isInitial = false) => {
    if (loading) return;
    if (!isInitial && !hasMore) return;
    setLoading(true);

    try {
      let q = query(
        collection(db, 'attendance'), 
        orderBy('date', 'desc'),
        limit(50)
      );

      if (!isInitial && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snap = await getDocs(q);
      const newDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      
      if (snap.docs.length < 50) setHasMore(false);
      setLastVisible(snap.docs[snap.docs.length - 1]);
      
      if (isInitial) {
        setAttendanceHistory(newDocs);
      } else {
        setAttendanceHistory(prev => [...prev, ...newDocs]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const employeeStatus = employees.map(emp => {
    const att = todayAttendance.find(a => a.employeeId === emp.id);
    return { ...emp, attendance: att };
  });

  const missingAttendance = employeeStatus.filter(e => !e.attendance);
  const presentCount = employeeStatus.filter(e => e.attendance?.status === 'حضور' || e.attendance?.status === 'تأخير').length;
  const absentCount = employeeStatus.filter(e => e.attendance?.status === 'غياب').length;

  const quickMarkAllPresent = async () => {
    const batch = writeBatch(db);
    missingAttendance.forEach(emp => {
      const newRef = doc(collection(db, 'attendance'));
      batch.set(newRef, {
        employeeId: emp.id,
        date: new Date().toISOString().split('T')[0],
        checkIn: '08:00',
        checkOut: '18:00',
        status: 'حضور'
      });
    });
    await batch.commit();
    fetchTodayAttendance();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'attendance', deletingId));
      setDeletingId(null);
      setAttendanceHistory(prev => prev.filter(a => a.id !== deletingId));
    } catch (err) { console.error(err); }
  };

  const filteredEmployeeStatus = selectedDept === 'الكل' ? employeeStatus : employeeStatus.filter(e => e.department === selectedDept);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">الحضور والانصراف</h2>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-xl shadow-blue-500/20">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-blue-100 font-bold text-sm tracking-wide">غياب اليوم</p>
                <h3 className="text-4xl font-black">{absentCount}</h3>
              </div>
            </div>
            {missingAttendance.length > 0 && (
              <Button onClick={quickMarkAllPresent} variant="ghost" className="w-full mt-6 bg-white/10 text-white font-bold h-10">
                تسجيل حضور للكل ({missingAttendance.length})
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-3xl p-4 shadow-xl shadow-slate-200/40 border border-slate-100">
        {filteredEmployeeStatus.map(emp => (
          <div key={emp.id} className="py-4 flex items-center justify-between">
            <p className="font-black">{emp.name}</p>
            {emp.attendance ? <Badge>{emp.attendance.status}</Badge> : <Button>تسجيل</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}
