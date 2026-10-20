import { motion } from "framer-motion";

const sections = [
  {
    heading: "Data You Provide",
    body: "We only handle the information you paste or upload into the form: your profile details and the job description. Files are read in your browser and the plain text is sent to our Netlify serverless function for processing.",
  },
  {
    heading: "How Processing Works",
    body: "The Netlify function forwards your text to Google's Gemini API (model gemini-2.5-flash-lite) to generate application materials. We do not use the content for analytics, marketing, or any purpose other than returning results for your session.",
  },
  {
    heading: "Profile Storage (Optional)",
    body: "If you use the Profile page, your profile is saved in your browser's localStorage. If you sign in with Google, we also store a copy of your profile, your application tracker, and your most recent generated materials on our server (Netlify Blobs), keyed to your Google account ID, so they follow you across devices. We keep your Google account ID, email address, display name, and profile picture URL, plus a per-month count of how many generations you have used. We never see or store your Google password.",
  },
  {
    heading: "Session Data & Server Storage",
    body: "Job descriptions and generated materials are processed in memory to produce your results. For signed-in users, the ten most recent results are stored with your account as described above; nothing else is written to a database. Signing in creates a session token stored in your browser for up to 30 days; signing out removes it.",
  },
  {
    heading: "Third-Party Access",
    body: "Google receives the text you provide in order to generate results. Their handling of that data is governed by Google's API terms. No other third parties receive your information.",
  },
  {
    heading: "Your Controls",
    body: "Signed-out use leaves nothing on our servers: clearing the form or closing the tab removes your data. Signed-in users can clear their profile and tracker from the app, and can ask us to delete their account data entirely via the Contact page. Sign out at any time from the navigation bar.",
  },
];

const PrivacyPolicyPage = () => (
  <div className="min-h-screen pt-24 pb-20 px-4 bg-white">
    <div className="max-w-4xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-obsidian-950 mb-4">Privacy Policy</h1>
        <p className="text-sm text-obsidian-500">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <p className="mt-4 text-lg text-obsidian-600">
          DeepApply respects your time and your data. This policy explains what we collect, why we collect it, and how you stay in control.
        </p>
      </motion.header>

      <div className="space-y-10">
        {sections.map((section) => (
          <motion.section
            key={section.heading}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold text-obsidian-900 mb-3">{section.heading}</h2>
            <p className="text-sm text-obsidian-600 leading-relaxed">{section.body}</p>
          </motion.section>
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-16 bg-obsidian-50 border border-obsidian-200 rounded-xl p-8"
      >
        <h2 className="text-xl font-semibold text-obsidian-900 mb-2">Questions?</h2>
        <p className="text-sm text-obsidian-600">
          Email j.montee.ls@gmail.com and we will get back to you quickly. Mention the approximate time of your request so we can inspect any transient logs if needed.
        </p>
      </motion.section>
    </div>
  </div>
);

export default PrivacyPolicyPage;
