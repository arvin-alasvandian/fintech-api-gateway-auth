// smoke.mjs - end-to-end smoke test for the API (Node 18+)
// Run: node smoke.mjs
const base = process.env.BASE_URL || "http://localhost:8080";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = Math.random().toString(36).slice(2);
const email = `dev+${Date.now()}_${rnd}@example.com`;
const password = "secret";

function expect(cond, msg) {
  if (!cond) {
    console.error("❌ FAIL:", msg);
    process.exit(1);
  }
}

async function req(method, path, body, headers = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { res, data, text };
}

(async () => {
  console.log(`��� Base URL: ${base}`);
  console.log("—".repeat(60));

  // 1) /healthz
  {
    const { res, data } = await req("GET", "/healthz");
    expect(res.status === 200, `/healthz -> ${res.status}`);
    expect(data && data.ok === true, "healthz payload should be { ok: true }");
    console.log("✅ /healthz OK");
  }

  // 2) /readyz
  {
    const { res, data } = await req("GET", "/readyz");
    expect(res.status === 200, `/readyz -> ${res.status}`);
    expect(data && data.ready === true, "readyz payload should be { ready: true }");
    console.log("✅ /readyz OK");
  }

  // 3) Swagger JSON
  {
    const { res, data } = await req("GET", "/docs/json");
    expect(res.status === 200, `/docs/json -> ${res.status}`);
    expect(data && (data.openapi || data.swagger), "docs/json should be OpenAPI");
    console.log("✅ /docs/json OK");
  }

  // 4) 404 should be Problem+JSON
  {
    const { res, data } = await req("GET", "/does-not-exist");
    expect(res.status === 404, `404 status expected, got ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    expect(ct.includes("application/problem+json"), `404 content-type should be application/problem+json, got ${ct}`);
    expect(data && data.status === 404 && data.title, "404 body should be problem+json with status/title");
    console.log("✅ 404 Problem+JSON OK");
  }

  // 5) Register user (defaults to customer)
  let user;
  {
    const { res, data, text } = await req("POST", "/v1/auth/register", { email, password });
    expect(res.status === 200, `register -> ${res.status} ${text}`);
    expect(data && data.id && data.email === email, "register body should include id & same email");
    user = data;
    console.log(`✅ register OK (${email})`);
  }

  // 6) Login → tokens
  let accessToken, refreshToken;
  {
    const { res, data, text } = await req("POST", "/v1/auth/login", { email, password });
    expect(res.status === 200, `login -> ${res.status} ${text}`);
    expect(data && data.accessToken && data.refreshToken, "login should return accessToken & refreshToken");
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    console.log("✅ login OK (received tokens)");
  }

  // 7) /v1/me with Bearer
  {
    const { res, data, text } = await req("GET", "/v1/me", null, { authorization: `Bearer ${accessToken}` });
    expect(res.status === 200, `/v1/me -> ${res.status} ${text}`);
    expect(data && data.email === email, "/v1/me should return our user");
    console.log("✅ /v1/me OK");
  }

  // 8) Refresh
  {
    const { res, data, text } = await req("POST", "/v1/auth/refresh", { refreshToken });
    expect(res.status === 200, `refresh -> ${res.status} ${text}`);
    expect(data && data.accessToken, "refresh should return new accessToken");
    accessToken = data.accessToken;
    console.log("✅ refresh OK (new access token)");
  }

  // 9) Logout
  {
    const { res, data, text } = await req("POST", "/v1/auth/logout", { refreshToken });
    expect(res.status === 200, `logout -> ${res.status} ${text}`);
    expect(data && data.ok === true, "logout should return { ok: true }");
    console.log("✅ logout OK");
  }

  // 10) Rate-limit on login (6 bad attempts -> expect at least one 429)
  {
    let got429 = false;
    for (let i = 0; i < 6; i++) {
      const { res } = await req("POST", "/v1/auth/login", { email, password: "WRONG" });
      if (res.status === 429) got429 = true;
      await sleep(150);
    }
    expect(got429, "rate-limit: expected at least one 429 after repeated bad logins");
    console.log("✅ login rate-limit OK (429 observed)");
  }

  console.log("—".repeat(60));
  console.log("��� ALL SMOKE TESTS PASSED");
  process.exit(0);
})().catch((err) => {
  console.error("❌ Uncaught error in smoke test:", err);
  process.exit(1);
});
