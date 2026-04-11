# The Holmes Project

Philadelphia has thousands of vacant, blighted properties and entire neighborhoods without reliable internet access. Both crises are well-documented and the data exists, but it's scattered across city databases and impossible to act on without the right tools to make sense of it.

Holmes is a real-time civic intelligence platform built to close that gap. It has two core features.

The **Housing Intelligence** layer pulls live data from Philadelphia's open records, including property assessments, L&I code violations, and vacancy indicators, and scores every blighted property on a 0-100 risk scale. The interactive map lets you see exactly where the crisis is concentrated, drill into any property or neighborhood, and get an AI-generated analysis that explains what's driving risk and which interventions are most likely to work. Whether it's Act 135 conservatorship, the Philadelphia Land Bank, or a targeted LandCare program, Holmes grounds every recommendation in the city's actual programs and political context.

The **Connectivity Intelligence** layer, called Detective, maps broadband access gaps and free Wi-Fi availability across Philadelphia's census tracts. It scores each tract for digital access risk based on household internet adoption, device availability, and income pressure. The same AI engine that explains housing risk can break down connectivity risk too: who's underserved, what's driving it, and where a city team or provider should focus first.

Underneath both features is a responsible AI design. Every response Holmes generates is checked through an ethical guardrail before it reaches the user, so the system stays grounded, accountable, and transparent about what it knows and doesn't.

The goal is to put the same quality of civic intelligence that developers and consultants take for granted into the hands of the city agencies, nonprofits, and community organizations who actually need it.

---

## Tech Stack

Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Recharts, Leaflet, Cloudflare Workers AI, Neon Serverless Postgres, Pinecone RAG, OpenNext, Groq, Inhibitor API, OpenDataPhilly, ArcGIS, GitHub.

---

## Features

- Interactive map of Philadelphia's vacant properties and blight risk scores
- Code violation tracking and L&I data overlaid by neighborhood
- Broadband and Wi-Fi access gap visualization by census tract
- AI-generated property, neighborhood, and connectivity briefs grounded in live data
- Retrieval-augmented generation (RAG) for context-aware responses
- Ethical AI guardrails via the Inhibitor API
- Policy recommendations tied to Philadelphia's actual programs and context
- Data ingestion from OpenDataPhilly and ArcGIS

---

## Pages

| Route | Description |
|---|---|
| `/` | Home map with vacant parcels, blight scores, violations, and neighborhoods |
| `/map` | Dedicated housing map view |
| `/signal` | Broadband connectivity dashboard |
| `/signal/map` | Interactive connectivity map by census tract |
| `/insights` | Charts and trend analysis |
| `/policy` | Policy levers and recommended interventions |
| `/glass-box` | AI audit transparency and inhibitor event log |
| `/data` | Data management and ingestion |
| `/about` | About the project |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```
DATABASE_URL=
GROQ_API_KEY=
PINECONE_API_KEY=
INHIBITOR_API_KEY=
```

### Deploy to Cloudflare

```bash
npm run deploy
```

Requires a Cloudflare account with Workers AI enabled. Secrets should be added via the Cloudflare dashboard under Workers & Pages > Settings > Environment Variables.

---

## Data Sources

- [OpenDataPhilly](https://www.opendataphilly.org/) - property assessments, L&I violations, vacancy indicators
- [ArcGIS / US Census](https://www.arcgis.com/) - broadband adoption, device access, income data
- [Philadelphia Free Library / City Wi-Fi](https://www.phila.gov/) - public Wi-Fi site locations

---

Named after Thomas Holme, William Penn's surveyor who mapped Philadelphia in 1683.
