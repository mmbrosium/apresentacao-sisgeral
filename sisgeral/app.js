/* CORE:START */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Core = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const schemaVersion = "3.3.0";

  const defaultProcedures = [
    { id: "p1", title: "Abertura / verificação de chamado", category: "rca_flow", text: "Beneficiário(a) {bnf} entrou em contato solicitando a verificação do andamento do protocolo {protocolo}.", active: true },
    { id: "p2", title: "Confirmação de elegibilidade", category: "relevante", text: "Verificada a elegibilidade para o pedido {pedido} do beneficiário {bnf}. Protocolo: {protocolo}. Resp: {atendente}.", active: true },
    { id: "p3", title: "Segunda via de boleto", category: "boleto", text: "Beneficiário(a) {bnf} entrou em contato solicitando a segunda via do boleto, referente ao mês/ano {boleto}.\n{el}", active: true },
    { id: "p4", title: "Encerramento de contrato", category: "relevante", text: "Beneficiário(a) {bnf} entrou em contato solicitando o encerramento do plano. Verbalizado RN 561. Orientado sobre valores em atraso (se houver), valores de boleto disponíveis para estorno (se houver), valores cobrados somente referentes ao período utilizado (se houver), carência (se houver), entre outras informações.", orientacao: "- Termo de verbalização da RN 561 (referente ao encerramento do contrato)\n- Confirmar valores em atraso / estorno / carência antes de encerrar", link: "", showPanel: true, active: true },
    { id: "p10", title: "Autorização de Guia", category: "guia", text: "Beneficiário(a) {bnf} precisa de uma autorização de guia para liberação de procedimento: {pedido}\nSituacão do pedido {pedido} retornada com sucesso.\nAlteracão/Analise pedido n.o {pedido} realizada.\nPedido n.o {pedido} aprovado, Senha autorizacão: {pedido}\nValido ate : {validade_120}", active: true },
    { id: "p5", title: "Reembolso solicitado", category: "situacional", text: "Pedido de reembolso aberto para {bnf}, guia/pedido {pedido}, protocolo {protocolo}. Atendente: {atendente}.", active: true },
    { id: "p6", title: "Encaminhamento à ouvidoria", category: "situacional", text: "Caso encaminhado à ouvidoria a pedido de {bnf}. Pedido: {pedido}, Protocolo: {protocolo}. Atendente: {atendente}.", active: true },
    { id: "p7", title: "Documentação ausente", category: "situacional", text: "Constatada ausência de documentação para o pedido {pedido} de {bnf}. Protocolo {protocolo}. Atendente: {atendente}.", active: true },
    { id: "p8", title: "Transferência de chamado", category: "situacional", text: "Chamado transferido para outro setor. Beneficiário: {bnf}, Pedido: {pedido}, Protocolo: {protocolo}. Atendente: {atendente}.", active: true },
    { id: "p9", title: "Indicação de rede credenciada", category: "rede", text: "Beneficiário(a) {bnf} solicita indicações de clínicas sobre procedimento de \"{abc}\" na região de:\nEstado: {uf}\nCidade: {city}\nBairro/Município: {bm}\n{envio_linhas}\nProtocolo: {protocolo}. Atendente: {atendente}.", active: true },
    { id: "p11", title: "Transferência de atendimento (VDN)", category: "vdn", text: "Beneficiário(a) {bnf} entrou em contato solicitando atendimento, porém, está fora do escopo PF. Transferido ao setor correto ({vdn}).", active: true },
    { id: "p12", title: "Cobertura de procedimento", category: "cobertura", text: "Beneficiário(a) {bnf} entrou em contato solicitando informações sobre cobertura de plano para o procedimento de {cobertura}{cobertura2}.", active: true }
  ];

  // Texto da rede credenciada no formato novo (usado para migrar bases antigas)
  const REDE_DEFAULT_TEXT = defaultProcedures.find(p => p.id === "p9").text;

  function removeAccents(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function extractFirstName(fullName) {
    if (!fullName || typeof fullName !== "string") return "-";
    const trimmed = fullName.trim();
    if (!trimmed) return "-";
    const parts = trimmed.split(/\s+/);
    const firstName = parts[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }

  function ymd(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Dias corridos entre duas datas (distância; ignora horário)
  function diasCorridos(start, end) {
    const a = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.abs(Math.round((b - a) / 86400000));
  }

  // Dias úteis avançando da data inicial (exclusiva) até a final (inclusiva),
  // desconsiderando sábados, domingos e feriados (holidaySet = Set de 'YYYY-MM-DD')
  function diasUteis(start, end, holidaySet) {
    let a = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    let b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (b < a) { const t = a; a = b; b = t; }
    let count = 0;
    const cur = new Date(a);
    cur.setDate(cur.getDate() + 1);
    while (cur <= b) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6 && !(holidaySet && holidaySet.has(ymd(cur)))) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  function parseTxtHistory(fileContent) {
    const records = [];
    const blocks = fileContent.split(/\[CHAMADO\s*#\d+\]/i);

    blocks.forEach((block, index) => {
      if (!block || !block.trim()) return;
      // Ignora o cabeçalho "=== HISTÓRICO GERAL ===" (não é um chamado)
      if (!/DATA\/HORA:/i.test(block)) return;

      let createdAt = new Date().toISOString();
      let attendant = "Atendente de homologação";
      let bnf = "Desconhecido";
      let protocol = "N/I";
      let order = "N/I";

      // Data tolerante: aceita "DD/MM/AAAA HH:MM(:SS)" ou "DD/MM/AAAA, HH:MM(:SS)" (com vírgula)
      // e nunca derruba o import inteiro se uma data vier estranha.
      const dtMatch = block.match(/DATA\/HORA:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?)/i);
      if (dtMatch) {
        const [, d, m, y, time] = dtMatch;
        const dt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${time}`);
        if (!isNaN(dt.getTime())) createdAt = dt.toISOString();
      }

      const attMatch = block.match(/ATENDENTE:\s*(.*)/i);
      if (attMatch && attMatch[1]) attendant = attMatch[1].trim();

      const bnfMatch = block.match(/BENEFICIÁRIO:\s*(.*)/i);
      if (bnfMatch && bnfMatch[1]) bnf = bnfMatch[1].trim();

      const protMatch = block.match(/PROTOCOLO:\s*(.*)/i);
      if (protMatch && protMatch[1]) protocol = protMatch[1].trim();

      const orderMatch = block.match(/GUIA\/PEDIDO:\s*(.*)/i);
      if (orderMatch && orderMatch[1]) order = orderMatch[1].trim();

      // Procedimentos usados (preserva o nome; não vira mais "Histórico Importado")
      let procedures = ["Histórico Importado (TXT)"];
      const procMatch = block.match(/PROCEDIMENTOS:\s*(.*)/i);
      if (procMatch && procMatch[1]) {
        const nomes = procMatch[1].split(',').map(s => s.trim()).filter(s => s && s !== '-' && s !== 'N/I');
        if (nomes.length) procedures = nomes;
      }

      let note = "";
      const confSplit = block.split(/PRONTUÁRIO FINAL DE CONFORMIDADE OPERACIONAL:/i);
      if (confSplit.length > 1) {
        note = confSplit[1].split("=========================================================================")[0].trim();
      } else {
        note = block.trim();
      }

      records.push({
        id: "rec_txt_" + index + "_" + Date.now(),
        createdAt: createdAt,
        attendant: attendant,
        bnfInitial: extractFirstName(bnf),
        protocol: protocol,
        order: order,
        procedures: procedures,
        procedureIds: [],
        note: note
      });
    });

    return records;
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function safeReplace(str, search, replacement) {
    if (!str) return "";
    const regex = new RegExp(escapeRegExp(search), 'gi');
    return str.replace(regex, () => replacement);
  }

  function compileProntuario(idsNaOrdem, procedimentos, campos, params = null, isComplianceChecked = true) {
    // params pode ser { rede, boleto, vdn } (novo) ou o redeData direto (compat. antiga)
    const ehParamObj = params && (params.rede !== undefined || params.boleto !== undefined || params.vdn !== undefined || params.cobertura !== undefined);
    const redeData = ehParamObj ? params.rede : params;
    const boletoData = ehParamObj && params.boleto ? params.boleto : null;
    const vdnData = ehParamObj && params.vdn ? params.vdn : null;
    const coberturaData = ehParamObj && params.cobertura ? params.cobertura : null;

    const bnfVal = campos.bnf && campos.bnf.trim() !== "" ? campos.bnf.trim() : "[Nome do beneficiário]";

    if (!isComplianceChecked) {
      const text = `Beneficiário(a) ${bnfVal} não conseguiu realizar a confirmação de dados do titular da conta. Orientado a realizar o contato novamente em outro momento com os dados atualizados da conta, sendo eles o Nome Completo, CPF, Data de nascimento e Nome da mãe`;
      return { text, missing: [] };
    }

    const procMap = new Map(procedimentos.map(p => [p.id, p]));
    const texts = [];
    const missing = [];

    const pedidoVal = campos.pedido && campos.pedido.trim() !== "" ? campos.pedido.trim() : "[Número do pedido]";
    const protocoloVal = campos.protocolo && campos.protocolo.trim() !== "" ? campos.protocolo.trim() : "[Número do protocolo]";
    const atendenteVal = campos.atendente && campos.atendente.trim() !== "" ? campos.atendente.trim() : "[Nome do atendente]";

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 120);
    const day = String(futureDate.getDate()).padStart(2, '0');
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const year = futureDate.getFullYear();
    const validadeStr = `${day}/${month}/${year}`;

    if (!campos.bnf || !campos.bnf.trim()) missing.push("bnf");

    let needsProtocol = false;
    let needsOrder = false;
    let hasRede = false;

    idsNaOrdem.forEach(id => {
      const proc = procMap.get(id);
      if (proc && proc.active !== false) {
        if (proc.category === 'relevante' || proc.category === 'rede' || proc.category === 'situacional' || proc.category === 'guia') {
          needsProtocol = true;
          needsOrder = true;
        }
        if (proc.category === 'rede') {
          hasRede = true;
        }
      }
    });

    if (needsProtocol && (!campos.protocolo || !campos.protocolo.trim())) missing.push("protocolo");
    if (needsOrder && (!campos.pedido || !campos.pedido.trim())) missing.push("pedido");

    // Especialidade já chega formatada como "Nome (Código)" a partir do ABC
    let redeProcLabel = "";
    let redeCodigo = "";
    if (hasRede && redeData) {
      if (!redeData.especialidade || !redeData.especialidade.trim()) {
        missing.push("especialidade");
      } else {
        redeProcLabel = redeData.especialidade.trim();
      }
      redeCodigo = (redeData.codigo || "").trim();
      if (!redeData.envio || (!redeData.envio.sms && !redeData.envio.email)) {
        missing.push("envio");
      }
    }

    idsNaOrdem.forEach(id => {
      const proc = procMap.get(id);
      if (proc && proc.active !== false) {
        let t = proc.text || "";
        t = safeReplace(t, "{bnf}", bnfVal);
        t = safeReplace(t, "{pedido}", pedidoVal);
        t = safeReplace(t, "{guia}", pedidoVal);
        t = safeReplace(t, "{protocolo}", protocoloVal);
        t = safeReplace(t, "{atendente}", atendenteVal);
        t = safeReplace(t, "{validade_120}", validadeStr);
        t = safeReplace(t, "{validade_121}", validadeStr);

        if (proc.category === "rede") {
          // Especialidade (do ABC) — "Nome (Código)"
          t = safeReplace(t, "{abc}", redeProcLabel || "[Especialidade]");
          t = safeReplace(t, "{procedimento}", redeProcLabel || "[Especialidade]");
          t = safeReplace(t, "{codigo}", redeCodigo || "[Código]");

          // Novas chaves de localização
          const ufVal = redeData && redeData.estado && redeData.estado.trim() ? redeData.estado.trim() : "[Estado]";
          const cityVal = redeData && redeData.cidade && redeData.cidade.trim() ? redeData.cidade.trim() : "[Cidade]";
          const bmVal = redeData && redeData.municipio && redeData.municipio.trim() ? redeData.municipio.trim() : "[Bairro/Município]";
          t = safeReplace(t, "{uf}", ufVal);
          t = safeReplace(t, "{city}", cityVal);
          t = safeReplace(t, "{bm}", bmVal);

          // {regiao} — compatibilidade com modelos antigos
          let regiaoStr = "";
          if (redeData) {
            const partes = [];
            if (redeData.estado && redeData.estado.trim()) partes.push(redeData.estado.trim());
            if (redeData.cidade && redeData.cidade.trim()) partes.push(redeData.cidade.trim());
            if (redeData.municipio && redeData.municipio.trim()) partes.push(redeData.municipio.trim());
            regiaoStr = partes.join(", ");
          }
          t = safeReplace(t, "{regiao}", regiaoStr);

          // Linhas de envio — cada canal em uma linha; ambos podem aparecer
          const envLines = [];
          if (redeData && redeData.envio) {
            if (redeData.envio.sms) envLines.push("Enviado redes credenciadas via SMS de cadastro");
            if (redeData.envio.email) envLines.push("Enviado redes credenciadas via e-mail de cadastro");
          }
          t = safeReplace(t, "{envio_linhas}", envLines.join("\n"));
          t = safeReplace(t, "{el}", envLines.join("\n"));

          // {envio} — compatibilidade: "SMS e e-mail"
          let envioStr = "";
          if (redeData && redeData.envio) {
            const envios = [];
            if (redeData.envio.sms) envios.push("SMS");
            if (redeData.envio.email) envios.push("e-mail");
            if (envios.length === 2) envioStr = "SMS e e-mail";
            else if (envios.length === 1) envioStr = envios[0];
          }
          t = safeReplace(t, "{envio}", envioStr);

          // Limpa linhas vazias deixadas por chaves sem conteúdo
          t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/\n[ \t]*\n(?=Protocolo:)/g, "\n").trim();
        }

        if (proc.category === "boleto") {
          // Vários meses: "10/2026 e também 11/2026"
          const meses = (boletoData && boletoData.meses && boletoData.meses.length) ? boletoData.meses
            : (boletoData && boletoData.mesRef && boletoData.mesRef.trim() ? [boletoData.mesRef.trim()] : []);
          const mesVal = meses.length ? meses.join(" e também ") : "[mm/aaaa]";
          t = safeReplace(t, "{boleto}", mesVal);
          // Envio: uma linha por canal, no fim do texto
          const envLines = [], canais = [];
          if (boletoData && boletoData.envio) {
            if (boletoData.envio.sms) { envLines.push("SMS de cadastro enviado com sucesso"); canais.push("SMS"); }
            if (boletoData.envio.email) { envLines.push("A solicitação de envio de e-mail foi cadastrada com sucesso"); canais.push("e-mail"); }
          }
          if (canais.length) t = t.replace(/\[SMS\/e-mail\]/gi, canais.join(" e "));
          const temChave = /\{el\}|\{envio_linhas\}/i.test(t);
          t = safeReplace(t, "{el}", envLines.join("\n"));
          t = safeReplace(t, "{envio_linhas}", envLines.join("\n"));
          if (!temChave && envLines.length) t = t.trim() + "\n" + envLines.join("\n");
          t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
        }

        if (proc.category === "vdn") {
          const setor = vdnData && vdnData.setor && vdnData.setor.trim() ? vdnData.setor.trim() : "[VDN]";
          t = safeReplace(t, "{vdn}", setor);
          t = safeReplace(t, "{vdn_num}", (vdnData && vdnData.num) ? vdnData.num : "");
        }

        if (proc.category === "cobertura") {
          const cob1 = coberturaData && coberturaData.cob1 && coberturaData.cob1.trim() ? coberturaData.cob1.trim() : "[procedimento]";
          const cob2 = coberturaData && coberturaData.cob2 && coberturaData.cob2.trim() ? coberturaData.cob2.trim() : "";
          t = safeReplace(t, "{cobertura}", cob1);
          t = safeReplace(t, "{cobertura2}", cob2 ? " e " + cob2 : "");
          const cobre = coberturaData ? coberturaData.cobre : true;
          const carencia = coberturaData ? coberturaData.carencia : false;
          const linhas = [];
          linhas.push(cobre ? "Informado que o plano cobre o procedimento solicitado" : "Informado que o plano não cobre o procedimento solicitado");
          if (carencia) {
            linhas.push(`Informado que o procedimento de ${cob1} ainda encontra-se em carência e deverá aguardar após o prazo de [ ] dias`);
          }
          if (!cobre) {
            linhas.push(`\nOrientado(a) a entrar em contato diretamente no site da "https://www.operadora.com.br/" para conferir os planos de seu interesse e retornar o contato solicitando migração de plano`);
          }
          t = (t.trim() + "\n" + linhas.join("\n")).trim();
        }

        // Limpa chaves específicas que sobraram (em categorias que não as usam)
        t = safeReplace(t, "{boleto}", "[mm/aaaa]");
        t = safeReplace(t, "{vdn}", "[VDN]");
        t = safeReplace(t, "{cobertura}", "[procedimento]");
        t = t.replace(/\{el\}|\{envio_linhas\}|\{vdn_num\}|\{cobertura2\}/gi, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

        texts.push(t);
      }
    });

    // Sempre começa com "Beneficiário(a)" — inclusive quando nenhuma caixinha está marcada
    if (texts.length === 0) {
      return { text: `Beneficiário(a) ${bnfVal} entrou em contato`, missing };
    }

    return { text: texts.join("\n\n"), missing };
  }

  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function getHolidays(year) {
    const holidays = [
      { date: `${year}-01-01`, name: "Confraternização Universal", type: "national" },
      { date: `${year}-04-21`, name: "Tiradentes", type: "national" },
      { date: `${year}-05-01`, name: "Dia do Trabalho", type: "national" },
      { date: `${year}-09-07`, name: "Independência do Brasil", type: "national" },
      { date: `${year}-10-12`, name: "Nossa Senhora Aparecida", type: "national" },
      { date: `${year}-11-02`, name: "Finados", type: "national" },
      { date: `${year}-11-15`, name: "Proclamação da República", type: "national" },
      { date: `${year}-12-25`, name: "Natal", type: "national" }
    ];

    if (year >= 2024) {
      holidays.push({ date: `${year}-11-20`, name: "Dia da Consciência Negra", type: "national" });
    }

    const easter = easterSunday(year);
    const carnival = new Date(easter); carnival.setDate(easter.getDate() - 47);
    holidays.push({ date: ymd(carnival), name: "Carnaval", type: "optional" });

    const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate() - 2);
    holidays.push({ date: ymd(goodFriday), name: "Sexta-feira Santa", type: "national" });

    const corpusChristi = new Date(easter); corpusChristi.setDate(easter.getDate() + 60);
    holidays.push({ date: ymd(corpusChristi), name: "Corpus Christi", type: "optional" });

    return holidays;
  }

  // Set de feriados (YYYY-MM-DD) cobrindo todos os anos do intervalo — usado em dias úteis
  function holidaySetForRange(start, end) {
    const set = new Set();
    const y1 = start.getFullYear();
    const y2 = end.getFullYear();
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      getHolidays(y).forEach(ho => set.add(ho.date));
    }
    return set;
  }

  function calendarWeeks(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks = [];
    let currentWeek = new Array(7).fill(null);

    let curr = new Date(firstDay);
    while (curr <= lastDay) {
      const dayOfWeek = curr.getDay();
      currentWeek[dayOfWeek] = new Date(curr);

      if (dayOfWeek === 6 || curr.getTime() === lastDay.getTime()) {
        weeks.push(currentWeek);
        currentWeek = new Array(7).fill(null);
      }
      curr.setDate(curr.getDate() + 1);
    }
    return weeks;
  }

  function reconcile(state) {
    const procedures = state.procedures || [];
    const procMapByNormTitle = new Map();
    procedures.forEach(p => procMapByNormTitle.set(removeAccents(p.title), p));

    function updateList(list) {
      if (!list) return;
      list.forEach(reg => {
        if (!reg.procedureIds || reg.procedureIds.length === 0) {
          if (reg.procedures && reg.procedures.length > 0) {
            reg.procedureIds = reg.procedures.map(t => {
              const match = procMapByNormTitle.get(removeAccents(t));
              return match ? match.id : "unknown";
            });
          }
        }
      });
    }
    updateList(state.history);
    updateList(state.archive);
  }

  function usageCount(state, id) {
    let count = 0;
    const check = list => {
      if (!list) return;
      list.forEach(r => { if (r.procedureIds && r.procedureIds.includes(id)) count++; });
    };
    check(state.history);
    check(state.archive);
    return count;
  }

  function rotate(state) {
    if (!state.history) state.history = [];
    if (!state.archive) state.archive = [];
    state.history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (state.history.length > 30) {
      const excess = state.history.splice(30);
      state.archive.push(...excess);
    }
  }

  function weatherIcon(code) {
    if (code === 0) return '☀️';
    if (code === 1 || code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 57) return '🌦️';
    if (code >= 61 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '🌨️';
    if (code >= 80 && code <= 82) return '🌧️';
    if (code >= 85 && code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '🌡️';
  }

  function weatherDesc(code) {
    if (code === 0) return 'Céu limpo';
    if (code === 1) return 'Predomínio de sol';
    if (code === 2) return 'Parcialmente nublado';
    if (code === 3) return 'Nublado';
    if (code >= 45 && code <= 48) return 'Névoa';
    if (code >= 51 && code <= 57) return 'Garoa';
    if (code >= 61 && code <= 67) return 'Chuva';
    if (code >= 71 && code <= 77) return 'Neve';
    if (code >= 80 && code <= 82) return 'Pancadas de chuva';
    if (code >= 95) return 'Tempestade';
    return '—';
  }

  return {
    schemaVersion,
    defaultProcedures,
    REDE_DEFAULT_TEXT,
    compileProntuario,
    getHolidays,
    holidaySetForRange,
    calendarWeeks,
    reconcile,
    usageCount,
    rotate,
    extractFirstName,
    removeAccents,
    parseTxtHistory,
    ymd,
    diasCorridos,
    diasUteis,
    weatherIcon,
    weatherDesc
  };
}));
/* CORE:END */

/* INTERFACE:START */
document.addEventListener('DOMContentLoaded', () => {
  const C = window.Core;
  if (!C) return;

  const LS_PREFIX = "sisgeral2_";
  const STORAGE_KEY = LS_PREFIX + "state";

  // Variáveis globais do calendário
  window.calCurrentDate = new Date();
  window.calViewMode = 'days';          // 'days' | 'months' | 'years'
  window.calYearWindowStart = null;     // início da janela de 35 anos
  window.calRangeStart = null;          // Date | null
  window.calRangeEnd = null;            // Date | null
  window.procSort = 'az-cat';           // 'none' | 'az-proc' | 'az-cat' | 'az-grupo' — padrão: por categoria

  // Variáveis (chaves) disponíveis nos textos — usadas no editor de procedimento
  const VARIAVEIS_GERAIS = [
    { chave: '{bnf}', desc: 'Nome do beneficiário' },
    { chave: '{pedido}', desc: 'Número do pedido' },
    { chave: '{guia}', desc: 'Número da guia (= pedido)' },
    { chave: '{protocolo}', desc: 'Número do protocolo' },
    { chave: '{atendente}', desc: 'Nome do atendente' },
    { chave: '{validade_120}', desc: 'Data de hoje + 120 dias' }
  ];
  const VARIAVEIS_REDE = [
    { chave: '{abc}', desc: 'Especialidade (vem do ABC)' },
    { chave: '{codigo}', desc: 'Código da especialidade' },
    { chave: '{city}', desc: 'Cidade' },
    { chave: '{uf}', desc: 'Estado' },
    { chave: '{bm}', desc: 'Bairro/Município' },
    { chave: '{el}', desc: 'Linhas de envio (SMS/e-mail) — atalho de {envio_linhas}' }
  ];
  const VARIAVEIS_BOLETO = [
    { chave: '{boleto}', desc: 'Mês de referência do boleto (mm/aaaa)' },
    { chave: '{el}', desc: 'Linhas de envio (SMS/e-mail)' }
  ];
  const VARIAVEIS_VDN = [
    { chave: '{vdn}', desc: 'Setor/célula de transferência (do diretório VDN)' },
    { chave: '{vdn_num}', desc: 'Número da VDN' }
  ];
  const VARIAVEIS_COBERTURA = [
    { chave: '{cobertura}', desc: 'Procedimento/cobertura consultado' },
    { chave: '{cobertura2}', desc: '2ª cobertura (vira " e ..." se preenchida)' }
  ];

  // ===== Dados-semente extraídos dos PDFs (ABC Dental + VDN de Transferência) =====
  const SEED_VERSION = 5;

  // Textos antigos dos procedimentos-base; se ainda estiverem assim, migram p/ as novas categorias
  const PROC_TEXTO_ANTIGO = {
    p1: "Beneficiário(a) {bnf} entrou em contato referente ao pedido {pedido}, protocolo {protocolo}. Atendimento realizado por {atendente}.",
    p3: "Solicitada segunda via de boleto para o pedido {pedido}, protocolo {protocolo}. Atendente: {atendente}.",
    p4: "Solicitação de cancelamento registrada para {bnf}, pedido {pedido}, protocolo {protocolo}. Atendente: {atendente}."
  };

  // ABC = especialidades de direcionamento da rede (código + nome + descrição)
  const SEED_ABC = [
    { code: "—", name: "Cirurgia", description: "Cirurgia bucomaxilofacial, extrações e correções ósseas/teciduais." },
    { code: "—", name: "Dentística Restauradora", description: "Restaurações e recuperação estética/funcional do dente." },
    { code: "—", name: "Endodontia", description: "Tratamento de canal e doenças da polpa dentária." },
    { code: "—", name: "Odontologia Preventiva", description: "Prevenção, profilaxia e orientação de saúde bucal." },
    { code: "—", name: "Periodontia", description: "Tratamento de gengiva e tecidos de suporte do dente." },
    { code: "—", name: "Prótese Dentária", description: "Próteses fixas e removíveis, reabilitação oral." },
    { code: "—", name: "Urgência em Consultório", description: "Atendimento de urgência odontológica agendada em consultório." },
    { code: "—", name: "Clínico Geral", description: "Clínica odontológica geral e avaliação inicial." },
    { code: "—", name: "Disfunção Temporomandibular e Dor Orofacial", description: "DTM e dores orofaciais (ATM)." },
    { code: "—", name: "Odontologia Estética", description: "Procedimentos estéticos (clareamento, facetas etc.)." },
    { code: "—", name: "Odontopediatria", description: "Odontologia para crianças." },
    { code: "—", name: "Ortodontia", description: "Correção de posição dos dentes e mordida (aparelhos)." },
    { code: "—", name: "Radiologia Odontológica e Imaginologia", description: "Exames de imagem odontológicos." },
    { code: "—", name: "Pronto Socorro 24 horas", description: "Urgência/emergência odontológica 24h." },
    { code: "—", name: "Cirurgia (Especializada/Divulgação)", description: "Cirurgia especializada / rede divulgada." },
    { code: "—", name: "Sedação", description: "Procedimentos com sedação." }
  ];

  // VDN = diretório de células/ramais de transferência
  const SEED_VDN = [
    { skill: "Beneficiário Dental", vdn: "4800000001", phone: "0800 000 0000", hours: "24h" },
    { skill: "Beneficiário Médico", vdn: "4800000002", phone: "0800 000 0000", hours: "24h" },
    { skill: "Atendimento GIH", vdn: "4800000003", phone: "0800 000 0000", hours: "24h" },
    { skill: "Atendimento Reembolso", vdn: "4800000004", phone: "0800 000 0000", hours: "24h" },
    { skill: "Ação Judicial (Benef. Alta Complexidade)", vdn: "4800000005", phone: "0800 000 0000", hours: "24h — só assuntos da ação judicial" },
    { skill: "SAC Saúde", vdn: "4800000006", phone: "0800 000 0000", hours: "24h" },
    { skill: "Corretor", vdn: "4800000007", phone: "0800 000 0000", hours: "Seg a Sex 8h-18h" },
    { skill: "Equipe de Vendas Dental PF e PME Médico/Dental", vdn: "4800000008", phone: "0800 000 0000", hours: "Seg-Sex 8h-18h, Sáb 8h-14h" },
    { skill: "Gestor PME", vdn: "4800000009", phone: "0800 000 0000", hours: "Seg a Sex 8h-18h" },
    { skill: "Gestor PME – Cancelamento Médico", vdn: "4800000010", phone: "0800 000 0000", hours: "Seg a Sex 8h-18h" },
    { skill: "Gestor PME – Cancelamento Dental", vdn: "4800000011", phone: "0800 000 0000", hours: "Seg a Sex 8h-18h" },
    { skill: "Gestor PME – Negociação (Contratos Cancelados)", vdn: "4800000012", phone: "0800 000 0000", hours: "Seg a Sex 8h-18h" },
    { skill: "Linha Black – Beneficiário", vdn: "4800000013", phone: "0800 000 0000", hours: "24h" },
    { skill: "Linha Black – Gestor Empresa", vdn: "4800000014", phone: "0800 000 0000", hours: "Seg a Sex 8h-18h" },
    { skill: "Linha Black – Dental (Dental Premium)", vdn: "4800000015", phone: "0800 000 0000", hours: "24h" },
    { skill: "Prestador Dental", vdn: "4800000016", phone: "0800 000 0000", hours: "24h" },
    { skill: "Prestador Dental - Black", vdn: "4800000017", phone: "0800 000 0000", hours: "24h" },
    { skill: "Prestador Saúde – NAC", vdn: "4800000018", phone: "0800 000 0000", hours: "7h-19h" },
    { skill: "Parceiro", vdn: "4800000019", phone: "0800 000 0000", hours: "Seg-Sex 8h-20h, Sáb/Dom/fer 9h-17h" }
  ];

  const SEED_ABC_PROCS = [
    { code: "—", name: "Alveoplastia", description: "Cirurgia que corrige o osso que sustenta os dentes. Realizada normalmente após a extração de múltiplos dentes ou quando há necessidade de colocar uma prótese e osso está irregular. [Direcion" },
    { code: "—", name: "Ajuste Oclusal por Desgaste Seletivo", description: "Este procedimento estará incluído no valor das restaurações. Os dentistas divulgados na especialidade de periodontia podem solicitar este código, será admitido no máximo 3 sessões para benef" },
    { code: "—", name: "Aplicação de Selante em Fóssulas Fissuras", description: "O selante é um material colocado em dentes com sulcos muito profundos para proteger contra a cárie dentária. A aplicação dos selantes consiste num procedimento rápido e indolor. Geralmente i" },
    { code: "—", name: "Atividade Educativa para Pais E/ Cuidadores Dental Kids", description: "São orientações de higiene oral e dieta aos pacientes e cuidadores. Prazo de repetição: 4 meses. Utilizado somente para o plano específico Dental Kids [Direcionar: 19 Odontopediatria]" },
    { code: "—", name: "Aumento de Coroa Clínica", description: "Indicado para os dentes em que a gengiva impossibilita a execução da reabilitação de forma satisfatória e necessite de rebaixamento ósseo para recuperação do espaço biológico. Os dentistas d" },
    { code: "—", name: "Capeamento Pulpar Direto", description: "Proteção direta da polpa através de medicação local. Solicitado pelo endodontista conforme o dente afetado. Caso o CD clínico entre em contato relatando que não consegue visualizar o procedi" },
    { code: "—", name: "Cirurgia Ortognática Cirurgia Parendodôntica = Apicetomia- Cirurgia Periodontal a Retalho", description: "O procedimento de Cirurgia Ortognática refere-se a cirurgia oral maior realizada em Hospital. É considerado por sua vez de segmentação médica, portanto a análise de cobertura deve ser realiz" },
    { code: "—", name: "Clareamento para Dentes Desvitalizados", description: "Indicado para dentes anteriores e pré-molares. Máximo de 3 sessões. Realização somente em dentes com tratamento endodôntico satisfatório e comprovado escurecimento da porção coronária atravé" },
    { code: "—", name: "Consulta Odontológica Dental Kids", description: "Consulta para a avaliação dentária para crianças. Em caso de clínica multidisciplinar será permitida uma consulta de planejamento de tratamento. Utilizado somente para o plano específico Den" },
    { code: "—", name: "Consulta Urgência em Consultório", description: "Realização de procedimentos de urgência em consultório. São considerados procedimentos de urgência pela ANS: • Curativo em caso de hemorragia bucal; • Curativo em caso de odontalgia aguda (p" },
    { code: "—", name: "Consulta Urgência em Pronto Socorro 24 Horas", description: "Realização de procedimentos de urgência e emergência. São considerados procedimentos de urgência pela ANS: • Curativo em caso de hemorragia bucal; • Curativo em caso de odontalgia aguda (pul" },
    { code: "—", name: "Coroa 3/4 ou 4/5", description: "Prótese unitária que reconstrói apenas 3 ou 4 faces do dente. Encontra- se ativo, porém com exigência de envio de rx para autorização, da mesma forma que outros procedimentos de prótese (COR" },
    { code: "—", name: "Coroa Total em Cerômero (dentes Anteriores)", description: "Indicado em dentes anteriores não passíveis de reconstrução por meio direto. Apenas para coroas unitárias, não utilizar para próteses parciais fixas. Necessário encaminhar imagem radiográfic" },
    { code: "—", name: "Coroa Total Metálica", description: "Prótese unitária feita em metal que reconstrói totalmente o dente. Indicado em dentes não passíveis de reconstrução por meio direto. Apenas para coroas unitárias; não utilizar para próteses " },
    { code: "—", name: "Coroa Total Metalo Cerâmica (porcelana)", description: "Indicado em dentes não passíveis de reconstrução por meio direto. Apenas para coroas unitárias; não utilizar para próteses parciais fixas. Imagem radiográfica final compatível com metal e po" },
    { code: "—", name: "Coroa Total Metalo Plástica Cerômero", description: "Indicado em dentes não passíveis de reconstrução por meio direto. Apenas para coroas unitárias; não utilizar para próteses parciais fixas. Imagem radiográfica final compatível com metal e Ce" },
    { code: "—", name: "Coroa Total Metalo Plástica Resina Acrílica", description: "Indicado em dentes não passíveis de reconstrução por meio direto. Apenas para coroas unitárias; não utilizar para próteses parciais fixas. Imagem radiográfica final compatível com metal e re" },
    { code: "—", name: "Coroas em Dente Decíduo", description: "Para pacientes menores de 13 anos de idade. “Indicado para perdas precoces de dentes decíduos. ” [Direcionar: 19 Odontopediatria]" },
    { code: "—", name: "Cunha Proximal", description: "É a remoção de porção óssea atrás do último dente da mandíbula que está impedindo o dente de erupcionar ou dificultando o preparo e a higiene (remoção de osso e tecido mole-gengiva). É neces" },
    { code: "—", name: "Coroa Provisória sem Pino", description: "Procedimento indicado apenas para coroas unitárias. Não utilizar para próteses parciais fixas. Solicitamos formalizar a orientação da importância da reabilitação definitiva ao beneficiário, " },
    { code: "—", name: "Coroa Provisória com Pino", description: "Dente artificial em resina acrílica com pino para ser usado por um período até a confecção do definitivo. Procedimento indicado apenas para coroas unitárias; Não utilizar para próteses parci" },
    { code: "—", name: "Coroa Total Acrílica Prensada", description: "Coroa unitária que reconstrói totalmente o dente, confeccionada em acrílica prensada: Indicado em dentes não passíveis de reconstrução por meio direto. Apenas para coroas unitárias; não util" },
    { code: "—", name: "Dente Supranumerário", description: "Qualquer dente que exceda o número normal de dentes é denominado extranumerário. Será solicitado o código normal do procedimento e quando for selecionar o dente, o supranumerário será lançad" },
    { code: "—", name: "Documentação Ortodôntica Básica", description: "É um conjunto de exames complementares que auxiliam o profissional no tratamento ortodôntico. Procedimento inclui a Radiografia panorâmica, 5 fotos, 2 radiografias periapicais, 2 radiografia" },
    { code: "—", name: "Documentação Ortodôntica Completa", description: "É um conjunto de exames complementares que auxiliam o profissional no tratamento ortodôntico. Procedimento inclui a Radiografia panorâmica, 1 telerradiografia com traçado, 1 traçado adiciona" },
    { code: "—", name: "Documentação Ortodôntica Especia", description: "É um conjunto de exames complementares que auxiliam o profissional no tratamento ortodôntico. Procedimento inclui a Radiografia panorâmica, 1 telerradiografia com traçado, 1 traçado adiciona" },
    { code: "—", name: "Documentação Ortodôntica Simple", description: "É um conjunto de exames complementares que auxiliam o profissional no tratamento ortodôntico. Procedimento inclui a Radiografia panorâmica, 1 telerradiografia com traçado, 1 traçado adiciona" },
    { code: "—", name: "Endodontia com Instrumento", description: "Técnicas cirúrgicas utilizadas para cobrir a raiz dos dentes nos casos em que haja grande perda da gengiva. Procedimento inclui curativos pós-cirúrgicos, incisão e reposicionamentos de tecid" },
    { code: "—", name: "Exérese ou Excisão de Cistos Odontológicos", description: "Remoção cirúrgica de cistos (lesão óssea) localizados na boca [Direcionar:  Cirurgia]" },
    { code: "—", name: "Exodontia de Permanente por", description: "Exodontia de resto radicular [Direcionar: 01 Cirurgia]" },
    { code: "—", name: "Exodontia Simples de Permanente", description: "Exodontia simples [Direcionar: 01 Cirurgia]" },
    { code: "—", name: "Exérese ou Excisão de Mucocele", description: "É a remoção cirúrgica de um pequeno cisto benigno (bolha) na boca, geralmente no lábio inferior. [Direcionar: 01 Cirurgia]" },
    { code: "—", name: "Faceta em Cerâmica Pura", description: "Faceta em cerâmica [Direcionar:  Dentística Restauradora, Prótese ou Odontologia]" },
    { code: "—", name: "Faceta em Resina Direta", description: "Recobrimento estético direto (feito no consultório) com resinas sobre a face externa dos dentes, podendo ser realizado em uma única sessão (é uma restauração que recobre o dente). [Direciona" },
    { code: "—", name: "Frenulectomia Labial ou Lingual", description: "Este procedimento consiste na remoção do freio labial ou lingual. Os procedimentos Frenulectomia labial e frenulectomia lingual (retirada total do tecido) estão vinculados à especialidade Od" },
    { code: "—", name: "Frenulotomia", description: "O procedimento frenulotomia labial e, frenulotomia lingual (retirada parcial do tecido) estão vinculados à especialidade cirurgia. Necessário o envio de laudo com parecer clínico ou hipótese" },
    { code: "—", name: "Implante Ortodôntico", description: "O implante ortodôntico são estruturas, geralmente feitas de titânio e utilizadas como recurso bastante atual e atuam para auxiliar na ancoragem e/ou correção de várias situações corriqueiras" },
    { code: "—", name: "Mantenedor de Espaço Fixo", description: "O mantenedor de espaço é uma peça fixa feito sob medida em acrílico ou metal pelo dentista, odontopediatria ou ortodontista para manter o espaço para erupção do dente permanente no lugar cer" },
    { code: "—", name: "Núcleo Metálico Fundido", description: "Pino que vai dentro da raiz para retenção da coroa. Confeccionado em laboratório protético. Procedimento inclui remoção parcial de material obturador radicular e preparo para núcleo. Necessá" },
    { code: "—", name: "Núcleo de Fibra de Vidro ou Fibr de Carbono Mais Preenchimento", description: "Procedimento inclui remoção parcial de material obturador radicular e preparo para núcleo. Necessário encaminhar imagem radiográfica inicial para análise de autorização e final para análise " },
    { code: "—", name: "Prevenção Módulo 1 - Dental Kid", description: "Procedimento inclui raspagem supra-gengival, profilaxia, adequação do meio, atividade educativa, evidenciação de placa e aplicação tópica de flúor; Procedimento realizado em pacientes menore" },
    { code: "—", name: "Prótese Parcial Fixa em Metalo Cerâmica", description: "prótese para substituir dentes ausentes com preparos minimente invasivos dos dentes pilares, basicamente a nível de esmalte, e fixação com cimentos resinosos. O prestador deverá encaminhar i" },
    { code: "—", name: "Prótese Parcial Fixa em Metalo Plástica", description: "As próteses metaloplástica são resinas conjugadas a uma estrutura de metal para reforço interno da prótese. O prestador deverá encaminhar imagem radiográfica inicial onde deverá possibilitar" },
    { code: "—", name: "Prótese Parcial Fixa In Ceran L de Metal (metal Free)", description: "As próteses metal free são feitas de porcelana, o que permite que o dente fique de uma só cor, diminuindo a possibilidade de manchas cinzas aparecerem próximas à gengiva, já que as estrutura" },
    { code: "—", name: "Prótese Parcial Fixa Provisória", description: "é uma parte importante do tratamento reabilitador, sendo uma fase intermediária necessária para a confecção das próteses definitivas. O prestador deverá encaminhar imagem radiográfica inicia" },
    { code: "—", name: "Prótese Parcial Removível C", description: "A prótese parcial removível é uma armação metálica com dentes artificiais que substituem os naturais, ausentes devido a perdas. Mesmo sendo uma alternativa móvel, a prótese parcial removível" },
    { code: "—", name: "Radiografia Oclusal em Clínica Radiológica", description: "Exame de imagem para auxiliar no diagnóstico do cirurgião-dentista feito em clínica radiológica. Para análise de pagamento, será necessário anexar no campo “imagem inicial” a imagem digitali" },
    { code: "—", name: "Telerradiografia", description: "Tecnica Radiografia para auxiliar no diagnóstico do tratamento ortodôntico [Direcionar: 22 Radiologia Odontológica e Imagiologia]" },
    { code: "—", name: "Radiografia Interproximal Bite- Wing em Clínica Radiológica", description: "Exame de imagem para auxiliar no diagnóstico do cirurgião-dentista feito em clínica radiológica. Para análise de pagamento, será necessário anexar no campo “imagem inicial” a imagem digitali" },
    { code: "—", name: "Radiografia Panorâmica de MANDÍBULA/MAXILA (ortopantomografia)", description: "É um exame para complementar o exame clínico no diagnóstico das doenças dos dentes (cáries ou doenças endodônticas) e dos ossos da face. Inclui laudo da panorâmica. Necessário enviar imagem " },
    { code: "—", name: "Radiografia Periapical em Clínic Radiológica", description: "Exame de imagem para auxiliar no diagnóstico do cirurgião-dentista feito em clínica radiológica. Para análise de pagamento, será necessário anexar no campo “imagem inicial” a imagem digitali" },
    { code: "—", name: "Radiologia e Imaginologia Recimentação de Trabalho Protético", description: "é a especialidade que tem como objetivo a aplicação dos métodos exploratórios por imagem com a finalidade de diagnóstico, acompanhamento e documentação do complexo bucomaxilofacial e estrutu" },
    { code: "—", name: "Remoção de Cálculo", description: "Procedimento responsável pela remoção de cálculo gengival [Direcionar: 05 Odontologia Preventiva]" },
    { code: "—", name: "Remoção de Núcleo Intrarradicular", description: "Consiste na remoção do núcleo da cavidade intrarradicular, com finalidade endodôntica. (Procedimento solicitado somente pelo endodontista) [Direcionar: 03 Endodontia]" },
    { code: "—", name: "Restauração em Cerâmica Pura – Inlay", description: "Restauração feita em porcelana em laboratório de prótese [Direcionar: 07 Prótese]" },
    { code: "—", name: "Restauração em Cerâmica Pura – Onlay", description: "Restauração de grande extensão com envolvimento de cúspides feita em porcelana em laboratório de prótese. [Direcionar: 07 Prótese]" },
    { code: "—", name: "Restauração Metálica Fundida", description: "Restauração em metal realizada em laboratório de prótese. Procedimento não autorizado para dentes que apresentam grande destruição coronária, que contraindiquem preparos parciais. Necessário" },
    { code: "—", name: "Retratamento Endodôntico", description: "Reconfecção do tratamento de endodôntico, ocasionado por uma reinfecção no canal (raiz) do dente, já tratado anteriormente. É realizada a remoção da obturação do canal, nova desinfecção e no" },
    { code: "—", name: "Sedação Consciente com Óxido Nitroso e Oxigênio em Odontologi", description: "Esta técnica consiste em realizar o tratamento odontológico com a inalação do óxido nitroso (N2O) associado ao oxigênio, através de um equipamento específico (fluxômetro) e de uma máscara na" },
    { code: "—", name: "Sedação Medicamentosa", description: "A sedação medicamentosa (por meio de fármacos) pode ser um método efetivo utilizado em pacientes ansiosos ou com medo do tratamento odontológico. Produz depressão mínima no nível de consciên" },
    { code: "—", name: "Técnica de Clark- Telerradiografia", description: "Este procedimento consiste na realização de 3 tomadas radiográficas (radiografia periapical), sendo uma em posição central, as demais variando a angulação para direita e para a esquerda (mes" },
    { code: "—", name: "Tratamento de Perfuração Endodôntica", description: "Consiste no selamento (fechamento) de perfuração endodôntica com o material de escolha do profissional executante. [Direcionar: 03 Endodontia]" },
    { code: "—", name: "Tratamento Endodôntico", description: "Tratamento realizado na raiz (canal) do dente, com remoção do \"nervo\", desinfecção do canal e preenchimento da raiz com material obturador. Este tratamento é realizado tanto em dentes perman" },
    { code: "—", name: "Tratamento Endodôntico de Dente com Rizogênese Incompleta- Consulta Proc Ulectomia", description: "Dente com necessidade de intervenção endodôntica, mas que se apresenta com o ápice aberto (raiz do dente ainda não fechou). Máximo de 3 sessões, conforme necessidade de troca da medicação in" },
  ];
  const SEED_PROC_SCRIPTS = [
    { cat: "boleto", title: "Segunda via de boleto — enviada", text: "Beneficiário(a) {bnf} entrou em contato para solicitar a segunda via da fatura do(s) mês(es) {boleto}. Foi localizada a fatura e enviada com sucesso para [SMS/e-mail]. Orientado aos canais digitais site/app." },
    { cat: "boleto", title: "Cartão — falha de pagamento", text: "Beneficiário(a) {bnf} entrou em contato para informar que não vai conseguir fazer o pagamento no cartão de crédito. Informado que o sistema fará 2 tentativas de desconto no cartão e, se não conseguir, gerará um boleto para pagamento." },
    { cat: "boleto", title: "Troca de pagamento — cartão para boleto", text: "Beneficiário(a) {bnf} entrou em contato para solicitar a troca de cartão de crédito para boleto. Informado que não é possível realizar esse procedimento; somente alterar o cartão de crédito ou cadastrar débito automático no site/app." },
    { cat: "guia", title: "Liberação de guia — liberada", text: "Beneficiário(a) {bnf} entrou em contato para solicitar a liberação de guia para o procedimento de [procedimento], guia {pedido}. Foi localizada, analisada e liberada com sucesso. Para mais fins consultar o site/app." },
    { cat: "guia", title: "Liberação de guia — negada", text: "Beneficiário(a) {bnf} entrou em contato para saber o porquê da negativa do procedimento [procedimento], GTO {pedido}. Verificado no sistema que consta a seguinte informação: \"[motivo]\"." },
    { cat: "guia", title: "Token — enviado", text: "Beneficiário(a) {bnf} entrou em contato para solicitar o Token de consulta do procedimento [procedimento], GTO {pedido}. Foi enviado com sucesso para [SMS/e-mail]. Orientado aos canais digitais site/app." },
    { cat: "rede", title: "Indicação de rede — enviada", text: "Beneficiário(a) {bnf} entrou em contato para indicação de rede para a especialidade/procedimento \"{abc}\" no estado de {uf}. Foi visualizado no sistema os prestadores disponíveis e enviado com sucesso para [SMS/e-mail]. Orientado aos canais digitais site/app." },
    { cat: "situacional", title: "Situação do plano", text: "Beneficiário(a) {bnf} entrou em contato para saber a situação do plano. Informado que o plano está [status]." },
    { cat: "situacional", title: "Cobertura — tem cobertura", text: "Beneficiário(a) {bnf} entrou em contato para verificar cobertura para o procedimento de [procedimento]. Verificado que o beneficiário tem cobertura para esse procedimento, informado em linha. Orientado aos canais digitais site/app." },
    { cat: "situacional", title: "Carência — em carência", text: "Beneficiário(a) {bnf} entrou em contato para saber o período de carência do procedimento [procedimento]. Visualizado na cobertura e orientado que permanece em carência até o dia [data]. Orientado aos canais digitais site/app." },
    { cat: "situacional", title: "Reembolso — como solicitar (com comprovante)", text: "Beneficiário(a) {bnf} entrou em contato para saber como solicitar o reembolso. Orientado que é necessário primeiro baixar o formulário no site da operadora, levar para o dentista preencher (procedimentos, materiais, face/região, dentes, valores e assinaturas) e depois anexar o formulário, os documentos e o comprovante de pagamento no app da operadora." },
    { cat: "situacional", title: "Aplicativo — primeiro acesso", text: "Beneficiário(a) {bnf} entrou em contato para saber como ter acesso ao aplicativo. Informado para entrar na loja de aplicativos, baixar o app da operadora e fazer o primeiro acesso, ou pelo site da operadora > Entrar > Beneficiário do plano > Primeiro acesso." },
  ];
  // Deduz o Grupo (organização) a partir da categoria e do título-base (antes de " — ")
  function grupoForTitulo(title, cat) {
    if (cat === 'boleto') return 'Pagamento';
    if (cat === 'guia') return 'Guia/Autorização';
    if (cat === 'rede') return 'Rede/Agendamento';
    if (cat === 'vdn') return 'Transferência';
    if (cat === 'cobertura') return 'Cobertura/Carência';
    const b = C.removeAccents((title || '').split(' — ')[0].toLowerCase());
    if (/liberac|auditoria|guia/.test(b)) return 'Guia/Autorização';
    if (/rede|token|clinica|agendamento/.test(b)) return 'Rede/Agendamento';
    if (/cancel|obito|rescis|arrepend|encerr/.test(b)) return 'Cancelamento';
    if (/cobertura|carencia/.test(b)) return 'Cobertura/Carência';
    if (/boleto|pagamento|fatura|cobranca|devoluc|reembolso|serasa|quatro c|renegoci|duplicidade|vencimento|imposto|troca de pagamento|estorno/.test(b)) return 'Pagamento';
    if (/aplicativo|app|senha|acesso|cartao|carteirinha/.test(b)) return 'Acesso/App';
    if (/dependente|titular|inclus|\brh\b|empresa|contrato|cadastr|migrac|reativ|proposta|carta|permanencia|situacao/.test(b)) return 'Cadastro/Contrato';
    return 'Geral';
  }
  const seedScriptEntries = () => SEED_PROC_SCRIPTS.map((s, i) => ({ id: "scr_" + String(i + 1).padStart(3, "0"), title: s.title, category: s.cat, text: s.text, grupo: grupoForTitulo(s.title, s.cat), active: true }));
  const seedAbcProcEntries = () => SEED_ABC_PROCS.map((s, i) => ({ id: "abc_proc_" + (i + 1), code: s.code, name: s.name, description: s.description }));
  const seedAbcEntries = () => SEED_ABC.map(s => ({ id: "abc_seed_" + s.code, code: s.code, name: s.name, description: s.description }));
  const seedVdnEntries = () => SEED_VDN.map((s, i) => ({ id: "vdn_seed_" + i, skill: s.skill, vdn: s.vdn, phone: s.phone, hours: s.hours }));

  const defaultState = {
    app: "SisGeral",
    schemaVersion: C.schemaVersion,
    exportedAt: new Date().toISOString(),
    data: {
      procedures: JSON.parse(JSON.stringify(C.defaultProcedures)).concat(seedScriptEntries()),
      history: [],
      archive: [],
      seedVersion: SEED_VERSION,
      abcProcedures: seedAbcEntries().concat(seedAbcProcEntries()),
      vdnList: seedVdnEntries(),
      settings: {
        attendantName: "Atendente de homologação",
        retentionDays: 0, // Nunca apagar (padrão) — mantém histórico/arquivo para o dashboard
        theme: "light",
        weather: { name: "Curitiba", lat: -25.4284, lon: -49.2733 }
      }
    }
  };

  const Store = {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return JSON.parse(JSON.stringify(defaultState));
        const parsed = JSON.parse(raw);
        if (parsed.data && parsed.data.procedures) {
          // Garante o procedimento de guia (p10)
          if (!parsed.data.procedures.some(p => p.id === "p10")) {
            parsed.data.procedures.splice(4, 0, JSON.parse(JSON.stringify(C.defaultProcedures.find(p => p.id === "p10"))));
          }
          // Garante o procedimento de transferência VDN (p11)
          if (!parsed.data.procedures.some(p => p.id === "p11")) {
            parsed.data.procedures.push(JSON.parse(JSON.stringify(C.defaultProcedures.find(p => p.id === "p11"))));
          }
          // Garante o procedimento de cobertura (p12)
          if (!parsed.data.procedures.some(p => p.id === "p12")) {
            parsed.data.procedures.push(JSON.parse(JSON.stringify(C.defaultProcedures.find(p => p.id === "p12"))));
          }
          // Migra o modelo de rede antigo para o novo (com {abc},{city},{uf},{bm})
          const rede = parsed.data.procedures.find(p => p.id === "p9");
          if (rede && (!rede.text || rede.text.indexOf("{abc}") === -1)) {
            rede.text = C.REDE_DEFAULT_TEXT;
          }
        }
        // Garante campos de settings
        if (parsed.data && parsed.data.settings) {
          if (!parsed.data.settings.weather) parsed.data.settings.weather = { name: "Curitiba", lat: -25.4284, lon: -49.2733 };
          if (parsed.data.settings.retentionDays === undefined) parsed.data.settings.retentionDays = 0;
        }

        // Semeia ABC e VDN dos PDFs (merge, sem apagar o que o usuário já tem)
        if (parsed.data && (!parsed.data.seedVersion || parsed.data.seedVersion < SEED_VERSION)) {
          if (!parsed.data.abcProcedures) parsed.data.abcProcedures = [];
          seedAbcEntries().forEach(s => {
            if (!parsed.data.abcProcedures.some(a => (a.code || '').trim() === s.code)) {
              parsed.data.abcProcedures.push(s);
            }
          });
          seedAbcProcEntries().forEach(s => {
            if (!parsed.data.abcProcedures.some(a => (a.code || '').trim() === s.code)) {
              parsed.data.abcProcedures.push(s);
            }
          });
          if (parsed.data.procedures) {
            seedScriptEntries().forEach(s => {
              if (!parsed.data.procedures.some(p => p.id === s.id)) parsed.data.procedures.push(s);
            });
            // Agrupa os scripts importados pelo campo Grupo (aditivo; não apaga nem sobrescreve grupo já definido)
            parsed.data.procedures.forEach(p => {
              if (p && typeof p.id === 'string' && p.id.startsWith('scr_') && (!p.grupo || !p.grupo.trim())) {
                p.grupo = grupoForTitulo(p.title, p.category);
              }
            });
          }
          if (!parsed.data.vdnList) parsed.data.vdnList = [];
          seedVdnEntries().forEach(s => {
            if (!parsed.data.vdnList.some(v => (v.skill || '').trim().toLowerCase() === s.skill.toLowerCase())) {
              parsed.data.vdnList.push(s);
            }
          });

          // Atualiza p1/p3/p4 para as novas categorias (boleto/rca_flow) só se não foram editados
          if (parsed.data.procedures) {
            ['p1', 'p3', 'p4'].forEach(pid => {
              const atual = parsed.data.procedures.find(p => p.id === pid);
              const novo = C.defaultProcedures.find(p => p.id === pid);
              if (atual && novo && (atual.text || '').trim() === (PROC_TEXTO_ANTIGO[pid] || '').trim()) {
                atual.title = novo.title;
                atual.category = novo.category;
                atual.text = novo.text;
                if (novo.orientacao !== undefined) atual.orientacao = novo.orientacao;
                if (novo.link !== undefined) atual.link = novo.link;
                if (novo.showPanel !== undefined) atual.showPanel = novo.showPanel;
              }
            });
          }

          parsed.data.seedVersion = SEED_VERSION;
        }

        return parsed;
      } catch (e) {
        return JSON.parse(JSON.stringify(defaultState));
      }
    },
    save(state) {
      state.exportedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  };

  let state = Store.load();
  C.reconcile(state);

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
      for (const [key, val] of Object.entries(props)) {
        if (key === 'className') el.className = val;
        else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.substring(2).toLowerCase(), val);
        else el.setAttribute(key, val);
      }
    }
    children.forEach(child => {
      if (child === null || child === undefined) return;
      if (typeof child === 'string' || typeof child === 'number') el.appendChild(document.createTextNode(String(child)));
      else if (child instanceof Node) el.appendChild(child);
    });
    return el;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = h('div', { className: `toast ${type}` }, message);
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3000);
  }

  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    .table-scroll-container {
      max-height: 380px;
      overflow-y: auto;
      border: 1px solid var(--border-color, #cbd5e1);
      border-radius: 6px;
      position: relative;
    }
    #history-table { width: 100%; border-collapse: collapse; }
    #history-table th {
      position: sticky; top: 0;
      background: var(--surface-alt, #f1f5f9);
      z-index: 10; box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .badge-guia { background-color: #0284c7; color: #fff; }
    .dashboard-select, .dashboard-btn {
      padding: 0.35rem 0.5rem;
      border: 1px solid var(--border-color, #cbd5e1);
      border-radius: 6px;
      background: var(--surface-color, #fff);
      color: var(--text-main, #1e293b);
      font-size: 0.75rem; outline: none; transition: all 0.2s ease;
    }
    .dashboard-select:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15); }
    .dashboard-btn { background: var(--surface-alt, #f1f5f9); cursor: pointer; font-weight: 500; }
    .dashboard-btn:hover { background: var(--border-color, #cbd5e1); }
  `;
  document.head.appendChild(styleEl);

  const tableHistory = document.getElementById('history-table');
  if (tableHistory && !tableHistory.parentElement.classList.contains('table-scroll-container')) {
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'table-scroll-container';
    tableHistory.parentNode.insertBefore(scrollContainer, tableHistory);
    scrollContainer.appendChild(tableHistory);
  }

  // ====================== CABEÇALHO / RELÓGIO / CLIMA ATUAL ======================
  function updateHeaderInfo() {
    const clock = document.getElementById('live-clock');
    if (!clock) return;

    const now = new Date();
    const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const weekdayStr = weekdays[now.getDay()];

    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = now.getFullYear();
    const dateFormatted = `${dayStr}/${monthStr}/${yearStr}`;
    const timeFormatted = now.toLocaleTimeString();

    const allRecords = [...(state.data.history || []), ...(state.data.archive || [])];
    const todayStr = now.toDateString();
    const todayCount = allRecords.filter(r => new Date(r.createdAt).toDateString() === todayStr).length;

    const cityName = state.data.settings.weather?.name || "Curitiba";
    let weatherText;
    if (window._weatherCurrent) {
      weatherText = `${C.weatherIcon(window._weatherCurrent.code)} ${cityName}: ${window._weatherCurrent.temp}°C`;
    } else {
      weatherText = `🌤️ ${cityName}`;
    }

    clock.innerHTML = `<span style="font-weight: 500;">${weekdayStr}, ${dateFormatted} - ${timeFormatted}</span> <span style="opacity: 0.8; margin-left: 8px;">| ${weatherText} | Atendimentos hoje: <strong>${todayCount}</strong></span>`;
    buildTicker();
  }

  // Estatísticas de fluxo (reutilizado pelo ticker e pelo painel)
  function computeFlowStats(records) {
    const byDay = {}, byHour = {}, contagem = {};
    (records || []).forEach(r => {
      const d = new Date(r.createdAt);
      byDay[d.getDate()] = (byDay[d.getDate()] || 0) + 1;
      byHour[d.getHours()] = (byHour[d.getHours()] || 0) + 1;
      (r.procedureIds || []).filter(id => id && id !== 'sys_compliance').forEach(id => contagem[id] = (contagem[id] || 0) + 1);
    });
    const ents = o => Object.entries(o).map(([k, v]) => ({ k: Number(k), v }));
    const dayE = ents(byDay), hourE = ents(byHour);
    const maxBy = a => a.length ? a.reduce((x, y) => y.v > x.v ? y : x) : null;
    const minBy = a => a.length ? a.reduce((x, y) => y.v < x.v ? y : x) : null;
    let topProc = null, topN = 0;
    Object.entries(contagem).forEach(([id, n]) => { if (n > topN) { topN = n; topProc = id; } });
    return { maiorDia: maxBy(dayE), menorDia: minBy(dayE), maiorHora: maxBy(hourE), menorHora: minBy(hourE), topProc, topN };
  }
  function procTituloPorId(id) {
    const p = (state.data.procedures || []).find(x => x.id === id);
    return p ? p.title : '—';
  }

  // ===== Ticker rolante (estilo bolsa) — informações de produtividade =====
  function buildTicker() {
    const track = document.getElementById('ticker-track');
    if (!track) return;
    const now = new Date();
    const all = [...(state.data.history || []), ...(state.data.archive || [])];
    const mesRecords = all.filter(r => { const d = new Date(r.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const mes = mesRecords.length;
    const procs = (state.data.procedures || []).length;
    const s = computeFlowStats(mesRecords);
    const itens = [
      `🗓️ Atendimentos no mês: <b>${mes}</b>`,
      s.topProc ? `🏆 Mais acionado: <b>${procTituloPorId(s.topProc)}</b> (${s.topN})` : null,
      s.maiorDia ? `📈 Maior dia de fluxo: <b>dia ${s.maiorDia.k}</b> (${s.maiorDia.v})` : null,
      s.menorDia ? `📉 Menor dia de fluxo: <b>dia ${s.menorDia.k}</b> (${s.menorDia.v})` : null,
      s.maiorHora ? `⏰ Pico de horário: <b>${s.maiorHora.k}h</b> (${s.maiorHora.v})` : null,
      s.menorHora ? `🕐 Menor horário: <b>${s.menorHora.k}h</b> (${s.menorHora.v})` : null,
      `📚 Catálogo: <b>${procs}</b> procedimentos`
    ].filter(Boolean);
    const sig = itens.join('|');
    if (track._sig === sig) return; // evita reiniciar a animação à toa
    track._sig = sig;
    const content = itens.map(t => `<span class="ti">${t}</span>`).join('');
    track.innerHTML = content + content; // duplicado para loop contínuo
  }

  // ===== Aba Versões / Changelog =====
  const APP_VERSION = "3.26";
  const CHANGELOG = [
    { v: "3.26", d: "29/10/2026", items: ["Boleto: parâmetros numa linha só (mês, SMS, e-mail) e botão \"Acrescentar boleto\" pra mais de um mês — no prontuário vira \"10/2026 e também 11/2026\"", "Boleto: o envio sai em linhas próprias no fim do texto — \"SMS de cadastro enviado com sucesso\" e \"A solicitação de envio de e-mail foi cadastrada com sucesso\", uma embaixo da outra; o [SMS/e-mail] do texto vira o canal escolhido"] },
    { v: "3.25", d: "26/10/2026", items: ["Importação de TXT passou a preservar os procedimentos usados (não vira mais tudo \"Histórico Importado\") e casa os nomes com o catálogo para contarem no Top do painel", "Dark Mode: contraste corrigido nos elementos de fundo ciano (menu ⋮, janela ativa do painel, atalho Hoje/Mês inteiro e botões primários) — texto escuro sobre o ciano, legível"] },
    { v: "3.24", d: "26/10/2026", items: ["Hotfix: importação de relatório TXT voltou a funcionar — o leitor passou a aceitar a data com vírgula (\"DD/MM/AAAA, HH:MM:SS\") que o próprio sistema exporta; uma data estranha não derruba mais o import inteiro e o cabeçalho deixou de virar registro fantasma"] },
    { v: "3.23", d: "24/10/2026", items: ["Prontuário: do 2º procedimento em diante vira \"Beneficiário(a) também entrou...\" — sem repetir o nome (nem a chave quando vazio)", "Ticker: passou a mostrar produtividade (atendimentos no mês, mais acionado, maior/menor dia de fluxo, pico e menor horário) — sem duplicar o que já está no cabeçalho", "Painel: novos indicadores Maior dia, Menor dia, Pico de horário e Hora + fraca"] },
    { v: "3.22", d: "24/10/2026", items: ["Painel abre no mês inteiro por padrão", "Clique na barra da Evolução Diária filtra aquele dia; clicar de novo desfaz e volta ao mês", "Atalho rápido 'Hoje | Mês inteiro' dentro da gaveta de Filtros", "'Janelas' virou gaveta recolhível (igual aos Filtros)", "Novo Atendimento: marcar um procedimento não limpa mais a busca — dá pra escolher outra macro da mesma pesquisa", "Novo Atendimento: no prontuário, {bnf} ou bnf* (e pedido/protocolo/atendente) expandem direto para o valor"] },
    { v: "3.21", d: "24/10/2026", items: ["Barras verticais (Evolução Diária) não colapsam mais com o filtro de dia — mostram sempre o mês inteiro e destacam o dia selecionado", "O filtro de Dia agora atua só no recorte do dia (métricas, Fluxo por Horário e Top procedimentos); os mapas de calor seguem mensais", "Gaveta de filtros abre aberta por padrão (campo Dia visível)"] },
    { v: "3.20", d: "23/10/2026", items: ["Procedimentos parecidos (variações importadas) agora recebem um Grupo automático, ficando colados ao ordenar/filtrar por grupo — sem apagar nada; seus originais ficam intactos"] },
    { v: "3.19", d: "23/10/2026", items: ["Novo Atendimento: catálogo ordenado por categoria (A-Z) por padrão", "Painel: 'Filtros do painel' virou gaveta (abre/fecha)", "Painel: filtro de Dia (padrão hoje) + qualquer dia do mês para análise", "Painel: duas visões gerais — Diário (dia selecionado) e Mensal — puxando os mesmos blocos", "Painel: painel lateral com destaque visual", "Painel: métricas e painel lateral fixos logo abaixo do header ao rolar"] },
    { v: "3.18", d: "23/10/2026", items: ["Dashboard reorganizado: coluna esquerda fixa (sticky) com Filtros em cima e a navegação de janelas embaixo; métricas movidas para uma faixa no topo da direita, acima das janelas"] },
    { v: "3.17", d: "23/10/2026", items: ["Campo Grupo confirmado como padrão (camada de organização separada da Categoria)", "Validade de guia corrigida para hoje + 120 dias (chave {validade_120})", "Do 2º procedimento em diante o prontuário começa com \"Beneficiário(a) também...\" para evitar repetição", "Painel lateral no Dashboard: Visão geral como home e cada janela (Top, Evolução, Fluxo, mapas) navegável individualmente", "Gráfico de barras: números não cortam mais acima da área"] },
    { v: "3.16", d: "23/10/2026", items: ["Campo Grupo nos procedimentos — camada de organização separada da Categoria (que dispara os blocos). Filtro por grupo e ordenação A-Z Grupo no catálogo; grupo em branco é deduzido automaticamente pelo título/categoria"] },
    { v: "3.15", d: "23/10/2026", items: ["Busca do catálogo com botão ×, tooltip de descritivo ao passar o mouse e reset ao selecionar", "Dark Mode repaginado (inputs, badges e contraste)", "Ticker rolante no topo com indicadores do dia", "Aba Versões + README"] },
    { v: "3.14", d: "23/10/2026", items: ["Importados 86 scripts da biblioteca como procedimentos (variações por situação)"] },
    { v: "3.13", d: "23/10/2026", items: ["Validação de Dados trava os procedimentos e remove a mensagem ao remarcar", "Heatmap alinhado ao calendário real e barras do dashboard com escala proporcional"] },
    { v: "3.12", d: "22/10/2026", items: ["64 códigos de procedimento (8 dígitos) pesquisáveis no ABC", "Destaque de pico nos heatmaps"] },
    { v: "3.11", d: "22/10/2026", items: ["Toasts à esquerda, ⋮ em ABC/VDN, Rede com busca + descrição, links múltiplos, categoria Cobertura e heatmaps comparativos"] },
    { v: "3.10", d: "21/10/2026", items: ["VDN com busca, telefone (beneficiário) e código interno (Avaya)"] },
    { v: "3.9", d: "21/10/2026", items: ["Texto manual preservado (merge por blocos), categoria VDN e botão Último registro"] },
    { v: "3.7–3.8", d: "21/10/2026", items: ["Categorias Boleto e RCA/Flow, chave {boleto}, chips com scroll e máscara mm/aaaa"] },
    { v: "3.6", d: "21/10/2026", items: ["ABC e VDN populados dos PDFs, com migração sem perder dados"] },
    { v: "3.4–3.5", d: "21/10/2026", items: ["Novo Atendimento repaginado, editor com chaves clicáveis, histórico e dashboard reorganizados, painel de apoio"] },
    { v: "3.3", d: "20/10/2026", items: ["Base: correções do fluxo de atendimento, calendário/clima, dashboard e rede credenciada"] },
    { v: "2.0", d: "15–19/10/2026", items: ["Ciclo de amadurecimento: dezenas de saves incrementais refinando lógica, dados e usabilidade — ainda com o visual cru das 5 abas, preparando o grande redesenho da linha 3.x"] },
    { v: "1.0", d: "13/10/2026", items: ["Primeiro protótipo funcional (o \"bebê porquinho\"), já com as 5 abas:", "Novo Atendimento — prontuário compilado de forma cumulativa pelo catálogo (procedimentos Relevante/Situacional, chaves {bnf}/{pedido}/{protocolo}/{atendente}) e a caixa de validação de dados", "Calendário & Clima — Open-Meteo em tempo real, contagem de dias corridos por intervalo e feriados do mês", "Atendimentos Anteriores — últimos 30 em tela + arquivo geral com filtro por ano/mês e exportação em TXT", "Configurações — backup/importação em JSON, reset de fábrica e dump do banco local", "Dashboard básico — filtros ano/mês/semana, totais (ano/mês/filtro) e distribuição diária"] }
  ];
  function renderVersoes() {
    const host = document.getElementById('versoes-container');
    if (!host) return;
    host.innerHTML = '';
    const badge = document.getElementById('versao-atual');
    if (badge) badge.textContent = 'SisGeral ' + APP_VERSION;
    CHANGELOG.forEach(c => {
      const ul = h('ul', {});
      c.items.forEach(i => ul.appendChild(h('li', {}, i)));
      host.appendChild(h('div', { className: 'versao-item' },
        h('div', {}, h('span', { className: 'v-tag' }, 'v' + c.v), h('span', { className: 'v-date' }, c.d)),
        ul
      ));
    });
  }

  setInterval(updateHeaderInfo, 1000);
  updateHeaderInfo();
  // selo de versão no painel de configurações
  const _setBadge = document.querySelector('#settings-panel .settings-badge');
  if (_setBadge) _setBadge.textContent = 'SisGeral ' + APP_VERSION;

  // ====================== CLIMA (Open-Meteo, sem chave) ======================
  async function ensureWeather(force) {
    const w = state.data.settings.weather || {};
    if (window._weatherLoading) return;
    if (!force && window._weatherLoadedCity === w.name && window._weatherData) return;

    window._weatherLoading = true;
    try {
      let lat = w.lat, lon = w.lon;
      if (lat == null || lon == null) {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(w.name || 'Curitiba')}&count=1&language=pt&format=json`).then(r => r.json());
        if (geo && geo.results && geo.results[0]) {
          lat = geo.results[0].latitude;
          lon = geo.results[0].longitude;
          w.lat = lat; w.lon = lon;
          Store.save(state);
        }
      }
      if (lat != null && lon != null) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&current_weather=true&timezone=auto&forecast_days=16`;
        const data = await fetch(url).then(r => r.json());
        const map = {};
        if (data && data.daily && data.daily.time) {
          data.daily.time.forEach((t, i) => {
            map[t] = {
              max: Math.round(data.daily.temperature_2m_max[i]),
              min: Math.round(data.daily.temperature_2m_min[i]),
              code: data.daily.weathercode[i],
              precip: data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[i] : null
            };
          });
        }
        window._weatherData = map;
        window._weatherLoadedCity = w.name;
        if (data && data.current_weather) {
          window._weatherCurrent = { temp: Math.round(data.current_weather.temperature), code: data.current_weather.weathercode };
        }
      }
    } catch (e) {
      // Falha de rede: segue sem clima (células apenas sem ícone)
    }
    window._weatherLoading = false;

    if (document.getElementById('panel-calendar')?.classList.contains('active')) renderCalendar();
    updateHeaderInfo();
  }

  // ====================== TEMA ======================
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  applyTheme(state.data.settings.theme);

  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    state.data.settings.theme = state.data.settings.theme === 'dark' ? 'light' : 'dark';
    Store.save(state);
    applyTheme(state.data.settings.theme);
  });

  // ====================== PAINEL DE CONFIGURAÇÕES ======================
  const settingsPanel = document.getElementById('settings-panel');

  function computeStorageUsage() {
    const el = document.getElementById('storage-usage-meter');
    if (!el) return;
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k);
        total += (k ? k.length : 0) + (v ? v.length : 0);
      }
    } catch (e) {
      el.textContent = "Uso do localStorage: indisponível";
      return;
    }
    const kb = total / 1024;
    const txt = kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
    el.textContent = `Uso do localStorage: ${txt}`;
  }

  function populateSettingsPanel() {
    const att = document.getElementById('setting-attendant');
    if (att) att.value = state.data.settings.attendantName || "";
    const ret = document.getElementById('setting-retention');
    if (ret) ret.value = String(state.data.settings.retentionDays ?? 0);
    const th = document.getElementById('setting-theme');
    if (th) th.value = state.data.settings.theme || "light";
    computeStorageUsage();
  }

  document.getElementById('btn-toggle-settings')?.addEventListener('click', () => {
    const willOpen = !settingsPanel?.classList.contains('open');
    settingsPanel?.classList.toggle('open');
    if (willOpen) populateSettingsPanel();
  });
  document.getElementById('btn-close-settings')?.addEventListener('click', () => {
    settingsPanel?.classList.remove('open');
  });

  document.getElementById('setting-attendant')?.addEventListener('change', (e) => {
    state.data.settings.attendantName = e.target.value;
    Store.save(state);
  });
  document.getElementById('setting-retention')?.addEventListener('change', (e) => {
    state.data.settings.retentionDays = Number(e.target.value);
    Store.save(state);
    showToast("Retenção atualizada.");
  });
  document.getElementById('setting-theme')?.addEventListener('change', (e) => {
    state.data.settings.theme = e.target.value === 'auto' ? 'light' : e.target.value;
    Store.save(state);
    applyTheme(state.data.settings.theme);
  });

  // Apagar Tudo — reset completo (hard reset) para o estado padrão
  document.getElementById('btn-clear-all')?.addEventListener('click', () => {
    if (!confirm("ATENÇÃO: isso vai apagar TUDO (atendimentos, procedimentos, ABC, VDN e configurações) e restaurar o sistema ao estado inicial.\n\nEsta ação é irreversível. Deseja continuar?")) return;
    if (!confirm("Tem certeza absoluta? Todos os dados serão perdidos permanentemente.")) return;

    state = JSON.parse(JSON.stringify(defaultState));
    Store.save(state);
    window._weatherData = null;
    window._weatherLoadedCity = null;

    selectedProcedureIds = [];
    isManualEdited = false;

    populateRedeEspecialidades();
    buildCatalogHeaderMenu();
    renderProceduresCatalog();
    document.querySelectorAll('#procedures-container input[type="checkbox"]').forEach(cb => cb.checked = false);
    renderOrientacoes();
    recompileProntuario();
    setupHistoryFilters();
    renderHistory();
    initDashboardFiltersAndRender();
    renderCalendar();
    renderAbcView();
    renderVdnView();
    applyTheme(state.data.settings.theme);
    populateSettingsPanel();
    updateHeaderInfo();
    settingsPanel?.classList.remove('open');
    showToast("Sistema restaurado ao estado inicial.", "success");
  });

  // ====================== IMPORT/EXPORT JSON ======================
  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sisgeral_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Backup exportado com sucesso!", "success");
  });

  document.getElementById('input-import-json')?.addEventListener('change', (event) => {
    const fileReader = new FileReader();
    if (event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed && parsed.data) {
            state = parsed;
            // reaplica migrações do Store.load
            if (state.data.procedures) {
              const rede = state.data.procedures.find(p => p.id === "p9");
              if (rede && (!rede.text || rede.text.indexOf("{abc}") === -1)) rede.text = C.REDE_DEFAULT_TEXT;
            }
            if (state.data.settings && !state.data.settings.weather) state.data.settings.weather = { name: "Curitiba", lat: -25.4284, lon: -49.2733 };
            Store.save(state);
            C.reconcile(state);
            window._weatherData = null; window._weatherLoadedCity = null;
            populateRedeEspecialidades();
            renderProceduresCatalog();
            renderHistory();
            initDashboardFiltersAndRender();
            renderAbcView();
            renderVdnView();
            applyTheme(state.data.settings.theme);
            updateHeaderInfo();
            showToast("Backup importado com sucesso!", "success");
          } else {
            showToast("Arquivo JSON inválido.", "error");
          }
        } catch (err) {
          showToast("Erro ao processar o arquivo JSON.", "error");
        }
      };
    }
  });

  // Import de histórico em TXT
  let txtImportInput = document.getElementById('input-import-txt-history');
  if (!txtImportInput) {
    txtImportInput = h('input', { type: 'file', id: 'input-import-txt-history', accept: '.txt', style: 'display:none;' });
    document.body.appendChild(txtImportInput);

    txtImportInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const importedRecords = C.parseTxtHistory(content);
          if (importedRecords.length > 0) {
            // Casa os nomes dos procedimentos com o catálogo (p/ contarem no Top do painel)
            importedRecords.forEach(r => {
              r.procedureIds = (r.procedures || [])
                .map(nome => (state.data.procedures.find(p => p.title === nome) || {}).id)
                .filter(Boolean);
            });
            if (!state.data.history) state.data.history = [];
            state.data.history.unshift(...importedRecords);
            Store.save(state);
            setupHistoryFilters();
            renderHistory();
            initDashboardFiltersAndRender();
            updateHeaderInfo();
            showToast(`Sucesso! ${importedRecords.length} chamados importados do TXT.`, "success");
          } else {
            showToast("Nenhum chamado encontrado no arquivo TXT.", "error");
          }
        } catch (err) {
          showToast("Erro ao processar o arquivo TXT.", "error");
        }
        txtImportInput.value = "";
      };
      reader.readAsText(file, "UTF-8");
    });
  }

  // ====================== ABAS ======================
  const tabs = document.querySelectorAll('[role="tab"]');
  const panels = document.querySelectorAll('[role="tabpanel"]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      panels.forEach(p => p.classList.remove('active'));
      tab.setAttribute('aria-selected', 'true');
      const panelId = tab.getAttribute('aria-controls');
      document.getElementById(panelId)?.classList.add('active');

      if (panelId === 'panel-history') { setupHistoryFilters(); renderHistory(); }
      if (panelId === 'panel-calendar') { ensureWeather(); renderCalendar(); }
      if (panelId === 'panel-dashboard') initDashboardFiltersAndRender();
      if (panelId === 'panel-abcvdn') { renderAbcView(); renderVdnView(); }
      if (panelId === 'panel-versoes') renderVersoes();
    });
  });

  // ====================== HISTÓRICO: FILTROS ======================
  function setupHistoryFilters() {
    const historyPanel = document.getElementById('panel-history');
    if (!historyPanel) return;

    document.getElementById('history-filters-box')?.remove();
    document.getElementById('multi-delete-action-container')?.remove();

    let cardFilters = historyPanel.querySelector('.card');
    if (!cardFilters) {
      cardFilters = h('div', { className: 'card', style: 'padding: 0.6rem 0.8rem; margin-bottom: 0.6rem;' });
      historyPanel.insertBefore(cardFilters, historyPanel.firstChild);
    } else {
      cardFilters.innerHTML = "";
      cardFilters.style.padding = "0.6rem 0.8rem";
      cardFilters.style.marginBottom = "0.6rem";
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const yearSelect = h('select', { id: 'hist-filter-year', className: 'dashboard-select', onChange: renderHistory });
    yearSelect.appendChild(h('option', { value: '' }, 'Todos'));
    for (let y = currentYear - 3; y <= currentYear + 1; y++) {
      const opt = h('option', { value: y }, y);
      if (y === currentYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthSelect = h('select', { id: 'hist-filter-month', className: 'dashboard-select', onChange: renderHistory });
    monthSelect.appendChild(h('option', { value: '' }, 'Todos'));
    monthNames.forEach((name, idx) => {
      const opt = h('option', { value: idx }, name);
      if (idx === currentMonth) opt.selected = true;
      monthSelect.appendChild(opt);
    });

    const daySelect = h('select', { id: 'hist-filter-day', className: 'dashboard-select', onChange: renderHistory });
    daySelect.appendChild(h('option', { value: '', selected: true }, 'Todos os Dias'));
    for (let d = 1; d <= 31; d++) {
      daySelect.appendChild(h('option', { value: d }, `Dia ${d < 10 ? '0' + d : d}`));
    }

    const weekSelect = h('select', { id: 'hist-filter-week', className: 'dashboard-select', onChange: renderHistory });
    weekSelect.appendChild(h('option', { value: '' }, 'Todas'));
    weekSelect.appendChild(h('option', { value: 'current', selected: true }, 'Atual (Dom-Sáb)'));
    weekSelect.appendChild(h('option', { value: 'w1' }, '1ª Semana'));
    weekSelect.appendChild(h('option', { value: 'w2' }, '2ª Semana'));
    weekSelect.appendChild(h('option', { value: 'w3' }, '3ª Semana'));
    weekSelect.appendChild(h('option', { value: 'w4' }, '4ª Semana'));

    const leftCol = h('div', {},
      h('h3', { style: 'font-size: 0.8rem; font-weight: bold; margin-bottom: 0.4rem; color: var(--primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.2rem;' }, 'Filtros do Histórico'),
      h('div', { style: 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem;' },
        h('div', {}, h('label', { style: 'font-size:0.65rem; font-weight:bold; display:block; margin-bottom:1px;' }, 'Ano'), yearSelect),
        h('div', {}, h('label', { style: 'font-size:0.65rem; font-weight:bold; display:block; margin-bottom:1px;' }, 'Mês'), monthSelect),
        h('div', {}, h('label', { style: 'font-size:0.65rem; font-weight:bold; display:block; margin-bottom:1px;' }, 'Dia (1-31)'), daySelect),
        h('div', {}, h('label', { style: 'font-size:0.65rem; font-weight:bold; display:block; margin-bottom:1px;' }, 'Semana'), weekSelect)
      )
    );

    const btnExportTxt = h('button', {
      id: 'btn-export-txt-reports',
      className: 'dashboard-btn',
      style: 'font-size: 0.68rem; padding: 0.32rem 0.5rem; white-space: nowrap;',
      onClick: () => {
        const allRecords = [...(state.data.history || []), ...(state.data.archive || [])];
        if (allRecords.length === 0) { showToast("Nenhum atendimento para exportar.", "error"); return; }
        let txtContent = "=== HISTÓRICO GERAL DE ATENDIMENTOS ===\n\n";
        allRecords.forEach((r, idx) => {
          txtContent += `[CHAMADO #${idx + 1}]\n`;
          txtContent += `DATA/HORA: ${new Date(r.createdAt).toLocaleString()}\n`;
          txtContent += `BENEFICIÁRIO: ${r.bnfInitial || 'N/I'}\n`;
          txtContent += `PROTOCOLO: ${r.protocol || 'N/I'}\n`;
          txtContent += `GUIA/PEDIDO: ${r.order || 'N/I'}\n`;
          txtContent += `ATENDENTE: ${r.attendant || 'N/I'}\n`;
          txtContent += `PROCEDIMENTOS: ${(r.procedures || []).join(', ')}\n`;
          txtContent += `PRONTUÁRIO FINAL DE CONFORMIDADE OPERACIONAL:\n${r.note || ''}\n`;
          txtContent += `=========================================================================\n\n`;
        });
        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Relatorio_Atendimentos_${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        showToast("Relatório exportado com sucesso!", "success");
      }
    }, '📤 Exportar (TXT)');

    const btnImportTxt = h('button', {
      id: 'btn-trigger-import-txt',
      className: 'dashboard-btn',
      style: 'font-size: 0.68rem; padding: 0.32rem 0.5rem; white-space: nowrap;',
      onClick: () => txtImportInput.click()
    }, '📥 Importar (TXT)');

    const btnDeleteSelected = h('button', {
      id: 'btn-delete-selected',
      className: 'btn-warning',
      style: 'font-size: 0.68rem; padding: 0.32rem 0.5rem; font-weight: bold; white-space: nowrap;',
      onClick: () => {
        const checkedBoxes = document.querySelectorAll('.history-row-checkbox:checked');
        if (checkedBoxes.length === 0) { showToast("Selecione pelo menos um atendimento para excluir.", "error"); return; }
        if (confirm(`Deseja realmente excluir os ${checkedBoxes.length} atendimentos selecionados?`)) {
          const idsToRemove = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-id'));
          state.data.history = state.data.history.filter(i => !idsToRemove.includes(i.id));
          state.data.archive = state.data.archive.filter(i => !idsToRemove.includes(i.id));
          Store.save(state);
          renderHistory();
          initDashboardFiltersAndRender();
          updateHeaderInfo();
          showToast("Atendimentos selecionados excluídos com sucesso!", "success");
        }
      }
    }, '🗑️ Apagar selecionados');

    // NOVO: Apagar Todos os Relatórios (hard reset de registros)
    const btnDeleteAll = h('button', {
      id: 'btn-delete-all-reports',
      className: 'btn-danger',
      style: 'font-size: 0.68rem; padding: 0.32rem 0.5rem; font-weight: bold; white-space: nowrap; border: 2px solid var(--danger-hover);',
      onClick: () => {
        const total = (state.data.history || []).length + (state.data.archive || []).length;
        if (total === 0) { showToast("Não há relatórios para apagar.", "error"); return; }
        if (!confirm(`⚠️ ATENÇÃO: isto vai APAGAR TODOS os ${total} relatórios (histórico + arquivo), de forma permanente.\n\nProcedimentos, ABC e VDN são mantidos. Deseja continuar?`)) return;
        if (!confirm("Confirmação final: apagar TODOS os relatórios? Esta ação não pode ser desfeita.")) return;
        state.data.history = [];
        state.data.archive = [];
        Store.save(state);
        renderHistory();
        initDashboardFiltersAndRender();
        updateHeaderInfo();
        showToast("Todos os relatórios foram apagados.", "success");
      }
    }, '🧨 Apagar todos');

    const totalLabel = h('span', { id: 'archive-count-label', style: 'font-size: 0.75rem; font-weight: bold; color: var(--text-muted); text-align: right;' }, 'Total: 0');

    const rightCol = h('div', { style: 'display: flex; flex-direction: column; justify-content: space-between;' },
      h('div', { style: 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.2rem; margin-bottom: 0.4rem;' },
        h('h3', { style: 'font-size: 0.8rem; font-weight: bold; color: var(--primary); margin: 0;' }, 'Relatórios'),
        totalLabel
      ),
      h('div', { style: 'display: flex; gap: 0.35rem; align-items: center; flex-wrap: nowrap;' },
        btnImportTxt,
        btnExportTxt,
        btnDeleteSelected,
        btnDeleteAll
      )
    );

    const mainGrid = h('div', { style: 'display: grid; grid-template-columns: 0.85fr 1.5fr; gap: 0.8rem; align-items: stretch;' }, leftCol, rightCol);
    cardFilters.appendChild(mainGrid);
  }

  // ====================== NOVO ATENDIMENTO ======================
  let selectedProcedureIds = [];
  let isManualEdited = false;

  function redeSelected() {
    return selectedProcedureIds.some(id => state.data.procedures.find(p => p.id === id)?.category === 'rede');
  }

  function renderRedeEspResults(filtro) {
    const box = document.getElementById('rede-esp-results');
    if (!box) return;
    box.innerHTML = '';
    const termo = C.removeAccents(filtro || '');
    if (!termo) { box.style.display = 'none'; return; }
    const matches = (state.data.abcProcedures || []).filter(a =>
      C.removeAccents(`${a.name} ${a.code} ${a.description || ''}`).includes(termo)
    ).slice(0, 10);
    if (matches.length === 0) {
      box.style.display = 'flex';
      box.appendChild(h('div', { className: 'hint', style: 'padding:0.3rem;' }, 'Nada encontrado.'));
      return;
    }
    box.style.display = 'flex';
    matches.forEach(a => {
      box.appendChild(h('div', {
        className: 'vdn-result', title: a.description || '',
        onClick: () => selectRedeEsp(a.id)
      },
        h('span', { style: 'font-weight:600;' }, `${a.name} (${a.code})`),
        h('span', { className: 'hint', style: 'white-space:normal;' }, (a.description || '').slice(0, 90))
      ));
    });
  }

  function selectRedeEsp(id) {
    const hidden = document.getElementById('rede-especialidade');
    const searchIn = document.getElementById('rede-esp-search');
    const results = document.getElementById('rede-esp-results');
    const selInfo = document.getElementById('rede-esp-selected');
    const a = (state.data.abcProcedures || []).find(x => x.id === id);
    if (hidden) hidden.value = id;
    if (searchIn && a) searchIn.value = `${a.name} (${a.code})`;
    if (results) { results.innerHTML = ''; results.style.display = 'none'; }
    if (selInfo) selInfo.textContent = a && a.description ? `ℹ️ ${a.description}` : '';
    recompileProntuario();
  }

  // Liga o campo de busca da especialidade (uma vez)
  function populateRedeEspecialidades() {
    const searchIn = document.getElementById('rede-esp-search');
    if (searchIn && !searchIn._wired) {
      searchIn._wired = true;
      searchIn.addEventListener('input', (e) => {
        const hidden = document.getElementById('rede-especialidade');
        if (hidden) hidden.value = '';
        const selInfo = document.getElementById('rede-esp-selected');
        if (selInfo) selInfo.textContent = '';
        renderRedeEspResults(e.target.value);
        recompileProntuario();
      });
    }
  }

  function boletoSelected() {
    return selectedProcedureIds.some(id => state.data.procedures.find(p => p.id === id)?.category === 'boleto');
  }

  function vdnSelected() {
    return selectedProcedureIds.some(id => state.data.procedures.find(p => p.id === id)?.category === 'vdn');
  }

  function coberturaSelected() {
    return selectedProcedureIds.some(id => state.data.procedures.find(p => p.id === id)?.category === 'cobertura');
  }

  function getCoberturaData() {
    return {
      cob1: document.getElementById('cobertura-1')?.value || "",
      cob2: document.getElementById('cobertura-2')?.value || "",
      cobre: document.getElementById('cobertura-cobre')?.checked ?? true,
      carencia: document.getElementById('cobertura-carencia')?.checked ?? false
    };
  }

  function populateCoberturaSugestoes() {
    const dl = document.getElementById('cobertura-sugestoes');
    if (!dl) return;
    dl.innerHTML = '';
    (state.data.abcProcedures || []).forEach(a => {
      dl.appendChild(h('option', { value: a.name }));
    });
  }

  function getVdnData() {
    const selId = document.getElementById('vdn-transfer')?.value || "";
    const v = (state.data.vdnList || []).find(x => x.id === selId);
    return { setor: v ? v.skill : "", num: v ? v.vdn : "" };
  }

  function renderVdnResults(filtro) {
    const box = document.getElementById('vdn-results');
    if (!box) return;
    box.innerHTML = '';
    const termo = C.removeAccents(filtro || '');
    if (!termo) { box.style.display = 'none'; return; }
    const matches = (state.data.vdnList || []).filter(v =>
      C.removeAccents(`${v.skill} ${v.vdn} ${v.phone}`).includes(termo)
    ).slice(0, 8);
    if (matches.length === 0) {
      box.style.display = 'flex';
      box.appendChild(h('div', { className: 'hint', style: 'padding:0.3rem;' }, 'Nenhum setor encontrado.'));
      return;
    }
    box.style.display = 'flex';
    matches.forEach(v => {
      box.appendChild(h('div', {
        className: 'vdn-result',
        onClick: () => selectVdnTransfer(v.id)
      },
        h('span', { style: 'font-weight:600;' }, v.skill),
        h('span', { className: 'hint' }, `${v.vdn && v.vdn !== 'Não possui' ? 'VDN ' + v.vdn + ' · ' : ''}${v.phone}`)
      ));
    });
  }

  function renderVdnSelectedInfo(id) {
    const info = document.getElementById('vdn-selected-info');
    if (!info) return;
    const v = (state.data.vdnList || []).find(x => x.id === id);
    if (!v) { info.style.display = 'none'; info.innerHTML = ''; return; }
    info.innerHTML = '';
    info.style.display = 'flex';

    const linhaCopia = (rotulo, valor, msg) => {
      const temValor = valor && valor !== 'Não possui' && valor !== '---';
      const row = h('div', { className: 'vdn-info-row' },
        h('div', {},
          h('span', { className: 'vdn-info-label' }, rotulo),
          h('span', { className: 'vdn-info-value' }, valor || '—')
        )
      );
      if (temValor) {
        row.appendChild(h('button', {
          className: 'btn-secondary', style: 'font-size:0.68rem; padding:0.2rem 0.4rem;',
          onClick: () => navigator.clipboard.writeText(valor).then(() => showToast(msg, 'success'))
        }, '📋 Copiar'));
      }
      return row;
    };

    info.appendChild(h('div', { className: 'vdn-info-setor' }, v.skill));
    info.appendChild(linhaCopia('Telefone (p/ beneficiário):', v.phone, 'Telefone copiado!'));
    info.appendChild(linhaCopia('Código interno (Avaya/VDN):', v.vdn, 'Código VDN copiado!'));
    info.appendChild(h('div', { className: 'hint', style: 'margin-top:2px;' }, `Horário: ${v.hours || '—'}`));
  }

  function selectVdnTransfer(id) {
    const hidden = document.getElementById('vdn-transfer');
    const searchIn = document.getElementById('vdn-search-input');
    const results = document.getElementById('vdn-results');
    const v = (state.data.vdnList || []).find(x => x.id === id);
    if (hidden) hidden.value = id;
    if (searchIn && v) searchIn.value = v.skill;
    if (results) { results.innerHTML = ''; results.style.display = 'none'; }
    renderVdnSelectedInfo(id);
    recompileProntuario();
  }

  // Preparação do campo de busca de VDN (liga o filtro uma vez)
  function populateVdnTransfer() {
    const searchIn = document.getElementById('vdn-search-input');
    if (searchIn && !searchIn._wired) {
      searchIn._wired = true;
      searchIn.addEventListener('input', (e) => {
        // ao digitar, invalida a seleção até clicar num resultado
        const hidden = document.getElementById('vdn-transfer');
        if (hidden) hidden.value = '';
        const info = document.getElementById('vdn-selected-info');
        if (info) { info.style.display = 'none'; info.innerHTML = ''; }
        renderVdnResults(e.target.value);
        recompileProntuario();
      });
    }
  }

  function getBoletoData() {
    return {
      mesRef: document.getElementById('boleto-mes')?.value || "",
      meses: [...document.querySelectorAll('.boleto-mes')].map(i => i.value.trim()).filter(Boolean),
      envio: {
        sms: document.getElementById('boleto-envio-sms')?.checked || false,
        email: document.getElementById('boleto-envio-email')?.checked || false
      }
    };
  }

  function getRedeData() {
    const selAbcId = document.getElementById('rede-especialidade')?.value || "";
    const abcObj = (state.data.abcProcedures || []).find(a => a.id === selAbcId);
    return {
      especialidade: abcObj ? `${abcObj.name} (${abcObj.code})` : "",
      codigo: abcObj ? abcObj.code : "",
      estado: document.getElementById('rede-estado')?.value || "",
      cidade: document.getElementById('rede-cidade')?.value || "",
      municipio: document.getElementById('rede-municipio')?.value || "",
      envio: {
        sms: document.getElementById('rede-envio-sms')?.checked || false,
        email: document.getElementById('rede-envio-email')?.checked || false
      }
    };
  }

  // Menu de 3 pontinhos (⋮) reutilizável
  function makeKebab(items, opts = {}) {
    const wrap = h('div', { className: 'kebab-wrap' });
    const btn = h('button', {
      className: 'kebab-btn' + (opts.primary ? ' primary' : ''),
      title: opts.title || 'Opções',
      onClick: (e) => {
        e.stopPropagation();
        const wasOpen = wrap.classList.contains('open');
        document.querySelectorAll('.kebab-wrap.open').forEach(w => w.classList.remove('open'));
        if (!wasOpen) {
          wrap.classList.add('open');
          // Posiciona com position:fixed p/ escapar do overflow do catálogo/cards
          const r = btn.getBoundingClientRect();
          const menuW = 200;
          let left = r.right - menuW;
          if (left < 6) left = 6;
          menu.style.left = left + 'px';
          menu.style.top = (r.bottom + 3) + 'px';
        }
      }
    }, '⋮');
    const menu = h('div', { className: 'kebab-menu' });
    items.forEach(it => {
      menu.appendChild(h('button', {
        className: 'kebab-item' + (it.danger ? ' danger' : ''),
        onClick: (e) => { e.stopPropagation(); wrap.classList.remove('open'); it.onClick(); }
      }, it.label));
    });
    wrap.appendChild(btn);
    wrap.appendChild(menu);
    return wrap;
  }
  document.addEventListener('click', () => {
    document.querySelectorAll('.kebab-wrap.open').forEach(w => w.classList.remove('open'));
  });
  // menu é position:fixed — fecha ao rolar para não ficar "flutuando" solto
  document.addEventListener('scroll', () => {
    document.querySelectorAll('.kebab-wrap.open').forEach(w => w.classList.remove('open'));
  }, true);

  // ===== Grupos (organização, separado da categoria que define o comportamento) =====
  const GRUPOS = ['Pagamento', 'Cadastro/Contrato', 'Rede/Agendamento', 'Guia/Autorização', 'Cancelamento', 'Cobertura/Carência', 'Transferência', 'Acesso/App', 'Geral'];
  function grupoDe(proc) {
    if (proc.grupo && proc.grupo.trim()) return proc.grupo.trim();
    return grupoForTitulo(proc.title || '', proc.category);
  }
  function gruposDisponiveis() {
    const set = new Set();
    (state.data.procedures || []).forEach(p => { if (p.active) set.add(grupoDe(p)); });
    return GRUPOS.filter(g => set.has(g)).concat([...set].filter(g => !GRUPOS.includes(g)));
  }
  function populateGrupoFilter() {
    const sel = document.getElementById('grupo-filter');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '';
    sel.appendChild(h('option', { value: '' }, 'Todos os grupos'));
    gruposDisponiveis().forEach(g => sel.appendChild(h('option', { value: g }, g)));
    if (prev) sel.value = prev;
  }

  function renderProceduresCatalog() {
    const container = document.getElementById('procedures-container');
    if (!container) return;
    container.innerHTML = "";

    // Busca: prefixos *relevante +situacional #rede, senão termo livre
    let raw = (document.getElementById('procedure-search')?.value || "").trim();
    let catFilter = null;
    if (raw.startsWith('*')) { catFilter = 'relevante'; raw = raw.slice(1); }
    else if (raw.startsWith('+')) { catFilter = 'situacional'; raw = raw.slice(1); }
    else if (raw.startsWith('#')) { catFilter = 'rede'; raw = raw.slice(1); }
    const term = C.removeAccents(raw.trim());
    const showDisabled = document.getElementById('show-disabled-procedures')?.checked || false;
    const grupoFilter = document.getElementById('grupo-filter')?.value || '';

    let lista = state.data.procedures.filter(proc => {
      if (!showDisabled && !proc.active) return false;
      if (catFilter && proc.category !== catFilter) return false;
      if (grupoFilter && grupoDe(proc) !== grupoFilter) return false;
      if (term) {
        const haystack = C.removeAccents(`${proc.title} ${proc.category} ${grupoDe(proc)} ${proc.text || ''} ${proc.orientacao || ''}`);
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    if (window.procSort === 'az-proc') {
      lista = lista.slice().sort((a, b) => C.removeAccents(a.title).localeCompare(C.removeAccents(b.title)));
    } else if (window.procSort === 'az-cat') {
      lista = lista.slice().sort((a, b) =>
        C.removeAccents(a.category).localeCompare(C.removeAccents(b.category)) ||
        C.removeAccents(a.title).localeCompare(C.removeAccents(b.title)));
    } else if (window.procSort === 'az-grupo') {
      lista = lista.slice().sort((a, b) =>
        grupoDe(a).localeCompare(grupoDe(b)) ||
        C.removeAccents(a.title).localeCompare(C.removeAccents(b.title)));
    }

    if (lista.length === 0) {
      container.appendChild(h('div', { className: 'hint', style: 'padding:0.5rem; text-align:center;' }, 'Nenhum procedimento encontrado.'));
      return;
    }

    lista.forEach(proc => {
      const isChecked = selectedProcedureIds.includes(proc.id);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isChecked;
      checkbox.disabled = !!window.vddLocked;

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (!selectedProcedureIds.includes(proc.id)) selectedProcedureIds.push(proc.id);
        } else {
          selectedProcedureIds = selectedProcedureIds.filter(id => id !== proc.id);
        }
        const redeBlock = document.getElementById('rede-block-container');
        if (redeSelected()) {
          populateRedeEspecialidades();
          if (redeBlock) redeBlock.style.display = 'flex';
        } else if (redeBlock) {
          redeBlock.style.display = 'none';
        }
        const boletoBlock = document.getElementById('boleto-block-container');
        if (boletoBlock) boletoBlock.style.display = boletoSelected() ? 'flex' : 'none';
        const vdnBlock = document.getElementById('vdn-block-container');
        if (vdnSelected()) {
          populateVdnTransfer();
          if (vdnBlock) vdnBlock.style.display = 'flex';
        } else if (vdnBlock) {
          vdnBlock.style.display = 'none';
        }
        const cobBlock = document.getElementById('cobertura-block-container');
        if (coberturaSelected()) {
          populateCoberturaSugestoes();
          if (cobBlock) cobBlock.style.display = 'flex';
        } else if (cobBlock) {
          cobBlock.style.display = 'none';
        }
        renderOrientacoes();
        recompileProntuario();
        // (A busca NÃO é limpa ao marcar — permite escolher outra macro da mesma pesquisa)
      });

      const badge = h('span', { className: `badge-cat badge-${proc.category}` }, proc.category);
      const grpTag = h('span', { className: 'grupo-tag' }, grupoDe(proc));
      const label = h('label', { style: 'display:flex; align-items:center; gap:0.4rem; flex:1; flex-wrap:wrap;' }, checkbox, badge, grpTag, proc.title);

      const kebab = makeKebab([
        { label: '✏️ Editar', onClick: () => openEditProcedureModal(proc) },
        { label: '🗑️ Excluir', danger: true, onClick: () => {
          if (confirm(`Deseja excluir o procedimento "${proc.title}"?`)) {
            state.data.procedures = state.data.procedures.filter(p => p.id !== proc.id);
            selectedProcedureIds = selectedProcedureIds.filter(id => id !== proc.id);
            Store.save(state);
            renderProceduresCatalog();
            populateGrupoFilter();
            renderOrientacoes();
            recompileProntuario();
            showToast("Procedimento excluído.");
          }
        } }
      ]);

      const item = h('div', { className: 'procedure-item' + (window.vddLocked ? ' proc-locked' : '') }, label, kebab);
      // Mini janela (tooltip) com o descritivo ao passar o mouse
      const resumo = (proc.text || '').trim() || (proc.orientacao || '').trim();
      if (resumo) {
        item.addEventListener('mouseenter', () => showProcTip(item, proc));
        item.addEventListener('mouseleave', hideProcTip);
      }
      container.appendChild(item);
    });
  }

  // Tooltip flutuante do procedimento
  function _procTipEl() {
    let el = document.getElementById('proc-hover-tip');
    if (!el) {
      el = h('div', { id: 'proc-hover-tip', className: 'proc-hover-tip' });
      document.body.appendChild(el);
    }
    return el;
  }
  function showProcTip(item, proc) {
    const el = _procTipEl();
    el.innerHTML = '';
    el.appendChild(h('div', { className: 'tip-title' }, `${proc.title}`));
    el.appendChild(h('div', { className: 'tip-cat' }, proc.category));
    if ((proc.text || '').trim()) el.appendChild(h('div', { className: 'tip-body' }, proc.text));
    if ((proc.orientacao || '').trim()) el.appendChild(h('div', { className: 'tip-ori' }, '📌 ' + proc.orientacao));
    el.style.display = 'block';
    const r = item.getBoundingClientRect();
    const tw = 320;
    let left = r.right + 8;
    if (left + tw > window.innerWidth - 8) left = r.left - tw - 8;
    if (left < 8) left = 8;
    let top = r.top;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    // ajusta se passar da base da tela
    const th = el.getBoundingClientRect().height;
    if (top + th > window.innerHeight - 8) el.style.top = Math.max(8, window.innerHeight - th - 8) + 'px';
  }
  function hideProcTip() {
    const el = document.getElementById('proc-hover-tip');
    if (el) el.style.display = 'none';
  }

  // Botão × da busca
  document.getElementById('btn-clear-search')?.addEventListener('click', () => {
    const si = document.getElementById('procedure-search');
    if (si) { si.value = ''; si.focus(); }
    renderProceduresCatalog();
  });

  // Header do catálogo: busca funcional + menu (⋮) com + Novo / A-Z
  document.getElementById('procedure-search')?.addEventListener('input', renderProceduresCatalog);
  document.getElementById('show-disabled-procedures')?.addEventListener('change', renderProceduresCatalog);
  document.getElementById('grupo-filter')?.addEventListener('change', renderProceduresCatalog);

  function buildCatalogHeaderMenu() {
    const host = document.getElementById('catalog-menu-host');
    if (!host) return;
    host.innerHTML = '';
    const kebab = makeKebab([
      { label: '➕ Novo procedimento', onClick: () => openNewProcedureModal() },
      { label: 'A-Z Procedimento', onClick: () => { window.procSort = window.procSort === 'az-proc' ? 'none' : 'az-proc'; renderProceduresCatalog(); showToast(window.procSort === 'az-proc' ? 'Ordenado por procedimento.' : 'Ordem original.'); } },
      { label: 'A-Z Categoria', onClick: () => { window.procSort = window.procSort === 'az-cat' ? 'none' : 'az-cat'; renderProceduresCatalog(); showToast(window.procSort === 'az-cat' ? 'Ordenado por categoria.' : 'Ordem original.'); } },
      { label: 'A-Z Grupo', onClick: () => { window.procSort = window.procSort === 'az-grupo' ? 'none' : 'az-grupo'; renderProceduresCatalog(); showToast(window.procSort === 'az-grupo' ? 'Ordenado por grupo.' : 'Ordem original.'); } }
    ], { primary: true, title: 'Opções do catálogo' });
    host.appendChild(kebab);
  }

  document.getElementById('btn-uncheck-all-procs')?.addEventListener('click', () => {
    selectedProcedureIds = [];
    const redeBlock = document.getElementById('rede-block-container');
    if (redeBlock) redeBlock.style.display = 'none';
    const boletoBlock = document.getElementById('boleto-block-container');
    if (boletoBlock) boletoBlock.style.display = 'none';
    const vdnBlock = document.getElementById('vdn-block-container');
    if (vdnBlock) vdnBlock.style.display = 'none';
    const cobBlock = document.getElementById('cobertura-block-container');
    if (cobBlock) cobBlock.style.display = 'none';
    document.querySelectorAll('#procedures-container input[type="checkbox"]').forEach(cb => cb.checked = false);
    renderOrientacoes();
    recompileProntuario();
    showToast("Procedimentos desmarcados (seu texto manual foi mantido).");
  });

  // Insere uma chave no último campo de texto focado (texto base ou orientação)
  let lastProcField = 'proc-modal-text';
  function insertChaveNoCampo(chave) {
    const el = document.getElementById(lastProcField) || document.getElementById('proc-modal-text');
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + chave + el.value.slice(end);
    const pos = start + chave.length;
    el.focus();
    el.setSelectionRange(pos, pos);
  }

  function buildVarChips() {
    const host = document.getElementById('proc-var-chips');
    if (!host) return;
    host.innerHTML = '';
    const mk = (titulo, lista) => {
      host.appendChild(h('div', { className: 'var-group-title' }, titulo));
      const grid = h('div', { className: 'var-chip-grid' });
      lista.forEach(v => {
        grid.appendChild(h('button', {
          type: 'button',
          className: 'var-chip',
          title: v.desc + ' — clique para inserir',
          draggable: 'true',
          onClick: () => insertChaveNoCampo(v.chave),
          ondragstart: null
        },
          h('span', { className: 'var-chip-key' }, v.chave),
          h('span', { className: 'var-chip-desc' }, v.desc)
        ));
      });
      host.appendChild(grid);
    };
    mk('Variáveis gerais', VARIAVEIS_GERAIS);
    mk('Rede credenciada', VARIAVEIS_REDE);
    mk('Boleto', VARIAVEIS_BOLETO);
    mk('VDN / Transferência', VARIAVEIS_VDN);
    mk('Cobertura', VARIAVEIS_COBERTURA);
    // drag & drop (arrastar a chave para dentro do campo)
    host.querySelectorAll('.var-chip').forEach((chip, i) => {
      const all = [...VARIAVEIS_GERAIS, ...VARIAVEIS_REDE, ...VARIAVEIS_BOLETO, ...VARIAVEIS_VDN, ...VARIAVEIS_COBERTURA];
      chip.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', all[i].chave); });
    });
  }

  function enableChaveDrop(id) {
    const el = document.getElementById(id);
    if (!el || el._dropWired) return;
    el._dropWired = true;
    el.addEventListener('focus', () => { lastProcField = id; });
    el.addEventListener('dragover', (e) => e.preventDefault());
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const chave = e.dataTransfer.getData('text/plain');
      if (chave) { lastProcField = id; insertChaveNoCampo(chave); }
    });
  }

  // ---- Links múltiplos no editor (1 por padrão, cresce até 5; vazio não conta) ----
  const MAX_LINKS = 5;
  function buildLinkInputs(links) {
    const host = document.getElementById('proc-modal-links-host');
    if (!host) return;
    host.innerHTML = '';
    let lista = (links && links.length) ? links.slice() : [''];
    if (lista[lista.length - 1].trim() !== '' && lista.length < MAX_LINKS) lista.push('');
    lista.forEach((val, idx) => {
      const input = h('input', { type: 'text', value: val, placeholder: `https://... (${idx + 1}º link)` });
      input.addEventListener('input', () => {
        const inputs = [...host.querySelectorAll('input')];
        const isLast = idx === inputs.length - 1;
        if (isLast && input.value.trim() !== '' && inputs.length < MAX_LINKS) {
          host.appendChild(h('input', { type: 'text', placeholder: `https://... (${inputs.length + 1}º link)` }));
        }
      });
      host.appendChild(input);
    });
  }
  function getLinkValues() {
    const host = document.getElementById('proc-modal-links-host');
    if (!host) return [];
    return [...host.querySelectorAll('input')].map(i => i.value.trim()).filter(v => v !== '').slice(0, MAX_LINKS);
  }
  function procLinks(proc) {
    if (proc.links && proc.links.length) return proc.links.filter(l => (l || '').trim());
    if (proc.link && proc.link.trim()) return [proc.link.trim()];
    return [];
  }

  function openNewProcedureModal() {
    const modal = document.getElementById('modal-procedure');
    document.getElementById('modal-procedure-title').textContent = "Novo Procedimento";
    document.getElementById('proc-modal-id').value = "";
    document.getElementById('proc-modal-title').value = "";
    document.getElementById('proc-modal-category').value = "relevante";
    document.getElementById('proc-modal-text').value = "";
    const ori = document.getElementById('proc-modal-orientacao'); if (ori) ori.value = "";
    buildLinkInputs(['']);
    const sh = document.getElementById('proc-modal-show'); if (sh) sh.checked = true;
    const gp = document.getElementById('proc-modal-grupo'); if (gp) gp.value = "";
    lastProcField = 'proc-modal-text';
    buildVarChips();
    enableChaveDrop('proc-modal-text');
    enableChaveDrop('proc-modal-orientacao');
    modal?.showModal();
  }

  function openEditProcedureModal(proc) {
    const modal = document.getElementById('modal-procedure');
    document.getElementById('modal-procedure-title').textContent = "Editar Procedimento";
    document.getElementById('proc-modal-id').value = proc.id;
    document.getElementById('proc-modal-title').value = proc.title;
    document.getElementById('proc-modal-category').value = proc.category;
    document.getElementById('proc-modal-text').value = proc.text || "";
    const ori = document.getElementById('proc-modal-orientacao'); if (ori) ori.value = proc.orientacao || "";
    buildLinkInputs(procLinks(proc));
    const sh = document.getElementById('proc-modal-show'); if (sh) sh.checked = proc.showPanel !== false;
    const gp = document.getElementById('proc-modal-grupo'); if (gp) gp.value = proc.grupo || "";
    lastProcField = 'proc-modal-text';
    buildVarChips();
    enableChaveDrop('proc-modal-text');
    enableChaveDrop('proc-modal-orientacao');
    modal?.showModal();
  }

  // Bloco de orientação (abaixo do prontuário) — read-only, acordeão por procedimento marcado
  function renderOrientacoes() {
    const host = document.getElementById('orientacao-block');
    if (!host) return;
    host.innerHTML = '';
    // Só entram procedimentos marcados, com "Exibir" ligado, e que tenham algo a mostrar
    const comApoio = selectedProcedureIds
      .map(id => state.data.procedures.find(p => p.id === id))
      .filter(p => p && p.showPanel !== false && ((p.orientacao || '').trim() || procLinks(p).length));

    if (comApoio.length === 0) { host.style.display = 'none'; return; }
    host.style.display = 'flex';

    host.appendChild(h('div', { className: 'orientacao-head' }, '📌 Apoio ao atendimento (uso interno — não vai para o prontuário)'));
    comApoio.forEach(p => {
      const corpo = h('div', { className: 'orientacao-body' });
      (p.orientacao || '').split('\n').forEach(linha => {
        const t = linha.trim();
        if (!t) return;
        if (t.startsWith('- ')) corpo.appendChild(h('div', { className: 'orientacao-li' }, '• ' + t.slice(2)));
        else corpo.appendChild(h('div', {}, t));
      });
      procLinks(p).forEach(lk => {
        corpo.appendChild(h('a', { className: 'orientacao-link', href: lk, target: '_blank', rel: 'noopener' }, '🔗 ' + lk));
      });
      const det = h('details', { className: 'orientacao-item', open: 'true' },
        h('summary', {}, `${p.title}`),
        corpo
      );
      host.appendChild(det);
    });
  }

  // Blocos de texto já inseridos no prontuário, por procedimento (para splice sem apagar o manual)
  window.procBlocks = window.procBlocks || {};

  function currentFieldsParams() {
    const fields = {
      bnf: document.getElementById('field-bnf')?.value || "",
      pedido: document.getElementById('field-order')?.value || "",
      protocolo: document.getElementById('field-protocol')?.value || "",
      atendente: document.getElementById('field-attendant')?.value || ""
    };
    const params = {
      rede: redeSelected() ? getRedeData() : null,
      boleto: boletoSelected() ? getBoletoData() : null,
      vdn: vdnSelected() ? getVdnData() : null,
      cobertura: coberturaSelected() ? getCoberturaData() : null
    };
    return { fields, params };
  }

  function blockTextFor(procId, isFirst = true) {
    const { fields, params } = currentFieldsParams();
    let txt = C.compileProntuario([procId], state.data.procedures, fields, params, true).text;
    // 2º procedimento em diante: evita repetir o beneficiário.
    // "Beneficiário(a) <nome> entrou..." -> "Beneficiário(a) também entrou..." (sem repetir o nome)
    if (!isFirst && /^Beneficiário\(a\) (?!também)/.test(txt)) {
      const bnfVal = (fields.bnf && fields.bnf.trim()) ? fields.bnf.trim() : "[Nome do beneficiário]";
      const prefixComNome = "Beneficiário(a) " + bnfVal + " ";
      if (txt.startsWith(prefixComNome)) {
        txt = "Beneficiário(a) também " + txt.slice(prefixComNome.length);
      } else {
        // fallback: ao menos insere "também" (caso o texto não comece com o nome)
        txt = txt.replace(/^Beneficiário\(a\) /, "Beneficiário(a) também ");
      }
    }
    return txt;
  }

  // Helpers de splice
  function _appendBlock(cur, block) {
    if (!block) return cur;
    const base = cur.replace(/\s+$/, '');
    return base ? base + '\n\n' + block : block;
  }
  function _removeBlock(cur, block) {
    if (!block) return cur;
    const i = cur.indexOf(block);
    if (i < 0) return cur;
    const before = cur.slice(0, i).replace(/\s+$/, '');
    const after = cur.slice(i + block.length).replace(/^\s+/, '');
    return (before && after) ? before + '\n\n' + after : (before || after);
  }
  function _replaceBlock(cur, oldB, newB) {
    const i = cur.indexOf(oldB);
    if (i < 0) return _appendBlock(cur, newB);
    return cur.slice(0, i) + newB + cur.slice(i + oldB.length);
  }

  // Sincroniza o prontuário preservando edições manuais; só mexe nos blocos dos procedimentos
  function recompileProntuario() {
    const ta = document.getElementById('prontuario-textarea');
    if (!ta) return;
    const complianceChecked = document.getElementById('field-compliance')?.checked ?? true;

    // Modo "validação falhou": texto fixo (substitui tudo)
    if (!complianceChecked) {
      const { fields } = currentFieldsParams();
      const txt = C.compileProntuario([], state.data.procedures, fields, null, false).text;
      ta.value = txt;
      window.procBlocks = { '__compliance__': txt };
      return;
    }

    let cur = ta.value;

    // Voltou a marcar VdD: remove a mensagem de "não passou" (não pode permanecer)
    if (window.procBlocks['__compliance__']) {
      cur = _removeBlock(cur, window.procBlocks['__compliance__']);
      delete window.procBlocks['__compliance__'];
    }

    // Remove blocos de procedimentos desmarcados
    Object.keys(window.procBlocks).forEach(pid => {
      if (pid === '__base__') return;
      if (!selectedProcedureIds.includes(pid)) {
        cur = _removeBlock(cur, window.procBlocks[pid]);
        delete window.procBlocks[pid];
      }
    });

    if (selectedProcedureIds.length === 0) {
      // Sem procedimentos: mostra a linha base só se não houver texto manual
      const semManual = cur.trim() === '' || cur.trim() === (window.procBlocks['__base__'] || '').trim();
      if (semManual) {
        const { fields } = currentFieldsParams();
        const base = C.compileProntuario([], state.data.procedures, fields, null, true).text;
        window.procBlocks = { '__base__': base };
        ta.value = base;
        return;
      }
      // há texto manual — não força a linha base
      delete window.procBlocks['__base__'];
      ta.value = cur;
      return;
    }

    // Há procedimentos: remove a linha base se ainda estiver lá
    if (window.procBlocks['__base__']) {
      cur = _removeBlock(cur, window.procBlocks['__base__']);
      delete window.procBlocks['__base__'];
    }

    // Adiciona (ou atualiza, se campo mudou) o bloco de cada procedimento marcado, na ordem
    selectedProcedureIds.forEach((pid, idx) => {
      const novo = blockTextFor(pid, idx === 0);
      if (window.procBlocks[pid] === undefined) {
        cur = _appendBlock(cur, novo);
        window.procBlocks[pid] = novo;
      } else if (window.procBlocks[pid] !== novo) {
        cur = _replaceBlock(cur, window.procBlocks[pid], novo);
        window.procBlocks[pid] = novo;
      }
    });

    ta.value = cur;
  }

  // Recompor = regenerar do zero (descarta edições manuais)
  function recomporTudo() {
    window.procBlocks = {};
    const ta = document.getElementById('prontuario-textarea');
    if (ta) ta.value = '';
    recompileProntuario();
  }

  ['field-bnf', 'field-order', 'field-protocol', 'field-attendant'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', recompileProntuario);
    document.getElementById(id)?.addEventListener('change', recompileProntuario);
  });

  // Validação de Dados: desmarcou → trava os procedimentos (não pode continuar o atendimento)
  function setVddLock(locked) {
    window.vddLocked = locked;
    if (locked) {
      // quem não passou na VdD não tem procedimento: limpa seleção e esconde blocos de parâmetro
      selectedProcedureIds = [];
      ['rede-block-container', 'boleto-block-container', 'vdn-block-container', 'cobertura-block-container'].forEach(bid => {
        const el = document.getElementById(bid); if (el) el.style.display = 'none';
      });
    }
    renderProceduresCatalog();
    renderOrientacoes();
    recompileProntuario();
  }
  document.getElementById('field-compliance')?.addEventListener('change', (e) => {
    setVddLock(!e.target.checked);
  });

  // Campos da rede, boleto e VDN recompilam o prontuário ao mudar
  ['rede-estado', 'rede-cidade', 'rede-municipio', 'rede-envio-sms', 'rede-envio-email',
   'boleto-envio-sms', 'boleto-envio-email'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', recompileProntuario);
    document.getElementById(id)?.addEventListener('change', recompileProntuario);
  });

  // Campos de cobertura recompilam ao mudar
  ['cobertura-1', 'cobertura-2', 'cobertura-cobre', 'cobertura-carencia'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', recompileProntuario);
    document.getElementById(id)?.addEventListener('change', recompileProntuario);
  });
  document.getElementById('btn-add-cobertura')?.addEventListener('click', () => {
    const g = document.getElementById('cobertura-2-group');
    if (g) g.style.display = 'flex';
    document.getElementById('cobertura-2')?.focus();
  });

  // Máscara automática mm/aaaa no mês do boleto (insere a barra sozinha)
  document.getElementById('boleto-linhas')?.addEventListener('input', (e) => {
    if (!e.target.classList.contains('boleto-mes')) return;
    let d = e.target.value.replace(/\D/g, '').slice(0, 6);
    if (d.length > 2) d = d.slice(0, 2) + '/' + d.slice(2);
    e.target.value = d;
    recompileProntuario();
  });
  // Mais um mês de boleto na mesma linha (com × pra tirar)
  document.getElementById('btn-add-boleto')?.addEventListener('click', () => {
    const linha = document.getElementById('boleto-linhas'); if (!linha) return;
    const item = document.createElement('span'); item.className = 'boleto-item';
    item.innerHTML = '<input type="text" class="boleto-mes" placeholder="mm/aaaa" maxlength="7"><button type="button" class="boleto-x" title="Tirar este mês">×</button>';
    item.querySelector('.boleto-x').addEventListener('click', () => { item.remove(); recompileProntuario(); });
    const ultimo = [...linha.querySelectorAll('.boleto-item')].pop();
    ultimo ? ultimo.insertAdjacentElement('afterend', item) : linha.prepend(item);
    item.querySelector('input').focus();
  });

  document.getElementById('prontuario-textarea')?.addEventListener('input', () => { isManualEdited = true; });

  // Expansão por atalho no prontuário: {bnf} OU bnf* -> valor atual (mesma sigla das chaves)
  const EXPAND_FIELDS = {
    bnf: () => (document.getElementById('field-bnf')?.value.trim() || '[Nome do beneficiário]'),
    pedido: () => (document.getElementById('field-order')?.value.trim() || '[Número do pedido]'),
    guia: () => (document.getElementById('field-order')?.value.trim() || '[Número do pedido]'),
    protocolo: () => (document.getElementById('field-protocol')?.value.trim() || '[Número do protocolo]'),
    atendente: () => (document.getElementById('field-attendant')?.value.trim() || '[Nome do atendente]')
  };
  document.getElementById('prontuario-textarea')?.addEventListener('input', (e) => {
    const ta = e.target;
    const pos = ta.selectionStart;
    if (pos == null) return;
    const before = ta.value.slice(0, pos);
    let sigla = null, matchLen = 0;
    let m = before.match(/([a-zA-Z_]+)\*$/);          // gatilho: sigla + asterisco
    if (m && EXPAND_FIELDS[m[1].toLowerCase()]) { sigla = m[1].toLowerCase(); matchLen = m[0].length; }
    else {
      m = before.match(/\{([a-zA-Z_]+)\}$/);          // gatilho: {sigla}
      if (m && EXPAND_FIELDS[m[1].toLowerCase()]) { sigla = m[1].toLowerCase(); matchLen = m[0].length; }
    }
    if (!sigla) return;
    const val = EXPAND_FIELDS[sigla]();
    const start = pos - matchLen;
    ta.value = ta.value.slice(0, start) + val + ta.value.slice(pos);
    const newPos = start + val.length;
    ta.setSelectionRange(newPos, newPos);
    isManualEdited = true;
  });
  document.getElementById('btn-recompile')?.addEventListener('click', () => {
    if (confirm("Recompor vai regenerar o prontuário a partir dos procedimentos marcados e descartar o texto digitado manualmente. Continuar?")) {
      recomporTudo();
    }
  });

  // Limpa todos os campos do novo atendimento (mantém atendente e validação marcada)
  function clearAttendanceFields() {
    selectedProcedureIds = [];
    isManualEdited = false;
    window.procBlocks = {};
    const taP = document.getElementById('prontuario-textarea'); if (taP) taP.value = '';
    ['field-protocol', 'field-order', 'field-bnf', 'screen-phone', 'screen-email', 'rede-estado', 'rede-cidade', 'rede-municipio', 'boleto-mes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['rede-envio-sms', 'rede-envio-email', 'boleto-envio-sms', 'boleto-envio-email'].forEach(id => {
      const el = document.getElementById(id); if (el) el.checked = false;
    });
    document.querySelectorAll('#boleto-linhas .boleto-item').forEach((it, i) => { if (i > 0) it.remove(); });
    const esp = document.getElementById('rede-especialidade'); if (esp) esp.value = '';
    const espS = document.getElementById('rede-esp-search'); if (espS) espS.value = '';
    const espR = document.getElementById('rede-esp-results'); if (espR) { espR.innerHTML = ''; espR.style.display = 'none'; }
    const espI = document.getElementById('rede-esp-selected'); if (espI) espI.textContent = '';
    const vdnT = document.getElementById('vdn-transfer'); if (vdnT) vdnT.value = '';
    const vdnS = document.getElementById('vdn-search-input'); if (vdnS) vdnS.value = '';
    const vdnR = document.getElementById('vdn-results'); if (vdnR) { vdnR.innerHTML = ''; vdnR.style.display = 'none'; }
    const vdnI = document.getElementById('vdn-selected-info'); if (vdnI) { vdnI.innerHTML = ''; vdnI.style.display = 'none'; }
    ['cobertura-1', 'cobertura-2'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const cobCobre = document.getElementById('cobertura-cobre'); if (cobCobre) cobCobre.checked = true;
    const cobCar = document.getElementById('cobertura-carencia'); if (cobCar) cobCar.checked = false;
    const cob2g = document.getElementById('cobertura-2-group'); if (cob2g) cob2g.style.display = 'none';
    const comp = document.getElementById('field-compliance'); if (comp) comp.checked = true; // validação sempre volta marcada
    window.vddLocked = false; // destrava os procedimentos
    const rede = document.getElementById('rede-block-container'); if (rede) rede.style.display = 'none';
    const boletoB = document.getElementById('boleto-block-container'); if (boletoB) boletoB.style.display = 'none';
    const vdnB = document.getElementById('vdn-block-container'); if (vdnB) vdnB.style.display = 'none';
    const cobB = document.getElementById('cobertura-block-container'); if (cobB) cobB.style.display = 'none';
    renderProceduresCatalog();
    renderOrientacoes();
    recompileProntuario();
  }

  document.getElementById('btn-clear-attendance')?.addEventListener('click', () => {
    clearAttendanceFields();
    showToast("Campos limpos.");
  });

  document.getElementById('btn-copy-prontuario')?.addEventListener('click', () => {
    const text = document.getElementById('prontuario-textarea')?.value || "";
    navigator.clipboard.writeText(text).then(() => showToast("Copiado!", "success"));
  });

  // ===== Último registro (somente leitura + cópia) =====
  document.getElementById('btn-ultimo-registro')?.addEventListener('click', () => {
    const modal = document.getElementById('modal-ultimo');
    const cont = document.getElementById('ultimo-conteudo');
    const dataEl = document.getElementById('ultimo-data');
    const ta = document.getElementById('ultimo-prontuario');
    const all = [...(state.data.history || []), ...(state.data.archive || [])];
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const r = all[0];
    if (cont) cont.innerHTML = '';
    if (!r) {
      if (dataEl) dataEl.textContent = '';
      if (cont) cont.appendChild(h('div', { className: 'hint' }, 'Nenhum atendimento registrado ainda.'));
      if (ta) ta.value = '';
      modal?.showModal();
      return;
    }
    if (dataEl) dataEl.textContent = new Date(r.createdAt).toLocaleString();
    const linha = (l, v) => h('div', { style: 'font-size:0.8rem;' }, h('strong', {}, l + ': '), v || '-');
    if (cont) {
      cont.appendChild(linha('Beneficiário', r.bnfInitial));
      cont.appendChild(linha('Protocolo', r.protocol));
      cont.appendChild(linha('Pedido / Guia', r.order));
      cont.appendChild(linha('Atendente', r.attendant));
      cont.appendChild(linha('Procedimentos', (r.procedures || []).join(', ')));
    }
    if (ta) ta.value = r.note || '';
    modal?.showModal();
  });
  document.getElementById('btn-copy-ultimo')?.addEventListener('click', () => {
    const t = document.getElementById('ultimo-prontuario')?.value || "";
    navigator.clipboard.writeText(t).then(() => showToast("Prontuário copiado!", "success"));
  });

  document.getElementById('btn-finish-attendance')?.addEventListener('click', () => {
    const bnfInput = document.getElementById('field-bnf')?.value.trim();
    if (!bnfInput) {
      showToast("Preencha o Nome do Beneficiário.", "error");
      document.getElementById('field-bnf')?.focus();
      return;
    }

    const isComplianceChecked = document.getElementById('field-compliance')?.checked ?? true;
    const record = {
      id: "rec_" + Date.now(),
      createdAt: new Date().toISOString(),
      attendant: document.getElementById('field-attendant')?.value || "",
      bnfInitial: C.extractFirstName(bnfInput),
      protocol: document.getElementById('field-protocol')?.value || "-",
      order: document.getElementById('field-order')?.value || "-",
      procedures: isComplianceChecked ? (selectedProcedureIds.length ? selectedProcedureIds.map(id => state.data.procedures.find(p => p.id === id)?.title) : ["Sem classificação"]) : ["Falha na validação de dados"],
      procedureIds: isComplianceChecked ? selectedProcedureIds.slice() : ["sys_compliance"],
      note: document.getElementById('prontuario-textarea')?.value || ""
    };

    if (!state.data.history) state.data.history = [];
    state.data.history.unshift(record);
    C.rotate(state);
    Store.save(state);

    // Limpa TUDO (inclui telefone/e-mail) e volta a validação marcada
    clearAttendanceFields();

    initDashboardFiltersAndRender();
    renderHistory();
    updateHeaderInfo();
    showToast("Atendimento finalizado e salvo com sucesso!", "success");
  });

  // Modal de procedimento
  const modalProc = document.getElementById('modal-procedure');
  document.getElementById('btn-new-procedure')?.addEventListener('click', openNewProcedureModal);
  modalProc?.querySelector('button[value="cancel"]')?.addEventListener('click', () => modalProc.close());

  document.getElementById('btn-save-procedure')?.addEventListener('click', () => {
    const id = document.getElementById('proc-modal-id')?.value;
    const title = document.getElementById('proc-modal-title')?.value.trim();
    const category = document.getElementById('proc-modal-category')?.value;
    const text = document.getElementById('proc-modal-text')?.value;
    const orientacao = document.getElementById('proc-modal-orientacao')?.value || "";
    const links = getLinkValues();
    const showPanel = document.getElementById('proc-modal-show')?.checked ?? true;
    const grupo = (document.getElementById('proc-modal-grupo')?.value || "").trim();
    if (!title) { showToast("Informe o título do procedimento.", "error"); return; }

    if (id) {
      const match = state.data.procedures.find(p => p.id === id);
      if (match) { match.title = title; match.category = category; match.text = text; match.orientacao = orientacao; match.links = links; delete match.link; match.showPanel = showPanel; match.grupo = grupo; }
    } else {
      state.data.procedures.push({ id: "proc_" + Date.now(), title, category, text, orientacao, links, showPanel, grupo, active: true });
    }

    Store.save(state);
    modalProc?.close();
    renderProceduresCatalog();
    populateGrupoFilter();
    renderOrientacoes();
    recompileProntuario();
    showToast("Procedimento salvo!");
  });

  // ====================== HISTÓRICO: TABELA ======================
  function renderHistory() {
    const tbody = document.querySelector('#history-table tbody');
    if (!tbody) return;
    tbody.innerHTML = "";

    const allRecords = [...(state.data.history || []), ...(state.data.archive || [])];
    allRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const selYear = document.getElementById('hist-filter-year')?.value;
    const selMonth = document.getElementById('hist-filter-month')?.value;
    const selDay = document.getElementById('hist-filter-day')?.value;
    const selWeek = document.getElementById('hist-filter-week')?.value;

    const filteredRecords = allRecords.filter(r => {
      const d = new Date(r.createdAt);
      if (selYear && selYear !== "" && d.getFullYear() !== Number(selYear)) return false;
      if (selMonth !== "" && selMonth !== null && selMonth !== undefined && d.getMonth() !== Number(selMonth)) return false;
      if (selDay && selDay !== "" && d.getDate() !== Number(selDay)) return false;

      if (selWeek) {
        if (selWeek === 'current') {
          const now = new Date();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          if (d < startOfWeek || d > endOfWeek) return false;
        } else if (selWeek.startsWith('w')) {
          const weekNum = parseInt(selWeek.replace('w', ''), 10);
          const dayOfMonth = d.getDate();
          if (dayOfMonth < (weekNum - 1) * 7 + 1 || dayOfMonth > weekNum * 7) return false;
        }
      }
      return true;
    });

    const countLabel = document.getElementById('archive-count-label');
    if (countLabel) countLabel.textContent = `Total: ${filteredRecords.length}`;

    const theadTr = document.querySelector('#history-table thead tr');
    function currentHeaderCount() { return theadTr ? theadTr.children.length : 0; }

    if (theadTr && currentHeaderCount() !== 8) {
      theadTr.innerHTML = "";
      const thCheck = h('th', { style: 'width: 35px; text-align: center;' },
        h('input', {
          type: 'checkbox', title: 'Selecionar Todos',
          onChange: (e) => { document.querySelectorAll('.history-row-checkbox').forEach(cb => cb.checked = e.target.checked); }
        })
      );
      theadTr.appendChild(thCheck);
      theadTr.appendChild(h('th', {}, 'Data / Hora'));
      theadTr.appendChild(h('th', {}, 'Beneficiário'));
      theadTr.appendChild(h('th', {}, 'Protocolo'));
      theadTr.appendChild(h('th', {}, 'Pedido / Guia'));
      theadTr.appendChild(h('th', {}, 'Atendente'));
      theadTr.appendChild(h('th', {}, 'Procedimentos'));
      theadTr.appendChild(h('th', {}, 'Ações'));
    }

    if (filteredRecords.length === 0) {
      tbody.appendChild(h('tr', {}, h('td', { colSpan: 8, style: 'text-align:center; padding: 1.5rem;' }, 'Nenhum atendimento encontrado com os filtros selecionados.')));
      return;
    }

    filteredRecords.forEach(r => {
      const checkboxTd = h('td', { style: 'text-align: center;', onClick: (e) => e.stopPropagation() },
        h('input', { type: 'checkbox', className: 'history-row-checkbox', 'data-id': r.id })
      );

      const btnView = h('button', {
        className: 'dashboard-btn', style: 'padding:2px 6px; font-size:0.7rem; margin-right:4px;',
        onClick: (e) => { e.stopPropagation(); toggleDrawer(r.id); }
      }, '📖 Detalhes');

      const btnDelete = h('button', {
        className: 'btn-danger', style: 'padding:2px 6px; font-size:0.7rem;',
        onClick: (e) => {
          e.stopPropagation();
          if (confirm("Excluir este atendimento?")) {
            state.data.history = state.data.history.filter(i => i.id !== r.id);
            state.data.archive = state.data.archive.filter(i => i.id !== r.id);
            Store.save(state);
            renderHistory();
            initDashboardFiltersAndRender();
            updateHeaderInfo();
            showToast("Atendimento excluído.");
          }
        }
      }, 'Excluir');

      const tr = h('tr', { style: 'cursor:pointer;', onClick: () => toggleDrawer(r.id) },
        checkboxTd,
        h('td', {}, new Date(r.createdAt).toLocaleString()),
        h('td', {}, r.bnfInitial || "-"),
        h('td', {}, r.protocol || "-"),
        h('td', {}, r.order || "-"),
        h('td', {}, r.attendant || "-"),
        h('td', {}, (r.procedures || []).join(", ")),
        h('td', {}, btnView, btnDelete)
      );
      tbody.appendChild(tr);

      const drawerTr = h('tr', { id: `drawer-${r.id}`, style: 'display: none;' },
        h('td', { colSpan: 8, style: 'background: var(--surface-alt); padding: 0.75rem;' },
          h('div', { style: 'display: flex; flex-direction: column; gap: 0.5rem;' },
            h('div', { style: 'font-weight: bold; font-size: 0.8rem; color: var(--primary);' }, `Monitoria do Atendimento - Protocolo: ${r.protocol} | Pedido: ${r.order}`),
            h('textarea', {
              id: `note-input-${r.id}`,
              style: 'width: 100%; height: 110px; padding: 0.4rem; border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--surface-color); font-size: 0.8rem; font-family: monospace;'
            }, r.note || ""),
            h('div', { style: 'display: flex; gap: 0.4rem; justify-content: flex-end;' },
              h('button', {
                className: 'dashboard-btn', style: 'font-size: 0.7rem;',
                onClick: () => {
                  const text = document.getElementById(`note-input-${r.id}`).value;
                  navigator.clipboard.writeText(text).then(() => showToast("Prontuário copiado!", "success"));
                }
              }, '📋 Copiar'),
              h('button', {
                className: 'dashboard-btn', style: 'font-size: 0.7rem;',
                onClick: () => {
                  const text = document.getElementById(`note-input-${r.id}`).value;
                  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `Atendimento_${r.protocol || 'sem_protocolo'}.txt`;
                  link.click();
                  showToast("Download iniciado!");
                }
              }, '📥 Baixar TXT'),
              h('button', {
                className: 'btn-primary', style: 'font-size: 0.7rem;',
                onClick: () => {
                  const newNote = document.getElementById(`note-input-${r.id}`).value;
                  let target = state.data.history.find(item => item.id === r.id) || state.data.archive.find(item => item.id === r.id);
                  if (target) {
                    target.note = newNote;
                    Store.save(state);
                    renderHistory();
                    showToast("Alterações salvas com sucesso!", "success");
                  }
                }
              }, '💾 Salvar Alteração')
            )
          )
        )
      );
      tbody.appendChild(drawerTr);
    });
  }

  function toggleDrawer(id) {
    const drawer = document.getElementById(`drawer-${id}`);
    if (drawer) {
      drawer.style.display = (drawer.style.display === 'none' || drawer.style.display === '') ? 'table-row' : 'none';
    }
  }

  // ====================== CALENDÁRIO & CLIMA ======================
  function formatBR(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  function selectRangeDate(date) {
    if (!window.calRangeStart || (window.calRangeStart && window.calRangeEnd)) {
      window.calRangeStart = date;
      window.calRangeEnd = null;
    } else {
      if (date < window.calRangeStart) {
        window.calRangeEnd = window.calRangeStart;
        window.calRangeStart = date;
      } else {
        window.calRangeEnd = date;
      }
    }
    renderCalendar();
  }

  function buildWeatherCard() {
    const cityName = state.data.settings.weather?.name || "Curitiba";
    let desc = 'Carregando previsão...';
    if (window._weatherCurrent) {
      desc = `${C.weatherIcon(window._weatherCurrent.code)} ${window._weatherCurrent.temp}°C · ${C.weatherDesc(window._weatherCurrent.code)}`;
    } else if (window._weatherLoadedCity && !window._weatherCurrent) {
      desc = 'Previsão indisponível no momento.';
    }

    const resultsBox = h('div', { id: 'city-search-results', style: 'display:flex; flex-direction:column; gap:0.2rem; margin-top:0.3rem;' });
    const input = h('input', { id: 'input-city-search', type: 'text', placeholder: 'Cidade...', value: cityName, className: 'dashboard-select', style: 'flex:1;' });

    async function doSearch() {
      const val = input.value.trim();
      if (!val) return;
      resultsBox.innerHTML = "";
      try {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=pt&format=json`).then(r => r.json());
        if (geo && geo.results && geo.results.length) {
          geo.results.forEach(res => {
            const nome = `${res.name}${res.admin1 ? ' - ' + res.admin1 : ''}${res.country_code ? ' (' + res.country_code + ')' : ''}`;
            resultsBox.appendChild(h('div', {
              className: 'city-result',
              onClick: () => {
                state.data.settings.weather = { name: res.name, lat: res.latitude, lon: res.longitude };
                Store.save(state);
                window._weatherData = null; window._weatherLoadedCity = null; window._weatherCurrent = null;
                ensureWeather(true);
                renderCalendar();
                updateHeaderInfo();
                showToast(`Cidade atualizada para ${res.name}!`, "success");
              }
            }, nome));
          });
        } else {
          resultsBox.appendChild(h('div', { className: 'hint' }, 'Nenhuma cidade encontrada.'));
        }
      } catch (e) {
        resultsBox.appendChild(h('div', { className: 'hint' }, 'Erro ao buscar cidade.'));
      }
    }

    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });

    return h('div', { className: 'card', style: 'padding: 0.8rem;' },
      h('h3', { style: 'font-size: 0.85rem; font-weight: bold; margin-bottom: 0.4rem; color: var(--primary);' }, 'Clima Atual'),
      h('div', { id: 'weather-detail-box', style: 'font-size:0.82rem; line-height:1.4;' }, `${desc}`),
      h('div', { class: 'hint', style: 'margin-top:0.2rem;' }, `Atual: ${cityName}`),
      h('div', { style: 'display:flex; gap:0.4rem; margin-top:0.5rem;' },
        input,
        h('button', { className: 'dashboard-btn', onClick: doSearch }, 'Buscar')
      ),
      resultsBox
    );
  }

  function buildRangePanel() {
    const card = h('div', { className: 'card', style: 'padding: 0.8rem;' });
    card.appendChild(h('h3', { style: 'font-size: 0.85rem; font-weight: bold; color: var(--primary); margin-bottom:0.3rem;' }, 'Seletor de Período'));

    const s = window.calRangeStart, e = window.calRangeEnd;

    if (!s) {
      card.appendChild(h('p', { className: 'hint' }, 'Clique em uma data para a data inicial e em outra para a final.'));
    } else if (!e) {
      card.appendChild(h('p', { style: 'font-size:0.78rem;' }, `Data inicial: ${formatBR(s)}`));
      card.appendChild(h('p', { className: 'hint' }, 'Agora clique na data final.'));
    } else {
      const corridos = C.diasCorridos(s, e);
      const hset = C.holidaySetForRange(s, e);
      const uteis = C.diasUteis(s, e, hset);

      card.appendChild(h('div', { className: 'range-row' }, h('span', {}, `Período:`), h('span', { style: 'font-weight:bold;' }, `${formatBR(s)} → ${formatBR(e)}`)));
      card.appendChild(h('div', { className: 'range-row' }, h('span', {}, 'Dias corridos'), h('strong', {}, corridos)));
      card.appendChild(h('div', { className: 'range-row' }, h('span', {}, 'Dias úteis'), h('strong', {}, uteis)));
      card.appendChild(h('p', { className: 'hint', style: 'margin-top:2px;' }, 'Dias úteis desconsideram sábados, domingos e feriados.'));
    }

    const complete = s && e;
    const corridos = complete ? C.diasCorridos(s, e) : 0;
    const uteis = complete ? C.diasUteis(s, e, C.holidaySetForRange(s, e)) : 0;
    const periodoStr = complete ? `${formatBR(s)} a ${formatBR(e)}` : "";

    const btns = h('div', { className: 'range-btns' });

    const mkCopy = (label, textFn, enabled) => h('button', {
      className: 'dashboard-btn',
      disabled: enabled ? undefined : 'disabled',
      style: enabled ? '' : 'opacity:0.5; cursor:not-allowed;',
      onClick: () => {
        if (!enabled) return;
        navigator.clipboard.writeText(textFn()).then(() => showToast("Copiado!", "success"));
      }
    }, label);

    btns.appendChild(mkCopy('Copiar corridos', () => `${corridos} dias corridos`, complete));
    btns.appendChild(mkCopy('Copiar úteis', () => `${uteis} dias úteis`, complete));
    btns.appendChild(mkCopy('Copiar ambos', () => `Período de ${periodoStr}: ${corridos} dias corridos / ${uteis} dias úteis`, complete));
    btns.appendChild(h('button', {
      className: 'dashboard-btn',
      onClick: () => {
        const hoje = formatBR(new Date());
        navigator.clipboard.writeText(hoje).then(() => showToast(`Dia atual copiado: ${hoje}`, "success"));
      }
    }, 'Copiar dia atual'));
    btns.appendChild(h('button', {
      className: 'btn-secondary',
      style: 'font-size:0.68rem; padding:0.28rem 0.45rem;',
      onClick: () => { window.calRangeStart = null; window.calRangeEnd = null; renderCalendar(); showToast("Seleção de datas limpa."); }
    }, 'Limpar seleção'));

    card.appendChild(btns);
    return card;
  }

  // Estimativa de clima por semana do mês visível
  function buildWeeklyWeather(year, month) {
    const card = h('div', { className: 'card', style: 'padding: 0.7rem 0.8rem; margin-top:0.8rem;' });
    card.appendChild(h('h3', { style: 'font-size:0.85rem; font-weight:bold; color:var(--primary); margin-bottom:0.3rem;' }, 'Estimativa da Semana'));
    const weather = window._weatherData || {};
    const weeks = C.calendarWeeks(year, month);
    let temDados = false;

    weeks.forEach((week, idx) => {
      const dias = week.filter(Boolean).map(d => weather[C.ymd(d)]).filter(Boolean);
      const diasDoMes = week.filter(Boolean);
      const faixa = diasDoMes.length ? `${diasDoMes[0].getDate()}–${diasDoMes[diasDoMes.length - 1].getDate()}` : '';
      if (dias.length === 0) {
        card.appendChild(h('div', { className: 'week-weather-row' },
          h('span', { className: 'week-weather-label' }, `Sem ${idx + 1} (${faixa})`),
          h('span', { className: 'hint' }, 'sem dados')
        ));
        return;
      }
      temDados = true;
      const min = Math.min(...dias.map(d => d.min));
      const max = Math.max(...dias.map(d => d.max));
      const precip = Math.max(...dias.map(d => d.precip != null ? d.precip : 0));
      // ícone: pega o "pior" tempo da semana (maior código costuma ser mais severo)
      const code = dias.map(d => d.code).sort((a, b) => b - a)[0];
      const chuvaTxt = precip >= 50 ? `chuva provável (${precip}%)` : precip >= 20 ? `chance de chuva (${precip}%)` : 'pouca chuva';
      card.appendChild(h('div', { className: 'week-weather-row' },
        h('span', { className: 'week-weather-label' }, `Sem ${idx + 1} (${faixa})`),
        h('span', { className: 'week-weather-val' }, `${C.weatherIcon(code)} ${min}–${max}° · ${chuvaTxt}`)
      ));
    });

    if (!temDados) {
      card.appendChild(h('div', { className: 'hint', style: 'margin-top:0.2rem;' }, 'Previsão disponível só para os próximos ~16 dias (depende da internet).'));
    }
    return card;
  }

  function renderCalendar() {
    const calendarPanel = document.getElementById('panel-calendar');
    if (!calendarPanel) return;
    calendarPanel.innerHTML = "";

    const year = window.calCurrentDate.getFullYear();
    const month = window.calCurrentDate.getMonth();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // ----- Controles do topo (variam por modo de visualização) -----
    const controls = h('div', { style: 'display:flex; align-items:center; justify-content:space-between; margin-bottom:0.6rem; gap:0.4rem;' });
    let titleEl;

    if (window.calViewMode === 'days') {
      const left = h('div', { style: 'display:flex; gap:0.3rem;' },
        h('button', { className: 'dashboard-btn', title: 'Mês anterior', onClick: () => { window.calCurrentDate.setMonth(month - 1); renderCalendar(); } }, '◀'),
        h('button', { className: 'dashboard-btn', onClick: () => { window.calCurrentDate = new Date(); renderCalendar(); } }, 'Hoje'),
        h('button', { className: 'dashboard-btn', title: 'Próximo mês', onClick: () => { window.calCurrentDate.setMonth(month + 1); renderCalendar(); } }, '▶')
      );
      titleEl = h('div', { style: 'font-size:0.95rem;' },
        h('span', { className: 'cal-title-link', title: 'Clique para escolher o mês', onClick: () => { window.calViewMode = 'months'; renderCalendar(); } }, `${monthNames[month]} ${year}`)
      );
      controls.appendChild(left);
      controls.appendChild(titleEl);
      controls.appendChild(h('div', { style: 'font-size:0.72rem; color:var(--text-muted);' }, 'Clique nas datas p/ medir período'));
    } else if (window.calViewMode === 'months') {
      // meses: 12 fixos, sem antes/depois
      titleEl = h('div', { style: 'font-size:0.95rem;' },
        h('span', { className: 'cal-title-link', onClick: () => { window.calViewMode = 'years'; window.calYearWindowStart = year - 17; renderCalendar(); } }, String(year))
      );
      controls.appendChild(h('button', { className: 'dashboard-btn', onClick: () => { window.calViewMode = 'days'; renderCalendar(); } }, '← Voltar'));
      controls.appendChild(titleEl);
      controls.appendChild(h('div', { style: 'width:70px;' }));
    } else if (window.calViewMode === 'years') {
      const start = window.calYearWindowStart;
      const end = start + 34;
      const left = h('div', { style: 'display:flex; gap:0.3rem;' },
        h('button', { className: 'dashboard-btn', title: '35 anos anteriores', onClick: () => { window.calYearWindowStart -= 35; renderCalendar(); } }, '◀'),
        h('button', { className: 'dashboard-btn', title: '35 anos seguintes', onClick: () => { window.calYearWindowStart += 35; renderCalendar(); } }, '▶')
      );
      titleEl = h('div', { style: 'font-size:0.9rem; font-weight:bold; color:var(--primary);' }, `${start} – ${end}`);
      controls.appendChild(left);
      controls.appendChild(titleEl);
      controls.appendChild(h('button', { className: 'dashboard-btn', onClick: () => { window.calViewMode = 'days'; renderCalendar(); } }, 'Fechar'));
    }

    // ----- Conteúdo principal -----
    let content;

    if (window.calViewMode === 'months') {
      const grid = h('div', { className: 'cal-picker-grid months' });
      monthNames.forEach((mn, idx) => {
        grid.appendChild(h('button', {
          className: 'cal-picker-btn' + (idx === month ? ' current' : ''),
          onClick: () => { window.calCurrentDate.setMonth(idx); window.calViewMode = 'days'; renderCalendar(); }
        }, mn.slice(0, 3)));
      });
      content = grid;
    } else if (window.calViewMode === 'years') {
      const grid = h('div', { className: 'cal-picker-grid years' });
      const start = window.calYearWindowStart;
      for (let i = 0; i < 35; i++) {
        const y = start + i;
        grid.appendChild(h('button', {
          className: 'cal-picker-btn' + (y === year ? ' current' : ''),
          onClick: () => { window.calCurrentDate.setFullYear(y); window.calViewMode = 'months'; renderCalendar(); }
        }, String(y)));
      }
      content = grid;
    } else {
      // Visualização de dias
      const gridWrap = h('div', {});
      const headerRow = h('div', { className: 'cal-grid', style: 'margin-bottom:4px;' });
      ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((d, idx) => {
        headerRow.appendChild(h('div', { className: 'cal-weekday' + (idx === 0 || idx === 6 ? ' weekend' : '') }, d));
      });

      const grid = h('div', { className: 'cal-grid' });
      const weeks = C.calendarWeeks(year, month);
      const holidays = C.getHolidays(year);
      const weather = window._weatherData || {};
      const todayStr = new Date().toDateString();

      const rs = window.calRangeStart, re = window.calRangeEnd;

      weeks.forEach(week => {
        week.forEach(date => {
          if (!date) { grid.appendChild(h('div', { className: 'cal-cell empty' })); return; }

          const key = C.ymd(date);
          const holiday = holidays.find(ho => ho.date === key);
          const isToday = date.toDateString() === todayStr;
          const dow = date.getDay();
          const isWeekend = dow === 0 || dow === 6;

          // Estado de seleção de período
          let inRange = false, isEdge = false;
          if (rs && re) {
            const t = date.getTime();
            if (t >= rs.getTime() && t <= re.getTime()) inRange = true;
            if (date.toDateString() === rs.toDateString() || date.toDateString() === re.toDateString()) isEdge = true;
          } else if (rs && date.toDateString() === rs.toDateString()) {
            isEdge = true;
          }

          let cls = 'cal-cell';
          if (isWeekend) cls += ' weekend';
          if (isToday) cls += ' today';
          if (inRange) cls += ' in-range';
          if (isEdge) cls += ' range-edge';

          // Clima do dia (topo-direito): ícone + média
          let weatherEl = null;
          const wd = weather[key];
          if (wd) {
            const avg = Math.round((wd.max + wd.min) / 2);
            const title = `Máx ${wd.max}° · Mín ${wd.min}°${wd.precip != null ? ' · Chuva ' + wd.precip + '%' : ''} · ${C.weatherDesc(wd.code)}`;
            weatherEl = h('span', { className: 'cal-weather', title }, `${C.weatherIcon(wd.code)} ${avg}°`);
          }

          const top = h('div', { className: 'cal-cell-top' },
            h('span', { className: 'cal-daynum' }, date.getDate()),
            weatherEl
          );

          const cell = h('div', {
            className: cls,
            onClick: () => selectRangeDate(date)
          }, top, holiday ? h('span', { className: 'cal-holiday-name', title: holiday.name }, holiday.name) : null);

          grid.appendChild(cell);
        });
      });

      gridWrap.appendChild(headerRow);
      gridWrap.appendChild(grid);
      content = gridWrap;
    }

    const cardCal = h('div', { className: 'card', style: 'padding: 0.8rem;' }, controls, content);

    // ----- Coluna direita: Clima, Feriados do mês, Seletor de período -----
    const monthHolidays = C.getHolidays(year).filter(ho => new Date(ho.date + 'T00:00:00').getMonth() === month);
    const holidaysUl = h('ul', { style: 'font-size: 0.75rem; padding-left: 1.1rem; margin-top: 0.3rem; display:flex; flex-direction:column; gap:2px;' });
    if (monthHolidays.length === 0) {
      holidaysUl.appendChild(h('li', {}, 'Nenhum feriado neste mês.'));
    } else {
      monthHolidays
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach(ho => {
          const dNum = ho.date.split('-')[2];
          holidaysUl.appendChild(h('li', {}, `${dNum}/${String(month + 1).padStart(2, '0')}: ${ho.name} (${ho.type === 'national' ? 'Nacional' : 'Facultativo'})`));
        });
    }

    const cardHolidays = h('div', { className: 'card', style: 'padding: 0.8rem; margin-top:0.8rem;' },
      h('h3', { style: 'font-size: 0.85rem; font-weight: bold; color: var(--primary);' }, 'Feriados do Mês'),
      holidaysUl
    );

    const rightCol = h('div', {}, buildWeatherCard(), cardHolidays, buildRangePanel());

    // Estimativa semanal de clima (somente na visão de dias)
    const leftCol = h('div', {}, cardCal);
    if (window.calViewMode === 'days') {
      leftCol.appendChild(buildWeeklyWeather(year, month));
    }

    const layoutGrid = h('div', { style: 'display: grid; grid-template-columns: 2fr 1fr; gap: 0.8rem; align-items:start;' }, leftCol, rightCol);
    calendarPanel.appendChild(layoutGrid);

    // dispara clima se ainda não carregou
    ensureWeather();
  }

  // ====================== PAINEL DE PRODUTIVIDADE ======================
  function initDashboardFiltersAndRender() {
    const dashboardPanel = document.getElementById('panel-dashboard');
    if (!dashboardPanel) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const mNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    dashboardPanel.innerHTML = "";

    // --- helpers de data ---
    const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const curMonthSelected = () => {
      const y = Number(document.getElementById('dash-filter-year')?.value) || currentYear;
      const mv = document.getElementById('dash-filter-month')?.value;
      const m = (mv !== '' && mv != null) ? Number(mv) : currentMonth;
      return { y, m };
    };

    // --- Selects ---
    const yearSel = h('select', { id: 'dash-filter-year', className: 'dashboard-select', onChange: onYearMonthChange });
    yearSel.appendChild(h('option', { value: '' }, 'Todos'));
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      const opt = h('option', { value: y }, y);
      if (y === currentYear) opt.selected = true;
      yearSel.appendChild(opt);
    }

    const monthSel = h('select', { id: 'dash-filter-month', className: 'dashboard-select', onChange: onYearMonthChange });
    monthSel.appendChild(h('option', { value: '' }, 'Todos'));
    mNames.forEach((m, idx) => {
      const opt = h('option', { value: idx }, m);
      if (idx === currentMonth) opt.selected = true;
      monthSel.appendChild(opt);
    });

    const weekSel = h('select', { id: 'dash-filter-week', className: 'dashboard-select', onChange: renderDashboard });
    weekSel.appendChild(h('option', { value: '', selected: true }, 'Todas'));
    weekSel.appendChild(h('option', { value: 'current' }, 'Atual (Dom-Sáb)'));
    weekSel.appendChild(h('option', { value: 'w1' }, '1ª Semana'));
    weekSel.appendChild(h('option', { value: 'w2' }, '2ª Semana'));
    weekSel.appendChild(h('option', { value: 'w3' }, '3ª Semana'));
    weekSel.appendChild(h('option', { value: 'w4' }, '4ª Semana'));

    // Dia específico (padrão: hoje) — permite analisar qualquer dia do mês
    const daySel = h('select', { id: 'dash-filter-day', className: 'dashboard-select', onChange: onDayChange });
    function populateDaySelect() {
      const { y, m } = curMonthSelected();
      const prev = daySel.value;
      daySel.innerHTML = '';
      daySel.appendChild(h('option', { value: '' }, 'Mês inteiro'));
      const dim = daysInMonth(y, m);
      for (let d = 1; d <= dim; d++) daySel.appendChild(h('option', { value: d }, String(d).padStart(2, '0')));
      if (prev !== '' && prev != null && Number(prev) <= dim) daySel.value = prev;
      else if (y === currentYear && m === currentMonth) daySel.value = String(now.getDate());
      else daySel.value = '';
    }

    function onYearMonthChange() { populateDaySelect(); syncGeneralViewFromDay(); updateFastFilterActive(); renderDashboard(); }
    function onDayChange() { syncGeneralViewFromDay(); updateFastFilterActive(); renderDashboard(); }
    function syncGeneralViewFromDay() {
      if (window.dashView === 'home' || window.dashView === 'dia') {
        window.dashView = daySel.value ? 'dia' : 'home';
        applyViewLayout();
      }
    }

    const btnClear = h('button', {
      className: 'dashboard-btn', style: 'font-size:0.7rem; padding:0.3rem 0.6rem;',
      onClick: () => {
        document.getElementById('dash-filter-year').value = currentYear;
        document.getElementById('dash-filter-month').value = currentMonth;
        document.getElementById('dash-filter-week').value = '';
        populateDaySelect();
        syncGeneralViewFromDay();
        updateFastFilterActive();
        renderDashboard();
        showToast("Filtros limpos!");
      }
    }, 'Limpar Filtros');

    // Fast filter: atalho rápido Hoje | Mês inteiro (dentro da gaveta)
    const ffHoje = h('button', { className: 'fast-filter-btn', onClick: () => {
      const { y, m } = curMonthSelected();
      daySel.value = (y === currentYear && m === currentMonth) ? String(now.getDate()) : '1';
      daySel.dispatchEvent(new Event('change'));
    } }, 'Hoje');
    const ffMes = h('button', { className: 'fast-filter-btn', onClick: () => {
      daySel.value = '';
      daySel.dispatchEvent(new Event('change'));
    } }, 'Mês inteiro');
    const fastFilter = h('div', {},
      h('label', { style: 'font-size:0.62rem; font-weight:bold; color:var(--text-muted);' }, 'Atalho'),
      h('div', { className: 'fast-filter' }, ffHoje, ffMes)
    );
    function updateFastFilterActive() {
      const { y, m } = curMonthSelected();
      const hojeVal = (y === currentYear && m === currentMonth) ? String(now.getDate()) : null;
      const v = daySel.value;
      ffHoje.classList.toggle('active', hojeVal != null && v === hojeVal);
      ffMes.classList.toggle('active', !v);
    }

    // Filtros compactos — rótulo em cima, selects pequenos
    const mkFilter = (lbl, sel) => h('div', { style: 'display:flex; flex-direction:column; gap:1px;' },
      h('label', { style: 'font-size:0.62rem; font-weight:bold; color:var(--text-muted);' }, lbl), sel);
    const filtersRow = h('div', { style: 'display:flex; flex-direction:column; gap:0.4rem;' },
      mkFilter('Ano', yearSel), mkFilter('Mês', monthSel), mkFilter('Semana', weekSel), mkFilter('Dia', daySel)
    );

    // Gaveta de filtros (abre/fecha)
    const caret = h('span', { className: 'drawer-caret' }, '▸');
    const filtersBody = h('div', { className: 'dash-filters-body' },
      filtersRow,
      h('div', { style: 'margin-top:0.5rem;' }, fastFilter),
      h('div', { style: 'margin-top:0.5rem; display:flex; justify-content:flex-end;' }, btnClear)
    );
    const filtersCard = h('div', { className: 'card dash-filters' },
      h('button', { className: 'dash-drawer-toggle', onClick: () => toggleFilters() },
        h('span', {}, '⚙️ Filtros do painel'), caret),
      filtersBody
    );
    function toggleFilters(force) {
      const open = (force != null) ? force : !filtersCard.classList.contains('open');
      filtersCard.classList.toggle('open', open);
      window.dashFiltersOpen = open;
    }

    // Métricas (chips) — faixa fixa no topo da direita
    const chip = (lbl, id, small) => h('div', { className: small ? 'metric-chip small' : 'metric-chip' },
      h('span', { className: 'mlabel' }, lbl), h('span', { id, className: 'mval' }, '0'));
    const metricsCard = h('div', { className: 'card dash-metrics', style: 'padding:0.7rem;' },
      chip('Ano', 'stat-year-val'),
      chip('Mês', 'stat-month-val'),
      chip('Filtrado', 'stat-period-val'),
      chip('Validados', 'stat-valid-val'),
      chip('Manuais', 'stat-manual-val'),
      chip('Média/Dia', 'stat-avg-day'),
      chip('Média/Sem', 'stat-avg-week'),
      chip('Maior dia', 'stat-maiordia', true),
      chip('Menor dia', 'stat-menordia', true),
      chip('Pico horário', 'stat-picohora', true),
      chip('Hora + fraca', 'stat-menorhora', true)
    );

    // ===== Componentes — cada um é uma "janela" navegável =====
    const topProcCard = h('div', { className: 'card', style: 'padding:0.8rem;' },
      h('h4', { style: 'font-size:0.8rem; margin-bottom:0.5rem; font-weight:bold; color:var(--primary);' }, 'Procedimentos mais acionados'),
      h('div', { id: 'top-proc-container', style: 'display:flex; flex-direction:column; gap:0.35rem;' })
    );

    const hourlyCard = h('div', { className: 'card', style: 'padding:0.8rem;' },
      h('div', { id: 'weekly-breakdown-container' })
    );

    const evolCard = h('div', { className: 'card', style: 'padding:0.8rem;' },
      h('h4', { style: 'font-size:0.8rem; margin-bottom:0.5rem; font-weight:bold; color:var(--primary);' }, 'Evolução Diária'),
      h('div', { id: 'daily-chart-bars', style: 'display:flex; gap:4px; align-items:flex-end; height:185px; overflow-x:auto; overflow-y:hidden; padding:10px 4px 4px; width:100%;' })
    );

    const semanaCard = h('div', { className: 'card', style: 'padding:0.8rem;' },
      h('h4', { style: 'font-size:0.8rem; margin-bottom:0.3rem; font-weight:bold; color:var(--primary);' }, 'Semana × Dia da semana'),
      h('p', { className: 'hint', style: 'margin-bottom:0.4rem;' }, 'Quais dias concentram mais atendimento no mês.'),
      h('div', { id: 'heatmap-week', style: 'overflow-x:auto;' }),
      h('div', { id: 'heatmap-week-peak', className: 'heatmap-peak' })
    );

    const horaCard = h('div', { className: 'card', style: 'padding:0.8rem;' },
      h('h4', { style: 'font-size:0.8rem; margin-bottom:0.3rem; font-weight:bold; color:var(--primary);' }, 'Horário × Dia da semana'),
      h('p', { className: 'hint', style: 'margin-bottom:0.4rem;' }, 'Em que horário e dia o fluxo é maior.'),
      h('div', { id: 'heatmap-hour', style: 'overflow-x:auto;' }),
      h('div', { id: 'heatmap-hour-peak', className: 'heatmap-peak' })
    );

    // Navegação lateral (janelas) — só nesta aba
    // 'home' = visão geral mensal | 'dia' = visão geral diário (ambas mostram todas as janelas)
    function applyViewLayout() {
      const v = window.dashView;
      const gridMode = (v === 'home' || v === 'dia');
      content.classList.toggle('dash-home', gridMode);
      content.querySelectorAll('.dash-view').forEach(w => {
        w.style.display = (gridMode || w.dataset.view === v) ? '' : 'none';
      });
      sidebar.querySelectorAll('.dash-nav-item').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === v));
    }
    function setDashView(v) {
      window.dashView = v;
      const daySelEl = document.getElementById('dash-filter-day');
      if (daySelEl) {
        if (v === 'home') daySelEl.value = '';
        else if (v === 'dia' && !daySelEl.value) {
          const { y, m } = curMonthSelected();
          daySelEl.value = (y === currentYear && m === currentMonth) ? String(now.getDate()) : '1';
        }
      }
      applyViewLayout();
      updateFastFilterActive();
      renderDashboard();
    }

    const NAV = [
      { key: 'dia', label: '📆 Visão geral diário' },
      { key: 'home', label: '🗓️ Visão geral mensal' },
      { key: 'top', label: '🏆 Top procedimentos' },
      { key: 'evol', label: '📈 Evolução diária' },
      { key: 'horario', label: '🕐 Fluxo por horário' },
      { key: 'semana', label: '📅 Semana × dia' },
      { key: 'hora', label: '⏰ Horário × dia' }
    ];
    // "Janelas" agora é uma gaveta (abre/fecha), igual à de filtros
    const janelasBody = h('div', { className: 'dash-janelas-body' });
    NAV.forEach(n => janelasBody.appendChild(
      h('button', { className: 'dash-nav-item', 'data-view': n.key, onClick: () => setDashView(n.key) }, n.label)
    ));
    const janelasCaret = h('span', { className: 'drawer-caret' }, '▸');
    const sidebar = h('div', { id: 'dash-sidebar', className: 'card dash-janelas' },
      h('button', { className: 'dash-drawer-toggle', onClick: () => toggleJanelas() },
        h('span', {}, '🗂️ Janelas'), janelasCaret),
      janelasBody
    );
    function toggleJanelas(force) {
      const open = (force != null) ? force : !sidebar.classList.contains('open');
      sidebar.classList.toggle('open', open);
      window.dashJanelasOpen = open;
    }

    const mkView = (key, card) => { const w = h('div', { className: 'dash-view' }, card); w.dataset.view = key; w.style.gridArea = key; return w; };
    const content = h('div', { id: 'dash-content' },
      mkView('top', topProcCard),
      mkView('horario', hourlyCard),
      mkView('evol', evolCard),
      mkView('semana', semanaCard),
      mkView('hora', horaCard)
    );

    // Coluna esquerda (sticky): filtros em cima + navegação embaixo
    const leftCol = h('div', { className: 'dash-left' }, filtersCard, sidebar);
    // Coluna direita: métricas no topo + janelas abaixo
    const rightCol = h('div', { className: 'dash-right' }, metricsCard, content);

    const layout = h('div', { className: 'dash-layout' }, leftCol, rightCol);

    dashboardPanel.appendChild(layout);

    populateDaySelect();
    toggleFilters(window.dashFiltersOpen !== false);
    toggleJanelas(window.dashJanelasOpen !== false);
    updateFastFilterActive();
    setHeaderOffset();
    if (!window._dashHeaderListener) {
      window.addEventListener('resize', setHeaderOffset);
      window._dashHeaderListener = true;
    }
    setDashView(window.dashView || 'home');
  }

  // Mede o header fixo e expõe a altura p/ os elementos sticky do painel
  function setHeaderOffset() {
    const hd = document.querySelector('header.sticky-header');
    if (hd) document.documentElement.style.setProperty('--header-h', hd.offsetHeight + 'px');
  }

  function buildHeatmap(container, rowLabels, colLabels, matrix) {
    if (!container) return;
    container.innerHTML = '';
    let max = 0;
    matrix.forEach(row => row.forEach(v => { if (v > max) max = v; }));
    const table = h('table', { className: 'heatmap-table' });
    const thead = h('tr', {}, h('th', {}, ''));
    colLabels.forEach(c => thead.appendChild(h('th', {}, c)));
    table.appendChild(thead);
    matrix.forEach((row, ri) => {
      const tr = h('tr', {}, h('th', { className: 'heatmap-rowlabel' }, rowLabels[ri]));
      row.forEach(v => {
        const alpha = (max > 0 && v > 0) ? (0.12 + 0.88 * (v / max)) : 0;
        const td = h('td', {
          style: `background: rgba(13,148,136,${alpha.toFixed(3)}); color:${alpha > 0.55 ? '#fff' : 'var(--text-main)'};`,
          title: `${v} atendimento(s)`
        }, v > 0 ? String(v) : '');
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    container.appendChild(table);
  }

  function renderDashboard() {
    const allRecords = [...(state.data.history || []), ...(state.data.archive || [])];
    const now = new Date();

    const selectedYear = document.getElementById('dash-filter-year')?.value;
    const selectedMonth = document.getElementById('dash-filter-month')?.value;
    const selectedWeek = document.getElementById('dash-filter-week')?.value;
    const selectedDay = document.getElementById('dash-filter-day')?.value;

    // withDay=false ignora o filtro de dia (usado nas barras verticais, que são panorâmicas do mês)
    function passesFilters(r, withDay) {
      const d = new Date(r.createdAt);
      if (selectedYear && selectedYear !== "" && d.getFullYear() !== Number(selectedYear)) return false;
      if (selectedMonth !== "" && selectedMonth !== null && selectedMonth !== undefined && d.getMonth() !== Number(selectedMonth)) return false;
      if (withDay && selectedDay && selectedDay !== "" && d.getDate() !== Number(selectedDay)) return false;

      if (selectedWeek) {
        if (selectedWeek === 'current') {
          const cur = new Date();
          const startOfWeek = new Date(cur);
          startOfWeek.setDate(cur.getDate() - cur.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          if (d < startOfWeek || d > endOfWeek) return false;
        } else if (selectedWeek.startsWith('w')) {
          const weekNum = parseInt(selectedWeek.replace('w', ''), 10);
          const dayOfMonth = d.getDate();
          if (dayOfMonth < (weekNum - 1) * 7 + 1 || dayOfMonth > weekNum * 7) return false;
        }
      }
      return true;
    }
    // Recorte que segue o dia (métricas, Fluxo por Horário, Top procedimentos)
    const filteredRecords = allRecords.filter(r => passesFilters(r, true));
    // Recorte do mês inteiro, sem o filtro de dia (barras verticais panorâmicas)
    const barsRecords = allRecords.filter(r => passesFilters(r, false));

    const yearCount = allRecords.filter(r => new Date(r.createdAt).getFullYear() === now.getFullYear()).length;
    const monthCount = allRecords.filter(r => new Date(r.createdAt).getMonth() === now.getMonth() && new Date(r.createdAt).getFullYear() === now.getFullYear()).length;
    const filteredCount = filteredRecords.length;

    const daysCount = filteredRecords.length > 0 ? new Set(filteredRecords.map(r => new Date(r.createdAt).toDateString())).size : 1;
    const avgDay = (filteredCount / Math.max(daysCount, 1)).toFixed(1);
    const avgWeek = (filteredCount / Math.max(daysCount / 7, 1)).toFixed(1);

    // Validados (validação concluída) x Manuais (sem procedimento do catálogo)
    const realProcIds = r => (r.procedureIds || []).filter(id => id && id !== 'sys_compliance');
    const validados = filteredRecords.filter(r => !(r.procedureIds || []).includes('sys_compliance')).length;
    const manuais = filteredRecords.filter(r => !(r.procedureIds || []).includes('sys_compliance') && realProcIds(r).length === 0).length;

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setVal('stat-year-val', yearCount);
    setVal('stat-month-val', monthCount);
    setVal('stat-period-val', filteredCount);
    setVal('stat-valid-val', validados);
    setVal('stat-manual-val', manuais);
    setVal('stat-avg-day', avgDay);
    setVal('stat-avg-week', avgWeek);

    // Picos de fluxo (escopo do mês — panorama, não dependem do filtro de dia)
    const flow = computeFlowStats(barsRecords);
    setVal('stat-maiordia', flow.maiorDia ? `dia ${flow.maiorDia.k} (${flow.maiorDia.v})` : '—');
    setVal('stat-menordia', flow.menorDia ? `dia ${flow.menorDia.k} (${flow.menorDia.v})` : '—');
    setVal('stat-picohora', flow.maiorHora ? `${flow.maiorHora.k}h (${flow.maiorHora.v})` : '—');
    setVal('stat-menorhora', flow.menorHora ? `${flow.menorHora.k}h (${flow.menorHora.v})` : '—');

    // Top procedimentos mais acionados (no período filtrado)
    const topContainer = document.getElementById('top-proc-container');
    if (topContainer) {
      topContainer.innerHTML = '';
      const contagem = {};
      filteredRecords.forEach(r => realProcIds(r).forEach(id => { contagem[id] = (contagem[id] || 0) + 1; }));
      const ranking = Object.entries(contagem)
        .map(([id, n]) => {
          const proc = state.data.procedures.find(p => p.id === id);
          return { titulo: proc ? proc.title : 'Procedimento removido', n };
        })
        .sort((a, b) => b.n - a.n)
        .slice(0, 6);

      if (ranking.length === 0) {
        topContainer.appendChild(h('div', { className: 'hint' }, 'Nenhum procedimento do catálogo registrado no período (atendimentos manuais não contam aqui).'));
      } else {
        const maxN = ranking[0].n;
        ranking.forEach((item, i) => {
          const pct = Math.round((item.n / maxN) * 100);
          topContainer.appendChild(h('div', { style: 'display:flex; flex-direction:column; gap:2px;' },
            h('div', { style: 'display:flex; justify-content:space-between; font-size:0.72rem;' },
              h('span', { style: 'font-weight:600;' }, `${i + 1}. ${item.titulo}`),
              h('span', { style: 'font-weight:bold; color:var(--primary);' }, item.n)
            ),
            h('div', { style: 'background:var(--surface-alt); height:7px; border-radius:3px; overflow:hidden;' },
              h('div', { style: `width:${pct}%; background:var(--primary); height:100%;` })
            )
          ));
        });
      }
    }

    // Evolução diária
    const barsContainer = document.getElementById('daily-chart-bars');
    if (barsContainer) {
      barsContainer.innerHTML = "";
      const weekDaysShort = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
      const targetYear = (selectedYear && selectedYear !== "") ? Number(selectedYear) : now.getFullYear();
      const targetMonth = (selectedMonth !== "" && selectedMonth !== null && selectedMonth !== undefined) ? Number(selectedMonth) : now.getMonth();
      const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const todayDateObj = new Date();

      let startDay = 1;
      let endDay = lastDayOfMonth;

      if (selectedWeek) {
        if (selectedWeek === 'current') {
          const cur = new Date();
          const startOfWeek = new Date(cur);
          startOfWeek.setDate(cur.getDate() - cur.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          if (startOfWeek.getMonth() === targetMonth) startDay = startOfWeek.getDate();
          if (endOfWeek.getMonth() === targetMonth) endDay = endOfWeek.getDate();
        } else if (selectedWeek.startsWith('w')) {
          const weekNum = parseInt(selectedWeek.replace('w', ''), 10);
          startDay = (weekNum - 1) * 7 + 1;
          endDay = Math.min(weekNum * 7, lastDayOfMonth);
        }
      }

      const firstWeekday = new Date(targetYear, targetMonth, 1).getDay();
      const selDay = (selectedDay && selectedDay !== "") ? Number(selectedDay) : null;
      // 1ª passada: conta por dia e acha o máximo (para escalar as barras)
      // Usa barsRecords (sem o filtro de dia): as barras são sempre o panorama do mês
      const dias = [];
      for (let dayNum = startDay; dayNum <= endDay; dayNum++) {
        const loopDate = new Date(targetYear, targetMonth, dayNum);
        if (targetYear === todayDateObj.getFullYear() && targetMonth === todayDateObj.getMonth() && dayNum > todayDateObj.getDate()) continue;
        const count = barsRecords.filter(r => new Date(r.createdAt).toDateString() === loopDate.toDateString()).length;
        dias.push({ dayNum, loopDate, count });
      }
      const maxCount = Math.max(1, ...dias.map(x => x.count));
      const MAX_BAR = 110;
      dias.forEach(({ dayNum, loopDate, count }) => {
        const height = count > 0 ? Math.max(4, Math.round((count / maxCount) * MAX_BAR)) : 2;
        const weekdayStr = weekDaysShort[loopDate.getDay()];
        // semana alinhada ao calendário (Dom-Sáb): dia 1 numa quinta ainda é a Semana 1
        const weekOfNum = Math.floor((dayNum - 1 + firstWeekday) / 7) + 1;
        const isSel = (selDay !== null && dayNum === selDay);
        const barColor = isSel ? 'var(--accent)' : 'var(--primary)';
        const barGroup = h('div', {
          className: isSel ? 'bar-group bar-group-sel' : 'bar-group',
          style: 'display:flex; flex-direction:column; align-items:center; gap:1px; flex:1; min-width: 26px; cursor:pointer;',
          title: isSel ? 'Clique para voltar ao mês inteiro' : 'Clique para analisar este dia',
          onClick: () => {
            const ds = document.getElementById('dash-filter-day');
            if (!ds) return;
            ds.value = (ds.value === String(dayNum)) ? '' : String(dayNum); // clicar de novo desfaz
            ds.dispatchEvent(new Event('change'));
          }
        },
          h('span', { style: `font-size: 0.6rem; font-weight: bold; color: ${barColor}; margin-bottom: 1px;` }, count),
          h('div', { style: `width: 100%; max-width: 18px; height: ${height}px; background: ${barColor}; border-radius: 3px; margin-bottom: 2px;${isSel ? ' box-shadow: 0 0 0 2px var(--accent); outline: 2px solid var(--accent); outline-offset: 1px;' : ''}`, title: `${loopDate.toLocaleDateString()}: ${count} atendimento(s)${isSel ? ' (dia selecionado)' : ''}` }),
          h('span', { style: `font-size: 0.62rem; font-weight: bold; ${isSel ? 'color: var(--accent);' : ''}` }, dayNum),
          h('span', { style: 'font-size: 0.55rem; color: var(--text-muted); text-transform: lowercase;' }, weekdayStr),
          h('span', { className: 'bar-week-label' }, `Sem ${weekOfNum}`)
        );
        barsContainer.appendChild(barGroup);
      });
    }

    // Fluxo por horário
    const hourlyContainer = document.getElementById('weekly-breakdown-container');
    if (hourlyContainer) {
      hourlyContainer.innerHTML = "<h4 style='font-size: 0.8rem; margin-bottom: 0.4rem; font-weight: bold; color: var(--primary);'>Fluxo por Horário</h4>";
      const hoursMap = new Array(24).fill(0);
      filteredRecords.forEach(r => { hoursMap[new Date(r.createdAt).getHours()]++; });

      const activeHours = [];
      for (let hIdx = 7; hIdx <= 19; hIdx++) activeHours.push({ hour: `${hIdx}h`, count: hoursMap[hIdx] });

      const maxVal = Math.max(...activeHours.map(o => o.count), 1);
      activeHours.forEach(item => {
        const pct = Math.round((item.count / maxVal) * 100);
        const row = h('div', { style: 'display:flex; align-items:center; gap:0.5rem; font-size:0.7rem; margin-bottom: 2px;' },
          h('span', { style: 'width:28px; font-weight:bold;' }, item.hour),
          h('div', { style: 'flex:1; background:var(--surface-alt); height:9px; border-radius:3px; overflow:hidden;' },
            h('div', { style: `width:${pct}%; background:var(--accent); height:100%;` })
          ),
          h('span', { style: 'width:18px; text-align:right;' }, item.count)
        );
        hourlyContainer.appendChild(row);
      });
    }

    // ===== Heatmaps comparativos (mês selecionado) =====
    const now2 = new Date();
    const selY = document.getElementById('dash-filter-year')?.value;
    const selM = document.getElementById('dash-filter-month')?.value;
    const tY = (selY && selY !== "") ? Number(selY) : now2.getFullYear();
    const tM = (selM !== "" && selM !== null && selM !== undefined) ? Number(selM) : now2.getMonth();
    const monthRecords = allRecords.filter(r => {
      const d = new Date(r.createdAt);
      return d.getFullYear() === tY && d.getMonth() === tM;
    });
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Semana × Dia da semana (alinhada ao calendário real: Dom-Sáb)
    const firstWd = new Date(tY, tM, 1).getDay();
    const diasNoMes = new Date(tY, tM + 1, 0).getDate();
    const numSemanas = Math.ceil((diasNoMes + firstWd) / 7);
    const wk = Array.from({ length: numSemanas }, () => new Array(7).fill(0));
    monthRecords.forEach(r => {
      const d = new Date(r.createdAt);
      const w = Math.floor((d.getDate() - 1 + firstWd) / 7);
      if (wk[w]) wk[w][d.getDay()]++;
    });
    buildHeatmap(document.getElementById('heatmap-week'), wk.map((_, i) => 'Sem ' + (i + 1)), diasSemana, wk);

    // Horário × Dia da semana
    const hrs = [];
    for (let hh = 7; hh <= 19; hh++) hrs.push(hh);
    const hm = hrs.map(() => new Array(7).fill(0));
    monthRecords.forEach(r => {
      const d = new Date(r.createdAt);
      const hh = d.getHours();
      if (hh >= 7 && hh <= 19) hm[hh - 7][d.getDay()]++;
    });
    buildHeatmap(document.getElementById('heatmap-hour'), hrs.map(x => x + 'h'), diasSemana, hm);

    // Destaques de pico
    const diasFull = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const peakOf = (matrix) => {
      let best = { v: 0, r: -1, c: -1 };
      matrix.forEach((row, ri) => row.forEach((v, ci) => { if (v > best.v) best = { v, r: ri, c: ci }; }));
      return best;
    };
    const wkPeak = peakOf(wk);
    const wkEl = document.getElementById('heatmap-week-peak');
    if (wkEl) wkEl.textContent = wkPeak.v > 0
      ? `🔺 Pico: ${diasFull[wkPeak.c]} da Semana ${wkPeak.r + 1} — ${wkPeak.v} atendimento(s)`
      : 'Sem dados no mês.';
    const hmPeak = peakOf(hm);
    const hmEl = document.getElementById('heatmap-hour-peak');
    if (hmEl) hmEl.textContent = hmPeak.v > 0
      ? `🔺 Pico: ${diasFull[hmPeak.c]} às ${hrs[hmPeak.r]}h — ${hmPeak.v} atendimento(s)`
      : 'Sem dados no mês.';
  }

  // ====================== ABA 5: ABC & VDN ======================
  function renderAbcView() {
    const container = document.getElementById('abc-container');
    if (!container) return;
    container.innerHTML = "";

    const search = C.removeAccents(document.getElementById('abc-search')?.value || "");
    (state.data.abcProcedures || []).forEach(abc => {
      if (search && !C.removeAccents(`${abc.name} ${abc.code} ${abc.description || ''}`).includes(search)) return;

      const kebab = makeKebab([
        { label: '✏️ Editar', onClick: () => openEditAbcModal(abc) },
        { label: '🗑️ Excluir', danger: true, onClick: () => {
          if (confirm(`Deseja excluir o ABC "${abc.name}"?`)) {
            state.data.abcProcedures = state.data.abcProcedures.filter(i => i.id !== abc.id);
            Store.save(state);
            renderAbcView();
            populateRedeEspecialidades();
            recompileProntuario();
            showToast("ABC excluído.");
          }
        } }
      ]);

      const item = h('div', { className: 'procedure-item' },
        h('div', {}, h('strong', {}, `[${abc.code}] ${abc.name}`), h('p', { className: 'hint' }, abc.description)),
        kebab
      );
      container.appendChild(item);
    });
  }

  function openEditAbcModal(abc) {
    const modal = document.getElementById('modal-abc');
    const titleEl = document.getElementById('modal-abc-title') || modal.querySelector('h3');
    if (titleEl) titleEl.textContent = "Editar Procedimento ABC";
    document.getElementById('abc-modal-code').value = abc.code || "";
    document.getElementById('abc-modal-name').value = abc.name || "";
    document.getElementById('abc-modal-desc').value = abc.description || "";
    document.getElementById('btn-save-abc').setAttribute('data-edit-id', abc.id);
    modal?.showModal();
  }

  function renderVdnView() {
    const tbody = document.querySelector('#vdn-table tbody');
    if (!tbody) return;
    tbody.innerHTML = "";

    const search = C.removeAccents(document.getElementById('vdn-search')?.value || "");
    (state.data.vdnList || []).forEach(vdn => {
      if (search && !C.removeAccents(vdn.skill + vdn.vdn).includes(search)) return;

      const kebab = makeKebab([
        { label: '✏️ Editar', onClick: () => openEditVdnModal(vdn) },
        { label: '🗑️ Excluir', danger: true, onClick: () => {
          if (confirm(`Deseja excluir a VDN "${vdn.skill}"?`)) {
            state.data.vdnList = state.data.vdnList.filter(i => i.id !== vdn.id);
            Store.save(state);
            renderVdnView();
            populateVdnTransfer();
            showToast("VDN excluída.");
          }
        } }
      ]);

      const actionsTd = h('td', {}, kebab);
      const tr = h('tr', {},
        h('td', {}, vdn.skill),
        h('td', {}, vdn.vdn),
        h('td', {}, vdn.phone),
        h('td', {}, vdn.hours),
        actionsTd
      );
      tbody.appendChild(tr);
    });
  }

  function openEditVdnModal(vdn) {
    const modal = document.getElementById('modal-vdn');
    const titleEl = document.getElementById('modal-vdn-title') || modal.querySelector('h3');
    if (titleEl) titleEl.textContent = "Editar VDN / Skill";
    document.getElementById('vdn-modal-skill').value = vdn.skill || "";
    document.getElementById('vdn-modal-vdn').value = vdn.vdn || "";
    document.getElementById('vdn-modal-phone').value = vdn.phone || "";
    document.getElementById('vdn-modal-hours').value = vdn.hours || "";
    document.getElementById('btn-save-vdn').setAttribute('data-edit-id', vdn.id);
    modal?.showModal();
  }

  document.getElementById('abc-search')?.addEventListener('input', renderAbcView);
  document.getElementById('vdn-search')?.addEventListener('input', renderVdnView);

  const modalAbc = document.getElementById('modal-abc');
  const modalVdn = document.getElementById('modal-vdn');

  document.getElementById('btn-open-abc-modal')?.addEventListener('click', () => {
    const titleEl = document.getElementById('modal-abc-title') || modalAbc.querySelector('h3');
    if (titleEl) titleEl.textContent = "Novo ABC";
    document.getElementById('abc-modal-code').value = "";
    document.getElementById('abc-modal-name').value = "";
    document.getElementById('abc-modal-desc').value = "";
    document.getElementById('btn-save-abc').removeAttribute('data-edit-id');
    modalAbc?.showModal();
  });
  modalAbc?.querySelector('button[value="cancel"]')?.addEventListener('click', () => modalAbc.close());

  document.getElementById('btn-save-abc')?.addEventListener('click', (e) => {
    const code = document.getElementById('abc-modal-code')?.value.trim();
    const name = document.getElementById('abc-modal-name')?.value.trim();
    const desc = document.getElementById('abc-modal-desc')?.value.trim();
    if (!name) { showToast("Informe o nome do procedimento ABC.", "error"); return; }

    const editId = e.currentTarget.getAttribute('data-edit-id');
    const match = editId ? state.data.abcProcedures.find(i => i.id === editId) : null;
    e.currentTarget.removeAttribute('data-edit-id');
    if (match) {
      match.code = code || "00"; match.name = name; match.description = desc;
    } else {
      // novo (ou id órfão) — garante que sempre salva
      state.data.abcProcedures.push({ id: "abc_" + Date.now(), code: code || "00", name, description: desc });
    }

    Store.save(state);
    modalAbc?.close();
    renderAbcView();
    populateRedeEspecialidades(); // a rede puxa a especialidade do ABC
    recompileProntuario();
    showToast("Procedimento ABC salvo com sucesso!", "success");
  });

  document.getElementById('btn-open-vdn-modal')?.addEventListener('click', () => {
    const titleEl = document.getElementById('modal-vdn-title') || modalVdn.querySelector('h3');
    if (titleEl) titleEl.textContent = "Nova VDN";
    document.getElementById('vdn-modal-skill').value = "";
    document.getElementById('vdn-modal-vdn').value = "";
    document.getElementById('vdn-modal-phone').value = "";
    document.getElementById('vdn-modal-hours').value = "";
    document.getElementById('btn-save-vdn').removeAttribute('data-edit-id');
    modalVdn?.showModal();
  });
  modalVdn?.querySelector('button[value="cancel"]')?.addEventListener('click', () => modalVdn.close());

  document.getElementById('btn-save-vdn')?.addEventListener('click', (e) => {
    const skill = document.getElementById('vdn-modal-skill')?.value.trim();
    const vdn = document.getElementById('vdn-modal-vdn')?.value.trim();
    const phone = document.getElementById('vdn-modal-phone')?.value.trim();
    const hours = document.getElementById('vdn-modal-hours')?.value.trim();
    if (!skill) { showToast("Informe a célula / skill.", "error"); return; }

    const editId = e.currentTarget.getAttribute('data-edit-id');
    const match = editId ? state.data.vdnList.find(i => i.id === editId) : null;
    e.currentTarget.removeAttribute('data-edit-id');
    if (match) {
      match.skill = skill; match.vdn = vdn; match.phone = phone || "---"; match.hours = hours || "24h";
    } else {
      state.data.vdnList.push({ id: "vdn_" + Date.now(), skill, vdn, phone: phone || "---", hours: hours || "24h" });
    }

    Store.save(state);
    modalVdn?.close();
    renderVdnView();
    populateVdnTransfer();
    showToast("VDN salva com sucesso!", "success");
  });

  // ====================== INICIALIZAÇÃO ======================
  selectedProcedureIds = [];

  populateRedeEspecialidades();
  populateVdnTransfer();
  populateCoberturaSugestoes();
  buildCatalogHeaderMenu();
  populateGrupoFilter();
  renderProceduresCatalog();
  document.querySelectorAll('#procedures-container input[type="checkbox"]').forEach(cb => cb.checked = false);
  renderOrientacoes();
  recompileProntuario();
  setupHistoryFilters();
  renderHistory();
  initDashboardFiltersAndRender();
  renderCalendar();
  ensureWeather();
  updateHeaderInfo();
});
/* INTERFACE:END */
