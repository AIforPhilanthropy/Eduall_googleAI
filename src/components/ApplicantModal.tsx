import React from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  XCircle,
  GraduationCap,
  DollarSign,
  Heart,
  Shield,
  BookOpen,
  MapPin,
  Building,
  User,
  Scale,
} from 'lucide-react';
import { ProcessedApplicant } from '../types/grant';

interface ApplicantModalProps {
  applicant: ProcessedApplicant | null;
  onClose: () => void;
}

export const ApplicantModal: React.FC<ApplicantModalProps> = ({ applicant, onClose }) => {
  if (!applicant) return null;

  const isSelected = applicant.allocationStatus === 'selected';
  const isWaitlisted = applicant.allocationStatus === 'waitlisted';
  const isIneligible = applicant.allocationStatus === 'ineligible';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xs p-5 border-b border-slate-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              {applicant.student_id.slice(-3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Dossier {applicant.student_id}
                </h3>
                {isSelected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Selected ({applicant.rank ? `#${applicant.rank}` : ''})
                  </span>
                ) : isWaitlisted ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Waitlisted ({applicant.rank ? `#${applicant.rank}` : ''})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    Ineligible
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {applicant.country_origin} • {applicant.geographic_region} (GNI Tier {applicant.gni_tier})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-xs">
          {/* Ineligibility Warning or Award Banner */}
          {isIneligible && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
              <div className="font-bold text-sm flex items-center gap-1.5 text-rose-800">
                <XCircle className="w-4 h-4 text-rose-600" />
                Hard Criterion Disqualification:
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                {applicant.ineligibilityReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {isSelected && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-emerald-950">
                  Approved Grant Award: CHF {applicant.allocatedGrantAmount.toLocaleString()}
                </div>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Full non-repayable grant covering 2027/28 academic year at {applicant.university}.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500">Rank</span>
                <div className="text-xl font-black text-teal-800">#{applicant.rank}</div>
              </div>
            </div>
          )}

          {/* Academic Profile */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-teal-600" />
              Academic Status & Program Details
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium">Study Level:</span>
                <div className="font-bold text-slate-900">{applicant.study_level}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">University:</span>
                <div className="font-semibold text-slate-900 truncate" title={applicant.university}>
                  {applicant.university}
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Field of Study:</span>
                <div className="font-semibold text-slate-900">{applicant.field_of_study}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Study Mode:</span>
                <div className="font-semibold text-slate-900">{applicant.study_mode} (Planned '27: {applicant.planned_study_mode_2027})</div>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Residency Permit:</span>
                <div className="font-bold text-slate-900 font-mono">{applicant.residency_permit}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">GPA / Standing:</span>
                <div className="font-bold text-slate-900">
                  {applicant.gpa.toFixed(2)}{' '}
                  <span className={`text-[10px] font-semibold ${applicant.academic_standing === 'Good' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ({applicant.academic_standing})
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Courses Completed:</span>
                <div className="font-semibold text-slate-900">{applicant.courses_completed} courses</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Publications:</span>
                <div className="font-semibold text-slate-900">{applicant.publications}</div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-teal-600" />
              Documented Financial Assessment
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium">Monthly Living Expenses:</span>
                <div className="font-bold text-slate-900">CHF {applicant.monthly_expenses_chf.toLocaleString()}</div>
                <span className="text-[10px] text-slate-500">(Rent: CHF {applicant.housing_cost_chf})</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Expected Personal Income '27:</span>
                <div className="font-semibold text-slate-900">CHF {applicant.expected_personal_income_2027_chf.toLocaleString()}/mo</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Family Support Contribution:</span>
                <div className="font-semibold text-slate-900">CHF {applicant.family_income_chf.toLocaleString()}/mo</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Documented Monthly Need:</span>
                <div className="font-bold text-teal-800 text-sm">CHF {applicant.financial_need_chf.toLocaleString()}/mo</div>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Annual Tuition:</span>
                <div className="font-semibold text-slate-900">CHF {applicant.tuition_fees_per_year_chf.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Personal Liquid Savings:</span>
                <div className="font-semibold text-slate-900">CHF {applicant.savings_chf.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">External Scholarships:</span>
                <div className="font-semibold text-slate-900">CHF {applicant.external_scholarship_amount_chf.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Household Income:</span>
                <div className="font-semibold text-slate-900">CHF {applicant.family_household_income_chf.toLocaleString()}/mo</div>
              </div>
            </div>
          </div>

          {/* Declared Circumstances & Risk Factors */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-teal-600" />
              Declared Circumstances & Vulnerability Indicators
            </h4>
            <div className="flex flex-wrap gap-2">
              {applicant.risk_first_generation === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                  First-Generation University Student
                </span>
              )}
              {applicant.risk_refugee_asylum === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  Refugee / Political Asylum Scholar
                </span>
              )}
              {applicant.risk_disability === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                  Declared Disability / Special Needs
                </span>
              )}
              {applicant.risk_housing_insecurity === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                  Housing Insecurity / Eviction Risk
                </span>
              )}
              {applicant.risk_parent_student === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                  Student Parent ({applicant.dependent_children} dependent children)
                </span>
              )}
              {applicant.risk_family_emergency === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 font-semibold">
                  Recent Acute Family Emergency
                </span>
              )}
              {applicant.risk_language_barrier === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                  Cantonal Language Barrier
                </span>
              )}
            </div>
          </div>

          {/* Personal Resilience & Strengths */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-teal-600" />
              Personal Resilience & Community Contributions
            </h4>
            <div className="flex flex-wrap gap-2">
              {applicant.resilience_overcame_adversity === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Verified History of Overcoming Adversity
                </span>
              )}
              {applicant.resilience_community_engagement === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                  Active Civic & Community Engagement
                </span>
              )}
              {applicant.resilience_volunteer_experience === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                  Volunteer & Solidarity Work
                </span>
              )}
              {applicant.resilience_leadership_role === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                  Demonstrated Student Leadership
                </span>
              )}
              {applicant.resilience_work_experience === 1 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                  Concurrent Employment Experience
                </span>
              )}
            </div>
          </div>

          {/* Score Breakdown */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-teal-600" />
              Multi-Criteria Score Breakdown (Total: {applicant.calculatedScore} pts)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500">Need Score:</span>
                <div className="font-bold text-slate-800">{applicant.scoreBreakdown.financialNeedScore} / 100</div>
              </div>
              <div>
                <span className="text-slate-500">GNI Tier Score:</span>
                <div className="font-bold text-slate-800">{applicant.scoreBreakdown.gniTierScore} / 100</div>
              </div>
              <div>
                <span className="text-slate-500">First-Gen Score:</span>
                <div className="font-bold text-slate-800">{applicant.scoreBreakdown.firstGenScore} / 100</div>
              </div>
              <div>
                <span className="text-slate-500">Vulnerability Score:</span>
                <div className="font-bold text-slate-800">{applicant.scoreBreakdown.vulnerabilityScore} / 100</div>
              </div>
              <div>
                <span className="text-slate-500">Resilience Score:</span>
                <div className="font-bold text-slate-800">{applicant.scoreBreakdown.resilienceScore} / 100</div>
              </div>
              <div>
                <span className="text-slate-500">Academic Score:</span>
                <div className="font-bold text-slate-800">{applicant.scoreBreakdown.academicScore} / 100</div>
              </div>
              <div>
                <span className="text-slate-500">Region Score:</span>
                <div className="font-bold text-slate-800">{applicant.scoreBreakdown.regionScore} / 100</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
