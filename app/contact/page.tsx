import type { Metadata } from "next";

import { StaticPage } from "@/components/landing/StaticPage";
import { SITE } from "@/constants/site";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <StaticPage title="Contact" description="Reach the Base Radar team.">
      <div>
        <h2>Email</h2>
        <p className="mt-2">
          For general questions, partnership inquiries, or to report an issue with a project
          listing, email{" "}
          <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>.
        </p>
      </div>
      <div>
        <h2>Community</h2>
        <p className="mt-2">
          For everything else — feature requests, bug reports, or just to chat — find us on{" "}
          <a href={SITE.social.discord} target="_blank" rel="noopener noreferrer">
            Discord
          </a>
          ,{" "}
          <a href={SITE.social.x} target="_blank" rel="noopener noreferrer">
            X
          </a>
          , or{" "}
          <a href={SITE.social.telegram} target="_blank" rel="noopener noreferrer">
            Telegram
          </a>
          .
        </p>
      </div>
      <div>
        <h2>Contribute</h2>
        <p className="mt-2">
          Base Radar is open source. Bug reports and pull requests are welcome on{" "}
          <a href={SITE.social.github} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
        </p>
      </div>
    </StaticPage>
  );
}
