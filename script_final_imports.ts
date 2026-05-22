import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const cleanImports = `import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, onSnapshot, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, writeBatch, startAfter, documentId } from 'firebase/firestore';
import { handleFirestoreError } from './lib/firestore-utils';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import {
  AlertCircle, Package, DollarSign, Users, LayoutGrid, Plus, BarChart3, Search, Download, 
  LayoutDashboard, ChevronDown, Layers, Wrench, Building2, ShoppingBag, ShieldAlert,
  Settings, LogOut, UserCircle, ShieldCheck, Trash2, X, ShoppingCart, Truck, AlertTriangle,
  Activity, Printer, ArrowDownLeft, ArrowUpRight, Menu, ChevronLeft, Calendar, PieChartIcon,
  TrendingUp, Filter, Edit2, MessageSquare, FileText, CheckCircle2, PackageCheck, RotateCcw,
  ReceiptText, ClipboardCheck, PlusCircle, FileCheck, CreditCard, Scale, Wallet, ArrowRight,
  ChevronUp, Target, Database, Briefcase, Home, Code, Save, Upload, ArrowLeft,
  ArrowUpToLine, ArrowDownToLine, Eye, Box, Clock, List, Zap, Warehouse as WarehouseIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { 
  Item, Supplier, Purchase, Issuance, Warehouse, Unit, CostCenter, 
  ProductionJob, JobLabor, JobOtherCost, ProductionRecord, DeliveryReceipt, 
  LostSale, StockAudit, BOM, WorkCenter, ManufacturingOperation, SalesOrder,
  Safe, SafeTransaction, SafeAudit, SafeSettlement, SettledExpense, Employee,
  Attendance, FinancialTransaction, Loan, Payroll, LoadingManifest, Waste,
  BladeSharpening, PlateSharpening, MachineMaintenance, UserProfile,
  CompanySettings, ProductRecipe 
} from './types';
`;

content = content.replace('import { cn }', cleanImports + '\nimport { cn }');
fs.writeFileSync('src/App.tsx', content);
console.log('Final imports added!');
