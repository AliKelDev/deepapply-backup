import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Briefcase, GraduationCap, Code, Plus, X, Save, Trash2, Upload, Sparkles, FileText } from "lucide-react";
import { useAuth, notifyProfileChanged, PROFILE_CHANGED_EVENT } from "../context/AuthContext";

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    // Basic Information
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedinUrl: "",
    websiteUrl: "",
    githubUrl: "",

    // Professional Summary
    currentTitle: "",
    yearsOfExperience: "",
    professionalSummary: "",

    // Work Experience (array of objects)
    workExperience: [],

    // Education (array of objects)
    education: [],

    // Skills
    technicalSkills: "",
    languages: "",
    certifications: "",

    // Additional Information
    additionalInfo: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // AI Extraction state
  const MAX_EXTRACTION_FILES = 5;
  const [extractionText, setExtractionText] = useState("");
  const [extractionFiles, setExtractionFiles] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState("");

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("deepApplyProfile");
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    }
  }, []);

  const { authFetch } = useAuth();

  // When cloud sync rewrites the stored profile (e.g. right after sign-in), reload it.
  useEffect(() => {
    const reload = () => {
      const saved = localStorage.getItem("deepApplyProfile");
      if (!saved) return;
      try {
        setProfile((current) => ({ ...current, ...JSON.parse(saved) }));
      } catch (error) {
        console.warn("Could not reload synced profile:", error);
      }
    };
    window.addEventListener(PROFILE_CHANGED_EVENT, reload);
    return () => window.removeEventListener(PROFILE_CHANGED_EVENT, reload);
  }, []);

  // Save profile to localStorage (and, when signed in, the cloud via AuthContext)
  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem("deepApplyProfile", JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }));
    notifyProfileChanged();
    setSaveMessage("Profile saved successfully!");

    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage("");
    }, 2000);
  };

  // Clear profile
  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear your profile? This cannot be undone.")) {
      localStorage.removeItem("deepApplyProfile");
      notifyProfileChanged();
      setProfile({
        fullName: "",
        email: "",
        phone: "",
        location: "",
        linkedinUrl: "",
        websiteUrl: "",
        githubUrl: "",
        currentTitle: "",
        yearsOfExperience: "",
        professionalSummary: "",
        workExperience: [],
        education: [],
        technicalSkills: "",
        languages: "",
        certifications: "",
        additionalInfo: ""
      });
      setSaveMessage("Profile cleared!");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  };

  // Add work experience entry
  const addWorkExperience = () => {
    setProfile({
      ...profile,
      workExperience: [
        ...profile.workExperience,
        { company: "", role: "", duration: "", description: "" }
      ]
    });
  };

  // Remove work experience entry
  const removeWorkExperience = (index) => {
    setProfile({
      ...profile,
      workExperience: profile.workExperience.filter((_, i) => i !== index)
    });
  };

  // Update work experience entry
  const updateWorkExperience = (index, field, value) => {
    const updated = [...profile.workExperience];
    updated[index][field] = value;
    setProfile({ ...profile, workExperience: updated });
  };

  // Add education entry
  const addEducation = () => {
    setProfile({
      ...profile,
      education: [
        ...profile.education,
        { institution: "", degree: "", field: "", graduationYear: "" }
      ]
    });
  };

  // Remove education entry
  const removeEducation = (index) => {
    setProfile({
      ...profile,
      education: profile.education.filter((_, i) => i !== index)
    });
  };

  // Update education entry
  const updateEducation = (index, field, value) => {
    const updated = [...profile.education];
    updated[index][field] = value;
    setProfile({ ...profile, education: updated });
  };

  // Handle AI extraction
  const handleExtractProfile = async () => {
    if (!extractionText.trim() && extractionFiles.length === 0) {
      setExtractionError("Please paste text or upload a file first");
      return;
    }

    setIsExtracting(true);
    setExtractionError("");

    try {
      const formData = new FormData();

      if (extractionText.trim()) {
        formData.append('rawText', extractionText);
      }

      extractionFiles.forEach((file, index) => {
        formData.append('file', file, file.name || `resume-${index + 1}.txt`);
      });

      const response = await authFetch('/.netlify/functions/extract-profile', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in with Google to use AI extraction.');
        }
        throw new Error('Failed to extract profile data');
      }

      const extractedProfile = await response.json();

      // Merge extracted data with existing profile
      setProfile(extractedProfile);
      setSaveMessage("Profile extracted successfully! Review and save when ready.");

      // Clear extraction inputs
      setExtractionText("");
      setExtractionFiles([]);

      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error('Error extracting profile:', error);
      setExtractionError(error.message || 'Failed to extract profile. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle file input for extraction
  const handleExtractionFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setExtractionFiles((prev) => {
        const availableSlots = MAX_EXTRACTION_FILES - prev.length;
        if (availableSlots <= 0) {
          return prev;
        }
        const filesToAdd = files.slice(0, availableSlots);
        return [...prev, ...filesToAdd];
      });
    }
    e.target.value = "";
  };

  // Clear individual extraction file
  const removeExtractionFile = (index) => {
    setExtractionFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold text-obsidian-950 mb-4">Your Profile</h1>
          <p className="text-xl text-obsidian-600">
            Save your information once and speed up future applications. All data is stored locally on your device.
          </p>
        </motion.div>

        {/* Save Message */}
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium"
          >
            {saveMessage}
          </motion.div>
        )}

        {/* AI Extraction Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-obsidian-50 to-white rounded-xl border-2 border-obsidian-300 p-6 shadow-neo-lg mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-obsidian-950 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-obsidian-950">Quick Fill with AI</h2>
              <p className="text-sm text-obsidian-600">
                Upload your CV or paste your LinkedIn profile, and AI will extract all the info
              </p>
            </div>
          </div>

          {extractionError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {extractionError}
            </div>
          )}

          <div className="space-y-4">
            {/* Text Area */}
            <div>
              <label className="block text-sm font-medium text-obsidian-700 mb-2">
                Paste Your CV or LinkedIn Profile
              </label>
              <textarea
                value={extractionText}
                onChange={(e) => setExtractionText(e.target.value)}
                placeholder="Paste your resume text, LinkedIn profile, or any career information here..."
                rows="8"
                className="w-full px-4 py-3 border-2 border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors resize-none"
                disabled={isExtracting}
              />
            </div>

            {/* File Upload */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <div className="text-sm text-obsidian-600 font-medium">OR</div>
                <label className="cursor-pointer flex-1">
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,image/*"
                    multiple
                    onChange={handleExtractionFileInput}
                    className="hidden"
                    disabled={isExtracting}
                  />
                  <div className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-obsidian-200 rounded-lg hover:border-obsidian-400 transition-colors">
                    <Upload className="w-5 h-5 text-obsidian-600" />
                    <span className="text-sm font-medium text-obsidian-700">
                      {extractionFiles.length > 0
                        ? `${extractionFiles.length} file${extractionFiles.length > 1 ? "s" : ""} selected`
                        : `Upload up to ${MAX_EXTRACTION_FILES} files (PDF, DOCX, TXT, images)`}
                    </span>
                  </div>
                </label>
              </div>

              {extractionFiles.length > 0 && (
                <div className="space-y-2">
                  {extractionFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-obsidian-200 bg-white px-4 py-2 text-sm text-obsidian-700"
                    >
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-obsidian-500">{file.type || "Attachment"}</p>
                      </div>
                      <button
                        onClick={() => removeExtractionFile(index)}
                        disabled={isExtracting}
                        className="px-2 py-1 text-xs font-semibold text-obsidian-600 hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extract Button */}
            <button
              onClick={handleExtractProfile}
              disabled={isExtracting || (!extractionText.trim() && extractionFiles.length === 0)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-all duration-300 shadow-neo-md hover:shadow-neo-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-obsidian-950"
            >
              {isExtracting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Extracting Profile Data...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Extract Profile with AI
                  <FileText className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </motion.section>

        {/* Form */}
        <div className="space-y-8">
          {/* Basic Information */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white rounded-xl border border-obsidian-200 p-6 shadow-neo"
          >
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-obsidian-950" />
              <h2 className="text-2xl font-semibold text-obsidian-950">Basic Information</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="San Francisco, CA"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={profile.linkedinUrl}
                  onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/johndoe"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  Personal Website
                </label>
                <input
                  type="url"
                  value={profile.websiteUrl}
                  onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })}
                  placeholder="https://johndoe.com"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  GitHub URL
                </label>
                <input
                  type="url"
                  value={profile.githubUrl}
                  onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                  placeholder="https://github.com/johndoe"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                />
              </div>
            </div>
          </motion.section>

          {/* Professional Summary */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-xl border border-obsidian-200 p-6 shadow-neo"
          >
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="w-5 h-5 text-obsidian-950" />
              <h2 className="text-2xl font-semibold text-obsidian-950">Professional Summary</h2>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-obsidian-700 mb-2">
                    Current Title/Role
                  </label>
                  <input
                    type="text"
                    value={profile.currentTitle}
                    onChange={(e) => setProfile({ ...profile, currentTitle: e.target.value })}
                    placeholder="Senior Software Engineer"
                    className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-obsidian-700 mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="text"
                    value={profile.yearsOfExperience}
                    onChange={(e) => setProfile({ ...profile, yearsOfExperience: e.target.value })}
                    placeholder="5"
                    className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  Professional Summary
                </label>
                <textarea
                  value={profile.professionalSummary}
                  onChange={(e) => setProfile({ ...profile, professionalSummary: e.target.value })}
                  placeholder="A brief overview of your professional background, key achievements, and career goals..."
                  rows="4"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors resize-none"
                />
              </div>
            </div>
          </motion.section>

          {/* Work Experience */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-xl border border-obsidian-200 p-6 shadow-neo"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-obsidian-950" />
                <h2 className="text-2xl font-semibold text-obsidian-950">Work Experience</h2>
              </div>
              <button
                onClick={addWorkExperience}
                className="flex items-center gap-2 px-4 py-2 bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Experience
              </button>
            </div>

            <div className="space-y-4">
              {profile.workExperience.length === 0 ? (
                <p className="text-obsidian-500 text-center py-8">
                  No work experience added yet. Click &quot;Add Experience&quot; to get started.
                </p>
              ) : (
                profile.workExperience.map((exp, index) => (
                  <div
                    key={index}
                    className="p-4 border border-obsidian-200 rounded-lg space-y-3 relative"
                  >
                    <button
                      onClick={() => removeWorkExperience(index)}
                      className="absolute top-4 right-4 text-obsidian-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="grid md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => updateWorkExperience(index, "company", e.target.value)}
                        placeholder="Company Name"
                        className="px-3 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors text-sm"
                      />
                      <input
                        type="text"
                        value={exp.role}
                        onChange={(e) => updateWorkExperience(index, "role", e.target.value)}
                        placeholder="Role/Position"
                        className="px-3 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors text-sm"
                      />
                    </div>

                    <input
                      type="text"
                      value={exp.duration}
                      onChange={(e) => updateWorkExperience(index, "duration", e.target.value)}
                      placeholder="Duration (e.g., Jan 2020 - Present)"
                      className="w-full px-3 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors text-sm"
                    />

                    <textarea
                      value={exp.description}
                      onChange={(e) => updateWorkExperience(index, "description", e.target.value)}
                      placeholder="Key responsibilities and achievements..."
                      rows="3"
                      className="w-full px-3 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors resize-none text-sm"
                    />
                  </div>
                ))
              )}
            </div>
          </motion.section>

          {/* Education */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-xl border border-obsidian-200 p-6 shadow-neo"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-obsidian-950" />
                <h2 className="text-2xl font-semibold text-obsidian-950">Education</h2>
              </div>
              <button
                onClick={addEducation}
                className="flex items-center gap-2 px-4 py-2 bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Education
              </button>
            </div>

            <div className="space-y-4">
              {profile.education.length === 0 ? (
                <p className="text-obsidian-500 text-center py-8">
                  No education added yet. Click &quot;Add Education&quot; to get started.
                </p>
              ) : (
                profile.education.map((edu, index) => (
                  <div
                    key={index}
                    className="p-4 border border-obsidian-200 rounded-lg space-y-3 relative"
                  >
                    <button
                      onClick={() => removeEducation(index)}
                      className="absolute top-4 right-4 text-obsidian-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="grid md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => updateEducation(index, "institution", e.target.value)}
                        placeholder="Institution Name"
                        className="px-3 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors text-sm"
                      />
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, "degree", e.target.value)}
                        placeholder="Degree (e.g., Bachelor's, Master's)"
                        className="px-3 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors text-sm"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={edu.field}
                        onChange={(e) => updateEducation(index, "field", e.target.value)}
                        placeholder="Field of Study"
                        className="px-3 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors text-sm"
                      />
                      <input
                        type="text"
                        value={edu.graduationYear}
                        onChange={(e) => updateEducation(index, "graduationYear", e.target.value)}
                        placeholder="Graduation Year"
                        className="px-3 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors text-sm"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>

          {/* Skills & Certifications */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-xl border border-obsidian-200 p-6 shadow-neo"
          >
            <div className="flex items-center gap-2 mb-6">
              <Code className="w-5 h-5 text-obsidian-950" />
              <h2 className="text-2xl font-semibold text-obsidian-950">Skills & Certifications</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  Technical Skills
                </label>
                <input
                  type="text"
                  value={profile.technicalSkills}
                  onChange={(e) => setProfile({ ...profile, technicalSkills: e.target.value })}
                  placeholder="React, Python, AWS, Docker, SQL... (comma-separated)"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  Languages
                </label>
                <input
                  type="text"
                  value={profile.languages}
                  onChange={(e) => setProfile({ ...profile, languages: e.target.value })}
                  placeholder="English (Native), Spanish (Fluent), French (Conversational)"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-700 mb-2">
                  Certifications
                </label>
                <textarea
                  value={profile.certifications}
                  onChange={(e) => setProfile({ ...profile, certifications: e.target.value })}
                  placeholder="AWS Certified Solutions Architect, PMP, etc..."
                  rows="3"
                  className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors resize-none"
                />
              </div>
            </div>
          </motion.section>

          {/* Additional Information */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-white rounded-xl border border-obsidian-200 p-6 shadow-neo"
          >
            <h2 className="text-2xl font-semibold text-obsidian-950 mb-4">Additional Information</h2>
            <p className="text-sm text-obsidian-600 mb-4">
              Add anything else that doesn&apos;t fit the categories above: achievements, publications, volunteer work, hobbies, etc.
            </p>
            <textarea
              value={profile.additionalInfo}
              onChange={(e) => setProfile({ ...profile, additionalInfo: e.target.value })}
              placeholder="Other relevant information about yourself..."
              rows="6"
              className="w-full px-4 py-2 border border-obsidian-200 rounded-lg focus:outline-none focus:border-obsidian-400 transition-colors resize-none"
            />
          </motion.section>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex gap-4"
          >
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-obsidian-950 text-white rounded-lg hover:bg-obsidian-900 transition-all duration-300 shadow-neo-md hover:shadow-neo-lg disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? "Saving..." : "Save Profile"}
            </button>

            <button
              onClick={handleClear}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-obsidian-950 border border-obsidian-200 rounded-lg hover:bg-obsidian-50 transition-all duration-300 shadow-neo-md hover:shadow-neo-lg"
            >
              <Trash2 className="w-5 h-5" />
              Clear Profile
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
