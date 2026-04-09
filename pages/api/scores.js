export default async function handler(req, res) {
  try {
    // Use ESPN's live golf leaderboard (no event ID needed — shows current tournament)
    const url = "https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard";
    const r = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      }
    });
    if (!r.ok) throw new Error(`ESPN returned ${r.status}`);
    const data = await r.json();

    const players = [];
    let cutLine = null;

    const event = data.events?.find(e =>
      e.name?.toLowerCase().includes("master")
    ) || data.events?.[0];

    if (!event) {
      return res.status(200).json({ players: [], cutLine: null, error: "No event found. Events: " + data.events?.map(e => e.name).join(", ") });
    }

    const competitors = event.competitions?.[0]?.competitors || [];

    for (const c of competitors) {
      const name = c.athlete?.displayName || "";
      const status = c.status?.type?.name || "";
      let score = 0;

      if (status === "STATUS_CUT" || status === "STATUS_WITHDRAWN" || status === "STATUS_DQ") {
        score = 9999;
      } else {
        // ESPN stores score to par in linescores or statistics
        const linescoreVal = c.linescores?.find(l => l.type === "total" || l.period?.number === 99)?.displayValue;
        const statVal = c.statistics?.find(s => s.name === "toPar" || s.abbreviation === "TOT")?.displayValue;
        const scoreVal = c.score?.displayValue;
        const raw = linescoreVal || statVal || scoreVal || "E";

        if (raw === "E" || raw === "0" || raw === "EVEN") score = 0;
        else if (raw === "CUT" || raw === "WD" || raw === "DQ") score = 9999;
        else score = parseInt(raw) || 0;
      }

      if (name) players.push({ name, score });
    }

    // Return raw first competitor for debugging alongside results
    const debugFirstCompetitor = competitors[0] ? {
      name: competitors[0].athlete?.displayName,
      status: competitors[0].status,
      score: competitors[0].score,
      statistics: competitors[0].statistics,
      linescores: competitors[0].linescores,
    } : null;

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ players, cutLine, round: event.status?.period || 1, eventName: event.name, debug: debugFirstCompetitor });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
