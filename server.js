const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(express.static('public'));

const axiosInstance = axios.create({
  headers: {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9,vi;q=0.8",
    "sec-ch-ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    Referer: "https://dd42189ft3pck.cloudfront.net/",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

let listColect = [];
let listDuck = [];

Array.prototype.random = function () {
  return this[Math.floor(Math.random() * this.length)];
};

async function fetchAPI(endpoint, accessToken, options = {}) {
  const defaultHeaders = {
    authorization: `Bearer ${accessToken}`,
    priority: "u=1, i"
  };

  options.headers = { ...defaultHeaders, ...options.headers };

  try {
    const response = await axiosInstance(endpoint, options);
    return response.data;
  } catch (error) {
    console.error("API call error:", error);
    throw error;
  }
}

async function getTotalEgg(accessToken) {
  try {
    const res = await fetchAPI("https://api.quackquack.games/balance/get", accessToken);
    let totalEggs = 0;
    res.data.data.forEach((item) => {
      if (item.symbol === "EGG") {
        totalEggs = Number(item.balance);
      }
    });
    return totalEggs;
  } catch (error) {
    console.error("Error getting total eggs:", error);
    return 0;
  }
}

async function getListReload(accessToken) {
  try {
    const res = await fetchAPI("https://api.quackquack.games/nest/list-reload", accessToken);
    if (listDuck.length === 0) {
      listDuck = res.data.duck.map((item) => item.id);
    }
    listColect = res.data.nest.filter((item) => item.type_egg).map((item) => item.id);
    return listColect.length;
  } catch (error) {
    console.error("Error reloading list:", error);
    return 0;
  }
}

async function collect(accessToken) {
  if (listColect.length === 0) return setTimeout(collect, 3000, accessToken);
  const egg = listColect[0];
  try {
    await fetchAPI("https://api.quackquack.games/nest/collect", accessToken, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({ nest_id: egg }).toString(),
    });
    console.log("Thu thap thanh cong trung", egg);
    await layEgg(egg, accessToken);
  } catch (error) {
    console.error("Error collecting egg:", error);
    setTimeout(collect, 3000, accessToken);
  }
}

async function layEgg(egg, accessToken) {
  const duck = listDuck.random();
  try {
    await fetchAPI("https://api.quackquack.games/nest/lay-egg", accessToken, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({ nest_id: egg, duck_id: duck }).toString(),
    });
    listColect.shift();
    setTimeout(collect, 3000, accessToken);
  } catch (error) {
    console.error("Error laying egg:", error);
    setTimeout(layEgg, 3000, egg, accessToken);
  }
}

async function updateData(accessToken) {
  try {
    const [totalEggs, collectableEggs] = await Promise.all([
      getTotalEgg(accessToken),
      getListReload(accessToken)
    ]);

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ totalEggs, collectableEggs, listColect }));
      }
    });

    collect(accessToken);
    setTimeout(() => updateData(accessToken), 10000);
  } catch (error) {
    console.error("Error updating data:", error);
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', (message) => {
    const { accessToken } = JSON.parse(message);
    updateData(accessToken);
  });
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
