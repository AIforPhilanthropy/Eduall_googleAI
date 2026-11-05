import React from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Award,
  Globe2,
  HeartHandshake,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Landmark,
  BookOpen,
} from 'lucide-react';
import { AllocationSummary, Applicant } from '../types/grant';

interface OverviewTabProps {
  summary: AllocationSummary;
  applicants: Applicant[];
  onStartConsultation: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  summary,
  applicants,
  onStartConsultation,
}) => {
  // Aggregate stats from the 500 applicants
  const total = applicants.length;
  const tier1Count = applicants.filter((a) => a.gni_tier === 1).length;
  const firstGenCount = applicants.filter((a) => a.risk_first_generation === 1).length;
  const refugeeCount = applicants.filter((a) => a.risk_refugee_asylum === 1).length;
  const atRiskCount = applicants.filter((a) => a.academic_standing === 'At Risk').length;
  const avgMonthlyExpenses = Math.round(
    applicants.reduce((sum, a) => sum + a.monthly_expenses_chf, 0) / (total || 1)
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hero Mission Card */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-semibold mb-4 border border-emerald-400/30">
            <Landmark className="w-3.5 h-3.5" />
            EduAll Foundation (Fondation de droit privé, Geneva, Founded 2015)
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            International Student Grant Allocation Call 2026
          </h2>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            In a nutshell: <span className="font-bold text-white">CHF 500,000</span> must be distributed among 500 international applicant scholars for the 2027/28 academic year in Switzerland. Our mandate is to guarantee that the selection strictly respects <span className="text-emerald-300 font-semibold">hard eligibility criteria</span> and prioritizes <span className="text-emerald-300 font-semibold">genuine financial solidarity and social inclusion</span> over pure academic competition, while auditing against hidden systemic bias.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onStartConsultation}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Start Gemini Consultation
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              500 Application Dossiers Loaded & Ready
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Values & Mandate Matrix */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-teal-600" />
          The Five Core Values of EduAll Foundation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            {
              title: '1. Equal Opportunity',
              desc: 'Focus is not on academic competition, but identifying scholars with genuine need and unlocking equal access.',
              tag: 'Access',
            },
            {
              title: '2. Financial Solidarity',
              desc: 'Targeting non-repayable grants to students who would otherwise face forced withdrawal from Swiss universities.',
              tag: 'Solidarity',
            },
            {
              title: '3. Social Inclusion',
              desc: 'Proactively reducing systemic barriers tied to residency permit delays, displacement, and socioeconomic origin.',
              tag: 'Inclusion',
            },
            {
              title: '4. Dignity & Respect',
              desc: 'Transparent, humane, and non-discriminatory evaluation respecting applicants’ personal circumstances and dignity.',
              tag: 'Dignity',
            },
            {
              title: '5. Sustainable Impact',
              desc: 'Empowering diverse scholars in healthcare, sciences, engineering, and education to contribute to society.',
              tag: 'Impact',
            },
          ].map((val, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-teal-300 transition-colors"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                {val.tag}
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">{val.title}</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{val.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Grant Call 2026 Key Legal Framework */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Budget & Award Maxima */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-teal-700 font-bold text-sm mb-3">
            <Award className="w-4 h-4" />
            Funding Structure & Degree Maxima
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Awards cover the 2027/28 academic year (Sept 2027 - Aug 2028). Grants are pro-rated if completion occurs earlier:
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
              <div>
                <div className="font-semibold text-slate-900">Bachelor's Studies</div>
                <div className="text-slate-500 text-[11px]">Standard 40 courses req.</div>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-700 text-sm">CHF 8,000</span>
                <div className="text-slate-500 text-[10px]">max / year</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
              <div>
                <div className="font-semibold text-slate-900">Master's Studies</div>
                <div className="text-slate-500 text-[11px]">Standard 12 courses req.</div>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-700 text-sm">CHF 6,500</span>
                <div className="text-slate-500 text-[10px]">max / year</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
              <div>
                <div className="font-semibold text-slate-900">Doctoral Studies</div>
                <div className="text-slate-500 text-[11px]">Standard 12 courses req.</div>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-700 text-sm">CHF 5,000</span>
                <div className="text-slate-500 text-[10px]">max / year</div>
              </div>
            </div>
          </div>
          <div className="mt-3 p-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-800">
            • Historical Average Award (2025): <span className="font-bold">CHF 3,345</span>
          </div>
        </div>

        {/* Card 2: Hard Criteria Rules */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-3">
            <ShieldAlert className="w-4 h-4" />
            Hard Criteria (Gatekeeper Filters)
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Residency Permit:</strong> Valid permit (B, C, F, S) or verifiable Pending permit (conditional). Wealthy Permit C excluded.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Academic Standing:</strong> Satisfactory (normally GPA ≥ 2.50). Exceptions for adversity / declared circumstances.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Documented Shortfall:</strong> Monthly living expenses + tuition minus expected income and family support &gt; 0 CHF.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Study Completion:</strong> Cannot have already completed degree requirements before Sept 2027.</span>
            </li>
          </ul>
        </div>

        {/* Card 3: Soft Priorities Ranking */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-3">
            <TrendingUp className="w-4 h-4" />
            Soft Priorities (Evaluation Weighting)
          </div>
          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="font-medium text-slate-800">Financial Need & Shortfall</span>
              <span className="font-bold text-slate-900 bg-blue-50 px-2 py-0.5 rounded text-blue-800">40%</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="font-medium text-slate-800">Academic Motivation & Progress</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">25%</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="font-medium text-slate-800">Personal Resilience & Adversity</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">20%</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="font-medium text-slate-800">Contribution to Diversity & First-Gen</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">10%</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-medium text-slate-800">Alignment with EduAll Values</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">5%</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 italic">
            *Official weights from Call Section § Selection Criteria & Process
          </div>
        </div>
      </div>

      {/* Cohort Baseline Metrics (500 Applicants) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-teal-600" />
            Applicant Pool Profile (500 Dossiers)
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Avg Swiss Monthly Expenses: CHF {avgMonthlyExpenses.toLocaleString()}
          </span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500">Total Applicants</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
            <div className="text-[10px] text-slate-500">100% international</div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80">
            <div className="text-[11px] font-semibold text-emerald-800">GNI Tier 1 (Low-Income)</div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{tier1Count}</div>
            <div className="text-[10px] text-emerald-700">
              {Math.round((tier1Count / total) * 100)}% priority cohort
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/80">
            <div className="text-[11px] font-semibold text-blue-800">First-Generation</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{firstGenCount}</div>
            <div className="text-[10px] text-blue-700">
              {Math.round((firstGenCount / total) * 100)}% of scholars
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80">
            <div className="text-[11px] font-semibold text-amber-800">Refugee & Asylum</div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{refugeeCount}</div>
            <div className="text-[10px] text-amber-700">Humanitarian scholars</div>
          </div>

          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200/80">
            <div className="text-[11px] font-semibold text-rose-800">At-Risk Academic (GPA &lt; 2.5)</div>
            <div className="text-2xl font-bold text-rose-900 mt-1">{atRiskCount}</div>
            <div className="text-[10px] text-rose-700">Requires adversity review</div>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200/80">
            <div className="text-[11px] font-semibold text-purple-800">Eligible Pool (Current)</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">{summary.eligibleCount}</div>
            <div className="text-[10px] text-purple-700">
              {summary.selectedCount} funded ({summary.waitlistedCount} waitlisted)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
