import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════
//  Korean NLP: Normalization + Stemming + Strength Modifiers
// ═══════════════════════════════════════════════════════════
function normalizeKorean(text) {
  return (text || "")
    .replace(/[.,!?;:"'`~\[\]\(\)\{\}<>\/\|\\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ENDINGS = [
  "했습니다","했습니까","했어요","했어","했다","하였다",
  "하세요","하셨다","하네요","하네","하자","한다","한다고","한다면",
  "합니다","합니까","합니다만","해요","해","함","했던","했을","하게",
  "스럽다","스러웠다","스러워요","스러웠어요","스럽고","스럽지만",
  "됐다","되었다","됐어","되었어","됩니다","되다",
  "었다","았다","였다","었어","았어","였어","었어요","았어요","였어요",
  "ㄴ다","는다","다","어","아","여","고","며","지만","는데","ㄴ데",
  "을","를","이","가","은","는","에","에서","으로","로","와","과",
  "도","만","까지","부터","처럼","같이","보다",
];

function stemKorean(w) {
  let s = w;
  for (const e of ENDINGS) {
    if (s.length > e.length + 1 && s.endsWith(e)) return s.slice(0, -e.length);
  }
  return s;
}

const STRENGTH = {
  strong: ["매우","아주","정말","너무","완전","굉장히","대단히","진짜","참으로","엄청","무척","몹시","극도로","상당히"],
  weak: ["조금","약간","살짝","다소","그럭저럭","조금은","살짝은","좀"],
};

// ═══════════════════════════════════════════════════════════
//  Russell Circumplex 28+1 Emotions (heavily expanded keywords)
// ═══════════════════════════════════════════════════════════
const EMOTIONS_28 = [
  { name:"excited", label:"신남", kw:["신나다","신나","들뜨다","들뜨","흥분하다","흥분","짜릿하다","짜릿","신났","신남"], val:9, aro:9, q:"HA" },
  { name:"elated", label:"희열", kw:["희열","황홀","들뜸","들떴다","들떴","환호"], val:9, aro:8, q:"HA" },
  { name:"enthusiastic", label:"열정", kw:["열정적","열정","의욕적","의욕","열의"], val:8, aro:8, q:"HA" },
  { name:"happy", label:"행복", kw:["행복하다","행복","기쁘다","기쁨","기뻤","기쁘","기뻐","행복했","행복해"], val:9, aro:7, q:"HA" },
  { name:"joyful", label:"즐거움", kw:["즐겁다","즐겁","즐거","즐거움","유쾌하다","유쾌","즐거웠","재밌","재미있","재미"], val:8, aro:7, q:"HA" },
  { name:"proud", label:"뿌듯", kw:["뿌듯하다","뿌듯","뿌듯했","자랑스럽다","자랑스럽","자랑스러","성취감","보람"], val:8, aro:6, q:"HA" },
  { name:"grateful", label:"감사", kw:["감사하다","감사","감사했","고맙다","고맙","고마워","고마웠","감동"], val:8, aro:5, q:"HA" },
  { name:"content", label:"만족", kw:["만족하다","만족","만족했","만족스럽","흐뭇하다","흐뭇","흐뭇했"], val:8, aro:3, q:"LA" },
  { name:"relaxed", label:"편안", kw:["편안하다","편안","편안했","편해","이완","느긋하다","느긋","여유"], val:8, aro:3, q:"LA" },
  { name:"calm", label:"차분", kw:["차분하다","차분","차분했","고요하다","고요","평온하다","평온","평온했","잔잔"], val:8, aro:2, q:"LA" },
  { name:"serene", label:"온화", kw:["안온하다","안온","온화하다","온화","포근","따뜻","따뜻했","훈훈"], val:7, aro:2, q:"LA" },
  { name:"secure", label:"안정", kw:["안정되다","안정감","안정","안도","안심","든든","든든했"], val:7, aro:3, q:"LA" },
  { name:"angry", label:"분노", kw:["화나다","화나","화났","화가","분노하다","분노","격분","성나","빡치","빡쳤","짜증폭발"], val:2, aro:9, q:"HV" },
  { name:"annoyed", label:"짜증", kw:["짜증","짜증나","짜증났","거슬리다","거슬리","거슬","귀찮","성가시","성가"], val:3, aro:7, q:"HV" },
  { name:"tense", label:"긴장", kw:["긴장","긴장되","긴장됐","긴장했","팽팽하다","팽팽","떨리","떨렸"], val:3, aro:8, q:"HV" },
  { name:"stressed", label:"스트레스", kw:["스트레스","압박감","압박","과부하","부담","부담됐","버거","버거웠"], val:2, aro:8, q:"HV" },
  { name:"afraid", label:"두려움", kw:["두렵다","두렵","두려","두려웠","겁나다","겁나","겁났","공포","무서","무서웠","무섭"], val:2, aro:9, q:"HV" },
  { name:"anxious", label:"불안", kw:["불안","불안하","불안했","초조","초조하","초조했","걱정","걱정됐","걱정되","걱정했"], val:3, aro:8, q:"HV" },
  { name:"guilty", label:"죄책감", kw:["죄책감","미안하다","미안","미안했","미안해","가책","후회","후회했","후회됐"], val:3, aro:6, q:"HV" },
  { name:"sad", label:"슬픔", kw:["슬프다","슬프","슬퍼","슬펐","슬픔","눈물","울었","울컥","서러","서러웠"], val:2, aro:2, q:"LV" },
  { name:"depressed", label:"우울", kw:["우울","우울하","우울했","침울","침잠","울적","울적했","암울"], val:2, aro:2, q:"LV" },
  { name:"tired", label:"피곤", kw:["피곤","피곤하","피곤했","지치다","지치","지쳤","탈진","녹초","기진맥진","힘들","힘들었"], val:3, aro:2, q:"LV" },
  { name:"bored", label:"지루함", kw:["지루하다","지루","지루했","심심하다","심심","심심했","권태","권태롭","따분"], val:3, aro:1, q:"LV" },
  { name:"lonely", label:"외로움", kw:["외롭다","외롭","외로","외로웠","고독","쓸쓸하다","쓸쓸","쓸쓸했","혼자"], val:3, aro:2, q:"LV" },
  { name:"disappointed", label:"실망", kw:["실망","실망했","실망하","허탈","허탈했","허무","허무했","속상","속상했","서운","서운했"], val:3, aro:3, q:"LV" },
  { name:"surprised+", label:"놀람(+)", kw:["놀라","놀랐","뜻밖","대박","헐"], val:6, aro:8, q:"HA" },
  { name:"surprised-", label:"경악", kw:["경악","경악했","충격","충격받","충격이","당황","당황했","당황스러"], val:4, aro:8, q:"HV" },
  { name:"interested", label:"흥미", kw:["관심","흥미","흥미롭","흥미로","궁금","궁금했","호기심"], val:6, aro:6, q:"HA" },
  { name:"hopeful", label:"희망", kw:["희망","희망적","기대","기대되","기대됐","기대했","설레","설렜","설렘"], val:7, aro:5, q:"HA" },
];

// ═══════════════════════════════════════════════════════════
//  Extended Positive / Negative Lexicon
// ═══════════════════════════════════════════════════════════
const POS_EXTRA = [
  "좋았","좋아","좋은","괜찮았","괜찮아","사랑","사랑스러","웃음","웃었","미소",
  "성취","용기","활기","상쾌","자유","긍정","응원","격려","존중","가치",
  "소중","도움","친절","이해","자신감","영감","평화","추억","잘했","해냈",
  "나아졌","회복","성공","보람찼","의미","훈훈","따뜻","포근","행운","축하",
  "칭찬","인정","배움","성장","발전","개선","해결","극복","달성","완수",
  "감격","환희","축복","기특","대견","사랑해","고마워","최고","멋지","아름다",
  "빛나","화이팅","파이팅","응원해","잘될","잘된","잘되","좋겠","다행","다행이",
];
const NEG_EXTRA = [
  "불쾌","좌절","억울","비참","무기력","공허","절망","답답","막막",
  "아팠","아프","아파","자책","모욕","상처","포기","무시","나빴","나쁜",
  "싫었","싫어","싫은","별로","최악","끔찍","지겨","지겨웠","괴롭",
  "괴로웠","고통","고통스러","혼란","혼란스러","창피","부끄러","부끄러웠","수치",
  "한심","한심했","비참했","처참","절박","위기","위험","불행","불행했",
  "못했","안됐","안되","실패","실패했","잘못","잘못했","틀렸","틀린",
  "아쉬","아쉬웠","아쉬운","그리","그리웠","그리운","허전","허전했",
];

// ═══════════════════════════════════════════════════════════
//  Analysis Engine
// ═══════════════════════════════════════════════════════════
function analyzeEntry(text) {
  const norm = normalizeKorean(text);
  const tokens = norm.split(" ").filter(Boolean);

  // 1) Russell 28 keyword match with stemming
  const hits = [];
  const seen = new Set();

  for (const tok of tokens) {
    const st = stemKorean(tok);
    for (const emo of EMOTIONS_28) {
      if (seen.has(emo.name)) continue;
      for (const kw of emo.kw) {
        const kwStem = stemKorean(kw);
        // multi-strategy matching: stem contains, original contains
        if (
          (st.length >= 2 && kwStem.length >= 2 && (st.includes(kwStem) || kwStem.includes(st))) ||
          tok.includes(kw) || kw.includes(tok)
        ) {
          seen.add(emo.name);
          hits.push({
            name: emo.name, label: emo.label, q: emo.q,
            val9: emo.val, aro9: emo.aro,
            valStd: ((emo.val - 1) / 8) * 2 - 1,
            aroStd: ((emo.aro - 1) / 8) * 2 - 1,
            token: tok,
          });
          break;
        }
      }
    }
  }

  // 2) Extended lexicon match with strength modifiers
  let posScore = 0, negScore = 0;
  const matchedPos = [], matchedNeg = [];
  let weight = 1.0;

  for (const tok of tokens) {
    const st = stemKorean(tok);
    if (STRENGTH.strong.some(m => st === m || tok === m)) { weight = 2.0; continue; }
    if (STRENGTH.weak.some(m => st === m || tok === m)) { weight = 0.5; continue; }

    let found = false;
    for (const pw of POS_EXTRA) {
      const pStem = stemKorean(pw);
      if ((st.length >= 2 && pStem.length >= 2 && (st.includes(pStem) || pStem.includes(st))) || tok.includes(pw)) {
        posScore += weight;
        matchedPos.push({ word: pw, weight });
        found = true;
        break;
      }
    }
    if (!found) {
      for (const nw of NEG_EXTRA) {
        const nStem = stemKorean(nw);
        if ((st.length >= 2 && nStem.length >= 2 && (st.includes(nStem) || nStem.includes(st))) || tok.includes(nw)) {
          negScore += weight;
          matchedNeg.push({ word: nw, weight });
          found = true;
          break;
        }
      }
    }
    if (found) weight = 1.0;
    else if (weight !== 1.0) weight = 1.0;
  }

  // 3) Russell hits also contribute to pos/neg
  for (const h of hits) {
    if (h.val9 > 5) posScore += 1;
    else if (h.val9 < 5) negScore += 1;
  }

  const total = posScore + negScore;
  const avgVal = hits.length ? hits.reduce((s, h) => s + h.val9, 0) / hits.length : 5;
  const avgAro = hits.length ? hits.reduce((s, h) => s + h.aro9, 0) / hits.length : 5;

  return {
    hits, matchedPos, matchedNeg,
    posScore, negScore,
    posPct: total > 0 ? (posScore / total) * 100 : 0,
    negPct: total > 0 ? (negScore / total) * 100 : 0,
    valence9: avgVal, arousal9: avgAro,
    valStd: ((avgVal - 1) / 8) * 2 - 1,
    aroStd: ((avgAro - 1) / 8) * 2 - 1,
  };
}

// ═══════════════════════════════════════════════════════════
//  Quadrant Colors
// ═══════════════════════════════════════════════════════════
const Q_COLORS = { HA: "#FF6B35", HV: "#E63946", LV: "#577590", LA: "#66BB6A" };

function getEmotionColor(emo) {
  return Q_COLORS[emo.q] || "#888";
}

// ═══════════════════════════════════════════════════════════
//  Circumplex Canvas
// ═══════════════════════════════════════════════════════════
function CircumplexChart({ entries, hoveredIdx, onHover }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [size, setSize] = useState(480);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize(Math.min(e.contentRect.width, 540)));
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const M = 52, r = (size - M * 2) / 2, cx = size / 2, cy = size / 2;
  const toC = useCallback((vs, as) => [cx + vs * r, cy - as * r], [cx, cy, r]);

  const allPoints = useMemo(() => {
    const pts = [];
    entries.forEach((entry, ei) => {
      entry.analysis.hits.forEach((hit) => {
        const [px, py] = [cx + hit.valStd * r, cy - hit.aroStd * r];
        pts.push({ px, py, ei, hit, date: entry.date });
      });
    });
    return pts;
  }, [entries, size, cx, cy, r]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    // Quadrant fills
    const qData = [
      { sx: cx, sy: cy - r, w: r, h: r, c: "rgba(255,107,53,0.05)" },
      { sx: cx - r, sy: cy - r, w: r, h: r, c: "rgba(231,57,70,0.05)" },
      { sx: cx - r, sy: cy, w: r, h: r, c: "rgba(87,117,144,0.05)" },
      { sx: cx, sy: cy, w: r, h: r, c: "rgba(102,187,106,0.05)" },
    ];
    qData.forEach(q => { ctx.fillStyle = q.c; ctx.fillRect(q.sx, q.sy, q.w, q.h); });

    // Circles
    [0.25, 0.5, 0.75, 1.0].forEach(s => {
      ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120,120,150,${s === 1 ? 0.2 : 0.1})`; ctx.lineWidth = 1; ctx.stroke();
    });

    // Axes
    ctx.strokeStyle = "rgba(120,120,150,0.25)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

    // Quadrant labels
    ctx.font = "600 10px 'Pretendard', system-ui, sans-serif";
    ctx.fillStyle = "rgba(140,140,170,0.45)";
    ctx.textAlign = "center";
    ctx.fillText("활기·흥분", cx + r * 0.55, cy - r * 0.9);
    ctx.fillText("분노·불안", cx - r * 0.55, cy - r * 0.9);
    ctx.fillText("슬픔·피로", cx - r * 0.55, cy + r * 0.95);
    ctx.fillText("평온·만족", cx + r * 0.55, cy + r * 0.95);

    // Axis labels
    ctx.fillStyle = "rgba(160,160,190,0.6)";
    ctx.font = "600 11px 'Pretendard', system-ui, sans-serif";
    ctx.fillText("긍정 →", cx + r - 28, cy + 18);
    ctx.fillText("← 부정", cx - r + 28, cy + 18);
    ctx.save(); ctx.translate(cx - 18, cy - r + 28); ctx.rotate(-Math.PI / 2);
    ctx.fillText("고각성 ↑", 0, 0); ctx.restore();
    ctx.save(); ctx.translate(cx - 18, cy + r - 28); ctx.rotate(-Math.PI / 2);
    ctx.fillText("↓ 저각성", 0, 0); ctx.restore();

    // Russell anchors (faded)
    ctx.globalAlpha = 0.22;
    for (const emo of EMOTIONS_28) {
      const vs = ((emo.val - 1) / 8) * 2 - 1;
      const as = ((emo.aro - 1) / 8) * 2 - 1;
      const [ax, ay] = [cx + vs * r, cy - as * r];
      ctx.beginPath(); ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = Q_COLORS[emo.q]; ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Entry dots
    entries.forEach((entry, ei) => {
      const isHov = hoveredIdx === ei;
      const dim = hoveredIdx !== null && !isHov;

      entry.analysis.hits.forEach(hit => {
        const [px, py] = [cx + hit.valStd * r, cy - hit.aroStd * r];
        const col = getEmotionColor(hit);
        const dotR = isHov ? 9 : 6;

        if (isHov) {
          const glow = ctx.createRadialGradient(px, py, 0, px, py, dotR * 3.5);
          glow.addColorStop(0, col + "55"); glow.addColorStop(1, col + "00");
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(px, py, dotR * 3.5, 0, Math.PI * 2); ctx.fill();
        }

        ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fillStyle = col + (dim ? "35" : "cc"); ctx.fill();
        ctx.strokeStyle = col + (dim ? "20" : "ee"); ctx.lineWidth = 1.5; ctx.stroke();

        if (!dim) {
          ctx.fillStyle = `rgba(220,220,240,${dim ? 0.3 : 0.9})`;
          ctx.font = `${isHov ? 600 : 500} ${isHov ? 12 : 9}px 'Pretendard', system-ui`;
          ctx.textAlign = "center";
          ctx.fillText(hit.label, px, py - dotR - 5);
        }
      });

      // Average marker
      if (entry.analysis.hits.length > 0) {
        const [ax, ay] = [cx + entry.analysis.valStd * r, cy - entry.analysis.aroStd * r];
        ctx.beginPath(); ctx.arc(ax, ay, isHov ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = dim ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.85)";
        ctx.fill();
        ctx.strokeStyle = dim ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1; ctx.stroke();
      }
    });

    // Trajectory
    if (entries.length > 1) {
      const pts = entries.filter(e => e.analysis.hits.length > 0).map(e => [cx + e.analysis.valStd * r, cy - e.analysis.aroStd * r]);
      if (pts.length > 1) {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.strokeStyle = "rgba(255,255,255,0.13)"; ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }, [entries, size, hoveredIdx, cx, cy, r]);

  const handleMouse = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    let found = null;
    for (const p of allPoints) {
      if (Math.hypot(mx - p.px, my - p.py) < 16) { found = p; break; }
    }
    setTooltip(found ? { x: e.clientX - rect.left, y: e.clientY - rect.top, ...found } : null);
    onHover(found ? found.ei : null);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <canvas ref={canvasRef}
        style={{ width: size, height: size, maxWidth: "100%", cursor: tooltip ? "pointer" : "crosshair" }}
        onMouseMove={handleMouse} onMouseLeave={() => { setTooltip(null); onHover(null); }}
      />
      {tooltip && (
        <div style={{
          position: "absolute", left: Math.min(tooltip.x + 14, size - 180), top: Math.max(tooltip.y - 50, 4),
          background: "rgba(16,16,30,0.96)", border: `1px solid ${getEmotionColor(tooltip.hit)}55`,
          borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#e0e0f0",
          pointerEvents: "none", backdropFilter: "blur(12px)", zIndex: 10, whiteSpace: "nowrap",
          boxShadow: `0 4px 20px ${getEmotionColor(tooltip.hit)}22`,
        }}>
          <div style={{ fontWeight: 700, color: getEmotionColor(tooltip.hit), fontSize: 14 }}>{tooltip.hit.label}</div>
          <div style={{ opacity: 0.6, marginTop: 3 }}>{tooltip.date} · "{tooltip.hit.token}"</div>
          <div style={{ opacity: 0.5, marginTop: 2, fontSize: 11 }}>V:{tooltip.hit.val9} A:{tooltip.hit.aro9}</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Trend Line Chart
// ═══════════════════════════════════════════════════════════
function TrendChart({ entries }) {
  const canvasRef = useRef(null);
  const W = 540, H = 150;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || entries.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);

    const pad = { l: 40, r: 16, t: 16, b: 30 };
    const w = W - pad.l - pad.r, h = H - pad.t - pad.b;
    const n = entries.length;
    const xOf = i => pad.l + (i / (n - 1)) * w;
    const yOf = v => pad.t + h - (v / 100) * h;

    for (let y = 0; y <= 100; y += 25) {
      const py = yOf(y);
      ctx.strokeStyle = "rgba(120,120,150,0.08)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(pad.l + w, py); ctx.stroke();
      ctx.fillStyle = "rgba(150,150,180,0.4)"; ctx.font = "9px 'Pretendard', system-ui";
      ctx.textAlign = "right"; ctx.fillText(y + "%", pad.l - 6, py + 3);
    }

    const drawFill = (vals, fill) => {
      ctx.beginPath(); ctx.moveTo(xOf(0), yOf(vals[0]));
      vals.forEach((v, i) => ctx.lineTo(xOf(i), yOf(v)));
      ctx.lineTo(xOf(n - 1), yOf(0)); ctx.lineTo(xOf(0), yOf(0));
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    };
    const drawLine = (vals, color) => {
      ctx.beginPath();
      vals.forEach((v, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(v)) : ctx.lineTo(xOf(i), yOf(v)); });
      ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.stroke();
      vals.forEach((v, i) => {
        ctx.beginPath(); ctx.arc(xOf(i), yOf(v), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = "#0b0b12"; ctx.lineWidth = 1.5; ctx.stroke();
      });
    };

    const pos = entries.map(e => e.analysis.posPct);
    const neg = entries.map(e => e.analysis.negPct);
    drawFill(pos, "rgba(102,187,106,0.1)");
    drawFill(neg, "rgba(231,57,70,0.1)");
    drawLine(pos, "#66BB6A");
    drawLine(neg, "#E63946");

    ctx.fillStyle = "rgba(160,160,190,0.55)"; ctx.font = "9px 'Pretendard', system-ui"; ctx.textAlign = "center";
    entries.forEach((e, i) => ctx.fillText(e.date, xOf(i), H - 8));
  }, [entries]);

  if (entries.length < 2) return null;
  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(160,160,190,0.55)", marginBottom: 6, display: "flex", gap: 16 }}>
        <span><span style={{ color: "#66BB6A" }}>●</span> 긍정</span>
        <span><span style={{ color: "#E63946" }}>●</span> 부정</span>
      </div>
      <canvas ref={canvasRef} style={{ width: W, height: H, maxWidth: "100%" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Storage
// ═══════════════════════════════════════════════════════════
const STORE_KEY = "emotion-diary-v3";

async function loadEntries() {
  try { const r = await window.storage.get(STORE_KEY); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
async function saveEntries(data) {
  try { await window.storage.set(STORE_KEY, JSON.stringify(data)); } catch (e) { console.error(e); }
}

// ═══════════════════════════════════════════════════════════
//  Main App
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(() => { const d = new Date(); return `${d.getMonth() + 1}.${d.getDate()}`; });
  const [text, setText] = useState("");
  const [tab, setTab] = useState("input");
  const [hovIdx, setHovIdx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => { loadEntries().then(d => { setEntries(d); setLoading(false); }); }, []);

  const addEntry = useCallback(() => {
    if (!text.trim()) return;
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const newEntries = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const hasDatePrefix = parts.length > 1 && /^\d+\.?\d*$/.test(parts[0]);
      const d = hasDatePrefix ? parts[0] : date.trim();
      const t = hasDatePrefix ? parts.slice(1).join(" ") : line.trim();
      const analysis = analyzeEntry(t);
      newEntries.push({ date: d, text: t, analysis, ts: Date.now() + Math.random() });
    }
    if (!newEntries.length) return;
    const updated = [...entries, ...newEntries];
    setEntries(updated);
    saveEntries(updated);
    setLastResult(newEntries[newEntries.length - 1]);
    setText("");
    if (updated.length >= 2 && tab === "input") setTab("circumplex");
  }, [text, date, entries, tab]);

  const deleteEntry = useCallback((ts) => {
    const u = entries.filter(e => e.ts !== ts); setEntries(u); saveEntries(u);
  }, [entries]);

  const resetAll = useCallback(() => {
    if (!confirm("모든 기록을 삭제할까요?")) return;
    setEntries([]); saveEntries([]); setTab("input"); setLastResult(null);
  }, []);

  const stats = useMemo(() => {
    if (!entries.length) return null;
    const allHits = entries.flatMap(e => e.analysis.hits);
    const freq = {};
    allHits.forEach(h => { freq[h.label] = freq[h.label] || { count: 0, q: h.q }; freq[h.label].count++; });
    const sorted = Object.entries(freq).sort((a, b) => b[1].count - a[1].count);
    const avgPos = entries.reduce((s, e) => s + e.analysis.posPct, 0) / entries.length;
    const avgNeg = entries.reduce((s, e) => s + e.analysis.negPct, 0) / entries.length;
    return { sorted, avgPos, avgNeg, total: entries.length };
  }, [entries]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0b0b12", color: "#666", fontFamily: "'Pretendard', system-ui" }}>
      불러오는 중...
    </div>
  );

  const S = {
    tab: (active) => ({
      padding: "8px 18px", fontSize: 13, fontWeight: active ? 700 : 400,
      color: active ? "#fff" : "rgba(160,160,190,0.55)",
      background: active ? "rgba(255,255,255,0.08)" : "transparent",
      border: "none", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
    }),
    input: {
      width: "100%", padding: "10px 14px", fontSize: 14,
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, color: "#e0e0f0", outline: "none", boxSizing: "border-box",
    },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b12", color: "#e0e0f0", fontFamily: "'Pretendard', -apple-system, system-ui, sans-serif", padding: "0 0 48px" }}>
      <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "28px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, background: "radial-gradient(circle, rgba(120,80,255,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 180, height: 180, background: "radial-gradient(circle, rgba(102,187,106,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px", background: "linear-gradient(135deg, #B794F6, #68D391)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          감정 다이어리
        </h1>
        <p style={{ fontSize: 12, color: "rgba(160,160,190,0.45)", margin: "4px 0 0" }}>
          러셀의 원형 그래프 28개 + 130개의 감정을 분석하여 매일의 나의 감정을 분석합니다.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,0.03)", overflowX: "auto" }}>
        {[["input", "✏️ 감정 일기 쓰기"], ["circumplex", "🎯 감정 원형 그래프"], ["trend", "📈 감정 변화"], ["detail", "🔍 감정일기장"]].map(([k, l]) => (
          <button key={k} style={S.tab(tab === k)} onClick={() => setTab(k)}>{l}</button>
        ))}
        {entries.length > 0 && (
          <button onClick={resetAll} style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 11, color: "rgba(231,57,70,0.55)", background: "transparent", border: "1px solid rgba(231,57,70,0.12)", borderRadius: 6, cursor: "pointer", flexShrink: 0 }}>
            초기화
          </button>
        )}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 580, margin: "0 auto" }}>

        {/* ─── INPUT ──────────────────────────────── */}
        {tab === "input" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input value={date} onChange={e => setDate(e.target.value)} placeholder="날짜"
                style={{ ...S.input, width: 76, fontWeight: 700, textAlign: "center" }} />
              <textarea value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addEntry(); }}
                placeholder={"일기를 입력하세요...\n여러 줄 입력 가능 (날짜 내용 형식)\n예) 4.1 오늘 정말 행복했다\n예) 너무 피곤했지만 아주 뿌듯했다"}
                rows={4} style={{ ...S.input, flex: 1, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <button onClick={addEntry} disabled={!text.trim()}
              style={{
                width: "100%", padding: "13px", fontSize: 15, fontWeight: 700,
                background: text.trim() ? "linear-gradient(135deg, #7C4DFF, #448AFF)" : "rgba(255,255,255,0.04)",
                color: text.trim() ? "#fff" : "rgba(255,255,255,0.18)",
                border: "none", borderRadius: 10, cursor: text.trim() ? "pointer" : "default", transition: "all 0.2s",
              }}>
              분석 & 저장 {text.trim() ? "⌘↵" : ""}
            </button>

            {/* Last analysis preview */}
            {lastResult && (lastResult.analysis.hits.length > 0 || lastResult.analysis.matchedPos.length > 0 || lastResult.analysis.matchedNeg.length > 0) && (
              <div style={{ marginTop: 16, padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 11, color: "rgba(160,160,190,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>최근 분석</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {lastResult.analysis.hits.map((h, i) => (
                    <span key={i} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: getEmotionColor(h) + "20", color: getEmotionColor(h), fontWeight: 600 }}>{h.label}</span>
                  ))}
                </div>
                {(lastResult.analysis.matchedPos.length > 0 || lastResult.analysis.matchedNeg.length > 0) && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "rgba(160,160,190,0.45)", lineHeight: 1.6 }}>
                    {lastResult.analysis.matchedPos.length > 0 && <div style={{ color: "#66BB6A" }}>보조 긍정: {lastResult.analysis.matchedPos.map(m => `${m.word}${m.weight !== 1 ? `(${m.weight}x)` : ""}`).join(", ")}</div>}
                    {lastResult.analysis.matchedNeg.length > 0 && <div style={{ color: "#E63946" }}>보조 부정: {lastResult.analysis.matchedNeg.map(m => `${m.word}${m.weight !== 1 ? `(${m.weight}x)` : ""}`).join(", ")}</div>}
                  </div>
                )}
                <div style={{ marginTop: 6, fontSize: 11, color: "rgba(160,160,190,0.35)" }}>
                  긍정 {lastResult.analysis.posPct.toFixed(0)}% · 부정 {lastResult.analysis.negPct.toFixed(0)}% · V:{lastResult.analysis.valence9.toFixed(1)} A:{lastResult.analysis.arousal9.toFixed(1)}
                </div>
              </div>
            )}

            {/* Entry list */}
            {entries.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(160,160,190,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                  기록 ({entries.length}개)
                </div>
                {[...entries].reverse().map(entry => {
                  const a = entry.analysis;
                  const hasDetection = a.hits.length > 0 || a.matchedPos.length > 0 || a.matchedNeg.length > 0;
                  return (
                    <div key={entry.ts} style={{
                      padding: "12px 14px", marginBottom: 6,
                      background: "rgba(255,255,255,0.02)", borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{entry.date}</span>
                        <button onClick={() => deleteEntry(entry.ts)} style={{ background: "none", border: "none", color: "rgba(160,160,190,0.25)", cursor: "pointer", fontSize: 15, padding: "2px 6px" }}>×</button>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(160,160,190,0.45)", margin: "3px 0 6px", lineHeight: 1.5 }}>
                        {entry.text.length > 100 ? entry.text.slice(0, 100) + "…" : entry.text}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {!hasDetection && <span style={{ fontSize: 11, color: "rgba(160,160,190,0.25)" }}>감정 미감지</span>}
                        {a.hits.map((h, i) => (
                          <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 16, background: getEmotionColor(h) + "1a", color: getEmotionColor(h), fontWeight: 600 }}>{h.label}</span>
                        ))}
                        {a.matchedPos.length > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 16, background: "rgba(102,187,106,0.1)", color: "#66BB6A", fontWeight: 500 }}>+{a.matchedPos.length}</span>}
                        {a.matchedNeg.length > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 16, background: "rgba(231,57,70,0.1)", color: "#E63946", fontWeight: 500 }}>-{a.matchedNeg.length}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── CIRCUMPLEX ─────────────────────────── */}
        {tab === "circumplex" && (
          entries.length === 0 ? (
            <EmptyState icon="🎯" text="감정 일기를 추가하면 감정 원형 그래프가 나타납니다" onAction={() => setTab("input")} />
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(160,160,190,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>감정 원형 그래프</div>
              <p style={{ fontSize: 11, color: "rgba(160,160,190,0.3)", margin: "0 0 14px" }}>
                컬러 점 = 감지 감정 · 흰 점 = 일자 평균 · 점선 = 궤적 · 연한 점 = Russell 앵커
              </p>
              <CircumplexChart entries={entries} hoveredIdx={hovIdx} onHover={setHovIdx} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 14 }}>
                {entries.map((e, i) => (
                  <button key={e.ts} onMouseEnter={() => setHovIdx(i)} onMouseLeave={() => setHovIdx(null)}
                    style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, background: hovIdx === i ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", color: hovIdx === i ? "#fff" : "rgba(160,160,190,0.45)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, cursor: "pointer", transition: "all 0.15s" }}>
                    {e.date}
                  </button>
                ))}
              </div>
              {stats && stats.sorted.length > 0 && (
                <div style={{ marginTop: 20, padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(160,160,190,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>감정 빈도</div>
                  {stats.sorted.slice(0, 10).map(([label, { count, q }]) => {
                    const max = stats.sorted[0][1].count;
                    return (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ width: 56, fontSize: 12, fontWeight: 600, color: Q_COLORS[q], textAlign: "right" }}>{label}</span>
                        <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${(count / max) * 100}%`, height: "100%", background: Q_COLORS[q] + "77", borderRadius: 4, transition: "width 0.4s" }} />
                        </div>
                        <span style={{ fontSize: 11, color: "rgba(160,160,190,0.35)", width: 22, textAlign: "right" }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )
        )}

        {/* ─── TREND ──────────────────────────────── */}
        {tab === "trend" && (
          entries.length < 2 ? (
            <EmptyState icon="📈" text="감정 변화 그래프는 2개 이상의 일기가 필요합니다" onAction={() => setTab("input")} />
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(160,160,190,0.4)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>감정 변화</div>
              <TrendChart entries={entries} />
              {stats && (
                <div style={{ marginTop: 16, padding: 14, background: "rgba(255,255,255,0.02)", borderRadius: 10, display: "flex", gap: 20, fontSize: 13, flexWrap: "wrap" }}>
                  <div><span style={{ color: "rgba(160,160,190,0.4)" }}>평균 긍정</span> <span style={{ color: "#66BB6A", fontWeight: 700 }}>{stats.avgPos.toFixed(1)}%</span></div>
                  <div><span style={{ color: "rgba(160,160,190,0.4)" }}>평균 부정</span> <span style={{ color: "#E63946", fontWeight: 700 }}>{stats.avgNeg.toFixed(1)}%</span></div>
                  <div><span style={{ color: "rgba(160,160,190,0.4)" }}>기록</span> <span style={{ fontWeight: 700 }}>{stats.total}개</span></div>
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                {entries.map(e => {
                  const vn = (e.analysis.valence9 - 1) / 8;
                  const bc = vn > 0.55 ? "#66BB6A" : vn < 0.4 ? "#E63946" : "#FFD166";
                  return (
                    <div key={e.ts} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", marginBottom: 5,
                      background: "rgba(255,255,255,0.02)", borderRadius: 8, borderLeft: `3px solid ${bc}`,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, width: 36, flexShrink: 0 }}>{e.date}</span>
                      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {e.analysis.hits.map((h, j) => (
                          <span key={j} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 12, background: getEmotionColor(h) + "18", color: getEmotionColor(h), fontWeight: 600 }}>{h.label}</span>
                        ))}
                        {e.analysis.hits.length === 0 && <span style={{ fontSize: 10, color: "rgba(160,160,190,0.25)" }}>—</span>}
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(160,160,190,0.35)", whiteSpace: "nowrap" }}>
                        {e.analysis.posPct.toFixed(0)}↑ {e.analysis.negPct.toFixed(0)}↓
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}

        {/* ─── DETAIL ─────────────────────────────── */}
        {tab === "detail" && (
          entries.length === 0 ? (
            <EmptyState icon="🔍" text="감정일기장이 비어있습니다" onAction={() => setTab("input")} />
          ) : (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(160,160,190,0.4)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>감정일기장</div>
              {entries.map(e => (
                <div key={e.ts} style={{ padding: 14, marginBottom: 8, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📅 {e.date}</div>
                  <div style={{ fontSize: 12, color: "rgba(160,160,190,0.55)", marginBottom: 8, lineHeight: 1.5 }}>{e.text}</div>
                  <div style={{ fontSize: 11, lineHeight: 1.8, color: "rgba(160,160,190,0.5)" }}>
                    <div><b>Russell:</b> {e.analysis.hits.length > 0 ? e.analysis.hits.map(h => `${h.label}(${h.token})`).join(", ") : "(없음)"}</div>
                    <div><b style={{ color: "#66BB6A" }}>보조 긍정:</b> {e.analysis.matchedPos.length > 0 ? e.analysis.matchedPos.map(m => `${m.word}(${m.weight}x)`).join(", ") : "(없음)"}</div>
                    <div><b style={{ color: "#E63946" }}>보조 부정:</b> {e.analysis.matchedNeg.length > 0 ? e.analysis.matchedNeg.map(m => `${m.word}(${m.weight}x)`).join(", ") : "(없음)"}</div>
                    <div style={{ marginTop: 4, fontSize: 10, color: "rgba(160,160,190,0.35)" }}>
                      V:{e.analysis.valence9.toFixed(2)} · A:{e.analysis.arousal9.toFixed(2)} · 긍정:{e.analysis.posPct.toFixed(1)}% · 부정:{e.analysis.negPct.toFixed(1)}% · 총 감지: {e.analysis.hits.length + e.analysis.matchedPos.length + e.analysis.matchedNeg.length}개
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, text, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: 48, color: "rgba(160,160,190,0.4)" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
      <p>{text}</p>
      <button onClick={onAction} style={{ marginTop: 12, padding: "8px 20px", fontSize: 13, background: "rgba(255,255,255,0.06)", color: "#B794F6", border: "1px solid rgba(183,148,246,0.2)", borderRadius: 8, cursor: "pointer" }}>
        일기 쓰러 가기
      </button>
    </div>
  );
}
