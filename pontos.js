// Pontos explicados: [x, y, largura, altura, título, texto, título EN, texto EN], em % da imagem.
// Pra acrescentar pontos numa tela nova, basta criar a entrada com o mesmo caminho usado no texto.
window.PONTOS = {
  "telas/01-novo-atendimento.png": [
    [51.5, 1.8, 42, 3.8, "Cabeçalho", "Dia da semana, data e hora em tempo real; clima da cidade configurada no Calendário; e quantos atendimentos foram registrados hoje.", "Header", "Weekday, date and time in real time; weather for the city set in the Calendar; and how many contacts were logged today."],
    [93.9, 1.5, 2.7, 4, "Tema", "Alterna entre tema claro e escuro. O padrão fica nas configurações.", "Theme", "Switches between light and dark theme. The default lives in settings."],
    [96.8, 1.5, 2.8, 4, "Configurações", "Abre as Configurações do Sistema: nome padrão, retenção do histórico, tema, backup e o Apagar tudo.", "Settings", "Opens System Settings: default name, history retention, theme, backup and Delete all."],
    [0, 7, 100, 3.3, "Faixa de indicadores", "Roda os números do mês, lidos do próprio histórico: total, procedimento mais acionado, maior e menor dia de fluxo, pico de horário, hora mais fraca e tamanho do catálogo.", "Ticker", "Scrolls the month's numbers, read from the history itself: total, most used procedure, busiest and slowest day, peak hour, weakest hour and catalog size."],
    [0, 10.5, 60, 4, "Abas", "As seis abas. Novo Atendimento, Histórico, Calendário e Painel são a rotina; ABC & VDN e Versões são consulta.", "Tabs", "The six tabs. New Contact, History, Calendar and Panel are the routine; ABC & VDN and Versions are reference."],
    [40.5, 18.2, 8.5, 2.8, "Último registro", "Reabre o último atendimento registrado, pra conferir ou completar.", "Last record", "Reopens the last logged contact, to check or complete it."],
    [3.2, 22, 45.5, 3.7, "Validação de dados", "Lembrete fixo: a validação dos dados do beneficiário vem antes de qualquer procedimento.", "Data validation", "Fixed reminder: validating the member's data comes before any procedure."],
    [3.2, 29.3, 22.4, 3.6, "Atendente", "Já vem preenchido com o nome padrão das configurações. Entra em todo registro.", "Agent", "Pre-filled with the default name from settings. Goes into every record."],
    [26.2, 29.3, 22.4, 3.6, "Protocolo", "Número do chamado interno, quando o caso vira protocolo. Só é obrigatório nesses casos.", "Protocol", "Internal ticket number, when the case becomes a protocol. Only required then."],
    [3.2, 36.3, 22.4, 3.6, "Beneficiário", "Nome do beneficiário. Só o primeiro nome é guardado no registro.", "Member", "Member's name. Only the first name is kept in the record."],
    [26.2, 36.3, 22.4, 3.6, "Pedido ou guia", "Número do pedido ou da guia, quando houver. O sistema o coloca no texto do procedimento, no lugar da variável {pedido}.", "Order or guide", "Order or guide number, when there is one. The system drops it into the procedure text, where the {pedido} variable sits."],
    [39.4, 47.2, 7, 3, "Desmarcar todos", "Limpa todas as caixas marcadas do catálogo de uma vez.", "Uncheck all", "Clears every checked box in the catalog at once."],
    [47, 47.2, 2, 3, "Menu do catálogo", "Cadastrar procedimento novo e ordenar por procedimento, categoria ou grupo.", "Catalog menu", "Add a new procedure, or sort by procedure, category or group."],
    [3.2, 51.3, 28.6, 3.6, "Busca", "Procura por nome, categoria, grupo ou pelo conteúdo do texto. *palavra dá peso; +palavra exige a palavra.", "Search", "Searches by name, category, group or text content. *word adds weight; +word makes it required."],
    [32.7, 51.3, 16.1, 3.6, "Grupo e desativados", "Filtra por grupo (Pagamento, Cadastro, Rede...) e mostra ou esconde os procedimentos desativados.", "Group and disabled", "Filters by group (Payment, Registration, Network...) and shows or hides disabled procedures."],
    [4, 57.8, 1.6, 2.6, "Caixa", "Marcar insere o texto do procedimento no prontuário, com nome e pedido no lugar. Desmarcar tira.", "Checkbox", "Checking inserts the procedure text into the record, with name and order filled in. Unchecking removes it."],
    [5.6, 57.8, 8.6, 2.6, "Categoria e grupo", "A etiqueta colorida é a categoria (o comportamento: boleto, relevante...); a cinza é o grupo (a organização: Pagamento, Rede...).", "Category and group", "The colored tag is the category (the behavior: billing, relevant...); the gray one is the group (the organization: Payment, Network...)."],
    [44.8, 57.8, 2.1, 2.6, "Menu da linha", "Editar, duplicar, desativar ou excluir este procedimento.", "Row menu", "Edit, duplicate, disable or delete this procedure."],
    [47.7, 76.5, 23.4, 17.3, "Prévia", "Passando o mouse sobre a linha, o texto que vai pro prontuário aparece antes de marcar.", "Preview", "Hovering a row shows the text that goes into the record, before checking it."],
    [91, 18.2, 6, 2.8, "Recompor", "Remonta o prontuário a partir dos procedimentos marcados, caso o texto tenha sido editado à mão.", "Rebuild", "Rebuilds the record from the checked procedures, in case the text was edited by hand."],
    [51.5, 24.4, 45.5, 3.4, "Contatos para envio", "Telefone e e-mail pro envio de comprovante. Memória de tela: ficam só enquanto a tela está aberta e não entram no registro.", "Contacts for sending", "Phone and e-mail for sending receipts. Screen memory: they live only while the screen is open and never enter the record."],
    [51.5, 31.2, 45.5, 38.5, "Texto compilado", "O prontuário. Começa com a frase padrão e recebe o texto de cada procedimento marcado. Pode ser ajustado à mão antes de copiar.", "Compiled text", "The record. Starts with the default sentence and receives the text of each checked procedure. Can be adjusted by hand before copying."],
    [89, 72.7, 2.3, 3.6, "Limpar", "Limpa tudo e volta à frase padrão.", "Clear", "Clears everything and returns to the default sentence."],
    [91.9, 72.7, 2.3, 3.6, "Copiar", "Copia o prontuário inteiro pra colar no sistema da empresa.", "Copy", "Copies the whole record to paste into the company system."],
    [94.8, 72.7, 2.3, 3.6, "Registrar", "Manda pro histórico com data, hora, atendente, beneficiário, protocolo e pedido.", "Log", "Sends it to history with date, time, agent, member, protocol and order."]
  ],
  "telas/25-cabecalho.png": [
    [4, 28, 44, 48, "Data e hora", "Dia da semana, data e hora, atualizando a cada segundo.", "Date and time", "Weekday, date and time, updating every second."],
    [50, 28, 12, 48, "Clima", "Temperatura atual da cidade configurada na aba Calendário & Clima.", "Weather", "Current temperature for the city set in the Calendar & Weather tab."],
    [62.5, 28, 25, 48, "Atendimentos hoje", "Quantos registros foram feitos hoje. Zera à meia-noite.", "Contacts today", "How many records were made today. Resets at midnight."],
    [87, 20, 6, 62, "Tema", "Sol no tema escuro, lua no claro. Clicar troca.", "Theme", "Sun in dark theme, moon in light. Click to switch."],
    [93.3, 20, 6.5, 62, "Configurações", "Abre a janela de Configurações do Sistema.", "Settings", "Opens the System Settings window."]
  ],
  "telas/24-faixa.png": [
    [0, 15, 8, 70, "Mais acionado", "O procedimento mais usado no mês, com a quantidade. Aqui, indicação de rede credenciada (23).", "Most used", "The month's most used procedure, with its count. Here, network referral (23)."],
    [8.3, 15, 17.5, 70, "Maior dia de fluxo", "O dia do mês com mais atendimentos e quantos foram.", "Busiest day", "The day of the month with the most contacts, and how many."],
    [28.5, 15, 16.5, 70, "Menor dia de fluxo", "O dia com menos atendimentos.", "Slowest day", "The day with the fewest contacts."],
    [47.5, 15, 16, 70, "Pico de horário", "A hora do dia que concentra mais atendimentos no mês.", "Peak hour", "The hour of the day with the most contacts in the month."],
    [65.5, 15, 15.5, 70, "Menor horário", "A hora mais fraca.", "Weakest hour", "The slowest hour."],
    [82.8, 15, 16.5, 70, "Catálogo", "Quantos procedimentos ativos existem no catálogo.", "Catalog", "How many active procedures the catalog holds."]
  ],
  "telas/26-configuracoes.png": [
    [73, 40, 20, 5, "Versão", "A versão em uso. O que mudou em cada uma está na aba Versões.", "Version", "The version in use. What changed in each one is in the Versions tab."],
    [9.5, 55.6, 40, 7.6, "Nome padrão", "O nome que já vem preenchido no campo Atendente de todo atendimento.", "Default name", "The name pre-filled in the Agent field of every contact."],
    [51.5, 55.6, 40.4, 7.6, "Retenção", "Por quantos dias o histórico fica guardado. 'Nunca apagar' mantém tudo até alguém exportar e limpar.", "Retention", "How many days history is kept. 'Never delete' keeps everything until someone exports and clears."],
    [9.5, 72, 40, 7.9, "Tema padrão", "Claro ou escuro ao abrir. O botão do cabeçalho troca na hora.", "Default theme", "Light or dark on open. The header button switches on the spot."],
    [51.5, 72, 36, 7.9, "Backup", "Exportar gera um JSON com tudo: histórico, catálogo e configurações. Importar restaura esse arquivo em outra máquina ou depois de um reset.", "Backup", "Export writes a JSON with everything: history, catalog and settings. Import restores that file on another machine or after a reset."],
    [9.5, 85.7, 32.5, 5.6, "Uso do armazenamento", "Quanto do armazenamento local do navegador o sistema está ocupando.", "Storage usage", "How much of the browser's local storage the system is using."],
    [52.5, 84.8, 11, 7.3, "Desfazer", "Volta atrás na última ação de apagar.", "Undo", "Reverts the last delete action."],
    [65, 84.8, 15.5, 7.3, "Apagar tudo", "O reset completo: apaga tudo que está guardado no navegador e devolve o sistema como veio no arquivo. Pra começar do zero ou passar a máquina adiante sem deixar nada.", "Delete all", "The full reset: wipes everything stored in the browser and returns the system to how it came in the file. To start over, or hand the machine on without leaving anything behind."],
    [81.8, 84.8, 10.2, 7.3, "Fechar", "Fecha a janela. As mudanças já ficam salvas ao escolher.", "Close", "Closes the window. Changes are saved as you pick them."]
  ],
  "telas/22-configuracoes.png": [
    [94, 1, 2.4, 3.6, "Tema claro ativo", "A lua devolve o tema escuro. A escolha fica guardada.", "Light theme on", "The moon brings back the dark theme. The choice is remembered."],
    [2.4, 22, 60, 76, "Histórico de versões", "A aba Versões: data e o que mudou em cada versão, dentro do próprio sistema. Mais de cinquenta até aqui.", "Version history", "The Versions tab: date and what changed in each version, inside the system itself. Over fifty so far."],
    [63.6, 12.3, 35, 28.5, "Configurações", "A mesma janela de configurações, no tema claro.", "Settings", "The same settings window, in the light theme."]
  ],
  "telas/08-historico.png": [
    [1.5, 9, 34.5, 5, "Filtros", "Ano, mês, dia e semana. A tabela e o total respondem na hora.", "Filters", "Year, month, day and week. The table and the total respond instantly."],
    [93.5, 2.3, 5, 3.2, "Total", "Quantos registros cabem no filtro atual: 142 na 3ª semana de outubro.", "Total", "How many records match the current filter: 142 in the 3rd week of October."],
    [36.8, 9.4, 8.3, 4.8, "Importar", "Lê de volta um arquivo de texto exportado pelo sistema. Serve pra restaurar ou juntar históricos.", "Import", "Reads back a text file exported by the system. Used to restore or merge histories."],
    [45.5, 9.4, 8, 4.8, "Exportar", "Gera o arquivo de texto com um bloco por chamado. É o backup e a alimentação da base.", "Export", "Writes the text file with one block per ticket. It is the backup and what feeds the base."],
    [54, 9.4, 10.6, 4.8, "Apagar selecionados", "Apaga só as linhas marcadas na caixa da esquerda.", "Delete selected", "Deletes only the rows checked on the left."],
    [65, 9.4, 8, 4.8, "Apagar todos", "Apaga todos os registros do filtro atual. Pede confirmação.", "Delete all", "Deletes every record in the current filter. Asks for confirmation."],
    [1.5, 29.8, 96, 5.2, "Colunas", "Data e hora, primeiro nome do beneficiário, protocolo, pedido ou guia, atendente e o procedimento principal.", "Columns", "Date and time, member's first name, protocol, order or guide, agent and the main procedure."],
    [1.5, 35.5, 83, 5.2, "Linha", "Clicar em qualquer linha abre a gaveta com o prontuário completo, pra conferir ou editar.", "Row", "Clicking any row opens the drawer with the full record, to check or edit."],
    [84.6, 36.2, 5.5, 3.5, "Detalhes", "Abre o registro inteiro.", "Details", "Opens the whole record."],
    [90.4, 36.2, 3.8, 3.5, "Excluir", "Apaga só este registro. Dá pra desfazer nas configurações.", "Delete", "Deletes just this record. Can be undone in settings."],
    [65, 35.5, 18.5, 5.2, "Sem classificação", "Registro feito sem marcar procedimento do catálogo: o texto foi escrito à mão.", "Unclassified", "Record made without checking a catalog procedure: the text was written by hand."]
  ],
  "telas/13-painel.png": [
    [1.6, 3.6, 17, 45.6, "Filtros do painel", "Ano, mês, semana e dia. O atalho Hoje / Mês inteiro é o que mais se usa; o painel abre no mês.", "Panel filters", "Year, month, week and day. The Today / Whole month shortcut is the one used most; the panel opens on the month."],
    [1.6, 51.4, 17, 45, "Janelas", "Liga e desliga cada bloco do painel. O que não interessa some.", "Windows", "Turns each panel block on or off. What you don't need disappears."],
    [20, 4.3, 78.5, 15.2, "Cartões", "Os números do período: total no ano, no mês e no recorte filtrado; validados e manuais; média por dia e por semana; maior e menor dia; pico de horário e hora mais fraca.", "Cards", "The period's numbers: total in the year, month and filtered cut; validated and manual; average per day and per week; best and worst day; peak hour and weakest hour."],
    [19.9, 23.5, 44, 34, "Procedimentos mais acionados", "Ranking do período. Diz onde vale caprichar no catálogo e no treinamento.", "Most used procedures", "The period's ranking. Shows where catalog and training effort pays off."],
    [65.1, 23.5, 34, 38.5, "Fluxo por horário", "Atendimentos por hora do dia. Em outubro, o pico foi às 17h e a hora mais fraca às 8h.", "Flow by hour", "Contacts per hour of the day. In October, the peak was 5 pm and the weakest hour 8 am."],
    [19.9, 64.2, 79, 34, "Evolução diária", "Um dia por barra, com o dia da semana e a semana do mês. Clicar numa barra filtra o painel pra aquele dia; clicar de novo volta ao mês.", "Daily evolution", "One bar per day, with weekday and week of the month. Clicking a bar filters the panel to that day; clicking again returns to the month."]
  ],
  "telas/10-calendario.png": [
    [2.2, 4.2, 8.2, 5.5, "Navegação", "Mês anterior, hoje, próximo mês.", "Navigation", "Previous month, today, next month."],
    [26.5, 4.5, 9.5, 5, "Mês e ano", "Clicar no título abre o seletor de meses; clicar de novo, o de anos.", "Month and year", "Clicking the title opens the month picker; clicking again, the year picker."],
    [2.2, 12.9, 8.7, 4.5, "Fim de semana", "Domingo e sábado em vermelho: não contam como dia útil.", "Weekend", "Sunday and Saturday in red: they don't count as business days."],
    [11.2, 41.7, 8.7, 11, "Feriado", "Feriado nacional marcado na data e descontado dos dias úteis.", "Holiday", "National holiday marked on the date and excluded from business days."],
    [20.1, 41.7, 8.7, 11, "Período selecionado", "Clique em duas datas e o intervalo fica destacado, do 13 ao 20.", "Selected period", "Click two dates and the range is highlighted, from the 13th to the 20th."],
    [11.2, 65.5, 53.5, 11, "Hoje e previsão", "Hoje tem borda. Os dias seguintes mostram a previsão de temperatura.", "Today and forecast", "Today has a border. The following days show the temperature forecast."],
    [66.6, 1.9, 32, 32, "Clima atual", "Clima da cidade configurada. Dá pra trocar a cidade; é o que alimenta o cabeçalho.", "Current weather", "Weather for the configured city. The city can be changed; this feeds the header."],
    [66.6, 35, 32, 14, "Feriados do mês", "Os feriados que caem no mês em tela.", "Month's holidays", "The holidays that fall in the month on screen."],
    [66.6, 50.5, 32, 46, "Seletor de período", "Dias corridos e dias úteis (sem sábado, domingo e feriado) entre as duas datas. Os botões copiam o número pra colar no atendimento.", "Period selector", "Calendar days and business days (no Saturday, Sunday or holiday) between the two dates. The buttons copy the number to paste into the contact."],
    [1.1, 81.5, 65, 17, "Estimativa da semana", "Resumo por semana do mês, a partir do histórico.", "Week estimate", "Per-week summary of the month, from the history."]
  ],
  "telas/05-novo-procedimento.png": [
    [7.2, 14.3, 24, 5.6, "Título", "O nome que aparece na lista do catálogo.", "Title", "The name shown in the catalog list."],
    [32, 14.3, 24, 5.6, "Categoria", "O comportamento do procedimento: relevante, boleto, informativo...", "Category", "The procedure's behavior: relevant, billing, informational..."],
    [7.2, 23.5, 48.8, 5, "Grupo", "A organização na lista. Vazio, o sistema define sozinho a partir do nome.", "Group", "The organization in the list. Left empty, the system picks one from the name."],
    [7.2, 32.5, 48.8, 19, "Texto base", "O que vai pro prontuário quando o procedimento é marcado. As variáveis entre chaves são trocadas pelo valor na hora.", "Base text", "What goes into the record when the procedure is checked. Variables in braces are swapped for their value on the spot."],
    [7.2, 55.5, 48.8, 13.5, "Orientação interna", "O que não vai pro prontuário: o que confirmar, o que informar, o artigo a verbalizar. Aparece no bloco de apoio.", "Internal guidance", "What does not go into the record: what to confirm, what to inform, the article to read out. Shows in the support block."],
    [7.2, 73, 48.8, 5, "Links", "Até cinco links de referência, pra base de conhecimento ou procedimento interno.", "Links", "Up to five reference links, to the knowledge base or an internal procedure."],
    [58, 10.5, 34.5, 51, "Variáveis", "{bnf}, {pedido}, {guia}, {protocolo}, {atendente}: clique ou arraste pra dentro do texto. O sistema preenche com o valor da tela.", "Variables", "{bnf}, {pedido}, {guia}, {protocolo}, {atendente}: click or drag into the text. The system fills them from the screen."]
  ],
  "telas/06-prontuario-apoio.png": [
    [1.5, 5.5, 95, 56, "Prontuário compilado", "O texto de cancelamento já montado: nome do beneficiário, artigo verbalizado, boleto e devolução, comprovante. Pronto pra copiar.", "Compiled record", "The cancellation text already built: member's name, article read out, billing and refund, receipt. Ready to copy."],
    [79.5, 66.5, 17.5, 6, "Ações", "Limpar, copiar e registrar.", "Actions", "Clear, copy and log."],
    [1.5, 75.5, 95, 20, "Bloco de apoio", "Uso interno, não vai pro prontuário: a orientação do procedimento marcado, com link. Fica na tela enquanto o procedimento estiver marcado.", "Support block", "Internal use, never enters the record: the checked procedure's guidance, with link. Stays on screen while the procedure is checked."]
  ]
};
