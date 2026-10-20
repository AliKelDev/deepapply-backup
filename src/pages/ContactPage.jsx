import { motion } from "framer-motion";
import { Mail, MessageCircle, Twitter } from "lucide-react";

const ContactPage = () => (
  <div className="min-h-screen pt-24 pb-20 px-4 bg-white">
    <div className="max-w-3xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-obsidian-950 mb-4">Contact DeepApply</h1>
        <p className="text-lg text-obsidian-600">
          A quick note is all it takes. We reply within one business day.
        </p>
      </motion.header>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-obsidian-200 rounded-xl p-6 shadow-neo"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-obsidian-950 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-obsidian-900 mb-1">Support</h2>
              <p className="text-sm text-obsidian-600 mb-1">
                Questions, bug reports, or feature requests.
              </p>
              <a href="mailto:j.montee.ls@gmail.com" className="text-sm text-obsidian-900 font-medium hover:underline">
                j.montee.ls@gmail.com
              </a>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white border border-obsidian-200 rounded-xl p-6 shadow-neo"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-obsidian-950 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-obsidian-900 mb-1">Partnerships</h2>
              <p className="text-sm text-obsidian-600 mb-1">
                Hiring teams and bootcamps—let’s make your applicants stand out.
              </p>
              <a href="mailto:j.montee.ls@gmail.com" className="text-sm text-obsidian-900 font-medium hover:underline">
                j.montee.ls@gmail.com
              </a>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white border border-obsidian-200 rounded-xl p-6 shadow-neo"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-obsidian-950 flex items-center justify-center">
              <Twitter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-obsidian-900 mb-1">Stay in the loop</h2>
              <p className="text-sm text-obsidian-600 mb-1">
                Say hi, share what you&apos;re building, or DM questions.
              </p>
              <a
                href="https://twitter.com/AliLeisR"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-obsidian-900 font-medium hover:underline"
              >
                twitter.com/AliLeisR
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="mt-16 bg-obsidian-50 border border-obsidian-200 rounded-2xl p-8 md:p-12"
      >
        <h2 className="text-2xl font-semibold text-obsidian-900 mb-3">Prefer async feedback?</h2>
        <p className="text-sm text-obsidian-600">
          Email works best right now. Share context about your job search and we&apos;ll reply when we can.
        </p>
      </motion.section>
    </div>
  </div>
);

export default ContactPage;
