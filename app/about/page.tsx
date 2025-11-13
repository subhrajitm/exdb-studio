import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function AboutPage() {
  const values = [
    {
      title: 'All-in-One Workspace',
      description: 'No switching tools. Everything you need in one unified platform.',
      icon: 'workspace',
    },
    {
      title: 'AI-Assisted Automation',
      description: 'From import to insights — AI handles the heavy lifting.',
      icon: 'smart_toy',
    },
    {
      title: 'Secure Data Handling',
      description: 'Enterprise-grade encryption and compliance features.',
      icon: 'lock',
    },
    {
      title: 'Built for Teams',
      description: 'Perfect for analysts, developers, and business teams.',
      icon: 'groups',
    },
  ]

  const team = [
    {
      name: 'John Doe',
      role: 'CEO & Founder',
      description: '10+ years in data analytics',
    },
    {
      name: 'Sarah Miller',
      role: 'CTO',
      description: 'Former lead engineer at Google',
    },
    {
      name: 'Raj Kumar',
      role: 'Head of Product',
      description: 'Product strategist and designer',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold text-green-700 mb-1">About Us</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-black tracking-tight mb-2">
              Why Exdata Studio
            </h1>
            <p className="text-sm text-green-600 max-w-2xl mx-auto">
              We're on a mission to make data transformation accessible to everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {values.map((value, index) => (
              <div
                key={index}
                className="border border-green-600/5 p-5 rounded-lg hover:border-green-600/20 hover:shadow-md transition-all duration-300 bg-white/50"
              >
                <div className="w-10 h-10 rounded-lg border border-green-600/10 flex items-center justify-center mb-3 bg-green-600/5">
                  <span className="material-symbols-outlined text-lg text-black">{value.icon}</span>
                </div>
                <h3 className="text-lg font-medium text-black mb-1">{value.title}</h3>
                <p className="text-xs text-green-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-light text-black tracking-tight mb-4 text-center">Our Story</h2>
            <div className="max-w-3xl mx-auto space-y-3 text-sm text-green-600 leading-relaxed">
              <p>
                Exdata Studio was born from a simple observation: businesses spend countless hours manually
                transforming Excel files into databases, only to struggle with analysis and reporting. We
                believed there had to be a better way.
              </p>
              <p>
                Our platform combines the power of AI with intuitive design, making complex data operations
                accessible to everyone—from analysts to developers to business teams. We've built a unified
                workspace where Excel files become databases, insights emerge automatically, and presentations
                generate themselves.
              </p>
              <p>
                Today, we serve hundreds of teams worldwide, helping them transform their data workflows and
                unlock insights faster than ever before.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-light text-black tracking-tight mb-6 text-center">Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {team.map((member, index) => (
                <div
                  key={index}
                  className="text-center border border-green-600/5 p-4 rounded-lg hover:border-green-600/20 hover:shadow-sm transition-all duration-300 bg-white/30"
                >
                  <div className="w-16 h-16 rounded-full bg-green-600/5 border border-green-600/10 mx-auto mb-3 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-green-600/40">person</span>
                  </div>
                  <h3 className="text-base font-medium text-black mb-1">{member.name}</h3>
                  <p className="text-xs font-medium text-green-700 mb-1">{member.role}</p>
                  <p className="text-xs text-green-600/50">{member.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-600/95 backdrop-blur-sm text-white p-8 rounded-lg">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-light mb-2">Join Our Mission</h2>
              <p className="text-white/70 mb-6 text-sm">
                We're always looking for talented individuals who share our passion for making data accessible.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 rounded-lg"
              >
                Get in Touch
                <span className="material-symbols-outlined text-base ml-1.5">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

