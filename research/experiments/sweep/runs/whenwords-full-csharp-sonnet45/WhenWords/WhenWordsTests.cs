using System;
using Xunit;

namespace WhenWords
{
    public class TimeAgoTests
    {
        private const long Reference = 1704067200L; // 2024-01-01 00:00:00 UTC

        [Fact] public void TestPast_JustNow_Same() => Assert.Equal("just now", WhenWords.TimeAgo(1704067200, Reference));
        [Fact] public void TestPast_JustNow_30s() => Assert.Equal("just now", WhenWords.TimeAgo(1704067170, Reference));
        [Fact] public void TestPast_JustNow_44s() => Assert.Equal("just now", WhenWords.TimeAgo(1704067156, Reference));
        [Fact] public void TestPast_1Minute_45s() => Assert.Equal("1 minute ago", WhenWords.TimeAgo(1704067155, Reference));
        [Fact] public void TestPast_1Minute_89s() => Assert.Equal("1 minute ago", WhenWords.TimeAgo(1704067111, Reference));
        [Fact] public void TestPast_2Minutes() => Assert.Equal("2 minutes ago", WhenWords.TimeAgo(1704067110, Reference));
        [Fact] public void TestPast_30Minutes() => Assert.Equal("30 minutes ago", WhenWords.TimeAgo(1704065400, Reference));
        [Fact] public void TestPast_44Minutes() => Assert.Equal("44 minutes ago", WhenWords.TimeAgo(1704064560, Reference));
        [Fact] public void TestPast_1Hour_45min() => Assert.Equal("1 hour ago", WhenWords.TimeAgo(1704064500, Reference));
        [Fact] public void TestPast_1Hour_89min() => Assert.Equal("1 hour ago", WhenWords.TimeAgo(1704061860, Reference));
        [Fact] public void TestPast_2Hours() => Assert.Equal("2 hours ago", WhenWords.TimeAgo(1704061800, Reference));
        [Fact] public void TestPast_5Hours() => Assert.Equal("5 hours ago", WhenWords.TimeAgo(1704049200, Reference));
        [Fact] public void TestPast_21Hours() => Assert.Equal("21 hours ago", WhenWords.TimeAgo(1703991600, Reference));
        [Fact] public void TestPast_1Day_22hr() => Assert.Equal("1 day ago", WhenWords.TimeAgo(1703988000, Reference));
        [Fact] public void TestPast_1Day_35hr() => Assert.Equal("1 day ago", WhenWords.TimeAgo(1703941200, Reference));
        [Fact] public void TestPast_2Days() => Assert.Equal("2 days ago", WhenWords.TimeAgo(1703937600, Reference));
        [Fact] public void TestPast_7Days() => Assert.Equal("7 days ago", WhenWords.TimeAgo(1703462400, Reference));
        [Fact] public void TestPast_25Days() => Assert.Equal("25 days ago", WhenWords.TimeAgo(1701907200, Reference));
        [Fact] public void TestPast_1Month_26d() => Assert.Equal("1 month ago", WhenWords.TimeAgo(1701820800, Reference));
        [Fact] public void TestPast_1Month_45d() => Assert.Equal("1 month ago", WhenWords.TimeAgo(1700179200, Reference));
        [Fact] public void TestPast_2Months() => Assert.Equal("2 months ago", WhenWords.TimeAgo(1700092800, Reference));
        [Fact] public void TestPast_6Months() => Assert.Equal("6 months ago", WhenWords.TimeAgo(1688169600, Reference));
        [Fact] public void TestPast_11Months() => Assert.Equal("11 months ago", WhenWords.TimeAgo(1676505600, Reference));
        [Fact] public void TestPast_1Year_320d() => Assert.Equal("1 year ago", WhenWords.TimeAgo(1676419200, Reference));
        [Fact] public void TestPast_1Year_547d() => Assert.Equal("1 year ago", WhenWords.TimeAgo(1656806400, Reference));
        [Fact] public void TestPast_2Years() => Assert.Equal("2 years ago", WhenWords.TimeAgo(1656720000, Reference));
        [Fact] public void TestPast_5Years() => Assert.Equal("5 years ago", WhenWords.TimeAgo(1546300800, Reference));

