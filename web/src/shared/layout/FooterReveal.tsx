import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Footer } from './Footer';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const FooterReveal: React.FC = () => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(true);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [48, 0]);

  useEffect(() => {
    const checkScrollable = () => {
      if (typeof window === 'undefined') return;
      const scrollable = document.documentElement.scrollHeight > window.innerHeight + 60;
      setCanScroll(scrollable);
    };
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, []);

  if (reduce || !canScroll) return <Footer />;

  return (
    <motion.div ref={ref} style={{ opacity, y }} className="mt-auto">
      <Footer />
    </motion.div>
  );
};
