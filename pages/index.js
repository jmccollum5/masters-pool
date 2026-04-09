
import { useState, useEffect, useCallback } from "react";

const TEAMS = {
  Georgie: ["Scottie Scheffler","Collin Morikawa","Russell Henley","Sam Stevens","Justin Thomas","Casey Jarvis","Michael Kim"],
  Kollas: ["Jon Rahm","Justin Rose","Tyrrell Hatton","Jason Day","Harris English","Max Homa","Max Greyserman"],
  Corey: ["Rory McIlroy","Viktor Hovland","Jordan Spieth","Patrick Cantlay","Maverick McNealy","Alex Noren","Kurt Kitayama"],
  Adrian: ["Ludvig Åberg","Robert MacIntyre","Akshay Bhatia","Gary Woodland","Sam Burns","Ryan Fox","Ryan Gerard"],
  Jmac: ["Xander Schauffele","Brooks Koepka","J.J. Spaun","Adam Scott","Ben Griffin","Wyndham Clark","Brian Harman"],
  Zmo: ["Bryson DeChambeau","Chris Gotterup","Jake Knapp","Shane Lowry","Marco Penge","Sergio Garcia","Nick Taylor"],
  Mt7mt: ["Matt Fitzpatrick","Hideki Matsuyama","Sepp Straka","Nicolai Højgaard","Cam Smith","Sungjae Im","Dustin Johnson"],
  Mark: ["Cameron Young","Min Woo Lee","Si Woo Kim","Corey Conners","Rasmus Højgaard","Carlos Ortiz","Rasmus Neergaard-Petersen"],
  Tomas: ["Tommy Fleetwood","Patrick Reed","Jacob Bridgeman","Harry Hall","Daniel Berger","Nico Echavarría","Aldrich Potgieter"],
};

const ALIASES = {
  "ludvig berg": "Ludvig Åberg", "ludvig aberg": "Ludvig Åberg",
  "cameron smith": "Cam Smith", "jj spaun": "J.J. Spaun", "j.j. spaun": "J.J. Spaun",
  "nicolai hojgaard": "Nicolai Højgaard", "rasmus hojgaard": "Rasmus Højgaard",
  "rasmus neergaard-petersen": "Rasmus Neergaard-Petersen",
  "rasmus neergaardpetersen": "Rasmus Neergaard-Petersen",
  "nico echavarria": "Nico Echavarría", "nicolas echavarria": "Nico Echavarría",
  "robert macintyre": "Robert MacIntyre", "bryson dechambeau": "Bryson DeChambeau",
  "marco penge": "Marco Penge",
};

const ALL_POOL = [...new Set(Object.values(TEAMS).flat())];

function norm(s) {
  return (s||"").toLowerCase()
    .replace(/[àáâãäå]/g,"a").replace(/[èéêë]/g,"e").replace(/[ìíîï]/g,"i")
    .replace(/[òóôõöø]/g,"o").replace(/[ùúûü]/g,"u").replace(/[ñ]/g,"n")
    .replace(/[^a-z0-9 ]/g,"").trim();
}

const POOL_NORM = {};
for (const p of ALL_POOL) POOL_NORM[norm(p)] = p;
for (const [k,v] of Object.entries(ALIASES)) POOL_NORM[norm(k)] = v;

function matchName(apiName) {
  const n = norm(apiName);
  if (POOL_NORM[n]) return POOL_NORM[n];
  const parts = n.split(" ");
  const last = parts.at(-1);
  for (const [k,v] of Object.entries(POOL_NORM)) {
    const kp = k.split(" ");
    if (kp.at(-1) === last && parts[0]?.[0] === kp[0]?.[0]) return v;
  }
  return null;
}