        [Fact] public void TestFuture_JustNow() => Assert.Equal("just now", WhenWords.TimeAgo(1704067230, Reference));
        [Fact] public void TestFuture_1Minute() => Assert.Equal("in 1 minute", WhenWords.TimeAgo(1704067260, Reference));
        [Fact] public void TestFuture_5Minutes() => Assert.Equal("in 5 minutes", WhenWords.TimeAgo(1704067500, Reference));
        [Fact] public void TestFuture_1Hour() => Assert.Equal("in 1 hour", WhenWords.TimeAgo(1704070200, Reference));
        [Fact] public void TestFuture_3Hours() => Assert.Equal("in 3 hours", WhenWords.TimeAgo(1704078000, Reference));
        [Fact] public void TestFuture_1Day() => Assert.Equal("in 1 day", WhenWords.TimeAgo(1704150000, Reference));
        [Fact] public void TestFuture_2Days() => Assert.Equal("in 2 days", WhenWords.TimeAgo(1704240000, Reference));
        [Fact] public void TestFuture_1Month() => Assert.Equal("in 1 month", WhenWords.TimeAgo(1706745600, Reference));
        [Fact] public void TestFuture_1Year() => Assert.Equal("in 1 year", WhenWords.TimeAgo(1735689600, Reference));
    }

    public class DurationTests
    {
        [Fact] public void TestZero() => Assert.Equal("0 seconds", WhenWords.Duration(0));
        [Fact] public void Test1Second() => Assert.Equal("1 second", WhenWords.Duration(1));
        [Fact] public void Test45Seconds() => Assert.Equal("45 seconds", WhenWords.Duration(45));
        [Fact] public void Test1Minute() => Assert.Equal("1 minute", WhenWords.Duration(60));
        [Fact] public void Test90Seconds() => Assert.Equal("1 minute, 30 seconds", WhenWords.Duration(90));
        [Fact] public void Test2Minutes() => Assert.Equal("2 minutes", WhenWords.Duration(120));
        [Fact] public void Test1Hour() => Assert.Equal("1 hour", WhenWords.Duration(3600));
        [Fact] public void Test1Hour1Minute() => Assert.Equal("1 hour, 1 minute", WhenWords.Duration(3661));
        [Fact] public void Test1Hour30Minutes() => Assert.Equal("1 hour, 30 minutes", WhenWords.Duration(5400));
        [Fact] public void Test2Hours30Minutes() => Assert.Equal("2 hours, 30 minutes", WhenWords.Duration(9000));
        [Fact] public void Test1Day() => Assert.Equal("1 day", WhenWords.Duration(86400));
        [Fact] public void Test1Day2Hours() => Assert.Equal("1 day, 2 hours", WhenWords.Duration(93600));
        [Fact] public void Test7Days() => Assert.Equal("7 days", WhenWords.Duration(604800));
        [Fact] public void Test1Month() => Assert.Equal("1 month", WhenWords.Duration(2592000));
        [Fact] public void Test1Year() => Assert.Equal("1 year", WhenWords.Duration(31536000));
        [Fact] public void Test1Year2Months() => Assert.Equal("1 year, 2 months", WhenWords.Duration(36720000));

        [Fact] public void TestCompact_Zero() => Assert.Equal("0s", WhenWords.Duration(0, new WhenWords.DurationOptions { Compact = true }));
        [Fact] public void TestCompact_45Seconds() => Assert.Equal("45s", WhenWords.Duration(45, new WhenWords.DurationOptions { Compact = true }));
        [Fact] public void TestCompact_1Hour1Minute() => Assert.Equal("1h 1m", WhenWords.Duration(3661, new WhenWords.DurationOptions { Compact = true }));
        [Fact] public void TestCompact_2Hours30Minutes() => Assert.Equal("2h 30m", WhenWords.Duration(9000, new WhenWords.DurationOptions { Compact = true }));
        [Fact] public void TestCompact_1Day2Hours() => Assert.Equal("1d 2h", WhenWords.Duration(93600, new WhenWords.DurationOptions { Compact = true }));

        [Fact] public void TestMaxUnits_1Hour1Minute() => Assert.Equal("1 hour", WhenWords.Duration(3661, new WhenWords.DurationOptions { MaxUnits = 1 }));
        [Fact] public void TestMaxUnits_1Day2Hours() => Assert.Equal("1 day", WhenWords.Duration(93600, new WhenWords.DurationOptions { MaxUnits = 1 }));
        [Fact] public void TestMaxUnits_1Day2Hours1Minute() => Assert.Equal("1 day, 2 hours, 1 minute", WhenWords.Duration(93661, new WhenWords.DurationOptions { MaxUnits = 3 }));

