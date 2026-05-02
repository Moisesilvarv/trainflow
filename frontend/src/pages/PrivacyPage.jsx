import { PublicInfoLayout } from '../components/marketing/PublicInfoLayout';

const Section = PublicInfoLayout.Section;

export function PrivacyPage() {
  return (
    <PublicInfoLayout
      eyebrow="Politica de privacidade"
      title="Como o TrainFlow trata dados da operacao e dos alunos"
      description="Esta politica resume como o TrainFlow pode coletar, armazenar, processar e proteger dados relacionados ao uso da plataforma, incluindo autenticacao, pagamentos e rotinas com IA."
      updatedAt="30/04/2026"
    >
      <Section title="1. Dados coletados">
        <p>
          O TrainFlow pode coletar dados da conta do profissional, como nome, email, perfil de uso, credenciais autenticadas e informacoes tecnicas basicas de acesso. Tambem pode tratar dados inseridos pelo usuario sobre alunos, como nome, contatos, historico de treinos, evolucao, agendamentos, observacoes e indicadores de acompanhamento.
        </p>
      </Section>
      <Section title="2. Finalidades do tratamento">
        <p>
          Esses dados podem ser utilizados para autenticar acessos, operar a plataforma, organizar agenda, gerar relatorios, registrar pagamentos, disponibilizar o portal do aluno, melhorar desempenho do produto e viabilizar recursos de automacao e inteligencia artificial.
        </p>
        <p>
          O TrainFlow nao utiliza essas informacoes para alterar unilateralmente prescricoes ou substituir a decisao tecnica do profissional responsavel.
        </p>
      </Section>
      <Section title="3. Pagamentos e integracoes">
        <p>
          Pagamentos de assinatura podem ser processados por provedores terceirizados, incluindo Stripe. Nessas operacoes, dados necessarios para cobranca, identificacao da assinatura, eventos de pagamento e conciliacao podem ser compartilhados com o provedor conforme a finalidade contratada.
        </p>
      </Section>
      <Section title="4. Autenticacao e seguranca">
        <p>
          O acesso a areas protegidas depende de mecanismos de autenticacao e controles de sessao. O TrainFlow adota medidas tecnicas razoaveis para reduzir riscos de acesso indevido, incluindo controles de ambiente, segregacao de credenciais e configuracoes de seguranca da aplicacao.
        </p>
      </Section>
      <Section title="5. Recursos com IA">
        <p>
          Determinadas funcionalidades podem processar prompts, contexto operacional e informacoes fornecidas pelo usuario para gerar respostas assistidas por IA. O profissional deve revisar o resultado antes de compartilhar com seus alunos e evitar inserir dados desnecessarios ou excessivamente sensiveis sem a devida base legal.
        </p>
      </Section>
      <Section title="6. Direitos e revisao futura">
        <p>
          Este material representa uma politica inicial de privacidade e pode ser revisado posteriormente para refletir exigencias legais, regulatorias, contratuais ou operacionais. Recomendamos validacao juridica antes da publicacao definitiva em escala.
        </p>
      </Section>
    </PublicInfoLayout>
  );
}
