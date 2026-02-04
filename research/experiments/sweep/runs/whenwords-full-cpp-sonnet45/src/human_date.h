#ifndef HUMAN_DATE_H
#define HUMAN_DATE_H

#include <string>
#include <cstdint>

/**
 * Returns a contextual date string based on proximity to a reference date.
 *
 * @param timestamp Unix epoch seconds (the date to describe)
 * @param reference Unix epoch seconds (the "now" reference point)
 * @return A contextual date label string
 */
std::string humanDate(int64_t timestamp, int64_t reference);

#endif // HUMAN_DATE_H
