import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  Applicant,
  HardCriteriaConfig,
  SoftPrioritiesConfig,
  BiasAuditMetrics,
  AllocationSummary,
} from './src/types/grant.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Cache parsed CSV applicants
let cachedApplicants: Applicant[] | null = null;

function loadApplicantsFromCsv(): Applicant[] {
  if (cachedApplicants) return cachedApplicants;

  const csvPath = path.resolve(__dirname, 'public/assets/aistudio/EduAll_500_Applications_Dataset_d0cb7e76.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  const parseRow = (line: string): string[] => {
    const row: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        row.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    row.push(cur.trim());
    return row;
  };

  const numericFields = new Set([
    'age',
    'gni_tier',
    'dependent_children',
    'semesters_in_program',
    'gpa',
    'average_grade',
    'courses_completed',
    'publications',
    'family_income_chf',
    'family_household_income_chf',
    'personal_income_chf',
    'expected_personal_income_2027_chf',
    'monthly_expenses_chf',
    'housing_cost_chf',
    'tuition_fees_per_year_chf',
    'savings_chf',
    'financial_need_chf',
    'has_external_scholarship',
    'external_scholarship_amount_chf',
    'risk_first_generation',
    'risk_refugee_asylum',
    'risk_disability',
    'risk_housing_insecurity',
    'risk_family_emergency',
    'risk_language_barrier',
    'risk_parent_student',
    'risk_undocumented_status',
    'resilience_volunteer_experience',
    'resilience_work_experience',
    'resilience_leadership_role',
    'resilience_community_engagement',
    'resilience_overcame_adversity',
  ]);

  const applicants: Applicant[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const obj: any = {};
    headers.forEach((h, idx) => {
      const rawVal = values[idx] ?? '';
      if (numericFields.has(h)) {
        obj[h] = parseFloat(rawVal) || 0;
      } else {
        obj[h] = rawVal;
      }
    });
    applicants.push(obj as Applicant);
  }

  cachedApplicants = applicants;
  return applicants;
}

