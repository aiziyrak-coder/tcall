import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Tcall",
  description: "The terms that govern your use of Tcall.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="Last updated: June 2026">
      <p>
        These Terms govern your use of Tcall. By creating an account or using the service, you agree to these Terms. If
        you do not agree, please do not use Tcall.
      </p>

      <LegalSection heading="1. Eligibility &amp; account">
        <p>You must be at least 13 years old (or the minimum age in your country). You are responsible for your account credentials and all activity under your account. Keep your password and PIN confidential.</p>
      </LegalSection>

      <LegalSection heading="2. Acceptable use">
        <p>You agree not to use Tcall to: break the law; harass, threaten, or harm others; send spam; infringe others&apos; rights; attempt to disrupt or reverse-engineer the service; or transmit malware. We may suspend or terminate accounts that violate these rules.</p>
      </LegalSection>

      <LegalSection heading="3. Translation accuracy">
        <p>Real-time translation is provided by automated AI and may contain errors. Tcall is not responsible for misunderstandings caused by translation inaccuracies. Do not rely on it for critical, legal, or medical decisions.</p>
      </LegalSection>

      <LegalSection heading="4. Subscriptions &amp; payments">
        <p>Premium plans are billed as described in the app. Payments are processed securely via Cryptomus (crypto and card). Subscription benefits apply for the stated period after payment confirmation.</p>
      </LegalSection>

      <LegalSection heading="5. Service availability">
        <p>Tcall is provided &quot;as is&quot; and &quot;as available&quot;. We do not guarantee uninterrupted or error-free service and may modify or discontinue features at any time.</p>
      </LegalSection>

      <LegalSection heading="6. Limitation of liability">
        <p>To the maximum extent permitted by law, Tcall and its operators are not liable for indirect, incidental, or consequential damages arising from your use of the service.</p>
      </LegalSection>

      <LegalSection heading="7. Termination">
        <p>You may delete your account at any time from <b>Settings → Account</b>. We may suspend or terminate access for violations of these Terms.</p>
      </LegalSection>

      <LegalSection heading="8. Changes to these Terms">
        <p>We may update these Terms. Continued use after changes constitutes acceptance of the updated Terms.</p>
      </LegalSection>

      <LegalSection heading="9. Contact">
        <p>Questions about these Terms? Email <a className="text-brand-600" href="mailto:support@tcall.uz">support@tcall.uz</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
