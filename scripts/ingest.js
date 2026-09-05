const WORKER_URL = "https://frank-digital-twin.frank-digital-twin.workers.dev/api/ingest";

const documents = [
  {
    id: "doc-4",
    title: "Schedule Integrity & Cost Control Methods",
    category: "project-controls",
    content: "Frank specializes in schedule integrity auditing, cost forecast modeling, variance analysis, and executive KPI reporting using AI-driven automation workflows."
  },
  {
    id: "doc-5",
    title: "Linux & Docker Container Workflows",
    category: "infrastructure",
    content: "Frank manages Linux server configurations, shell deployment scripts, SSH access controls, Docker container updates, and network troubleshooting for distributed node hosting."
  }
];

async function runIngestion() {
  for (const doc of documents) {
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      const data = await res.json();
      console.log(`[Ingested] ${doc.id}: ${doc.title}`, data);
    } catch (err) {
      console.error(`[Error] Ingesting ${doc.id}:`, err.message);
    }
  }
}

runIngestion();
