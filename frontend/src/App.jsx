import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import FlowBuilder from './pages/FlowBuilder';
import Sessions from './pages/Sessions';
import Login from './pages/Login';
import { AuthProvider, RequireAuth } from './auth';
import { ThemeProvider } from './theme';
import {
  AgentsPage,
  ExecutionsPage,
  ConversationsPage,
  MessagesPage,
  BroadcastPage,
  WebhooksPage,
  ApiPage,
  ProvidersPage,
  PluginsPage,
  FilesPage,
  AnalyticsPage,
  SettingsPage,
  EnvironmentPage,
  LogsPage
} from './pages/Modules';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/flows" element={<FlowBuilder />} />
                  <Route path="/sessions" element={<Sessions />} />
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/executions" element={<ExecutionsPage />} />
                  <Route path="/conversations" element={<ConversationsPage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/broadcast" element={<BroadcastPage />} />
                  <Route path="/webhooks" element={<WebhooksPage />} />
                  <Route path="/api" element={<ApiPage />} />
                  <Route path="/ai-providers" element={<ProvidersPage />} />
                  <Route path="/plugins" element={<PluginsPage />} />
                  <Route path="/files" element={<FilesPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/env" element={<EnvironmentPage />} />
                  <Route path="/logs" element={<LogsPage />} />
                  <Route path="*" element={<Dashboard />} />
                </Routes>
              </Layout>
            </RequireAuth>
          } />
        </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
