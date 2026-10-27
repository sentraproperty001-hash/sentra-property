/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { HomePage } from './features/public-site/HomePage';
import { CatalogPage } from './features/public-site/CatalogPage';
import { DetailPage } from './features/public-site/DetailPage';
import { LoginPage } from './features/auth/LoginPage';
import { PortalPreviewPage } from './features/auth/PortalPreviewPage';
import { DashboardOverview } from './features/dashboard/DashboardOverview';
import { PropertyListingsManager } from './features/dashboard/PropertyListingsManager';
import { ListingApprovalPage } from './features/dashboard/ListingApprovalPage';
import { LeadsManagerPage } from './features/dashboard/LeadsManagerPage';
import { AgentManagementPage } from './features/dashboard/AgentManagementPage';
import { ActivityLogPage } from './features/dashboard/ActivityLogPage';
import { PublicAppPage } from './features/public-site/PublicAppPage';
import { PublicAppDetailPage } from './features/public-site/PublicAppDetailPage';
import { useAuth } from './features/auth/AuthContext';
import React from 'react';

const isPublicAppHost = window.location.hostname === 'app.sentraproperty.com';

const DashboardAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[#6B7280]">Memeriksa sesi portal...</div>;
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const DemoDashboardOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDemoMode } = useAuth();
  return isDemoMode ? <>{children}</> : <Navigate to="/dashboard/properties" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {isPublicAppHost ? (
            <>
              <Route path="/" element={<PublicAppPage />} />
              <Route path="/katalog" element={<PublicAppPage />} />
              <Route path="/detail/:slug" element={<PublicAppDetailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              {/* Public Website Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/katalog" element={<CatalogPage />} />
              <Route path="/detail/:slug" element={<DetailPage />} />
              <Route path="/app" element={<PublicAppPage basePath="/app" />} />
              <Route path="/app/katalog" element={<PublicAppPage basePath="/app" />} />
              <Route path="/app/detail/:slug" element={<PublicAppDetailPage basePath="/app" />} />

              {/* Authentication & Portal Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/portal-info" element={<PortalPreviewPage />} />

              {/* Internal Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardAccess><DemoDashboardOnly><DashboardOverview /></DemoDashboardOnly></DashboardAccess>} />
              <Route path="/dashboard/properties" element={<DashboardAccess><PropertyListingsManager /></DashboardAccess>} />
              <Route path="/dashboard/approvals" element={<DashboardAccess><ListingApprovalPage /></DashboardAccess>} />
              <Route path="/dashboard/leads" element={<DashboardAccess><LeadsManagerPage /></DashboardAccess>} />
              <Route path="/dashboard/agents" element={<DashboardAccess><AgentManagementPage /></DashboardAccess>} />
              <Route path="/dashboard/activities" element={<DashboardAccess><DemoDashboardOnly><ActivityLogPage /></DemoDashboardOnly></DashboardAccess>} />

              {/* Redirects & 404 Fallback */}
              <Route path="/jual-sewa" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
