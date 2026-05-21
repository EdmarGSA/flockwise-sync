import { ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TermosUso = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Termos de Uso | GSA Tibiri</title>
        <meta name="description" content="Termos de Uso da plataforma GSA Tibiri (FlockWise Sync): condições de acesso, responsabilidades e regras de utilização conforme a legislação brasileira." />
        <link rel="canonical" href="https://gsatibiri.com/termos-uso" />
        <meta property="og:title" content="Termos de Uso | GSA Tibiri" />
        <meta property="og:description" content="Condições de acesso e utilização da plataforma GSA Tibiri." />
        <meta property="og:url" content="https://gsatibiri.com/termos-uso" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <article className="prose prose-sm dark:prose-invert max-w-none">
          <h1 className="text-2xl font-bold text-foreground">Termos de Uso</h1>
          <p className="text-muted-foreground text-sm">Última atualização: 08 de março de 2026</p>

          <p>
            Estes Termos de Uso regulam o acesso e a utilização da plataforma <strong>FlockWise Sync</strong>, 
            desenvolvida e operada pela <strong>GSA Tecnologia</strong> ("Plataforma"), em conformidade com 
            a legislação brasileira vigente.
          </p>

          <h2>1. Aceitação dos Termos</h2>
          <p>
            Ao acessar ou utilizar a Plataforma, o usuário declara que leu, compreendeu e 
            concorda com estes Termos de Uso e com a Política de Privacidade. Caso não concorde 
            com qualquer disposição, deve cessar imediatamente o uso da Plataforma.
          </p>

          <h2>2. Objeto</h2>
          <p>
            A Plataforma oferece ferramentas de gestão para produção avícola, incluindo controle 
            de lotes, gestão de consumo, fábrica de ração, módulo veterinário, comercialização, 
            controle financeiro e integrações com parceiros comerciais, conforme o plano contratado.
          </p>

          <h2>3. Cadastro e Acesso</h2>
          <ul>
            <li>O acesso à Plataforma requer cadastro com informações verdadeiras e atualizadas;</li>
            <li>O usuário é responsável pela confidencialidade de suas credenciais de acesso;</li>
            <li>Toda atividade realizada com as credenciais do usuário é de sua responsabilidade;</li>
            <li>O usuário deve comunicar imediatamente qualquer uso não autorizado de sua conta.</li>
          </ul>

          <h2>4. Obrigações do Usuário</h2>
          <p>O usuário compromete-se a:</p>
          <ul>
            <li>Utilizar a Plataforma de acordo com a legislação vigente e estes Termos;</li>
            <li>Não reproduzir, copiar ou distribuir conteúdo da Plataforma sem autorização;</li>
            <li>Não tentar acessar áreas restritas ou sistemas de segurança;</li>
            <li>Manter atualizados seus dados cadastrais;</li>
            <li>Não utilizar a Plataforma para atividades ilícitas ou que violem direitos de terceiros.</li>
          </ul>

          <h2>5. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo da Plataforma, incluindo mas não se limitando a textos, gráficos, 
            logotipos, ícones, imagens, clipes de áudio, downloads digitais, compilações de dados 
            e software, é de propriedade da GSA Tecnologia ou de seus licenciadores, e é protegido 
            pelas leis brasileiras de propriedade intelectual, incluindo a Lei nº 9.610/1998 
            (Lei de Direitos Autorais) e a Lei nº 9.279/1996 (Lei da Propriedade Industrial).
          </p>

          <h2>6. Disponibilidade do Serviço</h2>
          <p>
            A GSA Tecnologia empenhará esforços razoáveis para manter a Plataforma disponível, 
            mas não garante disponibilidade ininterrupta. Manutenções programadas e eventos de 
            força maior (Art. 393, Código Civil) podem afetar a disponibilidade.
          </p>

          <h2>7. Limitação de Responsabilidade</h2>
          <p>
            A GSA Tecnologia não se responsabiliza por:
          </p>
          <ul>
            <li>Danos decorrentes de uso indevido da Plataforma pelo usuário;</li>
            <li>Falhas de conexão à internet do usuário;</li>
            <li>Decisões tomadas com base nos dados exibidos na Plataforma;</li>
            <li>Danos indiretos, incidentais, especiais ou consequenciais;</li>
            <li>Ações de terceiros que afetem o funcionamento da Plataforma.</li>
          </ul>
          <p>
            A responsabilidade total da GSA Tecnologia, quando aplicável, será limitada ao valor 
            pago pelo usuário nos últimos 12 meses, conforme Art. 944 do Código Civil.
          </p>

          <h2>8. Suspensão e Cancelamento</h2>
          <p>
            A GSA Tecnologia reserva-se o direito de suspender ou cancelar o acesso do usuário 
            que violar estes Termos, sem prejuízo de medidas judiciais cabíveis, assegurado o 
            contraditório e ampla defesa quando aplicável (Art. 5º, LV, CF/88).
          </p>

          <h2>9. Proteção de Dados</h2>
          <p>
            O tratamento de dados pessoais é regido pela nossa Política de Privacidade e 
            pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Ao utilizar a 
            Plataforma, o usuário consente com o tratamento de seus dados conforme descrito 
            na Política de Privacidade.
          </p>

          <h2>10. Código de Defesa do Consumidor</h2>
          <p>
            As relações de consumo decorrentes do uso da Plataforma são regidas pelo Código 
            de Defesa do Consumidor (Lei nº 8.078/1990), assegurando ao usuário-consumidor 
            todos os direitos previstos naquela legislação.
          </p>

          <h2>11. Marco Civil da Internet</h2>
          <p>
            O uso da Plataforma observa os princípios e direitos estabelecidos no Marco Civil 
            da Internet (Lei nº 12.965/2014), incluindo a proteção da privacidade, a 
            inviolabilidade e o sigilo das comunicações, salvo por ordem judicial.
          </p>

          <h2>12. Modificações dos Termos</h2>
          <p>
            Estes Termos podem ser atualizados periodicamente. O usuário será notificado sobre 
            alterações relevantes. O uso continuado da Plataforma após a publicação de alterações 
            constitui aceitação dos novos Termos.
          </p>

          <h2>13. Legislação Aplicável e Foro</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito 
            o foro da comarca da sede da GSA Tecnologia para dirimir quaisquer controvérsias, 
            com renúncia expressa a qualquer outro, por mais privilegiado que seja, salvo nos 
            casos de competência do foro do domicílio do consumidor (Art. 101, I, CDC).
          </p>

          <h2>14. Disposições Gerais</h2>
          <ul>
            <li>A tolerância quanto a eventual descumprimento não implica renúncia de direitos;</li>
            <li>Se qualquer disposição for considerada inválida, as demais permanecerão em vigor;</li>
            <li>Estes Termos constituem o acordo integral entre as partes sobre o objeto aqui tratado.</li>
          </ul>
        </article>
      </div>
    </div>
  );
};

export default TermosUso;
