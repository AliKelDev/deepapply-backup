import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Footer = () => (
  <motion.footer
    className="w-full border-t border-obsidian-200 bg-obsidian-50 py-12 mt-32"
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
  >
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* DeepApply Info */}
        <div>
          <h3 className="text-xl font-bold text-obsidian-950 mb-2">DeepApply</h3>
          <p className="text-sm text-obsidian-600 mb-4">
            AI-powered job application assistant
          </p>
          <p className="text-xs text-obsidian-500">
            Created by <a href="https://alikel.net" target="_blank" rel="noopener noreferrer" className="hover:text-obsidian-900 transition-colors">AliKelDev</a>
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-sm font-semibold text-obsidian-950 mb-3">Resources</h4>
          <div className="space-y-2">
            <Link to="/how-it-works" className="block text-sm text-obsidian-600 hover:text-obsidian-900 transition-colors">
              How It Works
            </Link>
            <Link to="/privacy" className="block text-sm text-obsidian-600 hover:text-obsidian-900 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="block text-sm text-obsidian-600 hover:text-obsidian-900 transition-colors">
              Terms of Service
            </Link>
            <Link to="/contact" className="block text-sm text-obsidian-600 hover:text-obsidian-900 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-obsidian-200 text-center text-sm text-obsidian-500">
        © {new Date().getFullYear()} DeepApply. All rights reserved.
      </div>
    </div>
  </motion.footer>
);

export default Footer;
