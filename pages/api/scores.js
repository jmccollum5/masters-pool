export default async function handler(req, res) {
  try {
    // Masters.com official score feed
    const url = "https://www.masters.com/en_US/scores/feeds/2026/scores.json";
    const r = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Referer": "https://www.masters.com/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      }
    });
    if (!r.ok) throw new Error(`Masters.com returned ${r.status}`);
    const data = await r.json();

    const players = [];
    let cutLine = null;

    const rows = data?.data?.player || data?.player || data?.leaderboard || [];

    for (const p of rows) {
      const name = `${p.first_name || p.firstName || ""} ${p.last_name || p.lastName || ""}`.trim();
      const topar = p.topar ?? p.toPar ?? p.total_to_par ?? p.today ?? 0;
      let score = 0;
      if (topar === "E" || topar === 0 || topar === "0") score = 0;
      else if (topar === "CUT" || topar === "WD") score = 9999;
      else score = parseInt(topar) || 0;
      if (name) players.push({ name, score });
    }

    if (data.cutline) cutLine = parseInt(data.cutline);

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      players,
      cutLine,
      round: data.currentRound || data.current_round || 1,
      rawKeys: Object.keys(data),
      rawFirst: rows[0] || null
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
