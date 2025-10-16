"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronDown, Menu, X } from "lucide-react"

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="nav is-inverse">
      <div className="nav_container">
        <div className="nav_left">
          <a href="https://nutrigenius-367f75.webflow.io/" className="nav_logo">
            <div className="nav_logo-icon">
              <svg width="100%" height="100%" viewBox="0 0 33 33" preserveAspectRatio="xMidYMid meet">
                <path
                  d="M28,0H5C2.24,0,0,2.24,0,5v23c0,2.76,2.24,5,5,5h23c2.76,0,5-2.24,5-5V5c0-2.76-2.24-5-5-5ZM29,17c-6.63,0-12,5.37-12,12h-1c0-6.63-5.37-12-12-12v-1c6.63,0,12-5.37,12-12h1c0,6.63,5.37,12,12,12v1Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className="nav_brand-name">Nutrigenius</div>
          </a>

          <nav className="nav_menu">
            <ul className="nav_menu-list">
              <li className="nav_menu-list-item">
                <div className="nav_dropdown-menu">
                  <button className="nav_link on-inverse">
                    <div>Explore</div>
                    <ChevronDown className="nav-caret" size={16} />
                  </button>
                </div>
              </li>
              <li className="nav_menu-list-item">
                <Link href="#" className="nav_link on-inverse">
                  <div>How it works</div>
                </Link>
              </li>
              <li className="nav_menu-list-item">
                <Link href="#" className="nav_link on-inverse">
                  <div>Inspiration</div>
                </Link>
              </li>
              <li className="nav_menu-list-item">
                <div className="nav_dropdown-menu">
                  <button className="nav_link on-inverse">
                    <div>Help</div>
                    <ChevronDown className="nav-caret" size={16} />
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>

        <div className="nav_right">
          <div className="button-group">
            <Link href="/search" className="button on-inverse">
              <div className="button_label">Get started</div>
            </Link>
          </div>
        </div>

        <button
          className="nav_mobile-menu-button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="nav_mobile-menu">
          <nav className="nav_mobile-menu-content">
            <Link href="#" className="nav_mobile-link" onClick={() => setMobileMenuOpen(false)}>
              Explore
            </Link>
            <Link href="#" className="nav_mobile-link" onClick={() => setMobileMenuOpen(false)}>
              How it works
            </Link>
            <Link href="#" className="nav_mobile-link" onClick={() => setMobileMenuOpen(false)}>
              Inspiration
            </Link>
            <Link href="#" className="nav_mobile-link" onClick={() => setMobileMenuOpen(false)}>
              Help
            </Link>
            <Link href="/search" className="button on-inverse mobile" onClick={() => setMobileMenuOpen(false)}>
              <div className="button_label">Get started</div>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
