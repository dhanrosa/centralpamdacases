import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ChatPage } from './pages/ChatPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/conversas" replace />} />
        <Route path="conversas" element={<ConversationsPage />} />
        <Route path="conversas/:id" element={<ChatPage />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/conversas" replace />} />
    </Routes>
  );
}
