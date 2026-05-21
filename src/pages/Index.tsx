import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ModulesSection from "@/components/ModulesSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>GSA Tibiri - Gestão Avícola Integrada na Palma da Mão</title>
        <meta name="description" content="Plataforma integrada para granjas: lotes, IoT, fábrica de ração, financeiro e logística em tempo real. Conheça os módulos do GSA Tibiri." />
        <link rel="canonical" href="https://gsatibiri.com/" />
        <meta property="og:title" content="GSA Tibiri - Gestão Avícola Integrada" />
        <meta property="og:description" content="Sistema integrado para granjas de corte e postura. Monitoramento, IoT e gestão completa em um só lugar." />
        <meta property="og:url" content="https://gsatibiri.com/" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header />
      <main>
        <HeroSection />
        <ModulesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
