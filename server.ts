import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse large JSON payloads for heavy computations
  app.use(express.json({ limit: '50mb' }));

  // Payroll Calculation Engine Endpoint
  app.post('/api/payroll/generate', (req, res) => {
    try {
      const { employees, attendance, transactions, loans, productionRecords, genData } = req.body;
      const newPayrolls = [];

      for (const emp of employees) {
        if (emp.status !== 'نشط') continue;
        
        // Calculate days worked and time-based deductions
        const empAttendance = attendance.filter((a: any) => {
          if (a.employeeId !== emp.id || (a.status !== 'حضور' && a.status !== 'تأخير')) return false;
          return a.date >= genData.startDate && a.date <= genData.endDate;
        });

        const attendanceStats = empAttendance.reduce((acc: any, a: any) => {
          if (!a.checkIn || !a.checkOut) {
            acc.daysWorked += 1;
            return acc;
          }

          const [inH, inM] = a.checkIn.split(':').map(Number);
          const [outH, outM] = a.checkOut.split(':').map(Number);
          
          const checkInMins = inH * 60 + inM;
          const checkOutMins = outH * 60 + outM;
          
          const shiftStartStr = emp.shiftStart || '08:00';
          const shiftEndStr = emp.shiftEnd || '18:00';
          
          const [sH, sM] = shiftStartStr.split(':').map(Number);
          const [eH, eM] = shiftEndStr.split(':').map(Number);
          
          const officialStart = sH * 60 + sM;
          const officialEnd = eH * 60 + eM;
          const shiftDurationMins = officialEnd - officialStart;
          const gracePeriod = 15;
          
          if (checkInMins <= officialStart + gracePeriod && a.checkOut === '12:00' && officialStart <= 12 * 60) {
            acc.daysWorked += 0.5;
            return acc;
          }
          
          let lateMins = 0;
          if (checkInMins > officialStart + gracePeriod) {
            lateMins = checkInMins - officialStart;
          }
          
          const earlyMins = Math.max(0, officialEnd - checkOutMins);
          
          acc.daysWorked += 1;
          acc.timeDeduction += (lateMins + earlyMins) * (emp.dailyRate / (shiftDurationMins > 0 ? shiftDurationMins : 600));
          
          return acc;
        }, { daysWorked: 0, timeDeduction: 0 });

        const daysWorked = attendanceStats.daysWorked;
        const timeDeduction = attendanceStats.timeDeduction;

        const empTransactions = transactions.filter((t: any) => {
          if (t.employeeId !== emp.id) return false;
          return t.date >= genData.startDate && t.date <= genData.endDate;
        });

        const totalOvertime = empTransactions.filter((t: any) => t.type === 'إضافي' || t.type === 'أوفرتايم').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const totalBonuses = empTransactions.filter((t: any) => t.type === 'مكافأة' || t.type === 'مكافآت' || t.type === 'بدل').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const totalExpenses = empTransactions.filter((t: any) => t.type === 'مصروف' || t.type === 'سلفة' || t.type === 'عهدة').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const manualLoanDeductions = empTransactions.filter((t: any) => t.type === 'خصم سلف' || t.type === 'سلفة مستردة').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const manualDeductions = empTransactions.filter((t: any) => t.type === 'خصم' || t.type === 'جزاء').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const totalDeductions = manualDeductions + Math.round(timeDeduction * 100) / 100;
        
        const empProduction = productionRecords.filter((r: any) => 
          r.employeeId === emp.id && 
          r.date >= genData.startDate && 
          r.date <= genData.endDate
        );
        const totalProduction = empProduction.reduce((sum: number, r: any) => sum + r.total, 0);

        let baseSalary = 0;
        if (emp.payMethod === 'production') {
          baseSalary = totalProduction;
        } else {
          baseSalary = emp.dailyRate * daysWorked;
        }

        const earningsBeforeLoans = baseSalary + totalBonuses + totalOvertime - totalDeductions - totalExpenses + (emp.payMethod === 'daily' ? totalProduction : 0);
        const availableForLoans = Math.max(0, earningsBeforeLoans);

        const empLoans = loans.filter((l: any) => l.employeeId === emp.id && l.status === 'نشط');
        let calculatedLoans = empLoans.reduce((sum: number, l: any) => {
          let weeklyInstallment = 0;
          if (l.installments && l.installments > 0) {
            weeklyInstallment = l.amount / l.installments;
          } else {
            weeklyInstallment = (emp.dailyRate * daysWorked) * 0.1; 
          }
          return sum + Math.min(l.remainingAmount, weeklyInstallment);
        }, 0) + manualLoanDeductions;

        const totalLoans = Math.min(calculatedLoans, availableForLoans);
        const netSalary = Math.max(0, earningsBeforeLoans - totalLoans);

        newPayrolls.push({
          employeeId: emp.id,
          weekNumber: genData.weekNumber,
          year: genData.year,
          startDate: genData.startDate,
          endDate: genData.endDate,
          dailyRate: emp.payMethod === 'daily' ? emp.dailyRate : (emp.pieceRate || 0),
          daysWorked: emp.payMethod === 'daily' ? daysWorked : 0,
          baseSalary,
          totalBonuses,
          totalOvertime,
          totalExpenses,
          totalProduction,
          totalDeductions,
          totalLoans,
          netSalary,
          status: 'مسودة',
          payMethod: emp.payMethod || 'daily'
        });
      }

      res.status(200).json({ processedPayrolls: newPayrolls });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
