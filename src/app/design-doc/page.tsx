export default function DesignDocPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">B300 Dashboard</span>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 font-medium">
            Design Documentation
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">

        {/* Hero */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-4 py-1.5 text-sm font-medium mb-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Documentação oficial — uso interno
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            B300 Dashboard
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Painel centralizado de gestão e análise de campanhas de anúncios digitais —
            Google Ads e Meta Ads — em uma única interface unificada.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Versão 1.0
            </span>
            <span>·</span>
            <span>Atualizado em maio de 2026</span>
            <span>·</span>
            <span>Uso interno</span>
          </div>
        </section>

        {/* O que é */}
        <section className="bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">O que é o B300 Dashboard?</h2>
          <p className="text-gray-600 leading-relaxed text-base">
            O B300 Dashboard é um sistema de gestão de campanhas publicitárias desenvolvido para agências
            de marketing e equipes internas que administram contas de anúncios para múltiplos clientes.
            Em vez de acessar separadamente o Google Ads e o Meta Ads para cada cliente, o gestor
            concentra tudo em um único painel: visualiza métricas de desempenho, acompanha o investimento,
            analisa resultados e gerencia as vinculações de contas — tudo em um só lugar.
          </p>
          <p className="text-gray-600 leading-relaxed text-base">
            O sistema foi construído para ser simples e direto: cada cliente tem seu próprio espaço com as
            contas vinculadas, e o dashboard exibe os dados reais das campanhas ativas com filtros por
            período e por campanha, permitindo análises precisas sem complicação.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            {[
              { label: "Plataformas integradas", value: "Google Ads + Meta Ads" },
              { label: "Modelo de uso", value: "Multi-cliente" },
              { label: "Acesso", value: "Interno / por convite" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{item.label}</p>
                <p className="font-semibold text-gray-800">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Para quem é */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Para quem é</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: "👤",
                titulo: "Gestor de Tráfego Pago",
                descricao:
                  "Profissional que gerencia campanhas de anúncios para um ou mais clientes e precisa de uma visão consolidada do desempenho sem transitar entre plataformas.",
              },
              {
                icon: "🏢",
                titulo: "Agência de Marketing Digital",
                descricao:
                  "Equipe que atende múltiplos clientes simultaneamente e precisa organizar contas, acompanhar resultados e gerar relatórios de forma centralizada.",
              },
              {
                icon: "📊",
                titulo: "Analista de Marketing",
                descricao:
                  "Profissional focado em análise de dados que utiliza o dashboard para acompanhar tendências, comparar períodos e identificar oportunidades de otimização.",
              },
              {
                icon: "🎯",
                titulo: "Empreendedor com múltiplas marcas",
                descricao:
                  "Responsável por diferentes empresas ou produtos que anunciam em paralelo e quer uma visão unificada do investimento e retorno em cada frente.",
              },
            ].map((perfil) => (
              <div key={perfil.titulo} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4">
                <span className="text-3xl">{perfil.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{perfil.titulo}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{perfil.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Funcionalidades */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Funcionalidades principais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                iconBg: "bg-blue-50",
                iconColor: "text-blue-600",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                titulo: "Autenticação segura",
                descricao:
                  "Acesso por e-mail e senha com sessão protegida. Cada usuário acessa apenas os clientes e contas vinculados à sua conta no sistema.",
              },
              {
                iconBg: "bg-indigo-50",
                iconColor: "text-indigo-600",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                titulo: "Gestão de clientes",
                descricao:
                  "Criação e organização de clientes com nome, observações e contas de anúncios vinculadas. Cada cliente pode ter múltiplas contas do Google Ads e do Meta Ads associadas.",
              },
              {
                iconBg: "bg-sky-50",
                iconColor: "text-sky-600",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ),
                titulo: "Integração Google Ads",
                descricao:
                  "Conexão com contas do Google Ads via autorização oficial. O usuário autoriza o acesso pelo fluxo de login do Google e as contas ficam disponíveis para vinculação aos clientes.",
              },
              {
                iconBg: "bg-blue-50",
                iconColor: "text-blue-700",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ),
                titulo: "Integração Meta Ads",
                descricao:
                  "Conexão com contas do Meta Ads (Facebook/Instagram) via autorização oficial do Facebook. As contas ficam disponíveis para vinculação da mesma forma que o Google Ads.",
              },
              {
                iconBg: "bg-emerald-50",
                iconColor: "text-emerald-600",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                titulo: "Dashboard de campanhas",
                descricao:
                  "Painel por cliente com gráficos de linha, KPIs e tabela de campanhas. Suporta filtro por período e seleção múltipla de campanhas. Dados separados em abas por plataforma.",
              },
              {
                iconBg: "bg-violet-50",
                iconColor: "text-violet-600",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
                titulo: "Personalização de contas",
                descricao:
                  "Cada conta vinculada pode receber um apelido personalizado (alias) para facilitar a identificação. Em vez de exibir o ID numérico da conta, o sistema exibe o nome que você definiu.",
              },
            ].map((f) => (
              <div key={f.titulo} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${f.iconBg} ${f.iconColor}`}>
                  {f.icon}
                </div>
                <p className="font-semibold text-gray-900">{f.titulo}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.descricao}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Como funciona — Fluxo de uso</h2>
          <p className="text-gray-500">
            O uso do B300 Dashboard segue um fluxo simples e progressivo, do primeiro acesso à análise diária de campanhas.
          </p>
          <div className="space-y-3">
            {[
              {
                numero: "01",
                titulo: "Login no sistema",
                descricao:
                  "O usuário acessa o sistema com seu e-mail e senha cadastrados. A sessão é mantida com segurança e expirada automaticamente por inatividade.",
              },
              {
                numero: "02",
                titulo: "Conectar conta Google Ads ou Meta Ads",
                descricao:
                  "Na seção de Integrações, o usuário autoriza o acesso às suas contas de anúncios. O processo usa o fluxo oficial de autorização de cada plataforma (Google ou Facebook), sem que senhas sejam armazenadas. Múltiplas contas podem ser conectadas.",
              },
              {
                numero: "03",
                titulo: "Criar cliente e vincular contas",
                descricao:
                  "Com as contas conectadas, o usuário cria um cliente no sistema (ex: nome da empresa) e seleciona quais contas de anúncios pertencem a esse cliente. Cada cliente pode ter contas do Google Ads, do Meta Ads, ou de ambos.",
              },
              {
                numero: "04",
                titulo: "Personalizar nomes das contas",
                descricao:
                  "Na edição do cliente, o usuário pode definir um apelido para cada conta vinculada, tornando a identificação mais clara. Por exemplo: 'Marca Principal' ou 'Campanha Ecommerce'.",
              },
              {
                numero: "05",
                titulo: "Acessar o dashboard do cliente",
                descricao:
                  "A partir da lista de clientes, o gestor abre o dashboard de qualquer cliente. O painel exibe os dados reais das campanhas com duas abas — uma para Google Ads e outra para Meta Ads — com gráficos, métricas e tabela de campanhas.",
              },
              {
                numero: "06",
                titulo: "Filtrar e analisar os resultados",
                descricao:
                  "O usuário pode selecionar o intervalo de datas desejado e escolher quais campanhas incluir na análise. O painel atualiza instantaneamente os gráficos e métricas com base nos filtros aplicados.",
              },
            ].map((passo, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-5">
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {passo.numero}
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">{passo.titulo}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{passo.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Métricas */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">O que o app entrega — Métricas disponíveis</h2>
          <p className="text-gray-500">
            O dashboard de campanhas exibe as seguintes métricas de desempenho para cada cliente,
            consolidadas por plataforma e filtráveis por período.
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Métrica</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">O que representa</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Formato</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plataformas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  {
                    metrica: "Valor Gasto",
                    desc: "Total investido em anúncios no período selecionado",
                    formato: "R$ 1.234,56",
                    plataformas: "Google Ads · Meta Ads",
                    cor: "text-blue-600",
                  },
                  {
                    metrica: "Conversões",
                    desc: "Número de ações de valor completadas pelos usuários (compras, leads, etc.)",
                    formato: "1.234",
                    plataformas: "Google Ads · Meta Ads",
                    cor: "text-emerald-600",
                  },
                  {
                    metrica: "Cliques",
                    desc: "Total de cliques recebidos pelos anúncios",
                    formato: "5.678",
                    plataformas: "Google Ads · Meta Ads",
                    cor: "text-amber-600",
                  },
                  {
                    metrica: "Impressões",
                    desc: "Número de vezes que os anúncios foram exibidos",
                    formato: "123.456",
                    plataformas: "Google Ads · Meta Ads",
                    cor: "text-violet-600",
                  },
                  {
                    metrica: "CTR",
                    desc: "Taxa de cliques: percentual de impressões que geraram um clique",
                    formato: "2,45%",
                    plataformas: "Google Ads · Meta Ads",
                    cor: "text-gray-700",
                  },
                  {
                    metrica: "CPC Médio",
                    desc: "Custo médio pago por cada clique recebido",
                    formato: "R$ 3,20",
                    plataformas: "Google Ads · Meta Ads",
                    cor: "text-gray-700",
                  },
                  {
                    metrica: "Custo por Conversão",
                    desc: "Valor médio investido para gerar cada conversão",
                    formato: "R$ 45,00",
                    plataformas: "Google Ads · Meta Ads",
                    cor: "text-gray-700",
                  },
                ].map((row) => (
                  <tr key={row.metrica} className="hover:bg-gray-50">
                    <td className={`px-5 py-3.5 font-semibold ${row.cor}`}>{row.metrica}</td>
                    <td className="px-5 py-3.5 text-gray-600">{row.desc}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-500 text-xs">{row.formato}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{row.plataformas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">
            Todas as métricas são exibidas no período selecionado e podem ser filtradas por campanha individualmente.
            Os valores monetários são exibidos em Reais (BRL) e os números seguem a formatação brasileira.
          </p>
        </section>

        {/* Telas do sistema */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Telas do sistema</h2>
          <p className="text-gray-500">
            O B300 Dashboard é composto pelas seguintes telas principais, acessíveis pelo menu lateral.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                rota: "/dashboard",
                nome: "Painel inicial",
                descricao:
                  "Visão geral com totais de clientes cadastrados e contas conectadas. Ponto de entrada para novos usuários iniciarem o fluxo de configuração.",
              },
              {
                rota: "/clients",
                nome: "Lista de clientes",
                descricao:
                  "Grid com todos os clientes cadastrados, mostrando nome, número de contas vinculadas e atalhos para o dashboard e para edição de cada cliente.",
              },
              {
                rota: "/clients/[id]/dashboard",
                nome: "Dashboard por cliente",
                descricao:
                  "Painel analítico completo do cliente com filtros de data, seleção de campanhas, gráfico de linha interativo, KPIs e tabela de campanhas. Abas separadas para Google Ads e Meta Ads.",
              },
              {
                rota: "/clients/new",
                nome: "Criar novo cliente",
                descricao:
                  "Formulário para cadastrar um novo cliente no sistema, definir o nome, adicionar observações e selecionar as contas de anúncios que serão vinculadas.",
              },
              {
                rota: "/clients/[id]/edit",
                nome: "Editar cliente",
                descricao:
                  "Gestão das contas vinculadas ao cliente. Permite adicionar novas contas, definir apelidos personalizados (alias) e remover vínculos.",
              },
              {
                rota: "/integrations/google",
                nome: "Integração Google Ads",
                descricao:
                  "Página para conectar contas do Google Ads via autorização OAuth. Exibe as contas já conectadas com status de ativação e permite adicionar novas conexões.",
              },
              {
                rota: "/integrations/meta",
                nome: "Integração Meta Ads",
                descricao:
                  "Página para conectar contas do Meta Ads (Facebook/Instagram) via autorização OAuth. Mesma estrutura da integração Google Ads, adaptada para a plataforma Meta.",
              },
            ].map((tela) => (
              <div key={tela.rota} className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5">{tela.rota}</code>
                </div>
                <p className="font-semibold text-gray-900">{tela.nome}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{tela.descricao}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Navegação */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Navegação e estrutura visual</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Menu lateral (sidebar)</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Navegação principal com tema escuro (slate). Exibe: Dashboard, Clientes, e Integrações
                  (com submenu Google Ads e Meta Ads). Em dispositivos móveis, o menu é recolhido e
                  acessado por botão hambúrguer.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Paleta de cores</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Azul (#3B82F6) para Google Ads e ações principais. Azul Facebook (#1877F2) para Meta Ads.
                  Verde para conversões, âmbar para cliques, roxo para impressões. Fundo claro nas áreas de
                  conteúdo, escuro no menu.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Feedback e notificações</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Todas as ações do usuário têm retorno visual imediato: toasts de sucesso (verde) e erro (vermelho)
                  no canto superior direito, estados de carregamento com skeleton screens, e botões com estado
                  desabilitado/carregando durante operações em andamento.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Idioma e localização</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Interface 100% em Português do Brasil. Moeda em Real (R$), datas no formato DD/MM/AAAA,
                  números com separador de milhar por ponto e decimal por vírgula — padrão brasileiro.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Proposta de valor */}
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white space-y-6">
          <h2 className="text-2xl font-bold">O que o B300 Dashboard entrega</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                titulo: "Visão centralizada",
                descricao: "Google Ads e Meta Ads na mesma tela, sem trocar de plataforma.",
              },
              {
                titulo: "Organização por cliente",
                descricao: "Cada cliente tem seu espaço com contas e dados separados.",
              },
              {
                titulo: "Análise com filtros precisos",
                descricao: "Selecione o período e as campanhas exatas para análises focadas.",
              },
              {
                titulo: "Dados reais das plataformas",
                descricao: "Informações diretas das APIs do Google Ads e Meta Ads, sempre atualizadas.",
              },
              {
                titulo: "Personalização dos nomes",
                descricao: "Apelidos customizados para cada conta facilitam a identificação.",
              },
              {
                titulo: "Agilidade no dia a dia",
                descricao: "Menos tempo navegando entre plataformas, mais tempo analisando resultados.",
              },
            ].map((item) => (
              <div key={item.titulo} className="flex gap-3">
                <div className="shrink-0 w-5 h-5 mt-0.5 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.titulo}</p>
                  <p className="text-blue-100 text-sm leading-relaxed">{item.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-400">
          <span>B300 Dashboard — Documentação de design</span>
          <span>v1.0 · Uso interno · 2026</span>
        </div>
      </footer>

    </div>
  );
}
