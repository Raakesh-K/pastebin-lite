async function createPaste() {
  const content = document.getElementById("content").value;
  const ttl = document.getElementById("ttl").value;
  const views = document.getElementById("views").value;

  const res = await fetch("http://localhost:3000/api/pastes", {
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
  result.innerHTML = `
    <a href="${data.url}" target="_blank" style="color:#00ffc8; font-weight:bold;">
    ${data.url}
    </a>
  `;
} else {
  result.innerText = data.error;
}

}
