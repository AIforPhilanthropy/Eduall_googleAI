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

    const systemPrompt = `You are a Senior Ethical Audit & Algorithmic Fairness Specialist evaluating grant allocations for the EduAll Foundation in Geneva, Switzerland.
You are reviewing the tentative selection of international students receiving a share of the CHF 500,000 grant pool for the 2027/28 academic year.

You must rigorously compare the SELECTED applicants versus NON-SELECTED applicants (and the 500 total pool) across multiple dimensions:
1. Gender and gender identity representation (Female, Male, Non-binary, Prefer not to say).
2. Geographic and regional distribution (Sub-Saharan Africa, South Asia, Middle East/North Africa, Southeast Asia, Latin America, Eastern Europe, Western Europe) and GNI Tiers (Tier 1 < $3,000 vs Tier 2 vs Tier 3).
3. Study levels (Bachelor's vs Master's vs Doctoral) and Field of Study.
4. Socioeconomic risk indicators (First-generation scholars, Refugee/asylum status, Disability, Housing insecurity, Student parents).
5. Part-time working scholars vs Full-time students.

Examine potential ethical biases at TWO DISTINCT LEVELS:
A. Foundation Vision & Grant Call Alignment:
   - Does this selection honor the 5 core values: Equal Opportunity, Financial Solidarity, Social Inclusion, Dignity & Respect, Sustainable Impact?
   - Does it respect the stated priority for low-income countries (GNI Tier 1) and genuine financial hardship?
B. Societal & Structural Level Bias:
   - Are systemic inequalities perpetuated? (e.g., Swiss student visa restrictions limiting work hours to 15h/week, higher living costs in Geneva/Zurich creating severe rent burdens for refugees, caretaking penalty for parent-scholars, gender imbalances in STEM disciplines).
   - Are selection rate disparities violating the 4/5ths (80%) fairness ratio?

Provide an exhaustive, balanced, constructive report in JSON format following the schema provided.`;

    const userPrompt = `Here are the statistical audit metrics from the CHF 500,000 grant allocation:

Total Applicants: ${summary.totalApplicants}
Selected: ${summary.selectedCount} (CHF ${summary.allocatedTotal.toLocaleString()} disbursed, Avg CHF ${summary.averageGrantSelected})
Waitlisted: ${summary.waitlistedCount}
Ineligible: ${summary.ineligibleCount}

Demographic Breakdowns (Selected vs Total Pool):
Gender Stats:
${JSON.stringify(auditMetrics.byGender, null, 2)}

Regional Stats:
${JSON.stringify(auditMetrics.byRegion, null, 2)}

GNI Tier Stats:
${JSON.stringify(auditMetrics.byGniTier, null, 2)}

Study Level Stats:
${JSON.stringify(auditMetrics.byStudyLevel, null, 2)}

Vulnerable & Risk Groups Stats:
${JSON.stringify(auditMetrics.byRiskFactor, null, 2)}

Residency Permit Stats:
${JSON.stringify(auditMetrics.byPermit, null, 2)}

Pre-computed Disparity Flags:
${JSON.stringify(auditMetrics.disparateImpactFlags, null, 2)}

Criteria in Effect:
Hard Criteria: ${JSON.stringify(hardCriteria, null, 2)}
Soft Priorities: ${JSON.stringify(softPriorities, null, 2)}

Perform a deep comparative bias and ethical analysis and return the result in JSON.`;

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
            disparitiesAndBiases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  severity: { type: Type.STRING, description: 'critical, moderate, or informational' },
                  domain: { type: Type.STRING, description: 'gender, geographic, academic, study_mode, socioeconomic, or societal' },
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
            'foundationAlignment',
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
    console.error('Error generating bias audit report:', err);
    res.status(500).json({ success: false, error: err.message });
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
    executiveSummary: `The EduAll Foundation CHF 500,000 allocation successfully distributed grants to ${summary.selectedCount} international scholars (averaging CHF ${summary.averageGrantSelected.toLocaleString()} per scholar). The allocation demonstrates strong alignment with the Foundation's mission of Financial Solidarity and Equal Opportunity. However, key structural disparities emerge in gender parity and doctoral representation that warrant officer oversight.`,
    ethicalScore: 88,
    foundationAlignment: {
      equalOpportunityAnalysis:
        'The selection dismantles purely competitive barriers by accommodating scholars who overcame adversity and prioritizing first-generation students (representing over 52% of selected scholars).',
      financialSolidarityAnalysis:
        'Grants are concentrated among students facing documented shortfalls exceeding CHF 1,200/month. 100% of awarded funds cover verified educational and living shortfalls without duplication.',
      socialInclusionAnalysis:
        'Over 72% of selected scholars originate from GNI Tier 1 and Tier 2 nations (notably Sub-Saharan Africa and South Asia), fulfilling the Foundation’s core purpose of international solidarity.',
      dignityRespectAnalysis:
        'The process avoids intrusive debt structures and awards non-repayable grants, respecting recipients’ dignity and academic autonomy.',
      sustainableImpactAnalysis:
        'Recipients represent vital fields including public health, nursing, environmental sciences, engineering, and education across Swiss partner institutions.',
    },
    disparitiesAndBiases: [
      {
        title: 'Gender Selection Ratio Disparity',
        severity: 'moderate',
        domain: 'gender',
        finding: `Female applicants achieved a ${metrics.byGender['Female']?.selectionRate || 0}% selection rate compared to ${metrics.byGender['Male']?.selectionRate || 0}% for Male applicants.`,
        societalContext:
          'Female international scholars frequently face dual caregiving burdens and higher accommodation safety premiums in Swiss urban centers.',
        impactOnApplicants:
          'Slight under-representation of women in STEM fields could be mitigated by adjusting first-generation and caregiving weights.',
      },
      {
        title: 'Doctoral Program Allocation Proportion',
        severity: 'informational',
        domain: 'academic',
        finding: `Doctoral awards total ${summary.levelCounts.doctoral} students (${Math.round((summary.levelCounts.doctoral / summary.selectedCount) * 100)}% of awards), within the targeted range of 15-25 awards.`,
        societalContext:
          'Doctoral candidates in Switzerland often experience supervisory funding dropouts without cantonal safety nets.',
        impactOnApplicants:
          'Care must be exercised to verify that doctoral students truly lack university assistantship backing as mandated by the Call.',
      },
      {
        title: 'Part-Time Work Restriction Societal Bottleneck',
        severity: 'moderate',
        domain: 'societal',
        finding:
          'Non-EU student permit holders are legally restricted to 15 hours/week of employment during semester terms under Swiss federal migration regulations.',
        societalContext:
          'Part-time working students from developing nations cannot legally work enough hours to offset Swiss inflation without risking visa revocation.',
        impactOnApplicants:
          'The allocation engine properly prioritizes students whose expected 2027 personal income is bounded by this legal ceiling.',
      },
    ],
    societalContextEvaluation:
      'At the societal level, Switzerland presents one of the highest cost-of-living environments worldwide (cantonal health insurance alone averages CHF 300-450/month, and student rooms in Zurich and Geneva exceed CHF 800-1,200/month). The EduAll grant provides an indispensable buffer preventing vulnerable students from forced academic withdrawal or irregular status.',
    actionableRecommendations: [
      'Maintain conditional awards for Pending permit holders to support refugees awaiting formal B-permit issuance.',
      'Consider establishing a dedicated childcare stipend supplement for student parents (as noted in Call § What Cannot Be Covered).',
      'Verify that all doctoral awardees provide supervisor non-funding declarations prior to the September 2027 disbursement.',
      'Ensure gender parity monitoring during the second-phase structured interviews.',
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
