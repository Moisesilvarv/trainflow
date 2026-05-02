import { Link } from 'react-router-dom';
import { PublicInfoLayout } from '../components/marketing/PublicInfoLayout';

const Section = PublicInfoLayout.Section;

export function ContactPage() {
  return (
    <PublicInfoLayout
      eyebrow="Contato institucional"
      title="Canal inicial para contato comercial, suporte e privacidade"
      description="Esta pagina centraliza os canais institucionais basicos do TrainFlow para atendimento comercial, suporte de plataforma, duvidas sobre cobranca e demandas relacionadas a dados."
      updatedAt="30/04/2026"
    >
      <Section title="1. Canais recomendados">
        <p>
          Para a versao inicial de publicacao, recomendamos manter ao menos um canal institucional dedicado para atendimento, como um email de suporte e um email especifico para assuntos de privacidade e dados.
        </p>
        <p>
          Exemplo inicial:
          <br />
          suporte@seudominio.com
          <br />
          privacidade@seudominio.com
        </p>
      </Section>
      <Section title="2. Assuntos atendidos">
        <p>
          Este canal pode ser utilizado para duvidas sobre criacao de conta, acesso, planos, pagamentos via Stripe, uso do portal do aluno, solicitacoes relacionadas a dados cadastrados na plataforma e orientacoes iniciais sobre recursos com IA.
        </p>
      </Section>
      <Section title="3. Transparencia operacional">
        <p>
          O TrainFlow pode responder solicitacoes relacionadas a operacao da plataforma, mas eventuais textos juridicos, prazos formais, fluxos internos de compliance e termos definitivos ainda podem ser refinados posteriormente com apoio especializado.
        </p>
        <p>
          Esta pagina e um ponto institucional inicial e deve ser revisada quando o dominio final, canais oficiais e politica de atendimento estiverem consolidados.
        </p>
      </Section>
      <Section title="4. Acesso rapido">
        <div className="flex flex-wrap gap-3">
          <Link to="/privacy" className="btn-secondary">
            Ver politica de privacidade
          </Link>
          <Link to="/terms" className="btn-secondary">
            Ver termos de uso
          </Link>
          <Link to="/register" className="btn-primary">
            Criar conta
          </Link>
        </div>
      </Section>
    </PublicInfoLayout>
  );
}
