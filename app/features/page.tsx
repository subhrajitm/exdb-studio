import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Features from '@/components/Features'

export default function FeaturesPage() {
  const detailedFeatures = [
    {
      icon: 'upload_file',
      title: 'Excel → Database',
      description: 'Import spreadsheets to SQL or NoSQL in one click. Map columns, detect schema, and sync automatically.',
      details: [
        'Automatic schema detection',
        'Column mapping wizard',
        'Support for SQL and NoSQL databases',
        'Real-time sync capabilities',
        'Batch import processing',
      ],
    },
    {
      icon: 'explore',
      title: 'Data Explorer',
      description: 'Query, filter, and visualize your data instantly with interactive charts and tables.',
      details: [
        'Interactive data tables',
        'Advanced filtering options',
        'Multiple chart types',
        'Export to various formats',
        'Real-time data updates',
      ],
    },
    {
      icon: 'psychology',
      title: 'AI Research',
      description: 'Get deep insights and summaries from any dataset. Ask natural questions and discover patterns.',
      details: [
        'Natural language queries',
        'Automated pattern detection',
        'Data summarization',
        'Trend analysis',
        'Predictive insights',
      ],
    },
    {
      icon: 'science',
      title: 'Mock Data Generator',
      description: 'Create realistic test data for any schema effortlessly. Perfect for developers and QA teams.',
      details: [
        'Schema-based generation',
        'Realistic data patterns',
        'Customizable templates',
        'Bulk data creation',
        'Export to multiple formats',
      ],
    },
    {
      icon: 'description',
      title: 'PPT & Report Builder',
      description: 'Generate business reports and presentations automatically. Turn insights into slides in minutes.',
      details: [
        'Automated slide generation',
        'Customizable templates',
        'Data visualization integration',
        'Export to PowerPoint/PDF',
        'Collaborative editing',
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold text-black/70 mb-1">Features</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-black tracking-tight mb-2">
              Everything you need to transform Excel into insights
            </h1>
            <p className="text-sm text-black/60 max-w-2xl mx-auto">
              Five powerful modules working together in one unified workspace.
            </p>
          </div>

          <div className="space-y-12 mb-12">
            {detailedFeatures.map((feature, index) => (
              <div
                key={index}
                className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-6 items-center`}
              >
                <div className="flex-1">
                  <div className="w-12 h-12 rounded-lg border border-black/10 flex items-center justify-center mb-3 bg-black/5">
                    <span className="material-symbols-outlined text-xl text-black">
                      {feature.icon}
                    </span>
                  </div>
                  <h2 className="text-2xl font-light text-black tracking-tight mb-2">{feature.title}</h2>
                  <p className="text-sm text-black/60 mb-4 leading-relaxed">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="material-symbols-outlined text-base text-black/70 mr-2 mt-0.5">check_circle</span>
                        <span className="text-sm text-black/60">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1">
                  <div className="border border-black/5 rounded-lg p-6 bg-white/30 h-48 flex items-center justify-center">
                    <span className="text-black/20 text-xs">Feature visualization</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Features />
        </div>
      </div>
      <Footer />
    </div>
  )
}

