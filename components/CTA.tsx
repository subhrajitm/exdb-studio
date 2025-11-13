export default function CTA() {
  return (
    <section className="py-24 px-4" id="cta">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-black tracking-tight mb-6">
          From Excel to Insights<br />
          in Minutes
        </h2>
        <p className="text-sm text-black/60 mb-10">Start your free trial today. No credit card required.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-black hover:bg-black/90 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md"
            href="#"
          >
            Start Free
            <span className="material-symbols-outlined text-base ml-1.5">arrow_forward</span>
          </a>
          <a
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-black/70 border border-black/20 hover:bg-black/5 hover:border-black/40 hover:text-black transition-all duration-300 rounded-lg"
            href="#"
          >
            Book Demo
          </a>
        </div>
      </div>
    </section>
  )
}

