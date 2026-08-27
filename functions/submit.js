export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS 헤더 (같은 도메인이면 없어도 되지만 안전하게 포함)
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const data = await request.json();

    const name = (data.name || "").toString().slice(0, 50);
    const phone = (data.phone || "").toString().slice(0, 30);
    const utm_source = (data.utm_source || "").toString().slice(0, 100);
    const utm_medium = (data.utm_medium || "").toString().slice(0, 100);
    const utm_campaign = (data.utm_campaign || "").toString().slice(0, 100);
    const page_url = (data.page_url || "").toString().slice(0, 300);

    // 최소 유효성 검사
    if (!name || !phone) {
      return new Response(JSON.stringify({ ok: false, error: "name/phone required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // 한국 시간(KST) 기록
    const createdAt = new Date(Date.now() + 9 * 3600 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    // 1) D1에 저장
    await env.DB.prepare(
      `INSERT INTO leads (created_at, name, phone, utm_source, utm_medium, utm_campaign, page_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(createdAt, name, phone, utm_source, utm_medium, utm_campaign, page_url)
      .run();

    // 2) 텔레그램 알림
    const msg =
      `🔔 더샵 송도그란테르 신규 문의\n\n` +
      `👤 이름: ${name}\n` +
      `📞 연락처: ${phone}\n` +
      `🌐 유입: ${utm_source || "-"} / ${utm_medium || "-"} / ${utm_campaign || "-"}\n` +
      `🕒 ${createdAt} (KST)`;

    await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: msg }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
}

// 브라우저 프리플라이트(OPTIONS) 대응
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
