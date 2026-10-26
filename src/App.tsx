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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/katalog" element={<CatalogPage />} />
          <Route path="/detail/:slug" element={<DetailPage />} />

          {/* Authentication & Portal Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal-info" element={<PortalPreviewPage />} />

          {/* Internal Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardOverview />} />
          <Route path="/dashboard/properties" element={<PropertyListingsManager />} />
          <Route path="/dashboard/approvals" element={<ListingApprovalPage />} />
          <Route path="/dashboard/leads" element={<LeadsManagerPage />} />
          <Route path="/dashboard/agents" element={<AgentManagementPage />} />
          <Route path="/dashboard/activities" element={<ActivityLogPage />} />

          {/* Redirects & 404 Fallback */}
          <Route path="/jual-sewa" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
