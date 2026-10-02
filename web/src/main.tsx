import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* ─── BATCH 5 MOUNTS HERE ───────────────────────────────────────────────
        Insert `<QueryClientProvider client={queryClient}>` immediately below
        this comment and directly above `<MotionConfig>`. It must sit outside
        `App` (so every route and the shell see the same client) and above
        `SessionProvider`, which is nested inside `App`.

        `MotionConfig reducedMotion="user"` is the one global motion switch:
        from here down, every Framer Motion component honours
        `prefers-reduced-motion` automatically, so a component only has to reach
        for `useReducedMotion()` when it needs to pick a *different* variant set
        rather than merely skip the transform.                          ─── */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>
);