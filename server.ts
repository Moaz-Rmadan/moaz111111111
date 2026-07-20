import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

function cleanTrailingJunk(str: string): string {
  let s = str.trim();
  // Remove trailing commas
  if (s.endsWith(',')) {
    s = s.slice(0, -1).trim();
  }
  // If it ends with partial property definitions, remove them
  while (true) {
    const prev = s;
    s = s.replace(/,\s*"[^"]*"\s*:\s*$/, ''); // remove trailing ,"key":
    s = s.replace(/{\s*"[^"]*"\s*:\s*$/, '{'); // remove trailing {"key":
    s = s.replace(/:\s*$/, ''); // remove trailing :
    s = s.replace(/,\s*$/, ''); // remove trailing ,
    s = s.trim();
    if (s === prev) break;
  }
  return s;
}

function repairTruncatedJson(jsonStr: string): string {
  let str = jsonStr.trim();
  if (!str) return '{}';

  // Handle unclosed quotes
  let insideQuote = false;
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      insideQuote = !insideQuote;
    }
  }

  if (insideQuote) {
    if (str.endsWith('\\') && !escaped) {
      str = str.slice(0, -1);
    }
    str += '"';
  }

  // Balance brackets and braces
  const stack: ('{' | '[')[] = [];
  insideQuote = false;
  escaped = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      insideQuote = !insideQuote;
    } else if (!insideQuote) {
      if (char === '{') {
        stack.push('{');
      } else if (char === '[') {
        stack.push('[');
      } else if (char === '}') {
        if (stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') {
      str = cleanTrailingJunk(str);
      str += '}';
    } else if (last === '[') {
      str = cleanTrailingJunk(str);
      str += ']';
    }
  }

  return str;
}

