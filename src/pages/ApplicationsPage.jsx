import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Search, MapPin, FileText, Trash2, CalendarClock } from "lucide-react";
import {
  loadApplications, updateApplication, removeApplication, getHistoryEntry,
  STATUSES, STATUS_LABELS, isFollowUpDue, daysSince, countByStatus,
  APPLICATIONS_CHANGED_EVENT,
} from "../utils/applications";

const inputClass = "rounded-lg border border-obsidian-200 bg-white px-3 py-2 text-sm text-obsidian-950 focus:outline-none focus:ring-2 focus:ring-obsidian-900";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-obsidian-200 px-3 py-2 text-sm font-medium hover:bg-obsidian-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-900 disabled:cursor-not-allowed disabled:opacity-50";
const recommendationClasses = {
  "strong fit": "bg-obsidian-950 text-white",
  reach: "bg-white border border-obsidian-900 text-obsidian-950",
  pass: "bg-obsidian-100 text-obsidian-600",
};

function ApplicationCard({ application }) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState(application.notes || "");
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [materialsMissing, setMaterialsMissing] = useState(false);
  const materials = getHistoryEntry(application.materialsId);
  const due = isFollowUpDue(application);
  const elapsed = daysSince(application.appliedAt || application.createdAt);

  useEffect(() => {
    // Refresh saved notes across tabs without discarding a local unsaved draft.
    if (!dirty) setNotes(application.notes || "");
  }, [application.notes, dirty]);

  function save(patch) {
    // updateApplication returns null when the record is gone or storage rejected the write;
    // a failed notes draft stays in the textarea so nothing is lost.
    const saved = Boolean(updateApplication(application.id, patch));
    setError(saved ? "" : "Could not save this change. Check browser storage and try again.");
    return saved;
  }

  function openMaterials() {
    const entry = getHistoryEntry(application.materialsId);
    if (entry) navigate("/results", { state: entry });
    else setMaterialsMissing(true);
  }

  return (
    <article className="rounded-xl border border-obsidian-200 bg-white p-6 shadow-neo sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-sm font-semibold text-obsidian-600 break-words">{application.company || "Unknown company"}</p>
          <h2 className="text-xl font-bold text-obsidian-950 break-words">{application.title || "Untitled role"}</h2>
          {application.location && <p className="mt-2 flex items-center gap-2 text-sm text-obsidian-600"><MapPin size={16} aria-hidden="true" />{application.location}</p>}
          {elapsed !== null && <p className="mt-2 text-sm text-obsidian-500">{application.appliedAt ? "Applied" : "Saved"} {elapsed} {elapsed === 1 ? "day" : "days"} ago</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Number.isFinite(application.fitScore) && <span className="rounded-full bg-obsidian-50 px-3 py-1 text-sm font-semibold text-obsidian-950">{application.fitScore}/100 fit</span>}
          {recommendationClasses[application.recommendation] && <span className={`rounded-full px-3 py-1 text-sm font-medium ${recommendationClasses[application.recommendation]}`}>{application.recommendation}</span>}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-obsidian-700">
          Status
          <select className={inputClass} value={application.status} onChange={(event) => save({ status: event.target.value })}>
            {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-obsidian-700">
          <span>Follow-up date {due && <span className="ml-2 rounded bg-obsidian-950 px-2 py-0.5 text-xs text-white">Due</span>}</span>
          <input type="date" className={inputClass} value={application.followUpAt || ""} onChange={(event) => save({ followUpAt: event.target.value || null })} />
        </label>
      </div>

      <details className="mt-5">
        <summary className="cursor-pointer rounded text-sm font-medium text-obsidian-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-900">Notes{dirty ? " — unsaved" : ""}</summary>
        <label className="mt-3 block">
          <span className="sr-only">Notes for {application.title} at {application.company}</span>
          <textarea className={`${inputClass} w-full resize-y`} rows={4} placeholder="Interview details, contacts, or your next step…" value={notes} onChange={(event) => { setNotes(event.target.value); setDirty(true); }} onBlur={() => { if (dirty && save({ notes })) setDirty(false); }} />
        </label>
        <p className="mt-1 text-xs text-obsidian-500">Notes save when you leave the field.</p>
      </details>

      {error && <p className="mt-4 text-sm font-medium text-obsidian-950" role="alert">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-obsidian-100 pt-4">
        <div>
          <button type="button" className={buttonClass} disabled={!materials || materialsMissing} onClick={openMaterials}><FileText size={16} aria-hidden="true" />Open materials</button>
          {(!materials || materialsMissing) && <p className="mt-1 text-xs text-obsidian-500">Materials expired — this tracker record is still available.</p>}
        </div>
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-obsidian-600">Delete this tracker record?</span>
            <button type="button" className={`${buttonClass} bg-obsidian-950 text-white hover:bg-obsidian-800`} onClick={() => { if (!removeApplication(application.id)) setError("Could not delete this record. Please try again."); }}>Confirm delete</button>
            <button type="button" className={buttonClass} onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        ) : <button type="button" className={buttonClass} onClick={() => setConfirmDelete(true)}><Trash2 size={16} aria-hidden="true" />Delete</button>}
      </div>
    </article>
  );
}

