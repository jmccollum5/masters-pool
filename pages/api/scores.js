export default async function handler(req, res) {
  try {
    const url = "https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard?event=401811941";
    const r = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" }
    });
    if (!r.ok) throw new Error(`ESPN returned ${r.status}`);
    const data = await r.json();
    const c = data.events?.[0]?.competitions?.[0]?.competitors?.[0];
    res.status(200).json({ debug: c });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
