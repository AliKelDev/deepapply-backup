import { motion } from "framer-motion";

const TermsOfServicePage = () => (
  <div className="min-h-screen pt-24 pb-20 px-4 bg-white">
    <div className="max-w-4xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-obsidian-950 mb-4">Terms of Service</h1>
        <p className="text-sm text-obsidian-500">Last updated: {new Date().toLocaleDateString()}</p>
        <p className="mt-4 text-lg text-obsidian-600">
          DeepApply is currently offered as open-source software. These terms explain what that means for you when you run or contribute to the project.
        </p>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-xl font-semibold text-obsidian-900 mb-2">Using DeepApply</h2>
          <p className="text-sm text-obsidian-600 leading-relaxed">
            You are free to run, modify, and self-host DeepApply in accordance with the project licence. Generated content is yours to use, but you remain responsible for reviewing it before submitting applications.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-obsidian-900 mb-2">Intellectual Property</h2>
          <p className="text-sm text-obsidian-600 leading-relaxed">
            You retain ownership of the inputs you provide and the outputs you export. The DeepApply codebase is published under an open-source licence; brand assets remain owned by the maintainers. Any profile data saved using the Profile feature is stored locally in your browser and remains entirely under your control.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-obsidian-900 mb-2">Acceptable Use</h2>
          <p className="text-sm text-obsidian-600 leading-relaxed">
            Do not submit unlawful, discriminatory, or confidential data you are not authorized to share. If you deploy your own instance, secure it appropriately. Contributions should follow the project&apos;s code of conduct.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-obsidian-900 mb-2">No Guarantees</h2>
          <p className="text-sm text-obsidian-600 leading-relaxed">
            The software is provided &quot;as is&quot; without warranties. The maintainers are not liable for missed opportunities, employment decisions, or damages resulting from use of the code or generated content.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-obsidian-900 mb-2">Termination</h2>
          <p className="text-sm text-obsidian-600 leading-relaxed">
            Because the project is open source, you can stop using it at any time. If you use the hosted demo, we may revoke access in cases of abuse. To report misuse or request support, email j.montee.ls@gmail.com.
          </p>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-16 bg-obsidian-50 border border-obsidian-200 rounded-xl p-8"
      >
        <h2 className="text-xl font-semibold text-obsidian-900 mb-2">Need clarification?</h2>
        <p className="text-sm text-obsidian-600">
          Reach out to j.montee.ls@gmail.com. Continued use or contribution implies you agree with these open-source terms.
        </p>
      </motion.section>
    </div>
  </div>
);

export default TermsOfServicePage;
