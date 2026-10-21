import { LegalPage, type LegalSection } from "./LegalPage";

const sections: LegalSection[] = [
  {
    title: "Sobre o serviço",
    body: <p>O Ide Fazei é uma plataforma on-line para gestão de igrejas: pessoas, células, ministérios, escalas, eventos, formação, cuidado pastoral e comunicação. Ao criar uma conta ou usar a plataforma, você concorda com estes termos.</p>,
  },
  {
    title: "Quem pode usar",
    body: (
      <ul>
        <li>A igreja contrata o serviço por meio de um responsável (pastor ou administrador) com poderes para isso.</li>
        <li>Membros, líderes e voluntários acessam a plataforma com o perfil que a igreja definir.</li>
        <li>É preciso ter 18 anos ou autorização de responsável legal para usar a plataforma.</li>
      </ul>
    ),
  },
  {
    title: "Conta e acesso",
    body: <p>Cada pessoa é responsável por manter sua senha em segurança e por tudo o que for feito com a sua conta. Avise-nos se suspeitar de acesso indevido. A igreja é responsável por conceder e retirar permissões da sua equipe.</p>,
  },
  {
    title: "Responsabilidades da igreja",
    body: (
      <ul>
        <li>Cadastrar apenas dados que tenha motivo legítimo para tratar e, quando necessário, obter o consentimento das pessoas.</li>
        <li>Dar acesso às informações sensíveis (como aconselhamento e pedidos de oração) somente a quem precisa delas.</li>
        <li>Atender os pedidos de titulares de dados sobre as informações que controla.</li>
        <li>Não usar a plataforma para fins ilegais, discriminatórios ou para enviar mensagens indesejadas.</li>
      </ul>
    ),
  },
  {
    title: "Uso permitido",
    body: <p>É proibido tentar acessar dados de outras igrejas, burlar limites de segurança, copiar ou revender a plataforma, enviar códigos maliciosos ou sobrecarregar o serviço de forma abusiva.</p>,
  },
  {
    title: "Planos, pagamento e cancelamento",
    body: (
      <>
        <p>Os planos, valores e limites estão descritos na página de planos. A cobrança é recorrente enquanto a assinatura estiver ativa. Você pode cancelar a qualquer momento; o acesso continua até o fim do período já pago.</p>
        <p>Podemos alterar valores e limites com aviso prévio, sem afetar o período já pago.</p>
      </>
    ),
  },
  {
    title: "Conteúdo e dados da igreja",
    body: <p>Os dados e conteúdos que a igreja cadastra continuam sendo dela. Ela nos autoriza a armazená-los e processá-los somente para prestar o serviço. Ao encerrar a conta, a igreja pode pedir uma cópia dos seus dados antes da exclusão. O tratamento de dados pessoais segue a nossa Política de privacidade.</p>,
  },
  {
    title: "Disponibilidade e suporte",
    body: <p>Trabalhamos para manter a plataforma disponível e segura, mas podem ocorrer paradas para manutenção ou por fatores fora do nosso controle. Fazemos cópias de segurança regulares. O atendimento é feito pelos canais da página de contato.</p>,
  },
  {
    title: "Limitação de responsabilidade",
    body: <p>A plataforma é uma ferramenta de apoio. As decisões pastorais, financeiras e de cuidado com as pessoas continuam sendo da igreja. Na medida permitida em lei, não respondemos por danos indiretos nem por perdas causadas por uso indevido da conta, dados incorretos informados pela igreja ou indisponibilidade temporária.</p>,
  },
  {
    title: "Suspensão e encerramento",
    body: <p>Podemos suspender ou encerrar contas que violem estes termos, tragam risco à segurança ou tenham pagamento em atraso, avisando sempre que possível. A igreja pode encerrar sua conta quando quiser.</p>,
  },
  {
    title: "Mudanças nestes termos",
    body: <p>Podemos atualizar estes termos. Mudanças relevantes serão comunicadas pela plataforma. O uso continuado após o aviso significa concordância com a nova versão.</p>,
  },
  {
    title: "Lei aplicável",
    body: <p>Estes termos seguem as leis do Brasil. Para resolver qualquer conflito, as partes elegem o foro da comarca do domicílio do consumidor, quando aplicável, ou o foro da sede do Ide Fazei nos demais casos.</p>,
  },
];

export default function Termos() {
  return (
    <LegalPage
      title="Termos de uso"
      updatedAt="21 de outubro de 2026"
      intro="Estes termos definem as regras de uso do Ide Fazei. Escrevemos de forma direta para que qualquer pessoa da igreja consiga entender."
      sections={sections}
    />
  );
}
