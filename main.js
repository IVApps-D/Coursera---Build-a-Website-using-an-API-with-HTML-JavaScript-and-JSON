console.log("JS is working");

document.addEventListener("DOMContentLoaded", () => {
  const citySelect = document.getElementById("citySelect");
  const forecastContainer = document.getElementById("forecast");

  if (!citySelect || !forecastContainer) {
    console.error("Required HTML elements not found.");
    return;
  }

  /* ===========================================================
     WEATHER ICON MAP
     =========================================================== */
  const iconMap = {
    clear: "clear.png",
    pcloudy: "pcloudy.png",
    mcloudy: "mcloudy.png",
    cloudy: "cloudy.png",
    humid: "humid.png",
    fog: "fog.png",
    ishower: "ishower.png",
    oshower: "oshower.png",
    lightrain: "lightrain.png",
    rain: "rain.png",
    lightsnow: "lightsnow.png",
    snow: "snow.png",
    rainsnow: "rainsnow.png",
    tsrain: "tsrain.png",
    tstorm: "tstorm.png",
    windy: "windy.png"
  };

  /* ===========================================================
     FORMAT WEATHER STRING (lightrain → Light Rain)
     =========================================================== */
  function formatWeatherName(code) {
    code = code.replace("day", "").replace("night", "");

    const map = {
      lightrain: "Light Rain",
      lightsnow: "Light Snow",
      ishower: "Isolated Shower",
      oshower: "Occasional Shower",
      rainsnow: "Rain & Snow",
      tsrain: "Thunderstorm Rain",
      tstorm: "Thunderstorm",
      pcloudy: "Partly Cloudy",
      mcloudy: "Medium Cloudy",
      cloudy: "Cloudy",
      fog: "Fog",
      humid: "Humid",
      rain: "Rain",
      snow: "Snow",
      clear: "Clear",
      windy: "Windy"
    };

    return map[code] || code.toUpperCase();
  }

  /* ===========================================================
     LOAD CITY LIST
     =========================================================== */
  fetch("city_coordinates.csv")
    .then(response => {
      if (!response.ok) throw new Error("Failed to load city list.");
      return response.text();
    })
    .then(text => {
      const lines = text.trim().split("\n").slice(1);
      lines.forEach(line => {
        const parts = line.split(",");
        if (parts.length < 4) return;

        const [lat, lon, city, country] = parts.map(v => v.trim());
        const opt = document.createElement("option");
        opt.value = `${lat},${lon}`;
        opt.textContent = `${city}, ${country}`;
        citySelect.appendChild(opt);
      });
    })
    .catch(err => {
      console.error(err);
      forecastContainer.innerHTML = "Failed to load cities.";
    });

  /* ===========================================================
     FUNCTION: LOAD FORECAST FOR SELECTED CITY
     =========================================================== */
  function loadForecast() {
    const value = citySelect.value;

    if (!value) {
      forecastContainer.innerHTML = "";
      return;
    }

    forecastContainer.innerHTML = "<p>Loading forecast...</p>";

    const [lat, lon] = value.split(",");
    const url = `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`;

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error("Weather API error");
        return r.json();
      })
      .then(data => {
        const init = data.init;
        const initDate = new Date(
          parseInt(init.substr(0, 4)),
          parseInt(init.substr(4, 2)) - 1,
          parseInt(init.substr(6, 2)),
          parseInt(init.substr(8, 2))
        );

        /* --- Group daily data --- */
        const dailyMap = {};

        data.dataseries.forEach(item => {
          const date = new Date(initDate.getTime() + item.timepoint * 3600 * 1000);
          const key = date.toISOString().split("T")[0];

          if (!dailyMap[key]) {
            dailyMap[key] = item;
            dailyMap[key].dateObj = date;
          }
        });

        const dailyList = Object.values(dailyMap).slice(0, 7);

        if (dailyList.length === 0) {
          forecastContainer.innerHTML = "No forecast available.";
          return;
        }

        forecastContainer.innerHTML = "";

        /* --- Build cards --- */
        dailyList.forEach(day => {
          const date = day.dateObj;
          const weekday = date.toLocaleString("en-US", { weekday: "short" });
          const month = date.toLocaleString("en-US", { month: "short" });
          const dayNum = date.getDate();
          const key = date.toISOString().split("T")[0];

          const dayBlocks = data.dataseries.filter(d => {
            const dDate = new Date(initDate.getTime() + d.timepoint * 3600 * 1000);
            return dDate.toISOString().startsWith(key);
          });

          const temps = dayBlocks.map(d => d.temp2m);
          const highTemp = Math.max(...temps);
          const lowTemp = Math.min(...temps);

          const rawWeather = day.weather;
          const weatherName = formatWeatherName(rawWeather);

          const iconFile =
            iconMap[rawWeather] ||
            iconMap[rawWeather.replace("day", "").replace("night", "")] ||
            "clear.png";

          const card = `
            <div class="forecast-card">
              <div class="card-top">
                <h3>${weekday} ${month} ${dayNum}</h3>
                <img class="weather-icon" src="images/${iconFile}" />
              </div>
              <div class="card-bottom">
                <p class="weather-label">${weatherName.toUpperCase()}</p>
                <p>H: ${highTemp}°C</p>
                <p>L: ${lowTemp}°C</p>
              </div>
            </div>
          `;

          forecastContainer.innerHTML += card;
        });
      })
      .catch(err => {
        console.error(err);
        forecastContainer.innerHTML = "Failed to load forecast.";
      });
  }

  /* ===========================================================
     AUTO-LOAD FORECAST WHEN DROPDOWN CHANGES
     =========================================================== */
  citySelect.addEventListener("change", loadForecast);
});
