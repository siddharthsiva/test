// OpenFEMA Disaster Declarations Summary — free, keyless federal API.
// Verified live before writing this (real Contra Costa records: DR-4683-CA
// 2023 flood, EM-3591-CA 2023 flood, DR-4482-CA 2020 COVID). No "is there an
// active disaster right now" flag exists in the dataset itself — declarations
// don't reliably get a closeout date filled in — so this surfaces the most
// recent declarations with their real dates and lets the reader judge
// recency, rather than inventing an "active" verdict the data doesn't support.
const BASE_URL = "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries";

/**
 * @param {string} countyName e.g. "Contra Costa"
 * @returns {Promise<{ disasterNumber: number, title: string, incidentType: string, declarationDate: string, individualAssistance: boolean, publicAssistance: boolean }[]>}
 */
export async function fetchDisasterDeclarations(countyName) {
  const params = new URLSearchParams({
    "$filter": `state eq 'CA' and designatedArea eq '${countyName} (County)'`,
    "$orderby": "declarationDate desc",
    "$top": "5",
  });

  try {
    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) return [];

    const body = await res.json();

    return (body.DisasterDeclarationsSummaries ?? []).map((d) => ({
      disasterNumber: d.disasterNumber,
      title: d.declarationTitle,
      incidentType: d.incidentType,
      declarationDate: d.declarationDate,
      individualAssistance: d.ihProgramDeclared === true,
      publicAssistance: d.paProgramDeclared === true,
    }));
  } catch {
    return [];
  }
}
