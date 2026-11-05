export interface Applicant {
  student_id: string;
  application_date: string;
  age: number;
  gender: string;
  country_origin: string;
  gni_tier: number;
  geographic_region: string;
  dependent_children: number;
  study_level: "Bachelor's" | "Master's" | "Doctoral" | string;
  university: string;
  field_of_study: string;
  semesters_in_program: number;
  study_mode: string;
  planned_study_mode_2027: string;
  residency_permit: string;
  gpa: number;
  average_grade: number;
  courses_completed: number;
  publications: number;
  academic_standing: "Good" | "At Risk" | string;
  family_income_chf: number;
  family_household_income_chf: number;
  personal_income_chf: number;
  expected_personal_income_2027_chf: number;
  monthly_expenses_chf: number;
  housing_cost_chf: number;
  tuition_fees_per_year_chf: number;
  savings_chf: number;
  financial_need_chf: number;
  has_external_scholarship: number;
  external_scholarship_amount_chf: number;
  risk_first_generation: number;
  risk_refugee_asylum: number;
  risk_disability: number;
  risk_housing_insecurity: number;
  risk_family_emergency: number;
  risk_language_barrier: number;
  risk_parent_student: number;
  risk_undocumented_status: number;
  resilience_volunteer_experience: number;
  resilience_work_experience: number;
  resilience_leadership_role: number;
  resilience_community_engagement: number;
  resilience_overcame_adversity: number;
}

export interface HardCriteriaConfig {
  allowedPermits: string[]; // e.g. ['B', 'C', 'F', 'S', 'Pending']
  permitCRestriction: boolean; // if true, exclude Permit C if household income > 7,000 CHF
  permitCIncomeThreshold: number; // e.g. 7000 CHF
  allowPendingPermits: boolean; // conditional on permit grant
  minGpa: number; // e.g. 2.5
  allowAtRiskWithAdversity: boolean; // allow GPA < 2.5 or At Risk if overcoming adversity / declared circumstances
  minFinancialNeed: number; // e.g. 1 CHF monthly need
  maxAllowedSavings: number; // e.g. 15000 CHF emergency buffer, or unlimited if 0
  excludeCompletedStudies: boolean; // exclude if courses_completed >= standard required
  requireAccreditedSwissUni: boolean;
}

export interface SoftPrioritiesConfig {
  // Weights (1 to 10 scale or relative priority)
  financialNeedWeight: number; // 40% in call
  gniTierWeight: number; // Low-income countries GNI Tier 1
  firstGenerationWeight: number; // First gen students
  vulnerableRiskWeight: number; // Refugee, disability, housing insecurity, parent student
  personalResilienceWeight: number; // Community engagement, volunteer, leadership, adversity
  academicPerformanceWeight: number; // GPA and publications
  underrepresentedRegionWeight: number; // Sub-Saharan Africa, South Asia, Latin America, MENA
  genderParityWeight: number; // Balance gender distribution
  // Ranking order preference list
  priorityOrder: string[];
}

export interface ProcessedApplicant extends Applicant {
  isEligible: boolean;
  ineligibilityReasons: string[];
  calculatedScore: number;
  scoreBreakdown: {
    financialNeedScore: number;
    gniTierScore: number;
    firstGenScore: number;
    vulnerabilityScore: number;
    resilienceScore: number;
    academicScore: number;
    regionScore: number;
  };
  recommendedGrantAmount: number;
  allocatedGrantAmount: number;
  allocationStatus: 'selected' | 'waitlisted' | 'ineligible';
  rank?: number;
}

export interface AllocationSummary {
  totalBudget: number; // 500,000 CHF
  allocatedTotal: number;
  remainingBudget: number;
  totalApplicants: number;
  eligibleCount: number;
  ineligibleCount: number;
  selectedCount: number;
  waitlistedCount: number;
  averageGrantSelected: number;
  levelCounts: {
    bachelor: number;
    master: number;
    doctoral: number;
  };
}

export interface GroupStatistic {
  label: string;
  totalApplicants: number;
  eligibleApplicants: number;
  selectedCount: number;
  selectionRate: number; // selectedCount / totalApplicants in group
  avgGrant: number;
  avgNeed: number;
  avgGpa: number;
}

export interface BiasAuditMetrics {
  totalPool: number;
  selectedPool: number;
  byGender: Record<string, GroupStatistic>;
  byRegion: Record<string, GroupStatistic>;
  byGniTier: Record<string, GroupStatistic>;
  byStudyLevel: Record<string, GroupStatistic>;
  byRiskFactor: {
    firstGeneration: GroupStatistic;
    refugeeAsylum: GroupStatistic;
    disability: GroupStatistic;
    parentStudent: GroupStatistic;
    housingInsecure: GroupStatistic;
  };
  byPermit: Record<string, GroupStatistic>;
  disparateImpactFlags: {
    metric: string;
    description: string;
    severity: 'low' | 'moderate' | 'high' | 'positive';
    ratio: number;
  }[];
}

export interface GeminiQuestionOption {
  id: string;
  label: string;
  description: string;
  policyImpact: Partial<HardCriteriaConfig | SoftPrioritiesConfig>;
}

export interface GeminiQuestion {
  id: string;
  stepNumber: number;
  totalSteps: number;
  phase: 'hard_criteria' | 'soft_priorities';
  criterionTitle: string;
  callReferenceDoc: string;
  questionText: string;
  foundationContext: string;
  options: GeminiQuestionOption[];
  recommendedOptionId: string;
  currentCohortImpact: string;
}

export interface GeminiAuditReport {
  executiveSummary: string;
  ethicalScore: number; // 1-100
  foundationAlignment: {
    equalOpportunityAnalysis: string;
    financialSolidarityAnalysis: string;
    socialInclusionAnalysis: string;
    dignityRespectAnalysis: string;
    sustainableImpactAnalysis: string;
  };
  disparitiesAndBiases: {
    title: string;
    severity: 'critical' | 'moderate' | 'informational';
    domain: 'gender' | 'geographic' | 'academic' | 'study_mode' | 'socioeconomic' | 'societal';
    finding: string;
    societalContext: string;
    impactOnApplicants: string;
  }[];
  societalContextEvaluation: string;
  actionableRecommendations: string[];
}
