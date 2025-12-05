import React, { useEffect, useRef, useState } from 'react';
import { DayPlan } from '../types';

declare global {
  interface Window {
    google: any;
    gm_authFailure?: () => void;
  }
}

interface MapBoardProps {
  days: DayPlan[];
  activeDayId: string;
}

export const MapBoard: React.FC<MapBoardProps> = ({ days, activeDayId }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeDay = days.find(d => d.id === activeDayId);

  // 1. Load Google Maps Script dynamically
  useEffect(() => {
    // If script is already loaded
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }
    
    // Check if API key is present
    const mapKey = import.meta.env.VITE_GOOGLE_MAP_KEY;
    if ( !mapKey) {
        setLoadError("找不到 API Key。請確認 process.env.API_KEY 已設定。");
        return;
    }

    // Check if script tag already exists
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
       // It might be loading or loaded, assume we wait for onload or existing instances
       if (window.google?.maps) setIsLoaded(true);
       return;
    }

    // Define global error handler for authentication failures (InvalidKeyMapError, etc.)
    window.gm_authFailure = () => {
        setLoadError("Google Maps 驗證失敗。請確認您的 API Key 是否已啟用 Maps JavaScript API 權限。");
        console.error("Google Maps Auth Failure: Invalid Key or Permissions");
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        setIsLoaded(true);
    };
    
    script.onerror = () => {
        setLoadError("無法載入 Google Maps 腳本。請檢查網路連線。");
    };
    
    document.head.appendChild(script);

    // Cleanup not fully possible for script tag, but we can clean up the handler if we wanted to.
    // However, global handler is needed for async auth check.
  }, []);

  // 2. Initialize Map
  useEffect(() => {
    if (isLoaded && mapRef.current && !mapInstanceRef.current && !loadError) {
      try {
        if (!window.google || !window.google.maps) {
             setLoadError("Google Maps SDK 尚未準備好");
             return;
        }

        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 25.0330, lng: 121.5654 }, // Default Taipei
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
              {
                  featureType: "poi",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#747474" }]
              },
              {
                  featureType: "poi.park",
                  elementType: "geometry.fill",
                  stylers: [{ color: "#e5e7eb" }]
              }
          ]
        });
      } catch (e) {
          console.error("Error initializing map:", e);
          setLoadError("初始化地圖時發生錯誤");
      }
    }
  }, [isLoaded, loadError]);

  // 3. Update Markers & Route
  useEffect(() => {
    if (!mapInstanceRef.current || !activeDay || !window.google || loadError) return;

    const google = window.google;
    const map = mapInstanceRef.current;

    // -- Cleanup --
    markersRef.current.forEach((m: any) => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) polylineRef.current.setMap(null);

    // -- Create new markers --
    const points: any[] = [];
    const bounds = new google.maps.LatLngBounds();

    activeDay.places.forEach((place, index) => {
      const position = { lat: place.coordinates.lat, lng: place.coordinates.lng };
      points.push(position);
      bounds.extend(position);

      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: place.name,
        label: {
          text: (index + 1).toString(),
          color: "white",
          fontWeight: "bold",
          fontSize: "14px"
        },
        animation: google.maps.Animation.DROP
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 4px; min-width: 150px;">
            <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${place.name}</h3>
            <p style="font-size: 12px; color: #666; line-height: 1.4;">${place.description}</p>
          </div>
        `,
        pixelOffset: new google.maps.Size(0, -30)
      });

      marker.addListener("click", () => {
        infoWindow.open({ anchor: marker, map });
      });

      markersRef.current.push(marker);
    });

    // -- Draw Route --
    if (points.length > 1) {
      const lineSymbol = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 3,
        strokeColor: '#4f46e5'
      };

      polylineRef.current = new google.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: "#4f46e5",
        strokeOpacity: 0.8,
        strokeWeight: 5,
        icons: [{
          icon: lineSymbol,
          offset: '50%',
          repeat: '100px'
        }],
        map: map
      });
    }

    if (points.length > 0) {
      map.fitBounds(bounds);
      // Optional: Don't zoom in too close if only 1 point
      if (points.length === 1) {
          map.setZoom(15);
      }
    }
  }, [activeDay, isLoaded, loadError]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-100">
       {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-50 p-6 text-center">
              <div className="text-red-500 mb-2 font-bold flex flex-col items-center">
                <img
                  src="/image/travel_logo.png"
                  alt="Error icon"
                  className="w-8 h-8"
                />
                <span className="mt-2">地圖載入失敗</span>
              </div>
              <p className="text-slate-600 text-sm mb-4">{loadError}</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                 如果您是開發者，請至 Google Cloud Console 啟用 Maps JavaScript API 並確認 API Key 限制。
              </p>
          </div>
       )}
       
       {!isLoaded && !loadError && (
         <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
            <p className="text-slate-500 text-sm">載入 Google 地圖中...</p>
         </div>
       )}
       
       <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};