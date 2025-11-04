let map;
let currentPlan = "";


function initMap() {
  const location = { lat: 25.0330, lng: 121.5654 }; // 台北101
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 15,
    center: location,
  });
  
  const marker = new google.maps.Marker({
    position: location,
    map: map,
  });
}


document.getElementById("search-btn").addEventListener("click", async () => {
  const city = document.getElementById("destination").value;
  if (!city) {
    alert("請輸入旅遊地點！");
    return;
  }

  await showMap(city);
  const weatherText = await getWeather(city);
  await getAISuggestion(city, weatherText);
});

async function showMap(city) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: city }, (results, status) => {
    if (status === "OK") {
      map.setCenter(results[0].geometry.location);
      new google.maps.Marker({
        map: map,
        position: results[0].geometry.location
      });
    } else {
      alert("找不到該地點：" + status);
    }
  });
}

async function getWeather(city) {
  const apiKey = "AIzaSyBzYH3TIWNaRH19B0sABxiFQA-H7XrOoZI";
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=zh_tw`;

  const res = await fetch(url);
  const data = await res.json();

  const weatherText = `${data.weather[0].description}，氣溫 ${data.main.temp}°C`;
  document.getElementById("weather").innerHTML = `
    <h3>🌤 天氣資訊</h3>
    <p>${weatherText}</p>
  `;
  return data.weather[0].description;
}

async function getAISuggestion(city, weather) {
  const prompt = `請幫我規劃${city}一日遊，天氣是${weather}。請列出建議景點與餐廳，用條列式。`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText?key=YOUR_GEMINI_API_KEY",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const result = await response.json();
  const aiText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "無法取得建議";
  currentPlan = `【${city}行程建議】\n${aiText}`;
  document.getElementById("ai-suggestion").innerHTML = `
    <h3>🤖 AI 行程建議</h3>
    <pre>${aiText}</pre>
  `;
}

/* ⭐ 收藏行程 */
document.getElementById("save-btn").addEventListener("click", () => {
  if (!currentPlan) return alert("請先取得 AI 行程建議！");
  let saved = JSON.parse(localStorage.getItem("plans") || "[]");
  saved.push(currentPlan);
  localStorage.setItem("plans", JSON.stringify(saved));
  alert("已收藏行程！");
});

/* ⬇️ 匯出文字檔 */
document.getElementById("download-btn").addEventListener("click", () => {
  if (!currentPlan) return alert("請先取得 AI 行程建議！");
  const blob = new Blob([currentPlan], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "行程建議.txt";
  a.click();
  URL.revokeObjectURL(url);
});

/* 📱 生成 QR Code */
document.getElementById("qrcode-btn").addEventListener("click", () => {
  if (!currentPlan) return alert("請先取得 AI 行程建議！");
  const container = document.getElementById("qrcode-container");
  container.innerHTML = "<h3>📱 行程 QR Code</h3>";
  new QRCode(container, {
    text: currentPlan,
    width: 200,
    height: 200
  });
});
