import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../api';

interface Settings {
  whatsappApiVersion: string;
  whatsappPhoneNumberId: string;
  webhookPath: string;
  tokenExposedToFrontend: boolean;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<Settings>('/settings').then(setSettings);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;

    await apiFetch('/settings', {
      method: 'PUT',
      body: JSON.stringify({
        whatsappApiVersion: settings.whatsappApiVersion,
        whatsappPhoneNumberId: settings.whatsappPhoneNumberId
      })
    });
    setSaved(true);
  }

  if (!settings) {
    return <div className="empty">Carregando configurações...</div>;
  }

  return (
    <section className="page narrow">
      <header className="page-header">
        <div>
          <h1>Configurações da API</h1>
          <p>Dados operacionais visíveis. Tokens ficam apenas no backend.</p>
        </div>
      </header>

      <form className="settings-form" onSubmit={save}>
        <label>
          Versão da Graph API
          <input
            value={settings.whatsappApiVersion}
            onChange={(e) => setSettings({ ...settings, whatsappApiVersion: e.target.value })}
          />
        </label>
        <label>
          ID do número do WhatsApp
          <input
            value={settings.whatsappPhoneNumberId}
            onChange={(e) => setSettings({ ...settings, whatsappPhoneNumberId: e.target.value })}
          />
        </label>
        <label>
          Caminho do webhook
          <input value={settings.webhookPath} disabled />
        </label>
        <label className="check-row">
          <input type="checkbox" checked={!settings.tokenExposedToFrontend} readOnly />
          Token da Cloud API protegido no servidor
        </label>
        {saved && <div className="success">Configurações salvas.</div>}
        <button className="primary-button">Salvar</button>
      </form>
    </section>
  );
}

