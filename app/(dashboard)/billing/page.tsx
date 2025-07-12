import React from 'react'

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing & Subscription</h2>
        <p className="text-muted-foreground">Manage your billing information and subscription plan.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Current Plan</h3>
          <p className="text-2xl font-bold text-primary">Pro</p>
          <p className="text-sm text-muted-foreground">$29/month</p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Next Billing</h3>
          <p className="text-2xl font-bold">Dec 15, 2024</p>
          <p className="text-sm text-muted-foreground">Auto-renewal enabled</p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Usage</h3>
          <p className="text-2xl font-bold">85%</p>
          <p className="text-sm text-muted-foreground">of monthly limit</p>
        </div>
      </div>
    </div>
  )
}