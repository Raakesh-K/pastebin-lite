async function createPaste() {
  const content = document.getElementById("content").value;
  const ttl = document.getElementById("ttl").value;
  const views = document.getElementById("views").value;

  const res = await fetch(`/api/pastes`, {   // ✅ no process.env
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      ttl_seconds: ttl ? parseInt(ttl) : undefined,
      max_views: views ? parseInt(views) : undefined
    })
  });

  const data = await res.json();
  const result = document.getElementById("result");

  if (data.url) {
    result.innerHTML = `<a href="${data.url}" target="_blank">${data.url}</a>`;
  } else {
    result.innerText = data.error;
  }
}
