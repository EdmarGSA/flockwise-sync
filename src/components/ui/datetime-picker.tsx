import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDateDisabledFunction, isRetroactiveDate, MAX_RETROACTIVE_DAYS } from '@/lib/dateValidation';

interface DateTimePickerProps {
  date: Date;
  time: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  disabled?: boolean;
  allowFuture?: boolean;
  label?: string;
  showRetroactiveBadge?: boolean;
  dateOnly?: boolean;
  className?: string;
}

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  disabled = false,
  allowFuture = false,
  label,
  showRetroactiveBadge = true,
  dateOnly = false,
  className,
}: DateTimePickerProps) {
  const isRetroactive = isRetroactiveDate(date);
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "flex-1 justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && onDateChange(newDate)}
              disabled={getDateDisabledFunction(allowFuture)}
              initialFocus
              className="pointer-events-auto"
              locale={ptBR}
            />
            <div className="px-3 pb-3 text-xs text-muted-foreground text-center border-t pt-2">
              Limite: até {MAX_RETROACTIVE_DAYS} dias retroativos
            </div>
          </PopoverContent>
        </Popover>
        
        {!dateOnly && (
          <Input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            disabled={disabled}
            className="w-28"
          />
        )}
      </div>
      
      {showRetroactiveBadge && isRetroactive && (
        <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
          <Clock className="w-3 h-3" />
          Registro retroativo
        </Badge>
      )}
    </div>
  );
}

/**
 * Helper to combine date and time into a single Date object
 */
export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours || 0, minutes || 0, 0, 0);
  return combined;
}
