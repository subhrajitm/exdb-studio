'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          question: 'How do I get started with Exdata Studio?',
          answer:
            'Getting started is easy! Simply sign up for a free account, upload your first Excel file, and our AI will automatically detect the schema and help you map it to your database. No coding required.',
        },
        {
          question: 'What file formats do you support?',
          answer:
            'We support Excel files (.xlsx, .xls), CSV files, and Google Sheets. You can import directly from these formats or connect via API.',
        },
        {
          question: 'Do I need technical knowledge to use Exdata Studio?',
          answer:
            'Not at all! Exdata Studio is designed for users of all technical levels. Our intuitive interface and AI-powered features make data transformation accessible to everyone.',
        },
      ],
    },
    {
      category: 'Features',
      questions: [
        {
          question: 'What databases can I connect to?',
          answer:
            'We support all major SQL databases (PostgreSQL, MySQL, SQL Server, SQLite) and NoSQL databases (MongoDB, DynamoDB). You can also export to cloud storage services like S3 or Google Cloud Storage.',
        },
        {
          question: 'How does the AI Research feature work?',
          answer:
            'Our AI Research feature uses advanced machine learning to analyze your data, identify patterns, answer natural language questions, and generate insights. Simply ask questions in plain English, and get instant answers.',
        },
        {
          question: 'Can I schedule automatic imports?',
          answer:
            'Yes! With our Team and Enterprise plans, you can schedule automatic imports from Excel files, APIs, or cloud storage. Set it once and let Exdata Studio handle the rest.',
        },
      ],
    },
    {
      category: 'Pricing & Billing',
      questions: [
        {
          question: 'Can I change plans later?',
          answer:
            'Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any charges.',
        },
        {
          question: 'Is there a free trial?',
          answer:
            'Yes, all paid plans come with a 14-day free trial. No credit card required. You can explore all features risk-free.',
        },
        {
          question: 'What payment methods do you accept?',
          answer:
            'We accept all major credit cards, debit cards, UPI, and bank transfers. Enterprise customers can pay via invoice.',
        },
        {
          question: 'Do you offer refunds?',
          answer:
            'Yes, we offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied, we\'ll refund your payment in full.',
        },
      ],
    },
    {
      category: 'Security & Privacy',
      questions: [
        {
          question: 'How secure is my data?',
          answer:
            'Security is our top priority. We use enterprise-grade encryption (AES-256) for data at rest and TLS 1.3 for data in transit. All data is stored in SOC 2 compliant data centers.',
        },
        {
          question: 'Who can access my data?',
          answer:
            'Only you and team members you explicitly invite can access your data. We never share your data with third parties, and our employees can only access data with your explicit permission for support purposes.',
        },
        {
          question: 'Do you comply with data regulations?',
          answer:
            'Yes, we comply with GDPR, CCPA, and other major data protection regulations. You can request data deletion or export at any time.',
        },
      ],
    },
    {
      category: 'Support',
      questions: [
        {
          question: 'What support options are available?',
          answer:
            'Free plan users have access to our community forum and documentation. Pro plan users get email support, and Team/Enterprise users get priority support with faster response times.',
        },
        {
          question: 'How quickly do you respond to support requests?',
          answer:
            'Response times vary by plan: Free (community forum), Pro (24-48 hours), Team (12-24 hours), Enterprise (1-4 hours).',
        },
        {
          question: 'Do you offer training or onboarding?',
          answer:
            'Yes! Enterprise customers receive dedicated onboarding and training sessions. We also have comprehensive documentation and video tutorials available for all users.',
        },
      ],
    },
  ]

  const toggleQuestion = (categoryIndex: number, questionIndex: number) => {
    const index = `${categoryIndex}-${questionIndex}`
    const currentIndex = openIndex !== null ? `${Math.floor(openIndex as number)}-${(openIndex as number) % 100}` : null
    if (currentIndex === index) {
      setOpenIndex(null)
    } else {
      setOpenIndex(categoryIndex * 100 + questionIndex)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold text-green-700 mb-1">FAQ</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-black tracking-tight mb-2">
              Frequently Asked Questions
            </h1>
            <p className="text-sm text-green-600 max-w-2xl mx-auto">
              Everything you need to know about Exdata Studio
            </p>
          </div>

          <div className="space-y-8">
            {faqs.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h2 className="text-xl font-light text-black mb-4">{category.category}</h2>
                <div className="space-y-3">
                  {category.questions.map((faq, questionIndex) => {
                    const isOpen = openIndex === categoryIndex * 100 + questionIndex
                    return (
                      <div
                        key={questionIndex}
                        className="border border-green-600/5 rounded-lg bg-white/30 overflow-hidden"
                      >
                        <button
                          onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-green-600/5 transition-all duration-300"
                        >
                          <span className="text-sm font-medium text-black pr-4">{faq.question}</span>
                          <span
                            className={`material-symbols-outlined text-green-600/40 transition-transform duration-300 flex-shrink-0 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          >
                            expand_more
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-4 py-3 border-t border-green-600/5">
                            <p className="text-xs text-green-600 leading-relaxed">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center bg-green-600/95 backdrop-blur-sm text-white p-8 rounded-lg">
            <h2 className="text-xl font-light mb-2">Still have questions?</h2>
            <p className="text-white/70 mb-4 text-sm">Can&apos;t find the answer you&apos;re looking for? Please reach out to our support team.</p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 rounded-lg"
            >
              Contact Support
              <span className="material-symbols-outlined text-base ml-1.5">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

