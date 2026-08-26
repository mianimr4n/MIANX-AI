'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import Link from 'next/link'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'AI', href: '#ai' },
  { label: 'Platform', href: '#platform' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <nav className="flex flex-col gap-4 mt-8">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="text-sm font-medium hover:text-primary transition-colors">
              {link.label}
            </Link>
          ))}
          <div className="border-t pt-4 flex flex-col gap-2">
            <Link href="/login" onClick={() => setOpen(false)}><Button variant="outline" className="w-full">Sign In</Button></Link>
            <Link href="/signup" onClick={() => setOpen(false)}><Button className="w-full">Get Started</Button></Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
