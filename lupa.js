// Lupa: toda tela de um case abre ampliada com um clique (zoom, roda do mouse, setas).
// Telas com "pontos explicados" ganham números; passar o mouse (ou tocar) explica cada parte.
// Os pontos ficam em cases/<id>/pontos.js (window.CASE_PONTOS[id]) ou em window.PONTOS (página avulsa),
// no formato [x, y, largura, altura, título, texto, título EN, texto EN], em % da imagem.
(function () {
  const root = document.getElementById("md") || document.getElementById("sobre-md"); if (!root) return;
  let lang = "pt"; try { lang = localStorage.getItem("lang") === "en" ? "en" : "pt"; } catch (e) {}
  const EN = lang === "en";
  const S = EN
    ? { amp: "enlarge", pts: (n) => `${n} notes`, hint: (n) => `<b>${n} notes</b> · hover or tap to read`, hint0: "click the image to zoom in · mouse wheel works too", fit: "fit", notes: "notes", close: "Close (Esc)", prev: "Previous (←)", next: "Next (→)", zin: "Zoom in (+)", zout: "Zoom out (-)", title: "Click to enlarge", dlg: "Enlarged screen" }
    : { amp: "ampliar", pts: (n) => `${n} pontos explicados`, hint: (n) => `<b>${n} pontos</b> · passe o mouse ou toque pra ler`, hint0: "clique na imagem pra aproximar · roda do mouse também", fit: "ajustar", notes: "pontos", close: "Fechar (Esc)", prev: "Anterior (←)", next: "Próxima (→)", zin: "Aumentar (+)", zout: "Diminuir (-)", title: "Clique pra ampliar", dlg: "Tela ampliada" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const caseId = new URLSearchParams(location.search).get("c");
  const base = (s) => decodeURIComponent(s || "").split("/").pop();
  const pontosDe = (im) => {
    const src = im.getAttribute("src") || "";
    const local = (window.CASE_PONTOS || {})[caseId] || {};
    return local[base(src)] || (window.PONTOS || {})[decodeURIComponent(src)] || (window.PONTOS || {})[base(src)] || [];
  };

  let imgs = [], cur = -1, zi = 0, fitW = 0, nat = [0, 0];
  const ZOOMS = [1, 1.5, 2, 3];

  // A lupa (uma só, criada na primeira vez)
  const lb = document.createElement("div"); lb.className = "lupa"; lb.id = "lupa"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", S.dlg);
  lb.innerHTML = `<div class="lupa-bar"><span class="lupa-cap"></span><span class="lupa-tools"><button data-z="-" title="${S.zout}">−</button><span class="lupa-z">100%</span><button data-z="+" title="${S.zin}">+</button><button data-z="0" title="${S.fit} (0)">${S.fit}</button><button data-pts title="(p)">${S.notes}</button><button data-x title="${S.close}">✕</button></span></div>
    <div class="lupa-scroll"><div class="lupa-stage"><img alt=""><div class="lupa-pts"></div></div></div>
    <div class="lupa-foot"><button data-nav="-1" title="${S.prev}">‹</button><span class="lupa-n"></span><button data-nav="1" title="${S.next}">›</button><span class="lupa-hint"></span></div>`;
  document.body.appendChild(lb);
  const scroll = lb.querySelector(".lupa-scroll"), stage = lb.querySelector(".lupa-stage"), img = stage.querySelector("img"), ptsBox = lb.querySelector(".lupa-pts");
  const cap = lb.querySelector(".lupa-cap"), zl = lb.querySelector(".lupa-z"), nl = lb.querySelector(".lupa-n"), hint = lb.querySelector(".lupa-hint");

  function fit() {
    if (!nat[0]) return;
    const aw = scroll.clientWidth - 32, ah = scroll.clientHeight - 32;
    fitW = Math.max(200, Math.min(aw, nat[0] * ah / nat[1], nat[0] * 1.6));
  }
  function apply(anchor) {
    const old = stage.offsetWidth || fitW;
    const w = Math.round(fitW * ZOOMS[zi]);
    const ax = anchor ? anchor[0] : scroll.clientWidth / 2, ay = anchor ? anchor[1] : scroll.clientHeight / 2;
    const sx = scroll.scrollLeft + ax, sy = scroll.scrollTop + ay;
    const r = w / old;
    stage.style.width = w + "px";
    stage.classList.toggle("max", zi === ZOOMS.length - 1);
    scroll.scrollLeft = sx * r - ax; scroll.scrollTop = sy * r - ay;
    zl.textContent = Math.round(100 * w / nat[0]) + "%";
    lb.querySelector('[data-z="-"]').disabled = zi === 0;
    lb.querySelector('[data-z="+"]').disabled = zi === ZOOMS.length - 1;
  }
  function pontos(pts) {
    ptsBox.innerHTML = pts.map((p, i) => {
      const t = EN && p[6] ? p[6] : p[4], s = EN && p[7] ? p[7] : p[5];
      return `<div class="pt${p[1] + p[3] > 72 ? " up" : ""}${p[0] > 62 ? " left" : ""}" style="left:${p[0]}%;top:${p[1]}%;width:${p[2]}%;height:${p[3]}%"><i>${i + 1}</i><div class="tip"><b>${esc(t)}</b>${esc(s)}</div></div>`;
    }).join("");
    hint.innerHTML = pts.length ? S.hint(pts.length) : S.hint0;
    lb.querySelector("[data-pts]").style.display = pts.length ? "" : "none";
  }
  function show(i) {
    cur = (i + imgs.length) % imgs.length;
    const im = imgs[cur]; const pts = pontosDe(im);
    cap.textContent = im.getAttribute("alt") || "";
    nl.textContent = `${cur + 1} / ${imgs.length}`;
    zi = 0;
    const c = getComputedStyle(root).getPropertyValue("--c").trim(); if (c) lb.style.setProperty("--c", c);
    lb.classList.add("on"); document.body.style.overflow = "hidden";
    img.src = im.src; ptsBox.innerHTML = "";
    const go = () => { nat = [img.naturalWidth, img.naturalHeight]; fit(); stage.style.width = fitW + "px"; apply(); pontos(pts); };
    img.complete && img.naturalWidth ? go() : (img.onload = go);
  }
  function close() { lb.classList.remove("on"); document.body.style.overflow = ""; }

  lb.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) {
      if (b.dataset.x !== undefined) return close();
      if (b.dataset.nav) return show(cur + +b.dataset.nav);
      if (b.dataset.pts !== undefined) { lb.classList.toggle("sem"); return; }
      if (b.dataset.z === "+") zi = Math.min(zi + 1, ZOOMS.length - 1); else if (b.dataset.z === "-") zi = Math.max(zi - 1, 0); else zi = 0;
      return apply();
    }
    const pt = e.target.closest(".pt");
    if (pt) { if (e.target.closest(".tip")) return; const on = pt.classList.contains("on"); ptsBox.querySelectorAll(".pt.on").forEach((x) => x.classList.remove("on")); if (!on) pt.classList.add("on"); return; }
    if (e.target === img) { const r = scroll.getBoundingClientRect(); zi = zi === ZOOMS.length - 1 ? 0 : zi + 1; return apply([e.clientX - r.left, e.clientY - r.top]); }
    if (e.target === scroll || e.target === stage) close();
  });
  scroll.addEventListener("wheel", (e) => {
    if (!lb.classList.contains("on")) return;
    const r = scroll.getBoundingClientRect(); const nz = e.deltaY < 0 ? Math.min(zi + 1, ZOOMS.length - 1) : Math.max(zi - 1, 0);
    if (nz === zi && (zi === 0 || e.deltaY < 0)) return;
    e.preventDefault(); zi = nz; apply([e.clientX - r.left, e.clientY - r.top]);
  }, { passive: false });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("on")) return;
    if (e.key === "Escape") close(); else if (e.key === "ArrowRight") show(cur + 1); else if (e.key === "ArrowLeft") show(cur - 1);
    else if (e.key === "+" || e.key === "=") { zi = Math.min(zi + 1, ZOOMS.length - 1); apply(); } else if (e.key === "-") { zi = Math.max(zi - 1, 0); apply(); }
    else if (e.key === "0") { zi = 0; apply(); } else if (e.key === "p") lb.classList.toggle("sem");
  });
  window.addEventListener("resize", () => { if (lb.classList.contains("on")) { fit(); apply(); } });

  // Na página: cada imagem vira figura com legenda e um selo "ampliar"
  function preparar() {
    const novos = [...root.querySelectorAll("img")].filter((im) => !im.closest(".foto") && !im.closest(".pop") && !im.dataset.lupa);
    if (!novos.length) return;
    novos.forEach((im) => {
      im.dataset.lupa = "1"; im.title = S.title;
      let fig = im.closest("figure");
      if (!fig) {
        fig = document.createElement("figure"); const p = im.parentElement;
        (p && p.tagName === "P" && p.childNodes.length === 1 ? p : im).replaceWith(fig); fig.appendChild(im);
      }
      fig.classList.add("shot");
      let capEl = fig.querySelector("figcaption");
      if (!capEl) { capEl = document.createElement("figcaption"); fig.appendChild(capEl); }
      const alt = im.getAttribute("alt") || "";
      if (!capEl.querySelector("span")) capEl.innerHTML = `<span>${esc(capEl.textContent || alt)}</span>`;
      const n = pontosDe(im).length;
      capEl.insertAdjacentHTML("beforeend", `<span class="lupa-badge">🔍 ${S.amp}${n ? ` · ${S.pts(n)}` : ""}</span>`);
    });
    imgs = [...root.querySelectorAll("img[data-lupa]")];
  }
  root.addEventListener("click", (e) => { const im = e.target.closest("img[data-lupa]"); if (!im) return; e.preventDefault(); e.stopPropagation(); show(imgs.indexOf(im)); }, true);

  // Os pontos do case vêm de cases/<id>/pontos.js; sem o arquivo, a lupa funciona só com zoom.
  const pronto = () => { preparar(); new MutationObserver(() => preparar()).observe(root, { childList: true, subtree: true }); };
  if (caseId) {
    const sc = document.createElement("script"); sc.src = `cases/${encodeURIComponent(caseId)}/pontos.js`;
    sc.onload = pronto; sc.onerror = pronto; document.head.appendChild(sc);
  } else pronto();
})();
