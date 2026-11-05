import React, { useState, useMemo } from 'react';
import {
  Scale,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Sliders,
  ChevronDown,
  Eye,
  ArrowUpDown,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  ProcessedApplicant,
  AllocationSummary,
  SoftPrioritiesConfig,
} from '../types/grant';

interface AllocationMatrixProps {
  processedApplicants: ProcessedApplicant[];
  summary: AllocationSummary;
  softPriorities: SoftPrioritiesConfig;
  setSoftPriorities: React.Dispatch<React.SetStateAction<SoftPrioritiesConfig>>;
  onInspectApplicant: (applicant: ProcessedApplicant) => void;
  onProceedToAudit: () => void;
}

export const AllocationMatrix: React.FC<AllocationMatrixProps> = ({
  processedApplicants,
  summary,
  softPriorities,
  setSoftPriorities,
  onInspectApplicant,
  onProceedToAudit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'selected' | 'waitlisted' | 'ineligible'>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [showSliders, setShowSliders] = useState(false);

  // Filtered applicants
  const filtered = useMemo(() => {
    return processedApplicants.filter((app) => {
      if (statusFilter !== 'all' && app.allocationStatus !== statusFilter) return false;
      if (levelFilter !== 'all' && app.study_level !== levelFilter) return false;
      if (regionFilter !== 'all' && app.geographic_region !== regionFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          app.student_id.toLowerCase().includes(q) ||
          app.country_origin.toLowerCase().includes(q) ||
          app.university.toLowerCase().includes(q) ||
          app.field_of_study.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [processedApplicants, statusFilter, levelFilter, regionFilter, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Real-Time Budget Disbursement Progress */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-600" />
              <h2 className="text-xl font-extrabold text-slate-900">
                Grant Allocation Engine (CHF 500,000 Disbursement)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Scholars are evaluated against hard eligibility rules, ranked via weighted soft priorities, and allocated funding until the CHF 500,000 endowment pool is fulfilled.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSliders(!showSliders)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                showSliders
                  ? 'bg-teal-50 border-teal-300 text-teal-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {showSliders ? 'Hide Priority Sliders' : 'Fine-Tune Priority Weights'}
            </button>
            <button
              onClick={onProceedToAudit}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Run Ethical Bias Audit
            </button>
          </div>
        </div>

        {/* Visual Allocation Meter */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Disbursed: <strong className="text-slate-900">CHF {summary.allocatedTotal.toLocaleString()}</strong> of CHF {summary.totalBudget.toLocaleString()}
            </span>
            <span className="font-semibold text-slate-700">
              Remaining Unallocated: <strong className="text-emerald-700">CHF {summary.remainingBudget.toLocaleString()}</strong>
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
            <div
              className="bg-gradient-to-r from-teal-600 to-emerald-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (summary.allocatedTotal / summary.totalBudget) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Quotas & Cohort Distribution Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500">Selected Awardees</div>
            <div className="text-xl font-extrabold text-teal-800 mt-0.5">
              {summary.selectedCount}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {summary.eligibleCount} eligible</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Target: 140-180 awards</div>
          </div>

          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80">
            <div className="text-[11px] font-semibold text-blue-900">Bachelor's Awards</div>
            <div className="text-xl font-extrabold text-blue-950 mt-0.5">
              {summary.levelCounts.bachelor}
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5">Target: 70-85 awards (Max CHF 8k)</div>
          </div>

          <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200/80">
            <div className="text-[11px] font-semibold text-purple-900">Master's Awards</div>
            <div className="text-xl font-extrabold text-purple-950 mt-0.5">
              {summary.levelCounts.master}
            </div>
            <div className="text-[10px] text-purple-700 mt-0.5">Target: 55-70 awards (Max CHF 6.5k)</div>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
            <div className="text-[11px] font-semibold text-amber-900">Doctoral Awards</div>
            <div className="text-xl font-extrabold text-amber-950 mt-0.5">
              {summary.levelCounts.doctoral}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">Target: 15-25 awards (Max CHF 5k)</div>
          </div>
        </div>
      </div>

      {/* Collapsible Soft Priorities Fine-Tuning Sliders */}
      {showSliders && (
        <div className="bg-white rounded-2xl p-6 border border-teal-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Custom Priority Weight Adjustment
              </h3>
              <p className="text-xs text-slate-500">
                Adjust scoring sliders to modify candidate ranking and see immediate budget impact.
              </p>
            </div>
            <button
              onClick={() =>
                setSoftPriorities({
                  financialNeedWeight: 40,
                  academicPerformanceWeight: 25,
                  personalResilienceWeight: 20,
                  firstGenerationWeight: 15,
                  gniTierWeight: 15,
                  vulnerableRiskWeight: 15,
                  underrepresentedRegionWeight: 10,
                  genderParityWeight: 5,
                  priorityOrder: [
                    'financial_need',
                    'gni_tier',
                    'first_generation',
                    'personal_resilience',
                    'vulnerable_risks',
                    'academic_potential',
                    'underrepresented_region',
                  ],
                })
              }
              className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
            >
              Reset to Standard Weights
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Financial Need:</span>
                <span className="font-bold text-teal-700">{softPriorities.financialNeedWeight} pts</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={softPriorities.financialNeedWeight}
                onChange={(e) =>
                  setSoftPriorities((p) => ({ ...p, financialNeedWeight: Number(e.target.value) }))
                }
                className="w-full accent-teal-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Academic Merit:</span>
                <span className="font-bold text-teal-700">{softPriorities.academicPerformanceWeight} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={softPriorities.academicPerformanceWeight}
                onChange={(e) =>
                  setSoftPriorities((p) => ({ ...p, academicPerformanceWeight: Number(e.target.value) }))
                }
                className="w-full accent-teal-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>GNI Tier 1 Priority:</span>
                <span className="font-bold text-teal-700">{softPriorities.gniTierWeight} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                value={softPriorities.gniTierWeight}
                onChange={(e) =>
                  setSoftPriorities((p) => ({ ...p, gniTierWeight: Number(e.target.value) }))
                }
                className="w-full accent-teal-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>First-Generation:</span>
                <span className="font-bold text-teal-700">{softPriorities.firstGenerationWeight} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                value={softPriorities.firstGenerationWeight}
                onChange={(e) =>
                  setSoftPriorities((p) => ({ ...p, firstGenerationWeight: Number(e.target.value) }))
                }
                className="w-full accent-teal-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Vulnerability (Refugee/Disability):</span>
                <span className="font-bold text-teal-700">{softPriorities.vulnerableRiskWeight} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                value={softPriorities.vulnerableRiskWeight}
                onChange={(e) =>
                  setSoftPriorities((p) => ({ ...p, vulnerableRiskWeight: Number(e.target.value) }))
                }
                className="w-full accent-teal-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Personal Resilience & Adversity:</span>
                <span className="font-bold text-teal-700">{softPriorities.personalResilienceWeight} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                value={softPriorities.personalResilienceWeight}
                onChange={(e) =>
                  setSoftPriorities((p) => ({ ...p, personalResilienceWeight: Number(e.target.value) }))
                }
                className="w-full accent-teal-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Underrepresented Regions:</span>
                <span className="font-bold text-teal-700">{softPriorities.underrepresentedRegionWeight} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={softPriorities.underrepresentedRegionWeight}
                onChange={(e) =>
                  setSoftPriorities((p) => ({ ...p, underrepresentedRegionWeight: Number(e.target.value) }))
                }
                className="w-full accent-teal-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ID, Country, Uni, Subject..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Status buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'selected', 'waitlisted', 'ineligible'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Study level selector */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700"
          >
            <option value="all">All Study Levels</option>
            <option value="Bachelor's">Bachelor's</option>
            <option value="Master's">Master's</option>
            <option value="Doctoral">Doctoral</option>
          </select>

          {/* Region selector */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700"
          >
            <option value="all">All Regions</option>
            <option value="Sub-Saharan Africa">Sub-Saharan Africa</option>
            <option value="South Asia">South Asia</option>
            <option value="Middle East/North Africa">Middle East/North Africa</option>
            <option value="Southeast Asia">Southeast Asia</option>
            <option value="Latin America">Latin America</option>
            <option value="Eastern Europe">Eastern Europe</option>
            <option value="Western Europe">Western Europe</option>
          </select>
        </div>

        <div className="text-slate-500 font-medium">
          Showing <strong>{filtered.length}</strong> of {processedApplicants.length} applicants
        </div>
      </div>

      {/* Main Allocation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Rank</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Applicant ID</th>
                <th className="py-3 px-3.5">Country & Region</th>
                <th className="py-3 px-3.5">Level & University</th>
                <th className="py-3 px-3.5 text-center">Permit</th>
                <th className="py-3 px-3.5 text-center">GPA</th>
                <th className="py-3 px-3.5 text-right">Mo. Need</th>
                <th className="py-3 px-3.5 text-center">Score</th>
                <th className="py-3 px-3.5 text-right font-bold">Allocated Grant</th>
                <th className="py-3 px-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((app) => {
                const isSelected = app.allocationStatus === 'selected';
                const isWaitlisted = app.allocationStatus === 'waitlisted';
                const isIneligible = app.allocationStatus === 'ineligible';

                return (
                  <tr
                    key={app.student_id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/30'
                        : isIneligible
                        ? 'bg-slate-50/50 opacity-70'
                        : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-2.5 px-3.5 font-bold text-slate-800">
                      {app.rank ? `#${app.rank}` : '-'}
                    </td>

                    {/* Status badge */}
                    <td className="py-2.5 px-3.5">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Selected
                        </span>
                      ) : isWaitlisted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Waitlisted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                          <XCircle className="w-3 h-3 text-slate-500" />
                          Ineligible
                        </span>
                      )}
                    </td>

                    {/* Applicant ID */}
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                      {app.student_id}
                    </td>

                    {/* Country & Region */}
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{app.country_origin}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>{app.geographic_region}</span>
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                            app.gni_tier === 1
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          T{app.gni_tier}
                        </span>
                      </div>
                    </td>

                    {/* Level & University */}
                    <td className="py-2.5 px-3.5">
                      <div className="font-medium text-slate-900">{app.study_level}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[170px]" title={app.university}>
                        {app.university}
                      </div>
                    </td>

                    {/* Permit */}
                    <td className="py-2.5 px-3.5 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono font-semibold text-[11px] ${
                          app.residency_permit === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {app.residency_permit}
                      </span>
                    </td>

                    {/* GPA */}
                    <td className="py-2.5 px-3.5 text-center">
                      <span
                        className={`font-semibold ${
                          app.gpa >= 3.0
                            ? 'text-emerald-700'
                            : app.gpa >= 2.5
                            ? 'text-slate-800'
                            : 'text-rose-700'
                        }`}
                      >
                        {app.gpa.toFixed(2)}
                      </span>
                      {app.academic_standing === 'At Risk' && (
                        <span className="block text-[9px] text-rose-600 font-bold">At Risk</span>
                      )}
                    </td>

                    {/* Monthly Need */}
                    <td className="py-2.5 px-3.5 text-right font-medium">
                      CHF {app.financial_need_chf.toLocaleString()}
                    </td>

                    {/* Score */}
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {app.calculatedScore}
                      </span>
                    </td>

                    {/* Allocated Grant */}
                    <td className="py-2.5 px-3.5 text-right">
                      {isSelected ? (
                        <div className="font-extrabold text-emerald-800 text-sm">
                          CHF {app.allocatedGrantAmount.toLocaleString()}
                        </div>
                      ) : (
                        <div className="text-slate-400 font-medium">
                          {app.recommendedGrantAmount > 0
                            ? `(CHF ${app.recommendedGrantAmount.toLocaleString()})`
                            : 'CHF 0'}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        onClick={() => onInspectApplicant(app)}
                        className="p-1.5 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        title="Inspect Applicant Dossier & Reasons"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
