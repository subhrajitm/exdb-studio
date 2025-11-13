import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-black/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="text-base font-bold tracking-tight text-black">
              Exdata Studio
            </Link>
            <p className="mt-2 text-xs text-black/60">
              From Excel to Insights — Instantly. Transform your data workflows with AI-powered automation.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-black/70 tracking-wider uppercase mb-3">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link className="text-xs text-black/50 hover:text-black transition-all duration-300" href="/features">
                  Features
                </Link>
              </li>
              <li>
                <Link className="text-xs text-black/50 hover:text-black transition-all duration-300" href="/pricing">
                  Pricing
                </Link>
              </li>
              <li>
                <Link className="text-xs text-black/50 hover:text-black transition-all duration-300" href="/faq">
                  FAQ
                </Link>
              </li>
              <li>
                <a className="text-xs text-black/50 hover:text-black transition-all duration-300" href="#">
                  Docs
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-medium text-black/70 tracking-wider uppercase mb-3">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link className="text-xs text-black/50 hover:text-black transition-all duration-300" href="/about">
                  About
                </Link>
              </li>
              <li>
                <Link className="text-xs text-black/50 hover:text-black transition-all duration-300" href="/contact">
                  Contact
                </Link>
              </li>
              <li>
                <a className="text-xs text-black/50 hover:text-black transition-all duration-300" href="#">
                  Careers
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-medium text-black/70 tracking-wider uppercase mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a className="text-xs text-black/50 hover:text-black transition-all duration-300" href="#">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a className="text-xs text-black/50 hover:text-black transition-all duration-300" href="#">
                  Terms of Service
                </a>
              </li>
              <li>
                <a className="text-xs text-black/50 hover:text-black transition-all duration-300" href="#">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-black/5 flex flex-col md:flex-row items-center justify-between">
          <p className="text-xs text-black/50">© 2025 Exdata Studio. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-3 md:mt-0">
            <a className="text-black/50 hover:text-black transition-all duration-300" href="#" aria-label="LinkedIn">
              <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path>
              </svg>
              <span className="sr-only">LinkedIn</span>
            </a>
            <a className="text-black/50 hover:text-black transition-all duration-300" href="#" aria-label="GitHub">
              <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12.019c0 4.435 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12.019C22 6.477 17.523 2 12 2z"
                  fillRule="evenodd"
                ></path>
              </svg>
              <span className="sr-only">GitHub</span>
            </a>
            <a className="text-black/50 hover:text-black transition-all duration-300" href="#" aria-label="YouTube">
              <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>
              </svg>
              <span className="sr-only">YouTube</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

