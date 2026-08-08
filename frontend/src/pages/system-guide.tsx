import { useState } from 'react';
import { ArrowLeft, Zap, FileInput, Database, LayoutDashboard, Play, HelpCircle, ArrowUpRight, BookOpen, Layers, Settings, Key } from 'lucide-react';
import APIMorphicLogo from '@/components/apimorphic-logo';
import RobonitoLogo from '@/components/robonito-logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SystemGuideProps {
  standalone?: boolean;
}

export default function SystemGuide({ standalone = true }: SystemGuideProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'import' | 'gemini' | 'variables' | 'studio' | 'datasets' | 'dashboard'>('all');

  const sections = [
    {
      id: 'import',
      title: '1. Spec Import',
      icon: <FileInput className="h-5 w-5 text-indigo-500" />,
      desc: 'Import your API definitions instantly. APIMorphic supports OpenAPI/Swagger specification URLs, raw JSON/YAML pastes, and Postman Collection v2.1 exports. Once processed, all endpoints are extracted and synced to your workspace.',
      img: '/guide/spec_import.png',
      alt: 'Spec Import Interface',
      steps: [
        'Navigate to the Spec Import tab.',
        'Paste your raw Swagger/OpenAPI JSON/YAML or import from a live URL.',
        'Or import an exported Postman Collection (v2.1).',
        'Click "Process Spec & Import Endpoints" to populate your workspace.'
      ]
    },
    {
      id: 'gemini',
      title: '2. Configure Gemini API Key',
      icon: <Key className="h-5 w-5 text-amber-500" />,
      desc: 'APIMorphic Studio uses Gemini models to synthesize realistic test payloads and recommendations. You need to configure your personal Gemini API key to activate these AI features.',
      img: '/guide/gemini_settings.png',
      alt: 'Configure Gemini API Key',
      steps: [
        'In the top-right header menu, click on the User settings profile button displaying your email.',
        'In the dropdown account popover, find the "Gemini AI Settings" field.',
        'Paste your Gemini API Key (starts with AIzaSy) into the password-protected key input.',
        'The system validates the key in the background and activates the corresponding AI model badge (e.g. Gemini 1.5 Flash).'
      ]
    },
    {
      id: 'variables',
      title: '3. Environment Profiles & Base URL',
      icon: <Settings className="h-5 w-5 text-sky-500" />,
      desc: 'Isolate request environments and mock variables using Profile Switchers. You can define dynamic values (such as auth tokens, tenant IDs, hostnames, and custom request headers) and map them inside your API calls. Profiles dynamically swap key-value sets on the fly. You can also configure the Base URL for your API requests in two ways: either directly in the workspace configuration or as a variable within your environment profiles.',
      img: '/guide/profiles_settings.png',
      alt: 'Environment Profiles Manager',
      steps: [
        'Open the profiles slide-over Environment Profiles Manager sheet by clicking the settings Gear icon in the header (next to the Profile dropdown selector).',
        'Direct Base URL Setup: Configure workspace-level attributes like Base URL, global request headers, and authentication values directly inside the environment config sheet.',
        'Variable Base URL Setup: Add a dynamic variable such as "baseUrl" inside your profiles (e.g. local: http://localhost:3000, production: https://api.mycompany.com). You can reference it in your requests using {{baseUrl}}.',
        'Add, edit, or remove variable key-value pairs per profile. Global variables can be configured to apply across all profiles.',
        'Click Save. You can now toggle the active profile from the dropdown in the top-right header, and all request placeholders (e.g. {{baseUrl}} or {{username}}) will resolve automatically.'
      ]
    },
    {
      id: 'studio',
      title: '4. API Testing Studio',
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      desc: 'The central hub for managing and running your tests. Here, you can search and filter endpoints by HTTP method, configure target Base URLs, select environment profiles, and trigger Gemini AI to auto-generate realistic test cases, request payloads, and edge-case boundary scenarios.',
      img: '/guide/api_testing_studio.png',
      alt: 'API Testing Studio Interface',
      steps: [
        'Select any API endpoint from the left sidebar filterable by method (GET, POST, etc.).',
        'Use environment variables profiles (e.g. Super Admin, Tenant Admin) to swap test contexts.',
        'Generate AI Scenarios: use "Instant AI Scenario" for quick cases, or "Slow Deep Enrich" for thorough suite generation.',
        'Click "Run Test Case" to execute, and monitor response details in the Execution Console.',
        'Prerequisite Auto-Login (If Needed): To avoid running login APIs manually again and again, open the environment config in the Studio. Configure the prerequisite Login API Method, Endpoint (e.g. /api/auth/login), raw JSON user payload, and token extraction path (e.g. body.token). The studio will automatically run the login request first, extract the token, and attach it to subsequent API calls.'
      ]
    },
    {
      id: 'datasets',
      title: '5. Datasets & Mappings',
      icon: <Database className="h-5 w-5 text-emerald-500" />,
      desc: 'Isolate and reuse dynamic data across requests. The system automatically captures response parameters from successful runs. You can map these captured values directly into target request headers, query parameters, or body fields to link sequential APIs seamlessly. AI scenarios automatically read from active mapped values to build contextually coherent payloads.',
      img: '/guide/datasets_mappings.png',
      alt: 'Datasets & Mappings Interface',
      steps: [
        'Auto-Capture: successful test runs automatically register response JSON paths and values under the "Live Auto-Captured Response Records" table.',
        'Mapping Rules: Create a mapping by binding a source captured field (e.g. "body.id" or "body.userId") to a target parameter (e.g. URL Parameter: "userId" or Header: "X-User-Id").',
        'Approval & Manual Creation: The system lists "Mapping Suggestions" based on schema similarity. Click "Approve suggestion" to activate a mapping instantly, or click "Create Mapping" to define a manual binding.',
        'AI Execution: Once a mapping is approved, subsequent AI test generation scenarios and manual executions read from these dynamic datasets, injecting correct IDs or mapped parameters into sequential endpoints.'
      ]
    },
    {
      id: 'dashboard',
      title: '6. Analytics Dashboard',
      icon: <LayoutDashboard className="h-5 w-5 text-violet-500" />,
      desc: 'Track health, coverage, and performance. The dashboard computes run histories, success/fail ratios, and average latency graphs. Crucially, the Gemini AI engine analyzes failure patterns and provides actionable Diagnostic Recommendations to patch API bugs.',
      img: '/guide/dashboard.png',
      alt: 'Dashboard Interface',
      steps: [
        'Monitor top metrics: Total Runs, Pass Rate %, Average Latency, and API Coverage %.',
        'View the API Route Coverage chart to identify untested endpoints.',
        'Read "AI Diagnostic Insights" to receive code fixes and vulnerability warnings based on test failure traces.'
      ]
    }
  ];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 ${standalone ? 'pt-0' : 'p-0'}`}>
      {/* Standalone Header */}
      {standalone && (
        <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center relative select-none">
              <APIMorphicLogo className="h-8 w-auto shrink-0 object-contain" />
              <div className="flex items-center gap-1 self-end translate-x-8 mt-0.5">
                <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">by</span>
                <RobonitoLogo className="h-3.5 w-auto text-indigo-650 dark:text-indigo-400" />
              </div>
            </div>
            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <BookOpen className="h-4 w-4 text-indigo-500" />
              <span>System & User Guide</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs flex items-center gap-1.5 border-slate-200 hover:bg-slate-100 cursor-pointer rounded-lg font-semibold"
            onClick={() => window.close()}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Close Guide
          </Button>
        </header>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        {/* Banner Hero */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider animate-in fade-in duration-300">
            <HelpCircle className="h-3.5 w-3.5" />
            Documentation & System Walkthrough
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
            Master APIMorphic Studio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Configure target workspaces, synthesize intelligent scenario test cases, build cross-request variable mapping flows, and isolate bug vectors with Gemini AI.
          </p>
        </section>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <Button
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            className={`text-xs font-bold rounded-lg px-4 py-2 cursor-pointer ${activeTab === 'all' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Modules
          </Button>
          <Button
            variant={activeTab === 'video' ? 'default' : 'ghost'}
            className={`text-xs font-bold rounded-lg px-4 py-2 cursor-pointer flex items-center gap-1.5 ${activeTab === 'video' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            <Play className="h-3.5 w-3.5" />
            Video Walkthrough
          </Button>
          {sections.map(s => (
            <Button
              key={s.id}
              variant={activeTab === s.id ? 'default' : 'ghost'}
              className={`text-xs font-bold rounded-lg px-4 py-2 cursor-pointer flex items-center gap-1.5 ${activeTab === s.id ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              onClick={() => setActiveTab(s.id)}
            >
              {s.icon}
              {s.title.split('. ')[1]}
            </Button>
          ))}
        </div>

        {/* Video Section */}
        {(activeTab === 'all' || activeTab === 'video') && (
          <Card className="p-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Animated Studio Flow Walkthrough</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Watch this interactive walkthrough demonstrating workspace switching, spec parsing, environment profiles management, dynamic AI generation, and real-time execution outputs.
            </p>
            <div className="relative aspect-video max-w-3xl mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-850 shadow-inner bg-slate-950 flex items-center justify-center">
              <img 
                src="/guide/flow_demo.webp" 
                alt="APIMorphic Flow Walkthrough" 
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-4 right-4 bg-slate-900/90 text-[10px] font-semibold text-slate-350 px-2.5 py-1 rounded-md border border-slate-850">
                Studio Recording Demo
              </div>
            </div>
          </Card>
        )}

        {/* Sections Listing */}
        <div className="space-y-16">
          {sections
            .filter(s => activeTab === 'all' || activeTab === s.id)
            .map((s, idx) => (
              <section key={s.id} className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6 ${idx > 0 && activeTab === 'all' ? 'border-t border-slate-200 dark:border-slate-850' : ''}`}>
                
                {/* Description Text Column */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
                      {s.icon}
                    </span>
                    <h2 className="text-xl font-bold tracking-tight text-slate-850 dark:text-indigo-100">
                      {s.title}
                    </h2>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
                    {s.desc}
                  </p>
                  
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">How to use:</h3>
                    <ul className="space-y-2">
                      {s.steps.map((step, sIdx) => (
                        <li key={sIdx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                          <span className="h-4 w-4 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                            {sIdx + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Screenshot Column */}
                <div className="lg:col-span-7 space-y-2">
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-850 shadow-lg bg-white dark:bg-slate-900 transition-all duration-200 hover:shadow-xl group">
                    <img 
                      src={s.img} 
                      alt={s.alt} 
                      className="w-full h-auto object-contain select-none group-hover:scale-[1.01] transition-transform duration-300"
                    />
                  </div>
                  <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    <span>Active Interface Screenshot</span>
                    <span className="flex items-center gap-0.5">
                      Verified Layout <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>

              </section>
            ))}
        </div>

        {/* Ideal Journey Path Timeline */}
        {(activeTab === 'all') && (
          <section className="border-t border-slate-200 dark:border-slate-850 pt-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1 text-xs text-indigo-500 font-semibold uppercase tracking-wider">
                <Layers className="h-4 w-4" />
                <span>Standard Lifecycle</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-850 dark:text-slate-100">
                The APIMorphic Ideal User Journey
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                Follow this recommended path to transition from a static API specification to complete AI-driven test coverage and insight diagnostics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative pt-4">
              {/* Journey Step 1 */}
              <Card className="p-4 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/40 relative hover:border-slate-350 dark:hover:border-slate-700 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center font-bold text-sm mb-3">1</div>
                <h3 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-1">Import Specifications</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upload your OpenAPI/Swagger URL or Postman Collection to automatically extract all endpoints.
                </p>
              </Card>

              {/* Journey Step 2 */}
              <Card className="p-4 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/40 relative hover:border-slate-350 dark:hover:border-slate-700 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center font-bold text-sm mb-3">2</div>
                <h3 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-1">Set Variable Profiles</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Establish authorization tokens, user header values, and target domain configurations.
                </p>
              </Card>

              {/* Journey Step 3 */}
              <Card className="p-4 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/40 relative hover:border-slate-350 dark:hover:border-slate-700 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center font-bold text-sm mb-3">3</div>
                <h3 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-1">Generate AI Scenarios</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-405 leading-relaxed">
                  Utilize Gemini AI to generate functional test cases, boundary conditions, and mock request bodies.
                </p>
              </Card>

              {/* Journey Step 4 */}
              <Card className="p-4 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/40 relative hover:border-slate-350 dark:hover:border-slate-700 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-500 flex items-center justify-center font-bold text-sm mb-3">4</div>
                <h3 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-1">Verify Diagnostics</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Execute tests, capture response datasets for linking requests, and read AI-driven code recommendations.
                </p>
              </Card>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-850 mt-16 bg-white dark:bg-slate-900/40 py-8 px-6 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
        <p>© 2026 APIMorphic Studio — Powered by Gemini AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
