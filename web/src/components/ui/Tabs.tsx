import React, { createContext, useContext, useId, useMemo, useState } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../lib/cn';
import { transitionTabSpring } from '../../lib/motion';

/**
 * Tabs — REDESIGN_PLAN §4.8.
 *
 * Two visual styles over one behaviour. Radix owns the behaviour because the
 * roles, the arrow-key walk and the roving tabindex are the part that is easy
 * to get subtly wrong by hand: `PortfolioPage` shipped a `role="tablist"` whose
 * Home/End handling and focus ring were re-derived per page, and a filter group
 * that is really a row of buttons is not a tab set at all to a screen reader.
 *
 * The indicator is one element handed between tabs through a shared `layoutId`,
 * so it slides rather than blinking. That `layoutId` is per-`Tabs` instance —
 * two tab groups on one page (portfolio sections and a filter row) would
 * otherwise animate each other's indicator across the viewport.
 *
 * §3.4: under `prefers-reduced-motion` the indicator is a plain element. It
 * still marks the active tab, it just does not travel.
 */

/** `line` for in-page sections, `pill` for filter groups. */
export type TabsVariant = 'line' | 'pill';

export interface TabsProps {
  /** Controlled selection. Pair it with `onValueChange`. */
  value?: string;
  /** Where selection starts when the tabs are left uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface TabsConfig {
  /** Shared by every trigger in one `Tabs`, so the indicator can travel. */
  layoutId: string;
  /** Whether the indicator may animate at all. */
  reduced: boolean;
  /** The currently selected trigger value. */
  selected: string;
}

const TabsConfigContext = createContext<TabsConfig | null>(null);
const TabsVariantContext = createContext<TabsVariant | null>(null);

const LIST_CLASSES: Record<TabsVariant, string> = {
  line: 'flex gap-1 overflow-x-auto border-b border-edge',
  pill: 'flex flex-wrap gap-2',
};

/**
 * `-mb-px` pulls the trigger one pixel over the list's bottom border so the
 * underline sits *on* the rule rather than floating above it, and `relative`
 * anchors the indicator to the trigger rather than to the whole list.
 */
const TRIGGER_BASE = 'relative shrink-0 whitespace-nowrap transition-colors duration-quick';

/** Active is never colour alone: it is also the heavier weight (§3.4). */
const TRIGGER_CLASSES: Record<TabsVariant, { active: string; idle: string }> = {
  line: {
    active: '-mb-px px-4 py-2.5 text-label-lg font-semibold text-brand',
    idle: '-mb-px px-4 py-2.5 text-label-lg text-ink-secondary hover:text-ink',
  },
  pill: {
    active: 'rounded-full px-4 py-2 text-label-lg font-semibold text-on-primary',
    idle: 'rounded-full px-4 py-2 text-label-lg text-ink-secondary hover:bg-surface-sunken hover:text-ink',
  },
};

const INDICATOR_CLASSES: Record<TabsVariant, string> = {
  line: 'absolute inset-x-0 bottom-0 h-0.5 bg-brand',
  pill: 'absolute inset-0 rounded-full bg-brand',
};

/**
 * The tab set. Selection is controlled here rather than by Radix so the triggers
 * can know which one is active without a render-prop child, which is what the
 * shared indicator needs.
 *
 * @example
 * <Tabs defaultValue="projects">
 *   <TabsList variant="line" label="Portfolio sections">
 *     <TabsTrigger value="projects">Projects</TabsTrigger>
 *     <TabsTrigger value="achievements">Achievements</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="projects"><ProjectsTab /></TabsContent>
 * </Tabs>
 */
export const Tabs: React.FC<TabsProps> = ({
  value,
  defaultValue = '',
  onValueChange,
  children,
}) => {
  const generatedId = useId();
  const reduced = useReducedMotion();

  const [internalValue, setInternalValue] = useState(defaultValue);
  const selected = value ?? internalValue;

  const handleValueChange = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
  };

  const config = useMemo<TabsConfig>(
    () => ({ layoutId: `tabs-indicator-${generatedId}`, reduced, selected }),
    [generatedId, reduced, selected],
  );

  return (
    <TabsConfigContext.Provider value={config}>
      <TabsPrimitive.Root value={selected} onValueChange={handleValueChange}>
        {children}
      </TabsPrimitive.Root>
    </TabsConfigContext.Provider>
  );
};

export interface TabsListProps {
  variant?: TabsVariant;
  /**
   * What this group of tabs is for. Required: a `role="tablist"` with no
   * accessible name announces as "tab list" and nothing else.
   */
  label: string;
  className?: string;
  children: React.ReactNode;
}

/** The row of triggers, and the rule (line) or gap (pill) that frames them. */
export const TabsList: React.FC<TabsListProps> = ({
  variant = 'line',
  label,
  className = '',
  children,
}) => {
  const config = useContext(TabsConfigContext);

  if (config === null) {
    throw new Error('<TabsList> must be rendered inside a <Tabs>.');
  }

  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List aria-label={label} className={cn(LIST_CLASSES[variant], className)}>
        {children}
      </TabsPrimitive.List>
    </TabsVariantContext.Provider>
  );
};

export interface TabsTriggerProps {
  /** Must match the `value` of the panel this trigger reveals. */
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * One tab. The indicator is rendered only while this trigger is selected, which
 * is what makes the handover work: the element leaves one trigger and arrives
 * at the next inside one `layoutId`.
 */
export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  disabled = false,
  className = '',
}) => {
  const config = useContext(TabsConfigContext);
  const variant = useContext(TabsVariantContext);

  if (config === null || variant === null) {
    throw new Error('<TabsTrigger> must be rendered inside a <TabsList>.');
  }

  const isSelected = config.selected === value;

  return (
    <TabsPrimitive.Trigger
      value={value}
      disabled={disabled}
      className={cn(
        TRIGGER_BASE,
        TRIGGER_CLASSES[variant][isSelected ? 'active' : 'idle'],
        className,
      )}
    >
      {children}
      {isSelected &&
        (config.reduced ? (
          <span aria-hidden="true" className={INDICATOR_CLASSES[variant]} />
        ) : (
          <motion.span
            aria-hidden="true"
            layoutId={config.layoutId}
            className={INDICATOR_CLASSES[variant]}
            transition={transitionTabSpring}
          />
        ))}
    </TabsPrimitive.Trigger>
  );
};

export interface TabsContentProps {
  /** Must match the `value` of the trigger that reveals this panel. */
  value: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * The panel for one trigger. Radix already gives it `role="tabpanel"`,
 * `aria-labelledby` and `tabIndex={0}`, so the panel is reachable and
 * scrollable by keyboard, and unmounts when another tab is chosen.
 */
export const TabsContent: React.FC<TabsContentProps> = ({ value, className = '', children }) => (
  <TabsPrimitive.Content value={value} className={className}>
    {children}
  </TabsPrimitive.Content>
);

export default Tabs;
