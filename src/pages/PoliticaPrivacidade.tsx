import { ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PoliticaPrivacidade = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Política de Privacidade | GSA Tibiri</title>
        <meta name="description" content="Política de Privacidade do GSA Tibiri: como coletamos, usamos e protegemos dados pessoais em conformidade com a LGPD (Lei 13.709/2018)." />
        <link rel="canonical" href="https://gsatibiri.com/politica-privacidade" />
        <meta property="og:title" content="Política de Privacidade | GSA Tibiri" />
        <meta property="og:description" content="Como tratamos seus dados pessoais conforme a LGPD." />
        <meta property="og:url" content="https://gsatibiri.com/politica-privacidade" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <article className="prose prose-sm dark:prose-invert max-w-none">
          <h1 className="text-2xl font-bold text-foreground">Política de Privacidade</h1>
          <p className="text-muted-foreground text-sm">Última atualização: 08 de março de 2026</p>

          <p>
            A <strong>GSA Tecnologia</strong> ("nós", "nosso") opera a plataforma FlockWise Sync.
            Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações 
            pessoais, em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais 
            (Lei nº 13.709/2018 — LGPD)</strong> e demais legislações aplicáveis.
          </p>

          <h2>1. Dados Pessoais Coletados</h2>
          <p>Coletamos os seguintes dados pessoais:</p>
          <ul>
            <li><strong>Dados de identificação:</strong> nome completo, CPF/CNPJ, e-mail, telefone;</li>
            <li><strong>Dados de acesso:</strong> endereço IP, user-agent, data e hora de acesso;</li>
            <li><strong>Dados de uso:</strong> interações com o sistema, preferências de navegação;</li>
            <li><strong>Dados profissionais:</strong> informações de organização, cargo e função no sistema.</li>
          </ul>

          <h2>2. Finalidade do Tratamento</h2>
          <p>Os dados pessoais são tratados para as seguintes finalidades (Art. 7º da LGPD):</p>
          <ul>
            <li>Execução do contrato de prestação de serviços (Art. 7º, V);</li>
            <li>Cumprimento de obrigação legal ou regulatória (Art. 7º, II);</li>
            <li>Exercício regular de direitos em processo judicial, administrativo ou arbitral (Art. 7º, VI);</li>
            <li>Legítimo interesse do controlador para melhorias do serviço (Art. 7º, IX);</li>
            <li>Proteção ao crédito (Art. 7º, X);</li>
            <li>Mediante consentimento do titular para cookies não essenciais (Art. 7º, I).</li>
          </ul>

          <h2>3. Base Legal (Art. 7º, LGPD)</h2>
          <p>
            O tratamento de dados pessoais é realizado com base nas hipóteses legais previstas no 
            Art. 7º da Lei nº 13.709/2018, especialmente: consentimento, execução de contrato, 
            cumprimento de obrigação legal e legítimo interesse.
          </p>

          <h2>4. Compartilhamento de Dados</h2>
          <p>Seus dados podem ser compartilhados com:</p>
          <ul>
            <li>Parceiros comerciais vinculados à operação contratada;</li>
            <li>Prestadores de serviços essenciais (hospedagem, processamento);</li>
            <li>Autoridades públicas quando exigido por lei ou ordem judicial.</li>
          </ul>
          <p>
            <strong>Não comercializamos</strong> dados pessoais de nossos usuários com terceiros 
            para fins de marketing ou publicidade.
          </p>

          <h2>5. Armazenamento e Segurança</h2>
          <p>
            Os dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e 
            em repouso. Adotamos medidas técnicas e administrativas aptas a proteger os dados 
            pessoais de acessos não autorizados, conforme Art. 46 da LGPD.
          </p>

          <h2>6. Retenção de Dados</h2>
          <p>
            Os dados pessoais são mantidos pelo tempo necessário para cumprir as finalidades 
            para as quais foram coletados, inclusive para fins de cumprimento de obrigações 
            legais, contratuais, de prestação de contas ou requisição de autoridades competentes 
            (Art. 16, LGPD).
          </p>

          <h2>7. Direitos do Titular (Art. 18, LGPD)</h2>
          <p>Você pode exercer os seguintes direitos a qualquer momento:</p>
          <ul>
            <li>Confirmação da existência de tratamento;</li>
            <li>Acesso aos dados;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
            <li>Portabilidade dos dados;</li>
            <li>Eliminação dos dados tratados com consentimento;</li>
            <li>Informação sobre compartilhamento;</li>
            <li>Revogação do consentimento.</li>
          </ul>
          <p>
            Para exercer seus direitos, entre em contato pelo e-mail: <strong>privacidade@gsatecnologia.com.br</strong>
          </p>

          <h2>8. Cookies</h2>
          <p>
            Utilizamos cookies essenciais para o funcionamento do sistema e cookies opcionais 
            mediante consentimento. Você pode gerenciar suas preferências a qualquer momento 
            através do banner de cookies exibido ao acessar a plataforma.
          </p>

          <h2>9. Encarregado de Dados (DPO)</h2>
          <p>
            O Encarregado de Proteção de Dados pode ser contatado pelo e-mail: 
            <strong> dpo@gsatecnologia.com.br</strong> (Art. 41, LGPD).
          </p>

          <h2>10. Alterações nesta Política</h2>
          <p>
            Reservamo-nos o direito de alterar esta Política de Privacidade a qualquer momento. 
            Alterações significativas serão comunicadas por meio de aviso no sistema. O uso 
            continuado após as alterações constitui aceitação da nova versão.
          </p>

          <h2>11. Legislação Aplicável e Foro</h2>
          <p>
            Esta Política é regida pelas leis da República Federativa do Brasil, em especial 
            a Lei nº 13.709/2018 (LGPD), o Marco Civil da Internet (Lei nº 12.965/2014) e 
            o Código de Defesa do Consumidor (Lei nº 8.078/1990). Fica eleito o foro da 
            comarca da sede da empresa para dirimir quaisquer controvérsias.
          </p>
        </article>
      </div>
    </div>
  );
};

export default PoliticaPrivacidade;
