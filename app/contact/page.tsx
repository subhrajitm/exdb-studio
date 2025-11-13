'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // TODO: Implement contact form submission
    setTimeout(() => {
      setIsLoading(false)
      alert('Thank you for your message! We\'ll get back to you soon.')
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: '',
        message: '',
      })
    }, 1000)
  }

  const contactMethods = [
    {
      icon: 'email',
      title: 'Email',
      description: 'Send us an email anytime',
      value: 'support@exdatastudio.com',
      link: 'mailto:support@exdatastudio.com',
    },
    {
      icon: 'phone',
      title: 'Phone',
      description: 'Mon-Fri from 9am to 6pm IST',
      value: '+91 123 456 7890',
      link: 'tel:+911234567890',
    },
    {
      icon: 'location_on',
      title: 'Office',
      description: 'Visit us at our office',
      value: '123 Business Street, Mumbai, India',
      link: '#',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold text-black/70 mb-1">Contact</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-black tracking-tight mb-2">
              Get in touch
            </h1>
            <p className="text-sm text-black/60 max-w-2xl mx-auto">
              Have a question or want to learn more? We'd love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {contactMethods.map((method, index) => (
              <a
                key={index}
                href={method.link}
                className="border border-black/5 p-4 rounded-lg hover:border-black/20 hover:shadow-md transition-all duration-300 bg-white/50 text-center"
              >
                <div className="w-10 h-10 rounded-lg border border-black/10 flex items-center justify-center mx-auto mb-3 bg-black/5">
                  <span className="material-symbols-outlined text-lg text-black">{method.icon}</span>
                </div>
                <h3 className="text-base font-medium text-black mb-1">{method.title}</h3>
                <p className="text-xs text-black/50 mb-1">{method.description}</p>
                <p className="text-xs text-black/70">{method.value}</p>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-light text-black mb-4">Send us a message</h2>
              <p className="text-xs text-black/60 mb-6 leading-relaxed">
                Fill out the form and we'll get back to you within 24 hours. For urgent matters, please call us directly.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="material-symbols-outlined text-black/70 mr-3 mt-0.5">schedule</span>
                  <div>
                    <p className="text-sm font-medium text-black mb-1">Response Time</p>
                    <p className="text-xs text-black/60">We typically respond within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="material-symbols-outlined text-black/70 mr-3 mt-0.5">support_agent</span>
                  <div>
                    <p className="text-sm font-medium text-black mb-1">Support Hours</p>
                    <p className="text-xs text-black/60">Monday - Friday, 9:00 AM - 6:00 PM IST</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="material-symbols-outlined text-black/70 mr-3 mt-0.5">language</span>
                  <div>
                    <p className="text-sm font-medium text-black mb-1">Languages</p>
                    <p className="text-xs text-black/60">English, Hindi</p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-black/70 mb-1.5">
                  Full Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 text-sm border border-black/10 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 transition-all duration-300"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-black/70 mb-1.5">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 text-sm border border-black/10 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 transition-all duration-300"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-xs font-medium text-black/70 mb-1.5">
                  Company
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-black/10 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 transition-all duration-300"
                  placeholder="Your Company"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-xs font-medium text-black/70 mb-1.5">
                  Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 text-sm border border-black/10 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 transition-all duration-300"
                >
                  <option value="">Select a subject</option>
                  <option value="general">General Inquiry</option>
                  <option value="sales">Sales Question</option>
                  <option value="support">Technical Support</option>
                  <option value="partnership">Partnership</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-xs font-medium text-black/70 mb-1.5">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-2.5 text-sm border border-black/10 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 transition-all duration-300 resize-none"
                  placeholder="Tell us how we can help..."
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-2.5 text-sm font-medium text-white bg-black hover:bg-black/90 disabled:bg-black/50 disabled:cursor-not-allowed transition-all duration-300 rounded-lg shadow-sm hover:shadow-md"
              >
                {isLoading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

