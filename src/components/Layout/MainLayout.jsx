import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import Navbar from '../Navigation/Navbar';
import Footer from '../Navigation/Footer';

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-white">
      <Navbar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>
      <Footer />
    </div>
  );
};

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default MainLayout;