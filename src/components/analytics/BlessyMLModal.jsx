import React, { useState, useEffect } from 'react';
import { X, Brain, Sparkles, TrendingUp, Clock, Activity, Cpu, CheckCircle2 } from 'lucide-react';
import { blessyLearningEngine } from '../../engines/blessyLearningEngine.js';

export default function BlessyMLModal({ isOpen, onClose }) {
  const [insights, setInsights] = useState(() => blessyLearningEngine.getInsights());
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInsights(blessyLearningEngine.getInsights());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualTrain = () => {
    setIsRetraining(true);
    setTimeout(() => {
      blessyLearningEngine.trainOnInteraction({
        userText: 'Ghutne aur kamar me bohot dard hai',
        specialty: 'ortho',
        doctorId: 'doc_patel',
        bookedTime: '16:00',
        language: 'hinglish',
        success: true
      });
      setInsights(blessyLearningEngine.getInsights());
      setIsRetraining(false);
      setRetrainSuccess(true);
      setTimeout(() => setRetrainSuccess(false), 3000);
    }, 600);
  };

  const confidencePct = Math.round((insights.stats.confidenceScore || 0.94) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-brand-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
              <Brain className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Blessy AI Continuous Learning Engine</h2>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Self-Training Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Online Bayesian Probability Model • Architecture: {insights.version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-brand-border bg-slate-100 dark:bg-brand-surfaceElevated text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          
          {/* Key Metric Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 dark:border-brand-border/60 bg-slate-50 dark:bg-brand-surfaceElevated/60 p-3.5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Model Epoch</span>
                <Cpu className="h-3.5 w-3.5 text-teal-500" />
              </div>
              <p className="text-xl font-bold mt-1 text-slate-900 dark:text-white">Epoch #{insights.stats.epoch}</p>
              <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">Continuous weights</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-brand-border/60 bg-slate-50 dark:bg-brand-surfaceElevated/60 p-3.5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Confidence</span>
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{confidencePct}%</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Bayesian prior saturated</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-brand-border/60 bg-slate-50 dark:bg-brand-surfaceElevated/60 p-3.5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Interactions</span>
                <Activity className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <p className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{insights.stats.samplesProcessed}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Processed data points</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-brand-border/60 bg-slate-50 dark:bg-brand-surfaceElevated/60 p-3.5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Learned Tokens</span>
                <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <p className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{insights.symptomCount}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Colloquial clinical words</p>
            </div>
          </div>

          {/* Slot Demand Heatmap (Predicted by ML) */}
          <div className="rounded-2xl border border-slate-200 dark:border-brand-border/60 bg-slate-50 dark:bg-brand-surfaceElevated/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Learned Patient Slot Demand Heatmap
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                Peak Demand: {insights.slotForecast.peakSlot}
              </span>
            </div>
            
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {Object.entries(insights.slotForecast.heatmap).map(([slot, count]) => {
                const max = 70;
                const heightPercent = Math.min(100, Math.round((count / max) * 100));
                const isPeak = slot === insights.slotForecast.peakSlot;
                return (
                  <div key={slot} className="flex flex-col items-center">
                    <div className="h-20 w-full rounded-lg bg-slate-200 dark:bg-brand-surface flex items-end p-1 overflow-hidden">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded transition-all duration-500 ${
                          isPeak
                            ? 'bg-gradient-to-t from-teal-600 to-emerald-400 shadow-sm'
                            : 'bg-teal-500/60 dark:bg-teal-500/40'
                        }`}
                        title={`${slot}: ${count} patient requests`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">{slot}</span>
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Learned Symptom-to-Doctor Affinity Matrix */}
          <div className="rounded-2xl border border-slate-200 dark:border-brand-border/60 bg-slate-50 dark:bg-brand-surfaceElevated/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              Learned Clinical Token Affinities (Bayesian Weights)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {insights.topAffinities.slice(0, 8).map(([word, weights]) => {
                const topTarget = Object.entries(weights)[0] || ['general', 0.5];
                const pct = Math.round(topTarget[1] * 100);
                return (
                  <div
                    key={word}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-brand-border/40 bg-white dark:bg-brand-surface p-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">"{word}"</span>
                      <span className="text-[10px] text-slate-400">➔</span>
                      <span className="capitalize font-bold text-teal-600 dark:text-teal-400">{topTarget[0]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-brand-border overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full bg-teal-500 rounded-full" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-lingual Adaptation Breakdown */}
          <div className="rounded-2xl border border-slate-200 dark:border-brand-border/60 bg-slate-50 dark:bg-brand-surfaceElevated/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Learned Conversational Language Preferences
            </h3>
            <div className="flex items-center gap-4 text-xs mt-2">
              <div className="flex-1">
                <div className="flex justify-between text-[11px] mb-1 font-semibold">
                  <span>Hinglish (Colloquial)</span>
                  <span className="text-teal-600 dark:text-teal-400">{insights.languages.hinglish} sessions</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-brand-border overflow-hidden">
                  <div style={{ width: '55%' }} className="h-full bg-teal-500" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex justify-between text-[11px] mb-1 font-semibold">
                  <span>English (Clinical)</span>
                  <span className="text-purple-600 dark:text-purple-400">{insights.languages.english} sessions</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-brand-border overflow-hidden">
                  <div style={{ width: '32%' }} className="h-full bg-purple-500" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex justify-between text-[11px] mb-1 font-semibold">
                  <span>Hindi (Devanagari)</span>
                  <span className="text-amber-600 dark:text-amber-400">{insights.languages.hindi} sessions</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-brand-border overflow-hidden">
                  <div style={{ width: '18%' }} className="h-full bg-amber-500" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer with Train Step Trigger */}
        <div className="border-t border-slate-200 dark:border-brand-border/80 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {retrainSuccess ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" /> Model weights updated successfully!
              </span>
            ) : (
              <span>Continuous online learning updates automatically on each voice interaction.</span>
            )}
          </div>

          <button
            onClick={handleManualTrain}
            disabled={isRetraining}
            className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 text-xs font-bold shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
            <span>{isRetraining ? 'Training Model...' : 'Simulate Training Step'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