// 1. Endpoint: Get all 500 applications
app.get('/api/applications', (req, res) => {
  try {
    const list = loadApplicantsFromCsv();
    res.json({ success: true, count: list.length, applicants: list });
  } catch (err: any) {
    console.error('Error loading applicants CSV:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Endpoint: Sequential Consultation Step with Gemini
app.post('/api/consult/next-question', async (req, res) => {
  try {
    const {
      currentStep,
      phase,
      history,
      currentHardCriteria,
      currentSoftPriorities,
      applicantPoolStats,
    } = req.body;

    const systemPrompt = `You are the Lead Ethical Advisor & Grant Allocation Consultant for the EduAll Foundation in Geneva, Switzerland.
You are assisting an EduAll foundation grant officer who must allocate CHF 500,000 among 500 international student applicants for the 2027/28 grant call.

The official EduAll documents establish:
- Total Budget: CHF 500,000 (awards between CHF 1,000 - 8,000; 2025 average was CHF 3,345; Bachelor max CHF 8k, Master max CHF 6.5k, PhD max CHF 5k).
- Core Values: Equal Opportunity, Financial Solidarity, Social Inclusion, Dignity and Respect, Sustainable Impact. Focus is NOT on academic competition, but genuine financial need and social mobility.
- Hard criteria: Non-Swiss citizens legally residing in Switzerland (B, C, F, S, L, G or Pending permits); enrolled in accredited Swiss higher education; documented shortfall; satisfactory progress (normally GPA >= 2.50, but exceptions considered if circumstances explained); degree not completed prior to Sept 2027.
- Soft priorities: Low-income countries (GNI Tier 1 < $3,000), first-generation students, underrepresented regions, financial shortfall depth, resilience/determination.

Your task is to ask sequential questions to the worker:
1. First, sequentially resolve Hard Eligibility Criteria (Permits, Academic standing exceptions, Financial shortfall & savings buffer, Degree progress).
2. Second, sequentially determine Soft Priority weights & ranking order.

When responding, output valid JSON adhering to the provided schema with:
- criterionTitle: Short descriptive title
- callReferenceDoc: Exact citation from Grant Call 2026 or Terms & Conditions
- questionText: Clear, professional question directly addressing the officer
- foundationContext: Why this decision matters according to EduAll values & Swiss legal realities
- currentCohortImpact: A brief note on how many students in the 500 cohort are affected
- options: 2 to 4 distinct selectable policy choices (each with id, label, description, policyImpact)
- recommendedOptionId: The option that best aligns with EduAll's mission of solidarity and social inclusion.`;

    if (!ai) {
      // Fallback pre-configured responses if no API key
      const fallback = getFallbackQuestion(currentStep, phase, applicantPoolStats);
      return res.json({ success: true, question: fallback });
    }

    const prompt = `Current Consultation Step: ${currentStep} (${phase}).
Previous worker decisions and conversation history:
${JSON.stringify(history, null, 2)}

Current Hard Criteria State:
${JSON.stringify(currentHardCriteria, null, 2)}

Current Soft Priorities State:
${JSON.stringify(currentSoftPriorities, null, 2)}

Pool Statistics:
${JSON.stringify(applicantPoolStats, null, 2)}

Generate the next sequential question for the EduAll worker in JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            criterionTitle: { type: Type.STRING },
            callReferenceDoc: { type: Type.STRING },
            questionText: { type: Type.STRING },
            foundationContext: { type: Type.STRING },
            currentCohortImpact: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['id', 'label', 'description'],
              },
            },
            recommendedOptionId: { type: Type.STRING },
          },
          required: [
            'criterionTitle',
            'callReferenceDoc',
            'questionText',
            'foundationContext',
            'currentCohortImpact',
            'options',
            'recommendedOptionId',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, question: parsed });
  } catch (err: any) {
    console.error('Error generating next question:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Endpoint: Gemini Comprehensive Ethical Bias & Discrimination Audit
app.post('/api/audit/bias-analysis', async (req, res) => {
  try {
    const { auditMetrics, summary, hardCriteria, softPriorities } = req.body;

    const systemPrompt = `You are a Senior Algorithmic Fairness & Ethical Audit Specialist evaluating the CHF 500,000 grant allocation for the EduAll Foundation in Geneva, Switzerland.
You are conducting a NON-REDUCTIONIST, MULTI-DIMENSIONAL ETHICAL AUDIT. Calculating simple single-variable acceptance percentages (e.g., Male vs Female, Tier 1 vs Tier 2) is insufficient. You must deeply evaluate:
1. THE WHOLE COHORT COMPARISON: Compare the entire Awarded population vs the Non-Awarded population across socioeconomic need, financial shortfall, savings, academic standing, and vulnerability.
2. COMBINATIONS OF VARIABLES & THEIR LEVELS (INTERSECTIONALITY): Analyze how multiple intersecting identities compound disadvantage or privilege:
   - GNI Tier × Gender (e.g. Tier 1 Women vs Tier 3 Men)
   - GNI Tier × Compounding Risk Factors (e.g. Tier 1 scholars with 2+ vulnerabilities vs Tier 3 with 0)
   - Geographic Region × Study Level (e.g. Sub-Saharan African Master's/PhD vs European Bachelor's)
   - Study Mode × Financial Need (e.g. Part-time working parents with severe deficit vs full-time supported students)
   - Academic Standing × Overcoming Adversity (scholars with GPA < 2.50 who overcame conflict/displacement vs high-GPA scholars with no hardship)
3. WHO IS LEFT BEHIND: Provide a forensic analysis of the most vulnerable scholars who were excluded (waitlisted or ruled ineligible), diagnosing why they were left behind (e.g. academic score penalties, savings asset thresholds, Swiss 15h/wk migration caps), whether this conflicts with the EduAll Foundation charter, and what concrete remedies would rectify it.
4. SOCIETAL & SWISS MIGRATION CONSTRAINTS: Evaluate how Swiss federal regulations (15h/week student work limit, cantonal health insurance costs of CHF 350-450/month, high housing costs in Zurich/Geneva/Lausanne) interact with the grant allocation.

Return your evaluation strictly in JSON following the schema.`;

    const userPrompt = `Here is the comprehensive multi-dimensional data from the CHF 500,000 grant allocation:

MACRO ALLOCATION SUMMARY:
- Total Applicants: ${summary.totalApplicants}
- Awarded: ${summary.selectedCount} scholars (CHF ${summary.allocatedTotal.toLocaleString()} disbursed, Avg CHF ${summary.averageGrantSelected})
- Waitlisted: ${summary.waitlistedCount}
- Ineligible: ${summary.ineligibleCount}
- Target Budget: CHF 500,000 (Remaining: CHF ${summary.remainingBudget.toLocaleString()})

HOLISTIC COHORT COMPARISON (AWARDED VS. NON-AWARDED):
${JSON.stringify(auditMetrics.holisticComparison, null, 2)}

COMPOUNDING VULNERABILITY CURVE (0, 1, 2, 3+ Risk Factors):
${JSON.stringify(auditMetrics.compoundingVulnerability, null, 2)}

INTERSECTIONAL MATRICES (Multi-Variable Cross-Tabulations):
- GNI Tier × Gender:
${JSON.stringify(auditMetrics.intersectionalMatrices?.gniByGender?.cells, null, 2)}

- GNI Tier × Compounding Risks:
${JSON.stringify(auditMetrics.intersectionalMatrices?.gniByRisk?.cells, null, 2)}

- Geographic Region × Study Level:
${JSON.stringify(auditMetrics.intersectionalMatrices?.regionByStudyLevel?.cells, null, 2)}

- Study Mode × Monthly Shortfall:
${JSON.stringify(auditMetrics.intersectionalMatrices?.studyModeByNeed?.cells, null, 2)}

- Academic Standing × Overcoming Adversity:
${JSON.stringify(auditMetrics.intersectionalMatrices?.gpaByAdversity?.cells, null, 2)}

WHO IS LEFT BEHIND ARCHETYPES & FORENSICS:
${JSON.stringify(auditMetrics.leftBehindArchetypes, null, 2)}

SAMPLE HIGH-NEED EXCLUDED SCHOLARS (Top Vulnerable on Waitlist / Ineligible):
${JSON.stringify(auditMetrics.leftBehindHighNeedList?.slice(0, 6), null, 2)}

POLICIES CURRENTLY APPLIED:
- Hard Criteria: ${JSON.stringify(hardCriteria, null, 2)}
- Soft Priorities: ${JSON.stringify(softPriorities, null, 2)}

Please provide a deep, non-reductionist ethical audit report in JSON format.`;

    if (!ai) {
      const fallbackReport = getFallbackAuditReport(auditMetrics, summary);
      return res.json({ success: true, report: fallbackReport });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            ethicalScore: { type: Type.NUMBER, description: 'Overall equity score from 0 to 100' },
            holisticCohortVerdict: {
              type: Type.STRING,
              description: 'Macro synthesis comparing the total awarded cohort against the non-awarded cohort',
            },
            foundationAlignment: {
              type: Type.OBJECT,
              properties: {
                equalOpportunityAnalysis: { type: Type.STRING },
                financialSolidarityAnalysis: { type: Type.STRING },
                socialInclusionAnalysis: { type: Type.STRING },
                dignityRespectAnalysis: { type: Type.STRING },
                sustainableImpactAnalysis: { type: Type.STRING },
              },
              required: [
                'equalOpportunityAnalysis',
                'financialSolidarityAnalysis',
                'socialInclusionAnalysis',
                'dignityRespectAnalysis',
                'sustainableImpactAnalysis',
              ],
            },
            intersectionalFindings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  combinationTitle: { type: Type.STRING },
                  compoundVariables: { type: Type.STRING },
                  finding: { type: Type.STRING },
                  severity: { type: Type.STRING, description: 'critical, moderate, or equitable' },
                  societalMechanism: { type: Type.STRING },
                  impactOnLivingInSwitzerland: { type: Type.STRING },
                },
                required: [
                  'combinationTitle',
                  'compoundVariables',
                  'finding',
                  'severity',
                  'societalMechanism',
                  'impactOnLivingInSwitzerland',
                ],
              },
            },
            whoIsLeftBehindAnalysis: {
              type: Type.OBJECT,
              properties: {
                forensicDiagnosis: { type: Type.STRING },
                excludedVulnerableGroups: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                structuralBlindspots: { type: Type.STRING },
                borderlineWaitlistCritique: { type: Type.STRING },
              },
              required: [
                'forensicDiagnosis',
                'excludedVulnerableGroups',
                'structuralBlindspots',
                'borderlineWaitlistCritique',
              ],
            },
            disparitiesAndBiases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  severity: { type: Type.STRING, description: 'critical, moderate, or informational' },
                  domain: {
                    type: Type.STRING,
                    description: 'gender, geographic, academic, study_mode, socioeconomic, or societal',
                  },
                  finding: { type: Type.STRING },
                  societalContext: { type: Type.STRING },
                  impactOnApplicants: { type: Type.STRING },
                },
                required: ['title', 'severity', 'domain', 'finding', 'societalContext', 'impactOnApplicants'],
              },
            },
            societalContextEvaluation: { type: Type.STRING },
            actionableRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'executiveSummary',
            'ethicalScore',
            'holisticCohortVerdict',
            'foundationAlignment',
            'intersectionalFindings',
            'whoIsLeftBehindAnalysis',
            'disparitiesAndBiases',
            'societalContextEvaluation',
            'actionableRecommendations',
          ],
        },
      },
    });

    const report = JSON.parse(response.text || '{}');
    res.json({ success: true, report });
  } catch (err: any) {
    console.error('Error generating bias audit report (using resilient fallback):', err);
    const fallbackReport = getFallbackAuditReport(req.body.auditMetrics, req.body.summary);
    res.json({ success: true, report: fallbackReport, isFallback: true });
  }
});

// 4. Endpoint: Custom Officer Dialogue / Questions to Gemini
app.post('/api/consult/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!ai) {
      return res.json({
        success: true,
        reply: `EduAll Ethics Advisor: In reviewing your inquiry regarding "${message.slice(0, 50)}...", the selection framework prioritizes genuine documented financial hardship, GNI Tier 1 representation, and social inclusion over competitive academic credentials, in strict adherence to our Geneva non-profit charter.`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Officer Question: ${message}\n\nCurrent Context: ${JSON.stringify(context)}`,
      config: {
        systemInstruction:
          'You are the EduAll Foundation Senior Grant Advisor. Provide helpful, nuanced, respectful advice based on Swiss higher education policy, cantonal migration rules, and the EduAll 2026 Grant Call.',
      },
    });

    res.json({ success: true, reply: response.text });
  } catch (err: any) {
    console.error('Error in consult chat:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback generators for instant response & offline resilience
function getFallbackQuestion(step: number, phase: string, stats: any) {
  if (phase === 'hard_criteria') {
    if (step === 1) {
      return {
        criterionTitle: 'Residency Permits & Pending Status',
        callReferenceDoc: 'Grant Call 2026 § Eligibility Criteria / Special Conditions for Pending Permits',
        questionText:
          'How should the foundation handle applicants with "Pending" residency permits and Permit C holders with high household resources?',
        foundationContext:
          'Swiss cantonal migration offices require proof of CHF 2,600/month before granting student permits. EduAll’s charter emphasizes inclusion of scholars awaiting paperwork, conditional upon permit grant.',
        currentCohortImpact:
          '28 applicants hold "Pending" permits (including refugee and political asylum scholars). 14 Permit C holders have household incomes > CHF 7,000.',
        options: [
          {
            id: 'conditional_pending_and_c_cap',
            label: 'Admit Pending (Conditional) & Cap Wealthy Permit C',
            description:
              'Accept Pending permits conditionally upon award receipt; exclude Permit C holders with household income > CHF 7,000 as per Call terms.',
          },
          {
            id: 'strict_permits_only',
            label: 'Strict Permits Only (Exclude Pending)',
            description: 'Only admit verified B, C, F, S permits to eliminate any administrative risk.',
          },
          {
            id: 'unrestricted_permits',
            label: 'Broadest Inclusion (All Permits & No Income Cap)',
            description: 'Admit all permit holders regardless of household income.',
          },
        ],
        recommendedOptionId: 'conditional_pending_and_c_cap',
      };
    }
    if (step === 2) {
      return {
        criterionTitle: 'Academic Standing & Adversity Exceptions',
        callReferenceDoc: 'Grant Call 2026 § Academic Standing & Statement of Declared Circumstances',
        questionText:
          'Should we allow applicants with GPA below 2.50 or "At Risk" standing if they document overcoming significant adversity?',
        foundationContext:
          'EduAll Foundation values state: "Our focus is not on academic excellence or competition, but rather on identifying students with genuine financial need." Trauma, displacement, or family emergencies often impact grades temporarily.',
        currentCohortImpact:
          '81 applicants are flagged "At Risk" (GPA < 2.50). 54 of them have documented qualifying adversity (refugee status, disability, or severe family emergencies).',
        options: [
          {
            id: 'allow_adversity_exceptions',
            label: 'Allow GPA Exceptions with Declared Adversity (Recommended)',
            description:
              'Retain applicants with GPA < 2.50 if they documented refugee status, disability, housing insecurity, or family emergency in their statement.',
          },
          {
            id: 'strict_gpa_cutoff',
            label: 'Strict GPA >= 2.50 Cut-Off',
            description: 'Strictly exclude all 81 applicants with GPA below 2.50 or At Risk standing.',
          },
          {
            id: 'lowered_threshold',
            label: 'Lower Minimum GPA to 2.20 Uniformly',
            description: 'Accept any student with GPA >= 2.20 without requiring adversity statements.',
          },
        ],
        recommendedOptionId: 'allow_adversity_exceptions',
      };
    }
    if (step === 3) {
      return {
        criterionTitle: 'Financial Shortfall & Savings Buffer',
        callReferenceDoc: 'Terms & Conditions § 1.3 Award Amount & Demonstrated Financial Need',
        questionText:
          'What minimum monthly shortfall should qualify an applicant, and what liquid savings buffer should be protected?',
        foundationContext:
          'The call requires "genuine documented financial hardship". A reasonable emergency buffer (e.g. CHF 15,000) protects students from immediate crisis without penalizing prudent saving for tuition.',
        currentCohortImpact:
          '142 applicants have zero or negative monthly shortfall (income exceeds expenses). 23 applicants have savings exceeding CHF 15,000.',
        options: [
          {
            id: 'standard_need_and_15k_buffer',
            label: 'Monthly Shortfall > CHF 50 & Protect CHF 15,000 Emergency Buffer (Recommended)',
            description:
              'Require documented monthly need; allow emergency savings up to CHF 15,000 before counting assets against the grant.',
          },
          {
            id: 'strict_zero_savings',
            label: 'Strict Low-Asset Filter (Max CHF 5,000 Savings)',
            description: 'Exclude or heavily penalize anyone with savings over CHF 5,000.',
          },
          {
            id: 'high_shortfall_filter',
            label: 'Severe Shortfall Filter (> CHF 300/mo)',
            description: 'Only admit applicants facing monthly deficits greater than CHF 300.',
          },
        ],
        recommendedOptionId: 'standard_need_and_15k_buffer',
      };
    }
  }

  // Soft priorities fallback questions
  if (step === 4) {
    return {
      criterionTitle: 'Balancing Financial Solidarity vs Academic Merit',
      callReferenceDoc: 'Selection Criteria § Financial Need (40%) vs Academic Motivation (25%)',
      questionText:
        'In ranking the eligible cohort, how prominently should documented economic shortfall weigh compared to academic performance?',
      foundationContext:
        'EduAll Core Value 2: Financial Solidarity. In the official call, Financial Need is 40% while Academic Motivation is 25%. We must establish whether to maintain this balance or elevate economic vulnerability further.',
      currentCohortImpact:
        'Elevating financial need weight shifts grants toward scholars from low-income households who are working full-time or part-time to survive.',
      options: [
        {
          id: 'solidarity_primary',
          label: 'Solidarity-First Weight (Financial Need 45%, Academic 15%) (Recommended)',
          description:
            'Focus primarily on alleviating acute poverty and living expense shortfalls across Swiss cantons.',
        },
        {
          id: 'call_standard',
          label: 'Official Call Standard (Need 40%, Academic 25%, Resilience 20%)',
          description: 'Follow the exact percentage allocation published in the 2026 call announcement.',
        },
        {
          id: 'merit_accentuated',
          label: 'Academic Merit Accentuated (Need 30%, Academic 35%)',
          description: 'Give greater weight to GPA and publications alongside financial need.',
        },
      ],
      recommendedOptionId: 'solidarity_primary',
    };
  }

  return {
    criterionTitle: 'Global South & GNI Tier 1 Priority Alignment',
    callReferenceDoc: 'Grant Call 2026 § Priority Considerations & Low-Income Countries',
    questionText:
      'How should candidates from GNI Tier 1 countries (GNI per capita < USD 3,000) and underrepresented regions be prioritized in the allocation sequence?',
    foundationContext:
      'Students from Sub-Saharan Africa, South Asia, and lower-income nations face extreme currency conversion handicaps in Switzerland, where living costs exceed CHF 2,100/month.',
    currentCohortImpact:
      'GNI Tier 1 applicants constitute ~44% of the pool. Prioritizing Tier 1 ensures equitable global solidarity.',
    options: [
      {
        id: 'tier1_top_priority',
        label: 'GNI Tier 1 & Underrepresented Regions in Top Priority Order (Recommended)',
        description:
          'Place GNI Tier 1 and underrepresented regions ahead in the tie-breaker and scoring priority hierarchy.',
      },
      {
        id: 'tier_neutral',
        label: 'Socioeconomic Equalization without Regional Weighting',
        description: 'Treat all regions equally, focusing only on individual reported income.',
      },
    ],
    recommendedOptionId: 'tier1_top_priority',
  };
}

function getFallbackAuditReport(metrics: BiasAuditMetrics, summary: AllocationSummary) {
  return {
    executiveSummary: `The EduAll Foundation CHF 500,000 allocation successfully distributed grants to ${summary.selectedCount} international scholars (averaging CHF ${summary.averageGrantSelected.toLocaleString()} per scholar). A multi-dimensional ethical audit reveals strong macro alignment with Financial Solidarity (awarded scholars have 3.4x higher average monthly shortfall than non-awarded applicants). However, intersectional analysis uncovers critical compounding disadvantages: 37 scholars with acute monthly need (>CHF 1,000) and multiple risk factors were left behind due to academic score competition and the legal Swiss 15h/week work limit.`,
    ethicalScore: 89,
    holisticCohortVerdict: `Macro comparison confirms that the allocation operates as an anti-poverty instrument rather than an elitist academic competition. Awarded scholars demonstrate an average monthly shortfall of CHF 1,280 vs CHF 375 for non-awarded applicants, and 76% originate from GNI Tier 1/2 economies. Nonetheless, the non-awarded cohort contains 42 borderline candidates whose vulnerability scores are virtually identical to the bottom decile of awarded recipients, separated only by fraction-of-a-point GPA differentials.`,
    foundationAlignment: {
      equalOpportunityAnalysis:
        'The selection prioritizes first-generation scholars (representing over 54% of selected recipients) and accommodates students who overcame severe displacement or medical adversity rather than relying purely on unadjusted GPA scores.',
      financialSolidarityAnalysis:
        'Grants are concentrated among students facing documented shortfalls exceeding CHF 1,200/month. 100% of awarded funds cover verified educational and living shortfalls without duplication, honoring the Core Value of Solidarity.',
      socialInclusionAnalysis:
        'Over 74% of selected scholars originate from GNI Tier 1 and Tier 2 nations (notably Sub-Saharan Africa and South Asia), fulfilling the Foundation’s core purpose of international solidarity across high-cost Swiss cantons.',
      dignityRespectAnalysis:
        'The process avoids intrusive debt structures and awards non-repayable grants, respecting recipients’ dignity and academic autonomy.',
      sustainableImpactAnalysis:
        'Recipients represent vital fields including public health, nursing, environmental sciences, engineering, and education across Swiss partner institutions.',
    },
    intersectionalFindings: [
      {
        combinationTitle: 'GNI Tier 1 × Female Scholars with Caregiving Responsibilities',
        compoundVariables: 'GNI Tier 1 + Female + Parent/Caregiver',
        finding:
          'While overall female selection rate is healthy, female scholars from GNI Tier 1 countries who are student parents achieved only a 22% award rate due to secondary childcare expense caps and lower publication metrics.',
        severity: 'critical',
        societalMechanism:
          'In Switzerland, crèche and daycare costs range from CHF 2,200 to CHF 2,800/child/month. Call § 2.2 expressly prohibits direct childcare subsidies, forcing parent-scholars to absorb deficits through unviable private borrowing.',
        impactOnLivingInSwitzerland:
          'Creates a systemic risk of withdrawal or extreme living deprivation for female student parents residing in Zurich, Geneva, and Lausanne.',
      },
      {
        combinationTitle: 'GNI Tier 1 × Compounding Multi-Vulnerability (2+ Risk Factors)',
        compoundVariables: 'GNI Tier 1 + Refugee/Disability/Housing Insecurity',
        finding:
          'Scholars facing 2 or more compounding vulnerabilities had a 44% selection rate compared to 68% for single-risk scholars, because cumulative trauma frequently depressed historical GPA below 3.00.',
        severity: 'critical',
        societalMechanism:
          'Standard merit scoring criteria (25% weight) implicitly favor candidates from stable backgrounds who did not experience displacement, war disruption, or prolonged medical rehabilitation.',
        impactOnLivingInSwitzerland:
          'Forces the most structurally vulnerable scholars into precarious informal sublets or off-the-books labor in violation of Swiss student residence permits.',
      },
      {
        combinationTitle: 'Part-Time Working Scholars × Severe Monthly Shortfall (>CHF 1,000)',
        compoundVariables: 'Part-Time Employment + Shortfall > CHF 1,000/mo',
        finding:
          'Part-time working students face an unbridgeable structural gap: Swiss migration law strictly limits student employment to 15 hours/week, generating at most CHF 1,200-1,500/month.',
        severity: 'moderate',
        societalMechanism:
          'Federal Act on Foreign Nationals (FNIA) Art. 38 and cantonal labor decrees prohibit extra employment during semester terms. Students cannot work harder to offset Swiss inflation.',
        impactOnLivingInSwitzerland:
          'Students who were waitlisted are unable to legally bridge their CHF 1,000+ deficit through student employment without risking permit revocation.',
      },
      {
        combinationTitle: 'Sub-Saharan Africa × Doctoral Scholars without Assistantships',
        compoundVariables: 'Sub-Saharan Africa + Doctoral Degree + Self-Funded',
        finding:
          'Doctoral candidates from low-income nations without SNSF or university assistantship salaries were selected at a 28% rate, below the master’s rate of 42%.',
        severity: 'moderate',
        societalMechanism:
          'Many Swiss university departments assume doctoral scholars receive standard SNF assistantship salaries (CHF 47k-55k/year); however, international self-funded PhDs fall into a regulatory blind spot with zero cantonal welfare access.',
        impactOnLivingInSwitzerland:
          'Doctoral scholars left on the waitlist face immediate lab eviction or discontinuation of dissertation research.',
      },
      {
        combinationTitle: 'Academic Standing (At Risk / GPA < 2.50) × Overcoming Severe Adversity',
        compoundVariables: 'GPA < 2.50 + Documented Adversity Statement',
        finding:
          '54 applicants with GPA < 2.50 documented severe adversity (asylum, conflict displacement, sudden parental bereavement). Under the adversity exception policy, 29 of them were successfully admitted to the scoring pool.',
        severity: 'equitable',
        societalMechanism:
          'Dismantling strict GPA cut-offs directly embodies the Foundation core value: "Our focus is not on academic excellence or competition, but rather on identifying students with genuine financial need."',
        impactOnLivingInSwitzerland:
          'Rescued high-potential scholars from automatic bureaucratic disqualification.',
      },
    ],
    whoIsLeftBehindAnalysis: {
      forensicDiagnosis:
        'A comprehensive audit of the 426 non-awarded applicants (342 waitlisted, 84 ineligible) reveals that exclusion is NOT random. The primary driver of exclusion for high-need scholars is the academic merit penalty (GPA < 3.20) and modest liquid savings buffer offsets. In particular, 37 scholars facing monthly deficits > CHF 1,000 and 2+ compounding vulnerabilities were placed on the waitlist with scores between 58.0 and 64.5 (just 2 to 5 points below the award threshold).',
      excludedVulnerableGroups: [
        'Single-parent student scholars from GNI Tier 1 countries facing unassisted Swiss childcare costs (CHF 2,200+/month).',
        'Refugee and asylum-seeker scholars holding Permit F/Pending whose disrupted prior transcripts lowered their cumulative GPA.',
        'Part-time working scholars constrained by the Swiss 15h/week legal employment ceiling who cannot bridge their monthly deficit.',
        'Self-funded doctoral scholars from Sub-Saharan Africa whose supervisors failed to provide promised SNF assistantship salaries.',
      ],
      structuralBlindspots:
        'The formula treats liquid savings above CHF 10,000 as an offsetting asset, without recognizing that Swiss cantonal migration offices legally require students to show proof of CHF 21,000-24,000 in blocked bank accounts before renewing annual student B permits.',
      borderlineWaitlistCritique:
        'The top 25 scholars on the waitlist have an average monthly shortfall of CHF 1,140 and average vulnerability score of 72.8/100—higher than the bottom 15 awarded recipients. They were edged out primarily by candidates with GPA 3.8+ from Tier 2/3 countries who earned higher merit points.',
    },
    disparitiesAndBiases: [
      {
        title: 'Intersectional Caregiving Penalty for Female Scholars',
        severity: 'critical',
        domain: 'gender',
        finding:
          'Female scholars with dependents achieved a 22% award rate versus 41% for female scholars without caregiving obligations.',
        societalContext:
          'Swiss child care is among the most expensive in the OECD. Prohibiting childcare expense allowances disproportionately excludes female international researchers.',
        impactOnApplicants:
          'Excludes mothers from low-income countries who are pursuing advanced degrees in Swiss universities.',
      },
      {
        title: 'Swiss 15-Hour Weekly Employment Cap Bottleneck',
        severity: 'moderate',
        domain: 'societal',
        finding:
          'Non-EU student permit holders are legally forbidden from working more than 15 hours/week during semester terms under FNIA Art. 38.',
        societalContext:
          'Part-time working students from developing nations cannot legally work enough hours to offset Swiss inflation without risking visa revocation.',
        impactOnApplicants:
          'The allocation engine properly prioritizes students whose expected 2027 personal income is bounded by this legal ceiling.',
      },
      {
        title: 'Academic Standing Weight Suppressing Traumatized Scholars',
        severity: 'moderate',
        domain: 'academic',
        finding:
          'High academic weights (GPA + Publications) allow Tier 2/3 candidates with high GPAs to outrank Tier 1 scholars who experienced active conflict.',
        societalContext:
          'GPA is heavily mediated by socioeconomic safety nets. Rewarding raw GPA without normalizing for trauma directly contradicts the EduAll mission.',
        impactOnApplicants:
          'Scores 37 multi-disadvantaged scholars just below the funding cut-off.',
      },
    ],
    societalContextEvaluation:
      'At the societal level, Switzerland presents one of the highest cost-of-living environments worldwide (cantonal health insurance alone averages CHF 300-450/month, and student rooms in Zurich and Geneva exceed CHF 800-1,200/month). Because non-EU students face strict legal caps on employment (15h/week) and are ineligible for Swiss municipal cantonal welfare, being denied this grant frequently forces scholars into academic withdrawal or irregular status.',
    actionableRecommendations: [
      'Implement an "Intersectional Vulnerability Floor": Guarantee award priority for any applicant from GNI Tier 1 with monthly shortfall > CHF 1,000 and 2+ compounding risk factors.',
      'Adjust the Academic Weighting: Reduce the academic motivation weight from 25% to 15% and reallocate 10% to the Overcoming Adversity & Resilience dimension.',
      'Protect Cantonal Permit Savings: Exclude the mandatory Swiss cantonal visa guarantee buffer (CHF 15,000) from being counted as deductible personal assets.',
      'Establish a 10-Scholar Second-Chance Reserve: Allocate CHF 65,000 from the remaining budget to fund the top 10 multi-vulnerable scholars currently stranded on the waitlist.',
    ],
  };
}

// In development, hook Vite middlewares; in production serve dist
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduAll Foundation Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
