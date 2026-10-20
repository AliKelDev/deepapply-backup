import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Upload, ArrowRight, User, Check } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { formatProfileForAI, hasProfileData } from "../utils/profileFormatter";
import { makeId } from "../utils/applications";
import { useAuth, PROFILE_CHANGED_EVENT } from "../context/AuthContext";
import GoogleSignInButton from "../components/Auth/GoogleSignInButton";

const HomePage = () => {
  const navigate = useNavigate();
  const MAX_FILES_PER_SECTION = 5;
  const [profileData, setProfileData] = useState("");
  const [jobData, setJobData] = useState("");
  const [profileFiles, setProfileFiles] = useState([]);
  const [jobFiles, setJobFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [savedProfile, setSavedProfile] = useState(null);
  const [usingProfile, setUsingProfile] = useState(false);
  const profileInputProvided = Boolean((profileData || "").trim() || profileFiles.length > 0);
  const jobInputProvided = Boolean((jobData || "").trim() || jobFiles.length > 0);

  const { isSignedIn, isConfigured, status: authStatus, quota, setQuota, authFetch } = useAuth();

  // Load saved profile on mount, and again whenever cloud sync updates it
  useEffect(() => {
    const loadProfile = () => {
      const storedProfile = localStorage.getItem("deepApplyProfile");
      if (!storedProfile) return;
      try {
        const parsed = JSON.parse(storedProfile);
        if (hasProfileData(parsed)) {
          setSavedProfile(parsed);
        }
      } catch (error) {
        console.error("Error loading saved profile:", error);
      }
    };
    loadProfile();
    window.addEventListener(PROFILE_CHANGED_EVENT, loadProfile);
    return () => window.removeEventListener(PROFILE_CHANGED_EVENT, loadProfile);
  }, []);

  // Use saved profile
  const useSavedProfile = () => {
    if (savedProfile) {
      const formatted = formatProfileForAI(savedProfile);
      setProfileData(formatted);
      setProfileFiles([]);
      setUsingProfile(true);
    }
  };

  // Clear profile usage
  const clearProfileUsage = () => {
    setProfileData("");
    setUsingProfile(false);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const appendFilesWithLimit = (setter, incomingFiles) => {
    if (!incomingFiles || incomingFiles.length === 0) {
      return;
    }
    setter((prev) => {
      const availableSlots = MAX_FILES_PER_SECTION - prev.length;
      if (availableSlots <= 0) {
        return prev;
      }
      const filesToAdd = incomingFiles.slice(0, availableSlots);
      return [...prev, ...filesToAdd];
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      appendFilesWithLimit(setProfileFiles, files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      appendFilesWithLimit(setProfileFiles, files);
    }
    e.target.value = "";
  };

  const removeProfileFile = (index) => {
    setProfileFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onJobFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      appendFilesWithLimit(setJobFiles, files);
    }
    e.target.value = "";
  };

  const removeJobFile = (index) => {
    setJobFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!profileInputProvided || !jobInputProvided) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (jobData.trim()) {
        formData.append('jobData', jobData.trim());
      }

      if (profileFiles.length > 0) {
        profileFiles.forEach((file, index) => {
          formData.append('profileFile', file, file.name || `profile-${index + 1}.txt`);
        });
      } else {
        const profileBlob = new Blob([profileData], { type: 'text/plain' });
        formData.append('profileFile', profileBlob, 'profile.txt');
      }

      if (jobFiles.length > 0) {
        jobFiles.forEach((file, index) => {
          formData.append('jobFile', file, file.name || `job-${index + 1}.txt`);
        });
      }

      const response = await authFetch('/.netlify/functions/generate-application', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Please sign in with Google to generate an application.');
        }
        if (response.status === 429 && payload.code === 'QUOTA_EXCEEDED') {
          if (payload.quota) setQuota(payload.quota);
          const resets = payload.quota?.resetsAt
            ? new Date(payload.quota.resetsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
            : 'next month';
          throw new Error(`You've used all ${payload.quota?.limit ?? ''} free generations for this month. Your allowance resets on ${resets}.`);
        }
        throw new Error(payload.error || 'Failed to generate application');
      }

      const generatedContent = await response.json();
      if (generatedContent.quota) setQuota(generatedContent.quota);

          navigate("/results", {
            state: {
              id: makeId(),
              createdAt: new Date().toISOString(),
              formData: {
                profileData,
                jobData,
              },
              generatedContent
            }
          });
    } catch (err) {
      console.error('Error generating application:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Side - Title & Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:sticky lg:top-32"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-block mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-obsidian-50 border border-obsidian-200 rounded-full text-sm text-obsidian-700">
                <Sparkles className="w-4 h-4" />
                AI-Powered
              </span>
            </motion.div>

            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-obsidian-950 tracking-tight">
              DeepApply
            </h1>

            <p className="text-xl text-obsidian-600 mb-8 leading-relaxed">
              Stop spending hours on each application. Just paste your info and the job description—our AI handles the rest.
            </p>

            <div className="space-y-4 text-obsidian-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-obsidian-950 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <p>Tailored cover letters that match the job</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-obsidian-950 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <p>Optimized CV highlighting relevant experience</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-obsidian-950 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <p>Strategic insights for keywords, culture, and interviews</p>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Input Area */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="space-y-6"
          >
            {/* Saved Profile Banner */}
            {savedProfile && !usingProfile && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-obsidian-50 to-obsidian-100 rounded-xl border border-obsidian-200 p-4 shadow-neo"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-obsidian-950 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-obsidian-950">Saved Profile Found</p>
                      <p className="text-sm text-obsidian-600">Use your saved profile to apply faster</p>
                    </div>
                  </div>
                  <button
                    onClick={useSavedProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-colors text-sm font-medium"
                  >
                    Use Profile
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Using Profile Indicator */}
            {usingProfile && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 rounded-xl border border-green-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">Using Saved Profile</p>
                      <p className="text-sm text-green-700">Your profile data has been loaded</p>
                    </div>
                  </div>
                  <button
                    onClick={clearProfileUsage}
                    className="text-sm font-medium text-green-700 hover:text-green-900 transition-colors underline"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            )}

            {/* Profile Input */}
            <div className="bg-white rounded-xl border border-obsidian-200 p-6 shadow-neo">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-obsidian-950">Your Profile</h3>
                {!savedProfile && (
                  <Link
                    to="/profile"
                    className="text-xs font-medium text-obsidian-600 hover:text-obsidian-900 transition-colors underline"
                  >
                    Create saved profile
                  </Link>
                )}
              </div>
              <p className="text-sm text-obsidian-600 mb-4">
                Paste your info here: name, experience, skills, education—be as detailed as you want.
                The AI understands natural language. Or upload up to {MAX_FILES_PER_SECTION} CV/resume files.
              </p>

              <div
                className={`relative border-2 border-dashed rounded-lg transition-all duration-300 ${
                  dragActive
                    ? "border-obsidian-950 bg-obsidian-50"
                    : "border-obsidian-300 hover:border-obsidian-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <textarea
                  value={profileData}
                  onChange={(e) => setProfileData(e.target.value)}
                  placeholder="E.g., 'I'm John, 28, software engineer with 5 years at Google. Expert in React, Python. MIT CS grad...'"
                  className="w-full h-64 p-4 bg-transparent resize-none focus:outline-none text-obsidian-900 placeholder:text-obsidian-400"
                />

                <div className="absolute bottom-4 right-4">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".txt,.pdf,.doc,.docx,image/*"
                      multiple
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 px-4 py-2 bg-obsidian-50 hover:bg-obsidian-100 border border-obsidian-200 rounded-lg transition-colors text-sm text-obsidian-700">
                      <Upload className="w-4 h-4" />
                      Upload CV Files
                    </div>
                  </label>
                </div>
              </div>
              {profileFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {profileFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-obsidian-200 bg-obsidian-50 px-4 py-3 text-sm text-obsidian-700"
                    >
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-obsidian-500">Ready to send · {formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProfileFile(index)}
                        className="text-xs font-semibold text-obsidian-600 hover:text-obsidian-900"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Job Input */}
            <div className="bg-white rounded-xl border border-obsidian-200 p-6 shadow-neo">
              <h3 className="text-lg font-semibold text-obsidian-950 mb-2">Job Description</h3>
              <p className="text-sm text-obsidian-600 mb-4">
                Copy and paste the full job posting here or upload up to {MAX_FILES_PER_SECTION} job description files.
              </p>

              <textarea
                value={jobData}
                onChange={(e) => setJobData(e.target.value)}
                placeholder="Paste the complete job description, requirements, qualifications..."
                className="w-full h-48 p-4 border-2 border-obsidian-200 rounded-lg resize-none focus:outline-none focus:border-obsidian-400 transition-colors text-obsidian-900 placeholder:text-obsidian-400"
              />

              <div className="mt-4 flex flex-col gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-obsidian-700 cursor-pointer w-fit">
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,image/*"
                    multiple
                    onChange={onJobFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 px-4 py-2 bg-obsidian-50 hover:bg-obsidian-100 border border-obsidian-200 rounded-lg transition-colors text-sm text-obsidian-700">
                    <Upload className="w-4 h-4" />
                    Upload Job Description Files
                  </div>
                </label>

                {jobFiles.length > 0 && (
                  <div className="space-y-2">
                    {jobFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-obsidian-200 bg-obsidian-50 px-4 py-3 text-sm text-obsidian-700"
                      >
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-obsidian-500">
                            Ready to send · {formatFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeJobFile(index)}
                          className="text-xs font-semibold text-obsidian-600 hover:text-obsidian-900"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Sign-in gate + quota */}
            {isConfigured && !isSignedIn && authStatus !== 'loading' && (
              <div className="p-4 bg-obsidian-50 border border-obsidian-200 rounded-lg">
                <p className="text-sm text-obsidian-700 mb-3">
                  Sign in with Google to generate. Your profile and applications will sync across your devices,
                  and you get free generations every month.
                </p>
                <GoogleSignInButton text="continue_with" />
              </div>
            )}
            {isSignedIn && quota && quota.limit !== null && (
              <p className="text-xs text-obsidian-500 text-right" aria-live="polite">
                {quota.remaining} of {quota.limit} free generations left this month
              </p>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!profileInputProvided || !jobInputProvided || isLoading || (isConfigured && !isSignedIn)}
              className="group w-full flex items-center justify-center gap-2 px-8 py-4 bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-all duration-300 shadow-neo-md hover:shadow-neo-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-obsidian-950"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Application
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </>
              )}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
