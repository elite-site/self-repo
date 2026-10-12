import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Footer } from '../Footer';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export const FooterReveal: React.FC = () => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [48, 0]);

  if (reduce) return <Footer />;

  return (
    <motion.div ref={ref} style={{ opacity, y }} className="mt-auto">
      <Footer />
    </motion.div>
  );
};
