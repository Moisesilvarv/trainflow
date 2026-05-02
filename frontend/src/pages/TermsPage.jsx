import { PublicInfoLayout } from '../components/marketing/PublicInfoLayout';

const Section = PublicInfoLayout.Section;

export function TermsPage() {
  return (
    <PublicInfoLayout
      eyebrow="Termos de uso"
      title="Termos iniciais para uso da plataforma TrainFlow"
      description="Estes termos definem as condicoes basicas de uso do TrainFlow por personal trainers, consultores e demais profissionais que utilizam o SaaS para operar seu atendimento."
      updatedAt="30/04/2026"
    >
      <Section title="1. Uso da plataforma">
        <p>
          O TrainFlow e uma plataforma SaaS voltada para gestao de alunos, treinos, agenda, acompanhamento, portal do aluno, cobrancas e automacoes operacionais. Ao utilizar a plataforma, o profissional declara que esta autorizado a cadastrar e tratar os dados dos seus alunos conforme a legislacao aplicavel.
        </p>
        <p>
          O acesso e concedido de forma limitada, nao exclusiva e revogavel, exclusivamente para finalidades profissionais relacionadas ao acompanhamento esportivo, fisico ou educacional.
        </p>
      </Section>
      <Section title="2. Conta, autenticacao e responsabilidade">
        <p>
          O usuario e responsavel por manter a seguranca das credenciais de acesso, pela confidencialidade da conta e pelo uso adequado dos recursos disponibilizados, incluindo autenticacao por email e senha, configuracoes internas e compartilhamento de acessos.
        </p>
        <p>
          O TrainFlow pode suspender ou limitar funcionalidades em caso de uso abusivo, fraude, inadimplencia, tentativa de acesso nao autorizado ou violacao destes termos.
        </p>
      </Section>
      <Section title="3. Dados de alunos e conteudo profissional">
        <p>
          A plataforma pode armazenar dados cadastrais, historicos de treinos, registros de progresso, observacoes tecnicas, agenda, informacoes de cobranca e outros dados fornecidos pelo profissional sobre seus alunos. O usuario e o responsavel principal pela base legal e pela qualidade desses dados.
        </p>
        <p>
          O TrainFlow atua como ferramenta de apoio operacional e nao substitui avaliacao tecnica, acompanhamento clinico ou obrigacoes legais do profissional perante seus clientes e autoridades competentes.
        </p>
      </Section>
      <Section title="4. Pagamentos, assinaturas e Stripe">
        <p>
          Assinaturas pagas podem ser processadas por provedores terceirizados, incluindo Stripe. Valores, recorrencia, cancelamentos, renovacoes e falhas de pagamento seguem o plano contratado e as regras do provedor de pagamento integrado.
        </p>
        <p>
          O nao pagamento pode resultar em suspensao de acesso, limitacao de funcionalidades ou encerramento da assinatura, sem prejuizo da manutencao de registros exigidos para auditoria e conciliacao financeira.
        </p>
      </Section>
      <Section title="5. Recursos de IA e automacao">
        <p>
          O TrainFlow pode oferecer funcionalidades com inteligencia artificial para auxiliar na criacao de treinos, sugestoes operacionais, organizacao de informacoes e produtividade. Essas respostas sao assistivas e devem sempre ser revisadas pelo profissional antes do uso com alunos.
        </p>
        <p>
          O usuario concorda em nao utilizar recursos de IA para fins ilicitos, discriminatorios, enganosos ou que possam gerar risco inadequado aos alunos.
        </p>
      </Section>
      <Section title="6. Conteudo inicial">
        <p>
          Este texto e um modelo inicial de termos para publicacao do produto e pode ser ajustado, expandido ou substituido apos revisao juridica formal, adequacao contratual e validacao das obrigacoes regulatorias aplicaveis ao negocio.
        </p>
      </Section>
    </PublicInfoLayout>
  );
}
