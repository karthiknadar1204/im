import React from 'react';
import ModelTrainingForm from '@/components/ModelTrainingForm';

const ModelTraining = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Model Training</h2>
        <p className="text-muted-foreground">
          Train your own custom AI model using your personal images.
        </p>
      </div>
      
      <div className="flex justify-center">
        <ModelTrainingForm />
      </div>
    </div>
  );
};

export default ModelTraining;