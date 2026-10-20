/**
 * Converts a profile object to a formatted string for AI processing
 */
export const formatProfileForAI = (profile) => {
  if (!profile) return "";

  let formatted = "";

  // Basic Information
  if (profile.fullName) formatted += `Name: ${profile.fullName}\n`;
  if (profile.email) formatted += `Email: ${profile.email}\n`;
  if (profile.phone) formatted += `Phone: ${profile.phone}\n`;
  if (profile.location) formatted += `Location: ${profile.location}\n`;
  if (profile.linkedinUrl) formatted += `LinkedIn: ${profile.linkedinUrl}\n`;
  if (profile.websiteUrl) formatted += `Website: ${profile.websiteUrl}\n`;
  if (profile.githubUrl) formatted += `GitHub: ${profile.githubUrl}\n`;

  // Professional Summary
  if (profile.currentTitle || profile.yearsOfExperience || profile.professionalSummary) {
    formatted += `\n--- PROFESSIONAL SUMMARY ---\n`;
    if (profile.currentTitle) formatted += `Current Title: ${profile.currentTitle}\n`;
    if (profile.yearsOfExperience) formatted += `Years of Experience: ${profile.yearsOfExperience}\n`;
    if (profile.professionalSummary) formatted += `\n${profile.professionalSummary}\n`;
  }

  // Work Experience
  if (profile.workExperience && profile.workExperience.length > 0) {
    formatted += `\n--- WORK EXPERIENCE ---\n`;
    profile.workExperience.forEach((exp, index) => {
      if (exp.company || exp.role || exp.duration || exp.description) {
        formatted += `\n${index + 1}. `;
        if (exp.role) formatted += `${exp.role}`;
        if (exp.company) formatted += ` at ${exp.company}`;
        if (exp.duration) formatted += ` (${exp.duration})`;
        formatted += `\n`;
        if (exp.description) formatted += `${exp.description}\n`;
      }
    });
  }

  // Education
  if (profile.education && profile.education.length > 0) {
    formatted += `\n--- EDUCATION ---\n`;
    profile.education.forEach((edu, index) => {
      if (edu.institution || edu.degree || edu.field || edu.graduationYear) {
        formatted += `\n${index + 1}. `;
        if (edu.degree) formatted += `${edu.degree}`;
        if (edu.field) formatted += ` in ${edu.field}`;
        if (edu.institution) formatted += ` from ${edu.institution}`;
        if (edu.graduationYear) formatted += ` (${edu.graduationYear})`;
        formatted += `\n`;
      }
    });
  }

  // Skills & Certifications
  if (profile.technicalSkills || profile.languages || profile.certifications) {
    formatted += `\n--- SKILLS & CERTIFICATIONS ---\n`;
    if (profile.technicalSkills) formatted += `Technical Skills: ${profile.technicalSkills}\n`;
    if (profile.languages) formatted += `Languages: ${profile.languages}\n`;
    if (profile.certifications) formatted += `Certifications:\n${profile.certifications}\n`;
  }

  // Additional Information
  if (profile.additionalInfo) {
    formatted += `\n--- ADDITIONAL INFORMATION ---\n${profile.additionalInfo}\n`;
  }

  return formatted.trim();
};

/**
 * Checks if a profile has any data
 */
export const hasProfileData = (profile) => {
  if (!profile) return false;

  const hasBasicInfo = profile.fullName || profile.email || profile.phone ||
    profile.location || profile.linkedinUrl || profile.websiteUrl || profile.githubUrl;

  const hasProfessionalInfo = profile.currentTitle || profile.yearsOfExperience ||
    profile.professionalSummary;

  const hasWorkExperience = profile.workExperience && profile.workExperience.length > 0;
  const hasEducation = profile.education && profile.education.length > 0;

  const hasSkills = profile.technicalSkills || profile.languages || profile.certifications;
  const hasAdditionalInfo = profile.additionalInfo;

  return hasBasicInfo || hasProfessionalInfo || hasWorkExperience ||
    hasEducation || hasSkills || hasAdditionalInfo;
};
