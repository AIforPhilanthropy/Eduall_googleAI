import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Send,
  MessageSquare,
  Sliders,
  RotateCcw,
  ShieldCheck,
  Check,
  Scale,
  Users,
} from 'lucide-react';
import {
  HardCriteriaConfig,
  SoftPrioritiesConfig,
  AllocationSummary,
  Applicant,
} from '../types/grant';

interface GeminiConsultationProps {
  hardCriteria: HardCriteriaConfig;
  setHardCriteria: React.Dispatch<React.SetStateAction<HardCriteriaConfig>>;
  softPriorities: SoftPrioritiesConfig;
  setSoftPriorities: React.Dispatch<React.SetStateAction<SoftPrioritiesConfig>>;
  summary: AllocationSummary;
  applicants: Applicant[];
  onProceedToAllocation: () => void;
  onProceedToAudit: () => void;
}

interface QuestionDef {
  id: string;
  step: number;
  phase: 'hard_criteria' | 'soft_priorities';
  phaseTitle: string;
  criterionTitle: string;
  callReferenceDoc: string;
  foundationValue: string;
  questionText: string;
  foundationContext: string;
  cohortImpactText: string;
  options: {
    id: string;
    label: string;
    description: string;
    isRecommended?: boolean;
    applyHardChanges?: Partial<HardCriteriaConfig>;
    applySoftChanges?: Partial<SoftPrioritiesConfig>;
  }[];
}

