import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { GeminiConsultation } from './components/GeminiConsultation';
import { AllocationMatrix } from './components/AllocationMatrix';
import { BiasAuditTab } from './components/BiasAuditTab';
import { ApplicantDirectory } from './components/ApplicantDirectory';
import { ApplicantModal } from './components/ApplicantModal';
import {
  Applicant,
  HardCriteriaConfig,
  SoftPrioritiesConfig,
  ProcessedApplicant,
} from './types/grant';
import {
  DEFAULT_HARD_CRITERIA,
  DEFAULT_SOFT_PRIORITIES,
  runGrantAllocation,
} from './utils/allocationEngine';
import { Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [hardCriteria, setHardCriteria] = useState<HardCriteriaConfig>(DEFAULT_HARD_CRITERIA);
  const [softPriorities, setSoftPriorities] = useState<SoftPrioritiesConfig>(DEFAULT_SOFT_PRIORITIES);
  const [inspectedApplicant, setInspectedApplicant] = useState<ProcessedApplicant | null>(null);

  // Load applicants from API
  useEffect(() => {
    async function fetchApplicants() {
      try {
        setIsLoadingApplicants(true);
        const res = await fetch('/api/applications');
        const data = await res.json();
        if (data.success && data.applicants) {
          setApplicants(data.applicants);
        } else {
          setLoadError(data.error || 'Failed to parse applicant CSV');
        }
      } catch (err: any) {
        setLoadError(err.message);
      } finally {
        setIsLoadingApplicants(false);
      }
    }
    fetchApplicants();
  }, []);

  // Compute allocation and audit metrics dynamically
  const { processedApplicants, summary, auditMetrics } = useMemo(() => {
    if (!applicants.length) {
      return {
        processedApplicants: [],
        summary: {
          totalBudget: 500000,
          allocatedTotal: 0,
          remainingBudget: 500000,
          totalApplicants: 0,
          eligibleCount: 0,
          ineligibleCount: 0,
          selectedCount: 0,
          waitlistedCount: 0,
          averageGrantSelected: 0,
          levelCounts: { bachelor: 0, master: 0, doctoral: 0 },
        },
        auditMetrics: {
          totalPool: 0,
          selectedPool: 0,
          byGender: {},
          byRegion: {},
          byGniTier: {},
          byStudyLevel: {},
          byRiskFactor: {
            firstGeneration: { label: '', totalApplicants: 0, eligibleApplicants: 0, selectedCount: 0, selectionRate: 0, avgGrant: 0, avgNeed: 0, avgGpa: 0 },
            refugeeAsylum: { label: '', totalApplicants: 0, eligibleApplicants: 0, selectedCount: 0, selectionRate: 0, avgGrant: 0, avgNeed: 0, avgGpa: 0 },
            disability: { label: '', totalApplicants: 0, eligibleApplicants: 0, selectedCount: 0, selectionRate: 0, avgGrant: 0, avgNeed: 0, avgGpa: 0 },
            parentStudent: { label: '', totalApplicants: 0, eligibleApplicants: 0, selectedCount: 0, selectionRate: 0, avgGrant: 0, avgNeed: 0, avgGpa: 0 },
            housingInsecure: { label: '', totalApplicants: 0, eligibleApplicants: 0, selectedCount: 0, selectionRate: 0, avgGrant: 0, avgNeed: 0, avgGpa: 0 },
          },
          byPermit: {},
          disparateImpactFlags: [],
        },
      };
    }
    return runGrantAllocation(applicants, hardCriteria, softPriorities, 500000);
  }, [applicants, hardCriteria, softPriorities]);

  // Keep inspected applicant in sync if policy changes
  const activeInspected = useMemo(() => {
    if (!inspectedApplicant) return null;
    return (
      processedApplicants.find((a) => a.student_id === inspectedApplicant.student_id) ||
      inspectedApplicant
    );
  }, [inspectedApplicant, processedApplicants]);

  const handleResetPolicy = () => {
    setHardCriteria(DEFAULT_HARD_CRITERIA);
    setSoftPriorities(DEFAULT_SOFT_PRIORITIES);
  };

  const handleExportCsv = () => {
    if (!processedApplicants.length) return;
    const headers = [
      'Rank',
      'Student_ID',
      'Status',
      'Allocated_Grant_CHF',
      'Calculated_Score',
      'Country',
      'Region',
      'GNI_Tier',
      'Study_Level',
      'University',
      'GPA',
      'Monthly_Need_CHF',
      'Residency_Permit',
      'Ineligibility_Reasons',
    ];

    const rows = processedApplicants.map((a) => [
      a.rank || '',
      a.student_id,
      a.allocationStatus,
      a.allocatedGrantAmount,
      a.calculatedScore,
      `"${a.country_origin}"`,
      `"${a.geographic_region}"`,
      a.gni_tier,
      `"${a.study_level}"`,
      `"${a.university}"`,
      a.gpa,
      a.financial_need_chf,
      a.residency_permit,
      `"${a.ineligibilityReasons.join('; ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EduAll_Grant_Allocation_2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        summary={summary}
        isConsulting={activeTab === 'consultation'}
        onResetPolicy={handleResetPolicy}
        onExport={handleExportCsv}
      />

      <main className="flex-1 pb-16">
        {isLoadingApplicants ? (
          <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              Loading EduAll 500 Applicants Registry...
            </h3>
            <p className="text-xs text-slate-500">
              Ingesting academic standing, financial shortfalls, declared circumstances, and Swiss permit verifications.
            </p>
          </div>
        ) : loadError ? (
          <div className="max-w-2xl mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-base">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              Failed to load applicant dataset
            </div>
            <p className="text-xs">{loadError}</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                summary={summary}
                applicants={applicants}
                onStartConsultation={() => setActiveTab('consultation')}
              />
            )}

            {activeTab === 'consultation' && (
              <GeminiConsultation
                hardCriteria={hardCriteria}
                setHardCriteria={setHardCriteria}
                softPriorities={softPriorities}
                setSoftPriorities={setSoftPriorities}
                summary={summary}
                applicants={applicants}
                onProceedToAllocation={() => setActiveTab('allocation')}
                onProceedToAudit={() => setActiveTab('audit')}
              />
            )}

            {activeTab === 'allocation' && (
              <AllocationMatrix
                processedApplicants={processedApplicants}
                summary={summary}
                softPriorities={softPriorities}
                setSoftPriorities={setSoftPriorities}
                onInspectApplicant={(app) => setInspectedApplicant(app)}
                onProceedToAudit={() => setActiveTab('audit')}
              />
            )}

            {activeTab === 'audit' && (
              <BiasAuditTab
                auditMetrics={auditMetrics}
                summary={summary}
                hardCriteria={hardCriteria}
                softPriorities={softPriorities}
                onApplyAdjustment={(adj) => setSoftPriorities((p) => ({ ...p, ...adj }))}
              />
            )}

            {activeTab === 'directory' && (
              <ApplicantDirectory
                processedApplicants={processedApplicants}
                onInspectApplicant={(app) => setInspectedApplicant(app)}
                onExportCsv={handleExportCsv}
              />
            )}
          </>
        )}
      </main>

      {/* Applicant Detail Dossier Modal */}
      <ApplicantModal
        applicant={activeInspected}
        onClose={() => setInspectedApplicant(null)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>EduAll Foundation</strong> (Fondation de droit privé, Geneva) • Grant Call Reference: EDUALL-2026-INTL-001
          </div>
          <div>
            Total Allocated: <strong className="text-slate-800">CHF {summary.allocatedTotal.toLocaleString()}</strong> of CHF 500,000 • Non-repayable education grants
          </div>
        </div>
      </footer>
    </div>
  );
}
