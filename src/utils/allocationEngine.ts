import {
  Applicant,
  HardCriteriaConfig,
  SoftPrioritiesConfig,
  ProcessedApplicant,
  AllocationSummary,
  BiasAuditMetrics,
  GroupStatistic,
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

export function generateAuditMetrics(all: ProcessedApplicant[]): BiasAuditMetrics {
  const selectedAll = all.filter((a) => a.allocationStatus === 'selected');
  const overallRate = all.length > 0 ? (selectedAll.length / all.length) * 100 : 0;

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

  // Check 4/5ths rule (80% ratio) across gender
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

  // Check GNI Tier 1 priority alignment
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

  // Check Refugee/Asylum inclusion
  const refugeeRate = byRiskFactor.refugeeAsylum.selectionRate;
  if (refugeeRate < overallRate * 0.75) {
    flags.push({
      metric: 'Refugee/Asylum Under-representation',
      description: `Refugee/Asylum applicant selection rate (${refugeeRate}%) is lagging behind general pool average (${overallRate.toFixed(1)}%)`,
      severity: 'moderate',
      ratio: overallRate > 0 ? Number((refugeeRate / overallRate).toFixed(2)) : 0,
    });
  } else {
    flags.push({
      metric: 'Refugee/Asylum Protection',
      description: `Strong support for refugee & asylum scholars (${refugeeRate}% selection rate vs ${overallRate.toFixed(1)}% general pool)`,
      severity: 'positive',
      ratio: overallRate > 0 ? Number((refugeeRate / overallRate).toFixed(2)) : 1,
    });
  }

  return {
    totalPool: all.length,
    selectedPool: selectedAll.length,
    byGender,
    byRegion,
    byGniTier,
    byStudyLevel,
    byRiskFactor,
    byPermit,
    disparateImpactFlags: flags,
  };
}
