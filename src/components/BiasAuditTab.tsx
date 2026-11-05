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
} from 'lucide-react';
import {
  BiasAuditMetrics,
  AllocationSummary,
  HardCriteriaConfig,
  SoftPrioritiesConfig,
  GeminiAuditReport,
} from '../types/grant';

interface BiasAuditTabProps {
  auditMetrics: BiasAuditMetrics;
  summary: AllocationSummary;
  hardCriteria: HardCriteriaConfig;
  softPriorities: SoftPrioritiesConfig;
  onApplyAdjustment: (adjustments: Partial<SoftPrioritiesConfig>) => void;
}

export const BiasAuditTab: React.FC<BiasAuditTabProps> = ({
  auditMetrics,
  summary,
  hardCriteria,
  softPriorities,
  onApplyAdjustment,
}) => {
  const [report, setReport] = useState<GeminiAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubTab, setSelectedSubTab] = useState<'audit_report' | 'demographics' | 'societal_bias'>('audit_report');

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

  // Run audit automatically once on mount if not yet run
  React.useEffect(() => {
    if (!report && !isLoading) {
      runAudit();
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Ethical Audit Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-700 tracking-wide uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Algorithmic Fairness & Bias Verification
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              Gemini Ethical Audit: Selected vs. Non-Selected Cohort
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Rigorous comparative review auditing the {summary.selectedCount} selected applicants against the {summary.totalApplicants - summary.selectedCount} non-selected candidates. Evaluates adherence to the Foundation’s mission of Financial Solidarity as well as societal & structural disparities in Switzerland.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runAudit}
              disabled={isLoading}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Auditing with Gemini...' : 'Re-Run Live Audit'}
            </button>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 text-xs font-medium">
          <button
            onClick={() => setSelectedSubTab('audit_report')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedSubTab === 'audit_report'
                ? 'bg-teal-700 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Gemini Ethical Findings & Foundation Alignment
          </button>
          <button
            onClick={() => setSelectedSubTab('demographics')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedSubTab === 'demographics'
                ? 'bg-teal-700 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Selected vs Non-Selected Statistical Matrices
          </button>
          <button
            onClick={() => setSelectedSubTab('societal_bias')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedSubTab === 'societal_bias'
                ? 'bg-teal-700 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Societal & Swiss Systemic Context
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-teal-50 border-2 border-teal-600 border-t-transparent animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            Gemini 3.8 Flash is Evaluating Algorithmic Fairness...
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Comparing representation rates across gender, GNI tiers, geographic origins, study levels, and Swiss migration constraints to detect hidden biases.
          </p>
        </div>
      )}

      {/* SUB-TAB 1: GEMINI AUDIT REPORT & DISPARITY FINDINGS */}
      {!isLoading && report && selectedSubTab === 'audit_report' && (
        <div className="space-y-6">
          {/* Executive Summary Card with Score */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-3 text-center p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Ethical Equity Index
              </div>
              <div className="text-4xl sm:text-5xl font-black text-teal-800 my-1">
                {Math.round(report.ethicalScore)}<span className="text-lg text-slate-400 font-normal">/100</span>
              </div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                report.ethicalScore >= 80
                  ? 'bg-emerald-100 text-emerald-800'
                  : report.ethicalScore >= 65
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {report.ethicalScore >= 80 ? 'High Mission Alignment' : report.ethicalScore >= 65 ? 'Moderate / Good Alignment' : 'Review Disparities'}
              </span>
            </div>

            <div className="md:col-span-9 space-y-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Executive Audit Findings
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
              Foundation Values Alignment Audit
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Equal Opportunity (Access over Competition)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {report.foundationAlignment.equalOpportunityAnalysis}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Financial Solidarity (Targeting Acute Need)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {report.foundationAlignment.financialSolidarityAnalysis}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Social Inclusion (Global South & Marginalized)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {report.foundationAlignment.socialInclusionAnalysis}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Dignity & Non-Repayable Autonomy
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {report.foundationAlignment.dignityRespectAnalysis}
                </p>
              </div>
            </div>
          </div>

          {/* Identified Disparities & Risk Warnings */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Detected Disparities & Potential Bias Risks
            </h3>
            <div className="space-y-3">
              {report.disparitiesAndBiases.map((disp, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    disp.severity === 'critical'
                      ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                      : disp.severity === 'moderate'
                      ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                      : 'bg-blue-50/60 border-blue-200 text-blue-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          disp.severity === 'critical'
                            ? 'bg-rose-600'
                            : disp.severity === 'moderate'
                            ? 'bg-amber-600'
                            : 'bg-blue-600'
                        }`}
                      />
                      {disp.title}
                    </span>
                    <span className="uppercase text-[10px] font-extrabold px-2 py-0.5 rounded bg-white/80 shadow-2xs">
                      {disp.domain} • {disp.severity}
                    </span>
                  </div>

                  <p className="leading-relaxed">
                    <strong>Finding:</strong> {disp.finding}
                  </p>
                  <p className="leading-relaxed text-slate-600">
                    <strong>Societal Context:</strong> {disp.societalContext}
                  </p>
                  <p className="leading-relaxed text-slate-600">
                    <strong>Impact on Applicants:</strong> {disp.impactOnApplicants}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2 text-emerald-300">
              <Sparkles className="w-5 h-5" />
              Gemini Actionable Policy Adjustments
            </h3>
            <p className="text-xs text-slate-300">
              Specific interventions proposed by Gemini to elevate fairness before the Selection Committee finalizes awards:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.actionableRecommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-white/10 p-3.5 rounded-xl border border-white/15 text-xs text-slate-100 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DEMOGRAPHIC MATRICES (SELECTED VS POOL) */}
      {selectedSubTab === 'demographics' && (
        <div className="space-y-6">
          {/* Gender Analysis Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Gender Representation & Selection Ratios (4/5ths Rule Check)
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Overall Pool Rate: {Math.round((summary.selectedCount / summary.totalApplicants) * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {Object.entries(auditMetrics.byGender).map(([gender, stat]) => (
                <div key={gender} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <div className="font-bold text-slate-900 text-sm">{gender}</div>
                  <div className="mt-2 space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Total Applied:</span>
                      <strong className="text-slate-800">{stat.totalApplicants}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Selected:</span>
                      <strong className="text-teal-800">{stat.selectedCount}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Selection Rate:</span>
                      <strong className="text-emerald-700">{stat.selectionRate}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Award:</span>
                      <strong className="text-slate-800">CHF {stat.avgGrant.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional & Global South Equity Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-teal-600" />
              Geographic Region & Origin Country Distribution
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(auditMetrics.byRegion).map(([region, stat]) => (
                <div key={region} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-900 mb-1.5">
                    <span>{region}</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      {stat.selectionRate}% rate
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span>Applications:</span>
                      <span>{stat.totalApplicants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Selected:</span>
                      <strong className="text-slate-900">{stat.selectedCount} scholars</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Monthly Need:</span>
                      <span>CHF {stat.avgNeed.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GNI Tier & Socioeconomic Vulnerability Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-600" />
              Socioeconomic Background & GNI Tiers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(auditMetrics.byGniTier).map(([tier, stat]) => (
                <div key={tier} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-900 text-sm mb-2">{tier}</div>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>Pool Total:</span>
                      <strong className="text-slate-800">{stat.totalApplicants}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Selected:</span>
                      <strong className="text-teal-800">{stat.selectedCount}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Selection Rate:</span>
                      <strong className="text-emerald-700 font-bold">{stat.selectionRate}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Grant:</span>
                      <strong>CHF {stat.avgGrant.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disadvantaged & Risk Groups Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Protection of Special Circumstances & Marginalized Scholars
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
              {Object.entries(auditMetrics.byRiskFactor).map(([key, stat]) => (
                <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">{stat.label}</div>
                  <div className="text-xl font-black text-teal-800">{stat.selectedCount} <span className="text-xs font-normal text-slate-500">/ {stat.totalApplicants}</span></div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {stat.selectionRate}% selection rate
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SOCIETAL & SWISS SYSTEMIC CONTEXT */}
      {selectedSubTab === 'societal_bias' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              Swiss Higher Education & Societal Structural Realities
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              Beyond individual merit, international students in Switzerland encounter legal, economic, and institutional realities that our grant selection must not penalize:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm">
                  1. Federal Immigration Work Limits
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Under Swiss migration law, holders of a student residence permit are strictly restricted to working a maximum of <strong>15 hours per week</strong> during the semester. Students from developing countries cannot simply "work more hours" to make up for rising Swiss living expenses without risking permit cancellation.
                </p>
                <div className="text-[11px] text-teal-800 font-semibold bg-teal-50 p-2 rounded">
                  ✓ EduAll accounts for expected 2027 personal income without expecting illegal overtime.
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm">
                  2. Housing & Health Insurance Realities
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Student rents in Zurich, Geneva, and Lausanne regularly range from CHF 800 to CHF 1,400 per month, with mandatory cantonal health insurance adding CHF 300-450/month. Total essential expenses average over CHF 2,100/month.
                </p>
                <div className="text-[11px] text-teal-800 font-semibold bg-teal-50 p-2 rounded">
                  ✓ Grant calculation formulas protect minimum subsistence levels across all partner universities.
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm">
                  3. Currency Disparity & Remittance Barrier
                </div>
                <p className="text-slate-600 leading-relaxed">
                  1 CHF is equivalent to significant local income in GNI Tier 1 countries. Families cannot subsidize Swiss study costs, making EduAll's non-repayable grant the sole determinant of whether scholars can complete their degrees.
                </p>
                <div className="text-[11px] text-teal-800 font-semibold bg-teal-50 p-2 rounded">
                  ✓ Prioritizing GNI Tier 1 guarantees that financial solidarity is targeted where purchasing power gaps are widest.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
