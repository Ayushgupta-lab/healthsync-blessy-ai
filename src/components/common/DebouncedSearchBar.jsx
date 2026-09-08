import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, User, Stethoscope, Calendar, X } from 'lucide-react';
import { apiService } from '../../services/apiService.js';

export default function DebouncedSearchBar({ onSelectResult }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await apiService.get(`/api/search?q=${encodeURIComponent(query.trim())}`);
        setResults(res);
        setIsOpen(true);
      } catch (err) {
        console.warn("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalResults =
    (results?.doctors?.length || 0) +
    (results?.appointments?.length || 0) +
    (results?.patients?.length || 0);

  return (
    <div className="relative w-48 sm:w-64" ref={containerRef}>
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-teal" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results) setIsOpen(true); }}
          placeholder="Search doctors, slots, IDs..."
          className="w-full rounded-xl border border-brand-border bg-brand-surface pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); }}
            className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && results && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl border border-brand-border bg-brand-surface p-3 shadow-2xl z-50 animate-fadeIn max-h-80 overflow-y-auto">
          {totalResults === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">No matching records found.</p>
          ) : (
            <div className="space-y-3">
              {/* Doctors */}
              {results.doctors && results.doctors.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-brand-teal tracking-wider px-1">Doctors</span>
                  <div className="mt-1 space-y-1">
                    {results.doctors.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => { setIsOpen(false); if (onSelectResult) onSelectResult({ type: 'doctor', data: doc }); }}
                        className="flex items-center gap-2 rounded-lg p-2 hover:bg-brand-teal/10 hover:border-brand-teal/30 border border-transparent transition-all cursor-pointer"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-teal/20 text-brand-teal text-xs">
                          <Stethoscope className="h-3.5 w-3.5" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-white truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{doc.specialty}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Appointments */}
              {results.appointments && results.appointments.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-brand-teal tracking-wider px-1">Appointments</span>
                  <div className="mt-1 space-y-1">
                    {results.appointments.map((apt) => (
                      <div
                        key={apt.id}
                        onClick={() => { setIsOpen(false); if (onSelectResult) onSelectResult({ type: 'appointment', data: apt }); }}
                        className="flex items-center gap-2 rounded-lg p-2 hover:bg-brand-teal/10 hover:border-brand-teal/30 border border-transparent transition-all cursor-pointer"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-teal/20 text-brand-teal text-xs font-mono font-bold">
                          <Calendar className="h-3.5 w-3.5" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-white truncate">#{apt.id} • {apt.doctorName}</p>
                          <p className="text-[10px] text-slate-400">{apt.date} at {apt.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patients */}
              {results.patients && results.patients.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-brand-teal tracking-wider px-1">Patients</span>
                  <div className="mt-1 space-y-1">
                    {results.patients.map((pat) => (
                      <div
                        key={pat.id}
                        onClick={() => { setIsOpen(false); if (onSelectResult) onSelectResult({ type: 'patient', data: pat }); }}
                        className="flex items-center gap-2 rounded-lg p-2 hover:bg-brand-teal/10 hover:border-brand-teal/30 border border-transparent transition-all cursor-pointer"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-teal/20 text-brand-teal text-xs">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-white truncate">{pat.name}</p>
                          <p className="text-[10px] text-slate-400">{pat.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
