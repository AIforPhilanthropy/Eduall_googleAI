import React from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Scale,
  Users,
  FileText,
  DollarSign,
  Sparkles,
  AlertCircle,
  Download,
  RotateCcw,
} from 'lucide-react';
import { AllocationSummary } from '../types/grant';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  summary: AllocationSummary;
  isConsulting: boolean;
  onResetPolicy: () => void;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  summary,
  isConsulting,
  onResetPolicy,
  onExport,
}) => {
  const percentUsed = Math.min(100, Math.round((summary.allocatedTotal / summary.totalBudget) * 100));

  const navItems = [
    { id: 'overview', label: '1. Overview & Context', icon: FileText },
    {
      id: 'consultation',
      label: '2. Gemini Consultation',
      icon: Sparkles,
      badge: 'Interactive',
    },
    {
      id: 'allocation',
      label: '3. Allocation Matrix',
      icon: Scale,
      count: summary.selectedCount,
    },
    {
      id: 'audit',
      label: '4. Ethical Bias Audit',
      icon: ShieldCheck,
      badge: 'AI Analysis',
    },
    {
      id: 'directory',
      label: '5. Applicant Directory',
      icon: Users,
      count: summary.totalApplicants,
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner with Foundation Profile & Budget Real-Time Meter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-teal-700/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                EduAll Foundation
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                Grant Call 2026
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-500">
                Geneva, Switzerland
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Decision Support & Ethical Bias Audit System • CHF 500,000 Allocation
            </p>
          </div>
        </div>

        {/* Live Budget & Grant Counters */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              CHF
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">
                Allocated / Total Budget
              </div>
              <div className="text-sm font-bold text-slate-900">
                {summary.allocatedTotal.toLocaleString()} <span className="text-xs text-slate-500 font-normal">/ {summary.totalBudget.toLocaleString()} CHF</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
            <div className="text-[10px] uppercase font-semibold text-slate-500">
              Awardees
            </div>
            <div className="text-sm font-bold text-teal-700">
              {summary.selectedCount} <span className="text-xs text-slate-500 font-normal">scholars</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
            <div className="text-[10px] uppercase font-semibold text-slate-500">
              Avg Grant
            </div>
            <div className="text-sm font-semibold text-slate-800">
              CHF {summary.averageGrantSelected.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-800">{percentUsed}%</span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 pl-2">
            <button
              onClick={onResetPolicy}
              title="Reset to default grant policies"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onExport}
              title="Export Allocation & Audit report"
              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 border-b-2 border-teal-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-teal-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-teal-200/60 text-teal-900 font-bold'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span
                    className={`ml-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-teal-600 text-white'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
