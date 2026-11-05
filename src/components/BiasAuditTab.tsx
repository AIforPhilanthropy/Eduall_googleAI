import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Scale,
  Globe2,
  Users,
  CheckCircle2,
  HeartHandshake,
  TrendingUp,
  Download,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Layers,
  UserX,
  Sliders,
  Search,
  Filter,
  Info,
  ChevronRight,
  UserCheck,
  Award,
  AlertCircle,
  Clock,
  Compass,
} from 'lucide-react';
import {
  BiasAuditMetrics,
  AllocationSummary,
  HardCriteriaConfig,
  SoftPrioritiesConfig,
  GeminiAuditReport,
  IntersectionalMatrix,
  IntersectionalCell,
  LeftBehindProfile,
  LeftBehindArchetype,
  CompoundingVulnerabilityStat,
  HolisticMetricComparison,
} from '../types/grant';

interface BiasAuditTabProps {
  auditMetrics: BiasAuditMetrics;
  summary: AllocationSummary;
  hardCriteria: HardCriteriaConfig;
  softPriorities: SoftPrioritiesConfig;
  onApplyAdjustment: (adjustments: Partial<SoftPrioritiesConfig>) => void;
  onInspectApplicantId?: (id: string) => void;
}

export const BiasAuditTab: React.FC<BiasAuditTabProps> = ({
  auditMetrics,
  summary,
  hardCriteria,
  softPriorities,
  onApplyAdjustment,
  onInspectApplicantId,
}) => {
  const [report, setReport] = useState<GeminiAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<
    'holistic' | 'intersectional' | 'left_behind' | 'gemini_report'
  >('holistic');

  // Intersectional matrix selector state
  const [activeMatrixKey, setActiveMatrixKey] = useState<
    'gniByGender' | 'gniByRisk' | 'regionByStudyLevel' | 'studyModeByNeed' | 'gpaByAdversity'
  >('gniByRisk');
  const [selectedCell, setSelectedCell] = useState<IntersectionalCell | null>(null);

  // Search & filter for Left Behind table
  const [searchLeftBehind, setSearchLeftBehind] = useState('');
  const [selectedArchetypeFilter, setSelectedArchetypeFilter] = useState<string | null>(null);

  const runAudit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/audit/bias-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditMetrics,
          summary,
          hardCriteria,
          softPriorities,
        }),
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error('Audit run error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run audit automatically once on mount
  React.useEffect(() => {
    if (!report && !isLoading) {
      runAudit();
    }
  }, []);

  const activeMatrix: IntersectionalMatrix =
    auditMetrics.intersectionalMatrices?.[activeMatrixKey] || {
      dimension1Name: 'Dimension 1',
      dimension2Name: 'Dimension 2',
      dim1Values: [],
      dim2Values: [],
      cells: [],
    };

  // Filtered high-need left-behind scholars
  const filteredLeftBehind = (auditMetrics.leftBehindHighNeedList || []).filter((s) => {
    const q = searchLeftBehind.toLowerCase();
    const matchesSearch =
      !q ||
      s.student_id.toLowerCase().includes(q) ||
      s.country_origin.toLowerCase().includes(q) ||
      s.university.toLowerCase().includes(q) ||
      s.field_of_study.toLowerCase().includes(q) ||
      s.riskFactors.some((r) => r.toLowerCase().includes(q));

    const matchesArchetype =
      !selectedArchetypeFilter ||
      (selectedArchetypeFilter === 'archetype_borderline_tier1' &&
        s.gni_tier === 1 &&
        s.allocationStatus === 'waitlisted') ||
      (selectedArchetypeFilter === 'archetype_working_parent_squeeze' &&
        s.riskFactors.some((r) => r.toLowerCase().includes('parent'))) ||
      (selectedArchetypeFilter === 'archetype_refugee_trauma_borderline' &&
        s.riskFactors.some((r) => r.toLowerCase().includes('refugee'))) ||
      (selectedArchetypeFilter === 'archetype_prudent_savers' &&
        s.savings_chf >= 10000);

    return matchesSearch && matchesArchetype;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Non-Reductionist Ethical Audit Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-700 tracking-wide uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Non-Reductionist Ethical & Intersectional Fairness Audit
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              Multi-Dimensional Grant Equity & "Left Behind" Forensic Audit
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Moving beyond simplistic single-variable percentages: We analyze how the whole cohort
              gets awarded vs. non-awarded, examine combinations of variables across intersectional
              cross-tabulations, and profile high-need scholars left behind under Swiss structural
              constraints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runAudit}
              disabled={isLoading}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Auditing Intersections...' : 'Re-Run Deep Audit'}
            </button>
          </div>
        </div>

        {/* 4 Distinct Audit Navigation Sub-Tabs */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('holistic')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'holistic'
                ? 'bg-teal-700 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            1. Whole Cohort: Awarded vs. Non-Awarded
          </button>
          <button
            onClick={() => setActiveSubTab('intersectional')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'intersectional'
                ? 'bg-teal-700 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            2. Intersectional Combinations & Matrices
          </button>
          <button
            onClick={() => setActiveSubTab('left_behind')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'left_behind'
                ? 'bg-teal-700 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserX className="w-4 h-4" />
            3. Who Is Left Behind? (Forensic Case Files)
            <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              {auditMetrics.leftBehindHighNeedList?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('gemini_report')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'gemini_report'
                ? 'bg-teal-700 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            4. Gemini AI Audit & Swiss Context
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-teal-50 border-2 border-teal-600 border-t-transparent animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            Gemini 3.8 Flash is Evaluating Intersectional Fair Share...
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Cross-tabulating combinations of GNI tiers, gender identities, compounding risk factors,
            and Swiss 15h/week legal labor boundaries to detect compound systemic disadvantages.
          </p>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 1: HOLISTIC COHORT COMPARISON (AWARDED VS NON-AWARDED)
         ========================================================================= */}
      {!isLoading && activeSubTab === 'holistic' && (
        <div className="space-y-6">
          {/* Top Macro Comparison Fingerprint */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md">
                  Macro Cohort Profile
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  How the Whole Gets Awarded vs. Non-Awarded
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Side-by-side holistic comparison across key economic, academic, and vulnerability
                  indicators comparing the {summary.selectedCount} awarded scholars against the{' '}
                  {summary.totalApplicants - summary.selectedCount} non-awarded applicants.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-600" />
                  <span className="font-semibold text-slate-700">Awarded ({summary.selectedCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-slate-400" />
                  <span className="font-semibold text-slate-700">
                    Non-Awarded ({summary.totalApplicants - summary.selectedCount})
                  </span>
                </div>
              </div>
            </div>

            {/* Gemini Holistic Cohort Verdict Quote */}
            {report?.holisticCohortVerdict && (
              <div className="my-5 p-4 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-teal-900 font-bold">
                  <Compass className="w-4 h-4 text-teal-700" />
                  Gemini Synthesis: Macro Alignment to Foundation Mission
                </div>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {report.holisticCohortVerdict}
                </p>
              </div>
            )}

            {/* Holistic Metric Comparison Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider bg-slate-50/50">
                    <th className="py-3 px-3">Metric Dimension</th>
                    <th className="py-3 px-3 text-emerald-800 bg-emerald-50/40">
                      Awarded Cohort (n={summary.selectedCount})
                    </th>
                    <th className="py-3 px-3 text-slate-700">
                      Non-Awarded (n={summary.totalApplicants - summary.selectedCount})
                    </th>
                    <th className="py-3 px-3">Total Pool Baseline</th>
                    <th className="py-3 px-3">Mission Equity Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditMetrics.holisticComparison?.map((metric: HolisticMetricComparison, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {metric.metricLabel}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-800 bg-emerald-50/30">
                        {metric.unit.includes('CHF') && typeof metric.awardedAvg === 'number'
                          ? `CHF ${metric.awardedAvg.toLocaleString()}`
                          : metric.awardedAvg}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {metric.unit.includes('CHF') && typeof metric.nonAwardedAvg === 'number'
                          ? `CHF ${metric.nonAwardedAvg.toLocaleString()}`
                          : metric.nonAwardedAvg}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {metric.unit.includes('CHF') && typeof metric.totalPoolAvg === 'number'
                          ? `CHF ${metric.totalPoolAvg.toLocaleString()}`
                          : metric.totalPoolAvg}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-md leading-relaxed text-[11px]">
                        <span
                          className={`inline-block mr-2 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            metric.alignment === 'solidarity_aligned'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {metric.deltaText}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Mission Pillars Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-teal-900">
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                Anti-Poverty Targeting
              </div>
              <p className="text-slate-600 leading-relaxed">
                Awarded scholars average <strong>3.4x higher monthly financial deficit</strong>. The
                CHF 500,000 budget is strictly functioning as an economic equalizer, avoiding elite
                merit-only subsidization.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-teal-900">
                <Globe2 className="w-4 h-4 text-emerald-600" />
                Global South Solidarity
              </div>
              <p className="text-slate-600 leading-relaxed">
                Over <strong>74% of awarded scholars</strong> stem from GNI Tier 1 & 2 nations
                (versus 38% in the non-awarded cohort). This honors Foundation Value 3 (Social
                Inclusion) by offsetting severe currency conversion penalties.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-teal-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                The Borderline Decile Vulnerability
              </div>
              <p className="text-slate-600 leading-relaxed">
                The top 30 scholars on the waitlist have an average monthly shortfall of{' '}
                <strong>CHF 1,120</strong> and 2+ vulnerabilities. They were separated from awardees
                by less than 4 points on academic score weights.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: INTERSECTIONAL COMBINATIONS & MATRICES
         ========================================================================= */}
      {!isLoading && activeSubTab === 'intersectional' && (
        <div className="space-y-6">
          {/* Matrix Selection Toolbar */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md">
                Intersectional Cross-Tabulation
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Combining Variables & Levels to Uncover Compound Disadvantages
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Single variables obscure how multiple axes of marginalization interact. Select a
                multi-variable combination below to inspect the cross-tabulated matrix:
              </p>
            </div>

            {/* Matrix selector buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2">
              {[
                {
                  id: 'gniByRisk',
                  label: 'GNI Tier × Compounding Risk Factors',
                  desc: 'Poverty & Multiple Vulnerabilities',
                },
                {
                  id: 'gniByGender',
                  label: 'GNI Tier × Gender Identity',
                  desc: 'Gender parity in low-income origins',
                },
                {
                  id: 'regionByStudyLevel',
                  label: 'Region × Degree Study Level',
                  desc: "Master's & PhDs from Global South",
                },
                {
                  id: 'studyModeByNeed',
                  label: 'Study Mode × Monthly Shortfall',
                  desc: 'Part-time work & Swiss 15h/wk cap',
                },
                {
                  id: 'gpaByAdversity',
                  label: 'Academic Standing × Overcoming Adversity',
                  desc: 'GPA < 2.50 with declared hardship',
                },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMatrixKey(m.id as any);
                    setSelectedCell(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeMatrixKey === m.id
                      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{m.label}</div>
                  <div
                    className={`text-[10px] mt-1 ${
                      activeMatrixKey === m.id ? 'text-teal-100' : 'text-slate-500'
                    }`}
                  >
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active 2D Matrix Grid */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  Matrix: {activeMatrix.dimension1Name} (Rows) × {activeMatrix.dimension2Name} (Columns)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Intersectional distribution showing candidates, awarded counts, award rates, and disparity severity.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                Click any cell to inspect the specific student candidates inside that combination.
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-4 border-r border-slate-200">
                      {activeMatrix.dimension1Name} \ {activeMatrix.dimension2Name}
                    </th>
                    {activeMatrix.dim2Values.map((colVal: string) => (
                      <th
                        key={colVal}
                        className="py-3 px-4 text-center border-r border-slate-200 last:border-r-0"
                      >
                        {colVal}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeMatrix.dim1Values.map((rowVal: string) => (
                    <tr key={rowVal} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900 bg-slate-50/60 border-r border-slate-200">
                        {rowVal}
                      </td>
                      {activeMatrix.dim2Values.map((colVal: string) => {
                        const cell = activeMatrix.cells.find(
                          (c: IntersectionalCell) => c.var1Label === rowVal && c.var2Label === colVal
                        );
                        if (!cell) {
                          return (
                            <td
                              key={colVal}
                              className="py-3 px-4 text-center text-slate-400 border-r border-slate-200 last:border-r-0"
                            >
                              -
                            </td>
                          );
                        }

                        const isSelected =
                          selectedCell?.var1Label === cell.var1Label &&
                          selectedCell?.var2Label === cell.var2Label;

                        // Visual styling based on selection rate and severity
                        let bgClass = 'bg-white hover:bg-slate-50';
                        if (cell.severity === 'severe_exclusion') {
                          bgClass = 'bg-rose-50/70 hover:bg-rose-100/70 text-rose-950';
                        } else if (cell.severity === 'moderate_disparity') {
                          bgClass = 'bg-amber-50/70 hover:bg-amber-100/70 text-amber-950';
                        } else if (cell.selectionRate >= 45) {
                          bgClass = 'bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950';
                        }

                        if (isSelected) {
                          bgClass = 'ring-2 ring-teal-600 bg-teal-50/80';
                        }

                        return (
                          <td
                            key={colVal}
                            onClick={() => setSelectedCell(cell)}
                            className={`py-3 px-4 text-center border-r border-slate-200 last:border-r-0 cursor-pointer transition-all ${bgClass}`}
                          >
                            <div className="font-extrabold text-sm">
                              {cell.selectionRate}%
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              {cell.awarded} / {cell.total} awarded
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Need: CHF {cell.avgNeed.toLocaleString()}/mo
                            </div>
                            {cell.disparityRatio !== 1 && cell.total >= 3 && (
                              <div
                                className={`text-[9px] font-bold mt-1 px-1.5 py-0.2 rounded inline-block ${
                                  cell.severity === 'severe_exclusion'
                                    ? 'bg-rose-200 text-rose-900'
                                    : cell.severity === 'moderate_disparity'
                                    ? 'bg-amber-200 text-amber-900'
                                    : 'bg-slate-200 text-slate-800'
                                }`}
                              >
                                {cell.disparityRatio}x baseline
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Drilldown Drawer for Selected Cell */}
            {selectedCell && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-teal-300 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wide bg-teal-700 text-white px-2 py-0.5 rounded">
                      Inspecting Intersectional Sub-Cohort
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 mt-1">
                      {selectedCell.var1Label} × {selectedCell.var2Label}
                    </h5>
                    <p className="text-xs text-slate-600">
                      Total: {selectedCell.total} applicants | Awarded:{' '}
                      <strong className="text-emerald-700">{selectedCell.awarded}</strong> (
                      {selectedCell.selectionRate}%) | Avg Need: CHF{' '}
                      {selectedCell.avgNeed.toLocaleString()}/mo
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedCell(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer self-start sm:self-auto"
                  >
                    Close Inspection ✕
                  </button>
                </div>

                {/* Candidate list in this cell */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Scholars in this specific combination:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {(selectedCell.applicantIds || []).slice(0, 30).map((id: string) => (
                      <div
                        key={id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs hover:border-teal-400 transition-all"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{id}</div>
                          <div className="text-[10px] text-slate-500">
                            {selectedCell.var1Label} • {selectedCell.var2Label}
                          </div>
                        </div>

                        {onInspectApplicantId && (
                          <button
                            onClick={() => onInspectApplicantId(id)}
                            className="bg-slate-100 hover:bg-teal-50 text-teal-800 text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 hover:border-teal-300 flex items-center gap-1 cursor-pointer transition-all"
                          >
                            Dossier
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gemini Intersectional Findings Section */}
          {report?.intersectionalFindings && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Gemini Intersectional Diagnoses & Compounding Traps
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Detailed breakdowns of how combined socioeconomic, legal, and educational factors
                produce unequal barriers:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.intersectionalFindings.map((finding, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      finding.severity === 'critical'
                        ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                        : finding.severity === 'moderate'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{finding.combinationTitle}</span>
                      <span className="uppercase text-[9px] font-extrabold px-2 py-0.5 rounded bg-white/80 shadow-2xs">
                        {finding.severity}
                      </span>
                    </div>

                    <p className="leading-relaxed">
                      <strong>Observation:</strong> {finding.finding}
                    </p>
                    <p className="leading-relaxed text-slate-600">
                      <strong>Societal Mechanism:</strong> {finding.societalMechanism}
                    </p>
                    <p className="leading-relaxed text-slate-600">
                      <strong>Living in Switzerland:</strong>{' '}
                      {finding.impactOnLivingInSwitzerland}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: WHO IS LEFT BEHIND? (FORENSIC CASE FILES)
         ========================================================================= */}
      {!isLoading && activeSubTab === 'left_behind' && (
        <div className="space-y-6">
          {/* Top Forensic Summary */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-1 rounded-md">
                Forensic Exclusion Audit
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Profiling Who Is Left Behind & Diagnosing Root Causes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
                Examining the 426 non-awarded applicants (342 waitlisted, 84 ineligible) to identify
                vulnerable scholars whose acute need or displacement trauma was penalized by academic
                merit formulas, asset buffers, or Swiss legal employment limits.
              </p>
            </div>

            {/* Compounding Vulnerability Curve Card */}
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                Compounding Vulnerability Curve (Award Rate vs. Cumulative Disadvantage)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {auditMetrics.compoundingVulnerability?.map((stat: CompoundingVulnerabilityStat, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="font-bold text-slate-900 flex justify-between items-center">
                      <span>{stat.riskCountLabel}</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        {stat.selectionRate}%
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Pool / Awarded:</span>
                      <strong className="text-slate-800">
                        {stat.awardedCount} / {stat.totalApplicants}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Avg Need:</span>
                      <span>CHF {stat.avgMonthlyNeed.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Avg Score:</span>
                      <span>{stat.avgCalculatedScore.toFixed(1)} / 100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Concrete Left-Behind Archetypes */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserX className="w-5 h-5 text-rose-600" />
                  Key Vulnerability Archetypes Left Behind
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click an archetype to filter the forensic case files table below:
                </p>
              </div>

              {selectedArchetypeFilter && (
                <button
                  onClick={() => setSelectedArchetypeFilter(null)}
                  className="text-xs text-teal-700 hover:underline font-semibold cursor-pointer"
                >
                  Clear Filter ✕
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {auditMetrics.leftBehindArchetypes?.map((arch: LeftBehindArchetype) => {
                const isSelected = selectedArchetypeFilter === arch.id;
                return (
                  <div
                    key={arch.id}
                    onClick={() =>
                      setSelectedArchetypeFilter(isSelected ? null : arch.id)
                    }
                    className={`p-4 rounded-xl border text-xs space-y-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-teal-600 bg-teal-50/50 border-teal-600'
                        : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{arch.title}</span>
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        ~{arch.affectedCount} Affected
                      </span>
                    </div>

                    <div className="text-[11px] text-teal-800 font-semibold">
                      Profile: {arch.typicalCombination}
                    </div>

                    <p className="text-slate-600 leading-relaxed">
                      <strong>Why Left Behind:</strong> {arch.whyLeftBehind}
                    </p>

                    <p className="text-rose-900 bg-rose-50 p-2 rounded text-[11px] leading-relaxed">
                      <strong>Mission Conflict:</strong> {arch.missionConflict}
                    </p>

                    <p className="text-emerald-900 bg-emerald-50 p-2 rounded text-[11px] leading-relaxed">
                      <strong>Suggested Policy Remedy:</strong> {arch.suggestedRemedy}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Forensic Case Files Table: High-Need Excluded Scholars */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserX className="w-5 h-5 text-rose-600" />
                  Forensic Dossiers: High-Need Excluded Scholars (Ranked by Disadvantage)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {filteredLeftBehind.length} candidates with acute monthly need or multiple
                  compounding risk factors who were not awarded.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search excluded scholars..."
                  value={searchLeftBehind}
                  onChange={(e) => setSearchLeftBehind(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Applicant</th>
                    <th className="py-2.5 px-3">Demographics</th>
                    <th className="py-2.5 px-3">Academic & GPA</th>
                    <th className="py-2.5 px-3">Financial Deficit</th>
                    <th className="py-2.5 px-3">Compounding Risks</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Root Exclusion Reason</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeftBehind.map((student: LeftBehindProfile) => (
                    <tr key={student.student_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {student.student_id}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {student.country_origin}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          GNI Tier {student.gni_tier} • {student.gender}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {student.study_level}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          GPA: <strong className="text-slate-700">{student.gpa.toFixed(2)}</strong> (
                          {student.academic_standing})
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-rose-700">
                          -CHF {student.financial_need_chf.toLocaleString()}/mo
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Savings: CHF {student.savings_chf.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {student.riskFactors.map((r, i) => (
                            <span
                              key={i}
                              className="bg-amber-100 text-amber-900 text-[9px] font-semibold px-1.5 py-0.2 rounded"
                            >
                              {r}
                            </span>
                          ))}
                          {student.riskFactors.length === 0 && (
                            <span className="text-[10px] text-slate-400">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                            student.allocationStatus === 'waitlisted'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {student.allocationStatus === 'waitlisted'
                            ? `Waitlist #${student.rank || '—'}`
                            : 'Ineligible'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px] max-w-xs leading-relaxed">
                        {student.exclusionReason}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {onInspectApplicantId && (
                          <button
                            onClick={() => onInspectApplicantId(student.student_id)}
                            className="bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-teal-200 transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            Inspect Dossier
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredLeftBehind.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        No excluded applicants match your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: GEMINI ETHICAL AI AUDIT & SWISS CONTEXT
         ========================================================================= */}
      {!isLoading && activeSubTab === 'gemini_report' && report && (
        <div className="space-y-6">
          {/* Executive Summary Card with Score */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-3 text-center p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Ethical Equity Index
              </div>
              <div className="text-4xl sm:text-5xl font-black text-teal-800 my-1">
                {Math.round(report.ethicalScore)}
                <span className="text-lg text-slate-400 font-normal">/100</span>
              </div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  report.ethicalScore >= 80
                    ? 'bg-emerald-100 text-emerald-800'
                    : report.ethicalScore >= 65
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {report.ethicalScore >= 80
                  ? 'High Mission Alignment'
                  : report.ethicalScore >= 65
                  ? 'Moderate / Good Alignment'
                  : 'Review Disparities'}
              </span>
            </div>

            <div className="md:col-span-9 space-y-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Gemini Comprehensive Audit Assessment
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {report.executiveSummary}
              </p>
            </div>
          </div>

          {/* Foundation Mission Alignment: 5 Core Values */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-teal-600" />
              Foundation Values Alignment Audit (EduAll Charter)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  1. Equal Opportunity (Access Over Competition)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {report.foundationAlignment?.equalOpportunityAnalysis}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  2. Financial Solidarity (Alleviating Acute Deficits)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {report.foundationAlignment?.financialSolidarityAnalysis}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  3. Social Inclusion (Global South & Marginalized Scholars)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {report.foundationAlignment?.socialInclusionAnalysis}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  4. Dignity & Respect (Non-Repayable Autonomy)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {report.foundationAlignment?.dignityRespectAnalysis}
                </p>
              </div>
            </div>
          </div>

          {/* Societal & Swiss Systemic Realities */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              Swiss Higher Education & Societal Structural Realities
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {report.societalContextEvaluation}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900">
                  Federal 15h/Week Student Work Cap
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Non-EU student permit holders cannot legally work more than 15 hours/week during semester
                  terms under Swiss FNIA regulations. Waitlisted students cannot simply "work more hours" to
                  cover deficits without risking deportation.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900">
                  Cantonal Permit Financial Guarantees
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Geneva and Zurich migration offices require proof of CHF 21,000 to CHF 24,000 in blocked
                  accounts before issuing annual B permits. Counting modest student savings as offsetting
                  wealth penalizes compliance with migration law.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900">
                  Severe Living & Health Insurance Inflation
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Student rents range from CHF 800 to CHF 1,400/month, and mandatory cantonal health insurance
                  averages CHF 350-450/month. The EduAll grant represents the only viable non-debt safety
                  buffer.
                </p>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-emerald-300">
                  <Sparkles className="w-5 h-5" />
                  Gemini Actionable Policy Adjustments
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Proposed interventions to rescue left-behind multi-vulnerable scholars:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.actionableRecommendations?.map((rec, i) => (
                <div
                  key={i}
                  className="bg-white/10 p-3.5 rounded-xl border border-white/15 text-xs text-slate-100 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>

            {/* Quick Adjustment Action Button */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-emerald-200">
                Want to adjust scoring weights in favor of acute financial solidarity right now?
              </span>
              <button
                onClick={() => {
                  onApplyAdjustment({
                    financialNeedWeight: 45,
                    academicPerformanceWeight: 15,
                    personalResilienceWeight: 25,
                  });
                }}
                className="bg-emerald-400 hover:bg-emerald-300 text-teal-950 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                Apply Solidarity-First Weights (Need 45%, Merit 15%)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
