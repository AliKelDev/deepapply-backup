import { motion } from "framer-motion";
import { Download, Copy, ArrowLeft, FileText, Mail, MessageSquare, Check, Minus, ClipboardList, Pencil, X, RotateCcw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import InterviewCoach from "../components/InterviewCoach";
import {
  saveHistoryEntry,
  loadHistory,
  createApplicationFromResult,
  upsertApplication,
  findApplicationByMaterials,
  loadApplicationsRaw,
} from "../utils/applications";

const ResultsPage = () => {
  const location = useLocation();
  const [applicationData, setApplicationData] = useState(location.state);
  const [attemptedRestore, setAttemptedRestore] = useState(Boolean(location.state));
  const [copiedSection, setCopiedSection] = useState(null);
  const [trackedApplication, setTrackedApplication] = useState(null);
  const [editingCover, setEditingCover] = useState(false);
  const [coverDraft, setCoverDraft] = useState("");
  const [editingCv, setEditingCv] = useState(false);
  const [cvRenderKey, setCvRenderKey] = useState(0);
  const [saveNotice, setSaveNotice] = useState("");
  const cvIframeRef = useRef(null);
  const cvPreviewViewportRef = useRef(null);
  const cvCaptureRef = useRef(null);

  useEffect(() => {
    let dataToUse = location.state;

    if (!dataToUse) {
      const cachedResults = loadHistory();
      if (cachedResults.length > 0) {
        dataToUse = cachedResults[0];
      }
    }

    if (location.state?.generatedContent) {
      // Persist the materials (deduped by the id HomePage stamped on the state) and make
      // sure the application is in the tracker exactly once.
      const stored = saveHistoryEntry(location.state);
      dataToUse = stored;
      // Respect a deletion: a tombstone pointing at these materials means the user removed the
      // record on purpose, so don't recreate it on revisit.
      const deleted = loadApplicationsRaw().some((app) => app.materialsId === stored.id && app.deletedAt);
      const tracked = deleted
        ? null
        : findApplicationByMaterials(stored.id) ||
          upsertApplication(createApplicationFromResult({ ...stored, materialsId: stored.id }));
      setTrackedApplication(tracked);
    } else if (dataToUse?.id) {
      setTrackedApplication(findApplicationByMaterials(dataToUse.id));
    }

    if (dataToUse) {
      setApplicationData(dataToUse);
    }

    if (!attemptedRestore) {
      setAttemptedRestore(true);
    }
  }, [location.state, attemptedRestore]);

  const generatedContent = applicationData?.generatedContent || null;

  const cvHtml =
    typeof generatedContent?.cvHtml === "string" ? generatedContent.cvHtml : "";

  const applyCvPreviewZoom = () => {
    const iframe = cvIframeRef.current;
    const viewport = cvPreviewViewportRef.current;
    if (!iframe || !viewport) return;

    // The document (or its root) can be absent before the srcDoc finishes loading;
    // the iframe's onLoad re-runs this once it is ready.
    const doc = iframe.contentDocument;
    if (!doc?.documentElement) return;

    // CSS inches map to 96px in browsers (so 8.5in ~= 816px). The CV template uses 8.5in.
    const expectedPageWidthPx = 8.5 * 96;
    const availableWidth = viewport.clientWidth - 2; // small guard for borders
    const zoom = Math.min(1, availableWidth / expectedPageWidthPx);

    // `zoom` is non-standard but works well in Chromium (your screenshot is Chrome).
    doc.documentElement.style.zoom = `${zoom}`;
    doc.documentElement.style.background = "#fff";
  };

  useEffect(() => {
    if (!cvHtml) return;

    const viewport = cvPreviewViewportRef.current;
    if (!viewport) return;

    applyCvPreviewZoom();

    const observer = new ResizeObserver(() => applyCvPreviewZoom());
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [cvHtml]);

  if (!generatedContent && attemptedRestore) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-obsidian-950 mb-4">No application data found</h2>
          <p className="text-obsidian-600 mb-6">Please generate an application first.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!generatedContent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-obsidian-600">
        Loading your saved results...
      </div>
    );
  }

  const getSafeFileStem = (value) => {
    if (!value || typeof value !== "string") {
      return "deepapply";
    }
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50) || "deepapply";
  };

  const inferFileStem = () => {
    const profileText = applicationData?.formData?.profileData;
    if (typeof profileText === "string" && profileText.trim()) {
      const firstLine = profileText.split(/\n|\.|,/)[0];
      if (firstLine) {
        return getSafeFileStem(firstLine);
      }
    }
    return "deepapply";
  };

  const handleDownloadCv = async () => {
    const target = cvCaptureRef.current;
    if (!target || !cvHtml) {
      return;
    }

    try {
      const canvas = await html2canvas(target, { scale: 2, scrollY: -window.scrollY });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const widthRatio = pdfWidth / canvas.width;
      const heightRatio = pdfHeight / canvas.height;
      const ratio = Math.min(widthRatio, heightRatio, 1);
      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
      const xOffset = (pdfWidth - imgWidth) / 2;
      const yOffset = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);
      pdf.save(`${inferFileStem()}-cv.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    }
  };

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  /* ---------------- editing ----------------
   * Edits are written back into the history entry (so they survive reloads and sync to the
   * cloud when signed in). The first edit snapshots the AI's originals so they can be restored.
   */
  const originals = generatedContent?.originals || null;
  const coverEdited = Boolean(originals && originals.coverLetter !== generatedContent?.coverLetter);
  const cvEdited = Boolean(originals && originals.cvHtml !== cvHtml);

  const persistContent = (patch) => {
    if (!applicationData?.generatedContent) return;
    const current = applicationData.generatedContent;
    const snapshot = current.originals || { coverLetter: current.coverLetter, cvHtml: current.cvHtml };
    const stored = saveHistoryEntry({
      ...applicationData,
      generatedContent: { ...current, ...patch, originals: snapshot, editedAt: new Date().toISOString() },
    });
    setApplicationData(stored);
    setSaveNotice("Saved");
    setTimeout(() => setSaveNotice(""), 1800);
  };

  const startCoverEdit = () => {
    setCoverDraft(generatedContent?.coverLetter || "");
    setEditingCover(true);
  };
  const saveCoverEdit = () => {
    persistContent({ coverLetter: coverDraft });
    setEditingCover(false);
  };
  const restoreCover = () => {
    if (originals) persistContent({ coverLetter: originals.coverLetter });
    setEditingCover(false);
  };
  const downloadCoverLetter = () => {
    const blob = new Blob([generatedContent?.coverLetter || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${inferFileStem()}-cover-letter.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const CV_EDIT_STYLE_ID = "deepapply-edit-style";
  const startCvEdit = () => {
    const doc = cvIframeRef.current?.contentDocument;
    if (!doc?.body) return;
    doc.body.setAttribute("contenteditable", "true");
    doc.body.setAttribute("spellcheck", "false");
    if (!doc.getElementById(CV_EDIT_STYLE_ID)) {
      const style = doc.createElement("style");
      style.id = CV_EDIT_STYLE_ID;
      style.textContent =
        "body[contenteditable]{outline:none;caret-color:#000;cursor:text}" +
        "body[contenteditable] .section:hover,body[contenteditable] .header:hover{outline:1px dashed rgba(0,0,0,.25);outline-offset:4px}";
      doc.head.appendChild(style);
    }
    setEditingCv(true);
    doc.body.focus();
  };
  const serializeCvDocument = (doc) => {
    const root = doc.documentElement.cloneNode(true);
    root.removeAttribute("style"); // drop the preview zoom
    const body = root.querySelector("body");
    body?.removeAttribute("contenteditable");
    body?.removeAttribute("spellcheck");
    root.querySelector(`#${CV_EDIT_STYLE_ID}`)?.remove();
    return `<!DOCTYPE html>\n${root.outerHTML}`;
  };
  const saveCvEdit = () => {
    const doc = cvIframeRef.current?.contentDocument;
    if (!doc?.documentElement) return;
    const html = serializeCvDocument(doc);
    setEditingCv(false);
    if (html !== cvHtml) persistContent({ cvHtml: html });
    setCvRenderKey((n) => n + 1);
  };
  const cancelCvEdit = () => {
    setEditingCv(false);
    setCvRenderKey((n) => n + 1); // re-render the iframe from the saved HTML
  };
  const restoreCv = () => {
    setEditingCv(false);
    if (originals) persistContent({ cvHtml: originals.cvHtml });
    setCvRenderKey((n) => n + 1);
  };

  const strategicInsights = generatedContent?.strategicInsights || {};
  const keyKeywords = Array.isArray(strategicInsights.keyKeywords)
    ? strategicInsights.keyKeywords
    : strategicInsights.keyKeywords
    ? [strategicInsights.keyKeywords]
    : [];
  const cultureFit = strategicInsights.cultureFit || "";
  const interviewQuestions = Array.isArray(strategicInsights.interviewQuestions)
    ? strategicInsights.interviewQuestions
    : strategicInsights.interviewQuestions
    ? [strategicInsights.interviewQuestions]
    : [];

  const asList = (value) => (Array.isArray(value) ? value : value ? [value] : []);
  const rawFit = strategicInsights.fitAssessment;
  const fitAssessment =
    rawFit && typeof rawFit === "object"
      ? {
          matchScore: Number.isFinite(Number(rawFit.matchScore))
            ? Math.max(0, Math.min(100, Math.round(Number(rawFit.matchScore))))
            : null,
          recommendation: typeof rawFit.recommendation === "string" ? rawFit.recommendation : "",
          rubric: rawFit.rubric && typeof rawFit.rubric === "object" ? rawFit.rubric : null,
          summary: typeof rawFit.summary === "string" ? rawFit.summary : "",
          strengths: asList(rawFit.strengths),
          gaps: asList(rawFit.gaps),
          matchedKeywords: asList(rawFit.keywordOverlap?.matched),
          missingKeywords: asList(rawFit.keywordOverlap?.missing),
        }
      : null;

  const recommendationStyles = {
    "strong fit": "bg-obsidian-950 text-white border-obsidian-950",
    reach: "bg-white text-obsidian-900 border-obsidian-900",
    pass: "bg-obsidian-100 text-obsidian-600 border-obsidian-200",
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-obsidian-600 hover:text-obsidian-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Form
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-obsidian-950 mb-4">
            Your Application Materials
          </h1>
          <p className="text-lg text-obsidian-600">
            Review and download your AI-generated application documents
          </p>
          {trackedApplication && (
            <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-sm text-obsidian-600">
              <ClipboardList className="w-4 h-4 text-obsidian-900" />
              <span>
                Saved to your tracker as{" "}
                <span className="font-medium text-obsidian-900">
                  {trackedApplication.title}
                  {trackedApplication.company && trackedApplication.company !== "Unknown company"
                    ? ` at ${trackedApplication.company}`
                    : ""}
                </span>
                .
              </span>
              <Link to="/applications" className="font-medium text-obsidian-900 underline underline-offset-2 hover:text-obsidian-600">
                Open tracker
              </Link>
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cover Letter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 bg-white rounded-xl border border-obsidian-200 p-8 shadow-neo"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-obsidian-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-obsidian-900" />
                </div>
                <h2 className="text-2xl font-semibold text-obsidian-950">Cover Letter</h2>
              </div>
              <div className="flex items-center gap-2">
                {saveNotice && !editingCover && !editingCv && (
                  <span className="text-xs text-obsidian-500 mr-1" aria-live="polite">{saveNotice}</span>
                )}
                {editingCover ? (
                  <>
                    <button
                      onClick={saveCoverEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-colors"
                      title="Save changes"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingCover(false)}
                      className="p-2 border border-obsidian-200 rounded-lg hover:bg-obsidian-50 transition-colors"
                      title="Discard changes"
                      aria-label="Discard changes"
                    >
                      <X className="w-5 h-5 text-obsidian-700" />
                    </button>
                  </>
                ) : (
                  <>
                    {coverEdited && (
                      <button
                        onClick={restoreCover}
                        className="p-2 border border-obsidian-200 rounded-lg hover:bg-obsidian-50 transition-colors"
                        title="Restore the AI's original"
                        aria-label="Restore the AI's original cover letter"
                      >
                        <RotateCcw className="w-5 h-5 text-obsidian-700" />
                      </button>
                    )}
                    <button
                      onClick={startCoverEdit}
                      className="p-2 border border-obsidian-200 rounded-lg hover:bg-obsidian-50 transition-colors"
                      title="Edit cover letter"
                      aria-label="Edit cover letter"
                    >
                      <Pencil className="w-5 h-5 text-obsidian-700" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(generatedContent.coverLetter, 'cover')}
                      className="p-2 border border-obsidian-200 rounded-lg hover:bg-obsidian-50 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedSection === 'cover' ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5 text-obsidian-700" />
                      )}
                    </button>
                    <button
                      onClick={downloadCoverLetter}
                      className="p-2 border border-obsidian-200 rounded-lg hover:bg-obsidian-50 transition-colors"
                      title="Download as text file"
                      aria-label="Download cover letter as text file"
                    >
                      <Download className="w-5 h-5 text-obsidian-700" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingCover ? (
              <div>
                <textarea
                  value={coverDraft}
                  onChange={(event) => setCoverDraft(event.target.value)}
                  rows={Math.min(40, Math.max(12, coverDraft.split("\n").length + 2))}
                  className="w-full rounded-lg border border-obsidian-300 bg-white p-4 font-sans text-obsidian-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-obsidian-900"
                  aria-label="Cover letter text"
                  autoFocus
                />
                <p className="mt-2 text-xs text-obsidian-500">
                  Your edits are saved with this application and, when you&apos;re signed in, synced to your account.
                </p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {coverEdited && (
                  <p className="not-prose mb-3 text-xs text-obsidian-500">Edited by you. The AI&apos;s original can be restored from the header.</p>
                )}
                <pre className="whitespace-pre-wrap font-sans text-obsidian-700 leading-relaxed">
                  {generatedContent.coverLetter}
                </pre>
              </div>
            )}
          </motion.div>

          {/* CV Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-xl border border-obsidian-200 p-8 shadow-neo"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-obsidian-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-obsidian-900" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-obsidian-950">CV</h2>
                  <p className="text-xs text-obsidian-500 mt-1">
                    {editingCv
                      ? "Click into the preview and type. Done saves your changes."
                      : cvEdited
                      ? "Edited by you"
                      : "Rendered from AI-generated HTML"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editingCv ? (
                  <>
                    <button
                      onClick={saveCvEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-colors"
                      title="Save changes"
                    >
                      <Check className="w-4 h-4" />
                      Done
                    </button>
                    <button
                      onClick={cancelCvEdit}
                      className="p-2 border border-obsidian-200 rounded-lg hover:bg-obsidian-50 transition-colors"
                      title="Discard changes"
                      aria-label="Discard CV changes"
                    >
                      <X className="w-5 h-5 text-obsidian-700" />
                    </button>
                  </>
                ) : (
                  <>
                    {cvEdited && (
                      <button
                        onClick={restoreCv}
                        className="p-2 border border-obsidian-200 rounded-lg hover:bg-obsidian-50 transition-colors"
                        title="Restore the AI's original"
                        aria-label="Restore the AI's original CV"
                      >
                        <RotateCcw className="w-5 h-5 text-obsidian-700" />
                      </button>
                    )}
                    <button
                      onClick={startCvEdit}
                      disabled={!cvHtml}
                      className="p-2 border border-obsidian-200 rounded-lg hover:bg-obsidian-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Edit CV"
                      aria-label="Edit CV"
                    >
                      <Pencil className="w-5 h-5 text-obsidian-700" />
                    </button>
                    <button
                      onClick={handleDownloadCv}
                      disabled={!cvHtml}
                      className={`p-2 border rounded-lg transition-colors ${
                        cvHtml
                          ? "border-obsidian-200 hover:bg-obsidian-50"
                          : "border-obsidian-200 cursor-not-allowed opacity-60"
                      }`}
                      title={cvHtml ? "Download PDF" : "CV not available"}
                    >
                      <Download className="w-5 h-5 text-obsidian-700" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div
              className={`rounded-lg border bg-obsidian-50 p-4 max-h-[32rem] overflow-auto transition-colors ${
                editingCv ? "border-obsidian-900 ring-2 ring-obsidian-900/10" : "border-obsidian-200"
              }`}
            >
              {cvHtml ? (
                <div ref={cvPreviewViewportRef} className="w-full">
                  <iframe
                    key={cvRenderKey}
                    ref={cvIframeRef}
                    title="CV preview"
                    className="w-full h-[30rem] bg-white rounded-md shadow-sm"
                    srcDoc={cvHtml}
                    sandbox="allow-same-origin"
                    onLoad={applyCvPreviewZoom}
                  />
                </div>
              ) : (
                <div className="p-6 text-sm text-obsidian-500 text-center">
                  CV HTML was not generated. Try running the request again when convenient.
                </div>
              )}
            </div>
          </motion.div>

          {/* Strategic Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3 bg-white rounded-xl border border-obsidian-200 p-8 shadow-neo"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-obsidian-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-obsidian-900" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-obsidian-950">Strategic Insights</h2>
                <p className="text-sm text-obsidian-600">High-signal context to sharpen your application and interview prep.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="font-semibold text-obsidian-900 mb-3">Fit Rating</h3>
                {fitAssessment ? (
                  <div className="rounded-xl border border-obsidian-200 bg-obsidian-50 p-5 space-y-5">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-semibold text-obsidian-950 tabular-nums">
                          {fitAssessment.matchScore ?? "—"}
                        </span>
                        {fitAssessment.matchScore !== null && (
                          <span className="text-sm text-obsidian-500">/ 100 match</span>
                        )}
                      </div>
                      {fitAssessment.recommendation && (
                        <span
                          className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full border ${
                            recommendationStyles[fitAssessment.recommendation] || recommendationStyles.reach
                          }`}
                        >
                          {fitAssessment.recommendation}
                        </span>
                      )}
                      {fitAssessment.matchScore !== null && (
                        <div
                          className="basis-full sm:basis-auto sm:flex-1 h-2 rounded-full bg-obsidian-200 overflow-hidden"
                          role="progressbar"
                          aria-valuenow={fitAssessment.matchScore}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label="Match score"
                        >
                          <div
                            className="h-full bg-obsidian-900 rounded-full transition-all duration-700"
                            style={{ width: `${fitAssessment.matchScore}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {fitAssessment.rubric?.hard && (
                      <p className="text-xs text-obsidian-500">
                        Hard requirements: {fitAssessment.rubric.hard.met} met · {fitAssessment.rubric.hard.partial} partial · {fitAssessment.rubric.hard.unmet} unmet
                        {fitAssessment.rubric.preferred?.total > 0 && (
                          <> · Preferred: {fitAssessment.rubric.preferred.met} of {fitAssessment.rubric.preferred.total}</>
                        )}
                        {fitAssessment.rubric.nonNegotiableUnmet && <> · a non-negotiable requirement is unmet</>}
                      </p>
                    )}
                    {fitAssessment.summary && (
                      <p className="text-sm text-obsidian-700">{fitAssessment.summary}</p>
                    )}

                    {(fitAssessment.strengths.length > 0 || fitAssessment.gaps.length > 0) && (
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-obsidian-500 mb-2">
                            Strengths
                          </h4>
                          {fitAssessment.strengths.length > 0 ? (
                            <ul className="space-y-2 text-sm text-obsidian-700">
                              {fitAssessment.strengths.map((item, index) => (
                                <li key={`strength-${index}`} className="flex gap-2">
                                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-obsidian-900" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-obsidian-500">None identified.</p>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-obsidian-500 mb-2">
                            Gaps
                          </h4>
                          {fitAssessment.gaps.length > 0 ? (
                            <ul className="space-y-2 text-sm text-obsidian-700">
                              {fitAssessment.gaps.map((item, index) => (
                                <li key={`gap-${index}`} className="flex gap-2">
                                  <Minus className="w-4 h-4 mt-0.5 shrink-0 text-obsidian-400" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-obsidian-500">No notable gaps.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {(fitAssessment.matchedKeywords.length > 0 || fitAssessment.missingKeywords.length > 0) && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-obsidian-500 mb-2">
                          Keyword Overlap
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {fitAssessment.matchedKeywords.map((keyword, index) => (
                            <span
                              key={`matched-${keyword}-${index}`}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-obsidian-950 text-white rounded-full"
                            >
                              <Check className="w-3 h-3" />
                              {keyword}
                            </span>
                          ))}
                          {fitAssessment.missingKeywords.map((keyword, index) => (
                            <span
                              key={`missing-${keyword}-${index}`}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-white border border-dashed border-obsidian-300 text-obsidian-500 rounded-full"
                            >
                              <Minus className="w-3 h-3" />
                              {keyword}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-obsidian-500">
                          Solid chips are covered by your materials. Dashed chips are terms the job asks for that you don&apos;t show yet.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-obsidian-600">
                    No fit rating for this application. Generate a new one to see how you match up.
                  </p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-obsidian-900 mb-3">Key Keywords</h3>
                {keyKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {keyKeywords.map((keyword, index) => (
                      <span
                        key={`${keyword}-${index}`}
                        className="px-3 py-1 text-sm bg-obsidian-50 border border-obsidian-100 text-obsidian-700 rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-obsidian-600">No keywords generated.</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-obsidian-900 mb-3">Culture Fit</h3>
                <blockquote className="border-l-4 border-obsidian-900/20 pl-4 text-sm text-obsidian-700 italic">
                  {cultureFit || 'No culture insights generated.'}
                </blockquote>
              </div>

              <div>
                <h3 className="font-semibold text-obsidian-900 mb-3">Interview Questions</h3>
                {interviewQuestions.length > 0 ? (
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-obsidian-700">
                    {interviewQuestions.map((question, index) => (
                      <li key={`${question}-${index}`}>{question}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-obsidian-600">No interview questions generated.</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-obsidian-900 mb-3">Practice Live</h3>
                <InterviewCoach
                  jobContext={applicationData?.formData?.jobData || ""}
                  candidateSummary={[
                    applicationData?.formData?.profileData
                      ? `Candidate profile:\n${applicationData.formData.profileData}`
                      : "",
                    generatedContent?.coverLetter
                      ? `Cover letter they wrote for this role:\n${generatedContent.coverLetter}`
                      : "",
                    cultureFit ? `Inferred culture fit: ${cultureFit}` : "",
                    fitAssessment?.gaps?.length
                      ? `Fit gaps worth probing gently in the interview:\n- ${fitAssessment.gaps.join("\n- ")}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join("\n\n")}
                  focusQuestions={interviewQuestions}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex gap-4 justify-center"
        >
          <button className="px-6 py-3 border border-obsidian-300 text-obsidian-700 rounded-lg hover:bg-obsidian-50 transition-all duration-300">
            Regenerate
          </button>
          <button className="px-8 py-3 bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-all duration-300 shadow-neo-md hover:shadow-neo-lg flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download All
          </button>
        </motion.div>
      </motion.div>

      {/* Hidden off-screen div for PDF capture (html2canvas needs a same-document element) */}
      {cvHtml && (
        <div
          ref={cvCaptureRef}
          className="bg-white text-obsidian-900 min-w-[8.5in] max-w-[8.5in]"
          style={{ position: "fixed", left: "-9999px", top: 0 }}
          dangerouslySetInnerHTML={{ __html: cvHtml }}
        />
      )}
    </div>
  );
};

export default ResultsPage;
