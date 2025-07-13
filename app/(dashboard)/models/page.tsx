import React from 'react'
import ModelList from '@/components/ModelList'

const Models = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Models</h1>
        <p className="text-muted-foreground">
          View and manage your trained models
        </p>
      </div>
      
      <ModelList />
    </div>
  )
}

export default Models