async function generateWithRetry(ai: GoogleGenAI, params: any) {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  
  let lastError: any = null;
  
  for (const model of modelsToTry) {
    let attempts = 2;
    let delay = 500;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`[AI] Attempting generateContent using model: ${model} (attempt ${attempt}/${attempts})`);
        const response = await ai.models.generateContent({
          ...params,
          model: model
        });
        console.log(`[AI] Successfully generated content using model: ${model}`);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || JSON.stringify(err);
        
        const isOverloadedOrUnavailable = 
          errMsg.includes("503") || 
          errMsg.includes("UNAVAILABLE") || 
          errMsg.includes("overloaded") ||
          errMsg.includes("demand") ||
          errMsg.includes("high demand") ||
          errMsg.includes("temporary");
        
        console.log(`[AI Status] Model ${model} status (attempt ${attempt}/${attempts}): ${isOverloadedOrUnavailable ? 'unavailable / high load' : 'non-transient status'}`);
        
        if (isOverloadedOrUnavailable) {
          console.log(`[AI] Model ${model} is temporarily unavailable. Failing over to next options...`);
          break;
        }

        const isTransient = 
          errMsg.includes("429") || 
          errMsg.includes("500") || 
          errMsg.includes("RESOURCE_EXHAUSTED");
        
        if (!isTransient && attempt === 1) {
          throw err;
        }
        
        if (attempt < attempts) {
          console.log(`[AI] Waiting ${delay}ms before retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }
  }
  
  throw lastError || new Error("Failed to generate content after trying multiple models.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse large JSON payloads for heavy computations
  app.use(express.json({ limit: '50mb' }));

  // WhatsApp Smart Parser Endpoint
  app.post('/api/whatsapp/parse', async (req, res) => {
    try {
      const { text, file } = req.body;
      if (!text && !file) {
        return res.status(400).json({ error: 'من فضلك أدخل نصاً أو قم برفع ملف (صورة / PDF) للتحليل.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'من فضلك قم بضبط مفتاح API لـ Gemini في الإعدادات' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `
You are a highly professional Arabic/Egyptian industry data extraction assistant. 
Your task is to parse unstructured WhatsApp group chat messages, screenshots, receipts, or PDF orders and extract structured database records for either:
1. "loading" (بون تحميل سيارة / حمولة عربية)
2. "delivery" (إذن استلام عميل / أمر استلام)
3. "production" (أمر تشغيل / أمر إنتاج)

Analyze the provided input (which can be a text message, screenshot image, invoice photo, or PDF document) and:
1. Detect which of these 3 types is the best fit (type 'loading', 'delivery', or 'production').
2. Extract the corresponding fields in Arabic where applicable.
3. Keep the values literal as mentioned in the text or document. Translate colloquial terms to formal terms if needed, but preserve product names and numbers precisely. If quantities are listed for products, parse those numbers as integers.
4. If some fields are not mentioned or can't be found, return empty strings or sensible defaults.

Output must be in JSON format matching the schema provided.
`;

      const contents: any[] = [];
      if (text) {
        contents.push(`User text context or message: ${text}`);
      }
      if (file && file.base64 && file.mimeType) {
        contents.push({
          inlineData: {
            data: file.base64,
            mimeType: file.mimeType
          }
        });
        contents.push("Extract the data from this attached file (image or PDF document). Look for driver names, customer details, products, and quantities.");
      } else {
        contents.push("Extract the data from this WhatsApp message text.");
      }

      const response = await generateWithRetry(ai, {
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedType: {
                type: Type.STRING,
                description: "The detected document type: 'loading' for Loading Manifest, 'delivery' for Delivery Receipt, 'production' for Work/Production Order."
              },
              confidence: {
                type: Type.NUMBER,
                description: "Confidence score from 0.0 to 1.0"
              },
              loadingData: {
                type: Type.OBJECT,
                description: "Extracted data if detectedType is 'loading'",
                properties: {
                  driverName: { type: Type.STRING },
                  carNumber: { type: Type.STRING },
                  destinationType: { type: Type.STRING, description: "Must be 'عميل' or 'معرض'" },
                  clientName: { type: Type.STRING },
                  orderNumbers: { type: Type.STRING },
                  loaderName: { type: Type.STRING },
                  notes: { type: Type.STRING },
                  products: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        components: { type: Type.STRING },
                        notes: { type: Type.STRING },
                        salesPerson: { type: Type.STRING },
                        additions: { type: Type.STRING },
                        quantity: { type: Type.NUMBER }
                      },
                      required: ["name"]
                    }
                  }
                }
              },
              deliveryData: {
                type: Type.OBJECT,
                description: "Extracted data if detectedType is 'delivery'",
                properties: {
                  receiptNumber: { type: Type.STRING },
                  orderNumber: { type: Type.STRING },
                  clientName: { type: Type.STRING },
                  salesPerson: { type: Type.STRING },
                  deliveryTeam: { type: Type.STRING },
                  branch: { type: Type.STRING },
                  address: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  nationalId: { type: Type.STRING },
                  products: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        notes: { type: Type.STRING }
                      },
                      required: ["name", "quantity"]
                    }
                  },
                  notes: { type: Type.STRING }
                }
              },
              productionData: {
                type: Type.OBJECT,
                description: "Extracted data if detectedType is 'production'",
                properties: {
                  workOrderNumber: { type: Type.STRING },
                  clientName: { type: Type.STRING },
                  contractDate: { type: Type.STRING, description: "تاريخ التعاقد (YYYY-MM-DD) or readable date" },
                  deliveryDate: { type: Type.STRING, description: "تاريخ التسليم المتوقع (YYYY-MM-DD) or readable date" },
                  status: { type: Type.STRING, description: "الحالة (مثل: قيد الانتظار، قيد التشغيل، جاهز، تم التسليم)" },
                  roomCode: { type: Type.STRING, description: "اسم الغرفة أو كود الموديل الرئيسي (مثال: غرفة نوم رئيسية، غرفة أطفال، صالون)" },
                  salesPerson: { type: Type.STRING, description: "اسم مسؤول المبيعات (السيلز) إن وجد" },
                  generalSpecs: { type: Type.STRING, description: "مكونات الغرفة أو البنود العامة (سرير، دولاب، تسريحة، كمودينو، باف، ملة...)" },
                  dimensionsAndStructure: { type: Type.STRING, description: "المقاسات والتفاصيل الفنية والنجارة والهيكل والمواصفات الخشبية" },
                  paintSpecs: { type: Type.STRING, description: "مواصفات الدهان ولون الدهان والتشطيب" },
                  upholsterySpecs: { type: Type.STRING, description: "مواصفات التنجيد ولون القماش والنوع" },
                  totalAmount: { type: Type.NUMBER, description: "المبلغ المالي الإجمالي لأمر الشغل بالكامل إن وجد" },
                  products: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        notes: { type: Type.STRING }
                      },
                      required: ["name", "quantity"]
                    }
                  },
                  notes: { type: Type.STRING }
                }
              }
            },
            required: ["detectedType"]
          }
        }
      });

      const textResponse = response.text || '{}';
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(textResponse);
      } catch (jsonErr) {
        console.warn("Initial JSON parsing failed. Attempting robust JSON recovery:", jsonErr);
        try {
          const repaired = repairTruncatedJson(textResponse);
          parsedResponse = JSON.parse(repaired);
        } catch (repairErr: any) {
          console.error("Robust JSON recovery also failed:", repairErr);
          throw new Error("فشل في تحليل بيانات الاستجابة من الذكاء الاصطناعي. الرجاء المحاولة مرة أخرى بملف أو نص أصغر. التفاصيل: " + repairErr.message);
        }
      }
      res.status(200).json(parsedResponse);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

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
          if (l.deductionMode === 'manual') return sum;
          
          let weeklyInstallment = 0;
          if (l.deductionMode === 'auto_percentage') {
            weeklyInstallment = (emp.dailyRate * (daysWorked || 6)) * 0.1;
          } else if (l.deductionMode === 'auto_installment') {
            weeklyInstallment = l.installments && l.installments > 0 ? l.amount / l.installments : 0;
          } else {
            // Legacy fallback
            weeklyInstallment = l.installments && l.installments > 0 ? l.amount / l.installments : (emp.dailyRate * (daysWorked || 6)) * 0.1;
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
          daysWorked: daysWorked,
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

  // Sales Insights AI Endpoint
  app.post('/api/sales/insights', async (req, res) => {
    try {
      const { salesData, inventoryData, showrooms, target } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'من فضلك قم بضبط مفتاح API لـ Gemini في الإعدادات' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `
You are a strategic business analyst for a high-end furniture company in Egypt.
Your task is to analyze sales performance, inventory health, and achievement towards targets.
Provide professional, actionable insights in Arabic.

Focus on:
1. Sales Trends: Identify which models are performing best and why.
2. Inventory Health: Flag slow-moving (ageing) items and suggest promotions or clearance.
3. Target Gap Analysis: If targets aren't met, suggest specific actions (marketing, sales training, branch-specific incentives).
4. Profitability: Analyze margins and suggest ways to optimize logistics or production costs.

Keep the tone professional, encouraging, and highly practical. Use Egyptian business context where appropriate.
Output should be a JSON object with:
- summary: A high-level summary of performance.
- keyInsights: An array of 3-4 specific observations.
- recommendations: An array of 3-4 actionable steps.
- riskAlerts: Any critical issues (e.g., specific showroom underperforming, critical stock out).
`;

      const prompt = `
Current Stats:
- Total Sales: ${salesData.totalSales} EGP
- Total Profit: ${salesData.totalProfit} EGP
- Sales Count: ${salesData.salesCount}
- Monthly Target: ${target} EGP
- Inventory Valuation: ${salesData.inventoryValuation} EGP
- Showrooms: ${showrooms.map((s: any) => s.name).join(', ')}

Inventory Data (Sample):
${JSON.stringify(inventoryData.slice(0, 10))}

Recent Sales Data (Sample):
${JSON.stringify(salesData.recentSales?.slice(0, 10))}

Provide the analysis based on this data.
`;

      const response = await generateWithRetry(ai, {
        contents: [prompt],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              keyInsights: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              riskAlerts: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["summary", "keyInsights", "recommendations"]
          }
        }
      });

      const textResponse = response.text || '{}';
      res.status(200).json(JSON.parse(textResponse));
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