function fmt(n) {
  if (n === null || n === undefined) return "--";
  if (n === 9999) return "CUT";
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

function scoreColor(n) {
  if (n === null) return "#666";
  if (n === 9999) return "#777";
  if (n < 0) return "#f87171";
  if (n === 0) return "#e5e7eb";
  return "#86efac";
}

export default function Home() {
  const [scores, setScores] = useState({});
  const [cutLine, setCutLine] = useState(null);
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/scores");
      const data = await r.json();
      if (data.error && !data.players?.length) throw new Error(data.error);
      const matched = {};
      for (const p of (data.players || [])) {
        const canon = matchName(p.name);
        if (canon) matched[canon] = p.score;
      }
      setScores(matched);
      if (data.cutLine !== null && data.cutLine !== undefined) setCutLine(data.cutLine);
      if (data.round) setRound(data.round);
      setLastUpdated(new Date());
    } catch(e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchScores(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchScores, 60000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchScores]);

  function getTeamData(name) {
    const players = TEAMS[name]
      .map(p => ({ name: p, raw: scores[p] ?? null }))
      .sort((a, b) => {
        if (a.raw === null) return 1; if (b.raw === null) return -1;
        if (a.raw === 9999) return 1; if (b.raw === 9999) return -1;
        return a.raw - b.raw;
      });
    const top4 = players.slice(0,4).map(p => {
      let eff = p.raw ?? 0;
      if (eff === 9999) eff = cutLine ?? 0;
      else if (cutLine !== null && eff > cutLine) eff = cutLine;
      return { ...p, eff };
    });
    return { players, top4, total: top4.reduce((s,p) => s + p.eff, 0) };
  }

  const rankings = Object.keys(TEAMS)
    .map(t => ({ name: t, ...getTeamData(t) }))
    .sort((a,b) => a.total - b.total);

  const hasScores = Object.keys(scores).length > 0;

  return (
    <div style={{ fontFamily:"Georgia,serif", background:"#1a3a1a", minHeight:"100vh", paddingBottom:40 }}>
      <div style={{ background:"linear-gradient(135deg,#1a3a1a,#2d5a2d,#1a3a1a)", borderBottom:"3px solid #c8a951", padding:"20px 16px 16px", textAlign:"center" }}>
        <div style={{ fontSize:10, letterSpacing:4, color:"#c8a951", textTransform:"uppercase", marginBottom:4 }}>Augusta National · 2026</div>
        <div style={{ fontSize:28, fontWeight:"bold", color:"#fff" }}>⛳ Masters Pool Dashboard</div>
        <div style={{ fontSize:12, color:"#adc8a0", marginTop:4 }}>
          Top 4 scores count · Cut rule applies{round ? ` · Round ${round}` : ""}
        </div>
        <div style={{ marginTop:14, display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap", alignItems:"center" }}>
          <button onClick={fetchScores} disabled={loading}
            style={{ background:"#c8a951", color:"#1a1a1a", border:"none", borderRadius:6, padding:"9px 22px", fontWeight:"bold", fontSize:14, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
            {loading ? "⏳ Updating..." : "🔄 Refresh"}
          </button>
          <button onClick={() => setAutoRefresh(a => !a)}
            style={{ background:autoRefresh?"#1e4d1e":"#333", color:autoRefresh?"#86efac":"#aaa", border:`1px solid ${autoRefresh?"#86efac":"#555"}`, borderRadius:6, padding:"9px 14px", fontSize:12, cursor:"pointer" }}>
            {autoRefresh ? "🟢 Auto ON" : "⚫ Auto OFF"}
          </button>
          {cutLine !== null && (
            <div style={{ background:"rgba(200,169,81,0.15)", border:"1px solid #c8a951", borderRadius:6, padding:"9px 14px", color:"#c8a951", fontSize:13 }}>
              ✂️ Cut: <strong>{fmt(cutLine)}</strong>
            </div>
          )}
        </div>
        {lastUpdated && <div style={{ fontSize:10, color:"#7a9a7a", marginTop:8 }}>Updated {lastUpdated.toLocaleTimeString()} {autoRefresh ? "· refreshes every 60s" : ""}</div>}
        {error && <div style={{ color:"#fca5a5", fontSize:12, marginTop:8, maxWidth:400, margin:"8px auto 0" }}>⚠️ {error}</div>}
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"16px 10px 0" }}>
        {rankings.map((team, idx) => {
          const isOpen = expanded === team.name;
          const medal = ["🥇","🥈","🥉"][idx] ?? `${idx+1}.`;
          const tc = team.total < 0 ? "#f87171" : team.total === 0 ? "#fff" : "#86efac";
          return (
            <div key={team.name} style={{ background:idx===0?"linear-gradient(135deg,#2a1f00,#3a2f00)":"#0f2410", border:idx===0?"2px solid #c8a951":"1px solid #1e3d1e", borderRadius:10, marginBottom:8, overflow:"hidden" }}>
              <div onClick={() => setExpanded(isOpen ? null : team.name)}
                style={{ display:"flex", alignItems:"center", padding:"13px 16px", cursor:"pointer", gap:12 }}>
                <div style={{ fontSize:idx<3?22:15, minWidth:30, textAlign:"center" }}>{medal}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:"#fff", fontWeight:"bold", fontSize:17 }}>{team.name}</div>
                  <div style={{ color:"#5a8a5a", fontSize:11, marginTop:2 }}>{team.top4.map(p => p.name.split(" ").at(-1)).join(" · ")}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:26, fontWeight:"bold", color:hasScores?tc:"#444" }}>{hasScores?fmt(team.total):"--"}</div>
                  <div style={{ color:"#5a7a5a", fontSize:10 }}>team total</div>
                </div>
                <div style={{ color:"#c8a951", fontSize:12 }}>{isOpen?"▲":"▼"}</div>
              </div>
              {isOpen && (
                <div style={{ borderTop:"1px solid #1e3d1e", padding:"10px 16px" }}>
                  <div style={{ fontSize:10, color:"#c8a951", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Full Roster</div>
                  {team.players.map((p, i) => {
                    const inTop4 = i < 4;
                    const isCut = p.raw === 9999;
                    const isCapped = inTop4 && cutLine !== null && p.raw !== null && p.raw !== 9999 && p.raw > cutLine;
                    return (
                      <div key={p.name} style={{ display:"flex", alignItems:"center", padding:"5px 0", borderBottom:"1px solid #162716", opacity:inTop4?1:0.4 }}>
                        <div style={{ minWidth:24, fontSize:10, color:inTop4?"#c8a951":"#444" }}>{inTop4?`#${i+1}`:""}</div>
                        <div style={{ flex:1, color:inTop4?"#e5e7eb":"#666", fontSize:13 }}>{p.name}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          {isCapped && <span style={{ fontSize:9, color:"#f87171", border:"1px solid #f87171", borderRadius:3, padding:"1px 4px" }}>CAPPED</span>}
                          {isCut && <span style={{ fontSize:9, color:"#888", border:"1px solid #555", borderRadius:3, padding:"1px 4px" }}>CUT</span>}
                          <div style={{ minWidth:46, textAlign:"center", fontWeight:"bold", fontSize:14, color:scoreColor(p.raw) }}>{fmt(p.raw)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop:8, fontSize:11, color:"#7a9a7a", borderTop:"1px solid #1e3d1e", paddingTop:8 }}>
                    Counting: {team.top4.map(p => `${p.name.split(" ").at(-1)} (${fmt(p.eff)})`).join(" + ")} = <strong style={{ color:"#c8a951" }}>{fmt(team.total)}</strong>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
