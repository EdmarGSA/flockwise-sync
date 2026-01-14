import { subDays, startOfDay, endOfDay, isWithinInterval, isBefore, startOfToday } from 'date-fns';

export const MAX_RETROACTIVE_DAYS = 60;

/**
 * Returns the minimum allowed date for retroactive entries
 */
export function getMinRetroactiveDate(): Date {
  return startOfDay(subDays(new Date(), MAX_RETROACTIVE_DAYS));
}

/**
 * Checks if a date is within the valid retroactive range
 */
export function isValidRetroactiveDate(date: Date): boolean {
  const minDate = getMinRetroactiveDate();
  const today = endOfDay(new Date());
  return isWithinInterval(date, { start: minDate, end: today });
}

/**
 * Returns a function to be used with Calendar's disabled prop
 * @param allowFuture - If true, allows dates in the future
 */
export function getDateDisabledFunction(allowFuture = false): (date: Date) => boolean {
  return (date: Date) => {
    const minDate = getMinRetroactiveDate();
    const today = endOfDay(new Date());
    
    // Disable dates before the retroactive limit
    if (isBefore(date, minDate)) return true;
    
    // Disable future dates if not allowed
    if (!allowFuture && date > today) return true;
    
    return false;
  };
}

/**
 * Checks if a date is in the past (before today)
 */
export function isRetroactiveDate(date: Date): boolean {
  return isBefore(date, startOfToday());
}
