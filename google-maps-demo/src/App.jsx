// App.jsx
import React, { useEffect, useState } from 'react';

function App() {
  const [map, setMap] = useState(null);
  const [locations, setLocations] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBzYH3TIWNaRH19B0sABxiFQA-H7XrOoZI&callback=initMap`;
    script.async = true;
    window.initMap = function () {
      const mapInstance = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 25.033, lng: 121.565 }, // 台北101
        zoom: 12,
      });
      setMap(mapInstance);
    };
    document.body.appendChild(script);
  }, []);

  const addLocation = () => {
    if (input.trim() === '') return;
    setLocations([...locations, input.trim()]);
    setInput('');
  };

  const removeLocation = (index) => {
    const newLocations = [...locations];
    newLocations.splice(index, 1);
    setLocations(newLocations);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>我的旅遊行程</h1>

      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="輸入景點名稱"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={addLocation} style={{ marginLeft: '5px' }}>
          新增
        </button>
      </div>

      <ul>
        {locations.map((loc, index) => (
          <li key={index}>
            {loc}{' '}
            <button onClick={() => removeLocation(index)} style={{ marginLeft: '5px' }}>
              刪除
            </button>
          </li>
        ))}
      </ul>

      <div id="map" style={{ width: '100%', height: '500px', marginTop: '20px' }}></div>
    </div>
  );
}

export default App;
