'use client'

import Link from 'next/link'

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-2 sm:px-6">
      <div className="bg-white/95 backdrop-blur-sm border-b border-green-600/5 rounded-b-lg shadow-sm">
        <nav className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-base font-bold tracking-tight text-black">
              Exdata Studio
            </Link>
            <div className="hidden lg:flex items-center gap-4 ml-6">
              <Link
                className="text-xs font-medium text-green-700 hover:text-black transition-all duration-300"
                href="/features"
              >
                Features
              </Link>
              <Link
                className="text-xs font-medium text-green-700 hover:text-black transition-all duration-300"
                href="/about"
              >
                About Us
              </Link>
              <Link
                className="text-xs font-medium text-green-700 hover:text-black transition-all duration-300"
                href="/pricing"
              >
                Pricing
              </Link>
              <Link
                className="text-xs font-medium text-green-700 hover:text-black transition-all duration-300"
                href="/faq"
              >
                FAQ
              </Link>
              <Link
                className="text-xs font-medium text-green-700 hover:text-black transition-all duration-300"
                href="/contact"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Link
              className="px-3 py-1.5 text-xs font-medium text-green-700 hover:text-black hover:bg-green-600/5 transition-all duration-300 rounded-lg"
              href="/login"
            >
              Login
            </Link>
            <Link
              className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-all duration-300 rounded-lg shadow-sm"
              href="/register"
            >
              Get started
            </Link>
          </div>
          <button className="lg:hidden p-1 text-black rounded-lg hover:bg-green-600/10 transition-colors">
            <span className="material-symbols-outlined text-base">menu</span>
          </button>
        </nav>
      </div>
    </header>
  )
}

