# field-range — Spec

Depends on: none (leaf node)

## Purpose

Define valid value ranges for each cron field, provide month/day-of-week name
aliases, and utility functions for last-day-of-month and day-of-week calculation.

## Constants

@provenance POSIX.1-2017 crontab(5), Vixie cron 4.1

### FIELD_RANGES

| Field | Min | Max |
|-------|-----|-----|
| minute | 0 | 59 |
| hour | 0 | 23 |
| dayOfMonth | 1 | 31 |
| month | 1 | 12 |
| dayOfWeek | 0 | 6 |

### MONTH_ALIASES

@provenance POSIX.1-2017 crontab(5)

| Alias | Value |
|-------|-------|
| JAN | 1 |
| FEB | 2 |
| MAR | 3 |
| APR | 4 |
| MAY | 5 |
| JUN | 6 |
| JUL | 7 |
| AUG | 8 |
| SEP | 9 |
| OCT | 10 |
| NOV | 11 |
| DEC | 12 |

### DOW_ALIASES

@provenance POSIX.1-2017 crontab(5)

| Alias | Value |
|-------|-------|
| SUN | 0 |
| MON | 1 |
| TUE | 2 |
| WED | 3 |
| THU | 4 |
| FRI | 5 |
| SAT | 6 |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `lastDayOfMonth` | `(year: number, month: number) → number` | Last day of the given month (handles leap years) |
| `dayOfWeekForDate` | `(year: number, month: number, day: number) → number` | Day of week (0=Sun) for a UTC date |

## Test Vectors

@provenance mathematical-definition (Gregorian calendar)

| Call | Expected |
|------|----------|
| `lastDayOfMonth(2024, 1)` | `31` |
| `lastDayOfMonth(2024, 2)` | `29` (leap year) |
| `lastDayOfMonth(2023, 2)` | `28` (non-leap year) |
| `lastDayOfMonth(1900, 2)` | `28` (century non-leap) |
| `lastDayOfMonth(2000, 2)` | `29` (400-year leap) |
| `lastDayOfMonth(2024, 4)` | `30` |
| `dayOfWeekForDate(2024, 1, 1)` | `1` (Monday) |
| `dayOfWeekForDate(2024, 1, 7)` | `0` (Sunday) |
| `dayOfWeekForDate(2024, 2, 29)` | `4` (Thursday, leap year) |
