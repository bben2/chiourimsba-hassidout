/* Annotations & reprise de lecture
   Zero compte, zero serveur : tout vit dans le localStorage du navigateur.
   - position de lecture memorisee par page (reprise en un clic)
   - statut lu / en cours affiche sur les sommaires
   - surlignage + notes par selection de texte
   - panneau "Mes annotations" + export / import JSON
*/
(function () {
  "use strict";
  var NS = "otsrot:";
  var PATH = location.pathname.replace(/\/+$/, "") || "/";
  var IS_INDEX = /(^\/$|index\.html$)/.test(location.pathname);

  function lsGet(k, d) { try { var v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} }
  function now() { return Date.now(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- styles ---------- */
  var css = [
    ".ann-mark{background:#f5e6b8;border-bottom:2px solid #b8860b;cursor:pointer;border-radius:2px}",
    ".ann-mark.ann-hasnote{background:#e8edf5;border-bottom-color:#1e3a5f}",
    "#ann-bubble{position:absolute;z-index:9999;background:#1e3a5f;color:#fff;border-radius:10px;padding:6px 8px;display:flex;gap:6px;box-shadow:0 4px 14px rgba(0,0,0,.25);font-size:13px}",
    "#ann-bubble button{background:#fff;color:#1e3a5f;border:0;border-radius:7px;padding:5px 10px;font-weight:600;cursor:pointer;font-size:12.5px}",
    "#ann-bubble button:hover{background:#f5e6b8}",
    "#ann-resume{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:9998;background:#1e3a5f;color:#fff;border:0;border-radius:999px;padding:9px 16px;font-size:13.5px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);opacity:.96}",
    "#ann-resume:hover{background:#2a4d7a}",
    "#ann-fab{position:fixed;right:14px;bottom:14px;z-index:9998;width:44px;height:44px;border-radius:50%;background:#b8860b;color:#fff;border:0;font-size:19px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.3)}",
    "#ann-flag,#ann-next{position:fixed;right:14px;z-index:9998;width:44px;height:44px;border-radius:50%;border:0;font-size:18px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.3);background:#1e3a5f;color:#fff;display:flex;align-items:center;justify-content:center}",
    "#ann-flag{bottom:66px}",
    "#ann-flag.set{background:#b8860b}",
    "#ann-next{bottom:118px}",
    "#ann-next b{position:absolute;bottom:-3px;right:-3px;background:#fffdf8;color:#1e3a5f;border:1.5px solid #1e3a5f;border-radius:999px;font-size:9.5px;padding:0 4px;font-weight:700}",
    "#ann-flagmenu{position:fixed;right:66px;bottom:60px;z-index:9999;background:#fffdf8;border:2px solid #1e3a5f;border-radius:12px;padding:8px;box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;flex-direction:column;gap:6px;min-width:190px}",
    "#ann-flagmenu button{background:#1e3a5f;color:#fff;border:0;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer;text-align:left}",
    "#ann-flagmenu button.sec{background:#fff;color:#1e3a5f;border:1.5px solid #1e3a5f}",
    "#ann-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:74px;z-index:10002;background:#1c1917;color:#fff;padding:9px 15px;border-radius:999px;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.3)}",
    ".ann-flagline{outline:3px solid #b8860b;outline-offset:3px;border-radius:6px;transition:outline-color 1.4s}",
    "@media print{#ann-flag,#ann-next,#ann-flagmenu,#ann-toast{display:none!important}}",
    "#ann-panel{position:fixed;top:0;right:0;bottom:0;width:min(430px,94vw);z-index:10000;background:#fffdf8;border-left:2px solid #1e3a5f;box-shadow:-6px 0 22px rgba(0,0,0,.2);display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
    "#ann-panel header{background:#1e3a5f;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}",
    "#ann-panel header b{font-size:15px}",
    "#ann-panel header button{background:transparent;border:0;color:#fff;font-size:20px;cursor:pointer}",
    "#ann-list{flex:1;overflow-y:auto;padding:12px 14px}",
    ".ann-item{background:#fff;border:1.5px solid #d6d3d1;border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:13px}",
    ".ann-item .ann-q{color:#1c1917;border-right:3px solid #b8860b;padding:2px 8px;margin:4px 0;background:#faf8f2;border-radius:4px;direction:rtl;text-align:right}",
    ".ann-item .ann-q.ann-fr{direction:ltr;text-align:left;border-right:0;border-left:3px solid #b8860b}",
    ".ann-item .ann-n{color:#1e3a5f;margin:6px 0 2px;white-space:pre-wrap}",
    ".ann-item .ann-meta{color:#78716c;font-size:11px;display:flex;justify-content:space-between;margin-top:6px;gap:6px;align-items:center}",
    ".ann-item a{color:#1e3a5f;text-decoration:none;font-weight:600}",
    ".ann-item .ann-del{background:transparent;border:0;color:#b91c1c;cursor:pointer;font-size:12px}",
    "#ann-tools{border-top:1.5px solid #d6d3d1;padding:10px 14px;display:flex;gap:8px;flex-wrap:wrap}",
    "#ann-tools button,#ann-tools label{background:#fff;border:1.5px solid #1e3a5f;color:#1e3a5f;border-radius:8px;padding:6px 11px;font-size:12.5px;font-weight:600;cursor:pointer}",
    "#ann-tools .ann-primary{background:#1e3a5f;color:#fff}",
    ".ann-badge{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:1px 8px;margin-left:6px;vertical-align:middle}",
    ".ann-badge.lu{background:#e6f0e6;color:#1a6b1a;border:1px solid #1a6b1a}",
    ".ann-badge.encours{background:#f5e6b8;color:#8a6508;border:1px solid #b8860b}",
    "#ann-note-dlg{position:fixed;inset:0;z-index:10001;background:rgba(28,25,23,.45);display:flex;align-items:center;justify-content:center}",
    "#ann-note-dlg .box{background:#fffdf8;border-radius:14px;padding:16px;width:min(480px,92vw);box-shadow:0 10px 30px rgba(0,0,0,.35)}",
    "#ann-note-dlg textarea{width:100%;min-height:90px;border:1.5px solid #1e3a5f;border-radius:8px;padding:8px;font-size:14px;box-sizing:border-box}",
    "#ann-note-dlg .row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}",
    "#ann-note-dlg button{border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid #1e3a5f;background:#fff;color:#1e3a5f}",
    "#ann-note-dlg .ok{background:#1e3a5f;color:#fff}",
    "@media print{#ann-fab,#ann-resume,#ann-bubble,#ann-panel{display:none!important}}"
  ].join("\n");
  var st = document.createElement("style"); st.id = "ann-css"; st.textContent = css; document.head.appendChild(st);

  /* ---------- 1. position de lecture ---------- */
  var posAll = lsGet("pos", {});
  if (!IS_INDEX) {
    var saveT = null;
    window.addEventListener("scroll", function () {
      if (saveT) return;
      saveT = setTimeout(function () {
        saveT = null;
        var h = document.documentElement.scrollHeight - innerHeight;
        var f = h > 0 ? scrollY / h : 0;
        posAll[PATH] = { f: Math.round(f * 1000) / 1000, t: now(), title: document.title.slice(0, 90) };
        if (f > 0.97) { var d = lsGet("done", {}); if (d[PATH] !== "lu") { d[PATH] = "lu"; lsSet("done", d); } }
        else { var d2 = lsGet("done", {}); if (!d2[PATH]) { d2[PATH] = "encours"; lsSet("done", d2); } }
        lsSet("pos", posAll);
      }, 600);
    }, { passive: true });

    var saved = posAll[PATH];
    if (saved && saved.f > 0.03 && saved.f < 0.97) {
      var rb = document.createElement("button");
      rb.id = "ann-resume"; rb.textContent = "Reprendre la lecture (" + Math.round(saved.f * 100) + "%)";
      rb.onclick = function () {
        var h = document.documentElement.scrollHeight - innerHeight;
        scrollTo({ top: saved.f * h, behavior: "smooth" }); rb.remove();
      };
      document.body.appendChild(rb);
      setTimeout(function () { if (rb.parentNode) rb.remove(); }, 12000);
      window.addEventListener("scroll", function once() { setTimeout(function(){ if (rb.parentNode) rb.remove(); }, 4000); window.removeEventListener("scroll", once); }, { passive: true });
    }
  }

  /* ---------- 2. badges sur les sommaires ---------- */
  function decorateIndex() {
    var done = lsGet("done", {});
    var links = document.querySelectorAll("a[href]");
    var lastP = null, lastT = 0;
    Object.keys(posAll).forEach(function (p) { if (posAll[p].t > lastT) { lastT = posAll[p].t; lastP = p; } });
    links.forEach(function (a) {
      var href = a.getAttribute("href"); if (!href || /^https?:|^#|^mailto:/.test(href)) return;
      var url = new URL(href, location.href);
      if (url.origin !== location.origin) return;
      var p = url.pathname.replace(/\/+$/, "");
      var s = done[p]; if (!s) return;
      if (a.querySelector(".ann-badge")) return;
      var b = document.createElement("span");
      b.className = "ann-badge " + s;
      b.textContent = s === "lu" ? "lu" : "en cours";
      a.appendChild(b);
    });
    if (IS_INDEX && lastP && !document.getElementById("ann-resume-idx")) {
      var target = document.querySelector("h1,header") || document.body.firstElementChild;
      if (target) {
        var w = document.createElement("div"); w.id = "ann-resume-idx"; w.style.cssText = "text-align:center;margin:10px 0";
        var t = (posAll[lastP].title || lastP).replace(/ [-|].*$/, "");
        w.innerHTML = '<a href="' + esc(lastP) + '?flag=1" style="display:inline-block;background:#1e3a5f;color:#fff;border-radius:999px;padding:8px 18px;font-size:13.5px;font-weight:600;text-decoration:none">Reprendre : ' + esc(t) + " (" + Math.round((posAll[lastP].f || 0) * 100) + "%)</a>";
        target.insertAdjacentElement("afterend", w);
      }
    }
  }

  /* ---------- 3. surlignage + notes ---------- */
  function segOf(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    return el ? el.closest(".seg,.fr,.he,.comm,.intro,p,li,blockquote") : null;
  }
  function segIndex(seg) {
    var all = document.querySelectorAll(".seg,.fr,.he,.comm,.intro,p,li,blockquote");
    return Array.prototype.indexOf.call(all, seg);
  }
  function segByIndex(i) {
    var all = document.querySelectorAll(".seg,.fr,.he,.comm,.intro,p,li,blockquote");
    return all[i] || null;
  }
  var notes = lsGet("notes", []);
  function saveNotes() { lsSet("notes", notes); }

  function wrapQuote(seg, quote, id, hasNote) {
    var tw = document.createTreeWalker(seg, NodeFilter.SHOW_TEXT), n, buf = "", nodes = [];
    while ((n = tw.nextNode())) { nodes.push({ node: n, start: buf.length }); buf += n.nodeValue; }
    var at = buf.indexOf(quote); if (at < 0) return false;
    var end = at + quote.length;
    for (var i = nodes.length - 1; i >= 0; i--) {
      var it = nodes[i], ns = it.start, ne = ns + it.node.nodeValue.length;
      var s = Math.max(at, ns), e = Math.min(end, ne);
      if (s >= e) continue;
      var node2 = it.node;
      if (e < ne) node2.splitText(e - ns);
      var mid = s > ns ? node2.splitText(s - ns) : node2;
      var mark = document.createElement("mark");
      mark.className = "ann-mark" + (hasNote ? " ann-hasnote" : "");
      mark.dataset.annId = id;
      mid.parentNode.replaceChild(mark, mid);
      mark.appendChild(mid);
    }
    return true;
  }
  function renderNotes() {
    notes.forEach(function (a) {
      if (a.path !== PATH) return;
      if (document.querySelector('[data-ann-id="' + a.id + '"]')) return;
      var seg = segByIndex(a.seg);
      if (seg) wrapQuote(seg, a.quote, a.id, !!a.note);
    });
  }

  var bubble = null;
  function hideBubble() { if (bubble) { bubble.remove(); bubble = null; } }
  function onSelect() {
    hideBubble();
    var sel = getSelection();
    if (!sel || sel.isCollapsed || IS_INDEX) return;
    var txt = sel.toString().trim();
    if (txt.length < 2 || txt.length > 1200) return;
    var seg = segOf(sel.anchorNode); if (!seg || segIndex(seg) < 0) return;
    var r = sel.getRangeAt(0).getBoundingClientRect();
    bubble = document.createElement("div"); bubble.id = "ann-bubble";
    bubble.style.left = Math.max(8, r.left + scrollX + r.width / 2 - 70) + "px";
    bubble.style.top = (r.top + scrollY - 44) + "px";
    bubble.innerHTML = "<button data-k='h'>Surligner</button><button data-k='n'>Note</button>";
    bubble.addEventListener("mousedown", function (e) { e.preventDefault(); });
    bubble.onclick = function (e) {
      var k = e.target && e.target.dataset && e.target.dataset.k; if (!k) return;
      var a = { id: "a" + now().toString(36) + Math.floor(Math.random() * 999), path: PATH, title: document.title.slice(0, 90), seg: segIndex(seg), quote: txt.slice(0, 600), note: "", t: now(), he: /[֐-׿]/.test(txt) };
      if (k === "n") {
        askNote("", function (val) { if (val === null) return; a.note = val; notes.push(a); saveNotes(); wrapQuote(seg, a.quote, a.id, !!a.note); });
      } else { notes.push(a); saveNotes(); wrapQuote(seg, a.quote, a.id, false); }
      sel.removeAllRanges(); hideBubble();
    };
    document.body.appendChild(bubble);
  }
  document.addEventListener("mouseup", function () { setTimeout(onSelect, 10); });
  document.addEventListener("touchend", function () { setTimeout(onSelect, 200); });
  document.addEventListener("mousedown", function (e) { if (bubble && !bubble.contains(e.target)) hideBubble(); });

  function askNote(initial, cb) {
    var dlg = document.createElement("div"); dlg.id = "ann-note-dlg";
    dlg.innerHTML = "<div class='box'><b style='color:#1e3a5f'>Note</b><textarea>" + esc(initial) + "</textarea><div class='row'><button class='ko'>Annuler</button><button class='ok'>Enregistrer</button></div></div>";
    document.body.appendChild(dlg);
    var ta = dlg.querySelector("textarea"); ta.focus();
    dlg.querySelector(".ok").onclick = function () { var v = ta.value.trim(); dlg.remove(); cb(v); };
    dlg.querySelector(".ko").onclick = function () { dlg.remove(); cb(null); };
  }

  document.addEventListener("click", function (e) {
    var m = e.target.closest && e.target.closest(".ann-mark"); if (!m) return;
    var id = m.dataset.annId; var a = notes.find(function (x) { return x.id === id; }); if (!a) return;
    askNote(a.note || "", function (val) {
      if (val === null) return;
      if (val === "" && a.note === "") { /* rien */ }
      a.note = val; saveNotes();
      document.querySelectorAll('[data-ann-id="' + id + '"]').forEach(function (el) { el.classList.toggle("ann-hasnote", !!val); });
    });
  });

  /* ---------- 4. panneau Mes annotations ---------- */
  var fab = document.createElement("button"); fab.id = "ann-fab"; fab.title = "Mes annotations"; fab.textContent = "✎";
  fab.onclick = openPanel; document.body.appendChild(fab);

  function delNote(id) {
    notes = notes.filter(function (x) { return x.id !== id; }); saveNotes();
    document.querySelectorAll('[data-ann-id="' + id + '"]').forEach(function (el) {
      var p = el.parentNode; while (el.firstChild) p.insertBefore(el.firstChild, el); p.removeChild(el); p.normalize();
    });
  }
  function openPanel() {
    var old = document.getElementById("ann-panel"); if (old) { old.remove(); return; }
    var p = document.createElement("div"); p.id = "ann-panel";
    var here = notes.filter(function (a) { return a.path === PATH; });
    var elsewhere = notes.filter(function (a) { return a.path !== PATH; });
    function item(a, showLink) {
      return "<div class='ann-item' data-id='" + a.id + "'>" +
        (showLink ? "<a href='" + esc(a.path) + "'>" + esc((a.title || a.path).replace(/ [-|].*$/, "")) + "</a>" : "") +
        "<div class='ann-q" + (a.he ? "" : " ann-fr") + "'>" + esc(a.quote.slice(0, 220)) + (a.quote.length > 220 ? "..." : "") + "</div>" +
        (a.note ? "<div class='ann-n'>" + esc(a.note) + "</div>" : "") +
        "<div class='ann-meta'><span>" + new Date(a.t).toLocaleDateString("fr-FR") + "</span><button class='ann-del'>supprimer</button></div></div>";
    }
    p.innerHTML = "<header><b>Mes annotations (" + notes.length + ")</b><button id='ann-x'>×</button></header>" +
      "<div id='ann-list'>" +
      (here.length ? "<div style='font-weight:700;color:#1e3a5f;margin:2px 0 8px'>Sur cette page</div>" + here.map(function (a) { return item(a, false); }).join("") : "") +
      (elsewhere.length ? "<div style='font-weight:700;color:#1e3a5f;margin:12px 0 8px'>Ailleurs sur le site</div>" + elsewhere.sort(function (x, y) { return y.t - x.t; }).map(function (a) { return item(a, true); }).join("") : "") +
      (notes.length === 0 ? "<p style='color:#57534e;font-size:13.5px'>Selectionne un passage du texte puis choisis <b>Surligner</b> ou <b>Note</b>.<br><br>Tout reste dans ce navigateur : rien n'est envoye nulle part.</p>" : "") +
      "</div>" +
      "<div id='ann-tools'><button id='ann-exp' class='ann-primary'>Exporter</button><label for='ann-impf'>Importer</label><input id='ann-impf' type='file' accept='.json' style='display:none'><button id='ann-clear'>Tout effacer</button></div>";
    document.body.appendChild(p);
    p.querySelector("#ann-x").onclick = function () { p.remove(); };
    p.addEventListener("click", function (e) {
      if (e.target.classList.contains("ann-del")) {
        var id = e.target.closest(".ann-item").dataset.id; delNote(id); e.target.closest(".ann-item").remove();
        p.querySelector("header b").textContent = "Mes annotations (" + notes.length + ")";
      }
    });
    p.querySelector("#ann-exp").onclick = function () {
      var data = { notes: notes, pos: lsGet("pos", {}), done: lsGet("done", {}), exported: new Date().toISOString() };
      var blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "annotations-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
    };
    p.querySelector("#ann-impf").onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(r.result);
          if (d.notes) { var ids = {}; notes.forEach(function (a) { ids[a.id] = 1; }); d.notes.forEach(function (a) { if (!ids[a.id]) notes.push(a); }); saveNotes(); }
          if (d.pos) { var cur = lsGet("pos", {}); Object.keys(d.pos).forEach(function (k) { if (!cur[k] || d.pos[k].t > cur[k].t) cur[k] = d.pos[k]; }); lsSet("pos", cur); }
          if (d.done) { var cd = lsGet("done", {}); Object.keys(d.done).forEach(function (k) { if (d.done[k] === "lu" || !cd[k]) cd[k] = d.done[k]; }); lsSet("done", cd); }
          alert("Import reussi : " + (d.notes ? d.notes.length : 0) + " annotations fusionnees."); location.reload();
        } catch (err) { alert("Fichier illisible."); }
      };
      r.readAsText(f);
    };
    p.querySelector("#ann-clear").onclick = function () {
      if (confirm("Effacer TOUTES les annotations et positions de lecture de ce navigateur ?")) {
        ["notes", "pos", "done"].forEach(function (k) { localStorage.removeItem(NS + k); }); location.reload();
      }
    };
  }

  /* ---------- 5. drapeau "j'en suis la" + schema suivant ---------- */
  function toast(t) {
    var old = document.getElementById("ann-toast"); if (old) old.remove();
    var d = document.createElement("div"); d.id = "ann-toast"; d.textContent = t;
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.remove(); }, 2600);
  }
  function anchors() { return document.querySelectorAll(".seg,.fr,.he,.comm,.intro,p,li,blockquote"); }

  var flags = lsGet("flags", {});
  function flagHere() {
    var all = anchors(), best = -1;
    for (var i = 0; i < all.length; i++) {
      var r = all[i].getBoundingClientRect();
      if (r.top >= 60 && r.top < innerHeight * 0.6) { best = i; break; }
      if (r.top < 60) best = i;
    }
    var h = document.documentElement.scrollHeight - innerHeight;
    flags[PATH] = { i: best, f: h > 0 ? Math.round(scrollY / h * 1000) / 1000 : 0, t: now(), title: document.title.slice(0, 90) };
    lsSet("flags", flags); lsSet("lastflag", PATH);
    if (flagBtn) flagBtn.classList.add("set");
    toast("Marque-page pose ici");
  }
  function goFlag(fl) {
    var el = fl.i >= 0 ? anchors()[fl.i] : null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ann-flagline");
      setTimeout(function () { el.classList.remove("ann-flagline"); }, 2600);
    } else {
      var h = document.documentElement.scrollHeight - innerHeight;
      scrollTo({ top: (fl.f || 0) * h, behavior: "smooth" });
    }
    toast("Reprise a ton marque-page");
  }

  var flagBtn = null;
  if (!IS_INDEX) {
    flagBtn = document.createElement("button");
    flagBtn.id = "ann-flag"; flagBtn.title = "Mon marque-page"; flagBtn.textContent = "⚑";
    if (flags[PATH]) flagBtn.classList.add("set");
    flagBtn.onclick = function () {
      var old = document.getElementById("ann-flagmenu"); if (old) { old.remove(); return; }
      var fl = flags[PATH];
      if (!fl) { flagHere(); return; }
      var m = document.createElement("div"); m.id = "ann-flagmenu";
      m.innerHTML = "<button data-a='go'>Reprendre ici (" + Math.round((fl.f || 0) * 100) + "%)</button>" +
        "<button class='sec' data-a='set'>Marquer cette place</button>" +
        "<button class='sec' data-a='del'>Retirer le marque-page</button>";
      m.onclick = function (e) {
        var a = e.target && e.target.dataset && e.target.dataset.a; if (!a) return;
        if (a === "go") goFlag(fl);
        else if (a === "set") flagHere();
        else { delete flags[PATH]; lsSet("flags", flags); flagBtn.classList.remove("set"); toast("Marque-page retire"); }
        m.remove();
      };
      document.body.appendChild(m);
      setTimeout(function () {
        document.addEventListener("mousedown", function once(e) {
          if (!m.contains(e.target) && e.target !== flagBtn) m.remove();
          document.removeEventListener("mousedown", once);
        });
      }, 50);
    };
    document.body.appendChild(flagBtn);

    var figs = document.querySelectorAll("details.peda-svg, section.annexe-sec .annexe");
    if (figs.length) {
      var nb = document.createElement("button");
      nb.id = "ann-next"; nb.title = "Schema suivant";
      nb.innerHTML = "\u{1F5BC}️<b>" + figs.length + "</b>";
      var cur = -1, userMoved = true, quiet = 0;
      window.addEventListener("scroll", function () {
        if (now() > quiet) userMoved = true;   /* defilement du lecteur, pas le notre */
      }, { passive: true });
      nb.onclick = function () {
        var list = document.querySelectorAll("details.peda-svg, section.annexe-sec .annexe");
        var visible = [];
        for (var i = 0; i < list.length; i++) if (list[i].offsetParent !== null) visible.push(list[i]);
        if (!visible.length) { toast("Aucun schema affiche - active-les dans la barre du bas"); return; }
        /* on suit notre propre progression, sauf si le lecteur a defile ailleurs entre-temps */
        var next;
        if (!userMoved && cur >= 0) {
          next = cur + 1;
        } else {
          next = -1;
          for (var j = 0; j < visible.length; j++) {
            if (visible[j].getBoundingClientRect().top > 90) { next = j; break; }
          }
          if (next < 0) next = visible.length;   /* plus rien en dessous -> on boucle */
        }
        if (next >= visible.length) { next = 0; toast("Retour au premier schema"); }
        cur = next;
        var target = visible[next];
        if (target.tagName === "DETAILS") target.open = true;
        userMoved = false; quiet = now() + 1200;   /* nos propres defilements ne comptent pas */
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        nb.querySelector("b").textContent = (next + 1) + "/" + visible.length;
      };
      document.body.appendChild(nb);
    }
  }

  function indexFlagButton() {
    var lastP = lsGet("lastflag", null);
    var fl = lastP && lsGet("flags", {})[lastP];
    if (!fl || document.getElementById("ann-flag-idx")) return;
    var target = document.querySelector("#ann-resume-idx") || document.querySelector("h1,header");
    if (!target) return;
    var w = document.createElement("div"); w.id = "ann-flag-idx"; w.style.cssText = "text-align:center;margin:8px 0";
    w.innerHTML = '<a href="' + esc(lastP) + '?flag=1" style="display:inline-block;background:#b8860b;color:#fff;border-radius:999px;padding:8px 18px;font-size:13.5px;font-weight:600;text-decoration:none">⚑ Mon marque-page : ' +
      esc((fl.title || lastP).replace(/ [-|].*$/, "")) + " (" + Math.round((fl.f || 0) * 100) + "%)</a>";
    target.insertAdjacentElement("afterend", w);
  }

  /* si on arrive sur une page avec marque-page via le bouton de l'accueil, proposer la reprise */
  if (!IS_INDEX && flags[PATH] && /[?&]flag=1/.test(location.search)) setTimeout(function () { goFlag(flags[PATH]); }, 400);

  /* ---------- init ---------- */
  function init() { renderNotes(); decorateIndex(); indexFlagButton(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
