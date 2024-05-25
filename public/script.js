const ws = new WebSocket(`ws://${window.location.host}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  document.getElementById("total-eggs").textContent = data.totalEggs;
  document.getElementById("collectable-eggs").textContent = data.collectableEggs;
  updateEggList(data.listColect);
};

function updateEggList(listColect) {
  const eggListElement = document.getElementById("egg-list");
  eggListElement.innerHTML = "";
  listColect.forEach(egg => {
    const li = document.createElement("li");
    li.textContent = `Egg ID: ${egg}`;
    li.classList.add("list-group-item");
    eggListElement.appendChild(li);
  });
}

document.getElementById("save-token-button").addEventListener("click", () => {
  const token = document.getElementById("access-token-input").value;
  localStorage.setItem("accessToken", token); // Lưu token vào localStorage
  ws.send(JSON.stringify({ accessToken: token })); // Gửi token qua WebSocket
  alert("Token saved and sent!");
});

// Load saved token from localStorage if available
window.addEventListener("load", () => {
  const savedToken = localStorage.getItem("accessToken");
  if (savedToken) {
    document.getElementById("access-token-input").value = savedToken;
    ws.send(JSON.stringify({ accessToken: savedToken })); // Gửi token ngay khi trang được tải
  }
});