const CONSULTATION_STEPS: QuestionDef[] = [
  // --- PHASE 1: HARD CRITERIA ---
  {
    id: 'residency_permits',
    step: 1,
    phase: 'hard_criteria',
    phaseTitle: 'Phase 1: Hard Eligibility Criteria',
    criterionTitle: 'Swiss Residency Status & "Pending" Permits',
    callReferenceDoc: 'Grant Call 2026 § Primary Eligibility Requirements & Special Conditions for Pending Permits',
    foundationValue: 'Core Value 3: Social Inclusion & Non-Discrimination',
    questionText:
      'How should the foundation handle applicants whose Swiss residence permits are currently "Pending" and Permit C holders with high family resources?',
    foundationContext:
      'Swiss cantonal migration offices generally grant a student permit only on proof of sufficient financial means (~CHF 2,600/month). The official Grant Call explicitly states that applicants with pending permits may apply with proof, and awards will be conditional upon permit issuance. Additionally, the Call excludes Permit C holders with significant family resources.',
    cohortImpactText:
      '28 applicants hold "Pending" permits (including political asylum seekers and displaced students). 14 Permit C holders have household incomes > CHF 7,000.',
    options: [
      {
        id: 'inclusive_conditional',
        label: 'Admit Pending (Conditional) & Enforce Permit C Income Cap (Recommended)',
        description:
          'Permit B, C, F, S, and Pending permits. Exclude Permit C holders whose family household income exceeds CHF 7,000/month. Conditional disbursement upon permit grant.',
        isRecommended: true,
        applyHardChanges: {
          allowedPermits: ['B', 'C', 'F', 'S', 'Pending'],
          allowPendingPermits: true,
          permitCRestriction: true,
          permitCIncomeThreshold: 7000,
        },
      },
      {
        id: 'strict_verified_only',
        label: 'Strict Verified Permits Only (Exclude Pending)',
        description:
          'Only admit candidates with already active B, C, F, or S permits. Exclude all Pending permits to eliminate administrative risk.',
        isRecommended: false,
        applyHardChanges: {
          allowedPermits: ['B', 'C', 'F', 'S'],
          allowPendingPermits: false,
          permitCRestriction: true,
          permitCIncomeThreshold: 7000,
        },
      },
      {
        id: 'all_permits_unrestricted',
        label: 'Unrestricted Permit Inclusion',
        description:
          'Admit all permit holders (including Pending) and remove the Permit C wealth cap.',
        isRecommended: false,
        applyHardChanges: {
          allowedPermits: ['B', 'C', 'F', 'S', 'Pending'],
          allowPendingPermits: true,
          permitCRestriction: false,
        },
      },
    ],
  },
  {
    id: 'academic_standing_gpa',
    step: 2,
    phase: 'hard_criteria',
    phaseTitle: 'Phase 1: Hard Eligibility Criteria',
    criterionTitle: 'Academic Progress & Declared Adversity Exceptions',
    callReferenceDoc: 'Grant Call 2026 § Eligibility Criterion 5: Satisfactory Academic Performance',
    foundationValue: 'Core Value 1: Equal Opportunity & Dignity',
    questionText:
      'Should we admit applicants with GPA below 2.50 or "At Risk" standing if they demonstrated resilience through declared hardship?',
    foundationContext:
      'The Grant Call establishes GPA >= 2.50/4.0 as standard, but explicitly notes: "Applicants below this threshold may still be considered if they explain the reasons in their application and show how they are improving." Many scholars experiencing displacement, bereavement, or sudden illness experienced grade drops that do not reflect their true potential.',
    cohortImpactText:
      '81 applicants hold GPA < 2.50 or "At Risk" standing. 54 of them submitted documentation of overcoming acute adversity (refugee status, medical disability, housing insecurity, or family emergency).',
    options: [
      {
        id: 'compassionate_exception',
        label: 'Allow GPA < 2.50 Exceptions for Documented Adversity (Recommended)',
        description:
          'Maintain minimum GPA 2.50, but grant eligibility exceptions to students with verified adversity, refugee status, or severe life emergencies as envisioned by EduAll values.',
        isRecommended: true,
        applyHardChanges: {
          minGpa: 2.5,
          allowAtRiskWithAdversity: true,
        },
      },
      {
        id: 'strict_gpa_filter',
        label: 'Strict GPA >= 2.50 Threshold (No Exceptions)',
        description:
          'Enforce rigid GPA 2.50 cut-off for all applicants regardless of declared circumstances or adversity.',
        isRecommended: false,
        applyHardChanges: {
          minGpa: 2.5,
          allowAtRiskWithAdversity: false,
        },
      },
      {
        id: 'lower_gpa_floor',
        label: 'Lower Uniform Minimum GPA to 2.20',
        description:
          'Lower the baseline academic threshold to GPA 2.20 across the board without requiring individual hardship review.',
        isRecommended: false,
        applyHardChanges: {
          minGpa: 2.2,
          allowAtRiskWithAdversity: true,
        },
      },
    ],
  },
  {
    id: 'financial_shortfall_savings',
    step: 3,
    phase: 'hard_criteria',
    phaseTitle: 'Phase 1: Hard Eligibility Criteria',
    criterionTitle: 'Documented Need & Emergency Savings Ceiling',
    callReferenceDoc: 'Terms & Conditions § 1.3 Award Amount & Liquid Asset Offsets',
    foundationValue: 'Core Value 2: Financial Solidarity',
    questionText:
      'What minimum monthly shortfall qualifies a student, and how much personal savings may an applicant retain as an emergency buffer?',
    foundationContext:
      'The Call awards support to scholars with genuine financial hardship (living expenses & tuition exceeding personal and family support). However, penalizing students who managed to save a modest emergency buffer (~CHF 15,000 in expensive Switzerland) creates perverse incentives. We must balance need verification with prudence.',
    cohortImpactText:
      '142 applicants have zero or negative monthly shortfall (their personal work or family support already covers all expenses). 23 applicants have personal savings exceeding CHF 15,000.',
    options: [
      {
        id: 'balanced_need_15k_buffer',
        label: 'Monthly Shortfall > CHF 50 & CHF 15,000 Emergency Buffer (Recommended)',
        description:
          'Require documented monthly need (> CHF 50). Allow students to preserve an emergency cushion of up to CHF 15,000 before counting liquid assets against their grant.',
        isRecommended: true,
        applyHardChanges: {
          minFinancialNeed: 50,
          maxAllowedSavings: 15000,
        },
      },
      {
        id: 'stringent_savings_cap',
        label: 'Stringent Savings Cap (Max CHF 8,000 Buffer)',
        description:
          'Offset grant amounts for any student holding savings over CHF 8,000, reserving funds strictly for asset-depleted scholars.',
        isRecommended: false,
        applyHardChanges: {
          minFinancialNeed: 100,
          maxAllowedSavings: 8000,
        },
      },
      {
        id: 'acute_hardship_only',
        label: 'Acute Shortfall Filter (> CHF 300/mo)',
        description:
          'Only admit scholars experiencing acute monthly deficits above CHF 300 to concentrate funds on the most impoverished.',
        isRecommended: false,
        applyHardChanges: {
          minFinancialNeed: 300,
          maxAllowedSavings: 12000,
        },
      },
    ],
  },
  {
    id: 'completion_horizon',
    step: 4,
    phase: 'hard_criteria',
    phaseTitle: 'Phase 1: Hard Eligibility Criteria',
    criterionTitle: 'Degree Horizon & Standard Course Requirements',
    callReferenceDoc: 'Grant Call 2026 § Grant Period and Award Amount: Standard Requirements',
    foundationValue: 'Core Value 5: Sustainable Impact',
    questionText:
      'How should we apply the standard degree course benchmarks to ensure only study time from September 2027 onwards is funded?',
    foundationContext:
      'EduAll standard requirements: Bachelor’s degree = 40 courses; Master’s = 12 courses; Doctorate = 12 courses. Applicants who complete their program before September 2027 cannot receive funding, while those graduating mid-year receive pro-rated support for remaining months.',
    cohortImpactText:
      'All 500 applicants in this round have remaining course credits. Pro-rating applies automatically to students nearing completion to ensure maximum efficiency.',
    options: [
      {
        id: 'standard_prorated_completion',
        label: 'Enforce Standard Coursework Benchmarks with Proration (Recommended)',
        description:
          'Enforce the 40/12/12 course criteria. Exclude any applicant already completed, and pro-rate awards for those completing mid-year.',
        isRecommended: true,
        applyHardChanges: {
          excludeCompletedStudies: true,
          requireAccreditedSwissUni: true,
        },
      },
      {
        id: 'full_year_flat',
        label: 'Flat Full-Year Funding (No Mid-Year Proration)',
        description:
          'Provide full-year annual awards regardless of whether the student completes their degree before August 2028.',
        isRecommended: false,
        applyHardChanges: {
          excludeCompletedStudies: true,
          requireAccreditedSwissUni: true,
        },
      },
    ],
  },

  // --- PHASE 2: SOFT PRIORITIES ---
  {
    id: 'need_vs_merit',
    step: 5,
    phase: 'soft_priorities',
    phaseTitle: 'Phase 2: Soft Priorities & Ranking Order',
    criterionTitle: 'Financial Hardship vs Academic Performance Weighting',
    callReferenceDoc: 'Selection Criteria § Financial Need (40%) vs Academic Motivation (25%)',
    foundationValue: 'Core Value 2: Financial Solidarity',
    questionText:
      'How heavily should documented economic shortfall weigh compared to academic GPA and publications?',
    foundationContext:
      'The foundation charter explicitly states: "Our focus is not on academic excellence or competition, but rather on identifying students with genuine financial need." In Switzerland, high tuition and living costs present insurmountable obstacles for low-income international scholars.',
    cohortImpactText:
      'A Need-First weighting ensures students facing the largest gaps between living expenses and income are ranked highest, preventing forced dropouts.',
    options: [
      {
        id: 'solidarity_first_weight',
        label: 'Solidarity-First (Financial Need 45%, Academic 15%) (Recommended)',
        description:
          'Deepen financial solidarity by elevating the weight on documented shortfall while maintaining a baseline check on academic progress.',
        isRecommended: true,
        applySoftChanges: {
          financialNeedWeight: 45,
          academicPerformanceWeight: 15,
          personalResilienceWeight: 20,
          vulnerableRiskWeight: 20,
        },
      },
      {
        id: 'call_standard_weight',
        label: 'Published Call Standard (Need 40%, Academic 25%, Resilience 20%)',
        description:
          'Maintain the precise percentage breakdown published in the official 2026 call announcement.',
        isRecommended: false,
        applySoftChanges: {
          financialNeedWeight: 40,
          academicPerformanceWeight: 25,
          personalResilienceWeight: 20,
          vulnerableRiskWeight: 15,
        },
      },
      {
        id: 'merit_leaning_weight',
        label: 'Academic Merit Leaning (Need 30%, Academic 35%)',
        description:
          'Give greater competitive advantage to high GPA (3.5+) and research publications.',
        isRecommended: false,
        applySoftChanges: {
          financialNeedWeight: 30,
          academicPerformanceWeight: 35,
          personalResilienceWeight: 15,
          vulnerableRiskWeight: 10,
        },
      },
    ],
  },
  {
    id: 'gni_tier_global_south',
    step: 6,
    phase: 'soft_priorities',
    phaseTitle: 'Phase 2: Soft Priorities & Ranking Order',
    criterionTitle: 'Global South & GNI Tier 1 Priority Alignment',
    callReferenceDoc: 'Grant Call 2026 § Priority Considerations: Low-Income Countries',
    foundationValue: 'Core Value 1: Equal Opportunity & Global Solidarity',
    questionText:
      'How should scholars from low-income countries (GNI Tier 1 < USD 3,000) and underrepresented regions be prioritized?',
    foundationContext:
      'Students from Sub-Saharan Africa, South Asia, and lower-income regions suffer from severe currency conversion disadvantages. 1 Swiss Franc costs significantly more in purchasing-power-adjusted home country currency, making external family support nearly impossible.',
    cohortImpactText:
      'GNI Tier 1 scholars account for 219 applicants in the pool. Prioritizing Tier 1 directly fulfills the Grant Call mandate.',
    options: [
      {
        id: 'high_gni_priority',
        label: 'GNI Tier 1 & Underrepresented Regions High Priority (Recommended)',
        description:
          'Assign strong bonus weight to GNI Tier 1 (100 pts) and underrepresented regions (Sub-Saharan Africa, South Asia, Latin America, MENA).',
        isRecommended: true,
        applySoftChanges: {
          gniTierWeight: 25,
          underrepresentedRegionWeight: 20,
        },
      },
      {
        id: 'standard_gni_priority',
        label: 'Moderate Regional Weighting',
        description:
          'Assign standard regional adjustments (15 pts GNI, 10 pts Region) to avoid overriding individual circumstances.',
        isRecommended: false,
        applySoftChanges: {
          gniTierWeight: 15,
          underrepresentedRegionWeight: 10,
        },
      },
      {
        id: 'pure_income_neutral',
        label: 'Regionally Neutral (Individual Income Only)',
        description:
          'Treat all geographic origins equally, evaluating solely individual reported monthly shortfall without country-of-origin weighting.',
        isRecommended: false,
        applySoftChanges: {
          gniTierWeight: 5,
          underrepresentedRegionWeight: 5,
        },
      },
    ],
  },
  {
    id: 'first_gen_resilience_order',
    step: 7,
    phase: 'soft_priorities',
    phaseTitle: 'Phase 2: Soft Priorities & Ranking Order',
    criterionTitle: 'First-Generation Scholars & Priority Hierarchy',
    callReferenceDoc: 'Grant Call 2026 § Priority Considerations & Values of Foundation',
    foundationValue: 'Core Value 1 & 4: Social Mobility and Dignity',
    questionText:
      'In which specific order should the soft priorities be evaluated for candidate ranking and tie-breaking?',
    foundationContext:
      'When scores are close, the ranking order determines which deserving student crosses the CHF 500,000 budget cut-off. EduAll’s mission champions first-generation scholars, refugees, and student parents who lack generational wealth or safety nets.',
    cohortImpactText:
      'There are 264 first-generation students and 43 refugee/asylum scholars in the applicant pool.',
    options: [
      {
        id: 'social_mobility_hierarchy',
        label: 'Social Mobility Hierarchy (Need → GNI Tier 1 → First Gen → Resilience) (Recommended)',
        description:
          'Rank 1: Financial Shortfall; Rank 2: GNI Tier 1; Rank 3: First-Generation; Rank 4: Overcoming Adversity; Rank 5: Vulnerability Risks; Rank 6: Academic Potential.',
        isRecommended: true,
        applySoftChanges: {
          firstGenerationWeight: 25,
          personalResilienceWeight: 20,
          vulnerableRiskWeight: 20,
          priorityOrder: [
            'financial_need',
            'gni_tier',
            'first_generation',
            'personal_resilience',
            'vulnerable_risks',
            'academic_potential',
            'underrepresented_region',
          ],
        },
      },
      {
        id: 'vulnerability_humanitarian_hierarchy',
        label: 'Humanitarian-First Hierarchy (Need → Refugee/Disability → GNI Tier → First Gen)',
        description:
          'Prioritize refugee/asylum seekers and disabled scholars first in tie-breakers, followed by GNI Tier and First Generation.',
        isRecommended: false,
        applySoftChanges: {
          firstGenerationWeight: 15,
          vulnerableRiskWeight: 30,
          personalResilienceWeight: 20,
          priorityOrder: [
            'financial_need',
            'vulnerable_risks',
            'gni_tier',
            'personal_resilience',
            'first_generation',
            'academic_potential',
            'underrepresented_region',
          ],
        },
      },
      {
        id: 'academic_balanced_hierarchy',
        label: 'Academic Balanced Hierarchy (Need → Academic Potential → GNI Tier → Resilience)',
        description:
          'Place academic progression and GPA immediately following financial need in the tie-breaker hierarchy.',
        isRecommended: false,
        applySoftChanges: {
          academicPerformanceWeight: 25,
          firstGenerationWeight: 15,
          priorityOrder: [
            'financial_need',
            'academic_potential',
            'gni_tier',
            'first_generation',
            'personal_resilience',
            'vulnerable_risks',
            'underrepresented_region',
          ],
        },
      },
    ],
  },
];