        [Fact] public void TestCompactMaxUnits_Rounding() => Assert.Equal("3h", WhenWords.Duration(9000, new WhenWords.DurationOptions { Compact = true, MaxUnits = 1 }));

        [Fact]
        public void TestNegativeThrows()
        {
            var ex = Assert.Throws<ArgumentException>(() => WhenWords.Duration(-100));
            Assert.Equal("Seconds must not be negative", ex.Message);
        }
    }

    public class ParseDurationTests
    {
        [Fact] public void TestCompact_2h30m() => Assert.Equal(9000, WhenWords.ParseDuration("2h30m"));
        [Fact] public void TestCompact_2h30m_Spaces() => Assert.Equal(9000, WhenWords.ParseDuration("2h 30m"));
        [Fact] public void TestCompact_2h30m_Comma() => Assert.Equal(9000, WhenWords.ParseDuration("2h, 30m"));
        [Fact] public void TestCompact_1_5h() => Assert.Equal(5400, WhenWords.ParseDuration("1.5h"));
        [Fact] public void TestCompact_90m() => Assert.Equal(5400, WhenWords.ParseDuration("90m"));
        [Fact] public void TestCompact_90min() => Assert.Equal(5400, WhenWords.ParseDuration("90min"));
        [Fact] public void TestCompact_45s() => Assert.Equal(45, WhenWords.ParseDuration("45s"));
        [Fact] public void TestCompact_45sec() => Assert.Equal(45, WhenWords.ParseDuration("45sec"));
        [Fact] public void TestCompact_2d() => Assert.Equal(172800, WhenWords.ParseDuration("2d"));
        [Fact] public void TestCompact_1w() => Assert.Equal(604800, WhenWords.ParseDuration("1w"));
        [Fact] public void TestCompact_1d2h30m() => Assert.Equal(95400, WhenWords.ParseDuration("1d 2h 30m"));
        [Fact] public void TestCompact_2hr() => Assert.Equal(7200, WhenWords.ParseDuration("2hr"));
        [Fact] public void TestCompact_2hrs() => Assert.Equal(7200, WhenWords.ParseDuration("2hrs"));
        [Fact] public void TestCompact_30mins() => Assert.Equal(1800, WhenWords.ParseDuration("30mins"));

        [Fact] public void TestVerbose_2hours30minutes() => Assert.Equal(9000, WhenWords.ParseDuration("2 hours 30 minutes"));
        [Fact] public void TestVerbose_2hours_and_30minutes() => Assert.Equal(9000, WhenWords.ParseDuration("2 hours and 30 minutes"));
        [Fact] public void TestVerbose_2hours_comma_and_30minutes() => Assert.Equal(9000, WhenWords.ParseDuration("2 hours, and 30 minutes"));
        [Fact] public void TestVerbose_2_5hours() => Assert.Equal(9000, WhenWords.ParseDuration("2.5 hours"));
        [Fact] public void TestVerbose_90minutes() => Assert.Equal(5400, WhenWords.ParseDuration("90 minutes"));
        [Fact] public void TestVerbose_2days() => Assert.Equal(172800, WhenWords.ParseDuration("2 days"));
        [Fact] public void TestVerbose_1week() => Assert.Equal(604800, WhenWords.ParseDuration("1 week"));
        [Fact] public void TestVerbose_1day_2hours_and_30minutes() => Assert.Equal(95400, WhenWords.ParseDuration("1 day, 2 hours, and 30 minutes"));
        [Fact] public void TestVerbose_45seconds() => Assert.Equal(45, WhenWords.ParseDuration("45 seconds"));

        [Fact] public void TestColon_2_30() => Assert.Equal(9000, WhenWords.ParseDuration("2:30"));
        [Fact] public void TestColon_1_30_00() => Assert.Equal(5400, WhenWords.ParseDuration("1:30:00"));
        [Fact] public void TestColon_0_05_30() => Assert.Equal(330, WhenWords.ParseDuration("0:05:30"));

        [Fact] public void TestCase_2H30M() => Assert.Equal(9000, WhenWords.ParseDuration("2H 30M"));
        [Fact] public void TestWhitespace() => Assert.Equal(9000, WhenWords.ParseDuration("  2 hours   30 minutes  "));

