export default function MockPage() {
  return (
    <iframe
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
      }}
      srcDoc={`<div class="mock-srcdoc-root">
<meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CalmLine — Live Session</title>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:        #F5EDE8;
      --bg2:       #EEE4DE;
      --sidebar:   #2C1A1E;
      --panel:     #FEFCF8;
      --panel2:    #F7F2EA;
      --border:    rgba(150,118,80,0.16);
      --border2:   rgba(150,118,80,0.26);
      --accent:    #9A5E1A;
      --accent-d:  rgba(154,94,26,0.12);
      --accent-g:  rgba(154,94,26,0.05);
      --gold:      #A87E28;
      --rose:      #A86050;
      --blush:     #D8BEA8;
      --sand:      #C8A880;
      --sbar-acc:  #E8C4B8;
      --sbar-txt:  rgba(252,244,240,1);
      --sbar-dim:  rgba(232,200,195,0.55);
      --text:      #120D06;
      --text-d:    rgba(18,13,6,0.75);
      --text-m:    rgba(18,13,6,0.45);
      --success:   #4E7A5E;
      --warning:   #A87828;
      --danger:    #A84848;
      --fh:        'Libre Baskerville', serif;
      --fb:        'Plus Jakarta Sans', sans-serif;
    }
    html, body { height:100%; overflow:hidden; font-family:var(--fb); background:var(--bg); color:var(--text); font-size:15px; }
    .app { display:flex; height:100vh; overflow:hidden; }
    .sidebar { width:230px; flex-shrink:0; background:var(--sidebar); display:flex; flex-direction:column; overflow-y:auto; border-right:1px solid rgba(212,149,106,0.1); }
    .sidebar::-webkit-scrollbar { width:0; }
    .sidebar-logo { padding:1.5rem 1.3rem 1.1rem; border-bottom:1px solid rgba(232,195,190,0.15); }
    .logo-text { font-family:var(--fh); font-size:1.55rem; font-weight:400; color:rgba(240,232,220,0.95); }
    .logo-text em { font-style:italic; color:var(--sbar-acc); }
    .logo-sub { font-size:0.62rem; letter-spacing:0.22em; text-transform:uppercase; color:var(--sbar-dim); margin-top:0.2rem; }
    .role-toggle { margin:0.8rem 0.8rem 0.2rem; display:flex; background:rgba(255,255,255,0.08); border:1px solid rgba(232,195,190,0.18); border-radius:8px; overflow:hidden; }
    .role-btn { flex:1; padding:0.42rem 0; border:none; background:transparent; cursor:pointer; font-family:var(--fb); font-size:0.66rem; letter-spacing:0.1em; text-transform:uppercase; color:rgba(238,210,205,0.6); transition:all 0.2s; }
    .role-btn.active { background:rgba(232,195,190,0.18); color:var(--sbar-acc); font-weight:500; }
    .nav-section { padding:1.1rem 1.1rem 0.3rem; font-size:0.58rem; letter-spacing:0.25em; text-transform:uppercase; color:rgba(238,210,205,0.45); }
    .nav-item { display:flex; align-items:center; gap:0.75rem; padding:0.6rem 1.1rem; margin:0.06rem 0.5rem; border-radius:7px; cursor:pointer; color:rgba(238,210,205,0.65); font-size:0.84rem; transition:all 0.18s; position:relative; font-weight:300; }
    .nav-item:hover { background:rgba(255,255,255,0.05); color:var(--sbar-txt); }
    .nav-item.active { background:rgba(232,195,190,0.15); color:var(--sbar-acc); font-weight:500; }
    .nav-item.active::before { content:''; position:absolute; left:0; top:20%; bottom:20%; width:2.5px; background:var(--sbar-acc); border-radius:2px; }
    .nav-icon { width:20px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .nav-icon svg { width:16px; height:16px; }
    .nav-badge { margin-left:auto; background:var(--danger); color:#fff; font-size:0.6rem; padding:0.12rem 0.44rem; border-radius:10px; font-weight:600; }
    .sidebar-bottom { margin-top:auto; padding:1rem 1.1rem; border-top:1px solid rgba(232,195,190,0.15); display:flex; align-items:center; gap:0.8rem; }
    .agent-av { width:34px; height:34px; border-radius:50%; flex-shrink:0; background:linear-gradient(135deg,rgba(212,149,106,0.45),rgba(184,115,51,0.3)); border:1px solid rgba(232,195,190,0.28); display:flex; align-items:center; justify-content:center; font-family:var(--fh); font-size:0.9rem; color:var(--sbar-acc); font-style:italic; }
    .agent-name { font-size:0.84rem; color:rgba(248,242,232,1); font-weight:600; }
    .agent-st { font-size:0.65rem; color:var(--sbar-dim); display:flex; align-items:center; gap:0.3rem; margin-top:0.12rem; }
    .pulse { width:6px; height:6px; border-radius:50%; background:var(--sbar-acc); animation:blink 2s infinite; flex-shrink:0; }
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
    .main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
    .topbar { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.8rem; background:var(--panel); border-bottom:1px solid var(--border); flex-shrink:0; }
    .topbar-title { font-family:var(--fh); font-size:1.2rem; font-weight:700; color:#120D06; }
    .topbar-sub { font-size:0.72rem; color:var(--text-m); margin-top:0.1rem; font-weight:400; }
    .topbar-right { display:flex; align-items:center; }
    .t-stat { display:flex; flex-direction:column; align-items:center; padding:0 1.2rem; border-right:1px solid var(--border); }
    .t-stat:last-of-type { border-right:none; }
    .ts-v { font-family:var(--fh); font-size:1.4rem; color:#120D06; font-weight:700; line-height:1; }
    .ts-v.g { color:var(--success); } .ts-v.w { color:var(--warning); } .ts-v.a { color:var(--accent); }
    .ts-l { font-size:0.6rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--text-m); margin-top:0.18rem; }
    .tab-row { display:flex; background:var(--panel); border-bottom:1px solid var(--border); padding:0 1.8rem; flex-shrink:0; overflow-x:auto; }
    .tab-row::-webkit-scrollbar { height:0; }
    .tab { padding:0.78rem 1.1rem; cursor:pointer; white-space:nowrap; font-size:0.72rem; letter-spacing:0.07em; text-transform:uppercase; color:var(--text-m); border-bottom:2px solid transparent; transition:all 0.18s; background:none; border-top:none; border-left:none; border-right:none; font-family:var(--fb); font-weight:400; }
    .tab:hover { color:var(--text-d); }
    .tab.active { color:var(--accent); border-bottom-color:var(--accent); font-weight:600; }
    .screen { display:none; flex:1; overflow-y:auto; padding:1.4rem 1.8rem; flex-direction:column; gap:1.1rem; }
    .screen.active { display:flex; }
    .screen::-webkit-scrollbar { width:4px; }
    .screen::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }
    .panel { background:var(--panel); border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(100,70,30,0.06); }
    .panel-head { display:flex; align-items:center; justify-content:space-between; padding:0.9rem 1.2rem; border-bottom:1px solid var(--border); }
    .ph-label { font-size:0.64rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--accent); display:flex; align-items:center; gap:0.5rem; font-weight:600; }
    .ph-label svg { width:14px; height:14px; }
    .ph-action { font-size:0.66rem; color:var(--text-m); cursor:pointer; transition:color 0.18s; }
    .ph-action:hover { color:var(--accent); }
    .p-body { padding:1.2rem; }
    .g2 { display:grid; grid-template-columns:1fr 1fr; gap:1.1rem; }
    .g3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:1.1rem; }
    .g-live { display:grid; grid-template-columns:1fr 1fr; gap:1.1rem; flex:1; min-height:0; }
    .sess-bar { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; padding:1rem 1.2rem; background:var(--panel); border:1px solid var(--border); border-radius:12px; flex-shrink:0; box-shadow:0 2px 10px rgba(100,70,30,0.06); }
    .sess-status { display:flex; align-items:center; gap:0.6rem; font-size:0.84rem; color:var(--text-d); font-weight:300; }
    .s-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .sd-on { background:var(--success); box-shadow:0 0 6px rgba(78,122,94,0.5); animation:blink 2s infinite; }
    .tone-chip { font-size:0.63rem; letter-spacing:0.1em; text-transform:uppercase; padding:0.25rem 0.75rem; border-radius:20px; font-weight:600; }
    .tc-n { background:rgba(78,122,94,0.1); color:var(--success); border:1px solid rgba(78,122,94,0.22); }
    .tc-w { background:rgba(168,120,40,0.12); color:var(--warning); border:1px solid rgba(168,120,40,0.25); }
    .sess-meta { margin-left:auto; font-size:0.68rem; color:var(--text-m); font-style:italic; }
    .sess-btns { display:flex; gap:0.6rem; align-items:center; }
    .btn-go { background:var(--accent); color:#fff; border:none; padding:0.58rem 1.35rem; border-radius:22px; font-family:var(--fb); font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.2s; box-shadow:0 3px 12px rgba(184,115,51,0.32); }
    .btn-go:hover { background:#a06028; transform:translateY(-1px); }
    .btn-go.on { background:var(--panel2); color:var(--accent); border:1px solid var(--border2); box-shadow:none; }
    .btn-end { background:transparent; color:var(--text-m); border:1px solid var(--border2); padding:0.58rem 1.2rem; border-radius:22px; font-family:var(--fb); font-size:0.8rem; cursor:pointer; transition:all 0.2s; }
    .btn-end:hover { border-color:var(--danger); color:var(--danger); }
    .timer-chip { display:flex; align-items:center; gap:0.4rem; padding:0.35rem 0.85rem; border-radius:20px; background:var(--accent-d); border:1px solid var(--border2); font-size:0.78rem; color:var(--accent); font-weight:600; }
    .tx-box { background:var(--bg2); border-radius:10px; flex:1; min-height:290px; max-height:380px; overflow-y:auto; padding:1.1rem; display:flex; flex-direction:column; gap:0.8rem; border:1px solid var(--border); }
    .tx-empty { flex:1; display:flex; align-items:center; justify-content:center; font-size:0.84rem; color:var(--text-m); font-weight:300; font-style:italic; }
    .tx-line { display:flex; gap:0.7rem; align-items:flex-start; }
    .tx-who { font-size:0.62rem; letter-spacing:0.1em; text-transform:uppercase; padding-top:0.15rem; flex-shrink:0; width:44px; text-align:right; font-weight:700; }
    .tx-who.agent { color:var(--accent); }
    .tx-who.caller { color:var(--rose); }
    .tx-bub { flex:1; padding:0.65rem 0.9rem; border-radius:10px; font-size:0.84rem; line-height:1.6; font-weight:300; }
    .tx-bub.agent { background:rgba(184,115,51,0.08); border:1px solid rgba(184,115,51,0.16); color:var(--text-d); }
    .tx-bub.caller { background:var(--panel); border:1px solid var(--border); color:var(--text-d); }
    .tx-bub.hot { background:rgba(168,72,72,0.07); border:1px solid rgba(168,72,72,0.22); color:var(--text); }
    .tx-ts { font-size:0.6rem; color:var(--text-m); margin-top:0.25rem; }
    .coach-box { background:var(--bg2); border-radius:10px; flex:1; min-height:290px; max-height:380px; overflow-y:auto; padding:1.1rem; display:flex; flex-direction:column; gap:0.72rem; border:1px solid var(--border); }
    .coach-empty { flex:1; display:flex; align-items:center; justify-content:center; font-size:0.84rem; color:var(--text-m); font-weight:300; font-style:italic; text-align:center; line-height:1.7; }
    .cue { display:flex; gap:0.72rem; align-items:flex-start; }
    .cue-ic { width:24px; height:24px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; margin-top:0.08rem; }
    .cue-ic svg { width:12px; height:12px; }
    .ci-ok { background:rgba(78,122,94,0.12); border:1px solid rgba(78,122,94,0.25); color:var(--success); }
    .ci-tip { background:rgba(192,154,69,0.14); border:1px solid rgba(192,154,69,0.28); color:var(--gold); }
    .ci-warn { background:rgba(168,72,72,0.1); border:1px solid rgba(168,72,72,0.25); color:var(--danger); }
    .cue-body { font-size:0.82rem; color:var(--text-d); line-height:1.58; font-weight:300; }
    .cue-body strong { color:var(--text); font-weight:600; }
    .cue-script { margin-top:0.42rem; padding:0.45rem 0.82rem; background:var(--accent-g); border-left:2.5px solid var(--accent); font-size:0.77rem; color:var(--accent); font-style:italic; border-radius:0 6px 6px 0; line-height:1.55; }
    .coach-acts { display:flex; gap:0.55rem; margin-top:0.55rem; flex-wrap:wrap; }
    .c-btn { padding:0.42rem 1rem; border-radius:22px; cursor:pointer; font-size:0.74rem; font-family:var(--fb); transition:all 0.18s; border:none; font-weight:500; }
    .c-primary { background:var(--accent); color:#fff; box-shadow:0 2px 8px rgba(184,115,51,0.28); }
    .c-primary:hover { background:#a06028; }
    .c-sec { background:transparent; color:var(--text-m); border:1px solid var(--border2); }
    .c-sec:hover { color:var(--text); }
    .backup-tog { display:flex; align-items:center; justify-content:space-between; padding:0.7rem 0; cursor:pointer; font-size:0.76rem; color:var(--text-m); border-top:1px solid var(--border); margin-top:0.55rem; }
    .backup-tog svg { transition:transform 0.2s; }
    .backup-list { display:none; flex-direction:column; gap:0.45rem; padding-top:0.55rem; }
    .backup-list.open { display:flex; }
    .backup-item { padding:0.5rem 0.85rem; background:var(--panel); border:1px solid var(--border); border-radius:8px; font-size:0.78rem; color:var(--text-d); cursor:pointer; transition:all 0.18s; font-weight:300; }
    .backup-item:hover { border-color:var(--accent); color:var(--accent); background:var(--accent-g); }
    .sent-gauge { position:relative; height:7px; border-radius:4px; background:linear-gradient(90deg,var(--danger) 0%,var(--warning) 45%,var(--success) 100%); margin-bottom:0.48rem; }
    .sent-needle { position:absolute; top:50%; transform:translate(-50%,-50%); width:16px; height:16px; border-radius:50%; background:var(--panel); border:2px solid var(--text); box-shadow:0 2px 6px rgba(0,0,0,0.14); transition:left 2.5s cubic-bezier(.34,1.56,.64,1); }
    .sent-lbls { display:flex; justify-content:space-between; font-size:0.58rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-m); margin-bottom:1.1rem; }
    .s-row { display:flex; align-items:center; gap:0.72rem; margin-bottom:0.58rem; }
    .s-lbl { font-size:0.7rem; color:var(--text-m); width:88px; flex-shrink:0; }
    .s-track { flex:1; height:5px; background:var(--bg2); border-radius:3px; overflow:hidden; border:1px solid var(--border); }
    .s-fill { height:100%; border-radius:3px; transition:width 2s ease; }
    .s-val { font-size:0.7rem; color:var(--text-d); width:28px; text-align:right; }
    .disc-note { margin-top:0.9rem; padding:0.65rem 0.9rem; background:rgba(78,122,94,0.09); border:1px solid rgba(78,122,94,0.2); border-radius:8px; font-size:0.7rem; color:var(--success); }
    .mc { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:0.95rem 1.1rem; box-shadow:0 2px 8px rgba(100,70,30,0.05); }
    .mc-l { font-size:0.6rem; letter-spacing:0.14em; text-transform:uppercase; color:#120D06; font-weight:700; }
    .mc-v { font-family:var(--fh); font-size:1.8rem; font-weight:700; color:#120D06; margin-top:0.3rem; line-height:1; }
    .mc-v.g { color:var(--success); } .mc-v.w { color:var(--warning); } .mc-v.a { color:var(--accent); }
    .mc-d { font-size:0.65rem; margin-top:0.3rem; font-weight:300; }
    .du { color:var(--success); } .dd { color:var(--danger); } .df { color:var(--text-m); }
    .shift-bar { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:1rem 1.3rem; display:flex; align-items:center; gap:1.8rem; flex-wrap:wrap; box-shadow:0 2px 8px rgba(100,70,30,0.05); }
    .si { display:flex; flex-direction:column; gap:0.22rem; }
    .si-l { font-size:0.6rem; letter-spacing:0.14em; text-transform:uppercase; color:#120D06; font-weight:700; }
    .si-v { font-family:var(--fh); font-size:1.25rem; color:#120D06; font-weight:700; }
    .si-v.a { color:var(--accent); } .si-v.g { color:var(--success); }
    .sdiv { width:1px; height:36px; background:var(--border); }
    .prog-wrap { flex:1; min-width:160px; }
    .prog-l { display:flex; justify-content:space-between; margin-bottom:0.4rem; font-size:0.66rem; color:var(--text-m); }
    .prog-track { height:5px; background:var(--bg2); border-radius:3px; overflow:hidden; border:1px solid var(--border); }
    .prog-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,var(--accent),var(--gold)); }
    .calm-badge { margin-left:auto; display:flex; flex-direction:column; align-items:center; padding:0.55rem 1.1rem; background:var(--accent-d); border:1px solid var(--border2); border-radius:10px; }
    .calm-n { font-family:var(--fh); font-size:2.1rem; color:var(--accent); font-weight:400; line-height:1; }
    .calm-l { font-size:0.58rem; letter-spacing:0.14em; text-transform:uppercase; color:var(--text-m); margin-top:0.22rem; }
    .q-row { display:flex; align-items:center; gap:0.9rem; padding:0.85rem 0; border-bottom:1px solid var(--border); }
    .q-row:last-child { border-bottom:none; }
    .q-num { font-family:var(--fh); font-size:1.2rem; color:var(--text-m); width:20px; text-align:center; flex-shrink:0; }
    .q-info { flex:1; min-width:0; }
    .q-name { font-size:0.88rem; color:#120D06; font-weight:700; }
    .q-meta { font-size:0.7rem; color:var(--text-m); margin-top:0.12rem; font-weight:300; }
    .q-tags { display:flex; gap:0.32rem; margin-top:0.35rem; flex-wrap:wrap; }
    .ctag { font-size:0.6rem; letter-spacing:0.09em; text-transform:uppercase; padding:0.16rem 0.58rem; border-radius:20px; font-weight:600; }
    .ct-w { background:rgba(168,120,40,0.1); color:var(--warning); border:1px solid rgba(168,120,40,0.22); }
    .ct-g { background:rgba(78,122,94,0.1); color:var(--success); border:1px solid rgba(78,122,94,0.2); }
    .ct-n { background:var(--bg2); color:var(--text-m); border:1px solid var(--border); }
    .ct-a { background:var(--accent-d); color:var(--accent); border:1px solid rgba(184,115,51,0.22); }
    .risk-col { flex-shrink:0; text-align:center; }
    .r-dot { width:9px; height:9px; border-radius:50%; margin:0 auto 0.28rem; }
    .rd-h { background:var(--danger); } .rd-m { background:var(--warning); } .rd-l { background:var(--success); }
    .r-lbl { font-size:0.6rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-m); }
    .brief-btn { padding:0.32rem 0.78rem; border-radius:20px; cursor:pointer; font-size:0.65rem; background:var(--accent-d); color:var(--accent); border:1px solid rgba(184,115,51,0.22); transition:all 0.18s; flex-shrink:0; font-weight:500; }
    .caller-row { display:flex; align-items:center; gap:1rem; margin-bottom:1rem; }
    .caller-av { width:44px; height:44px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-family:var(--fh); font-size:1.1rem; font-style:italic; }
    .caller-name { font-size:1rem; color:#120D06; font-weight:700; }
    .caller-meta { font-size:0.7rem; color:var(--text-m); margin-top:0.14rem; font-weight:300; }
    .caller-tags { display:flex; gap:0.32rem; margin-top:0.38rem; flex-wrap:wrap; }
    .armor-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0.7rem; margin-bottom:1rem; }
    .a-stat { background:var(--panel2); border:1px solid var(--border); padding:0.7rem 0.9rem; border-radius:10px; }
    .a-l { font-size:0.6rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--text-m); font-weight:600; }
    .a-v { font-family:var(--fh); font-size:1.3rem; font-weight:400; margin-top:0.22rem; color:var(--text); }
    .a-v.w { color:var(--warning); } .a-v.g { color:var(--success); }
    .armor-brief { background:var(--accent-g); border:1px solid rgba(184,115,51,0.18); border-left:3px solid var(--accent); padding:0.9rem 1.1rem; border-radius:0 10px 10px 0; font-size:0.84rem; color:var(--text-d); line-height:1.68; font-weight:300; font-style:italic; }
    .armor-brief strong { color:var(--accent); font-style:normal; font-weight:600; }
    .wellness { background:var(--accent-g); border:1px solid rgba(184,115,51,0.18); border-radius:10px; padding:1rem 1.1rem; }
    .wl-head { font-family:var(--fh); font-size:1.05rem; color:var(--text); font-style:italic; margin-bottom:0.55rem; }
    .wl-text { font-size:0.82rem; color:var(--text-d); line-height:1.68; font-weight:300; }
    .wl-text strong { color:var(--accent); font-weight:600; }
    .wl-btns { display:flex; gap:0.5rem; margin-top:0.8rem; flex-wrap:wrap; }
    .wl-btn { padding:0.38rem 0.95rem; border-radius:22px; font-family:var(--fb); font-size:0.7rem; cursor:pointer; transition:all 0.18s; font-weight:500; }
    .wl-btn.p { background:var(--accent); color:#fff; border:none; box-shadow:0 2px 8px rgba(184,115,51,0.28); }
    .wl-btn.s { background:transparent; color:var(--text-m); border:1px solid var(--border2); }
    .cl-row { display:flex; align-items:center; gap:0.9rem; padding:0.75rem 0; border-bottom:1px solid var(--border); }
    .cl-row:last-child { border-bottom:none; }
    .cl-time { font-size:0.68rem; color:var(--text-m); width:36px; flex-shrink:0; }
    .cl-dur { font-family:var(--fh); font-size:0.95rem; color:var(--text); width:34px; flex-shrink:0; }
    .cl-info { flex:1; min-width:0; }
    .cl-type { font-size:0.82rem; color:#120D06; font-weight:600; }
    .cl-out { font-size:0.68rem; color:var(--text-m); margin-top:0.12rem; font-weight:300; }
    .cl-bar { height:4px; width:50px; border-radius:2px; background:var(--bg2); overflow:hidden; border:1px solid var(--border); }
    .cl-fill { height:100%; border-radius:2px; }
    .cl-csat { font-size:0.8rem; font-weight:600; margin-left:0.5rem; }
    .db-item { padding:0.9rem 0; border-bottom:1px solid var(--border); }
    .db-item:last-child { border-bottom:none; }
    .db-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.45rem; }
    .db-title { font-size:0.84rem; color:#120D06; font-weight:700; }
    .db-time { font-size:0.65rem; color:var(--text-m); flex-shrink:0; margin-left:0.8rem; }
    .db-text { font-size:0.8rem; color:var(--text-d); line-height:1.6; font-weight:300; }
    .db-insight { margin-top:0.5rem; padding:0.45rem 0.82rem; background:var(--accent-g); border-left:2.5px solid var(--accent); font-size:0.76rem; color:var(--accent); font-style:italic; border-radius:0 6px 6px 0; }
    .c-row { display:flex; align-items:center; gap:0.8rem; margin-bottom:0.58rem; }
    .c-lbl { font-size:0.7rem; color:var(--text-m); width:80px; flex-shrink:0; }
    .c-track { flex:1; height:5px; background:var(--bg2); border-radius:3px; overflow:hidden; border:1px solid var(--border); }
    .c-fill { height:100%; border-radius:3px; transition:width 1.2s ease; }
    .c-val { font-size:0.7rem; color:var(--text-d); width:32px; text-align:right; flex-shrink:0; }
    .insight { background:var(--accent-g); border:1px solid rgba(184,115,51,0.18); border-radius:10px; padding:1rem 1.1rem; border-left:3px solid var(--accent); }
    .i-head { font-size:0.62rem; letter-spacing:0.18em; text-transform:uppercase; color:var(--accent); margin-bottom:0.48rem; font-weight:700; }
    .i-text { font-size:0.82rem; color:var(--text-d); line-height:1.68; font-weight:300; }
    .i-text strong { color:var(--text); font-weight:600; }
    .ta-row { display:flex; align-items:center; gap:0.9rem; padding:0.78rem 0; border-bottom:1px solid var(--border); }
    .ta-row:last-child { border-bottom:none; }
    .ta-av { width:32px; height:32px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-family:var(--fh); font-size:0.82rem; font-style:italic; }
    .ta-name { font-size:0.84rem; color:#120D06; flex:1; font-weight:600; }
    .ta-status { font-size:0.68rem; color:var(--text-m); width:92px; flex-shrink:0; font-weight:400; }
    .ta-bw { width:60px; height:4px; background:var(--bg2); border-radius:2px; overflow:hidden; flex-shrink:0; border:1px solid var(--border); }
    .ta-bf { height:100%; border-radius:2px; }
    .ta-calm { font-family:var(--fh); font-size:1.1rem; width:30px; text-align:right; flex-shrink:0; }
    .ta-flag { font-size:0.6rem; padding:0.13rem 0.5rem; border-radius:20px; flex-shrink:0; font-weight:600; }
    .tf-ok { background:rgba(78,122,94,0.1); color:var(--success); border:1px solid rgba(78,122,94,0.2); }
    .tf-w { background:rgba(168,120,40,0.1); color:var(--warning); border:1px solid rgba(168,120,40,0.2); }
    .tf-s { background:rgba(168,72,72,0.1); color:var(--danger); border:1px solid rgba(168,72,72,0.2); }
    .ef-row { display:flex; gap:0.75rem; padding:0.75rem 0; border-bottom:1px solid var(--border); align-items:flex-start; }
    .ef-row:last-child { border-bottom:none; }
    .ef-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:0.3rem; }
    .ef-h { background:var(--danger); } .ef-m { background:var(--warning); } .ef-r { background:var(--success); }
    .ef-name { font-size:0.82rem; color:#120D06; font-weight:600; }
    .ef-sub { font-size:0.7rem; color:var(--text-m); margin-top:0.16rem; line-height:1.4; font-weight:300; }
    .ef-time { font-size:0.65rem; color:var(--text-m); flex-shrink:0; margin-left:auto; }
    .b-alert { padding:1rem 1.1rem; background:rgba(168,72,72,0.06); border:1px solid rgba(168,72,72,0.2); border-left:3px solid var(--danger); border-radius:0 10px 10px 0; margin-bottom:1rem; }
    .ba-head { display:flex; align-items:center; gap:0.5rem; margin-bottom:0.45rem; }
    .ba-dot { width:7px; height:7px; border-radius:50%; background:var(--danger); animation:blink 1s infinite; }
    .ba-title { font-size:0.68rem; letter-spacing:0.14em; text-transform:uppercase; color:var(--danger); font-weight:700; }
    .ba-body { font-size:0.82rem; color:var(--text-d); line-height:1.55; font-weight:300; }
    .ba-btns { display:flex; gap:0.5rem; margin-top:0.78rem; }
    .ba-btn { padding:0.38rem 0.95rem; border-radius:22px; border:none; cursor:pointer; font-family:var(--fb); font-size:0.72rem; transition:all 0.18s; font-weight:500; }
    .ba-btn.p { background:rgba(168,72,72,0.12); color:var(--danger); border:1px solid rgba(168,72,72,0.28); }
    .ba-btn.s { background:transparent; color:var(--text-m); border:1px solid var(--border2); }
    .be-row { display:flex; gap:0.75rem; padding:0.7rem 0; border-bottom:1px solid var(--border); align-items:flex-start; }
    .be-row:last-child { border-bottom:none; }
    .be-time { font-size:0.65rem; color:var(--text-m); flex-shrink:0; width:34px; }
    .be-line { width:1px; background:var(--border); flex-shrink:0; align-self:stretch; }
    .be-text { font-size:0.78rem; color:var(--text-d); line-height:1.48; font-weight:300; }
    .be-text span { color:var(--accent); font-weight:500; }
    .load-big { font-family:var(--fh); font-size:3.5rem; font-weight:400; color:var(--accent); line-height:1; }
    .load-sub { font-size:0.65rem; letter-spacing:0.15em; text-transform:uppercase; color:var(--text-m); margin-top:0.32rem; }
    .lb-row { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.56rem; }
    .lb-lbl { font-size:0.7rem; color:var(--text-m); width:105px; flex-shrink:0; }
    .lb-track { flex:1; height:6px; background:var(--bg2); border-radius:3px; overflow:hidden; border:1px solid var(--border); }
    .lb-fill { height:100%; border-radius:3px; transition:width 1.5s ease; }
    .lb-val { font-size:0.7rem; color:var(--text-d); width:30px; text-align:right; }
    .win-item { padding:0.9rem 0; border-bottom:1px solid var(--border); }
    .win-item:last-child { border-bottom:none; }
    .win-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.32rem; }
    .win-title { font-size:0.84rem; color:var(--accent); font-weight:600; }
    .win-time { font-size:0.65rem; color:var(--text-m); }
    .win-text { font-size:0.8rem; color:var(--text-d); line-height:1.6; font-weight:300; font-style:italic; }
    .phrases { display:flex; flex-wrap:wrap; gap:0.5rem; }
    .phrase { padding:0.36rem 0.85rem; border-radius:22px; cursor:pointer; font-size:0.75rem; color:var(--text-d); background:var(--panel2); border:1px solid var(--border); transition:all 0.18s; font-weight:300; }
    .phrase:hover, .phrase.fl { background:var(--accent-d); border-color:var(--border2); color:var(--accent); }
    .dr-row { display:flex; align-items:center; gap:0.8rem; padding:0.65rem 0; border-bottom:1px solid var(--border); }
    .dr-row:last-child { border-bottom:none; }
    .dr-chk { color:var(--success); flex-shrink:0; display:flex; align-items:center; }
    .dr-chk svg { width:14px; height:14px; }
    .dr-text { flex:1; font-size:0.78rem; color:var(--text-d); line-height:1.4; font-weight:300; }
    .dr-time { font-size:0.65rem; color:var(--text-m); flex-shrink:0; }
    @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
    .screen.active > * { animation:fadeUp 0.32s ease backwards; }
    .screen.active > *:nth-child(1){animation-delay:0.03s}
    .screen.active > *:nth-child(2){animation-delay:0.08s}
    .screen.active > *:nth-child(3){animation-delay:0.13s}
    .screen.active > *:nth-child(4){animation-delay:0.18s}
    .screen.active > *:nth-child(5){animation-delay:0.23s}
  </style><div class="app">
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-text">Calm<em>Line</em></div>
      <div class="logo-sub">Agent Platform</div>
    </div>
    <div class="role-toggle">
      <button class="role-btn active" onclick="setRole('agent',this)">Agent</button>
      <button class="role-btn" onclick="setRole('manager',this)">Manager</button>
    </div>
    <div class="nav-section">Live</div>
    <div class="nav-item active" onclick="setTab('live',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></span>
      Active Call
    </div>
    <div class="nav-item" onclick="setTab('armor',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
      Pre-Call Armor
    </div>
    <div class="nav-item" onclick="setTab('boundary',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 12a11.05 11.05 0 00-22 0zm-5 7a3 3 0 01-6 0v-7"/></svg></span>
      Boundary Shield
    </div>
    <div class="nav-section">History</div>
    <div class="nav-item" onclick="setTab('history',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
      Call History
    </div>
    <div class="nav-item" onclick="setTab('queue',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
      My Queue <span class="nav-badge">3</span>
    </div>
    <div class="nav-section">Wellness</div>
    <div class="nav-item" onclick="setTab('load',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></span>
      Emotional Load
    </div>
    <div class="nav-item" onclick="setTab('wins',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
      Win Journal
    </div>
    <div class="nav-section">Organization</div>
    <div class="nav-item" onclick="setTab('team',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></span>
      Team Overview
    </div>
    <div class="nav-item" onclick="setTab('debrief',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></span>
      Call Debrief
    </div>
    <div class="nav-item" onclick="setTab('perf',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span>
      Performance
    </div>
    <div class="nav-section">Compliance</div>
    <div class="nav-item" onclick="setTab('audit',this)">
      <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
      Audit Log
    </div>
    <div class="sidebar-bottom">
      <div class="agent-av">KD</div>
      <div>
        <div class="agent-name" id="agentName">Kyra Davis</div>
        <div class="agent-st"><span class="pulse"></span><span id="agentSt">Available</span></div>
      </div>
    </div>
  </aside>

  <main class="main">
    <div class="topbar">
      <div>
        <div class="topbar-title">Live Session</div>
        <div class="topbar-sub" id="topSub">Ready to start session</div>
      </div>
      <div class="topbar-right">
        <div class="t-stat"><div class="ts-v">14</div><div class="ts-l">Calls</div></div>
        <div class="t-stat"><div class="ts-v g">4.8</div><div class="ts-l">CSAT</div></div>
        <div class="t-stat"><div class="ts-v w">2</div><div class="ts-l">Escalations</div></div>
        <div class="t-stat"><div class="ts-v a">91%</div><div class="ts-l">Calm Score</div></div>
      </div>
    </div>
    <div class="tab-row">
      <button class="tab active" onclick="setTab('live',this)">Active Call</button>
      <button class="tab" onclick="setTab('armor',this)">Pre-Call Armor</button>
      <button class="tab" onclick="setTab('boundary',this)">Boundary Shield</button>
      <button class="tab" onclick="setTab('history',this)">Call History</button>
      <button class="tab" onclick="setTab('queue',this)">Queue</button>
      <button class="tab" onclick="setTab('load',this)">Emotional Load</button>
      <button class="tab" onclick="setTab('debrief',this)">Debrief</button>
      <button class="tab" onclick="setTab('perf',this)">Performance</button>
      <button class="tab" onclick="setTab('team',this)">Team</button>
      <button class="tab" onclick="setTab('audit',this)">Audit Log</button>
    </div>

    <!-- LIVE -->
    <div class="screen active" id="screen-live">
      <div class="sess-bar">
        <div class="sess-status">
          <span class="s-dot sd-on" id="sDot"></span>
          <span id="sText">Ready &nbsp;·&nbsp; +1 (619) 555-0147</span>
        </div>
        <span class="tone-chip tc-n" id="tonePill">Tone: —</span>
        <span class="tone-chip tc-n" id="riskPill" style="margin-left:0.25rem">Escalation Risk: —</span>
        <div class="sess-meta" id="aiMon">CalmLine AI monitoring conversation</div>
        <div class="sess-btns">
          <div class="timer-chip" id="timerChip" style="display:none"><span class="pulse"></span><span id="timer">00:00</span></div>
          <button class="btn-go" id="goBtn" onclick="toggleCall()">Start Live Session</button>
          <button class="btn-end" onclick="endCall()">End Session</button>
        </div>
      </div>
      <div class="g-live" style="flex:1;min-height:0">
        <div class="panel" style="display:flex;flex-direction:column;min-height:0">
          <div class="panel-head">
            <div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Live Transcript</div>
            <div class="ph-action">Export</div>
          </div>
          <div class="p-body" style="flex:1;display:flex;flex-direction:column;min-height:0;gap:0.8rem;overflow:hidden">
            <div style="font-size:0.76rem;color:var(--text-m);font-style:italic">Customer speaking in real time</div>
            <div class="tx-box" id="txBox"><div class="tx-empty" id="txEmpty">Start a session or wait for an incoming call.</div></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:1.1rem;min-height:0">
          <div class="panel" style="flex:1;display:flex;flex-direction:column;min-height:0">
            <div class="panel-head">
              <div class="ph-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                AI Coaching — Live
                <span id="liveDot" style="display:none;width:7px;height:7px;border-radius:50%;background:var(--success);animation:blink 1.5s infinite;margin-left:2px"></span>
              </div>
              <button class="c-btn c-sec" onclick="regenCues()" style="font-size:0.68rem;padding:0.28rem 0.72rem">Regenerate</button>
            </div>
            <div class="p-body" style="flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden">
              <div style="font-family:var(--fh);font-size:1.05rem;color:var(--text);font-style:italic;margin-bottom:0.7rem">What to Say Now</div>
              <div class="coach-box" id="coachBox"><div class="coach-empty" id="coachEmpty">Live guidance will appear here when you're on a call.</div></div>
              <div class="coach-acts" id="coachActs" style="display:none">
                <button class="c-btn c-primary" onclick="copyScript()">Copy Script</button>
                <button class="c-btn c-sec" onclick="regenCues()">Regenerate</button>
              </div>
              <div class="backup-tog" onclick="toggleBackup()">
                <span>Backup responses</span>
                <svg id="backArrow" width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </div>
              <div class="backup-list" id="backList">
                <div class="backup-item" onclick="fItem(this)">"I completely understand your frustration."</div>
                <div class="backup-item" onclick="fItem(this)">"Let me stay on this with you until it's resolved."</div>
                <div class="backup-item" onclick="fItem(this)">"You don't need to call back — I'll handle this."</div>
                <div class="backup-item" onclick="fItem(this)">"Can I place you on a brief hold — about 60 seconds?"</div>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Live Sentiment</div>
            </div>
            <div class="p-body">
              <div class="sent-gauge"><div class="sent-needle" id="needle" style="left:72%"></div></div>
              <div class="sent-lbls"><span>Hostile</span><span>Tense</span><span>Calm</span></div>
              <div class="s-row"><div class="s-lbl">Caller tone</div><div class="s-track"><div class="s-fill" id="sFill" style="width:72%;background:linear-gradient(90deg,var(--warning),var(--success))"></div></div><div class="s-val" id="sVal">72</div></div>
              <div class="s-row"><div class="s-lbl">Agent calm</div><div class="s-track"><div class="s-fill" style="width:91%;background:linear-gradient(90deg,var(--accent),var(--success))"></div></div><div class="s-val">91</div></div>
              <div class="s-row"><div class="s-lbl">Resolution</div><div class="s-track"><div class="s-fill" style="width:80%;background:linear-gradient(90deg,var(--gold),var(--success))"></div></div><div class="s-val">80%</div></div>
              <div class="disc-note" id="discNote" style="display:none">✓ AI Disclosure delivered · CPPA ADMT compliant · Acknowledged at 00:04</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ARMOR -->
    <div class="screen" id="screen-armor">
      <div class="panel">
        <div class="panel-head">
          <div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Pre-Call Armor™ — Next Caller</div>
          <div class="ph-action">Full History</div>
        </div>
        <div class="p-body">
          <div class="caller-row">
            <div class="caller-av" style="background:linear-gradient(135deg,var(--blush),var(--sand));border:1px solid var(--border2);color:var(--accent)">DM</div>
            <div>
              <div class="caller-name">Diana M.</div>
              <div class="caller-meta">4 prior contacts · Last call 3 days ago · Billing history</div>
              <div class="caller-tags"><span class="ctag ct-w">Billing sensitive</span><span class="ctag ct-g">Previously resolved</span><span class="ctag ct-n">Prefers direct answers</span></div>
            </div>
          </div>
          <div class="armor-grid">
            <div class="a-stat"><div class="a-l">Escalation Risk</div><div class="a-v w">Medium</div></div>
            <div class="a-stat"><div class="a-l">Sentiment History</div><div class="a-v">Neutral</div></div>
            <div class="a-stat"><div class="a-l">Avg Duration</div><div class="a-v">7:40</div></div>
            <div class="a-stat"><div class="a-l">Open Cases</div><div class="a-v g">0</div></div>
          </div>
          <div class="armor-brief">Diana's last call was about an unexpected charge — resolved, but she found the explanation frustrating. <strong>Lead with the answer, not the policy.</strong> She appreciates directness. Do not transfer her without warning first.</div>
        </div>
      </div>
      <div class="g2">
        <div class="panel">
          <div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>Recommended Openers</div></div>
          <div class="p-body"><div class="phrases">
            <div class="phrase" onclick="fPhrase(this)">"I can see exactly what happened — let me explain clearly."</div>
            <div class="phrase" onclick="fPhrase(this)">"That charge makes sense once I show you the breakdown."</div>
            <div class="phrase" onclick="fPhrase(this)">"I'll stay on this with you until it's fully resolved."</div>
            <div class="phrase" onclick="fPhrase(this)">"You don't need to call back — I'll handle this end to end."</div>
          </div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Avoid These</div></div>
          <div class="p-body" style="display:flex;flex-direction:column;gap:0.55rem">
            <div style="font-size:0.82rem;color:var(--text-d);line-height:1.58;font-weight:300;padding:0.55rem 0.82rem;background:rgba(168,72,72,0.05);border:1px solid rgba(168,72,72,0.15);border-radius:8px">Do not transfer Diana — her history shows this triggers frustration immediately.</div>
            <div style="font-size:0.82rem;color:var(--text-d);line-height:1.58;font-weight:300;padding:0.55rem 0.82rem;background:rgba(168,72,72,0.05);border:1px solid rgba(168,72,72,0.15);border-radius:8px">Avoid leading with policy. Answer first, context second.</div>
            <div style="font-size:0.82rem;color:var(--text-d);line-height:1.58;font-weight:300;padding:0.55rem 0.82rem;background:rgba(168,72,72,0.05);border:1px solid rgba(168,72,72,0.15);border-radius:8px">Tell her how long a hold will be before placing it.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- BOUNDARY -->
    <div class="screen" id="screen-boundary">
      <div class="b-alert">
        <div class="ba-head"><div class="ba-dot"></div><div class="ba-title">Verbal Aggression Detected — 09:41</div></div>
        <div class="ba-body">Caller used strong negative language toward you personally. This crosses the boundary your organization has defined. You are not required to absorb this. CalmLine has logged the event automatically.</div>
        <div class="ba-btns">
          <button class="ba-btn p">Request Supervisor Now</button>
          <button class="ba-btn s" onclick="this.closest('.b-alert').style.opacity='0.4'">Mark Managed</button>
        </div>
      </div>
      <div class="g2">
        <div class="panel"><div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Call Timeline</div></div><div class="p-body">
          <div class="be-row"><div class="be-time">00:00</div><div class="be-line"></div><div class="be-text">Call connected. <span>AI Disclosure delivered</span> — caller acknowledged.</div></div>
          <div class="be-row"><div class="be-time">00:22</div><div class="be-line"></div><div class="be-text">Caller frustration noted. Tension index: <span>38</span>.</div></div>
          <div class="be-row"><div class="be-time">00:35</div><div class="be-line"></div><div class="be-text">Agent validation. Tension dropped to <span>29</span>. Good recovery.</div></div>
          <div class="be-row"><div class="be-time">00:41</div><div class="be-line"></div><div class="be-text">Personal negative language toward agent. Tension: <span style="color:var(--danger)">72</span>. Boundary Shield triggered.</div></div>
        </div></div>
        <div class="panel"><div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Suggested Responses</div></div><div class="p-body" style="display:flex;flex-direction:column;gap:0.55rem">
          <div class="backup-item" onclick="fItem(this)">"I want to help — I can do that best if we keep things respectful."</div>
          <div class="backup-item" onclick="fItem(this)">"I understand you're frustrated. Let's focus on solving this together."</div>
          <div class="backup-item" onclick="fItem(this)">"I'm going to get my supervisor to join us right now."</div>
          <div style="margin-top:0.55rem;padding:0.65rem 0.9rem;background:rgba(78,122,94,0.08);border:1px solid rgba(78,122,94,0.2);border-radius:8px;font-size:0.74rem;color:var(--success)">✓ This event is automatically logged and cannot be used in your performance review.</div>
        </div></div>
      </div>
    </div>

    <!-- HISTORY -->
    <div class="screen" id="screen-history">
      <div class="shift-bar">
        <div class="si"><div class="si-l">Shift</div><div class="si-v">8:00 AM – 5:00 PM</div></div>
        <div class="sdiv"></div>
        <div class="si"><div class="si-l">Time On Call</div><div class="si-v a">3h 14m</div></div>
        <div class="sdiv"></div>
        <div class="si"><div class="si-l">Break Remaining</div><div class="si-v">12 min</div></div>
        <div class="sdiv"></div>
        <div class="si"><div class="si-l">Queue</div><div class="si-v g">3 waiting</div></div>
        <div class="prog-wrap"><div class="prog-l"><span>Shift progress</span><span>42%</span></div><div class="prog-track"><div class="prog-fill" style="width:42%"></div></div></div>
        <div class="calm-badge"><div class="calm-n">91</div><div class="calm-l">Calm Score</div></div>
      </div>
      <div class="g3">
        <div class="mc"><div class="mc-l">Calls Handled</div><div class="mc-v">14</div><div class="mc-d du">+2 above daily avg</div></div>
        <div class="mc"><div class="mc-l">Avg Handle Time</div><div class="mc-v a">6:24</div><div class="mc-d du">-38s vs last week</div></div>
        <div class="mc"><div class="mc-l">First Call Resolution</div><div class="mc-v g">86%</div><div class="mc-d du">+4pts this week</div></div>
        <div class="mc"><div class="mc-l">Escalations Today</div><div class="mc-v w">2</div><div class="mc-d dd">Both medium risk</div></div>
        <div class="mc"><div class="mc-l">CSAT Today</div><div class="mc-v g">4.8</div><div class="mc-d du">Team avg: 4.3</div></div>
        <div class="mc"><div class="mc-l">Cues Applied</div><div class="mc-v a">11</div><div class="mc-d df">79% of flagged calls</div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Today's Call Log</div><div class="ph-action">Export</div></div>
        <div class="p-body">
          <div class="cl-row"><div class="cl-time">8:04</div><div class="cl-dur">4:12</div><div class="cl-info"><div class="cl-type">Billing inquiry</div><div class="cl-out">Resolved — payment plan confirmed</div></div><div class="cl-bar"><div class="cl-fill" style="width:82%;background:var(--success)"></div></div><div class="cl-csat" style="color:var(--success)">5.0</div></div>
          <div class="cl-row"><div class="cl-time">8:21</div><div class="cl-dur">9:37</div><div class="cl-info"><div class="cl-type">Account dispute</div><div class="cl-out">Escalated to Tier 2 — cues applied at 6:30</div></div><div class="cl-bar"><div class="cl-fill" style="width:48%;background:var(--warning)"></div></div><div class="cl-csat" style="color:var(--warning)">3.5</div></div>
          <div class="cl-row"><div class="cl-time">8:45</div><div class="cl-dur">5:50</div><div class="cl-info"><div class="cl-type">Password reset</div><div class="cl-out">Resolved — first call resolution</div></div><div class="cl-bar"><div class="cl-fill" style="width:91%;background:var(--success)"></div></div><div class="cl-csat" style="color:var(--success)">5.0</div></div>
          <div class="cl-row"><div class="cl-time">9:10</div><div class="cl-dur">11:02</div><div class="cl-info"><div class="cl-type">Cancellation / retention</div><div class="cl-out">Retained — Pre-Call Armor™ brief used</div></div><div class="cl-bar"><div class="cl-fill" style="width:61%;background:var(--warning)"></div></div><div class="cl-csat" style="color:var(--gold)">4.0</div></div>
          <div class="cl-row"><div class="cl-time">9:38</div><div class="cl-dur">3:28</div><div class="cl-info"><div class="cl-type">General inquiry</div><div class="cl-out">Resolved — no cues triggered</div></div><div class="cl-bar"><div class="cl-fill" style="width:95%;background:var(--success)"></div></div><div class="cl-csat" style="color:var(--success)">5.0</div></div>
        </div>
      </div>
      <div class="wellness">
        <div class="wl-head">How are you holding up?</div>
        <div class="wl-text">You've handled <strong>2 high-tension calls</strong> this morning. CalmLine detected elevated pacing on your last call — you recovered well. Your calm score of <strong>91</strong> puts you in the top 12% of your team today.</div>
        <div class="wl-btns"><button class="wl-btn p">Request Break</button><button class="wl-btn s">Breathing Exercise</button><button class="wl-btn s">Flag for Supervisor</button></div>
      </div>
    </div>

    <!-- QUEUE -->
    <div class="screen" id="screen-queue">
      <div class="panel">
        <div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>Incoming Queue — 3 Waiting</div><div class="ph-action">Refresh</div></div>
        <div class="p-body">
          <div class="q-row"><div class="q-num">1</div><div class="q-info"><div class="q-name">Marcus T.</div><div class="q-meta">Wait: 4:12 · Billing dispute · 2nd contact this week</div><div class="q-tags"><span class="ctag ct-w">Repeat caller</span><span class="ctag ct-w">Frustrated last call</span></div></div><div class="risk-col"><div class="r-dot rd-h"></div><div class="r-lbl">High</div></div><div class="brief-btn">View Briefing</div></div>
          <div class="q-row"><div class="q-num">2</div><div class="q-info"><div class="q-name">Priya K.</div><div class="q-meta">Wait: 1:48 · Account access · First contact</div><div class="q-tags"><span class="ctag ct-a">New caller</span><span class="ctag ct-g">No dispute history</span></div></div><div class="risk-col"><div class="r-dot rd-l"></div><div class="r-lbl">Low</div></div><div class="brief-btn">View Briefing</div></div>
          <div class="q-row"><div class="q-num">3</div><div class="q-info"><div class="q-name">Tom V.</div><div class="q-meta">Wait: 0:55 · Cancellation · Long-term account</div><div class="q-tags"><span class="ctag ct-w">Cancellation risk</span><span class="ctag ct-n">Long-term customer</span></div></div><div class="risk-col"><div class="r-dot rd-m"></div><div class="r-lbl">Medium</div></div><div class="brief-btn">View Briefing</div></div>
        </div>
      </div>
      <div class="insight"><div class="i-head">CalmLine Heads-Up</div><div class="i-text">Marcus T. has a <strong>high escalation probability</strong>. His Pre-Call Armor™ brief recommends leading with acknowledgment of his wait time before touching the account. Coaching cues will be active from the first ring.</div></div>
    </div>

    <!-- EMOTIONAL LOAD -->
    <div class="screen" id="screen-load">
      <div class="g2">
        <div class="panel"><div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>Your Emotional Load — Today</div></div>
          <div class="p-body" style="display:flex;flex-direction:column;align-items:center;gap:1.1rem">
            <div style="text-align:center;padding:1rem 0"><div class="load-big">62</div><div class="load-sub">Elevated — approaching high load threshold</div></div>
            <div style="width:100%">
              <div class="lb-row"><div class="lb-lbl">Verbal aggression</div><div class="lb-track"><div class="lb-fill" style="width:72%;background:linear-gradient(90deg,var(--danger),var(--warning))"></div></div><div class="lb-val">72</div></div>
              <div class="lb-row"><div class="lb-lbl">Pacing stress</div><div class="lb-track"><div class="lb-fill" style="width:55%;background:linear-gradient(90deg,var(--warning),var(--gold))"></div></div><div class="lb-val">55</div></div>
              <div class="lb-row"><div class="lb-lbl">Rep. escalation</div><div class="lb-track"><div class="lb-fill" style="width:48%;background:linear-gradient(90deg,var(--warning),var(--accent))"></div></div><div class="lb-val">48</div></div>
              <div class="lb-row"><div class="lb-lbl">Recovery rate</div><div class="lb-track"><div class="lb-fill" style="width:84%;background:linear-gradient(90deg,var(--accent),var(--success))"></div></div><div class="lb-val">84</div></div>
            </div>
          </div>
        </div>
        <div class="panel"><div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>CalmLine Recommends</div></div>
          <div class="p-body" style="display:flex;flex-direction:column;gap:1.1rem">
            <div class="wellness">
              <div class="wl-head">You've handled 2 high-tension calls this morning.</div>
              <div class="wl-text">Load is elevated but recovery rate is <strong>strong at 84</strong>. A break soon would help reset before the afternoon queue.</div>
              <div class="wl-btns"><button class="wl-btn p">Request Break</button><button class="wl-btn s">Disclose to Supervisor</button></div>
            </div>
            <div>
              <div class="ph-label" style="margin-bottom:0.7rem">Shift Load Timeline</div>
              <div class="lb-row"><div class="lb-lbl">8:00–9:00 AM</div><div class="lb-track"><div class="lb-fill" style="width:32%;background:var(--success)"></div></div><div class="lb-val" style="color:var(--success)">32</div></div>
              <div class="lb-row"><div class="lb-lbl">9:00–10:00 AM</div><div class="lb-track"><div class="lb-fill" style="width:58%;background:var(--warning)"></div></div><div class="lb-val" style="color:var(--warning)">58</div></div>
              <div class="lb-row"><div class="lb-lbl">10:00 AM – Now</div><div class="lb-track"><div class="lb-fill" style="width:72%;background:var(--danger)"></div></div><div class="lb-val" style="color:var(--danger)">72</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- WIN JOURNAL -->
    <div class="screen" id="screen-wins">
      <div class="panel">
        <div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Win Journal — This Week</div><div class="ph-action">Add Win</div></div>
        <div class="p-body">
          <div class="win-item"><div class="win-head"><div class="win-title">Retained cancellation — Tom V.</div><div class="win-time">Today · 9:10 AM</div></div><div class="win-text">Caller came in ready to cancel. You used the Pre-Call Armor™ briefing, held your pace when tension spiked at 7:15, and closed with a plan downgrade.</div></div>
          <div class="win-item"><div class="win-head"><div class="win-title">CSAT 5.0 — Clean resolution</div><div class="win-time">Today · 8:45 AM</div></div><div class="win-text">No cues triggered. No escalation. The caller specifically said you were "the clearest person they'd spoken to."</div></div>
          <div class="win-item"><div class="win-head"><div class="win-title">5-day calm score streak above 85</div><div class="win-time">This week</div></div><div class="win-text">Top 10% of your team. CalmLine has noticed a pattern: you're validating earlier in calls. That's the difference.</div></div>
        </div>
      </div>
    </div>

    <!-- DEBRIEF -->
    <div class="screen" id="screen-debrief">
      <div class="panel">
        <div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Post-Call Debrief — AI Generated</div><div class="ph-action">All Debriefs</div></div>
        <div class="p-body">
          <div class="db-item"><div class="db-head"><div class="db-title">9:10 AM — Cancellation / Retention · 11:02</div><div class="db-time">CSAT: 4.0</div></div><div class="db-text">Caller expressed intent to cancel. CalmLine flagged a retention opportunity at 3:42. You applied it — caller agreed to a plan downgrade. Escalation risk peaked at 68% before your response brought it to 44%.</div><div class="db-insight">You kept this one. The pause at 6:58 was exactly right — that 3 seconds measurably lowered the caller's pace.</div></div>
          <div class="db-item"><div class="db-head"><div class="db-title">8:21 AM — Account Dispute · 9:37</div><div class="db-time">CSAT: 3.5</div></div><div class="db-text">Escalation alert triggered at 6:30. You applied the cue and called for Tier 2 at 8:10. Transfer was handled professionally.</div><div class="db-insight">The transfer was right. Try validating the wait time before asking for account info next time.</div></div>
          <div class="db-item"><div class="db-head"><div class="db-title">8:04 AM — Billing Inquiry · 4:12</div><div class="db-time">CSAT: 5.0</div></div><div class="db-text">Clean call. No tension signals. First call resolution. No cues triggered — you handled this entirely independently.</div><div class="db-insight">Strong opener. Pacing was excellent — clear, confident, no rushing.</div></div>
        </div>
      </div>
    </div>

    <!-- PERFORMANCE -->
    <div class="screen" id="screen-perf">
      <div class="g3">
        <div class="panel"><div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Weekly Calm Score</div></div><div class="p-body">
          <div class="c-row"><div class="c-lbl">Monday</div><div class="c-track"><div class="c-fill" style="width:78%;background:var(--accent)"></div></div><div class="c-val">78</div></div>
          <div class="c-row"><div class="c-lbl">Tuesday</div><div class="c-track"><div class="c-fill" style="width:83%;background:var(--accent)"></div></div><div class="c-val">83</div></div>
          <div class="c-row"><div class="c-lbl">Wednesday</div><div class="c-track"><div class="c-fill" style="width:88%;background:var(--accent)"></div></div><div class="c-val">88</div></div>
          <div class="c-row"><div class="c-lbl">Thursday</div><div class="c-track"><div class="c-fill" style="width:85%;background:var(--accent)"></div></div><div class="c-val">85</div></div>
          <div class="c-row"><div class="c-lbl">Today</div><div class="c-track"><div class="c-fill" style="width:91%;background:var(--success)"></div></div><div class="c-val" style="color:var(--success)">91</div></div>
        </div></div>
        <div class="panel"><div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>Cue Effectiveness</div></div><div class="p-body">
          <div class="c-row"><div class="c-lbl">Cues applied</div><div class="c-track"><div class="c-fill" style="width:79%;background:var(--gold)"></div></div><div class="c-val">79%</div></div>
          <div class="c-row"><div class="c-lbl">De-escalated</div><div class="c-track"><div class="c-fill" style="width:64%;background:var(--accent)"></div></div><div class="c-val">64%</div></div>
          <div class="c-row"><div class="c-lbl">CSAT lifted</div><div class="c-track"><div class="c-fill" style="width:71%;background:var(--success)"></div></div><div class="c-val">71%</div></div>
        </div></div>
        <div class="panel"><div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>vs. Team Avg</div></div><div class="p-body">
          <div class="c-row"><div class="c-lbl">Your CSAT</div><div class="c-track"><div class="c-fill" style="width:96%;background:var(--success)"></div></div><div class="c-val" style="color:var(--success)">4.8</div></div>
          <div class="c-row"><div class="c-lbl">Team avg</div><div class="c-track"><div class="c-fill" style="width:86%;background:var(--border2)"></div></div><div class="c-val">4.3</div></div>
          <div class="c-row"><div class="c-lbl">Your FCR</div><div class="c-track"><div class="c-fill" style="width:86%;background:var(--success)"></div></div><div class="c-val" style="color:var(--success)">86%</div></div>
          <div class="c-row"><div class="c-lbl">Team avg</div><div class="c-track"><div class="c-fill" style="width:74%;background:var(--border2)"></div></div><div class="c-val">74%</div></div>
        </div></div>
      </div>
      <div class="insight"><div class="i-head">Weekly Insight</div><div class="i-text">Your calm score has improved <strong>13 points since Monday</strong>. You're applying validation language earlier in calls, giving frustrated callers less time to escalate before feeling heard. <strong>Handle time is down 38 seconds</strong> — calmer callers resolve faster.</div></div>
    </div>

    <!-- TEAM -->
    <div class="screen" id="screen-team">
      <div class="g2">
        <div class="panel"><div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>Team Live Status</div><div class="ph-action">Silent Join</div></div>
          <div class="p-body">
            <div class="ta-row"><div class="ta-av" style="background:linear-gradient(135deg,var(--blush),var(--sand));color:var(--accent)">KD</div><div class="ta-name">Kyra Davis</div><div class="ta-status">On call · 4:22</div><div class="ta-bw"><div class="ta-bf" style="width:91%;background:var(--success)"></div></div><div class="ta-calm" style="color:var(--success)">91</div><div class="ta-flag tf-ok">Strong</div></div>
            <div class="ta-row"><div class="ta-av" style="background:linear-gradient(135deg,#b8c8d8,#8898a8);color:#fff">JM</div><div class="ta-name">Jordan M.</div><div class="ta-status">On call · 9:14</div><div class="ta-bw"><div class="ta-bf" style="width:52%;background:var(--warning)"></div></div><div class="ta-calm" style="color:var(--warning)">52</div><div class="ta-flag tf-w">Watch</div></div>
            <div class="ta-row"><div class="ta-av" style="background:linear-gradient(135deg,#b8d0b8,#80a880);color:#fff">AS</div><div class="ta-name">Amara S.</div><div class="ta-status">Available</div><div class="ta-bw"><div class="ta-bf" style="width:87%;background:var(--success)"></div></div><div class="ta-calm">87</div><div class="ta-flag tf-ok">Strong</div></div>
            <div class="ta-row"><div class="ta-av" style="background:linear-gradient(135deg,#c8b8d8,#9880a8);color:#fff">RB</div><div class="ta-name">Ryan B.</div><div class="ta-status">On call · 12:01</div><div class="ta-bw"><div class="ta-bf" style="width:38%;background:var(--danger)"></div></div><div class="ta-calm" style="color:var(--danger)">38</div><div class="ta-flag tf-s">Needs Support</div></div>
            <div class="ta-row"><div class="ta-av" style="background:linear-gradient(135deg,var(--blush),var(--gold));color:var(--text)">TN</div><div class="ta-name">Taylor N.</div><div class="ta-status">Break</div><div class="ta-bw"><div class="ta-bf" style="width:79%;background:var(--gold)"></div></div><div class="ta-calm" style="color:var(--gold)">79</div><div class="ta-flag tf-ok">Good</div></div>
          </div>
        </div>
        <div class="panel"><div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Escalation Feed</div><div class="ph-action">All Events</div></div>
          <div class="p-body">
            <div class="ef-row"><div class="ef-dot ef-h"></div><div><div class="ef-name">Ryan B. — Escalation Alert</div><div class="ef-sub">Caller language spiked. Tension index 72. Supervisor join recommended.</div></div><div class="ef-time">Now</div></div>
            <div class="ef-row"><div class="ef-dot ef-m"></div><div><div class="ef-name">Jordan M. — Tension Rising</div><div class="ef-sub">Pacing mismatch detected. Coaching cue surfaced. Monitoring.</div></div><div class="ef-time">2m ago</div></div>
            <div class="ef-row"><div class="ef-dot ef-r"></div><div><div class="ef-name">Kyra D. — Recovered</div><div class="ef-sub">Tension dropped 61 → 34 after cue applied. Call back on track.</div></div><div class="ef-time">14m ago</div></div>
            <div class="ef-row"><div class="ef-dot ef-r"></div><div><div class="ef-name">Amara S. — Clean Resolution</div><div class="ef-sub">No cues triggered. FCR confirmed. CSAT 5.0.</div></div><div class="ef-time">31m ago</div></div>
          </div>
        </div>
      </div>
      <div class="insight"><div class="i-head">Manager Insight</div><div class="i-text">Ryan B. has been in a high-tension call for <strong>over 12 minutes</strong>. CalmLine recommends a silent supervisor join now. Jordan M. may benefit from a check-in after his current call.</div></div>
    </div>

    <!-- AUDIT -->
    <div class="screen" id="screen-audit">
      <div class="panel">
        <div class="panel-head"><div class="ph-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>AI Disclosure Audit Log — Today</div><div class="ph-action">Export for Compliance</div></div>
        <div class="p-body">
          <div class="dr-row"><div class="dr-chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="dr-text">Diana M. · Call #18 · AI disclosure at 00:04 · Caller acknowledged · CPPA ADMT compliant</div><div class="dr-time">10:22 AM</div></div>
          <div class="dr-row"><div class="dr-chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="dr-text">Tom V. · Call #17 · AI disclosure at 00:03 · Caller acknowledged · CPPA ADMT compliant</div><div class="dr-time">10:08 AM</div></div>
          <div class="dr-row"><div class="dr-chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="dr-text">Priya K. · Call #16 · AI disclosure at 00:04 · Caller asked follow-up — scripted response delivered · Compliant</div><div class="dr-time">9:51 AM</div></div>
          <div class="dr-row"><div class="dr-chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="dr-text">Marcus T. · Call #15 · AI disclosure at 00:03 · Caller acknowledged</div><div class="dr-time">9:38 AM</div></div>
          <div class="dr-row"><div class="dr-chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="dr-text">Unknown caller · Call #14 · Disclosure delivered · Call ended before acknowledgment — AI not activated per protocol</div><div class="dr-time">9:10 AM</div></div>
        </div>
      </div>
      <div class="insight"><div class="i-head">Compliance Summary</div><div class="i-text">All <strong>18 calls today</strong> have complete CPPA ADMT disclosure records. <strong>17 of 18</strong> caller acknowledgments confirmed. 1 unconfirmed — AI assistance not activated per protocol. All records are audit-ready and exportable.</div></div>
    </div>

  </main>
</div>
<script>
  function setTab(id, el) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab, .nav-item').forEach(t => t.classList.remove('active'));
    const sc = document.getElementById('screen-' + id);
    if (sc) sc.classList.add('active');
    document.querySelectorAll('.tab, .nav-item').forEach(t => {
      if (t.getAttribute('onclick') && t.getAttribute('onclick').includes("'" + id + "'")) t.classList.add('active');
    });
  }
  function setRole(role, btn) {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('agentSt').textContent = role === 'manager' ? 'Supervisor View' : (onCall ? 'On Call' : 'Available');
    setTab(role === 'manager' ? 'team' : 'live', null);
  }
  let onCall = false, timerSec = 0, timerInt = null;
  const txLines = [
    { who:'agent', text:"Thank you for calling, this is Kyra. How can I help you today?" },
    { who:'caller', text:"Hi, I'm calling about a charge on my account — $47.99 from the 15th. I don't recognize it." },
    { who:'agent', text:"Absolutely, let me pull up your account right now and take a look." },
    { who:'caller', text:"I've been on hold for 10 minutes. This is really frustrating.", hot:true },
    { who:'agent', text:"I'm so sorry about that wait — completely unacceptable. I'm going to make this worth your time right now." },
    { who:'caller', text:"OK. I just want to know what that charge is." },
    { who:'agent', text:"I can see it. That's from your annual plan renewal that processed automatically. Let me walk you through exactly what's included." },
  ];
  const cues = [
    { t:'ok', text:'<strong>Good opening.</strong> Caller tone is calm. Pace is steady — match it and stay warm.' },
    { t:'tip', text:'<strong>Billing topic confirmed.</strong> Answer first, context second — she finds policy language frustrating.', script:'"I can see the charge you\\'re referring to — let me walk you through it right now."' },
    { t:'warn', text:'<strong>Frustration spike detected.</strong> Escalation risk rose to 48%. Validate the wait before explaining.', script:'"That wait time is genuinely not okay — I\\'m sorry. Let me make this right."' },
    { t:'ok', text:'<strong>Great recovery.</strong> Your validation dropped risk from 48% to 31%. Keep this tone — calm, direct, accountable.' },
    { t:'tip', text:'<strong>Resolution in reach.</strong> Walk through the charge clearly and offer a clear next step.', script:'"This was an automatic annual renewal. Here are your options right now."' },
  ];
  function toggleCall() {
    onCall = !onCall;
    if (onCall) {
      document.getElementById('goBtn').textContent = 'Session Active';
      document.getElementById('goBtn').classList.add('on');
      document.getElementById('timerChip').style.display = 'flex';
      document.getElementById('sText').textContent = 'Live · Diana M. · +1 (619) 555-0147';
      document.getElementById('topSub').textContent = 'Live session in progress';
      document.getElementById('liveDot').style.display = 'inline-block';
      document.getElementById('agentSt').textContent = 'On Call';
      timerSec = 0;
      timerInt = setInterval(() => {
        timerSec++;
        document.getElementById('timer').textContent = String(Math.floor(timerSec/60)).padStart(2,'0') + ':' + String(timerSec%60).padStart(2,'0');
      }, 1000);
      const tb = document.getElementById('txBox');
      const cb = document.getElementById('coachBox');
      document.getElementById('txEmpty').style.display = 'none';
      document.getElementById('coachEmpty').style.display = 'none';
      tb.innerHTML = ''; cb.innerHTML = '';
      txLines.forEach((l, i) => {
        setTimeout(() => {
          const d = document.createElement('div');
          d.className = 'tx-line'; d.style.animation = 'fadeUp 0.3s ease';
          d.innerHTML = '<div class="tx-who ' + l.who + '">' + (l.who==='agent'?'Agent':'Caller') + '</div><div><div class="tx-bub ' + l.who + (l.hot?' hot':'') + '">' + String(l.text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div><div class="tx-ts">' + String(Math.floor(i*18/60)).padStart(2,'0') + ':' + String(i*18%60).padStart(2,'0') + '</div></div>';
          tb.appendChild(d); tb.scrollTop = tb.scrollHeight;
          if (i===3) { document.getElementById('tonePill').className='tone-chip tc-w'; document.getElementById('tonePill').textContent='Tone: Tense'; document.getElementById('riskPill').className='tone-chip tc-w'; document.getElementById('riskPill').textContent='Escalation Risk: Medium'; }
          if (i===4) { document.getElementById('tonePill').className='tone-chip tc-n'; document.getElementById('tonePill').textContent='Tone: Neutral'; document.getElementById('riskPill').className='tone-chip tc-n'; document.getElementById('riskPill').textContent='Escalation Risk: Low'; }
        }, i * 2200);
      });
      cues.forEach((c, i) => {
        setTimeout(() => {
          const d = document.createElement('div'); d.className = 'cue'; d.style.animation = 'fadeUp 0.3s ease';
          const icons = { ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>', tip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>', warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' };
          d.innerHTML = '<div class="cue-ic ci-' + c.t + '">' + icons[c.t] + '</div><div class="cue-body">' + String(c.text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + (c.script ? '<div class="cue-script">' + String(c.script).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>' : '') + '</div>';
          cb.appendChild(d); cb.scrollTop = cb.scrollHeight;
        }, i * 3500 + 1000);
      });
      setTimeout(() => document.getElementById('discNote').style.display='block', 4000);
      setTimeout(() => document.getElementById('coachActs').style.display='flex', 5500);
    } else { endCall(); }
  }
  function endCall() {
    onCall = false; clearInterval(timerInt);
    document.getElementById('goBtn').textContent = 'Start Live Session';
    document.getElementById('goBtn').classList.remove('on');
    document.getElementById('timerChip').style.display = 'none';
    document.getElementById('sText').textContent = 'Ready · +1 (619) 555-0147';
    document.getElementById('topSub').textContent = 'Ready to start session';
    document.getElementById('tonePill').className = 'tone-chip tc-n'; document.getElementById('tonePill').textContent = 'Tone: —';
    document.getElementById('riskPill').textContent = 'Escalation Risk: —';
    document.getElementById('liveDot').style.display = 'none';
    document.getElementById('agentSt').textContent = 'Available';
    document.getElementById('discNote').style.display = 'none';
    document.getElementById('coachActs').style.display = 'none';
  }
  let sv = 72, sd = -1;
  setInterval(() => {
    sv += sd * Math.random() * 2.2; if (sv < 56) sd = 1; if (sv > 90) sd = -1;
    sv = Math.max(52, Math.min(93, sv));
    const n = document.getElementById('needle'), f = document.getElementById('sFill'), v = document.getElementById('sVal');
    if(n) n.style.left = sv + '%'; if(f) f.style.width = sv + '%'; if(v) v.textContent = Math.round(sv);
  }, 2800);
  function toggleBackup() {
    const l = document.getElementById('backList'), a = document.getElementById('backArrow');
    l.classList.toggle('open'); a.style.transform = l.classList.contains('open') ? 'rotate(180deg)' : '';
  }
  function copyScript() {
    const btn = document.querySelector('.c-primary');
    if(btn) { btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy Script',1400); }
  }
  function regenCues() {
    const cb = document.getElementById('coachBox'); cb.style.opacity='0.4'; setTimeout(()=>cb.style.opacity='1',500);
  }
  function fPhrase(el) { el.classList.add('fl'); setTimeout(()=>el.classList.remove('fl'),1100); }
  function fItem(el) { el.style.borderColor='var(--accent)'; el.style.color='var(--accent)'; setTimeout(()=>{el.style.borderColor='';el.style.color='';},1100); }
</script>
</div>`}
      title="Mock preview"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
