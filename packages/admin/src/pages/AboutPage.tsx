import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">About Win5x Admin</h3>
          <p className="card-description">Version and project information</p>
        </div>
        <div className="card-content space-y-3">
          <div>Win5x Admin Panel</div>
          <div className="text-sm text-gray-600">Build: v1.0.0</div>
          <div className="text-sm text-gray-600">This panel lets you manage users, payments, game rounds, promotions, and system configuration.</div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;


















