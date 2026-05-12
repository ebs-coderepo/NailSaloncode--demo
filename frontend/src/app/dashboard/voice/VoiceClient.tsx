'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api.client';

type VoiceConfig = {
  id: string | null;
  greeting: string | null;
  language: string;
  voiceId: string | null;
  systemPrompt: string | null;
  isActive: boolean;
  updatedAt: string | null;
  tenantApiKey: string | null;
};

type Props = {
  initialConfig: VoiceConfig | null;
  role: string;
};

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-US', label: 'Spanish (US)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'zh-CN', label: 'Chinese (Mandarin)' },
  { value: 'vi-VN', label: 'Vietnamese' },
  { value: 'ko-KR', label: 'Korean' },
];

const TABS = ['Configuration', 'Tool Setup', 'Retell AI Guide'];

const DEFAULT_CONFIG: VoiceConfig = {
  id: null, greeting: '', language: 'en-US', voiceId: '',
  systemPrompt: '', isActive: false, updatedAt: null, tenantApiKey: null,
};

export default function VoiceClient({ initialConfig, role }: Props) {
  const [config, setConfig]   = useState<VoiceConfig>(initialConfig ?? DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState({
    greeting:     initialConfig?.greeting     ?? '',
    language:     initialConfig?.language     ?? 'en-US',
    voiceId:      initialConfig?.voiceId      ?? '',
    systemPrompt: initialConfig?.systemPrompt ?? '',
    isActive:     initialConfig?.isActive     ?? false,
  });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState<string | null>(null);

  const canEdit = role === 'OWNER' || role === 'MANAGER';
  const apiKey  = config.tenantApiKey ?? '(not available)';

  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : 'https://YOUR_BACKEND_URL';

  const toolEndpoints = [
    {
      name: 'List Services',
      method: 'GET',
      url: `${baseUrl}/v1/tools/services`,
      description: 'Returns all active services with name, duration, and price.',
    },
    {
      name: 'Check Availability',
      method: 'GET',
      url: `${baseUrl}/v1/tools/availability`,
      description: 'Returns available time slots for a service on a given date.',
      params: 'serviceId (required), date YYYY-MM-DD (required), staffId (optional)',
    },
    {
      name: 'Book Appointment',
      method: 'POST',
      url: `${baseUrl}/v1/tools/appointments`,
      description: 'Creates a new appointment booking.',
    },
    {
      name: 'Lookup Customer',
      method: 'GET',
      url: `${baseUrl}/v1/tools/customer`,
      description: 'Finds a customer by phone number and returns upcoming appointments.',
      params: 'phone (required, E.164 format: +12125550100)',
    },
  ];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true); setSaved(false); setError('');
    try {
      const res = await apiFetch<VoiceConfig>('/api/v1/admin/voice-config', {
        method: 'PATCH',
        body: JSON.stringify({
          greeting:     form.greeting.trim()     || null,
          language:     form.language,
          voiceId:      form.voiceId.trim()      || null,
          systemPrompt: form.systemPrompt.trim() || null,
          isActive:     form.isActive,
        }),
      });
      if (res.success) {
        setConfig({ ...res.data, tenantApiKey: config.tenantApiKey });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.message);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Voice AI</h1>
          <p className="text-gray-500 mt-1">Connect your AI receptionist to Retell AI or any compatible voice platform.</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${config.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {config.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === i
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Configuration ── */}
      {activeTab === 0 && (
        <form onSubmit={handleSave} className="space-y-6">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          {saved && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">Voice AI configuration saved.</p>}

          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Enable Voice AI</p>
              <p className="text-sm text-gray-500 mt-0.5">When active, the AI receptionist will answer calls and book appointments.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => canEdit && setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-brand-600' : 'bg-gray-300'} ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Greeting &amp; Language</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Greeting Message</label>
              <textarea
                className="input w-full" rows={3}
                value={form.greeting}
                onChange={(e) => setForm((f) => ({ ...f, greeting: e.target.value }))}
                disabled={!canEdit}
                placeholder="Thank you for calling! How can I help you today?"
              />
              <p className="text-xs text-gray-400 mt-1">This is the first thing callers hear.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select className="input w-full" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} disabled={!canEdit}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voice ID</label>
              <input
                className="input w-full"
                value={form.voiceId}
                onChange={(e) => setForm((f) => ({ ...f, voiceId: e.target.value }))}
                disabled={!canEdit}
                placeholder="e.g. 11labs-Myra (from your Retell dashboard)"
              />
              <p className="text-xs text-gray-400 mt-1">Copy the Voice ID from your Retell or ElevenLabs voice library.</p>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-gray-900">System Prompt</h2>
              <p className="text-sm text-gray-500 mt-0.5">Instructions that govern AI behaviour during calls. Paste this into your Retell agent&apos;s General Prompt field.</p>
            </div>
            <textarea
              className="input w-full font-mono text-xs" rows={12}
              value={form.systemPrompt}
              onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
              disabled={!canEdit}
              placeholder={`You are a friendly receptionist at {salon_name}. Your job is to:
1. Greet the caller warmly by name if you know them.
2. Help them book, reschedule, or cancel appointments.
3. Answer questions about services, pricing, and availability.
4. Always confirm appointment details (service, date, time, technician) before ending the call.

When booking:
- First ask which service they want, then check availability.
- Confirm the customer's name and phone number.
- Read back the full appointment summary before hanging up.

Be concise, warm, and professional at all times.`}
            />
          </div>

          {canEdit ? (
            <div className="flex items-center justify-between">
              {config.updatedAt && (
                <p className="text-xs text-gray-400">Last saved {new Date(config.updatedAt).toLocaleDateString()}</p>
              )}
              <button type="submit" className="btn-primary ml-auto" disabled={saving}>
                {saving ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Only owners and managers can edit the voice AI configuration.</p>
          )}
        </form>
      )}

      {/* ── Tab 1: Tool Setup ── */}
      {activeTab === 1 && (
        <div className="space-y-6">
          {/* API Key */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Your API Key</h2>
            <p className="text-sm text-gray-500 mb-3">
              Add this as a custom header <code className="bg-gray-100 px-1 rounded text-xs">X-Api-Key</code> on every tool call in Retell. This authenticates requests to your salon&apos;s data.
            </p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
              <code className="flex-1 text-sm font-mono text-gray-800 break-all">{apiKey}</code>
              <button
                onClick={() => copyToClipboard(apiKey, 'apiKey')}
                className="btn-secondary text-xs shrink-0 min-w-[80px]"
              >
                {copied === 'apiKey' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Tool endpoints */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Tool Endpoints</h2>
            <p className="text-sm text-gray-500">Configure each of these as a tool in your Retell agent. Set the <code className="bg-gray-100 px-1 rounded text-xs">X-Api-Key</code> header on all of them.</p>
            {toolEndpoints.map((tool) => (
              <div key={tool.name} className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${tool.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {tool.method}
                  </span>
                  <p className="font-semibold text-gray-900 text-sm">{tool.name}</p>
                </div>
                <p className="text-sm text-gray-500">{tool.description}</p>
                {tool.params && (
                  <p className="text-xs text-gray-400"><strong>Parameters:</strong> {tool.params}</p>
                )}
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                  <code className="flex-1 text-xs font-mono text-gray-700 break-all">{tool.url}</code>
                  <button
                    onClick={() => copyToClipboard(tool.url, tool.name)}
                    className="text-xs text-brand-600 hover:text-brand-800 shrink-0 font-medium"
                  >
                    {copied === tool.name ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-4 bg-amber-50 border-amber-200">
            <p className="text-sm font-semibold text-amber-800 mb-1">Production URL</p>
            <p className="text-sm text-amber-700">
              Replace <code className="bg-amber-100 px-1 rounded">localhost:3001</code> with your deployed backend URL before configuring Retell in production.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab 2: Retell AI Guide ── */}
      {activeTab === 2 && (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Setting Up Retell AI — Step by Step</h2>
            <div className="space-y-5">
              {[
                {
                  step: 1,
                  title: 'Create a Retell account',
                  body: 'Sign up at retellai.com. Go to your dashboard and create a new agent.',
                },
                {
                  step: 2,
                  title: 'Choose LLM type',
                  body: 'Select "Custom LLM" or "Retell LLM". For best results with this system, use Retell LLM with tool calling enabled.',
                },
                {
                  step: 3,
                  title: 'Paste your system prompt',
                  body: 'Copy the system prompt from the Configuration tab and paste it into the "General Prompt" field of your Retell agent.',
                },
                {
                  step: 4,
                  title: 'Set the voice',
                  body: 'Pick a voice from Retell\'s voice library. Copy its Voice ID and paste it into the Voice ID field on the Configuration tab, then save.',
                },
                {
                  step: 5,
                  title: 'Add tools',
                  body: 'In your Retell agent\'s Tools section, add each endpoint from the Tool Setup tab. For each tool: set the URL, method (GET or POST), and add the custom header X-Api-Key with your API key.',
                },
                {
                  step: 6,
                  title: 'Configure tool parameters for availability check',
                  body: 'For "Check Availability": add query params serviceId (string, required) and date (string, format YYYY-MM-DD, required). For "Lookup Customer": add query param phone (string, required).',
                },
                {
                  step: 7,
                  title: 'Configure tool parameters for booking',
                  body: 'For "Book Appointment" (POST): add body params serviceId, staffId, date, time, and customer object (name, phone, email optional).',
                },
                {
                  step: 8,
                  title: 'Get a phone number',
                  body: 'In Retell, go to Phone Numbers → Import or Buy. Assign it to your agent.',
                },
                {
                  step: 9,
                  title: 'Enable the agent',
                  body: 'Go back to the Configuration tab here and toggle "Enable Voice AI" on. Your receptionist is live!',
                },
              ].map(({ step, title, body }) => (
                <div key={step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                    {step}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 bg-blue-50 border-blue-200">
            <p className="text-sm font-semibold text-blue-800 mb-2">Alternative Platforms</p>
            <p className="text-sm text-blue-700">
              This system works with any voice AI platform that supports custom HTTP tool calls — including Vapi, Bland.ai, or a custom setup using Twilio + OpenAI Realtime API. The tool endpoints and API key mechanism are the same across all platforms.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
