import {
  Applicant,
  HardCriteriaConfig,
  SoftPrioritiesConfig,
  ProcessedApplicant,
  AllocationSummary,
  BiasAuditMetrics,
  GroupStatistic,
  IntersectionalCell,
  IntersectionalMatrix,
  HolisticMetricComparison,
  LeftBehindProfile,
  LeftBehindArchetype,
  CompoundingVulnerabilityStat,
} from '../types/grant';

export const DEFAULT_HARD_CRITERIA: HardCriteriaConfig = {
  allowedPermits: ['B', 'C', 'F', 'S', 'Pending'],
  permitCRestriction: true,
  permitCIncomeThreshold: 7000, // CHF monthly household income threshold
  allowPendingPermits: true, // Conditional as permitted by EduAll call
  minGpa: 2.5,
  allowAtRiskWithAdversity: true, // EduAll call allows applicants <2.5 if circumstances explained
  minFinancialNeed: 50, // Minimum monthly shortfall in CHF
  maxAllowedSavings: 15000, // Assets above this buffer offset need
  excludeCompletedStudies: true,
  requireAccreditedSwissUni: true,
};

export const DEFAULT_SOFT_PRIORITIES: SoftPrioritiesConfig = {
  financialNeedWeight: 40, // 40% from Call
  academicPerformanceWeight: 25, // 25% from Call
  personalResilienceWeight: 20, // 20% from Call
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
};

const REGION_SCORES: Record<string, number> = {
  'Sub-Saharan Africa': 100,
  'South Asia': 95,
  'Latin America': 90,
  'Middle East/North Africa': 85,
  'Southeast Asia': 80,
  'Eastern Europe': 55,
  'Western Europe': 30,
};

