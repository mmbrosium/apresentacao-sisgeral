// Texto da apresentação em Markdown. Edite só o que está entre as crases. "## Título {Curto}" = rótulo na barra.
window.SOBRE_FOTOS = [];
window.SOBRE_MD = `
## Em uma página {Resumo}

<div class="tres"><div><b>O que é</b>Um gerenciador de atendimento que roda num arquivo HTML aberto no navegador. Sem instalar, sem servidor, sem se conectar a nenhum sistema da empresa.</div><div><b>Por que existe</b>No cancelamento de plano, escrever o registro tomava metade do atendimento, e o registro é quase igual em todo cancelamento. O mesmo vale pra dezenas de outros procedimentos, cada um com texto, orientação e artigo certos, guardados de memória.</div><div><b>O que mudou</b>O registro sai em um clique, já no padrão, com a orientação do procedimento na tela. O atendimento caiu de 5–10 minutos pra menos de 5. O histórico e a produtividade do mês ficam à mão, sem esperar relatório.</div></div>

<div class="destaques"><div><b>1 clique</b><span>registro de cancelamento, antes texto digitado</span></div><div><b>&lt; 5 min</b><span>atendimento, antes 5 a 10</span></div><div><b>86</b><span>procedimentos no catálogo, cada um com texto e orientação</span></div><div><b>v3.29</b><span>mais de cinquenta versões em uso real, com histórico dentro do sistema</span></div></div>

Eu construí pra resolver um problema do meu próprio posto e uso todo dia. Esta página diz o que ele é, por que existe, o que respeita, a diferença entre a versão de teste e a que eu uso, e o que seria preciso pra levar ao time, se fizer sentido. O detalhe de cada tela vem depois, pra quem quiser aprofundar. Tudo que aparece nas telas é a base de outubro, com nomes de beneficiários reduzidos ao primeiro nome. As telas ficam na parte de detalhe; cada uma abre ampliada com um clique e, nas principais, os pontos numerados explicam cada parte.

## O problema {Problema}

Todo atendimento termina com um registro no sistema. O registro de cancelamento tem sempre a mesma espinha: quem entrou em contato, o que pediu, o artigo verbalizado, o que foi orientado sobre boleto e devolução proporcional, por onde foi o comprovante. Escrever isso enquanto o cliente espera na linha custava de 5 a 10 minutos por atendimento, e dependia da memória do atendente pra não esquecer nenhuma parte obrigatória.

O mesmo vale pra dezenas de outros procedimentos: segunda via de boleto, indicação de rede credenciada, autorização de guia, transferência pra outro setor. Cada um tem um texto certo, uma orientação certa e, às vezes, um artigo pra ler. Guardar isso na cabeça funciona até o dia em que não funciona.

O ambiente não permite instalar programa nem integrar nada. Então a solução tinha que caber numa janela do navegador, como uma página qualquer.

## O que deu {Resultados}

Em números do meu posto, outubro de 2026:

- Registro de cancelamento: de texto digitado a um clique.
- Atendimento: de 5 a 10 minutos pra menos de 5.
- Procedimento seguido com apoio na tela, não de memória.
- Histórico próprio, exportável, com painel de produtividade.
- Mais de cinquenta versões em uso real, com os erros corrigidos no caminho.

## O que ele respeita {Regras}

- **Não instala nada e não se conecta a nada.** É uma página aberta no navegador. Não há servidor, não há integração com sistema da empresa, não há envio de dado pra fora.
- **Os dados ficam na máquina.** O histórico fica no armazenamento local do navegador e só sai quando o atendente exporta. Apagar é um botão.
- **Ele reforça o procedimento, não substitui.** A validação de dados vem antes de tudo, o artigo a verbalizar está na orientação, o texto do registro segue o padrão. O sistema da empresa continua sendo o registro oficial: o SisGeral prepara o texto, quem registra lá é o atendente.
- **Tudo é auditável.** Cada versão está no histórico de versões, cada registro tem data e hora, e a exportação em texto pode ser lida por qualquer pessoa.
- **Guarda o mínimo.** Primeiro nome do beneficiário, protocolo e pedido. Dado sensível não precisa ficar guardado pro sistema funcionar: não é guardado.

![Histórico de versões, dentro do próprio sistema](telas/21-versoes.png)

## Versão de apresentação e versão em uso {Versões}

O que abre nesta página, e o que está na pasta de teste, é a **homologação**: o mesmo sistema, com o catálogo reduzido aos procedimentos mais usados no dia a dia (cancelamento de plano, segunda via de boleto, abertura de RCA, liberação de guia, indicação de rede e afins, 12 ao todo), o ABC só com os nomes das especialidades e o VDN com números de referência. É uma base pra clicar, aprender o fluxo e entender como funciona, sem tocar em nada da operação. É provar o doce antes de servir.

A **versão em uso** é outra: 86 procedimentos escritos da minha prática, ABC com códigos, VDN real. Ela muda conforme eu uso, porque é ferramenta de trabalho, não produto fechado: o que eu acho certo hoje pode mudar amanhã, e o histórico de versões dentro do sistema registra cada mudança. Por isso a homologação não é um espelho da versão em uso, e não precisa ser. Ela é a base; o resto é o que a operação decidir que entra, se decidir.

## Se fizer sentido pro time {Pro time}

O que seria preciso, na ordem:

1. **Validar as regras com quem decide**: o que pode ficar guardado localmente, por quanto tempo, e se o uso do navegador pra isso está dentro do permitido.
2. **Revisar o catálogo com a qualidade**: os 86 procedimentos foram escritos por mim, da minha prática. Uma revisão de quem monitora garante que o texto base e a orientação são o padrão da operação.
3. **Um arquivo por atendente**, com o nome configurado. Não precisa de instalação: é copiar a pasta. A que acompanha esta apresentação é a versão em uso, pra abrir e testar.
4. **Uma hora de treinamento**: a rotina cabe em quatro cliques, e o resto é consulta.
5. **Um ponto de retorno**: o que não está no catálogo vira pedido de procedimento novo, e eu mantenho.

Nada disso depende de TI nem de compra. O custo é tempo de revisão. O ganho é minutos por atendimento, em cada atendimento, e um registro que sai igual pra todo mundo.

## O que é, tela a tela {Telas}

Daqui em diante é o detalhe. Um arquivo HTML com seis abas. As quatro primeiras são a rotina; as duas últimas, consulta.

![A tela de trabalho: identificação, catálogo de procedimentos e o prontuário compilado](telas/01-novo-atendimento.png)


- **Novo Atendimento**: identificação, catálogo de procedimentos e prontuário compilado.
- **Histórico & Arquivo**: tudo que foi registrado, com filtros, exportação e importação em texto.
- **Calendário & Clima**: calendário com feriados e seletor de período (dias corridos e úteis).
- **Painel de Produtividade**: métricas do mês, fluxo por horário, evolução diária, mapas de calor.
- **ABC & VDN**: os códigos de procedimento odontológico e os ramais de transferência.
- **Versões**: o que mudou, quando.

## Como funciona, no atendimento {Atendimento}

A tela abre zerada, só com o nome do atendente. O nome do beneficiário é obrigatório, sempre. Protocolo entra quando o caso vira chamado interno; pedido ou guia, quando houver.

O coração é o **catálogo de procedimentos**: 86 hoje, um por linha, com categoria e grupo, busca por nome ou conteúdo. Marcou a caixa, o texto do procedimento entra no prontuário, já com o nome do beneficiário e o número do pedido no lugar certo. Passando o mouse, dá pra ler o texto antes de marcar.

![Passando o mouse, o procedimento mostra o texto que vai pro prontuário](telas/02-catalogo-hover.png)

Cada procedimento tem duas partes: o **texto base**, que vai pro prontuário, e a **orientação interna**, que não vai: o que confirmar antes de encerrar, o que informar ao beneficiário, o artigo a verbalizar, o link da base de conhecimento. A orientação aparece num bloco de apoio embaixo do prontuário enquanto o procedimento está marcado. É a parte que garante que o procedimento é seguido, não só registrado.

![Prontuário compilado e o bloco de apoio ao atendimento, de uso interno](telas/06-prontuario-apoio.png)

![Cadastro de um procedimento: texto base, orientação interna, links e as variáveis que o sistema preenche sozinho](telas/05-novo-procedimento.png)

No fim, três botões: **✓** registra e manda pro histórico, **📋** copia o prontuário inteiro pra colar no sistema da empresa, **✕** limpa e volta à frase padrão. Toda ação dá um aviso na tela; nada acontece em silêncio.

![Os avisos no canto da tela](telas/07-toasts.png)

## Histórico {Histórico}

Cada registro fica guardado com data e hora, beneficiário, protocolo, pedido, atendente e procedimento. Filtra por ano, mês, dia e semana. Clicar na linha abre o prontuário completo, pra conferir ou editar.

![Histórico da 3ª semana de outubro: 142 atendimentos](telas/08-historico.png)

A exportação sai em texto puro, um bloco por chamado, no mesmo formato que o sistema lê de volta. Serve de backup e de alimentação da base. Não há banco de dados nem envio pra lugar nenhum: o arquivo fica com quem exportou.

![A exportação em texto: um bloco por chamado](telas/09-exportacao-txt.png)

## Painel de produtividade {Painel}

É o que me faz saber como foi o mês sem esperar relatório. Em outubro: 312 atendimentos, média de 24 por dia e 168 por semana, maior dia 21 (34), menor dia 9 (12), pico às 17h, hora mais fraca às 8h. Os procedimentos mais acionados dizem onde vale caprichar no catálogo: indicação de rede, transferência e autorização de guia dividem o topo.

![Painel de outubro: cartões, procedimentos mais acionados, fluxo por horário e evolução diária](telas/13-painel.png)

Dois mapas de calor fecham a leitura: qual dia da semana concentra atendimento em cada semana, e em que hora de que dia o fluxo é maior. Pra quem monta escala, isso é informação; pra quem atende, é saber quando respirar.

![Semana × dia da semana](telas/18-semana-dia.png)

![Horário × dia da semana, com o pico marcado](telas/19-horario-dia.png)

## Calendário e consulta {Calendário}

O calendário entrou porque o do sistema da empresa às vezes não carrega. Clique em duas datas e ele devolve o período em dias corridos e dias úteis (sem sábado, domingo e feriado), com botão de copiar. Serve, por exemplo, pra saber há quanto tempo o beneficiário tem o plano. ABC & VDN são duas listas de consulta: os códigos de procedimento odontológico e os ramais de transferência, com horário de cada um.

![Calendário com feriados e o seletor de período](telas/10-calendario.png)

![Catálogo ABC e diretório de ramais](telas/20-abc-vdn.png)

## Cabeçalho, faixa e configurações {Cabeçalho}

Três coisas ficam fixas no topo, em qualquer aba.

O **cabeçalho** mostra o dia, a data e a hora em tempo real, o clima da cidade configurada no calendário e quantos atendimentos foram registrados hoje. Ao lado, dois botões: o sol ou a lua troca entre tema claro e escuro, e a engrenagem abre as configurações.

![Cabeçalho: data e hora, clima, atendimentos do dia, tema e configurações](telas/25-cabecalho.png)

A **faixa** logo abaixo roda os indicadores do mês, lidos do próprio histórico: total de atendimentos, procedimento mais acionado, maior e menor dia de fluxo, pico de horário, hora mais fraca e o tamanho do catálogo. É o painel em uma linha, sem sair da tela de atendimento.

![A faixa de indicadores do mês](telas/24-faixa.png)

As **configurações** cabem numa janela: nome padrão do atendente (o que vem preenchido em todo atendimento), retenção do histórico em dias ou nunca apagar, tema padrão, exportar e importar backup completo em JSON, e o uso do armazenamento local do navegador. **Desfazer** volta atrás na última ação de apagar. **Apagar tudo** é o reset: apaga tudo que está guardado no navegador e devolve o sistema como veio no arquivo, pra começar do zero ou passar a máquina adiante sem deixar nada pra trás.

![Configurações do sistema](telas/26-configuracoes.png)

![O mesmo sistema no tema claro, com a aba Versões ao fundo](telas/22-configuracoes.png)

## Abrir e testar {Testar}

A versão que abre aqui é a de **homologação** descrita acima. Serve pra clicar, marcar procedimento, montar prontuário e ver o painel, sem expor nada da operação. Nada precisa ser instalado; o que você registrar fica só no seu navegador, e some com o **Apagar tudo** das configurações.

<p><a class="abrir-sis" href="sisgeral/index.html" target="_blank" rel="noopener">Abrir o SisGeral (homologação) →</a></p>

A versão completa, com os 86 procedimentos, o ABC com códigos e o VDN real, vai na pasta entregue à gestão e fica num repositório privado.

## Contato

Paulo Guilherme de Souza Veiga · [gp.pgsveiga@gmail.com](mailto:gp.pgsveiga@gmail.com) · [linkedin.com/in/pgsveiga](https://www.linkedin.com/in/pgsveiga/)
`;
window.SOBRE_MD_EN = window.SOBRE_MD;
