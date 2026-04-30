import http from "k6/http";
import { check, sleep } from "k6";

// Use environment variables instead of hardcoding secrets 
const BASE_URL = __ENV.BASE_URL || "https://campushostels.duckdns.org";
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;
const isCI = __ENV.CI === "true";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 20 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
     // Stricter for local, looser for CI
    http_req_duration: isCI ? ['p(95)<2000'] : ['p(95)<500'],
    http_req_failed: ["rate<0.01"],
  },
};

export function setup() {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "❌ EMAIL and PASSWORD must be provided via environment variables",
    );
  }

  const loginUrl = `${BASE_URL}/api/Accounts/login`;

  const payload = JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  });

  const res = http.post(loginUrl, payload, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const success = check(res, {
    "login status is 200": (r) => r.status === 200,
  });

  if (!success) {
    throw new Error(`❌ Login failed (status: ${res.status})`);
  }

  let token = null;
  let tenantId = null;

  try {
    const body = JSON.parse(res.body);

    token = body.token || body.data?.token;

    tenantId = body.tenantId || body.data?.tenantId;
  } catch (err) {
    throw new Error(`❌ Failed to parse login response: ${err.message}`);
  }

  if (!token) {
    throw new Error("❌ No token returned from login");
  }

  return { token, tenantId };
}

export default function (data) {
  const params = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };

  const url = data.tenantId
    ? `${BASE_URL}/api/Accounts/liked-hostels?tenantId=${data.tenantId}`
    : `${BASE_URL}/api/Accounts/liked-hostels`;

  const res = http.get(url, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}

// $env:EMAIL="eobkwaku@gmail.com"; $env:PASSWORD="Edward1!"; k6 run protectedApi.js
