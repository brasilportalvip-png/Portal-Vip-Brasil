import React from 'react';
import { AlmaLivingCore } from './AlmaLivingCore';

interface Props {
  authenticated: boolean;
  onOpenAuth: () => void;
  onNavigate: (tab: string) => void;
}

export const LandingPage: React.FC<Props> = ({
  authenticated,
  onOpenAuth,
  onNavigate
}) => {
  return (
    <AlmaLivingCore
      user={null}
      selectedCompany={null}
      companies={[]}
      campaigns={[]}
      scheduledPosts={[]}
      contentItems={[]}
      onSelectCompany={() => {}}
      onRefreshCompanies={async () => {}}
      onRefreshContents={async () => {}}
      onRefreshSchedule={async () => {}}
      onRefreshCampaigns={async () => {}}
      reloadSession={async () => {}}
      onOpenAuth={onOpenAuth}
      onLogout={() => {}}
      onNavigate={onNavigate}
      initialDimension={null}
    />
  );
};
