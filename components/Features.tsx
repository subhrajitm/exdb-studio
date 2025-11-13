export default function Features() {
  const features = [
    {
      icon: 'upload_file',
      title: 'Excel → Database',
      description: 'Import spreadsheets to SQL or NoSQL in one click. Map columns, detect schema, and sync automatically.',
    },
    {
      icon: 'explore',
      title: 'Data Explorer',
      description: 'Query, filter, and visualize your data instantly with interactive charts and tables.',
    },
    {
      icon: 'psychology',
      title: 'AI Research',
      description: 'Get deep insights and summaries from any dataset. Ask natural questions and discover patterns.',
    },
    {
      icon: 'science',
      title: 'Mock Data Generator',
      description: 'Create realistic test data for any schema effortlessly. Perfect for developers and QA teams.',
    },
    {
      icon: 'description',
      title: 'PPT & Report Builder',
      description: 'Generate business reports and presentations automatically. Turn insights into slides in minutes.',
    },
  ]

  return (
    <section className="py-12 px-4" id="features">
      <div className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-6">
          <div className="lg:col-span-1">
            <p className="text-xs font-semibold text-black/70 mb-1.5">Core Features</p>
            <h2 className="text-2xl sm:text-3xl font-light text-black tracking-tight mb-3">
              Everything you need to transform Excel into insights
            </h2>
            <p className="text-xs text-black/50">Five powerful modules working together in one unified workspace.</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group border border-black/5 p-5 hover:border-black/20 hover:shadow-md transition-all duration-300 cursor-pointer rounded-lg bg-white/50"
              >
                <div className="w-10 h-10 rounded-lg border border-black/10 flex items-center justify-center mb-3 group-hover:bg-black/10 group-hover:border-black/20 transition-all duration-300">
                  <span className="material-symbols-outlined text-lg text-black/70 group-hover:text-black transition-all duration-300">
                    {feature.icon}
                  </span>
                </div>
                <h3 className="text-base font-medium text-black/90 mb-1.5">{feature.title}</h3>
                <p className="text-xs text-black/50 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