export const GeminiConsultation: React.FC<GeminiConsultationProps> = ({
  hardCriteria,
  setHardCriteria,
  softPriorities,
  setSoftPriorities,
  summary,
  applicants,
  onProceedToAllocation,
  onProceedToAudit,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOptionMap, setSelectedOptionMap] = useState<Record<string, string>>({
    residency_permits: 'inclusive_conditional',
    academic_standing_gpa: 'compassionate_exception',
    financial_shortfall_savings: 'balanced_need_15k_buffer',
    completion_horizon: 'standard_prorated_completion',
    need_vs_merit: 'solidarity_first_weight',
    gni_tier_global_south: 'high_gni_priority',
    first_gen_resilience_order: 'social_mobility_hierarchy',
  });

  // Chat with Gemini Advisor state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'officer' | 'gemini'; text: string }>>([
    {
      sender: 'gemini',
      text: "Bonjour! I am your Gemini Grant & Ethics Advisor. I will guide you sequentially through the hard eligibility criteria and soft priority rankings. Feel free to ask me any question about Swiss immigration laws, cantonal financial minimums, or the EduAll Foundation charter.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  const currentQ = CONSULTATION_STEPS[currentStepIndex];

  const handleSelectOption = (option: QuestionDef['options'][0]) => {
    setSelectedOptionMap((prev) => ({
      ...prev,
      [currentQ.id]: option.id,
    }));

    if (option.applyHardChanges) {
      setHardCriteria((prev) => ({ ...prev, ...option.applyHardChanges }));
    }
    if (option.applySoftChanges) {
      setSoftPriorities((prev) => ({ ...prev, ...option.applySoftChanges }));
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSendingChat) return;

    const userText = inputMessage;
    setInputMessage('');
    setChatMessages((prev) => [...prev, { sender: 'officer', text: userText }]);
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/consult/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          context: {
            currentStep: currentQ.criterionTitle,
            eligibleCount: summary.eligibleCount,
            selectedCount: summary.selectedCount,
            hardCriteria,
            softPriorities,
          },
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'gemini',
          text: data.reply || 'Consultation processed based on EduAll Foundation Charter.',
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'gemini',
          text: 'Under EduAll guidelines, genuine financial need and social solidarity take precedence over purely competitive metrics.',
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Progress & Step Navigator */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-700 tracking-wide uppercase">
              <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
              {currentQ.phaseTitle}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
              Step {currentQ.step} of {CONSULTATION_STEPS.length}: {currentQ.criterionTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-600">Live Pool Response:</span>
            <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              {summary.eligibleCount} Eligible
            </span>
            <span className="font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md">
              {summary.selectedCount} Funded (~CHF {summary.allocatedTotal.toLocaleString()})
            </span>
          </div>
        </div>

        {/* Stepper Dots / Tabs */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {CONSULTATION_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`py-2 px-1 text-center rounded-lg transition-all text-xs font-semibold flex flex-col items-center justify-center gap-1 ${
                  isCurrent
                    ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600 ring-offset-1'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <div className="flex items-center gap-1">
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <span>#{step.step}</span>
                  )}
                </div>
                <span className="text-[10px] hidden md:inline truncate max-w-[90px]">
                  {step.criterionTitle.split('&')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Consultation Layout: 2 Columns (Question & Options on Left, Live Advisor on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question Card & Selectable Policy Options (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs relative">
            {/* Citation & Foundation Value Pill */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <BookOpen className="w-3.5 h-3.5" />
                {currentQ.callReferenceDoc}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Scale className="w-3.5 h-3.5" />
                {currentQ.foundationValue}
              </span>
            </div>

            {/* Question Text */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {currentQ.questionText}
            </h3>

            {/* Rationale Context & Cohort Impact Box */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Foundation Context:</strong> {currentQ.foundationContext}
              </div>
              <div className="text-xs text-teal-800 font-medium flex items-center gap-2 bg-teal-50/80 p-2 rounded-lg border border-teal-200/60">
                <Users className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Cohort Data:</strong> {currentQ.cohortImpactText}
                </span>
              </div>
            </div>

            {/* Selectable Options */}
            <div className="mt-6 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Choose Selection Policy Option:
              </div>
              {currentQ.options.map((opt) => {
                const isSelected = selectedOptionMap[currentQ.id] === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-teal-600 bg-teal-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                            {opt.isRecommended && (
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step Navigation Controls */}
            <div className="mt-7 pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                disabled={currentStepIndex === 0}
                onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Question
              </button>

              {currentStepIndex < CONSULTATION_STEPS.length - 1 ? (
                <button
                  onClick={() => setCurrentStepIndex((i) => Math.min(CONSULTATION_STEPS.length - 1, i + 1))}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold shadow-md shadow-teal-700/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  Confirm & Next Question
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={onProceedToAllocation}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    View Allocation Matrix
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onProceedToAudit}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Run Gemini Ethical Audit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Gemini Advisor & Officer Q&A Chat (4 cols) */}
        <div className="lg:col-span-4 flex flex-col h-full space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex-1 flex flex-col">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Gemini Grant Advisor</h4>
                <p className="text-[11px] text-slate-500">Live Ethics & Swiss Law Guidance</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 py-3 max-h-[360px] pr-1">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.sender === 'officer' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 mb-0.5 font-medium">
                    {msg.sender === 'officer' ? 'EduAll Officer' : 'Gemini Advisor'}
                  </div>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs max-w-[90%] leading-relaxed ${
                      msg.sender === 'officer'
                        ? 'bg-teal-700 text-white rounded-tr-xs'
                        : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/60'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isSendingChat && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 italic p-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  Gemini is analyzing foundation regulations...
                </div>
              )}
            </div>

            {/* Officer Input */}
            <form onSubmit={handleSendChat} className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask Gemini about rules or data..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSendingChat}
                className="bg-teal-700 hover:bg-teal-800 text-white p-2 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Quick Guidance Card */}
          <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200/80 text-xs text-emerald-900">
            <div className="font-bold mb-1 flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Officer Note on Equity
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Every decision selected here is immediately passed to the ranking model. You can fine-tune soft priority weights at any time in the Allocation Matrix or Ethical Audit tabs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
