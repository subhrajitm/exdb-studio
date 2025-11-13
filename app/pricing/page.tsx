import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '₹0',
      period: '',
      description: 'Perfect for getting started',
      features: [
        '1 Database connection',
        '1 File upload per month',
        'Manual imports only',
        'Basic data explorer',
        'Community support',
      ],
      highlighted: false,
      cta: 'Get started',
    },
    {
      name: 'Pro',
      price: '₹999',
      period: '/mo',
      description: 'For individuals and small teams',
      features: [
        'Unlimited imports',
        'AI-powered insights',
        'Report export',
        'Advanced data explorer',
        'Email support',
        'API access',
      ],
      highlighted: true,
      cta: 'Start free trial',
    },
    {
      name: 'Team',
      price: '₹2499',
      period: '/mo',
      description: 'For growing teams',
      features: [
        'Everything in Pro',
        'Team collaboration',
        'Scheduled imports',
        'Advanced APIs',
        'Priority support',
        'Custom integrations',
        'Team analytics',
      ],
      highlighted: false,
      cta: 'Contact sales',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations',
      features: [
        'Everything in Team',
        'Role-based access control',
        'Audit logs',
        'On-premise deployment',
        'Dedicated support',
        'Custom SLA',
        'Training & onboarding',
      ],
      highlighted: false,
      cta: 'Contact sales',
    },
  ]

  const faqs = [
    {
      question: 'Can I change plans later?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, and UPI. Enterprise customers can pay via invoice.',
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes, all paid plans come with a 14-day free trial. No credit card required.',
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 30-day money-back guarantee on all paid plans.',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold text-green-700 mb-1">Pricing</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-black tracking-tight mb-2">
              Simple, transparent pricing
            </h1>
            <p className="text-sm text-green-600 max-w-2xl mx-auto mb-4">
              Use Exdata Studio for free with your team. Upgrade to enable unlimited users and enhanced features.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-green-600">
              <span>Monthly</span>
              <span className="px-2 py-1 bg-green-600/5 rounded text-xs font-medium">Save 20%</span>
              <span>Annual</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`border p-5 rounded-lg transition-all duration-300 ${
                  plan.highlighted
                    ? 'border-green-600/20 bg-white/50 shadow-lg scale-105'
                    : 'border-green-600/5 bg-white/30 hover:border-green-600/20 hover:shadow-md'
                }`}
              >
                {plan.highlighted && (
                  <div className="mb-3">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-medium mb-1 text-black/90">{plan.name}</h3>
                <p className="text-xs text-green-600/50 mb-4">{plan.description}</p>
                <div className="mb-4">
                  <span className="text-3xl font-light">{plan.price}</span>
                  {plan.period && <span className="text-sm text-green-600/50 ml-1">{plan.period}</span>}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="material-symbols-outlined text-base text-green-700 mr-2 mt-0.5">check_circle</span>
                      <span className="text-sm text-green-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === 'Enterprise' || plan.name === 'Team' ? '/contact' : '/register'}
                  className={`block w-full text-center px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-lg shadow-sm hover:shadow-md ${
                    plan.highlighted || plan.name === 'Free'
                      ? 'text-white bg-green-600 hover:bg-green-700'
                      : 'text-green-700 border border-green-600/20 hover:bg-green-600/5 hover:border-green-600/40 hover:text-green-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-light text-black tracking-tight mb-6 text-center">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-green-600/5 p-4 rounded-lg bg-white/30">
                  <h3 className="text-base font-medium text-black mb-1">{faq.question}</h3>
                  <p className="text-xs text-green-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center bg-green-600/95 backdrop-blur-sm text-white p-8 rounded-lg">
            <h2 className="text-2xl font-light mb-2">Need help choosing a plan?</h2>
            <p className="text-white/70 mb-6 text-sm">Our team is here to help you find the perfect solution.</p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 rounded-lg"
            >
              Contact Sales
              <span className="material-symbols-outlined text-base ml-1.5">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

