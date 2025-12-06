'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Mail, Phone, MessageSquare } from 'lucide-react'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    comment: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSubmitted(true)
        setFormData({ name: '', email: '', comment: '' })
        setTimeout(() => setSubmitted(false), 5000)
      } else {
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting contact form:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We'd love to hear from you! Whether you have a question, feedback, or just want to say hello,
              feel free to reach out.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>

                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <a href="mailto:support@nutrigenius.com" className="text-primary hover:underline">
                        support@nutrigenius.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Phone</h3>
                      <a href="tel:+1234567890" className="text-primary hover:underline">
                        +1 (234) 567-890
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Support Hours</h3>
                      <p className="text-muted-foreground">
                        Monday - Friday: 9:00 AM - 6:00 PM EST<br />
                        Weekend: 10:00 AM - 4:00 PM EST
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-blue-50">
                <h3 className="font-semibold mb-3">Quick Tips</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Please include as much detail as possible in your message</li>
                  <li>• For technical issues, mention your browser and device</li>
                  <li>• We typically respond within 24-48 hours</li>
                  <li>• Check your spam folder if you don't receive a response</li>
                </ul>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Send us a Message</h2>

              {submitted && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
                  Thank you for your message! We'll get back to you soon.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Name *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your.email@example.com"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="comment" className="block text-sm font-medium mb-2">
                    Message *
                  </label>
                  <textarea
                    id="comment"
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Tell us what's on your mind..."
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? 'Sending...' : 'Submit Message'}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
