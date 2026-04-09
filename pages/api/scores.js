export default async function handler(req, res) {
  try {
    // Use the specific Masters 2026 event ID from ESPN
    const url = "https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard?event=401811941";
    
    const r = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)"
      }
    });

    if (!r.ok) throw new Error(`ESPN returned ${r.status}`);
    const data = await r.json();

    const players = [];
    let cutLine = null;

    const event = data.events?.[0];

    if (!event) {
      return res.status(200).json({ players: [], cutLine: null, error: "No event data found" });
    }

    const competitors = event.competitions?.[0]?.competitors || [];

    for (const c of competitors) {
      const name = c.athlete?.displayName || "";
      const status = c.status?.type?.name || "";
      let score = 0;

      if (status === "STATUS_CUT" || status === "STATUS_WITHDRAWN" || status === "STATUS_DQ") {
        score = 9999;
      } else {
        // Try multiple places ESPN might put the score
        const toPar = c.statistics?.find(s => s.name === "toPar")?.displayValue
          || c.statistics?.find(s => s.abbreviation === "TOT")?.displayValue
          || c.score?.displayValue
          || c.linescores?.reduce((acc, l) => acc + (parseInt(l.value) || 0), 0).toString()
          || "0";

        if (toPar === "E" || toPar === "0") score = 0;
        else if (toPar === "CUT" || toPar === "WD") score = 9999;
        else score = parseInt(toPar) || 0;
      }

      if (name) players.push({ name, score });
    }

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate");
    res.status(200).json({
      players,
      cutLine,
      round: event.status?.period || 1,
      eventName: event.name,
      total: players.length
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