        [Fact] public void TestEmptyThrows() => Assert.Throws<ArgumentException>(() => WhenWords.ParseDuration(""));
        [Fact] public void TestNoUnitsThrows() => Assert.Throws<ArgumentException>(() => WhenWords.ParseDuration("hello world"));
        [Fact] public void TestNegativeThrows() => Assert.Throws<ArgumentException>(() => WhenWords.ParseDuration("-5 hours"));
        [Fact] public void TestBareNumberThrows() => Assert.Throws<ArgumentException>(() => WhenWords.ParseDuration("42"));
        [Fact] public void TestUnknownUnitThrows() => Assert.Throws<ArgumentException>(() => WhenWords.ParseDuration("5 foos"));
    }

    public class HumanDateTests
    {
        private const long Reference = 1705276800L; // 2024-01-15 Monday 00:00 UTC

        [Fact] public void TestToday_Midnight() => Assert.Equal("Today", WhenWords.HumanDate(1705276800, Reference));
        [Fact] public void TestToday_Noon() => Assert.Equal("Today", WhenWords.HumanDate(1705320000, Reference));
        [Fact] public void TestYesterday() => Assert.Equal("Yesterday", WhenWords.HumanDate(1705190400, Reference));
        [Fact] public void TestTomorrow() => Assert.Equal("Tomorrow", WhenWords.HumanDate(1705363200, Reference));
        [Fact] public void TestLastSaturday() => Assert.Equal("Last Saturday", WhenWords.HumanDate(1705104000, Reference));
        [Fact] public void TestLastFriday() => Assert.Equal("Last Friday", WhenWords.HumanDate(1705017600, Reference));
        [Fact] public void TestLastThursday() => Assert.Equal("Last Thursday", WhenWords.HumanDate(1704931200, Reference));
        [Fact] public void TestLastWednesday() => Assert.Equal("Last Wednesday", WhenWords.HumanDate(1704844800, Reference));
        [Fact] public void TestLastTuesday() => Assert.Equal("Last Tuesday", WhenWords.HumanDate(1704758400, Reference));
        [Fact] public void TestJanuary8() => Assert.Equal("January 8", WhenWords.HumanDate(1704672000, Reference));
        [Fact] public void TestThisWednesday() => Assert.Equal("This Wednesday", WhenWords.HumanDate(1705449600, Reference));
        [Fact] public void TestThisThursday() => Assert.Equal("This Thursday", WhenWords.HumanDate(1705536000, Reference));
        [Fact] public void TestThisSunday() => Assert.Equal("This Sunday", WhenWords.HumanDate(1705795200, Reference));
        [Fact] public void TestJanuary22() => Assert.Equal("January 22", WhenWords.HumanDate(1705881600, Reference));
        [Fact] public void TestMarch1() => Assert.Equal("March 1", WhenWords.HumanDate(1709251200, Reference));
        [Fact] public void TestDecember31() => Assert.Equal("December 31", WhenWords.HumanDate(1735603200, Reference));
        [Fact] public void TestJanuary1_2023() => Assert.Equal("January 1, 2023", WhenWords.HumanDate(1672531200, Reference));
        [Fact] public void TestJanuary6_2025() => Assert.Equal("January 6, 2025", WhenWords.HumanDate(1736121600, Reference));
    }

    public class DateRangeTests
    {
        [Fact] public void TestSameDay_Midnight() => Assert.Equal("January 15, 2024", WhenWords.DateRange(1705276800, 1705276800));
        [Fact] public void TestSameDay_DifferentTimes() => Assert.Equal("January 15, 2024", WhenWords.DateRange(1705276800, 1705320000));
        [Fact] public void TestSameMonth_2Days() => Assert.Equal("January 15\u201316, 2024", WhenWords.DateRange(1705276800, 1705363200));
        [Fact] public void TestSameMonth_7Days() => Assert.Equal("January 15\u201322, 2024", WhenWords.DateRange(1705276800, 1705881600));
        [Fact] public void TestSameYear_DifferentMonth() => Assert.Equal("January 15 \u2013 February 15, 2024", WhenWords.DateRange(1705276800, 1707955200));
        [Fact] public void TestDifferentYear_CrossBoundary() => Assert.Equal("December 28, 2023 \u2013 January 15, 2024", WhenWords.DateRange(1703721600, 1705276800));
        [Fact] public void TestSameYear_FullYear() => Assert.Equal("January 1 \u2013 December 31, 2024", WhenWords.DateRange(1704067200, 1735603200));
        [Fact] public void TestSwapped() => Assert.Equal("January 15\u201322, 2024", WhenWords.DateRange(1705881600, 1705276800));
        [Fact] public void TestDifferentYear_2Years() => Assert.Equal("January 1, 2023 \u2013 January 1, 2025", WhenWords.DateRange(1672531200, 1735689600));
    }
}
