// @ts-nocheck
import React from 'react';
import { LegalPageLayout, Section, DataTable } from '../layouts/LegalPageLayout';

/**
 * Cookie Statement for Opus Form.
 * Explains why no cookie consent banner is needed under UK PECR —
 * only essential auth tokens are used.
 */
export const CookieStatementPage: React.FC = () => (
  <LegalPageLayout title="Cookie Statement" lastUpdated="July 2026">
    <Section title="1. What Are Cookies?">
      <p>
        Cookies are small text files stored on your device by websites you visit. Similar technologies 
        include localStorage and sessionStorage, which serve comparable purposes but are managed 
        differently by your browser.
      </p>
    </Section>

    <Section title="2. What We Use">
      <p>
        Opus Form Ltd uses <strong style={{ color: '#d4d4d8' }}>essential authentication tokens only</strong>. We do not use 
        cookies for analytics, advertising, or tracking purposes.
      </p>
      <DataTable
        headers={['Technology', 'Purpose', 'Type', 'Duration']}
        rows={[
          ['Supabase Auth (localStorage)', 'Session authentication — keeps you logged in', 'Strictly necessary', 'Until logout or session expiry'],
          ['Sidebar preference (localStorage)', 'Remembers whether you collapsed the sidebar', 'Strictly necessary / functional', 'Persistent until cleared'],
        ]}
      />
    </Section>

    <Section title="3. Why We Don't Show a Cookie Banner">
      <p>
        Under the UK Privacy and Electronic Communications Regulations 2003 (PECR), consent is 
        <strong style={{ color: '#d4d4d8' }}> not required</strong> for cookies or storage that are{' '}
        <strong style={{ color: '#d4d4d8' }}>strictly necessary</strong> for the operation of a service 
        that the user has explicitly requested.
      </p>
      <p>
        Since we only use essential authentication tokens — without which the Service cannot function — 
        a cookie consent banner is not legally required. The ICO has confirmed this interpretation in its 
        guidance on PECR compliance.
      </p>
    </Section>

    <Section title="4. Third-Party Cookies">
      <p>
        We do not embed any third-party scripts that set cookies. Specifically:
      </p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>No Google Analytics, Plausible, or other analytics platforms</li>
        <li>No advertising networks or retargeting pixels</li>
        <li>No social media widgets or embedded content that tracks users</li>
        <li>No Hotjar, FullStory, or session recording tools</li>
      </ul>
      <p>
        If we introduce any non-essential cookies in the future, we will update this statement and 
        implement an appropriate consent mechanism before doing so.
      </p>
    </Section>

    <Section title="5. How to Manage Storage">
      <p>
        You can clear your browser's localStorage at any time through your browser settings. 
        Note that clearing authentication tokens will log you out of the Service.
      </p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li><strong style={{ color: '#d4d4d8' }}>Chrome:</strong> Settings → Privacy and Security → Clear browsing data → Cookies and other site data</li>
        <li><strong style={{ color: '#d4d4d8' }}>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data → Clear Data</li>
        <li><strong style={{ color: '#d4d4d8' }}>Edge:</strong> Settings → Privacy, search, and services → Clear browsing data</li>
        <li><strong style={{ color: '#d4d4d8' }}>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
      </ul>
    </Section>

    <Section title="6. Contact">
      <p>
        If you have questions about our use of cookies or storage technologies, contact us at{' '}
        <a href="mailto:admin@opusform.co.uk" className="underline" style={{ color: '#6C8295' }}>
          admin@opusform.co.uk
        </a>.
      </p>
    </Section>
  </LegalPageLayout>
);
