import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Github, User, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInButton from '../Auth/GoogleSignInButton';

const AccountMenu = () => {
  const { status, user, quota, signOut, isConfigured } = useAuth();

  if (!isConfigured) return null;
  if (status === 'loading') {
    return <span className="text-xs text-obsidian-400" aria-live="polite">Restoring session…</span>;
  }
  if (status !== 'signed-in' || !user) {
    return <GoogleSignInButton size="medium" text="signin" />;
  }

  const remaining = quota?.remaining;
  const quotaLabel =
    quota?.limit === null || quota?.limit === undefined
      ? null
      : `${remaining} of ${quota.limit} left`;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 pl-3 border-l border-obsidian-200">
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full border border-obsidian-200"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-obsidian-100 flex items-center justify-center">
            <User className="w-4 h-4 text-obsidian-700" />
          </span>
        )}
        <span className="hidden md:flex flex-col leading-tight">
          <span className="text-sm font-medium text-obsidian-900 max-w-[10rem] truncate">{user.name || user.email}</span>
          {quotaLabel && <span className="text-[11px] text-obsidian-500">{quotaLabel} this month</span>}
        </span>
      </div>
      <button
        type="button"
        onClick={signOut}
        className="p-2 rounded-lg text-obsidian-600 hover:text-obsidian-900 hover:bg-obsidian-50 transition-colors"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed w-full border-b z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-obsidian-200 shadow-neo'
          : 'bg-white/80 backdrop-blur-sm border-obsidian-100'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-bold text-obsidian-950 hover:text-obsidian-700 transition-colors"
          >
            DeepApply
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/applications"
              className="flex items-center gap-2 text-sm font-medium text-obsidian-600 hover:text-obsidian-900 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Applications</span>
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-2 text-sm font-medium text-obsidian-600 hover:text-obsidian-900 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <a
              href="https://github.com/AliKelDev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-obsidian-600 hover:text-obsidian-900 transition-colors"
              aria-label="GitHub, by AliKelDev"
              title="By AliKelDev"
            >
              <Github className="w-5 h-5" />
            </a>
            <AccountMenu />
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;