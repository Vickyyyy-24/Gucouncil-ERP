const axios = require("axios");
const {
  captureWithMantraSDK,
  matchFingerprintWithEnrolled
} = require("./mantra-sdk-integration");

async function captureAndMatchAttendance(logger) {
  // 1) capture scan
  const scan = await captureWithMantraSDK(logger);

  // 2) fetch enrolled from backend
  const enrolledRes = await axios.get("http://localhost:5005/api/biometrics/all", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } // if required
  });

  const enrolledUsers = enrolledRes.data || [];

  // 3) match
  const match = matchFingerprintWithEnrolled(logger, scan.template, enrolledUsers);

  if (!match.matched) {
    return { success: false, error: "Fingerprint not recognized" };
  }

  return {
    success: true,
    councilId: match.councilId,
    userId: match.userId,
    name: match.name,
    committee: match.committee,
    score: match.score,
    template: scan.template, // optional
  };
}
