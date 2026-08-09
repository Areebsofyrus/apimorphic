import { useState } from 'react';
import { Play, HelpCircle, Zap, FileInput, Database, LayoutDashboard, Sparkles, CheckCircle2, ShieldCheck, Cpu, Info, ArrowUpRight, Terminal, ShieldAlert } from 'lucide-react';
import APIMorphicLogo from '@/components/apimorphic-logo';
import RobonitoLogo from '@/components/robonito-logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Login from '@/pages/login';

interface LandingProps {
  onLoginSuccess: (token: string) => void;
}

export default function Landing({ onLoginSuccess }: LandingProps) {
  const [showVideo, setShowVideo] = useState(false);

  const journeySteps = [
    {
      num: '1',
      title: 'Import API Spec',
      desc: 'Parse OpenAPI/Swagger JSON or Postman Collections instantly.',
      icon: <FileInput className="h-5 w-5 text-indigo-500" />,
      align: 'left'
    },
    {
      num: '2',
      title: 'Set Gemini API Key',
      desc: 'Activate the local AI engine with your Gemini API key (starts with AIzaSy) inside workspace settings.',
      icon: <Sparkles className="h-5 w-5 text-amber-500" />,
      align: 'right'
    },
    {
      num: '3',
      title: 'Configure Profiles',
      desc: 'Swap variables, headers, and target environments.',
      icon: <Database className="h-5 w-5 text-emerald-500" />,
      align: 'left'
    },
    {
      num: '4',
      title: 'AI Scenario Gen',
      desc: 'Synthesize dynamic payloads and edge-case suites via Gemini.',
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      align: 'right'
    },
    {
      num: '5',
      title: 'Review Analytics',
      desc: 'Track run histories and inspect AI diagnostic fixes.',
      icon: <LayoutDashboard className="h-5 w-5 text-violet-500" />,
      align: 'left'
    }
  ];

  const features = [
    {
      title: 'Instant Spec Parsing',
      desc: 'Zero-config extraction of endpoints, request structures, and authentication requirements from raw pastes or live URLs.',
      icon: <Terminal className="h-5 w-5 text-slate-500" />
    },
    {
      title: 'Gemini AI Synthesis',
      desc: 'Deep enrichment transforms static schema definitions into rich, multi-modal execution paths and border-case test suites.',
      icon: <Sparkles className="h-5 w-5 text-amber-500" />
    },
    {
      title: 'Response Field Mapping',
      desc: 'Automatically capture response records and bind them to downstream request fields to model sequentially linked user sessions.',
      icon: <Database className="h-5 w-5 text-emerald-500" />
    },
    {
      title: 'Diagnostic Recommendations',
      desc: 'When endpoints fail, Gemini inspects stack traces and response headers to write targeted diagnostic code fix suggestions.',
      icon: <ShieldAlert className="h-5 w-5 text-rose-500" />
    }
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col relative overflow-hidden pb-12">
      <style>{`
        @keyframes svg-dash {
          to {
            stroke-dashoffset: -40px;
          }
        }
        .animate-dash {
          animation: svg-dash 25s linear infinite;
        }
      `}</style>

      {/* Dynamic background blurs */}
      <div className="absolute top-[-100px] left-[10%] w-[500px] h-[500px] bg-indigo-200/25 dark:bg-indigo-950/15 rounded-full blur-3xl -z-10" />
      <div className="absolute top-[300px] right-[5%] w-[600px] h-[600px] bg-violet-200/20 dark:bg-violet-950/10 rounded-full blur-3xl -z-10" />

      {/* Sticky top header bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-xs">
        {/* Cohesive Brand Logo group (matching dashboard styles) */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center relative select-none pr-5 py-1">
            <APIMorphicLogo className="h-14 w-auto shrink-0 object-contain" />
            <div className="flex items-center gap-1.5 self-end translate-x-6 mt-1 mr-3">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                by
              </span>
              <RobonitoLogo className="h-4.5 w-auto text-indigo-650 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Header Action links */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('/docs', '_blank')}
            className="text-xs font-semibold text-slate-650 hover:text-slate-900 dark:text-slate-350 dark:hover:text-white flex items-center gap-1.5 cursor-pointer rounded-lg h-9"
          >
            <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
            Documentation
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVideo(true)}
            className="text-xs font-bold border-slate-200 hover:bg-slate-100 dark:border-slate-850 cursor-pointer rounded-lg flex items-center gap-1.5 h-9"
          >
            <Play className="h-3.5 w-3.5 fill-indigo-500 text-indigo-500" />
            Watch Demo
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-10 md:pt-14 lg:pt-16 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Slogans, value prop & why cards */}
          <div className="lg:col-span-7 space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            {/* Tagline */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-indigo-500 animate-spin-slow" />
                <span>Next-Gen API Verification Environment</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent leading-[1.12]">
                Morph static API schemas into active test suites.
              </h1>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                Automatically generate real-world execution scenarios, resolve dynamic dependencies, map response outputs, and track route coverage powered by Gemini AI models.
              </p>
            </div>

            {/* Premium Name Explanation Card */}
            <Card className="p-4 border border-indigo-150/60 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 backdrop-blur-md rounded-2xl flex gap-3.5 max-w-xl">
              <span className="p-2.5 rounded-xl bg-indigo-100/60 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-900/60 shrink-0 h-10 w-10 flex items-center justify-center">
                <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  Why "APIMorphic"?
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-550 dark:text-slate-350">
                  Derived from <strong>API</strong> + <strong>Morphic</strong> (shaping or varying in form). It represents our AI engine's unique capability to morph static, text-based specification schemas into dynamic execution scenarios, realistic input payloads, and comprehensive boundary condition suites.
                </p>
              </div>
            </Card>
          </div>

          {/* Right Column: Embedded Authentication Form */}
          <div className="lg:col-span-5 flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-full max-w-md shadow-2xl rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-850 bg-white/80 dark:bg-slate-900/75 backdrop-blur-lg">
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-indigo-650 to-purple-500" />
              <div className="p-4">
                <Login onLoginSuccess={onLoginSuccess} isEmbed={true} />
              </div>
            </div>
          </div>

        </div>

        {/* Snake-like Alternating Journey Pathway Section */}
        <section className="mt-28 pt-10 border-t border-slate-200/80 dark:border-slate-850/80 space-y-10 relative">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs text-indigo-500 font-bold uppercase tracking-widest">
              <Cpu className="h-4 w-4" />
              <span>ideal user journey</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-850 dark:text-slate-150">
              The APIMorphic Workflow Path
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Follow the S-curve snaking pipeline to transition from static schemas to diagnostic insights.
            </p>
          </div>

          {/* Vertical Snake Timeline container */}
          <div className="relative max-w-4xl mx-auto px-4 py-8">
            
            {/* Curved Winding S-Shape SVG running down the middle */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[120px] hidden md:block z-0">
              <svg className="w-full h-full overflow-visible" fill="none" viewBox="0 0 100 1000" preserveAspectRatio="none">
                <path
                  d="M 50,0 C 85,125 15,125 50,250 C 85,375 15,375 50,500 C 85,625 15,625 50,750 C 85,875 15,875 50,1000"
                  stroke="url(#snake-gradient)"
                  strokeWidth="3.5"
                  strokeDasharray="8 6"
                  className="animate-dash"
                  vectorEffect="non-scaling-stroke"
                />
                <defs>
                  <linearGradient id="snake-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#d946ef" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="space-y-16">
              {journeySteps.map((step, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative">
                  
                  {/* Left Column content */}
                  {step.align === 'left' ? (
                    <div className="flex justify-end pr-0 md:pr-10 animate-in fade-in slide-in-from-left-4 duration-300">
                      <div className="w-full max-w-md p-5 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white/60 dark:bg-slate-900/40 shadow-xs hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300 hover:shadow-md group relative z-10">
                        {/* Timeline Node overlay for md screens */}
                        <div className="hidden md:flex absolute -right-[49px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-600 border-4 border-slate-50 dark:border-slate-950 items-center justify-center text-[10px] font-bold text-white shadow-sm z-25 group-hover:scale-110 transition-transform">
                          {step.num}
                        </div>
                        
                        <div className="flex items-center gap-3.5 mb-3.5">
                          <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-150/40 dark:border-indigo-900 shrink-0">
                            {step.icon}
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-855 dark:text-slate-150 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden md:block" /> /* Empty filler cell */
                  )}

                  {/* Right Column content */}
                  {step.align === 'right' ? (
                    <div className="flex justify-start pl-0 md:pl-10 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="w-full max-w-md p-5 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white/60 dark:bg-slate-900/40 shadow-xs hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300 hover:shadow-md group relative z-10">
                        {/* Timeline Node overlay for md screens */}
                        <div className="hidden md:flex absolute -left-[51px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-600 border-4 border-slate-50 dark:border-slate-950 items-center justify-center text-[10px] font-bold text-white shadow-sm z-25 group-hover:scale-110 transition-transform">
                          {step.num}
                        </div>
                        
                        <div className="flex items-center gap-3.5 mb-3.5">
                          <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-150/40 dark:border-emerald-900 shrink-0">
                            {step.icon}
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-855 dark:text-slate-150 group-hover:text-emerald-650 dark:group-hover:text-emerald-400 transition-colors">
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden md:block" /> /* Empty filler cell */
                  )}

                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Grid Capabilities Section */}
        <section className="mt-24 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-850 dark:text-slate-150">
              High-Fidelity Studio Capabilities
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Everything you need to test boundary conditions, validate schemas, and analyze failure vectors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            {features.map((feat, idx) => (
              <Card key={idx} className="p-5 border border-slate-200/80 dark:border-slate-850 bg-white/50 dark:bg-slate-900/30 hover:shadow-md hover:border-slate-350 dark:hover:border-slate-800 transition-all group duration-200">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-850/80 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center justify-between">
                  <span>{feat.title}</span>
                  <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
              </Card>
            ))}
          </div>
        </section>

      </div>

      {/* Robonito introduction footer panel */}
      <section className="border-t border-slate-200 dark:border-slate-900 mt-24 py-10 bg-slate-100/30 dark:bg-slate-950/20">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3.5">
          <div className="inline-flex items-center gap-2 justify-center">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Powered by</span>
            <a href="https://robonito.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-85 transition-opacity">
              <RobonitoLogo className="h-6 w-auto text-indigo-650 dark:text-indigo-400" />
            </a>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed font-medium">
            Robonito is a leading no-code API testing and automation platform designed to make QA engineering seamless and fast.
          </p>
          <div className="pt-1">
            <a
              href="https://robonito.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-650 hover:text-indigo-850 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors group cursor-pointer"
            >
              <span>Visit Robonito Automation Studio</span>
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* Video Walkthrough modal popup */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850 bg-slate-900/60">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Play className="h-4 w-4 text-indigo-500 fill-indigo-500 animate-pulse" />
                APIMorphic Studio Walkthrough
              </h3>
              <button
                onClick={() => setShowVideo(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Close Demo
              </button>
            </div>
            <div className="relative aspect-video w-full flex items-center justify-center bg-slate-950">
              <img
                src="/guide/flow_demo.webp"
                alt="APIMorphic Flow Walkthrough"
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-4 right-4 bg-slate-900/90 text-[10px] font-semibold text-slate-350 px-2.5 py-1 rounded-md border border-slate-850">
                Interactive Recording
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Landing Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-850/80 bg-white/20 dark:bg-slate-900/20 py-8 px-6 text-center text-xs text-slate-400 dark:text-slate-500 space-y-4">
        {/* Cohesive Brand Logo group in Footer */}
        <div className="flex flex-col items-center justify-center select-none py-1">
          <APIMorphicLogo className="h-14 w-auto shrink-0 object-contain" />
        </div>

        <div className="flex items-center justify-center gap-1.5 font-medium flex-wrap">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Bring your own Gemini API Key.</span>
          <span className="mx-2">•</span>
          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
          <span>Secured Workspaces.</span>
          <span className="mx-2">•</span>
          <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
          <span>Zero Configuration Required.</span>
        </div>
        <p className="mt-2.5 text-[10px]">© 2026 APIMorphic Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
