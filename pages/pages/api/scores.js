export default async function handler(req, res) {
  try {
    const r = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard",
      { headers: { "Accept": "application/json" } }
    );
    if (!r.ok) throw new Error(`ESPN returned ${r.status}`);
    const data = await r.json();

    const players = [];
    let cutLine = null;

    const event = data.events?.find(e =>
      e.name?.toLowerCase().includes("master")
    ) || data.events?.[0];

    if (!event) {
      return res.status(200).json({ players: [], cutLine: null, error: "No Masters event found yet" });
    }

    const competitors = event.competitions?.[0]?.competitors || [];

    for (const c of competitors) {
      const name = c.athlete?.displayName || "";
      const status = c.status?.type?.name || "";
      let score = 0;

      if (status === "STATUS_CUT" || status === "STATUS_WITHDRAWN" || status === "STATUS_DQ") {
        score = 9999;
      } else {
        const raw = c.statistics?.find(s => s.name === "toPar")?.displayValue
          || c.linescores?.slice(-1)[0]?.displayValue
          || "0";
        if (raw === "E") score = 0;
        else if (raw === "CUT" || raw === "WD") score = 9999;
        else score = parseInt(raw) || 0;
      }

      players.push({ name, score });
    }

    // Try to pull cut line from event details
    const cutInfo = event.competitions?.[0]?.situation?.cutLine;
    if (cutInfo !== undefined) cutLine = parseInt(cutInfo);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    res.status(200).json({ players, cutLine, round: event.status?.period || 1 });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