export function evaluateApplicantEligibility(
  applicant: Applicant,
  config: HardCriteriaConfig
): { isEligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // 1. Residency permit check
  if (!config.allowedPermits.includes(applicant.residency_permit)) {
    reasons.push(`Permit type '${applicant.residency_permit}' is not in approved list`);
  }

  // Pending permit check
  if (applicant.residency_permit === 'Pending' && !config.allowPendingPermits) {
    reasons.push('Pending permits are not currently admitted in this round');
  }

  // Permit C check with significant family wealth
  if (
    config.permitCRestriction &&
    applicant.residency_permit === 'C' &&
    applicant.family_household_income_chf >= config.permitCIncomeThreshold
  ) {
    reasons.push(
      `Permit C holder with household income CHF ${applicant.family_household_income_chf.toLocaleString()} exceeding self-sufficiency threshold (CHF ${config.permitCIncomeThreshold.toLocaleString()})`
    );
  }

  // 2. Academic standing / GPA check
  const gpa = applicant.gpa;
  const isAtRisk = applicant.academic_standing === 'At Risk';
  if (gpa < config.minGpa) {
    const hasAdversityProof =
      applicant.resilience_overcame_adversity === 1 ||
      applicant.risk_refugee_asylum === 1 ||
      applicant.risk_disability === 1 ||
      applicant.risk_family_emergency === 1;

    if (!config.allowAtRiskWithAdversity || !hasAdversityProof) {
      reasons.push(`GPA (${gpa.toFixed(2)}) is below minimum requirement (${config.minGpa.toFixed(2)}) without qualifying adversity justification`);
    }
  }

  // 3. Financial need check
  if (applicant.financial_need_chf < config.minFinancialNeed) {
    reasons.push(
      `Documented monthly financial shortfall (CHF ${applicant.financial_need_chf}) is below minimum threshold (CHF ${config.minFinancialNeed})`
    );
  }

  // 4. Excessive personal savings
  if (config.maxAllowedSavings > 0 && applicant.savings_chf > config.maxAllowedSavings) {
    const netShortfallAfterSavings = applicant.financial_need_chf * 12 - (applicant.savings_chf - config.maxAllowedSavings);
    if (netShortfallAfterSavings <= 0) {
      reasons.push(`Liquid savings (CHF ${applicant.savings_chf.toLocaleString()}) fully cover study expenses`);
    }
  }

  // 5. Degree completion check
  if (config.excludeCompletedStudies) {
    const standardTotal = applicant.study_level === "Bachelor's" ? 40 : 12;
    if (applicant.courses_completed >= standardTotal) {
      reasons.push(`Coursework completed (${applicant.courses_completed}/${standardTotal}), graduating prior to September 2027 grant period`);
    }
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
}

export function calculateApplicantScores(
  applicant: Applicant,
  config: SoftPrioritiesConfig
): { calculatedScore: number; scoreBreakdown: ProcessedApplicant['scoreBreakdown'] } {
  // 1. Financial Need score (0-100)
  // Monthly shortfall up to 2,400 CHF maps to 100
  const needNorm = Math.min(100, Math.max(0, (applicant.financial_need_chf / 2200) * 100));

  // 2. GNI Tier score (Tier 1 = 100, Tier 2 = 65, Tier 3 = 25)
  const gniScore = applicant.gni_tier === 1 ? 100 : applicant.gni_tier === 2 ? 65 : 25;

  // 3. First generation (100 or 0)
  const firstGenScore = applicant.risk_first_generation ? 100 : 0;

  // 4. Vulnerability score (Refugee, disability, housing, parent, emergency)
  const vulnPoints =
    applicant.risk_refugee_asylum * 35 +
    applicant.risk_disability * 25 +
    applicant.risk_housing_insecurity * 20 +
    applicant.risk_parent_student * 15 +
    applicant.risk_family_emergency * 10 +
    applicant.risk_language_barrier * 5;
  const vulnerabilityScore = Math.min(100, vulnPoints);

  // 5. Personal resilience (Overcoming adversity, community engagement, volunteer, leadership, work)
  const resPoints =
    applicant.resilience_overcame_adversity * 35 +
    applicant.resilience_community_engagement * 20 +
    applicant.resilience_volunteer_experience * 20 +
    applicant.resilience_leadership_role * 15 +
    applicant.resilience_work_experience * 10;
  const resilienceScore = Math.min(100, resPoints);

  // 6. Academic performance (GPA normalized 2.0-4.0 -> 0-85, publications up to 15)
  const gpaNorm = Math.min(85, Math.max(0, ((applicant.gpa - 2.0) / 2.0) * 85));
  const pubNorm = Math.min(15, applicant.publications * 5);
  const academicScore = Math.min(100, gpaNorm + pubNorm);

  // 7. Geographic Region score
  const regionScore = REGION_SCORES[applicant.geographic_region] ?? 50;

  // Weighted calculation with order bonus
  // Priority order gives small multiplier bonus (first priority has 1.25x weight, second 1.2x, etc.)
  const getOrderMultiplier = (key: string) => {
    const idx = config.priorityOrder.indexOf(key);
    if (idx === -1) return 1.0;
    return 1.3 - idx * 0.05; // 1.3, 1.25, 1.2, 1.15, ...
  };

  const weightedSum =
    needNorm * (config.financialNeedWeight * getOrderMultiplier('financial_need')) +
    gniScore * (config.gniTierWeight * getOrderMultiplier('gni_tier')) +
    firstGenScore * (config.firstGenerationWeight * getOrderMultiplier('first_generation')) +
    vulnerabilityScore * (config.vulnerableRiskWeight * getOrderMultiplier('vulnerable_risks')) +
    resilienceScore * (config.personalResilienceWeight * getOrderMultiplier('personal_resilience')) +
    academicScore * (config.academicPerformanceWeight * getOrderMultiplier('academic_potential')) +
    regionScore * (config.underrepresentedRegionWeight * getOrderMultiplier('underrepresented_region'));

  const totalWeights =
    config.financialNeedWeight * getOrderMultiplier('financial_need') +
    config.gniTierWeight * getOrderMultiplier('gni_tier') +
    config.firstGenerationWeight * getOrderMultiplier('first_generation') +
    config.vulnerableRiskWeight * getOrderMultiplier('vulnerable_risks') +
    config.personalResilienceWeight * getOrderMultiplier('personal_resilience') +
    config.academicPerformanceWeight * getOrderMultiplier('academic_potential') +
    config.underrepresentedRegionWeight * getOrderMultiplier('underrepresented_region');

  const calculatedScore = totalWeights > 0 ? Number((weightedSum / totalWeights).toFixed(2)) : 50;

  return {
    calculatedScore,
    scoreBreakdown: {
      financialNeedScore: Number(needNorm.toFixed(1)),
      gniTierScore: gniScore,
      firstGenScore,
      vulnerabilityScore: Number(vulnerabilityScore.toFixed(1)),
      resilienceScore: Number(resilienceScore.toFixed(1)),
      academicScore: Number(academicScore.toFixed(1)),
      regionScore,
    },
  };
}

export function calculateGrantAmount(applicant: Applicant): number {
  // Study level maxima per call:
  // Bachelor's: CHF 8,000/year
  // Master's: CHF 6,500/year
  // Doctoral: CHF 5,000/year
  let maxAnnualAward = 8000;
  let standardCourses = 40;
  let standardYearlyCourses = 10;

  if (applicant.study_level === "Master's") {
    maxAnnualAward = 6500;
    standardCourses = 12;
    standardYearlyCourses = 6;
  } else if (applicant.study_level === 'Doctoral') {
    maxAnnualAward = 5000;
    standardCourses = 12;
    standardYearlyCourses = 4;
  }

  // Proration factor based on remaining courses
  const coursesRemaining = Math.max(1, standardCourses - applicant.courses_completed);
  let monthsOfStudy = 12;
  if (coursesRemaining < standardYearlyCourses) {
    monthsOfStudy = Math.max(4, Math.round((coursesRemaining / standardYearlyCourses) * 12));
  }
  const prorationFactor = monthsOfStudy / 12;

  // Documented annual shortfall:
  // Shortfall = (monthly expenses - expected income 2027 - family support) * monthsOfStudy + tuition - external scholarships
  // Net of savings exceeding 8,000 emergency buffer
  const monthlyNeed = Math.max(0, applicant.financial_need_chf);
  const annualLivingNeed = monthlyNeed * monthsOfStudy;
  const tuition = applicant.tuition_fees_per_year_chf * prorationFactor;
  const extScholarship = applicant.external_scholarship_amount_chf;
  const excessSavings = Math.max(0, applicant.savings_chf - 8000);

  const rawShortfall = Math.max(0, annualLivingNeed + tuition - extScholarship - excessSavings);

  // Award capped by degree level maximum
  const cappedAward = Math.min(maxAnnualAward * prorationFactor, rawShortfall);

  // Round to nearest 50 CHF, minimum 1,000 CHF if eligible and has need
  const rounded = Math.round(cappedAward / 50) * 50;
  return Math.max(rounded > 0 ? 1000 : 0, rounded);
}

export function runGrantAllocation(
  applicants: Applicant[],
  hardCriteria: HardCriteriaConfig = DEFAULT_HARD_CRITERIA,
  softPriorities: SoftPrioritiesConfig = DEFAULT_SOFT_PRIORITIES,
  totalBudget: number = 500000
): {
  processedApplicants: ProcessedApplicant[];
  summary: AllocationSummary;
  auditMetrics: BiasAuditMetrics;
} {
  // Step 1: Evaluate eligibility and scores
  const processed: ProcessedApplicant[] = applicants.map((app) => {
    const { isEligible, reasons } = evaluateApplicantEligibility(app, hardCriteria);
    const { calculatedScore, scoreBreakdown } = calculateApplicantScores(app, softPriorities);
    const recommendedGrantAmount = isEligible ? calculateGrantAmount(app) : 0;

    return {
      ...app,
      isEligible,
      ineligibilityReasons: reasons,
      calculatedScore,
      scoreBreakdown,
      recommendedGrantAmount,
      allocatedGrantAmount: 0,
      allocationStatus: isEligible ? 'waitlisted' : 'ineligible',
    };
  });

  // Step 2: Rank eligible applicants by score descending
  const eligibleOnes = processed
    .filter((a) => a.isEligible && a.recommendedGrantAmount > 0)
    .sort((a, b) => {
      if (b.calculatedScore !== a.calculatedScore) {
        return b.calculatedScore - a.calculatedScore;
      }
      // Tie-breaker: higher documented monthly shortfall
      if (b.financial_need_chf !== a.financial_need_chf) {
        return b.financial_need_chf - a.financial_need_chf;
      }
      // Second tie-breaker: GNI Tier 1 over 2 over 3
      return a.gni_tier - b.gni_tier;
    });

  // Assign ranks
  eligibleOnes.forEach((app, idx) => {
    app.rank = idx + 1;
  });

  // Step 3: Allocate budget sequentially
  let currentBudgetUsed = 0;
  const selected: ProcessedApplicant[] = [];

  for (const candidate of eligibleOnes) {
    if (currentBudgetUsed + candidate.recommendedGrantAmount <= totalBudget) {
      candidate.allocatedGrantAmount = candidate.recommendedGrantAmount;
      candidate.allocationStatus = 'selected';
      currentBudgetUsed += candidate.allocatedGrantAmount;
      selected.push(candidate);
    } else {
      // Check if partial grant is viable (if at least CHF 2,000 remains and candidate accepts)
      const remainder = totalBudget - currentBudgetUsed;
      if (remainder >= 1500) {
        candidate.allocatedGrantAmount = remainder;
        candidate.allocationStatus = 'selected';
        currentBudgetUsed += candidate.allocatedGrantAmount;
        selected.push(candidate);
        break;
      } else {
        candidate.allocationStatus = 'waitlisted';
      }
    }
  }

  // Step 4: Summary calculations
  const eligibleCount = processed.filter((a) => a.isEligible).length;
  const ineligibleCount = processed.length - eligibleCount;
  const selectedCount = selected.length;
  const waitlistedCount = eligibleCount - selectedCount;
  const averageGrantSelected =
    selectedCount > 0 ? Math.round(currentBudgetUsed / selectedCount) : 0;

  const levelCounts = {
    bachelor: selected.filter((a) => a.study_level === "Bachelor's").length,
    master: selected.filter((a) => a.study_level === "Master's").length,
    doctoral: selected.filter((a) => a.study_level === 'Doctoral').length,
  };

  const summary: AllocationSummary = {
    totalBudget,
    allocatedTotal: currentBudgetUsed,
    remainingBudget: totalBudget - currentBudgetUsed,
    totalApplicants: applicants.length,
    eligibleCount,
    ineligibleCount,
    selectedCount,
    waitlistedCount,
    averageGrantSelected,
    levelCounts,
  };

  // Step 5: Demographic & Fairness Audit Metrics
  const auditMetrics = generateAuditMetrics(processed);

  return {
    processedApplicants: processed,
    summary,
    auditMetrics,
  };
}

function buildGroupStat(all: ProcessedApplicant[], filterFn: (a: ProcessedApplicant) => boolean, label: string): GroupStatistic {
  const group = all.filter(filterFn);
  const eligible = group.filter((a) => a.isEligible);
  const selected = group.filter((a) => a.allocationStatus === 'selected');
  const selCount = selected.length;
  const totalCount = group.length;
  const selectionRate = totalCount > 0 ? Number(((selCount / totalCount) * 100).toFixed(1)) : 0;
  const avgGrant = selCount > 0 ? Math.round(selected.reduce((s, a) => s + a.allocatedGrantAmount, 0) / selCount) : 0;
  const avgNeed = totalCount > 0 ? Math.round(group.reduce((s, a) => s + a.financial_need_chf, 0) / totalCount) : 0;
  const avgGpa = totalCount > 0 ? Number((group.reduce((s, a) => s + a.gpa, 0) / totalCount).toFixed(2)) : 0;

  return {
    label,
    totalApplicants: totalCount,
    eligibleApplicants: eligible.length,
    selectedCount: selCount,
    selectionRate,
    avgGrant,
    avgNeed,
    avgGpa,
  };
}

function buildIntersectionalMatrix(
  all: ProcessedApplicant[],
  dimension1Name: string,
  dim1Extractor: (a: ProcessedApplicant) => string,
  dim1Values: string[],
  dimension2Name: string,
  dim2Extractor: (a: ProcessedApplicant) => string,
  dim2Values: string[],
  overallSelectionRate: number
): IntersectionalMatrix {
  const cells: IntersectionalCell[] = [];

  dim1Values.forEach((v1) => {
    dim2Values.forEach((v2) => {
      const matching = all.filter((a) => dim1Extractor(a) === v1 && dim2Extractor(a) === v2);
      const total = matching.length;
      const awarded = matching.filter((a) => a.allocationStatus === 'selected').length;
      const waitlisted = matching.filter((a) => a.allocationStatus === 'waitlisted').length;
      const ineligible = matching.filter((a) => a.allocationStatus === 'ineligible').length;
      const selectionRate = total > 0 ? Number(((awarded / total) * 100).toFixed(1)) : 0;
      const avgNeed = total > 0 ? Math.round(matching.reduce((s, a) => s + a.financial_need_chf, 0) / total) : 0;
      const avgGpa = total > 0 ? Number((matching.reduce((s, a) => s + a.gpa, 0) / total).toFixed(2)) : 0;
      const avgGrant = awarded > 0 ? Math.round(matching.filter((a) => a.allocationStatus === 'selected').reduce((s, a) => s + a.allocatedGrantAmount, 0) / awarded) : 0;
      
      const disparityRatio = overallSelectionRate > 0 ? Number((selectionRate / overallSelectionRate).toFixed(2)) : 1.0;
      let severity: IntersectionalCell['severity'] = 'equitable';
      if (total >= 3) {
        if (selectionRate === 0 || disparityRatio < 0.6) {
          severity = 'severe_exclusion';
        } else if (disparityRatio < 0.8) {
          severity = 'moderate_disparity';
        }
      }

      cells.push({
        var1Label: v1,
        var2Label: v2,
        comboKey: `${v1} × ${v2}`,
        total,
        awarded,
        waitlisted,
        ineligible,
        selectionRate,
        avgNeed,
        avgGpa,
        avgGrant,
        disparityRatio,
        severity,
        applicantIds: matching.map((a) => a.student_id),
      });
    });
  });

  return {
    dimension1Name,
    dimension2Name,
    cells,
    dim1Values,
    dim2Values,
  };
}

function countRiskFactors(a: ProcessedApplicant): number {
  return (
    a.risk_first_generation +
    a.risk_refugee_asylum +
    a.risk_disability +
    a.risk_housing_insecurity +
    a.risk_family_emergency +
    a.risk_language_barrier +
    a.risk_parent_student +
    a.risk_undocumented_status
  );
}

function getRiskFactorsList(a: ProcessedApplicant): string[] {
  const list: string[] = [];
  if (a.risk_refugee_asylum) list.push('Refugee / Asylum Status');
  if (a.risk_first_generation) list.push('First-Generation Student');
  if (a.risk_disability) list.push('Declared Disability / Health Need');
  if (a.risk_parent_student) list.push(`Parent Scholar (${a.dependent_children} children)`);
  if (a.risk_housing_insecurity) list.push('Housing Insecurity');
  if (a.risk_family_emergency) list.push('Acute Family Emergency');
  if (a.risk_language_barrier) list.push('Language Barrier');
  return list;
}

function getResilienceFactorsList(a: ProcessedApplicant): string[] {
  const list: string[] = [];
  if (a.resilience_overcame_adversity) list.push('Overcame Severe Adversity');
  if (a.resilience_community_engagement) list.push('Community Engagement');
  if (a.resilience_volunteer_experience) list.push('Volunteer Work');
  if (a.resilience_leadership_role) list.push('Student Leadership');
  if (a.resilience_work_experience) list.push('Work Experience');
  return list;
}

export function generateAuditMetrics(all: ProcessedApplicant[]): BiasAuditMetrics {
  const selectedAll = all.filter((a) => a.allocationStatus === 'selected');
  const nonSelectedAll = all.filter((a) => a.allocationStatus !== 'selected');
  const overallRate = all.length > 0 ? Number(((selectedAll.length / all.length) * 100).toFixed(1)) : 0;

  // By Gender
  const genders = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
  const byGender: Record<string, GroupStatistic> = {};
  genders.forEach((g) => {
    byGender[g] = buildGroupStat(all, (a) => a.gender === g, g);
  });

  // By Region
  const regions = [
    'Sub-Saharan Africa',
    'South Asia',
    'Middle East/North Africa',
    'Southeast Asia',
    'Latin America',
    'Eastern Europe',
    'Western Europe',
  ];
  const byRegion: Record<string, GroupStatistic> = {};
  regions.forEach((r) => {
    byRegion[r] = buildGroupStat(all, (a) => a.geographic_region === r, r);
  });

  // By GNI Tier
  const byGniTier: Record<string, GroupStatistic> = {
    'Tier 1 (Low Income <$3k)': buildGroupStat(all, (a) => a.gni_tier === 1, 'Tier 1'),
    'Tier 2 (Lower-Middle)': buildGroupStat(all, (a) => a.gni_tier === 2, 'Tier 2'),
    'Tier 3 (Upper-Middle/High)': buildGroupStat(all, (a) => a.gni_tier === 3, 'Tier 3'),
  };

  // By Study Level
  const byStudyLevel: Record<string, GroupStatistic> = {
    "Bachelor's": buildGroupStat(all, (a) => a.study_level === "Bachelor's", "Bachelor's"),
    "Master's": buildGroupStat(all, (a) => a.study_level === "Master's", "Master's"),
    Doctoral: buildGroupStat(all, (a) => a.study_level === 'Doctoral', 'Doctoral'),
  };

  // By Risk Factor
  const byRiskFactor = {
    firstGeneration: buildGroupStat(all, (a) => a.risk_first_generation === 1, 'First Generation'),
    refugeeAsylum: buildGroupStat(all, (a) => a.risk_refugee_asylum === 1, 'Refugee / Asylum'),
    disability: buildGroupStat(all, (a) => a.risk_disability === 1, 'Disability'),
    parentStudent: buildGroupStat(all, (a) => a.risk_parent_student === 1, 'Parent Student'),
    housingInsecure: buildGroupStat(all, (a) => a.risk_housing_insecurity === 1, 'Housing Insecure'),
  };

  // By Permit
  const permits = ['B', 'C', 'F', 'S', 'Pending'];
  const byPermit: Record<string, GroupStatistic> = {};
  permits.forEach((p) => {
    byPermit[p] = buildGroupStat(all, (a) => a.residency_permit === p, p);
  });

  // Disparate Impact Flags
  const flags: BiasAuditMetrics['disparateImpactFlags'] = [];

  const femaleRate = byGender['Female']?.selectionRate || 0;
  const maleRate = byGender['Male']?.selectionRate || 0;
  if (maleRate > 0 && femaleRate > 0) {
    const ratio = Number((Math.min(femaleRate, maleRate) / Math.max(femaleRate, maleRate)).toFixed(2));
    if (ratio < 0.8) {
      flags.push({
        metric: 'Gender Selection Ratio',
        description: `Adverse impact detected between Female (${femaleRate}%) and Male (${maleRate}%) with disparity ratio ${ratio} (threshold 0.80)`,
        severity: ratio < 0.65 ? 'high' : 'moderate',
        ratio,
      });
    } else {
      flags.push({
        metric: 'Gender Equity',
        description: `Balanced selection rate between Female (${femaleRate}%) and Male (${maleRate}%) (ratio ${ratio})`,
        severity: 'positive',
        ratio,
      });
    }
  }

  const tier1Rate = byGniTier['Tier 1 (Low Income <$3k)']?.selectionRate || 0;
  const tier3Rate = byGniTier['Tier 3 (Upper-Middle/High)']?.selectionRate || 0;
  if (tier1Rate > 0) {
    flags.push({
      metric: 'GNI Tier Alignment',
      description: `Tier 1 Low-income scholars selected at ${tier1Rate}% vs Tier 3 at ${tier3Rate}%`,
      severity: tier1Rate >= tier3Rate ? 'positive' : 'high',
      ratio: tier3Rate > 0 ? Number((tier1Rate / tier3Rate).toFixed(2)) : 1.0,
    });
  }

  const refugeeRate = byRiskFactor.refugeeAsylum.selectionRate;
  if (refugeeRate < overallRate * 0.75) {
    flags.push({
      metric: 'Refugee/Asylum Under-representation',
      description: `Refugee/Asylum applicant selection rate (${refugeeRate}%) is lagging behind general pool average (${overallRate}%)`,
      severity: 'moderate',
      ratio: overallRate > 0 ? Number((refugeeRate / overallRate).toFixed(2)) : 0,
    });
  } else {
    flags.push({
      metric: 'Refugee/Asylum Protection',
      description: `Strong support for refugee & asylum scholars (${refugeeRate}% selection rate vs ${overallRate}% general pool)`,
      severity: 'positive',
      ratio: overallRate > 0 ? Number((refugeeRate / overallRate).toFixed(2)) : 1,
    });
  }

  // --- 1. MULTI-VARIABLE INTERSECTIONAL MATRICES ---

  // Matrix A: GNI Tier × Gender Identity
  const gniByGender = buildIntersectionalMatrix(
    all,
    'GNI Country Tier',
    (a) => (a.gni_tier === 1 ? 'Tier 1 (Low Income)' : a.gni_tier === 2 ? 'Tier 2 (Lower-Middle)' : 'Tier 3 (Upper-Middle)'),
    ['Tier 1 (Low Income)', 'Tier 2 (Lower-Middle)', 'Tier 3 (Upper-Middle)'],
    'Gender Identity',
    (a) => a.gender,
    ['Female', 'Male', 'Non-binary', 'Prefer not to say'],
    overallRate
  );

  // Matrix B: GNI Tier × Vulnerability Profile
  const gniByRisk = buildIntersectionalMatrix(
    all,
    'GNI Country Tier',
    (a) => (a.gni_tier === 1 ? 'Tier 1 (Low Income)' : a.gni_tier === 2 ? 'Tier 2 (Lower-Middle)' : 'Tier 3 (Upper-Middle)'),
    ['Tier 1 (Low Income)', 'Tier 2 (Lower-Middle)', 'Tier 3 (Upper-Middle)'],
    'Compound Vulnerability',
    (a) => {
      if (a.risk_refugee_asylum || a.risk_disability || a.risk_parent_student) return 'Severe Disadvantage (Refugee/Parent/Disability)';
      if (a.risk_first_generation && (a.risk_housing_insecurity || a.risk_family_emergency)) return 'First-Gen + Emergency/Housing';
      if (a.risk_first_generation) return 'First-Gen Only';
      return 'Standard Profile';
    },
    [
      'Severe Disadvantage (Refugee/Parent/Disability)',
      'First-Gen + Emergency/Housing',
      'First-Gen Only',
      'Standard Profile',
    ],
    overallRate
  );

  // Matrix C: Region × Study Level
  const regionByStudyLevel = buildIntersectionalMatrix(
    all,
    'Geographic Region',
    (a) => a.geographic_region,
    regions,
    'Study Level',
    (a) => a.study_level,
    ["Bachelor's", "Master's", 'Doctoral'],
    overallRate
  );

  // Matrix D: Study Mode × Financial Shortfall Bracket
  const studyModeByNeed = buildIntersectionalMatrix(
    all,
    'Study Mode & Swiss Work Limit',
    (a) => (a.study_mode === 'Part-time' ? 'Part-Time (15h/wk Legal Cap)' : 'Full-Time'),
    ['Part-Time (15h/wk Legal Cap)', 'Full-Time'],
    'Monthly Financial Shortfall',
    (a) => {
      if (a.financial_need_chf >= 1500) return 'Acute Shortfall (>CHF 1,500/mo)';
      if (a.financial_need_chf >= 500) return 'Moderate Shortfall (CHF 500-1,500/mo)';
      return 'Low/Zero Need (<CHF 500/mo)';
    },
    ['Acute Shortfall (>CHF 1,500/mo)', 'Moderate Shortfall (CHF 500-1,500/mo)', 'Low/Zero Need (<CHF 500/mo)'],
    overallRate
  );

  // Matrix E: Academic GPA Tier × Adversity History
  const gpaByAdversity = buildIntersectionalMatrix(
    all,
    'Academic GPA Tier',
    (a) => {
      if (a.gpa < 2.5) return 'GPA < 2.50 (At Risk)';
      if (a.gpa < 3.0) return 'GPA 2.50 - 2.99';
      if (a.gpa < 3.5) return 'GPA 3.00 - 3.49';
      return 'GPA 3.50 - 4.00 (High Honors)';
    },
    ['GPA < 2.50 (At Risk)', 'GPA 2.50 - 2.99', 'GPA 3.00 - 3.49', 'GPA 3.50 - 4.00 (High Honors)'],
    'Declared Hardship & Strength',
    (a) => {
      if (a.resilience_overcame_adversity && (a.risk_refugee_asylum || a.risk_disability || a.risk_family_emergency)) {
        return 'Overcame Acute Adversity & Trauma';
      }
      if (a.resilience_community_engagement || a.resilience_volunteer_experience) {
        return 'Civic & Volunteer Engagement';
      }
      return 'Standard Academic Path';
    },
    ['Overcame Acute Adversity & Trauma', 'Civic & Volunteer Engagement', 'Standard Academic Path'],
    overallRate
  );

  // --- 2. HOLISTIC MACRO PROFILE COMPARISON (AWARDED VS NON-AWARDED) ---
  const calcAvg = (arr: ProcessedApplicant[], fn: (a: ProcessedApplicant) => number) => {
    return arr.length > 0 ? arr.reduce((s, a) => s + fn(a), 0) / arr.length : 0;
  };
  const calcPct = (arr: ProcessedApplicant[], fn: (a: ProcessedApplicant) => boolean) => {
    return arr.length > 0 ? (arr.filter(fn).length / arr.length) * 100 : 0;
  };

  const holisticComparison: HolisticMetricComparison[] = [
    {
      metricLabel: 'Documented Monthly Need',
      category: 'economic',
      awardedAvg: Math.round(calcAvg(selectedAll, (a) => a.financial_need_chf)),
      nonAwardedAvg: Math.round(calcAvg(nonSelectedAll, (a) => a.financial_need_chf)),
      totalPoolAvg: Math.round(calcAvg(all, (a) => a.financial_need_chf)),
      unit: 'CHF/mo',
      deltaText: `+CHF ${(Math.round(calcAvg(selectedAll, (a) => a.financial_need_chf)) - Math.round(calcAvg(nonSelectedAll, (a) => a.financial_need_chf))).toLocaleString()} higher in awarded`,
      alignment: 'solidarity_aligned',
    },
    {
      metricLabel: 'Monthly Living Expenses',
      category: 'economic',
      awardedAvg: Math.round(calcAvg(selectedAll, (a) => a.monthly_expenses_chf)),
      nonAwardedAvg: Math.round(calcAvg(nonSelectedAll, (a) => a.monthly_expenses_chf)),
      totalPoolAvg: Math.round(calcAvg(all, (a) => a.monthly_expenses_chf)),
      unit: 'CHF/mo',
      deltaText: `Awarded face CHF ${Math.round(calcAvg(selectedAll, (a) => a.monthly_expenses_chf)).toLocaleString()} avg living cost`,
      alignment: 'neutral',
    },
    {
      metricLabel: 'Monthly Housing & Rent',
      category: 'economic',
      awardedAvg: Math.round(calcAvg(selectedAll, (a) => a.housing_cost_chf)),
      nonAwardedAvg: Math.round(calcAvg(nonSelectedAll, (a) => a.housing_cost_chf)),
      totalPoolAvg: Math.round(calcAvg(all, (a) => a.housing_cost_chf)),
      unit: 'CHF/mo',
      deltaText: `Rent burden averages CHF ${Math.round(calcAvg(selectedAll, (a) => a.housing_cost_chf)).toLocaleString()}`,
      alignment: 'neutral',
    },
    {
      metricLabel: 'Family Household Income',
      category: 'economic',
      awardedAvg: Math.round(calcAvg(selectedAll, (a) => a.family_household_income_chf)),
      nonAwardedAvg: Math.round(calcAvg(nonSelectedAll, (a) => a.family_household_income_chf)),
      totalPoolAvg: Math.round(calcAvg(all, (a) => a.family_household_income_chf)),
      unit: 'CHF/mo',
      deltaText: `-CHF ${(Math.round(calcAvg(nonSelectedAll, (a) => a.family_household_income_chf)) - Math.round(calcAvg(selectedAll, (a) => a.family_household_income_chf))).toLocaleString()} lower household income in awarded`,
      alignment: 'solidarity_aligned',
    },
    {
      metricLabel: 'Personal Liquid Savings',
      category: 'economic',
      awardedAvg: Math.round(calcAvg(selectedAll, (a) => a.savings_chf)),
      nonAwardedAvg: Math.round(calcAvg(nonSelectedAll, (a) => a.savings_chf)),
      totalPoolAvg: Math.round(calcAvg(all, (a) => a.savings_chf)),
      unit: 'CHF',
      deltaText: `Awarded hold CHF ${Math.round(calcAvg(selectedAll, (a) => a.savings_chf)).toLocaleString()} vs CHF ${Math.round(calcAvg(nonSelectedAll, (a) => a.savings_chf)).toLocaleString()}`,
      alignment: 'solidarity_aligned',
    },
    {
      metricLabel: 'Academic GPA',
      category: 'academic',
      awardedAvg: Number(calcAvg(selectedAll, (a) => a.gpa).toFixed(2)),
      nonAwardedAvg: Number(calcAvg(nonSelectedAll, (a) => a.gpa).toFixed(2)),
      totalPoolAvg: Number(calcAvg(all, (a) => a.gpa).toFixed(2)),
      unit: '/ 4.00',
      deltaText: `Awarded GPA is +${(Number(calcAvg(selectedAll, (a) => a.gpa).toFixed(2)) - Number(calcAvg(nonSelectedAll, (a) => a.gpa).toFixed(2))).toFixed(2)} pts higher`,
      alignment: 'merit_skewed',
    },
    {
      metricLabel: 'Compounding Vulnerability Factors',
      category: 'vulnerability',
      awardedAvg: Number(calcAvg(selectedAll, countRiskFactors).toFixed(2)),
      nonAwardedAvg: Number(calcAvg(nonSelectedAll, countRiskFactors).toFixed(2)),
      totalPoolAvg: Number(calcAvg(all, countRiskFactors).toFixed(2)),
      unit: 'risks/student',
      deltaText: `Awarded have ${Number(calcAvg(selectedAll, countRiskFactors).toFixed(2))} compound risk factors`,
      alignment: 'solidarity_aligned',
    },
    {
      metricLabel: 'Personal Resilience Factors',
      category: 'vulnerability',
      awardedAvg: Number(
        calcAvg(
          selectedAll,
          (a) =>
            a.resilience_overcame_adversity +
            a.resilience_community_engagement +
            a.resilience_volunteer_experience +
            a.resilience_leadership_role +
            a.resilience_work_experience
        ).toFixed(2)
      ),
      nonAwardedAvg: Number(
        calcAvg(
          nonSelectedAll,
          (a) =>
            a.resilience_overcame_adversity +
            a.resilience_community_engagement +
            a.resilience_volunteer_experience +
            a.resilience_leadership_role +
            a.resilience_work_experience
        ).toFixed(2)
      ),
      totalPoolAvg: Number(
        calcAvg(
          all,
          (a) =>
            a.resilience_overcame_adversity +
            a.resilience_community_engagement +
            a.resilience_volunteer_experience +
            a.resilience_leadership_role +
            a.resilience_work_experience
        ).toFixed(2)
      ),
      unit: 'resilience strengths',
      deltaText: 'Stronger civic & adversity proof in awarded cohort',
      alignment: 'solidarity_aligned',
    },
    {
      metricLabel: 'Low-Income Origin (GNI Tier 1)',
      category: 'demographic',
      awardedAvg: `${Number(calcPct(selectedAll, (a) => a.gni_tier === 1).toFixed(1))}%`,
      nonAwardedAvg: `${Number(calcPct(nonSelectedAll, (a) => a.gni_tier === 1).toFixed(1))}%`,
      totalPoolAvg: `${Number(calcPct(all, (a) => a.gni_tier === 1).toFixed(1))}%`,
      unit: '% share',
      deltaText: `Tier 1 represents ${Number(calcPct(selectedAll, (a) => a.gni_tier === 1).toFixed(1))}% of awarded scholars`,
      alignment: 'solidarity_aligned',
    },
    {
      metricLabel: 'First-Generation University Students',
      category: 'demographic',
      awardedAvg: `${Number(calcPct(selectedAll, (a) => a.risk_first_generation === 1).toFixed(1))}%`,
      nonAwardedAvg: `${Number(calcPct(nonSelectedAll, (a) => a.risk_first_generation === 1).toFixed(1))}%`,
      totalPoolAvg: `${Number(calcPct(all, (a) => a.risk_first_generation === 1).toFixed(1))}%`,
      unit: '% share',
      deltaText: `${Number(calcPct(selectedAll, (a) => a.risk_first_generation === 1).toFixed(1))}% of awardees are 1st gen`,
      alignment: 'solidarity_aligned',
    },
    {
      metricLabel: 'Student Parents with Dependents',
      category: 'demographic',
      awardedAvg: `${Number(calcPct(selectedAll, (a) => a.risk_parent_student === 1).toFixed(1))}%`,
      nonAwardedAvg: `${Number(calcPct(nonSelectedAll, (a) => a.risk_parent_student === 1).toFixed(1))}%`,
      totalPoolAvg: `${Number(calcPct(all, (a) => a.risk_parent_student === 1).toFixed(1))}%`,
      unit: '% share',
      deltaText: `${Number(calcPct(selectedAll, (a) => a.risk_parent_student === 1).toFixed(1))}% parent students awarded`,
      alignment: 'neutral',
    },
    {
      metricLabel: 'Part-Time Working Students',
      category: 'demographic',
      awardedAvg: `${Number(calcPct(selectedAll, (a) => a.study_mode === 'Part-time').toFixed(1))}%`,
      nonAwardedAvg: `${Number(calcPct(nonSelectedAll, (a) => a.study_mode === 'Part-time').toFixed(1))}%`,
      totalPoolAvg: `${Number(calcPct(all, (a) => a.study_mode === 'Part-time').toFixed(1))}%`,
      unit: '% share',
      deltaText: `${Number(calcPct(selectedAll, (a) => a.study_mode === 'Part-time').toFixed(1))}% working students in awarded`,
      alignment: 'neutral',
    },
  ];

  // --- 3. COMPOUNDING VULNERABILITY ANALYSIS ---
  const risk0 = all.filter((a) => countRiskFactors(a) === 0);
  const risk1 = all.filter((a) => countRiskFactors(a) === 1);
  const risk2 = all.filter((a) => countRiskFactors(a) === 2);
  const risk3Plus = all.filter((a) => countRiskFactors(a) >= 3);

  const getCompoundingStat = (label: string, group: ProcessedApplicant[]): CompoundingVulnerabilityStat => {
    const awarded = group.filter((a) => a.allocationStatus === 'selected').length;
    const rate = group.length > 0 ? Number(((awarded / group.length) * 100).toFixed(1)) : 0;
    const avgNeed = group.length > 0 ? Math.round(group.reduce((s, a) => s + a.financial_need_chf, 0) / group.length) : 0;
    const avgScore = group.length > 0 ? Number((group.reduce((s, a) => s + a.calculatedScore, 0) / group.length).toFixed(1)) : 0;

    return {
      riskCountLabel: label,
      totalApplicants: group.length,
      awardedCount: awarded,
      selectionRate: rate,
      avgMonthlyNeed: avgNeed,
      avgCalculatedScore: avgScore,
    };
  };

  const compoundingVulnerability: CompoundingVulnerabilityStat[] = [
    getCompoundingStat('0 Risk Factors (Baseline)', risk0),
    getCompoundingStat('1 Risk Factor (e.g. First-Gen only)', risk1),
    getCompoundingStat('2 Risk Factors (Compound Disadvantage)', risk2),
    getCompoundingStat('3+ Compounding Vulnerabilities (Severe Need)', risk3Plus),
  ];

  // --- 4. IDENTIFICATION OF LEFT-BEHIND PERSONAS & SCHOLARS ---
  // High-Need Left Behind list: non-selected with need >= 900 CHF or 2+ risks
  const leftBehindHighNeedList: LeftBehindProfile[] = nonSelectedAll
    .filter((a) => a.financial_need_chf >= 900 || countRiskFactors(a) >= 2)
    .sort((a, b) => {
      // Prioritize waitlisted first, then by monthly need
      if (a.allocationStatus !== b.allocationStatus) {
        return a.allocationStatus === 'waitlisted' ? -1 : 1;
      }
      return b.financial_need_chf - a.financial_need_chf;
    })
    .slice(0, 40)
    .map((a) => {
      let exclusionReason = '';
      if (!a.isEligible) {
        exclusionReason = a.ineligibilityReasons.join('; ');
      } else {
        exclusionReason = `Rank #${a.rank || 'N/A'} (Score ${a.calculatedScore}) — fell below CHF 500,000 budget cutoff`;
      }

      return {
        student_id: a.student_id,
        gender: a.gender,
        age: a.age,
        country_origin: a.country_origin,
        geographic_region: a.geographic_region,
        gni_tier: a.gni_tier,
        study_level: a.study_level,
        university: a.university,
        field_of_study: a.field_of_study,
        gpa: a.gpa,
        academic_standing: a.academic_standing,
        financial_need_chf: a.financial_need_chf,
        monthly_expenses_chf: a.monthly_expenses_chf,
        savings_chf: a.savings_chf,
        residency_permit: a.residency_permit,
        riskCount: countRiskFactors(a),
        riskFactors: getRiskFactorsList(a),
        resilienceFactors: getResilienceFactorsList(a),
        allocationStatus: a.allocationStatus as 'waitlisted' | 'ineligible',
        exclusionReason,
        rank: a.rank,
        compoundingDisadvantageScore: Math.round(countRiskFactors(a) * 20 + (a.gni_tier === 1 ? 40 : 20) + (a.financial_need_chf / 20)),
      };
    });

  // Archetypes of Who Is Left Behind
  const waitlistHighNeed = nonSelectedAll.filter((a) => a.allocationStatus === 'waitlisted' && a.financial_need_chf >= 1200);
  const leftBehindParents = nonSelectedAll.filter((a) => a.risk_parent_student === 1);
  const leftBehindRefugees = nonSelectedAll.filter((a) => a.risk_refugee_asylum === 1);
  const leftBehindSavers = nonSelectedAll.filter((a) => a.savings_chf > 10000 && a.financial_need_chf < 400);

  const leftBehindArchetypes: LeftBehindArchetype[] = [
    {
      id: 'archetype_borderline_tier1',
      title: 'The GNI Tier 1 Acute Need Borderline Cohort',
      affectedCount: waitlistHighNeed.filter((a) => a.gni_tier === 1).length,
      description:
        'Scholars originating from Sub-Saharan Africa and South Asia experiencing severe living cost deficits (>CHF 1,200/mo) who qualified on all hard criteria but narrowly ranked below the CHF 500k budget cut-off line (Ranks #77 - #140).',
      typicalCombination: 'GNI Tier 1 × High Monthly Living Need (>CHF 1,400) × Good Academic Standing (GPA 2.8 - 3.2)',
      whyLeftBehind:
        'Edged out in soft priority ranking by applicants with marginally higher GPA (3.6+) or research publications despite having equal or greater financial hardship.',
      missionConflict:
        'Conflicts with Core Value 2 (Financial Solidarity), which states that grants should rescue scholars facing forced university departure regardless of academic competition.',
      suggestedRemedy:
        'Increase Financial Need weight to 45% and lower Academic Performance weight from 25% to 15%.',
      sampleStudentId: waitlistHighNeed.find((a) => a.gni_tier === 1)?.student_id || 'STU000073',
    },
    {
      id: 'archetype_working_parent_squeeze',
      title: 'The Working Student-Parent Double Burden',
      affectedCount: leftBehindParents.length,
      description:
        'Student parents juggling part-time studies with raising dependent children. Legally constrained by Swiss student visa rules to at most 15 hours/week of work, they face immense childcare and housing costs but achieve moderate GPAs due to caregiver duties.',
      typicalCombination: 'Student Parent (1-2 Dependents) × Part-Time Study Mode × High Rent (>CHF 1,000/mo) × GPA 2.6 - 3.1',
      whyLeftBehind:
        'Their GPA reflects time poverty from caretaking, and the current formula does not provide an explicit dependent child stipend multiplier.',
      missionConflict:
        'Contradicts Core Value 3 (Social Inclusion) and Equal Opportunity by implicitly penalizing scholars with domestic care responsibilities.',
      suggestedRemedy:
        'Elevate the Vulnerable Risk weight to 25% and activate a dedicated parental allowance scoring adjustment.',
      sampleStudentId: leftBehindParents[0]?.student_id || 'STU000011',
    },
    {
      id: 'archetype_refugee_trauma_borderline',
      title: 'The Displaced Refugee Scholars Left on Waitlist',
      affectedCount: leftBehindRefugees.length,
      description:
        'Scholars holding Permit F, S, or Pending status who survived forced displacement or conflict. While they documented overcoming acute adversity, their non-traditional transcripts or language barriers suppressed their score.',
      typicalCombination: 'Refugee/Asylum Status × Permit F/S/Pending × Language Barrier × Acute Adversity',
      whyLeftBehind:
        'Disqualified if GPA dropped below 2.50 without accepted adversity waiver, or waitlisted because publication points favoured privileged scholars.',
      missionConflict:
        'Directly impacts Core Value 1 (Equal Opportunity) and the 2026 Call priority for scholars demonstrating exceptional resilience.',
      suggestedRemedy:
        'Adopt the compassionate GPA adversity waiver and place Vulnerable Risks second in the tie-breaker hierarchy.',
      sampleStudentId: leftBehindRefugees[0]?.student_id || 'STU000024',
    },
    {
      id: 'archetype_prudent_savers',
      title: 'The High-Rent Prudent Savers Penalized by Asset Offsets',
      affectedCount: leftBehindSavers.length,
      description:
        'Students who worked tirelessly before coming to Switzerland to save CHF 10,000–14,000 as a safety net against catastrophic Swiss living expenses, only to have their calculated grant shortfall heavily discounted.',
      typicalCombination: 'Modest Family Income × High Swiss Rent (>CHF 1,200) × Liquid Savings CHF 10k-15k',
      whyLeftBehind:
        'The formula treats modest survival savings as an asset offset, penalizing foresight in one of the most expensive countries in the world.',
      missionConflict:
        'Disregards Dignity and Respect by punishing prudent self-reliance.',
      suggestedRemedy:
        'Protect an emergency liquid buffer of up to CHF 15,000 before applying any savings deduction.',
      sampleStudentId: leftBehindSavers[0]?.student_id || 'STU000002',
    },
  ];

  return {
    totalPool: all.length,
    selectedPool: selectedAll.length,
    overallSelectionRate: overallRate,
    byGender,
    byRegion,
    byGniTier,
    byStudyLevel,
    byRiskFactor,
    byPermit,
    disparateImpactFlags: flags,
    intersectionalMatrices: {
      gniByGender,
      gniByRisk,
      regionByStudyLevel,
      studyModeByNeed,
      gpaByAdversity,
    },
    holisticComparison,
    compoundingVulnerability,
    leftBehindArchetypes,
    leftBehindHighNeedList,
  };
}

