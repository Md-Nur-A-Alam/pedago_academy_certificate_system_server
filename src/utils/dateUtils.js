/**
 * Date validation utilities for competition rules:
 * 1. Start date: before this date, user cannot register for the competition.
 * 2. End date: after this date, user cannot register for the competition.
 * 3. Result publish date: before this date, user cannot download or preview certificates.
 */

const parseLocalDate = (dateStr, endOfDay = false) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Match YYYY-MM-DD
  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return endOfDay
      ? new Date(year, month, day, 23, 59, 59, 999)
      : new Date(year, month, day, 0, 0, 0, 0);
  }

  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
};

const validateRegistrationDates = (competition) => {
  if (!competition) return { allowed: true };
  const now = new Date();

  // 1. Start Date Check: before startDate, registration is not allowed
  if (competition.startDate) {
    const start = parseLocalDate(competition.startDate, false);
    if (start && now < start) {
      return {
        allowed: false,
        code: 'REGISTRATION_NOT_STARTED',
        message: `এই প্রতিযোগিতার নিবন্ধন এখনও শুরু হয়নি। নিবন্ধনের শুরুর তারিখ: ${competition.startDate}`,
        startDate: competition.startDate,
      };
    }
  }

  // 2. End Date Check: after endDate, registration is not allowed
  if (competition.endDate) {
    const end = parseLocalDate(competition.endDate, true);
    if (end && now > end) {
      return {
        allowed: false,
        code: 'REGISTRATION_ENDED',
        message: `এই প্রতিযোগিতার নিবন্ধনের সময়সীমা শেষ হয়েছে। নিবন্ধনের শেষ তারিখ ছিল: ${competition.endDate}`,
        endDate: competition.endDate,
      };
    }
  }

  return { allowed: true };
};

const validateCertificateDownloadDate = (competition) => {
  if (!competition || !competition.resultPublishDate) return { allowed: true };
  const now = new Date();

  // 3. Result Publish Date Check: before resultPublishDate, preview and download are not allowed
  const resDate = parseLocalDate(competition.resultPublishDate, false);
  if (resDate && now < resDate) {
    return {
      allowed: false,
      code: 'RESULT_NOT_PUBLISHED',
      message: `ফলাফল প্রকাশের তারিখের পূর্বে সার্টিফিকেট দেখা (Preview) বা ডাউনলোড করা যাবে না। ফলাফল প্রকাশের নির্ধারিত তারিখ: ${competition.resultPublishDate}`,
      resultPublishDate: competition.resultPublishDate,
    };
  }

  return { allowed: true };
};

module.exports = {
  parseLocalDate,
  validateRegistrationDates,
  validateCertificateDownloadDate,
};
