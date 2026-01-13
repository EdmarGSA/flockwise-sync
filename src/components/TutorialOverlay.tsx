import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { useDemo } from '@/contexts/DemoContext';
import { 
  getTutorialByModule, 
  markTutorialComplete, 
  isTutorialCompleted,
  resetTutorial 
} from '@/lib/tutorials';
import { Button } from '@/components/ui/button';
import { HelpCircle, RotateCcw } from 'lucide-react';

interface TutorialOverlayProps {
  moduleCode: string;
}

const TutorialOverlay = ({ moduleCode }: TutorialOverlayProps) => {
  const { isDemo } = useDemo();
  const [run, setRun] = useState(false);
  const [showRestartButton, setShowRestartButton] = useState(false);

  const tutorial = getTutorialByModule(moduleCode);

  useEffect(() => {
    if (isDemo && tutorial && !isTutorialCompleted(moduleCode)) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(timer);
    } else if (tutorial && isTutorialCompleted(moduleCode)) {
      setShowRestartButton(true);
    }
  }, [isDemo, moduleCode, tutorial]);

  const handleCallback = (data: CallBackProps) => {
    const { status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      markTutorialComplete(moduleCode);
      setShowRestartButton(true);
    }

    if (type === EVENTS.TOUR_END) {
      setRun(false);
    }
  };

  const handleRestart = () => {
    resetTutorial(moduleCode);
    setRun(true);
    setShowRestartButton(false);
  };

  if (!tutorial) return null;

  return (
    <>
      <Joyride
        steps={tutorial.steps}
        run={run}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableOverlayClose
        callback={handleCallback}
        locale={{
          back: 'Voltar',
          close: 'Fechar',
          last: 'Finalizar',
          next: 'Próximo',
          skip: 'Pular tour',
        }}
        styles={{
          options: {
            primaryColor: 'hsl(var(--primary))',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: '8px',
            padding: '16px',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipTitle: {
            fontWeight: 600,
            fontSize: '16px',
            marginBottom: '8px',
          },
          tooltipContent: {
            fontSize: '14px',
            lineHeight: 1.5,
          },
          buttonNext: {
            backgroundColor: 'hsl(var(--primary))',
            borderRadius: '6px',
            padding: '8px 16px',
            fontWeight: 500,
          },
          buttonBack: {
            color: 'hsl(var(--muted-foreground))',
            marginRight: '8px',
          },
          buttonSkip: {
            color: 'hsl(var(--muted-foreground))',
          },
          spotlight: {
            borderRadius: '8px',
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        }}
        floaterProps={{
          disableAnimation: true,
        }}
      />

      {showRestartButton && isDemo && (
        <div className="fixed bottom-4 left-4 z-40">
          <Button
            onClick={handleRestart}
            variant="outline"
            size="sm"
            className="shadow-lg bg-background"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Repetir tutorial
          </Button>
        </div>
      )}

      {!run && !showRestartButton && isDemo && (
        <div className="fixed bottom-4 left-4 z-40">
          <Button
            onClick={() => setRun(true)}
            variant="outline"
            size="sm"
            className="shadow-lg bg-background"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Ver tutorial
          </Button>
        </div>
      )}
    </>
  );
};

export default TutorialOverlay;
