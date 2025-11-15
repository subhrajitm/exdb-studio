'use client'

import { useState } from 'react'

export default function TabsSection() {
  const [activeTab, setActiveTab] = useState('why')

  const tabs = [
    { id: 'why', label: 'Why Exdata Studio' },
    { id: 'modules', label: 'Powerful Modules' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'pricing', label: 'Pricing' },
  ]

  return (
    <section className="py-16 px-4 border-t border-b border-black/5" id="tabs-section">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex md:flex-col gap-2 md:border-r md:border-black/5 md:pr-8 md:w-48 flex-shrink-0 overflow-x-auto pb-2 md:pb-0 items-start">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn px-4 py-2 text-xs font-medium text-black/70 border-b-2 md:border-b-0 md:border-r-2 transition-all duration-300 whitespace-nowrap text-left ${
                  activeTab === tab.id
                    ? 'active border-black opacity-100'
                    : 'border-transparent hover:text-black hover:border-black/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div id="tab-content" className="flex-1 min-h-[400px]">
            {activeTab === 'why' && (
              <div className="tab-panel active" id="why-panel">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-medium text-black mb-2">All-in-One Workspace</h3>
                    <p className="text-sm text-black/60 leading-relaxed">
                      No switching tools. Everything you need in one unified platform.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-black mb-2">AI-Assisted Automation</h3>
                    <p className="text-sm text-black/60 leading-relaxed">
                      From import to insights — AI handles the heavy lifting.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-black mb-2">Secure Data Handling</h3>
                    <p className="text-sm text-black/60 leading-relaxed">
                      Enterprise-grade encryption and compliance features.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-black mb-2">Built for Teams</h3>
                    <p className="text-sm text-black/60 leading-relaxed">
                      Perfect for analysts, developers, and business teams.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="tab-panel active" id="modules-panel">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-medium text-black mb-2">Excel to DB Converter</h3>
                    <p className="text-sm text-black/60 leading-relaxed">
                      Upload, map, and sync with any database. Automatic schema detection and column mapping.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-black mb-2">Data Explorer</h3>
                    <p className="text-sm text-black/60 leading-relaxed">
                      Interact with your data visually. Query, filter, and visualize instantly.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-black mb-2">Deep Research Assistant</h3>
                    <p className="text-sm text-black/60 leading-relaxed">
                      Ask natural questions and discover patterns. AI-powered insights from any dataset.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-black mb-2">Mock Data Generator</h3>
                    <p className="text-sm text-black/60 leading-relaxed">
                      Create test datasets effortlessly. Realistic data for any schema.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-black mb-2">Report Builder</h3>
                    <p className="text-sm text-black/60 leading-relaxed">
                      Turn insights into slides automatically. Generate presentations in minutes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="tab-panel active" id="integrations-panel">
                <p className="text-sm text-black/60 max-w-2xl mx-auto mb-8 text-center">
                  Connect with your favorite tools. Automate your workflow effortlessly.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {['Google Sheets', 'Power BI', 'Zapier', 'AWS RDS', 'BigQuery', 'PostgreSQL'].map(
                    (integration, index) => (
                      <div
                        key={index}
                        className="text-center border border-black/5 p-4 hover:border-black/20 hover:shadow-sm transition-all duration-300 bg-white/30"
                      >
                        <span className="text-sm font-medium text-black/70">{integration}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {activeTab === 'testimonials' && (
              <div className="tab-panel active bg-black/95 backdrop-blur-sm text-white p-8 -mx-4 shadow-lg" id="testimonials-panel">
                <div className="max-w-6xl mx-auto">
                  <p className="text-sm text-white/70 mb-8 text-center">4.9 ★ from 120+ teams worldwide</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      {
                        text: '"Exdata Studio transformed how we handle Excel data. The AI research feature is incredible!"',
                        name: 'John Doe',
                        role: 'Data Analyst',
                      },
                      {
                        text: '"The mock data generator saved us weeks of work. Perfect for our QA team!"',
                        name: 'Sarah Miller',
                        role: 'QA Lead',
                      },
                      {
                        text: '"From Excel to database in minutes. The report builder is a game-changer for presentations."',
                        name: 'Raj Kumar',
                        role: 'Business Manager',
                      },
                    ].map((testimonial, index) => (
                      <div
                        key={index}
                        className="border border-white/10 p-6 hover:border-white/20 hover:bg-white/5 transition-all duration-300"
                      >
                        <p className="text-sm text-white/70 mb-4 leading-relaxed">{testimonial.text}</p>
                        <div>
                          <p className="text-sm font-medium text-white/90">{testimonial.name}</p>
                          <p className="text-xs text-white/50">{testimonial.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="tab-panel active" id="pricing-panel">
                <p className="text-sm text-black/60 mb-8 text-center">
                  Use Exdata Studio for free with your team. Upgrade to enable unlimited users and enhanced features.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      name: 'Free',
                      price: '₹0',
                      period: '',
                      features: ['1 Database', '1 File Upload', 'Manual Imports'],
                      highlighted: false,
                    },
                    {
                      name: 'Pro',
                      price: '₹999',
                      period: '/mo',
                      features: ['Unlimited Imports', 'AI Insights', 'Report Export'],
                      highlighted: true,
                    },
                    {
                      name: 'Team',
                      price: '₹2499',
                      period: '/mo',
                      features: ['Collaboration', 'Scheduling', 'APIs'],
                      highlighted: false,
                    },
                    {
                      name: 'Enterprise',
                      price: 'Custom',
                      period: '',
                      features: ['RBAC', 'Audit Logs', 'On-Prem Deployment'],
                      highlighted: false,
                    },
                  ].map((plan, index) => (
                    <div
                      key={index}
                      className={`border p-6 hover:border-black/20 hover:shadow-md transition-all duration-300 ${
                        plan.highlighted
                          ? 'border-black/20 bg-white/50 shadow-sm'
                          : 'border-black/5 bg-white/30'
                      }`}
                    >
                      <h3 className="text-lg font-medium mb-3 text-black/90">{plan.name}</h3>
                      <div className="mb-6">
                        <span className="text-3xl font-light">{plan.price}</span>
                        {plan.period && <span className="text-sm text-black/50">{plan.period}</span>}
                      </div>
                      <ul className="space-y-2 mb-6 text-sm text-black/50">
                        {plan.features.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                      <a
                        className={`block w-full text-center px-4 py-2 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md ${
                          plan.highlighted || plan.name === 'Free'
                            ? 'text-white bg-black hover:bg-black/90'
                            : 'text-black/70 border border-black/20 hover:bg-black/5 hover:border-black/40 hover:text-black'
                        }`}
                        href="#"
                      >
                        {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get started'}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

