// ─── Rigzer Admin — Date Range Helper ────────────────────────────────────────
// src/utils/dateRange.js
//
// Converts ?range= or ?from=&to= query params into a MongoDB $match date filter.
// Usage: const { dateFilter, label } = parseDateRange(req.query);

/**
 * @typedef {{ $gte?: Date; $lte?: Date }} DateFilter
 * @typedef {{ createdAt?: DateFilter }} MatchFilter
 */

/**
 * Parse a range string into start/end Date objects.
 * @param {string|undefined} range
 * @param {string|undefined} from   ISO date string
 * @param {string|undefined} to     ISO date string
 * @returns {{ start: Date|null, end: Date|null, label: string }}
 */
export function parseDateRangeBounds(range, from, to) {
  const now = new Date();

  // Custom explicit range
  if (from || to) {
    return {
      start: from ? new Date(from) : null,
      end:   to   ? (() => { const d = new Date(to); d.setHours(23,59,59,999); return d; })() : null,
      label: `${from ?? "∞"} → ${to ?? "now"}`,
    };
  }

  switch (range) {
    case "today": {
      const s = new Date(now); s.setHours(0,0,0,0);
      const e = new Date(now); e.setHours(23,59,59,999);
      return { start: s, end: e, label: "Today" };
    }
    case "yesterday": {
      const s = new Date(now); s.setDate(s.getDate() - 1); s.setHours(0,0,0,0);
      const e = new Date(s); e.setHours(23,59,59,999);
      return { start: s, end: e, label: "Yesterday" };
    }
    case "7d": {
      const s = new Date(now - 7 * 86_400_000); s.setHours(0,0,0,0);
      return { start: s, end: null, label: "Last 7 Days" };
    }
    case "30d": {
      const s = new Date(now - 30 * 86_400_000); s.setHours(0,0,0,0);
      return { start: s, end: null, label: "Last 30 Days" };
    }
    case "thisMonth": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s, end: null, label: "This Month" };
    }
    case "lastMonth": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0); e.setHours(23,59,59,999);
      return { start: s, end: e, label: "Last Month" };
    }
    case "3m": {
      const s = new Date(now); s.setMonth(s.getMonth() - 3); s.setHours(0,0,0,0);
      return { start: s, end: null, label: "Last 3 Months" };
    }
    case "6m": {
      const s = new Date(now); s.setMonth(s.getMonth() - 6); s.setHours(0,0,0,0);
      return { start: s, end: null, label: "Last 6 Months" };
    }
    case "thisYear": {
      const s = new Date(now.getFullYear(), 0, 1);
      return { start: s, end: null, label: "This Year" };
    }
    case "all":
    default:
      return { start: null, end: null, label: "All Time" };
  }
}

/**
 * Returns a MongoDB $match fragment for createdAt based on query params.
 * Attach to any aggregation or .find() call.
 *
 * @param {object} query  Express req.query or equivalent
 * @returns {{ dateMatch: MatchFilter, label: string, start: Date|null, end: Date|null }}
 */
export function parseDateRange(query = {}) {
  const { range, from, to } = query;
  const { start, end, label } = parseDateRangeBounds(range, from, to);

  /** @type {MatchFilter} */
  const dateMatch = {};

  if (start || end) {
    dateMatch.createdAt = {
      ...(start ? { $gte: start } : {}),
      ...(end   ? { $lte: end   } : {}),
    };
  }

  return { dateMatch, label, start, end };
}

/**
 * Returns the previous period of the same length (for trend comparison).
 * @param {Date|null} start
 * @param {Date|null} end
 * @returns {{ prevStart: Date|null, prevEnd: Date|null }}
 */
export function getPreviousPeriod(start, end) {
  if (!start) return { prevStart: null, prevEnd: null };
  const periodEnd  = end ?? new Date();
  const lengthMs   = periodEnd.getTime() - start.getTime();
  return {
    prevStart: new Date(start.getTime()    - lengthMs),
    prevEnd:   new Date(periodEnd.getTime() - lengthMs),
  };
}