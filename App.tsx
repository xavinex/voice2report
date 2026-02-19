
import React, { useState, useEffect, useRef } from 'react';
import { AppState, StructuredReport } from './types';
import { SpeechService } from './services/speechService';
import { generateReport } from './services/geminiService';
import { downloadAsPDF } from './services/pdfService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [report, setReport] = useState<StructuredReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  
  const speechServiceRef = useRef<SpeechService | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    speechServiceRef.current = new SpeechService({
      onPartial: (text) => setInterimTranscript(text),
      onFinal: (text) => {
        setTranscript(prev => {
          const base = prev.trim();
          const chunk = text.trim();
          return base ? `${base} ${chunk}` : chunk;
        });
        setInterimTranscript('');
      },
      onError: (err) => {
        setError(err);
        setAppState('error');
      },
      onStateChange: (active) => {
        setIsRecording(active);
        if (!active) setInterimTranscript('');
      }
    });

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => setTimer(t => t + 1), 1000);
      setAppState('recording');
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (appState === 'recording') setAppState('ready');
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      speechServiceRef.current?.stop();
    } else {
      setError(null);
      setTimer(0);
      speechServiceRef.current?.start();
    }
  };

  const handleGenerate = async () => {
    const fullText = transcript.trim();
    if (!fullText) {
      setError("Please provide a transcript first.");
      return;
    }
    setAppState('generating');
    try {
      const result = await generateReport(fullText);
      setReport(result);
      setAppState('ready');
    } catch (err: any) {
      setError(err.message || "Failed to generate report.");
      setAppState('error');
    }
  };

  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear your current progress?")) {
      setTranscript('');
      setInterimTranscript('');
      setReport(null);
      setAppState('idle');
      setError(null);
      setTimer(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayedText = transcript + (interimTranscript ? (transcript ? ' ' : '') + interimTranscript : '');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Professional Navigation */}
      <header className="sticky top-0 z-50 h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-white shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-800 uppercase">Voice2Report</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span className={appState === 'recording' ? 'text-blue-600' : ''}>1. Record</span>
            <span className="text-slate-200">/</span>
            <span className={appState === 'generating' ? 'text-blue-600' : ''}>2. Process</span>
            <span className="text-slate-200">/</span>
            <span className={report ? 'text-blue-600' : ''}>3. Review</span>
          </div>
          
          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

          <button 
            onClick={clearAll}
            className="text-slate-400 hover:text-slate-900 text-xs font-semibold px-2 transition-colors"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Step 1: Input & Recording */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[10px]">1</span>
              Audio Transcript
            </h2>
            {isRecording && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs font-bold animate-in fade-in slide-in-from-right-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 recording-dot"></span>
                <span>Live Transcription • {formatTime(timer)}</span>
              </div>
            )}
          </div>

          <div className="pro-card flex flex-col h-full min-h-[500px] overflow-hidden">
            <div className="flex-1 p-0 relative">
              <textarea 
                value={displayedText}
                onChange={(e) => !isRecording && setTranscript(e.target.value)}
                readOnly={isRecording}
                placeholder="The system will transcribe your speech in real-time here..."
                className={`w-full h-full p-8 text-slate-600 bg-transparent resize-none focus:outline-none leading-relaxed text-[15px] font-medium placeholder:text-slate-300 transition-opacity ${isRecording ? 'opacity-50 select-none' : ''}`}
              />
              {!displayedText && !isRecording && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                  <svg className="w-12 h-12 text-slate-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Microphone Input Ready</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={toggleRecording}
                className={`w-full sm:w-auto min-w-[180px] flex items-center justify-center gap-3 py-3.5 px-6 rounded-lg font-bold text-sm transition-all active:scale-[0.98] ${
                  isRecording 
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100' 
                  : 'btn-primary text-white shadow-sm'
                }`}
              >
                {isRecording ? (
                  <><div className="w-3 h-3 bg-rose-500 rounded-sm"></div> Stop Recording</>
                ) : (
                  <><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Start Speaking</>
                )}
              </button>

              <div className="flex-1 flex justify-center sm:justify-end gap-3 w-full">
                <button 
                  onClick={handleGenerate}
                  disabled={!displayedText.trim() || isRecording || appState === 'generating'}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 px-8 rounded-lg font-bold text-sm hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm"
                >
                  {appState === 'generating' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  )}
                  Process with AI
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-2">
            <button 
              onClick={() => {
                setTranscript("Quarterly Planning Meeting: We need to increase our velocity on the backend sprint. Sarah mentioned that the database migrations were successful. The primary goal for next month is to launch the mobile beta for selected users. Budget is approved for 2 more staff hires.");
                setAppState('ready');
              }}
              className="text-[10px] font-bold text-slate-300 hover:text-blue-500 uppercase tracking-widest transition-colors py-2"
            >
              Load professional sample transcript
            </button>
          </div>
        </section>

        {/* Step 2: Report Review */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[10px]">2</span>
              Structured Output
            </h2>
            {report && (
              <button 
                onClick={() => downloadAsPDF(report)}
                className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export PDF
              </button>
            )}
          </div>

          <div className="pro-card flex flex-col h-full min-h-[500px] bg-white overflow-y-auto">
            {report ? (
              <div className="p-10 md:p-14 animate-in fade-in zoom-in-95 duration-500">
                <header className="border-b-4 border-slate-900 pb-8 mb-10">
                  <div className="flex justify-between items-start">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">{report.title}</h1>
                  </div>
                  <p className="text-slate-400 text-xs font-extrabold uppercase tracking-widest mt-3">Formal Record • {report.date}</p>
                </header>

                <div className="space-y-12">
                  {report.sections.map((section, idx) => (
                    <div key={idx} className="space-y-4">
                      <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] flex items-center gap-4">
                        <span className="shrink-0">{idx + 1}. {section.title}</span>
                        <div className="h-px bg-slate-100 flex-1"></div>
                      </h3>
                      <p className="text-slate-600 text-[14px] leading-relaxed font-medium">{section.content}</p>
                      {section.items && section.items.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 pt-2">
                          {section.items.map((item, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 items-center">
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter shrink-0">{String(i+1).padStart(2, '0')}</span>
                              <p className="text-sm font-semibold text-slate-800">{item}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <footer className="mt-20 pt-8 border-t border-slate-100 text-center">
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">Generated by Voice2Report Enterprise Engine</p>
                </footer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                  <svg className="w-8 h-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                </div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Awaiting Generation</h3>
                <p className="text-slate-300 text-xs font-medium max-w-[240px] leading-relaxed">Submit your audio transcript to generate a high-quality professional business report.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modern Feedback/Error Toast */}
      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-white border border-slate-200 p-1 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-6 zoom-in-95 duration-300">
           <div className="bg-rose-500 text-white p-2 rounded-lg ml-1">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           </div>
           <span className="text-xs font-bold text-slate-800 pr-2">{error}</span>
           <button onClick={() => setError(null)} className="p-2 mr-1 hover:bg-slate-50 rounded-lg text-slate-300 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}

      {/* Bottom Footer bar */}
      <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-6 text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] hidden sm:flex">
        <span>© 2025 Voice2Report Enterprise</span>
        <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-400"></div> All Systems Operational</span>
      </footer>
    </div>
  );
};

export default App;
