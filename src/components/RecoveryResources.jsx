import { useEffect, useState } from "react";
import { LifeBuoy, Building2, Phone, FileText, HeartPulse, ShieldCheck, FileWarning } from "lucide-react";
import { fetchDisasterDeclarations } from "../lib/disasterDeclarations";

export function RecoveryResources() {
  const [declarations, setDeclarations] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchDisasterDeclarations("Contra Costa").then((d) => {
      setDeclarations(d);
      setLoaded(true);
    });
  }, []);

  const mostRecent = declarations[0];

  return (
    <div className="recovery-resources">
      <h2>
        <LifeBuoy size={17} strokeWidth={2.25} /> Recovery Resources
      </h2>
      <p className="family-plan-sub">Real information from federal and state sources.</p>

      <div className="recovery-grid">
        <a className="recovery-tile" href="https://www.disasterassistance.gov/" target="_blank" rel="noreferrer">
          <Building2 size={18} strokeWidth={2.25} />
          <span className="recovery-tile-title">FEMA</span>
          <span className="recovery-tile-sub">Disaster Assistance</span>
        </a>
        <a className="recovery-tile" href="https://www.211.org/get-help/disaster-recovery" target="_blank" rel="noreferrer">
          <Phone size={18} strokeWidth={2.25} />
          <span className="recovery-tile-title">211</span>
          <span className="recovery-tile-sub">Local Resources</span>
        </a>
        <a className="recovery-tile" href="https://www.irs.gov/taxtopics/tc515" target="_blank" rel="noreferrer">
          <FileText size={18} strokeWidth={2.25} />
          <span className="recovery-tile-title">IRS</span>
          <span className="recovery-tile-sub">Tax Relief</span>
        </a>
        <a
          className="recovery-tile"
          href="https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/wildfire.html"
          target="_blank"
          rel="noreferrer"
        >
          <HeartPulse size={18} strokeWidth={2.25} />
          <span className="recovery-tile-title">Red Cross</span>
          <span className="recovery-tile-sub">Emergency Support</span>
        </a>
        <a
          className="recovery-tile"
          href="https://www.caloes.ca.gov/office-of-the-director/policy-administration/individual-assistance/"
          target="_blank"
          rel="noreferrer"
        >
          <ShieldCheck size={18} strokeWidth={2.25} />
          <span className="recovery-tile-title">Cal OES</span>
          <span className="recovery-tile-sub">State Resources</span>
        </a>
        <a className="recovery-tile" href="https://www.fema.gov/disaster/declarations" target="_blank" rel="noreferrer">
          <FileWarning size={18} strokeWidth={2.25} />
          <span className="recovery-tile-title">Disaster Declarations</span>
          <span className="recovery-tile-sub">
            {!loaded ? "Checking…" : mostRecent ? `Most recent: ${new Date(mostRecent.declarationDate).getFullYear()}` : "None on record"}
          </span>
        </a>
      </div>
    </div>
  );
}
