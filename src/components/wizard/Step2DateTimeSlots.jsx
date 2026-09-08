import React, { useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, Sun, Sunset, Moon, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { scheduleEngine } from '../../services/scheduleEngine.js';

export default function Step2DateTimeSlots({
  doctor,
  selectedDate,
  onDateChange,
  selectedDuration,
  onDurationChange,
  selectedSlot,
  onSlotSelect,
  onBack,
  onNext
}) {
  // Generate 7 consecutive days
  const daysList = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const iso = d.toISOString().split('T')[0];
      const weekday = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      list.push({ iso, weekday, dayNum });
    }
    return list;
  }, []);

  // Calculate day schedule slots
  const slots = useMemo(() => {
    if (!doctor) return [];
    return scheduleEngine.getDaySchedule(doctor.id, selectedDate, selectedDuration);
  }, [doctor, selectedDate, selectedDuration]);

  // Group slots by period
  const morningSlots = slots.filter(s => s.period === 'morning');
  const afternoonSlots = slots.filter(s => s.period === 'afternoon');
  const eveningSlots = slots.filter(s => s.period === 'evening');

  const isLeave = slots.length === 1 && slots[0].status === 'leave';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-brand-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Select Date & Time Slot</h2>
          <p className="text-sm text-slate-400">
            Consultation with <strong className="text-white">{doctor?.name}</strong> • {doctor?.specialty}
          </p>
        </div>

        {/* Duration Selector */}
        <div className="flex items-center gap-2 bg-brand-surface p-1 rounded-xl border border-brand-border self-start sm:self-auto">
          <span className="text-xs text-slate-400 px-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Duration:
          </span>
          {[15, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => onDurationChange(mins)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedDuration === mins
                  ? 'bg-brand-teal text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      {/* 7-Day Horizontal Calendar Strip */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5 text-brand-teal" /> 1. Choose Date
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {daysList.map((day) => {
            const isSelected = day.iso === selectedDate;
            return (
              <button
                key={day.iso}
                type="button"
                onClick={() => {
                  onDateChange(day.iso);
                  onSlotSelect(null);
                }}
                className={`flex min-w-[96px] flex-col items-center justify-center rounded-xl p-3 border transition-all ${
                  isSelected
                    ? 'border-brand-teal bg-brand-teal/15 text-white ring-2 ring-brand-teal/25 shadow-sm'
                    : 'border-brand-border bg-brand-surface text-slate-400 hover:border-brand-borderActive hover:text-white'
                }`}
              >
                <span className={`text-xs font-medium ${isSelected ? 'text-brand-tealLight' : 'text-slate-400'}`}>
                  {day.weekday}
                </span>
                <span className="text-sm font-bold mt-0.5 text-slate-200">{day.dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leave Notice if applicable */}
      {isLeave ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-300">Doctor on Scheduled Leave / Recess</h4>
            <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">{slots[0].meta?.message}</p>
            <p className="text-xs text-amber-300/80 mt-2">Please choose another date above to view open slots.</p>
          </div>
        </div>
      ) : (
        /* Slot Periods Grid */
        <div className="space-y-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-brand-teal" /> 2. Choose Time Slot ({selectedDuration} Minutes)
          </label>

          {/* Morning Slots */}
          <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-300">
              <Sun className="h-4 w-4 text-amber-400" /> Morning Slots (08:00 AM – 12:00 PM)
            </div>
            {renderSlotChips(morningSlots, selectedSlot, onSlotSelect)}
          </div>

          {/* Afternoon Slots */}
          <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-300">
              <Sunset className="h-4 w-4 text-orange-400" /> Afternoon Slots (12:00 PM – 05:00 PM)
            </div>
            {renderSlotChips(afternoonSlots, selectedSlot, onSlotSelect)}
          </div>

          {/* Evening Slots */}
          <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-300">
              <Moon className="h-4 w-4 text-indigo-400" /> Evening Slots (05:00 PM – 09:30 PM)
            </div>
            {renderSlotChips(eveningSlots, selectedSlot, onSlotSelect)}
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between border-t border-brand-border pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-brand-border px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-brand-borderActive transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Doctors
        </button>

        <button
          type="button"
          disabled={!selectedSlot}
          onClick={onNext}
          className={`flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
            selectedSlot
              ? 'bg-brand-teal text-white shadow-sm hover:bg-brand-tealDark cursor-pointer'
              : 'bg-brand-surfaceElevated text-slate-500 border border-brand-border cursor-not-allowed'
          }`}
        >
          Continue to Patient Vitals <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function renderSlotChips(slots, selectedSlot, onSlotSelect) {
  if (!slots || slots.length === 0) {
    return <p className="text-xs text-slate-500 italic">No scheduled consultation slots in this period.</p>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {slots.map((s) => {
        const isSelected = selectedSlot && selectedSlot.startTime === s.startTime;
        const isAvailable = s.status === 'available';

        if (s.status === 'break') {
          return (
            <div
              key={s.startTime}
              title={s.meta?.message}
              className="flex flex-col items-center justify-center rounded-xl p-2 border border-amber-500/20 bg-amber-500/5 text-amber-400/80 cursor-not-allowed text-center"
            >
              <span className="text-xs font-semibold">{s.timeFormatted}</span>
              <span className="text-[10px] text-amber-500 truncate max-w-full">Break</span>
            </div>
          );
        }

        if (s.status === 'surgery') {
          return (
            <div
              key={s.startTime}
              title={s.meta?.message}
              className="flex flex-col items-center justify-center rounded-xl p-2 border border-rose-500/20 bg-rose-500/5 text-rose-400/80 cursor-not-allowed text-center"
            >
              <span className="text-xs font-semibold">{s.timeFormatted}</span>
              <span className="text-[10px] text-rose-500 truncate max-w-full">OT Surgery</span>
            </div>
          );
        }

        if (s.status === 'booked') {
          return (
            <div
              key={s.startTime}
              className="flex flex-col items-center justify-center rounded-xl p-2 border border-brand-border bg-brand-dark/50 text-slate-500 cursor-not-allowed text-center"
            >
              <span className="text-xs font-semibold line-through">{s.timeFormatted}</span>
              <span className="text-[10px] text-slate-600">Reserved</span>
            </div>
          );
        }

        return (
          <button
            key={s.startTime}
            type="button"
            onClick={() => onSlotSelect(s)}
            className={`flex flex-col items-center justify-center rounded-xl p-2.5 border transition-all text-center ${
              isSelected
                ? 'border-brand-teal bg-brand-teal text-white shadow-sm ring-2 ring-brand-teal/30 scale-[1.02]'
                : 'border-brand-border bg-brand-surfaceElevated text-slate-200 hover:border-brand-teal hover:text-white'
            }`}
          >
            <span className="text-xs font-bold">{s.timeFormatted}</span>
            <span className={`text-[10px] ${isSelected ? 'text-teal-100' : 'text-brand-tealLight font-medium'}`}>
              Available
            </span>
          </button>
        );
      })}
    </div>
  );
}
