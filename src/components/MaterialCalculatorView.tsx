import React, { useState } from 'react';
import { WoodCalculator } from './material-calculator/WoodCalculator';
import { MarbleCalculator } from './material-calculator/MarbleCalculator';
import { GlassCalculator } from './material-calculator/GlassCalculator';
import { PlywoodCalculator } from './material-calculator/PlywoodCalculator';
import { ProjectManager } from './material-calculator/ProjectManager';
import { PRICES_PRESETS } from './material-calculator/constants';

export function MaterialCalculatorView() {
  const [activeSubTab, setActiveSubTab] = useState<'wood' | 'marble' | 'glass' | 'plywood' | 'projects'>('wood');

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans" dir="rtl">
      <h1 className="text-3xl font-black text-slate-900 mb-6">حاسبة الخامات</h1>
      
      <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-2xl">
        {[
          { id: 'wood', label: 'أخشاب' },
          { id: 'marble', label: 'رخام' },
          { id: 'glass', label: 'زجاج' },
          { id: 'plywood', label: 'أبلكاش' },
          { id: 'projects', label: 'مشاريع' }
        ].map(tab => (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`flex-1 p-3 rounded-xl font-bold transition-all ${activeSubTab === tab.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-slate-200'}`}>
                {tab.label}
            </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        {activeSubTab === 'wood' && <WoodCalculator onAdd={() => {}} />}
        {activeSubTab === 'marble' && <MarbleCalculator onAdd={() => {}} />}
        {activeSubTab === 'glass' && <GlassCalculator onAdd={() => {}} />}
        {activeSubTab === 'plywood' && <PlywoodCalculator onAdd={() => {}} />}
        {activeSubTab === 'projects' && <ProjectManager />}
      </div>
    </div>
  );
}