ApplicationCard.propTypes = {
  application: PropTypes.shape({
    id: PropTypes.string.isRequired,
    company: PropTypes.string,
    title: PropTypes.string,
    location: PropTypes.string,
    status: PropTypes.string.isRequired,
    notes: PropTypes.string,
    followUpAt: PropTypes.string,
    appliedAt: PropTypes.string,
    createdAt: PropTypes.string,
    fitScore: PropTypes.number,
    recommendation: PropTypes.string,
    materialsId: PropTypes.string,
  }).isRequired,
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState(loadApplications);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const refresh = () => setApplications(loadApplications());
    window.addEventListener(APPLICATIONS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    // Keep date-dependent due markers current when the page stays open overnight.
    const timer = window.setInterval(refresh, 60_000);
    refresh();
    return () => {
      window.removeEventListener(APPLICATIONS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);

  const counts = countByStatus(applications);
  const dueCount = applications.filter((application) => isFollowUpDue(application)).length;
  const search = query.trim().toLowerCase();
  const visible = applications.filter((application) =>
    (statusFilter === "all" || application.status === statusFilter) &&
    `${application.company || ""} ${application.title || ""}`.toLowerCase().includes(search)
  ).sort((a, b) => Number(isFollowUpDue(b)) - Number(isFollowUpDue(a)) || String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));

  return (
    <div className="min-h-screen bg-obsidian-50 pt-24 pb-20 px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto max-w-7xl">
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-3"><Briefcase className="text-obsidian-950" aria-hidden="true" /><h1 className="text-3xl font-bold text-obsidian-950 sm:text-4xl">Application tracker</h1></div>
          <p className="text-obsidian-600">Your next steps, all in one place. Track progress, keep notes, and follow up.</p>
          <p className="mt-2 text-xs text-obsidian-500">Saved in this browser. Generated materials may expire before their tracker records.</p>
        </header>

        <section aria-label="Application summary" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATUSES.map((status) => <div key={status} className="rounded-xl border border-obsidian-200 bg-white p-4 shadow-neo"><p className="text-sm text-obsidian-600">{STATUS_LABELS[status]}</p><p className="mt-1 text-2xl font-bold text-obsidian-950">{counts[status]}</p></div>)}
          <div className="rounded-xl border border-obsidian-900 bg-white p-4 shadow-neo"><p className="flex items-center gap-1 text-sm text-obsidian-700"><CalendarClock size={16} aria-hidden="true" />Follow-ups due</p><p className="mt-1 text-2xl font-bold text-obsidian-950">{dueCount}</p></div>
        </section>

        {applications.length === 0 ? (
          <section className="rounded-xl border border-obsidian-200 bg-white p-8 text-center shadow-neo">
            <h2 className="text-xl font-semibold text-obsidian-950">Your next opportunity starts here</h2>
            <p className="mt-3 text-obsidian-600">Generate application materials and a tracker record will appear automatically.</p>
            <Link to="/" className={`${buttonClass} mt-6 bg-obsidian-950 text-white hover:bg-obsidian-800`}>Generate your first application</Link>
          </section>
        ) : (
          <>
            <section aria-label="Filter applications" className="mb-6 rounded-xl border border-obsidian-200 bg-white p-6 shadow-neo">
              <label className="relative mb-4 block"><span className="sr-only">Search company or title</span><Search size={18} className="absolute left-3 top-3 text-obsidian-500" aria-hidden="true" /><input type="search" className={`${inputClass} w-full pl-10`} placeholder="Search company or title…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
              <div className="flex flex-wrap gap-2" aria-label="Status filters">
                {["all", ...STATUSES].map((status) => <button type="button" key={status} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)} className={`rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-500 ${statusFilter === status ? "border-obsidian-950 bg-obsidian-950 text-white" : "border-obsidian-200 text-obsidian-600 hover:border-obsidian-900"}`}>{status === "all" ? "All" : STATUS_LABELS[status]}</button>)}
              </div>
            </section>
            <p className="mb-4 text-sm text-obsidian-500" aria-live="polite">{visible.length} of {applications.length} applications · Follow-ups due first</p>
            <div className="space-y-5">
              {visible.map((application) => <ApplicationCard key={application.id} application={application} />)}
              {visible.length === 0 && <div className="rounded-xl border border-obsidian-200 bg-white p-8 text-center shadow-neo"><p className="text-obsidian-600">No applications match these filters.</p><button type="button" className={`${buttonClass} mt-4`} onClick={() => { setQuery(""); setStatusFilter("all"); }}>Clear filters</button></div>}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
