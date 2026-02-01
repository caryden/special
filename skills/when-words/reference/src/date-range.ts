/**
 * Formats a start and end timestamp as a smart date range string,
 * collapsing redundant information.
 *
 *   Same day:              "January 15, 2024"
 *   Same month:            "January 15–22, 2024"
 *   Same year, diff month: "January 15 – February 15, 2024"
 *   Different years:       "December 28, 2023 – January 15, 2024"
 *
 * If start > end, the inputs are auto-corrected (swapped).
 * All date math uses UTC.
 *
 * @node date-range
 * @contract date-range.test.ts
 * @hint pattern: Pure function. Uses en-dash (–) not hyphen (-) for ranges.
 */
export function dateRange(start: number, end: number): string {
  // Auto-correct swapped inputs
  if (start > end) {
    [start, end] = [end, start];
  }

  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const startDate = new Date(start * 1000);
  const endDate = new Date(end * 1000);

  const sYear = startDate.getUTCFullYear();
  const sMonth = startDate.getUTCMonth();
  const sDay = startDate.getUTCDate();

  const eYear = endDate.getUTCFullYear();
  const eMonth = endDate.getUTCMonth();
  const eDay = endDate.getUTCDate();

  // Same day (possibly different times)
  if (sYear === eYear && sMonth === eMonth && sDay === eDay) {
    return `${MONTH_NAMES[sMonth]} ${sDay}, ${sYear}`;
  }

  // Same month and year
  if (sYear === eYear && sMonth === eMonth) {
    return `${MONTH_NAMES[sMonth]} ${sDay}\u2013${eDay}, ${sYear}`;
  }

  // Same year, different months
  if (sYear === eYear) {
    return `${MONTH_NAMES[sMonth]} ${sDay} \u2013 ${MONTH_NAMES[eMonth]} ${eDay}, ${sYear}`;
  }

  // Different years
  return `${MONTH_NAMES[sMonth]} ${sDay}, ${sYear} \u2013 ${MONTH_NAMES[eMonth]} ${eDay}, ${eYear}`;
}
