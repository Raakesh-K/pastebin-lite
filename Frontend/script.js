async function createPaste() {
  const code = document.getElementById("content").value;
  const ttl = document.getElementById("ttl").value;
  const views = document.getElementById("views").value;

  const BASE_URL = window.location.origin;

  const res = await fetch(`${BASE_URL}/api/pastes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      ttl: ttl ? parseInt(ttl) : null,
      max_views: views ? parseInt(views) : null
    })
  });

  const data = await res.json();
  const result = document.getElementById("result");

  if (data.url) {
    result.innerHTML = `<a href="${data.url}" target="_blank" style="color:#00ffc8;font-weight:bold;">${data.url}</a>`;
  } else {
    result.innerText = data.error || "Failed to create paste";
  }
}
