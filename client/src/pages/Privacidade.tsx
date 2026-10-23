import { LegalPage, type LegalSection } from "./LegalPage";

const sections: LegalSection[] = [
  {
    title: "Quem somos e qual é o nosso papel",
    body: (
      <>
        <p>O Ide Fazei é uma plataforma de gestão para igrejas. Cada igreja que usa a plataforma é a <strong>controladora</strong> dos dados das pessoas que ela cadastra (membros, visitantes, alunos, participantes de células e eventos): é ela quem decide por que e como esses dados são usados. O Ide Fazei atua como <strong>operador</strong>, tratando esses dados apenas para prestar o serviço contratado e seguindo as instruções da igreja.</p>
        <p>Sobre os dados do cadastro da própria igreja e de quem a administra (nome, e-mail, dados de cobrança e uso da plataforma), o Ide Fazei é o controlador.</p>
      </>
    ),
  },
  {
    title: "Quais dados tratamos",
    body: (
      <>
        <ul>
          <li><strong>Cadastro e acesso:</strong> nome, e-mail, telefone, senha (guardada de forma criptografada) e função na igreja.</li>
          <li><strong>Vida da igreja:</strong> data de nascimento, endereço, família, participação em células, ministérios, escalas, eventos, cursos e batismo.</li>
          <li><strong>Cuidado pastoral:</strong> pedidos de oração, registros de consolidação e visitas, aconselhamento e anotações de acompanhamento.</li>
          <li><strong>Uso técnico:</strong> endereço IP, tipo de navegador e registros de acesso, para segurança e para corrigir falhas.</li>
          <li><strong>Pagamentos:</strong> o pagamento da assinatura e de doações é processado por provedor de pagamentos; não guardamos número completo de cartão.</li>
        </ul>
        <p>Informações sobre fé, religião e vida espiritual são <strong>dados pessoais sensíveis</strong> pela LGPD. Por isso, o acesso é limitado por função: cada pessoa só enxerga o que o seu papel na igreja permite.</p>
      </>
    ),
  },
  {
    title: "Para que usamos os dados",
    body: (
      <ul>
        <li>Permitir que a igreja organize pessoas, células, escalas, eventos, cursos e o cuidado pastoral.</li>
        <li>Enviar avisos do sistema, como confirmação de e-mail, redefinição de senha e notificações que você ativar.</li>
        <li>Cobrar a assinatura e emitir comprovantes.</li>
        <li>Manter a segurança, prevenir fraudes e corrigir erros.</li>
        <li>Cumprir obrigações legais.</li>
      </ul>
    ),
  },
  {
    title: "Base legal",
    body: <p>Tratamos os dados com base no <strong>consentimento</strong> (por exemplo, quando você se cadastra e autoriza o contato da igreja), na <strong>execução de contrato</strong> (prestação do serviço à igreja), no <strong>cumprimento de obrigação legal</strong> e no <strong>legítimo interesse</strong> para segurança da plataforma. Para dados sensíveis, usamos o consentimento ou as hipóteses previstas no art. 11 da LGPD, em especial o tratamento por entidade religiosa em relação aos seus membros.</p>,
  },
  {
    title: "Com quem compartilhamos",
    body: (
      <>
        <p>Não vendemos dados pessoais. Compartilhamos apenas o necessário com fornecedores que nos ajudam a operar o serviço:</p>
        <ul>
          <li>hospedagem e infraestrutura dos servidores;</li>
          <li>rede de entrega e proteção contra ataques;</li>
          <li>envio de e-mails do sistema;</li>
          <li>processamento de pagamentos.</li>
        </ul>
        <p>Dados de uma igreja nunca são exibidos a outra igreja. Também podemos compartilhar informações quando houver ordem judicial ou exigência legal.</p>
      </>
    ),
  },
  {
    title: "Quanto tempo guardamos",
    body: <p>Guardamos os dados enquanto a igreja mantiver a conta ativa. Se a conta for encerrada, os dados são excluídos ou anonimizados em prazo razoável, exceto o que precisarmos guardar para cumprir obrigação legal ou para defesa em processos. Cópias de segurança são substituídas periodicamente.</p>,
  },
  {
    title: "Segurança",
    body: (
      <>
        <p>Usamos conexão criptografada (HTTPS), senhas armazenadas com criptografia, controle de acesso por função, separação dos dados de cada igreja e cópias de segurança.</p>
        <p>No uso normal da plataforma, a equipe do Ide Fazei não acessa os dados de membros, visitantes e participantes das igrejas: o painel de administração da plataforma trata apenas do cadastro da igreja (nome e contato de quem a administra) e da cobrança, e não exibe os dados das pessoas cadastradas por ela. O acesso técnico direto à infraestrutura é restrito a pessoal autorizado e usado somente para operar, manter e corrigir o serviço.</p>
        <p>Nenhum sistema é totalmente imune a incidentes; se ocorrer um que possa causar risco relevante, avisaremos a igreja e as autoridades conforme a lei.</p>
      </>
    ),
  },
  {
    title: "Seus direitos",
    body: (
      <>
        <p>Pela LGPD, você pode pedir: confirmação de que tratamos seus dados, acesso, correção, anonimização ou exclusão, portabilidade, informação sobre compartilhamento e a revogação do consentimento.</p>
        <p>Como a igreja é quem controla os dados de membros e visitantes, o caminho mais rápido é falar com a liderança da sua igreja. Se preferir, escreva para nós no e-mail indicado no final desta página e encaminharemos o pedido.</p>
      </>
    ),
  },
  {
    title: "Crianças e adolescentes",
    body: <p>Dados de menores de 18 anos devem ser cadastrados somente com autorização dos pais ou responsáveis, sob responsabilidade da igreja, e usados no melhor interesse da criança ou do adolescente.</p>,
  },
  {
    title: "Cookies e armazenamento no navegador",
    body: <p>Usamos cookies e armazenamento local apenas para manter você conectado, lembrar preferências e proteger o acesso. Não usamos cookies de publicidade.</p>,
  },
  {
    title: "Mudanças nesta política",
    body: <p>Podemos atualizar esta política. Quando a mudança for relevante, avisaremos pela plataforma. A data da última atualização fica sempre no topo da página.</p>,
  },
];

export default function Privacidade() {
  return (
    <LegalPage
      title="Política de privacidade"
      updatedAt="23 de outubro de 2026"
      intro="Esta política explica, de forma simples, como o Ide Fazei trata dados pessoais, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018)."
      sections={sections}
    />
  );
}
