import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
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

  return (
    <div className="recovery-resources">
      <h2>
        <LifeBuoy size={17} strokeWidth={2.25} /> Recovery Resources
      </h2>
      <p className="family-plan-sub">For after an incident — real official programs, not a synthesized "recovery score."</p>

      <div className="recovery-declarations">
        <h3>Federal disaster declarations for Contra Costa County</h3>
        {!loaded && <p className="recovery-muted">Checking OpenFEMA…</p>}
        {loaded && declarations.length === 0 && (
          <p className="recovery-muted">No federal disaster declarations on record for Contra Costa County.</p>
        )}
        {loaded && declarations.length > 0 && (
          <ul>
            {declarations.map((d) => (
              <li key={d.disasterNumber}>
                <strong>{d.title}</strong> ({d.incidentType}) —{" "}
                {new Date(d.declarationDate).toLocaleDateString()}
                <span className="recovery-muted">
                  {" "}
                  · Individual assistance: {d.individualAssistance ? "yes" : "no"} · Public assistance:{" "}
                  {d.publicAssistance ? "yes" : "no"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h3>Where to go for help</h3>
      <ul className="official-links">
        <li>
          <a href="https://www.disasterassistance.gov/" target="_blank" rel="noreferrer">
            DisasterAssistance.gov
          </a>{" "}
          — check FEMA Individual Assistance eligibility and apply
        </li>
        <li>
          <a href="https://www.211.org/get-help/disaster-recovery" target="_blank" rel="noreferrer">
            211 Contra Costa
          </a>{" "}
          — call 2-1-1 for local recovery referrals (housing, food, financial help)
        </li>
        <li>
          <a href="https://www.irs.gov/taxtopics/tc515" target="_blank" rel="noreferrer">
            IRS casualty loss deduction (Form 4684)
          </a>{" "}
          — claiming disaster losses not covered by insurance
        </li>
        <li>
          <a href="https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/wildfire.html" target="_blank" rel="noreferrer">
            American Red Cross wildfire recovery
          </a>
        </li>
        <li>
          <a href="https://www.caloes.ca.gov/office-of-the-director/policy-administration/individual-assistance/" target="_blank" rel="noreferrer">
            Cal OES individual disaster assistance
          </a>
        </li>
      </ul>
    </div>
  );
}
