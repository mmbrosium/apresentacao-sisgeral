/* Portfólio de cases.
   Tudo que aparece na tela vem de cases.json e de cases/<id>/case.md.
   Para adicionar um case: crie a pasta, escreva o case.md, suba as imagens e
   acrescente um bloco em cases.json. Este arquivo não precisa mudar. */

(async function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const data = window.CASES;
  if (!data) {
    document.querySelector("main").insertAdjacentHTML("afterbegin", '<p style="color:#f2a65a">Não consegui ler o cases.js. Confira se o arquivo está na raiz e se não falta vírgula ou aspas.</p>');
    return;
  }

  const autor = data.autor || {};
  // ornamentos laterais (SVG inline, cor por CSS). Um desenho por categoria: grade, barras, circuito; trepadeira no Sobre e na inicial; engrenagens no changelog.
  const ORN_BY = { planilhas: "grade", dashboards: "barras", sistemas: "circuito", log: "engrenagens" };
  let ornCur = "?";
  const ORN_DENSE = true; // palavra de segurança: false volta pros damascos leves
  // cor do divisor: a cor da categoria, escurecida (cinza na inicial sem foco)
  const DIV_COLOR = { grade: "#2f7a52", barras: "#365f99", circuito: "#9a6a3a", vida: "#8a4536", engrenagens: "#257f8a" };
  const divisorCss = (svg, color) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace('fill="currentColor"', `fill="${color}"`))}")`;
  const setOrn = (kind) => {
    if (!window.ORN || kind === ornCur) return; ornCur = kind;
    const O2 = window.ORN2 || {};
    const set = kind ? (ORN_DENSE ? O2[kind] : (O2.leve || {})[kind]) : null;
    const col = (kind && DIV_COLOR[kind]) || "#55585f";
    document.documentElement.style.setProperty("--divline", col);
    if (O2.divisor) document.documentElement.style.setProperty("--divisor", divisorCss((kind && O2.divisores && O2.divisores[kind]) || O2.divisor, col));
    // crossfade: duas camadas, a nova entra enquanto a antiga some
    document.querySelectorAll(".orn").forEach((o) => {
      const svg = set ? (o.classList.contains("l") ? set.l : set.r) : (o.classList.contains("l") ? ORN.l : ORN.r);
      if (!o.querySelector(".layer")) { o.innerHTML = `<div class="layer on">${svg}</div><div class="layer"></div>`; return; }
      const on = o.querySelector(".layer.on"), off = o.querySelector(".layer:not(.on)");
      off.innerHTML = svg; void off.offsetWidth; off.classList.add("on"); on.classList.remove("on");
    });
  };
  setOrn(document.body.dataset.orn || (document.body.classList.contains("pg-log") ? "engrenagens" : document.body.classList.contains("pg-sobre") ? "vida" : null));
  // transição de página: entra com fade (CSS) e sai com fade ao clicar num link interno
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]"); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || a.target === "_blank") return;
    const href = a.getAttribute("href"); if (!href || href.startsWith("#") || /^(https?:|mailto:)/.test(href) || /\.(xlsx|pdf|zip)$/i.test(href)) return;
    e.preventDefault(); document.body.classList.add("leaving"); setTimeout(() => { location.href = href; }, 240);
  });

  // ---------- Idioma (PT-BR / EN-US) ----------
  // Campos com sufixo _en no cases.js, CASE_MD_EN / SOBRE_MD_EN nos textos. Sem tradução, cai no português.
  let lang = "pt";
  try { lang = localStorage.getItem("lang") === "en" ? "en" : "pt"; } catch (e) {}
  document.documentElement.lang = lang === "en" ? "en-US" : "pt-BR";
  const T = (o, k) => (lang === "en" && o && o[k + "_en"]) ? o[k + "_en"] : ((o || {})[k]);
  const UI = {
    pt: { cases: "Cases", about: "Sobre", aboutMe: "Sobre mim", open: "Abrir case", soon: "Em breve.", home: "Página inicial", back: "Voltar aos cases", full: "Ver o case completo →", loading: "Carregando…", notFound: "Case não encontrado", noText: "O texto deste case ainda não existe.", foot: "Feito em HTML, CSS e JavaScript, sem framework. Abre em qualquer navegador.", sndOn: "Som de interface (ligado)", sndOff: "Som de interface (desligado)", langBtn: "EN-US", langTitle: "Switch to English", logTitle: "O que mudou", logSub: "Versão, data e o que entrou. Mais recente primeiro.", logNow: "atual" },
    en: { cases: "Cases", about: "About", aboutMe: "About me", open: "Open case", soon: "Coming soon.", home: "Home", back: "Back to cases", full: "See the full case →", loading: "Loading…", notFound: "Case not found", noText: "This case has no text yet.", foot: "Built with HTML, CSS and JavaScript, no framework. Opens in any browser.", sndOn: "Interface sound (on)", sndOff: "Interface sound (off)", langBtn: "PT-BR", langTitle: "Mudar para português", logTitle: "What changed", logSub: "Version, date and what went in. Most recent first.", logNow: "current" },
  };
  const t = (k) => UI[lang][k];
  document.querySelectorAll("[data-ui]").forEach((el) => { el.textContent = t(el.dataset.ui); });
  (function langBtn() {
    const b = $("lang"); if (!b) return;
    // o botão mostra o idioma atual; clicar troca
    b.querySelector("img").src = lang === "en" ? "assets/flag-us.png" : "assets/flag-br.png";
    b.querySelector("span").textContent = lang === "en" ? "EN-US" : "PT-BR";
    b.title = t("langTitle");
    b.addEventListener("click", () => { try { localStorage.setItem("lang", lang === "en" ? "pt" : "en"); } catch (e) {} location.reload(); });
  })();

  // ---------- Som de interface (opcional, desligado por padrão) ----------
  // Tudo gerado pelo navegador com Web Audio: sem arquivo de áudio, sem licença.
  const snd = (() => {
    const btn = $("snd"); if (!btn) return null;
    let on = false, ctx = null;
    try { on = localStorage.getItem("som") === "1"; } catch (e) {}
    const paint = () => { btn.setAttribute("aria-pressed", String(on)); btn.title = on ? t("sndOn") : t("sndOff"); };
    const play = (freq, dur, gain, type) => {
      if (!on) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || "triangle"; o.frequency.setValueAtTime(freq, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + dur);
        g.gain.setValueAtTime(gain, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
      } catch (e) {}
    };
    const api = { hover: () => play(1400, 0.05, 0.025), click: () => play(620, 0.11, 0.05, "sine") };
    btn.addEventListener("click", () => { on = !on; try { localStorage.setItem("som", on ? "1" : "0"); } catch (e) {} paint(); if (on) api.click(); });
    paint();
    let last = null;
    document.addEventListener("mouseover", (e) => { const el = e.target.closest(".case-btn, .topnav a, .links a, .case .go, .back, .lang, .nav-log"); if (el && el !== last) api.hover(); last = el; });
    document.addEventListener("click", (e) => { if (e.target.closest(".case-btn, .topnav a, .links a, .case .go, .back, .lang, .nav-log")) api.click(); });
    return api;
  })();
  if ($("foot-nome")) $("foot-nome").textContent = autor.nome || "";
  // ⌂ e o nome na barra levam pro início limpo; só o ← devolve pro foco em que o visitante estava
  document.addEventListener("click", (e) => { const a = e.target.closest("a.nav-ico:not(#nav-back), a.brand"); if (!a) return; try { sessionStorage.setItem("focus", ""); } catch (e2) {} }, true);

  // Diamantes pixel: um por categoria do case, na cor da coluna (só quando o case está em mais de uma)
  const gemas = (c) => (c.categorias || []).length > 1 ? `<span class="gems">${(c.categorias || []).map((k) => `<i class="gem" data-cat="${esc(k)}" title="${esc(T((data.categorias || []).find((x) => x.id === k) || {}, "titulo") || k)}">${window.ORN ? ORN.gema : "◆"}</i>`).join("")}</span>` : "";
  // ---------- Página inicial ----------
  if ($("cols")) {
    document.title = `${autor.nome || "Portfólio"} · ${t("cases")}`;
    $("nome").textContent = autor.nome || "";
    $("brand").textContent = autor.nome || "";
    $("cargo").textContent = T(autor, "cargo") || "";
    $("desc").textContent = T(autor, "descricao") || "";
    $("links").innerHTML = (autor.links || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.rotulo)}</a>`).join("")
      + (autor.sobre === false ? "" : `<a href="sobre.html" class="sobre-link">${t("aboutMe")}</a>`);

    // "Por onde começar": os três cases de entrada, em cases.js (autor.comecar)
    if ($("start") && (autor.comecar || []).length) {
      const itens = autor.comecar.map((id) => (data.cases || []).find((x) => x.id === id)).filter(Boolean);
      $("start").innerHTML = `<span class="start-l">${lang === "en" ? "Two minutes? Start here:" : "Dois minutos? Comece por aqui:"}</span>` + itens.map((c) => `<a href="case.html?c=${encodeURIComponent(c.id)}" data-cat="${esc((c.categorias || [])[0])}">${window.ORN ? `<i class="gem" data-cat="${esc((c.categorias || [])[0])}">${ORN.gema}</i>` : ""}${esc(T(c, "nome") || T(c, "titulo"))}<small>${esc(T(c, "curto") || "")}</small></a>`).join("");
      $("start").hidden = false;
    }
    const cats = data.categorias || [];
    $("topnav").innerHTML = `<a href="#hero" class="nav-ico" id="nav-home" title="${t("home")}" aria-label="${t("home")}">⌂</a>` + cats.map((cat) => `<a href="#cat-${esc(cat.id)}" data-cat="${esc(cat.id)}">${esc(T(cat, "titulo"))}</a>`).join("")
      + (autor.sobre === false ? "" : `<a href="sobre.html" class="nav-sobre">${t("about")}</a>`);

    $("cols").innerHTML = cats.map((cat, ci) => {
      const itens = (data.cases || []).filter((c) => (c.categorias || []).includes(cat.id));
      const lis = itens.map((c) => {
        // Card de uma categoria secundária: abre direto o arquivo (link_<cat>) ou só aquela seção do case (ancora_<cat>).
        const href = c[`link_${cat.id}`] ? c[`link_${cat.id}`]
          : c[`ancora_${cat.id}`] ? `case.html?c=${encodeURIComponent(c.id)}&sec=${encodeURIComponent(c[`ancora_${cat.id}`])}`
          : `case.html?c=${encodeURIComponent(c.id)}`;
        const capaArq = c[`capa_${cat.id}`] || c.capa;
        const capa = capaArq ? `<img class="capa" src="cases/${encodeURIComponent(c.id)}/${esc(capaArq)}" alt="" loading="lazy">` : "";
        return `<li class="case" data-href="${esc(href)}" data-id="${esc(c.id)}" data-capa="${capaArq ? `cases/${encodeURIComponent(c.id)}/${esc(capaArq)}` : ""}" data-cat="${esc(cat.id)}">
          <button type="button" class="case-btn" aria-expanded="false">
            <span class="t">${esc(T(c, "nome") || T(c, "curto") || T(c, "titulo"))}${gemas(c)}</span>
            <span class="m">${T(c, "nome") ? esc(T(c, "curto") || "") + " · " : ""}${esc(c.empresa || "")}</span>
            <span class="r2">${esc(T(c, "resumo") || "")}</span>
          </button>
          <div class="drawer"><div class="drawer-in">
            ${capa}
            <p class="r">${esc(T(c, "resumo") || "")}</p>
            ${T(c, "destaque") ? `<span class="d">${esc(T(c, "destaque"))}</span>` : ""}
            <a class="go" href="${esc(href)}">${t("open")}</a>
          </div></div>
        </li>`;
      }).join("");
      return `<section class="col" id="cat-${esc(cat.id)}" data-cat="${esc(cat.id)}" style="--i:${ci}">
        <div class="col-head"><h2>${esc(T(cat, "titulo"))}</h2>
        <p class="sub">${esc(T(cat, "sub") || "")}</p></div>
        ${lis ? `<ul>${lis}</ul>` : `<p class="vazio">${t("soon")}</p>`}
      </section>`;
    }).join("");

    // Gaveta animada por altura (funciona em qualquer navegador)
    const openCard = (li) => {
      const d = li.querySelector(".drawer");
      li.classList.add("open"); li.querySelector(".case-btn").setAttribute("aria-expanded", "true");
      d.style.maxHeight = d.scrollHeight + "px";
      const done = () => { if (li.classList.contains("open")) d.style.maxHeight = "none"; d.removeEventListener("transitionend", done); };
      d.addEventListener("transitionend", done);
      d.querySelectorAll("img").forEach((im) => { if (!im.complete) im.addEventListener("load", () => { if (li.classList.contains("open") && d.style.maxHeight !== "none") d.style.maxHeight = d.scrollHeight + "px"; }, { once: true }); });
    };
    const closeCard = (li) => {
      const d = li.querySelector(".drawer");
      d.style.maxHeight = d.scrollHeight + "px"; void d.offsetHeight; d.style.maxHeight = "0px";
      li.classList.remove("open"); li.querySelector(".case-btn").setAttribute("aria-expanded", "false");
    };
    const closeAll = () => document.querySelectorAll(".case.open").forEach(closeCard);
    // Gaveta: 1º clique abre, 2º clique no título abre a página do case.
    $("cols").addEventListener("click", (e) => {
      const btn = e.target.closest(".case-btn"); if (!btn) return;
      const li = btn.closest(".case");
      if (li.classList.contains("open")) { location.href = li.dataset.href; return; }
      closeAll();
      openCard(li);
    });
    // Fecha ao clicar fora de qualquer card
    document.addEventListener("click", (e) => { if (!e.target.closest(".case")) closeAll(); });

    // ---------- Foco por categoria ----------
    // Clique na barra: a categoria ocupa a tela, as outras recuam e somem. Clique de novo (ou "× ver tudo") volta às colunas.
    const links = [...document.querySelectorAll("#topnav a[data-cat]")];
    const setActive = (id) => links.forEach((a) => a.classList.toggle("on", a.dataset.cat === id));
    const cols = [...document.querySelectorAll(".col")];
    const all = document.createElement("a"); all.href = "#"; all.className = "nav-all"; all.textContent = lang === "en" ? "all" : "tudo"; all.hidden = true;
    $("topnav").insertBefore(all, $("topnav").querySelector(".nav-sobre"));
    let focus = null, timer = 0;
    const pop = document.createElement("div"); pop.className = "pop"; document.body.appendChild(pop);
    const hidePop = () => pop.classList.remove("on");
    const showPop = (li) => {
      if (!focus || matchMedia("(max-width: 860px)").matches) return;
      const c = (data.cases || []).find((x) => x.id === li.dataset.id); if (!c) return;
      pop.style.setProperty("--c", `var(--${li.dataset.cat})`);
      pop.innerHTML = `${li.dataset.capa ? `<img src="${esc(li.dataset.capa)}" alt="">` : ""}<p class="pt">${esc(T(c, "nome") ? T(c, "nome") + " · " + T(c, "titulo") : T(c, "titulo"))}</p><p class="pm">${esc(c.empresa || "")}</p>${T(c, "destaque") ? `<span class="pd">${esc(T(c, "destaque"))}</span>` : ""}${T(c, "ferramentas") ? `<p class="pf">${esc(T(c, "ferramentas"))}</p>` : ""}`;
      const r = li.getBoundingClientRect(); const col = li.closest(".col").getBoundingClientRect();
      const left = col.right + 18 + 340 <= innerWidth - 8 ? col.right + 18 : Math.max(8, innerWidth - 348);
      pop.style.left = `${left + scrollX}px`; pop.style.top = `${r.top + scrollY}px`;
      pop.classList.add("on");
    };
    const setFocus = (id) => {
      clearTimeout(timer); hidePop();
      closeAll();
      focus = id; setActive(id); all.hidden = !id;
      if (id) document.body.dataset.focus = id; else delete document.body.dataset.focus;
      setOrn(id ? ORN_BY[id] : null);
      if (!id) {
        $("cols").classList.remove("focus");
        cols.forEach((el) => { el.classList.remove("gone", "wide"); el.classList.add("away"); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("away"))); });
        return;
      }
      cols.forEach((el) => { if (el.dataset.cat !== id) el.classList.add("away"); });
      timer = setTimeout(() => {
        cols.forEach((el) => { const me = el.dataset.cat === id; el.classList.toggle("gone", !me); el.classList.toggle("wide", me); el.classList.remove("away"); });
        $("cols").classList.add("focus");
        $("cols").scrollIntoView({ behavior: "smooth", block: "start" });
      }, 260);
      try { history.replaceState(null, "", `#cat-${id}`); sessionStorage.setItem("focus", id); } catch (e) {}
    };
    links.forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); setFocus(focus === a.dataset.cat ? null : a.dataset.cat); }));
    all.addEventListener("click", (e) => { e.preventDefault(); setFocus(null); try { history.replaceState(null, "", location.pathname); sessionStorage.setItem("focus", ""); } catch (e2) {} });
    $("nav-home").addEventListener("click", (e) => { e.preventDefault(); if (focus) setFocus(null); try { history.replaceState(null, "", location.pathname); sessionStorage.setItem("focus", ""); } catch (e2) {} window.scrollTo({ top: 0, behavior: "smooth" }); });
    // janela flutuante: hover mostra; card aberto mantém; clique fora fecha
    $("cols").addEventListener("mouseover", (e) => { const li = e.target.closest(".case"); if (li && focus) showPop(li); });
    $("cols").addEventListener("mouseleave", () => { if (!document.querySelector(".case.open")) hidePop(); });
    $("cols").addEventListener("mouseover", (e) => { if (!e.target.closest(".case") && !document.querySelector(".case.open")) hidePop(); });
    document.addEventListener("click", (e) => { if (!e.target.closest(".case")) hidePop(); });
    // link direto index.html#cat-planilhas abre já em foco
    // link direto (#cat-x) ou o foco em que o visitante estava antes de abrir um case
    let h = (location.hash || "").replace("#cat-", "");
    if (!h) { try { h = sessionStorage.getItem("focus") || ""; } catch (e) {} }
    if (h && cols.some((el) => el.dataset.cat === h)) setFocus(h);
    return;
  }

  // ---------- Página "Changelog" ----------
  // Lista em changelog.js (window.CHANGELOG). Mais recente primeiro.
  if ($("log-md")) {
    if ($("brand")) $("brand").textContent = autor.nome || "";
    document.title = `Changelog · ${autor.nome || ""}`;
    const fmtD = (d) => { const [y, m, dd] = d.split("-"); return lang === "en" ? `${y}-${m}-${dd}` : `${dd}/${m}/${y}`; };
    $("log-md").innerHTML = (window.CHANGELOG || []).map((v) => `<section class="ver"><div class="vh" data-atual="${esc(t("logNow"))}">v${esc(v.versao)}<small>${esc(fmtD(v.data))}</small></div><ul>${((lang === "en" && v.itens_en) || v.itens || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul></section>`).join("");
    if ($("topnav")) $("topnav").innerHTML = `<a href="index.html" class="nav-ico" title="${t("home")}" aria-label="${t("home")}">⌂</a>` + (data.categorias || []).map((cat) => `<a href="index.html#cat-${esc(cat.id)}" data-cat="${esc(cat.id)}">${esc(T(cat, "titulo"))}</a>`).join("") + (autor.sobre === false ? "" : `<a href="sobre.html" class="nav-sobre">${t("about")}</a>`);
    return;
  }

  // ---------- Página "Sobre" ----------
  // Texto em sobre.js (window.SOBRE_MD). Cada "##" vira uma seção e um item da barra.
  if ($("sobre-md")) {
    if ($("brand")) $("brand").textContent = autor.nome || "";
    $("s-nome").textContent = autor.nome || "";
    $("s-cargo").textContent = T(autor, "cargo") || "";
    document.title = `${t("about")} · ${autor.nome || ""}`;
    const slugOf = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const r = new marked.Renderer();
    r.heading = function (text, level) {
      const raw = typeof text === "object" ? text.text : text;
      const lvl = typeof text === "object" ? text.depth : level;
      const m = raw.match(/^(.*?)\s*\{([^}]+)\}\s*$/); // "Título {Curto}"
      const txt = m ? m[1] : raw;
      return `<h${lvl} id="${slugOf(txt)}"${m ? ` data-curto="${esc(m[2])}"` : ""}>${typeof text === "object" ? marked.parseInline(txt) : txt}</h${lvl}>`;
    };
    marked.use({ renderer: r, gfm: true, breaks: false });
    const root = $("sobre-md");
    root.innerHTML = marked.parse((lang === "en" && window.SOBRE_MD_EN) ? window.SOBRE_MD_EN : (window.SOBRE_MD || ""));
    const nodes = [...root.childNodes]; root.innerHTML = "";
    let sec = null; const secs = [];
    nodes.forEach((n) => {
      if (n.nodeType === 1 && n.tagName === "H2") { sec = document.createElement("section"); sec.className = "sec"; sec.id = "sec-" + n.id; sec.appendChild(n); root.appendChild(sec); secs.push({ id: n.id, titulo: n.dataset.curto || n.textContent }); return; }
      if (!sec) { sec = document.createElement("section"); sec.className = "sec"; root.appendChild(sec); }
      sec.appendChild(n);
    });
    root.querySelectorAll("a[href^='http'], a[href^='mailto']").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
    (window.SOBRE_FOTOS || []).forEach((src, i) => {
      const sec = root.querySelectorAll(".sec")[i]; if (!sec) return;
      const f = document.createElement("figure"); const flor = ["vermelho", "roxo", "amarelo"][i % 3];
      f.className = "foto " + (i % 2 ? "r" : "l") + " f-" + flor;
      const fl = (window.ORN2 && ORN2.cantos && ORN2.cantos[flor]) || (window.ORN ? ORN.canto : "");
      f.innerHTML = `<img src="${esc(src)}" alt="" loading="lazy"><span class="canto tr">${fl}</span><span class="canto bl">${fl}</span>`;
      const h2 = sec.querySelector("h2"); h2 ? h2.insertAdjacentElement("afterend", f) : sec.prepend(f);
    });
    if ($("topnav")) {
      $("topnav").innerHTML = `<a href="index.html" class="nav-ico" title="${t("home")}" aria-label="${t("home")}">⌂</a>`
        + secs.map((s, i) => `<a href="#${esc(s.id)}" data-sec="${esc(s.id)}" class="${i === 0 ? "on" : ""}">${esc(s.titulo)}</a>`).join("");
      const links = [...document.querySelectorAll("#topnav a[data-sec]")];
      let lock = 0;
      $("topnav").addEventListener("click", (e) => {
        const a = e.target.closest("a[data-sec]"); if (!a) return;
        e.preventDefault();
        const el = document.getElementById(a.dataset.sec); if (!el) return;
        el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        lock = Date.now() + 1200;
        links.forEach((x) => x.classList.toggle("on", x === a));
      });
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((ents) => {
          if (Date.now() < lock) return;
          const topo = ents.filter((x) => x.isIntersecting).sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top)[0];
          if (!topo) return;
          links.forEach((a) => { const on = a.dataset.sec === topo.target.id; a.classList.toggle("on", on); if (on) a.scrollIntoView({ block: "nearest", inline: "center" }); });
        }, { rootMargin: "-60px 0px -70% 0px" });
        links.forEach((a) => { const el = document.getElementById(a.dataset.sec); if (el) io.observe(el); });
      }
    }
    if (location.hash) { const el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 50); }
    return;
  }

  // ---------- Página de case ----------
  const id = new URLSearchParams(location.search).get("c");
  const c = (data.cases || []).find((x) => x.id === id);
  if (!c) {
    $("c-titulo").textContent = t("notFound");
    $("md").innerHTML = `<p><code>${esc(id)}</code> · cases.js</p>`;
    return;
  }
  if ($("brand")) $("brand").textContent = autor.nome || "";
  const secOnly = new URLSearchParams(location.search).get("sec");
  if ($("topnav")) {
    const cats = c.categorias || [];
    // Só as categorias do case. Primeira = topo do case; outras = arquivo próprio (link_<cat>) ou a seção (ancora_<cat>).
    // Dentro do case, toda aba desce pra seção correspondente (a primeira = topo; "dashboards" = seção #dashboard, salvo ancora_<cat>).
    // O arquivo do dashboard (link_<cat>) fica num botão ao lado do título da seção.
    const links = (data.categorias || []).filter((k) => cats.includes(k.id)).map((k) => {
      if (k.id === cats[0]) return `<a href="#topo" data-cat="${esc(k.id)}" data-dentro="1" class="${secOnly ? "" : "on"}">${esc(T(k, "titulo"))}</a>`;
      const anc = c[`ancora_${k.id}`] || (k.id === "dashboards" ? "dashboard" : "topo");
      return `<a href="#${esc(anc)}" data-cat="${esc(k.id)}" data-dentro="1" class="${secOnly === anc ? "on" : ""}">${esc(T(k, "titulo"))}</a>`;
    });
    $("topnav").innerHTML = `<a href="index.html" class="nav-ico" title="${t("home")}" aria-label="${t("home")}">⌂</a><a href="index.html" class="nav-ico" id="nav-back" title="${t("back")}" aria-label="${t("back")}">←</a>` + links.join("");
    // "voltar" (barra e links) volta pra onde o visitante estava: a inicial guarda o foco no #hash, então history.back() restaura
    // (a inicial restaura sozinha o foco em que o visitante estava, via sessionStorage)
    $("topnav").addEventListener("click", (e) => {
      const a = e.target.closest("a[data-dentro='1']"); if (!a) return;
      e.preventDefault();
      const el = document.getElementById(a.getAttribute("href").slice(1)); if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      $("topnav").querySelectorAll("a").forEach((x) => x.classList.toggle("on", x === a));
      if (a.dataset.cat) window.setCaseCat && setCaseCat(a.dataset.cat);
    });
  }
  const catId = (c.categorias || [])[0] || "planilhas";
  let catCur = null;
  // A página assume a categoria da seção visível: cor, rótulo do topo, damasco e divisor
  window.setCaseCat = (k) => {
    if (k === catCur) return; catCur = k;
    const kat = (data.categorias || []).find((x) => x.id === k) || {};
    $("topo").style.setProperty("--c", `var(--${k})`); $("md").style.setProperty("--c", `var(--${k})`);
    document.body.dataset.focus = k; setOrn(ORN_BY[k]);
    $("c-cat").innerHTML = `${esc(T(kat, "titulo") || "")}${gemas(c)}`;
    $("topnav").querySelectorAll("a[data-cat]").forEach((x) => x.classList.toggle("on", x.dataset.cat === k));
  };
  setCaseCat(catId);
  $("c-titulo").innerHTML = T(c, "nome") ? `${esc(T(c, "nome"))}<small>${esc(T(c, "titulo"))}</small>` : esc(T(c, "titulo"));
  document.title = `${T(c, "nome") || T(c, "curto") || T(c, "titulo")} · ${autor.nome || ""}`;
  $("c-meta").innerHTML = `${c.empresa ? `<b>${esc(c.empresa)}</b>` : ""}${T(c, "ferramentas") ? ` · ${esc(T(c, "ferramentas"))}` : ""}`;
  if (T(c, "destaque")) { $("c-destaque").textContent = T(c, "destaque"); $("c-destaque").hidden = false; }
  if ($("c-capa") && c.capa) { $("c-capa").src = `cases/${encodeURIComponent(c.id)}/${c.capa}`; $("c-capa").hidden = false; }

  // O texto do case vem de cases/<id>/case.js (Markdown dentro de um script, pra funcionar aberto local).
  const md = await new Promise((resolve) => {
    const sc = document.createElement("script");
    sc.src = `cases/${encodeURIComponent(c.id)}/case.js`;
    sc.onload = () => resolve((lang === "en" && (window.CASE_MD_EN || {})[c.id]) || (window.CASE_MD || {})[c.id] || "");
    sc.onerror = () => resolve(null);
    document.head.appendChild(sc);
  });
  if (md === null || !md.trim()) {
    $("md").innerHTML = `<p>${t("noText")}</p>`;
    return;
  }

  // Imagens: caminho relativo à pasta do case, legenda vira figcaption, clique amplia.
  const renderer = new marked.Renderer();
  renderer.image = function (href, title, text) {
    const h = typeof href === "object" ? href.href : href;
    const t = typeof href === "object" ? href.text : text;
    const src = /^(https?:)?\/\//.test(h) ? h : `cases/${encodeURIComponent(c.id)}/${h}`;
    return `<figure class="md-wide"><img src="${esc(src)}" alt="${esc(t)}" loading="lazy" data-zoom>${t ? `<figcaption>${esc(t)}</figcaption>` : ""}</figure>`;
  };
  // Títulos ganham id pra âncora (#dashboard, #resultado...)
  renderer.heading = function (text, level) {
    const txt = typeof text === "object" ? text.text : text;
    const lvl = typeof text === "object" ? text.depth : level;
    const slug = String(txt).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `<h${lvl} id="${slug}">${typeof text === "object" ? marked.parseInline(txt) : txt}</h${lvl}>`;
  };
  marked.use({ renderer, gfm: true, breaks: false });
  // Parágrafo só com imagem não deve ficar dentro de <p>
  $("md").innerHTML = marked.parse(md).replace(/<p>(<figure[\s\S]*?<\/figure>)<\/p>/g, "$1");
  (function agrupar() {
    const root = $("md"); const nodes = [...root.childNodes]; root.innerHTML = "";
    let sec = null;
    nodes.forEach((n) => {
      if (n.nodeType === 1 && n.tagName === "H2") { sec = document.createElement("section"); sec.className = "sec"; sec.id = "sec-" + n.id; sec.appendChild(n); root.appendChild(sec); return; }
      if (!sec) { sec = document.createElement("section"); sec.className = "sec"; root.appendChild(sec); }
      sec.appendChild(n);
    });
  })();
  // Modo "só uma seção" (case.html?c=psat&sec=dashboard): mostra o cabeçalho e aquela seção, com link pro case completo.
  if (secOnly) {
    const alvo = document.getElementById("sec-" + secOnly);
    if (alvo) {
      document.querySelectorAll("#md .sec").forEach((x) => { if (x !== alvo) x.hidden = true; });
      const mais = document.createElement("p"); mais.className = "ver-mais";
      const a = document.createElement("a"); a.href = `case.html?c=${encodeURIComponent(c.id)}`; a.textContent = t("full"); mais.appendChild(a); $("md").appendChild(mais);
      const k = (c.categorias || []).find((x) => c[`ancora_${x}`] === secOnly); if (k) { $("topo").style.setProperty("--c", `var(--${k})`); $("md").style.setProperty("--c", `var(--${k})`); }
    }
  }
  // Botão "abrir o dashboard" ao lado do título da seção, quando o case tem arquivo de dashboard
  (c.categorias || []).slice(1).forEach((k) => {
    const anc = c[`ancora_${k}`] || (k === "dashboards" ? "dashboard" : null); const h = anc && document.getElementById(anc); if (!h) return;
    if (c[`link_${k}`]) { const a = document.createElement("a"); a.className = "h2-go"; a.href = c[`link_${k}`]; a.textContent = lang === "en" ? "Open the dashboard →" : "Abrir o dashboard →"; h.appendChild(a); }
  });
  // Ao rolar, a seção visível define a categoria da página (verde nas planilhas, azul no dashboard)
  (function spy() {
    const links = [...document.querySelectorAll("#topnav a[data-dentro='1']")];
    const alvos = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
    if (!("IntersectionObserver" in window) || alvos.length < 2) return;
    const catOf = (id) => (links.find((a) => a.getAttribute("href") === "#" + id) || {}).dataset?.cat;
    // a seção da outra categoria vai de "#<ancora>" até o próximo h2 de seção da primeira categoria (ou o fim)
    const secs = alvos.map((el) => el.closest(".sec") || el);
    const io = new IntersectionObserver(() => {
      const y = 70; let atual = alvos[0];
      alvos.forEach((el, i) => { const r = (secs[i]).getBoundingClientRect(); if (r.top <= y) atual = el; });
      // dentro da seção "dashboard" até o fim dela: só muda de volta se passou do fim da seção
      const k = catOf(atual.id); if (k) setCaseCat(k);
    }, { rootMargin: "-70px 0px -60% 0px", threshold: [0, .01, .5, 1] });
    alvos.forEach((el) => io.observe(el.closest(".sec") || el));
    window.addEventListener("scroll", () => { let atual = alvos[0]; alvos.forEach((el, i) => { if (secs[i].getBoundingClientRect().top <= 70) atual = el; }); const k = catOf(atual.id); if (k) setCaseCat(k); }, { passive: true });
  })();

  // Lightbox
  // Lightbox simples (substituído pela lupa em lupa.js quando ela está na página)
  const lb = $("lb"), lbImg = $("lb-img");
  if (lb) {
    $("md").addEventListener("click", (e) => {
      const img = e.target.closest("img[data-zoom]"); if (!img) return;
      lbImg.src = img.src; lbImg.alt = img.alt; lb.classList.add("on");
    });
    lb.addEventListener("click", () => lb.classList.remove("on"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") lb.classList.remove("on"); });
  }

  // Âncora na URL (ex.: case.html?c=psat#dashboard)
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 50);
  }
})();
