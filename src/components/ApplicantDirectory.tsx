import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Download,
  GraduationCap,
  Scale,
} from 'lucide-react';
import { ProcessedApplicant } from '../types/grant';

interface ApplicantDirectoryProps {
  processedApplicants: ProcessedApplicant[];
  onInspectApplicant: (applicant: ProcessedApplicant) => void;
  onExportCsv: () => void;
}

export const ApplicantDirectory: React.FC<ApplicantDirectoryProps> = ({
  processedApplicants,
  onInspectApplicant,
  onExportCsv,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [gniFilter, setGniFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [permitFilter, setPermitFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return processedApplicants.filter((app) => {
      if (statusFilter !== 'all' && app.allocationStatus !== statusFilter) return false;
      if (levelFilter !== 'all' && app.study_level !== levelFilter) return false;
      if (regionFilter !== 'all' && app.geographic_region !== regionFilter) return false;
      if (gniFilter !== 'all' && String(app.gni_tier) !== gniFilter) return false;
      if (genderFilter !== 'all' && app.gender !== genderFilter) return false;
      if (permitFilter !== 'all' && app.residency_permit !== permitFilter) return false;
      if (riskFilter === 'first_gen' && app.risk_first_generation !== 1) return false;
      if (riskFilter === 'refugee' && app.risk_refugee_asylum !== 1) return false;
      if (riskFilter === 'disability' && app.risk_disability !== 1) return false;
      if (riskFilter === 'parent' && app.risk_parent_student !== 1) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          app.student_id.toLowerCase().includes(q) ||
          app.country_origin.toLowerCase().includes(q) ||
          app.university.toLowerCase().includes(q) ||
          app.field_of_study.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    processedApplicants,
    statusFilter,
    levelFilter,
    regionFilter,
    gniFilter,
    genderFilter,
    permitFilter,
    riskFilter,
    search,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Directory Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 tracking-wide uppercase">
            <Users className="w-4 h-4 text-teal-600" />
            Complete Application Database
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
            Applicant Directory & Dossier Registry (500 Scholars)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, and inspect detailed profiles for all 500 applicants in the EduAll 2026 grant call.
          </p>
        </div>

        <button
          onClick={onExportCsv}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Export Allocation Registry (CSV)
        </button>
      </div>

      {/* Multi-Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Student ID, Country, Uni, Subject..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="selected">Selected for Grant</option>
            <option value="waitlisted">Waitlisted (Eligible)</option>
            <option value="ineligible">Ineligible (Hard Criterion)</option>
          </select>

          {/* Study Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="all">All Study Levels</option>
            <option value="Bachelor's">Bachelor's Studies</option>
            <option value="Master's">Master's Studies</option>
            <option value="Doctoral">Doctoral Studies</option>
          </select>

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="all">All Geographic Regions</option>
            <option value="Sub-Saharan Africa">Sub-Saharan Africa</option>
            <option value="South Asia">South Asia</option>
            <option value="Middle East/North Africa">Middle East/North Africa</option>
            <option value="Southeast Asia">Southeast Asia</option>
            <option value="Latin America">Latin America</option>
            <option value="Eastern Europe">Eastern Europe</option>
            <option value="Western Europe">Western Europe</option>
          </select>

          {/* GNI Tier Filter */}
          <select
            value={gniFilter}
            onChange={(e) => setGniFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="all">All GNI Tiers</option>
            <option value="1">Tier 1 (Low Income &lt; $3,000)</option>
            <option value="2">Tier 2 (Lower-Middle)</option>
            <option value="3">Tier 3 (Upper-Middle/Other)</option>
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="all">All Genders</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>

          {/* Risk Group Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="all">All Circumstances</option>
            <option value="first_gen">First-Generation Student</option>
            <option value="refugee">Refugee / Asylum Status</option>
            <option value="disability">Declared Disability</option>
            <option value="parent">Student Parent</option>
          </select>

          {/* Reset button */}
          {(search ||
            statusFilter !== 'all' ||
            levelFilter !== 'all' ||
            regionFilter !== 'all' ||
            gniFilter !== 'all' ||
            genderFilter !== 'all' ||
            permitFilter !== 'all' ||
            riskFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setLevelFilter('all');
                setRegionFilter('all');
                setGniFilter('all');
                setGenderFilter('all');
                setPermitFilter('all');
                setRiskFilter('all');
              }}
              className="text-teal-700 font-semibold hover:underline px-2 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex justify-between items-center text-slate-500 font-medium pt-1 border-t border-slate-100">
          <span>
            Displaying <strong>{filtered.length}</strong> matching records
          </span>
          <span>
            Selected in current view:{' '}
            <strong className="text-emerald-700">
              {filtered.filter((a) => a.allocationStatus === 'selected').length}
            </strong>
          </span>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">ID</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Country & Region</th>
                <th className="py-3 px-3.5">Gender / Age</th>
                <th className="py-3 px-3.5">University & Subject</th>
                <th className="py-3 px-3.5 text-center">Permit</th>
                <th className="py-3 px-3.5 text-center">GPA</th>
                <th className="py-3 px-3.5 text-right">Mo. Expenses</th>
                <th className="py-3 px-3.5 text-right">Mo. Need</th>
                <th className="py-3 px-3.5 text-center">Score</th>
                <th className="py-3 px-3.5 text-right font-bold">Grant Award</th>
                <th className="py-3 px-3.5 text-center">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((app) => {
                const isSelected = app.allocationStatus === 'selected';
                const isWaitlisted = app.allocationStatus === 'waitlisted';

                return (
                  <tr
                    key={app.student_id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                      {app.student_id}
                    </td>

                    <td className="py-2.5 px-3.5">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Selected
                        </span>
                      ) : isWaitlisted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Waitlisted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          Ineligible
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{app.country_origin}</div>
                      <div className="text-[10px] text-slate-500">
                        {app.geographic_region} (Tier {app.gni_tier})
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div>{app.gender}</div>
                      <div className="text-[10px] text-slate-500">{app.age} yrs</div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="font-medium text-slate-900 truncate max-w-[170px]" title={app.university}>
                        {app.university}
                      </div>
                      <div className="text-[10px] text-slate-500">{app.study_level} • {app.field_of_study}</div>
                    </td>

                    <td className="py-2.5 px-3.5 text-center font-mono font-semibold">
                      {app.residency_permit}
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <span className="font-semibold">{app.gpa.toFixed(2)}</span>
                    </td>

                    <td className="py-2.5 px-3.5 text-right font-medium">
                      CHF {app.monthly_expenses_chf.toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3.5 text-right font-medium text-teal-800">
                      CHF {app.financial_need_chf.toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                        {app.calculatedScore}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      {isSelected ? (
                        <strong className="text-emerald-800 font-bold">
                          CHF {app.allocatedGrantAmount.toLocaleString()}
                        </strong>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        onClick={() => onInspectApplicant(app)}
                        className="p-1.5 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        title="View Full Application File"
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
