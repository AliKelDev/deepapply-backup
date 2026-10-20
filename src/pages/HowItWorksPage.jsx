import { motion } from "framer-motion";

const steps = [
  {
    title: "Create Your Profile (One Time)",
    description: "Upload your CV or paste your LinkedIn profile. Our AI extracts all your information and saves it locally in your browser—do this once and reuse forever.",
  },
  {
    title: "Quick Apply",
    description: "With a saved profile, just paste the job description and click generate. No need to re-enter your info for every application.",
  },
  {
    title: "Get Tailored Materials",
    description: "Receive a custom cover letter, fully formatted CV optimized for the role, and strategic insights including keywords and interview questions—all in seconds.",
  },
  {
    title: "Review & Send",
    description: "Download your generated CV, copy the cover letter, and use the strategic insights to ace your application and interview preparation.",
  },
];

const HowItWorksPage = () => (
  <div className="min-h-screen pt-24 pb-20 px-4 bg-white">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-obsidian-950 mb-4">How DeepApply Works</h1>
        <p className="text-lg text-obsidian-600">
          A focused workflow that turns your profile and a job post into a polished application packet in minutes.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-white border border-obsidian-200 rounded-xl p-6 shadow-neo"
          >
            <div className="text-sm font-semibold text-obsidian-500 mb-2">Step {index + 1}</div>
            <h2 className="text-xl font-semibold text-obsidian-900 mb-3">{step.title}</h2>
            <p className="text-sm text-obsidian-600 leading-relaxed">{step.description}</p>
          </motion.div>
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-16 bg-obsidian-950 text-white rounded-2xl p-8 md:p-12"
      >
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">Why it feels instant</h2>
        <ul className="space-y-3 text-sm text-obsidian-100 leading-relaxed">
          <li>AI-powered profile extraction turns your CV or LinkedIn into structured data in seconds.</li>
          <li>Saved profiles mean you never re-type your info—just paste the job and go.</li>
          <li>Smart matching highlights only the relevant achievements for each specific role.</li>
          <li>Complete package: cover letter, professionally formatted CV, keywords, and interview prep—all in one view.</li>
        </ul>
      </motion.section>
    </div>
  </div>
);

export default HowItWorksPage;
