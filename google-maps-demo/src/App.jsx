import React from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';

const App = () => (
  <APIProvider apiKey={'你的API金鑰'} onLoad={() => console.log('Maps API 已載入')}>
    <Map
      defaultZoom={13}
      defaultCenter={{ lat: -33.860664, lng: 151.208138 }}
    />
  </APIProvider>
);

export default App;
