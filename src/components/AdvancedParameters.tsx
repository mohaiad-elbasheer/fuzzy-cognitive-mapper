import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Sliders, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  LinguisticScalePreset,
  MembershipFunctionType,
  LINGUISTIC_SCALE_PRESETS,
  LINGUISTIC_SCALE_INFO,
  MEMBERSHIP_FUNCTION_INFO,
  calculateMembership,
  LinguisticTerm,
} from '../types';

interface AdvancedParametersProps {
  linguisticScale: LinguisticScalePreset;
  onLinguisticScaleChange: (scale: LinguisticScalePreset) => void;
  membershipFunction: MembershipFunctionType;
  onMembershipFunctionChange: (fn: MembershipFunctionType) => void;
  theme?: 'modern' | 'academic';
}

const MembershipVisualization: React.FC<{
  terms: LinguisticTerm[];
  functionType: MembershipFunctionType;
  theme: 'modern' | 'academic';
}> = ({ terms, functionType, theme }) => {
  const width = 280;
  const height = 80;
  const padding = { left: 10, right: 10, top: 10, bottom: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', 
    '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'
  ];

  const paths = useMemo(() => {
    return terms.map((term, index) => {
      const points: string[] = [];
      const steps = 50;
      
      for (let i = 0; i <= steps; i++) {
        const value = -1 + (i / steps) * 2;
        const membership = calculateMembership(value, term.value, terms, functionType);
        const x = padding.left + ((value + 1) / 2) * chartWidth;
        const y = padding.top + (1 - membership) * chartHeight;
        points.push(`${x},${y}`);
      }
      
      return {
        path: `M ${points.join(' L ')}`,
        color: colors[index % colors.length],
        label: term.label,
        value: term.value,
      };
    });
  }, [terms, functionType, chartWidth, chartHeight]);

  return (
    <div className={cn(
      "rounded-xl border p-3 transition-colors duration-500",
      theme === 'modern' ? "bg-black/40 border-white/10" : "bg-slate-50 border-slate-200"
    )}>
      <svg width={width} height={height} className="w-full">
        {/* Grid lines */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke={theme === 'modern' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
          strokeWidth="1"
        />
        <line
          x1={padding.left + chartWidth / 2}
          y1={padding.top}
          x2={padding.left + chartWidth / 2}
          y2={padding.top + chartHeight}
          stroke={theme === 'modern' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
          strokeWidth="1"
          strokeDasharray="2,2"
        />
        
        {/* Membership function curves */}
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.path}
            fill="none"
            stroke={p.color}
            strokeWidth="1.5"
            opacity="0.7"
          />
        ))}
        
        {/* X-axis labels */}
        <text
          x={padding.left}
          y={height - 4}
          fontSize="8"
          fill={theme === 'modern' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
        >
          -1
        </text>
        <text
          x={padding.left + chartWidth / 2}
          y={height - 4}
          fontSize="8"
          fill={theme === 'modern' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
          textAnchor="middle"
        >
          0
        </text>
        <text
          x={padding.left + chartWidth}
          y={height - 4}
          fontSize="8"
          fill={theme === 'modern' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
          textAnchor="end"
        >
          +1
        </text>
      </svg>
      
      {/* Legend - compact */}
      <div className="flex flex-wrap gap-1 mt-2">
        {terms.slice(0, 5).map((term, i) => (
          <div key={i} className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className={cn(
              "text-[7px] uppercase tracking-wide",
              theme === 'modern' ? "text-white/60" : "text-slate-500"
            )}>
              {term.label.replace(' −', '−').replace(' +', '+')}
            </span>
          </div>
        ))}
        {terms.length > 5 && (
          <span className={cn(
            "text-[7px]",
            theme === 'modern' ? "text-white/60" : "text-slate-500"
          )}>
            +{terms.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
};

const AdvancedParameters: React.FC<AdvancedParametersProps> = ({
  linguisticScale,
  onLinguisticScaleChange,
  membershipFunction,
  onMembershipFunctionChange,
  theme = 'modern',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);

  const currentTerms = LINGUISTIC_SCALE_PRESETS[linguisticScale];
  const scaleInfo = LINGUISTIC_SCALE_INFO[linguisticScale];
  const membershipInfo = MEMBERSHIP_FUNCTION_INFO[membershipFunction];

  return (
    <div className={cn(
      "border rounded-2xl transition-all duration-300",
      theme === 'modern' ? "border-white/5 bg-white/[0.02]" : "border-slate-100 bg-white",
      isExpanded && (theme === 'modern' ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")
    )}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-colors",
          theme === 'modern' ? "hover:bg-white/5" : "hover:bg-slate-50"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
            theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
          )}>
            <Sliders className={cn(
              "w-4 h-4",
              theme === 'modern' ? "text-white/60" : "text-slate-500"
            )} />
          </div>
          <div className="text-left">
            <span className={cn(
              "text-xs font-bold uppercase tracking-wider block",
              theme === 'modern' ? "text-white/60" : "text-slate-600"
            )}>
              Advanced
            </span>
            <span className={cn(
              "text-xs uppercase tracking-wide",
              theme === 'modern' ? "text-white/55" : "text-slate-500"
            )}>
              {scaleInfo.name} Scale • {membershipInfo.name}
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className={cn("w-4 h-4", theme === 'modern' ? "text-white/60" : "text-slate-500")} />
        ) : (
          <ChevronRight className={cn("w-4 h-4", theme === 'modern' ? "text-white/60" : "text-slate-500")} />
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "px-4 pb-4 pt-2 space-y-4 border-t",
              theme === 'modern' ? "border-white/5" : "border-slate-100"
            )}>
              {/* Linguistic Scale */}
              <div className="space-y-2">
                <label className={cn(
                  "text-xs font-bold uppercase tracking-wide flex items-center gap-2",
                  theme === 'modern' ? "text-white/60" : "text-slate-500"
                )}>
                  Linguistic Scale
                  <div className="group relative">
                    <Info className="w-3 h-3 cursor-help" />
                    <div className={cn(
                      "absolute left-0 bottom-full mb-2 w-48 p-2 rounded-lg text-xs font-normal normal-case tracking-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border shadow-xl",
                      theme === 'modern' ? "bg-[#0a0a14] text-white/70 border-white/10" : "bg-white text-slate-600 border-slate-200"
                    )}>
                      Determines how many linguistic terms are available for describing causal relationships.
                    </div>
                  </div>
                </label>
                <div className={cn(
                  "grid grid-cols-2 gap-1 p-1 rounded-xl border",
                  theme === 'modern' ? "bg-black/20 border-white/5" : "bg-white border-slate-200"
                )}>
                  {(Object.keys(LINGUISTIC_SCALE_PRESETS) as LinguisticScalePreset[]).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => onLinguisticScaleChange(scale)}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-bold transition-all",
                        linguisticScale === scale
                          ? (theme === 'modern' 
                              ? "bg-emerald-500/20 text-emerald-400 shadow-sm" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200")
                          : (theme === 'modern' 
                              ? "text-white/60 hover:text-white/60 hover:bg-white/5" 
                              : "text-slate-500 hover:text-slate-600 hover:bg-slate-50")
                      )}
                    >
                      {LINGUISTIC_SCALE_INFO[scale].name}
                      <span className={cn(
                        "ml-1 opacity-50",
                        linguisticScale === scale && "opacity-70"
                      )}>
                        ({scale.replace('-point', '')})
                      </span>
                    </button>
                  ))}
                </div>
                <p className={cn(
                  "text-xs italic",
                  theme === 'modern' ? "text-white/60" : "text-slate-500"
                )}>
                  {scaleInfo.description}
                </p>
              </div>

              {/* Membership Function */}
              <div className="space-y-2">
                <label className={cn(
                  "text-xs font-bold uppercase tracking-wide flex items-center gap-2",
                  theme === 'modern' ? "text-white/60" : "text-slate-500"
                )}>
                  Membership Function
                  <div className="group relative">
                    <Info className="w-3 h-3 cursor-help" />
                    <div className={cn(
                      "absolute left-0 bottom-full mb-2 w-48 p-2 rounded-lg text-xs font-normal normal-case tracking-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border shadow-xl",
                      theme === 'modern' ? "bg-[#0a0a14] text-white/70 border-white/10" : "bg-white text-slate-600 border-slate-200"
                    )}>
                      Defines how crisp values are mapped to fuzzy membership degrees.
                    </div>
                  </div>
                </label>
                <div className={cn(
                  "flex gap-1 p-1 rounded-xl border",
                  theme === 'modern' ? "bg-black/20 border-white/5" : "bg-white border-slate-200"
                )}>
                  {(Object.keys(MEMBERSHIP_FUNCTION_INFO) as MembershipFunctionType[]).map((fn) => (
                    <button
                      key={fn}
                      onClick={() => onMembershipFunctionChange(fn)}
                      className={cn(
                        "flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all",
                        membershipFunction === fn
                          ? (theme === 'modern' 
                              ? "bg-emerald-500/20 text-emerald-400 shadow-sm" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200")
                          : (theme === 'modern' 
                              ? "text-white/60 hover:text-white/60 hover:bg-white/5" 
                              : "text-slate-500 hover:text-slate-600 hover:bg-slate-50")
                      )}
                    >
                      {MEMBERSHIP_FUNCTION_INFO[fn].name}
                    </button>
                  ))}
                </div>
                <p className={cn(
                  "text-xs italic",
                  theme === 'modern' ? "text-white/60" : "text-slate-500"
                )}>
                  {membershipInfo.description}
                </p>
              </div>

              {/* Visualization Toggle */}
              <button
                onClick={() => setShowVisualization(!showVisualization)}
                className={cn(
                  "w-full text-xs font-bold uppercase tracking-wide py-2 rounded-lg border transition-all",
                  showVisualization
                    ? (theme === 'modern' ? "bg-white/10 border-white/20 text-white/60" : "bg-slate-100 border-slate-300 text-slate-600")
                    : (theme === 'modern' ? "border-white/10 text-white/55 hover:text-white/60 hover:border-white/20" : "border-slate-200 text-slate-500 hover:text-slate-500 hover:border-slate-300")
                )}
              >
                {showVisualization ? 'Hide' : 'Show'} Visualization
              </button>

              {/* Membership Function Visualization */}
              <AnimatePresence>
                {showVisualization && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MembershipVisualization
                      terms={currentTerms}
                      functionType={membershipFunction}
                      theme={theme}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedParameters;
