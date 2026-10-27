import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Search,
  Compass,
  Clock,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface LocationConfirmation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  locationSource: 'GPS_DEVICE' | 'MAP_PINPOINT' | 'MANUAL_ENTRY';
  isConfirmed: boolean;
  confirmedAt: string | null;
  regionText: string;
}

interface InteractiveLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialRegion?: string;
  onLocationConfirmed: (data: LocationConfirmation) => void;
}

export const InteractiveLocationPicker: React.FC<InteractiveLocationPickerProps> = ({
  initialLat,
  initialLng,
  initialRegion = '',
  onLocationConfirmed,
}) => {
  const { language, t } = useLanguage();

  const [latitude, setLatitude] = useState<number | null>(initialLat ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialLng ?? null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [captureTime, setCaptureTime] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<'GPS_DEVICE' | 'MAP_PINPOINT' | 'MANUAL_ENTRY'>('MANUAL_ENTRY');
  const [regionText, setRegionText] = useState<string>(initialRegion);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [confirmedTime, setConfirmedTime] = useState<string | null>(null);

  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [manualAddressInput, setManualAddressInput] = useState('');
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Use default coordinates if not set yet (e.g. Center of South India Western Ghats / Nilgiris zone if not acquired)
    const mapLat = latitude ?? 11.4064;
    const mapLng = longitude ?? 76.6932;
    const initialZoom = latitude && longitude ? 14 : 7;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [mapLat, mapLng],
        zoom: initialZoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom marker icon to prevent missing image asset issues
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="background-color: #047857; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      if (latitude && longitude) {
        const marker = L.marker([latitude, longitude], {
          draggable: true,
          icon: customIcon,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setLatitude(parseFloat(pos.lat.toFixed(6)));
          setLongitude(parseFloat(pos.lng.toFixed(6)));
          setLocationSource('MAP_PINPOINT');
          setIsConfirmed(false); // require re-confirmation if moved
        });

        markerRef.current = marker;
      }

      // Allow clicking on map to place or move marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const newLat = parseFloat(lat.toFixed(6));
        const newLng = parseFloat(lng.toFixed(6));
        setLatitude(newLat);
        setLongitude(newLng);
        setLocationSource('MAP_PINPOINT');
        setIsConfirmed(false);

        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        } else {
          const marker = L.marker([newLat, newLng], {
            draggable: true,
            icon: customIcon,
          }).addTo(map);

          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            setLatitude(parseFloat(pos.lat.toFixed(6)));
            setLongitude(parseFloat(pos.lng.toFixed(6)));
            setLocationSource('MAP_PINPOINT');
            setIsConfirmed(false);
          });

          markerRef.current = marker;
        }
      });

      mapInstanceRef.current = map;
    } else {
      // Map already exists, update view if coordinates changed
      if (latitude && longitude) {
        mapInstanceRef.current.setView([latitude, longitude], 14);
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        }
      }
    }

    // Invalidate size after mount in case container size shifted
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  }, [latitude, longitude]);

  // Accurate Geolocation handler
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError(
        language === 'ta'
          ? 'உங்கள் உலாவியில் ஜிபிஎஸ் ஆதரவு இல்லை. வரைபடத்தில் கைமுறையாகக் குறிக்கவும்.'
          : 'Geolocation is not supported by your browser. Please enter location manually or select on the map.'
      );
      return;
    }

    setDetectingGps(true);
    setGpsError(null);
    setIsConfirmed(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy);
        const time = new Date(position.timestamp).toLocaleTimeString();

        setLatitude(lat);
        setLongitude(lng);
        setAccuracyMeters(accuracy);
        setCaptureTime(time);
        setLocationSource('GPS_DEVICE');
        setDetectingGps(false);

        // Attempt reverse geocoding to suggest region name if empty
        if (!regionText || regionText.trim() === '') {
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then((res) => res.json())
            .then((data) => {
              if (data && data.display_name) {
                // Shorten to village, district, state
                const parts = data.display_name.split(', ');
                const shortRegion = parts.slice(0, 3).join(', ');
                setRegionText(shortRegion);
              }
            })
            .catch(() => {
              // Ignore network error for reverse geocoding
            });
        }
      },
      (error) => {
        setDetectingGps(false);
        let errorMsg = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg =
              language === 'ta'
                ? 'இருப்பிட அனுமதி மறுக்கப்பட்டது. தயவுசெய்து உங்கள் உலாவி அமைப்பில் அனுமதியை இயக்கவும் அல்லது கீழே உள்ள வரைபடத்தில் கிளிக் செய்யவும்.'
                : 'Location access was denied. Please allow location permissions in your browser or click on the map to pinpoint your harvest area.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg =
              language === 'ta'
                ? 'ஜிபிஎஸ் தகவல் கிடைக்கவில்லை. வரைபடத்தில் கிளிக் செய்து இடத்தை உறுதிப்படுத்தவும்.'
                : 'GPS position unavailable. Please search or click on the map to mark your collection area.';
            break;
          case error.TIMEOUT:
            errorMsg =
              language === 'ta'
                ? 'ஜிபிஎஸ் நேரம் முடிவடைந்தது. திறந்தவெளியில் முயற்சிக்கவும் அல்லது வரைபடத்தில் கைமுறையாகத் தேர்வு செய்யவும்.'
                : 'GPS request timed out (20s). Please try in an open outdoor area or select on the map.';
            break;
          default:
            errorMsg = error.message || 'Failed to acquire GPS location.';
        }
        setGpsError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  // Search Address / Landmark
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAddressInput.trim()) return;

    setGeocodingLoading(true);
    setGpsError(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          manualAddressInput.trim()
        )}&countrycodes=in&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(parseFloat(item.lat).toFixed(6));
        const lng = parseFloat(parseFloat(item.lon).toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setLocationSource('MANUAL_ENTRY');
        setAccuracyMeters(null);
        setRegionText(item.display_name.split(', ').slice(0, 3).join(', '));
        setIsConfirmed(false);
      } else {
        setGpsError(
          language === 'ta'
            ? 'முகவரி கண்டறியப்படவில்லை. வரைபடத்தில் நேரடியாகக் கிளிக் செய்யவும்.'
            : 'Location not found. Please click directly on the map.'
        );
      }
    } catch {
      setGpsError('Search service error. Please click on the map to place the pin.');
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Farmer explicitly confirms collection location
  const handleConfirmLocation = () => {
    if (!latitude || !longitude) {
      setGpsError(
        language === 'ta'
          ? 'இருப்பிடம் தேர்ந்தெடுக்கப்படவில்லை. "எனது தற்போதைய இடத்தைக் கண்டறி" பொத்தானை அழுத்தவும் அல்லது வரைபடத்தில் கிளிக் செய்யவும்.'
          : 'Please select a location first via GPS or by clicking on the map.'
      );
      return;
    }

    if (!regionText || regionText.trim().length === 0) {
      setGpsError(
        language === 'ta'
          ? 'தயவுசெய்து கிராமம் அல்லது மலைப்பகுதியின் பெயரை உள்ளிடவும்.'
          : 'Please provide a regional name or forest/village description below.'
      );
      return;
    }

    const timestamp = new Date().toISOString();
    setIsConfirmed(true);
    setConfirmedTime(new Date().toLocaleTimeString());
    setGpsError(null);

    onLocationConfirmed({
      latitude,
      longitude,
      accuracyMeters,
      locationSource,
      isConfirmed: true,
      confirmedAt: timestamp,
      regionText: regionText.trim(),
    });
  };

  return (
    <div className="bg-zinc-50/70 p-5 rounded-2xl border border-zinc-200 space-y-4">
      {/* Header and Callout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>
              {language === 'ta' ? 'அறுவடை இருப்பிடம் மற்றும் உறுதிப்படுத்தல்' : 'Harvest Geolocation & Map Confirmation'}
            </span>
          </h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {language === 'ta'
              ? 'உங்கள் மொபைல் சாதன இருப்பிடத்தையும், உண்மையான மூலிகை சேகரிப்பு இடத்தையும் வரைபடத்தில் சரிபார்க்கவும்.'
              : 'Verify your collection site. You can drag the map pin to pinpoint the exact forest/farm plot.'}
          </p>
        </div>

        {/* GPS Capture Button */}
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={detectingGps}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          <Navigation className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
          <span>
            {detectingGps
              ? language === 'ta'
                ? 'ஜிபிஎஸ் கண்டறிகிறது...'
                : 'Acquiring GPS...'
              : language === 'ta'
              ? '📍 எனது தற்போதைய இடத்தைக் கண்டறி'
              : '📍 Get My Current Location'}
          </span>
        </button>
      </div>

      {/* Device vs Field Difference Explanation Notice */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[11px]">
          <span className="font-semibold block">
            {language === 'ta' ? 'முக்கிய குறிப்பு:' : 'Important Notice for Farmers & Foragers:'}
          </span>
          <p className="text-blue-800/90 leading-relaxed">
            {language === 'ta'
              ? 'நீங்கள் வீட்டிலோ அல்லது கூட்டுறவு சங்க அலுவலகத்திலோ அமர்ந்து பதிவு செய்தால், உங்கள் சாதனம் இருக்கும் இடமும், மூலிகை சேகரிக்கப்பட்ட காட்டு நிலமும் வேறுபட்டிருக்கலாம். வரைபடத்தில் பின்தலை நகர்த்தி மூலிகை அறுவடை செய்யப்பட்ட சரியான இடத்தை உறுதிசெய்யவும்.'
              : 'Your phone/device location right now and the actual herb collection field/forest plot may be different. If you are entering records at home or at a collection depot, simply drag the green pin on the map to pinpoint where the herbs were actually harvested.'}
          </p>
        </div>
      </div>

      {/* Errors or GPS warnings */}
      {gpsError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Search / Manual Location Input Option */}
      <form onSubmit={handleSearchAddress} className="flex gap-2 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            value={manualAddressInput}
            onChange={(e) => setManualAddressInput(e.target.value)}
            placeholder={
              language === 'ta'
                ? 'கிராமம், காடு அல்லது பகுதி பெயரைத் தேடவும் (எ.கா: Valparai, Kolli Hills)'
                : 'Search village, hill reserve or landmark (e.g., Valparai, Kolli Hills, Nilgiris)'
            }
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <button
          type="submit"
          disabled={geocodingLoading}
          className="px-3.5 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-semibold whitespace-nowrap"
        >
          {geocodingLoading ? '...' : language === 'ta' ? 'தேடு' : 'Search Map'}
        </button>
      </form>

      {/* Leaflet Map Interactive Container */}
      <div className="rounded-2xl overflow-hidden border border-zinc-300 shadow-inner relative">
        <div ref={mapContainerRef} className="h-64 sm:h-72 w-full z-0 bg-zinc-100" />

        {/* Map Instructions Overlay */}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] text-zinc-700 shadow-xs border border-zinc-200 z-10 flex items-center gap-1.5">
          <Compass className="w-3 h-3 text-emerald-700" />
          <span>
            {language === 'ta'
              ? 'வரைபடத்தில் கிளிக் செய்யவும் அல்லது குறியீட்டை நகர்த்தவும்'
              : 'Click map or drag the green marker to move collection pin'}
          </span>
        </div>

        {!latitude && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10">
            <MapPin className="w-8 h-8 text-emerald-700 animate-bounce mb-2" />
            <p className="text-xs font-semibold text-zinc-800">
              {language === 'ta'
                ? 'இருப்பிடம் இன்னும் தேர்ந்தெடுக்கப்படவில்லை'
                : 'No Collection Coordinates Selected Yet'}
            </p>
            <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
              {language === 'ta'
                ? '"எனது தற்போதைய இடத்தைக் கண்டறி" பொத்தானை அழுத்தவும் அல்லது வரைபடத்தில் நேரடியாகக் கிளிக் செய்யவும்.'
                : 'Click "Get My Current Location" or click directly anywhere on the map to pinpoint the herb origin.'}
            </p>
          </div>
        )}
      </div>

      {/* Coordinates, Accuracy Badge & Source Details */}
      {latitude && longitude && (
        <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="text-zinc-500 block">Latitude</span>
              <span className="font-mono font-bold text-zinc-900">{latitude}°</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Longitude</span>
              <span className="font-mono font-bold text-zinc-900">{longitude}°</span>
            </div>
            <div>
              <span className="text-zinc-500 block">GPS Accuracy</span>
              {accuracyMeters !== null ? (
                <span
                  className={`inline-block font-mono font-bold px-1.5 py-0.5 rounded ${
                    accuracyMeters <= 20
                      ? 'bg-emerald-100 text-emerald-800'
                      : accuracyMeters <= 50
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  ±{accuracyMeters}m {accuracyMeters > 50 && '⚠️ (Low)'}
                </span>
              ) : (
                <span className="text-zinc-400 font-mono">Pinpoint Adjusted</span>
              )}
            </div>
            <div>
              <span className="text-zinc-500 block">Location Source</span>
              <span className="font-semibold text-emerald-800 capitalize">
                {locationSource === 'GPS_DEVICE'
                  ? 'Device Geolocation'
                  : locationSource === 'MAP_PINPOINT'
                  ? 'Map Pinpoint Dragged'
                  : 'Manual Address Search'}
              </span>
            </div>
          </div>

          {/* Region / Village / Reserve Name Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              {language === 'ta'
                ? 'அறுவடை பகுதி / கிராமம் / மலைக்காடு பெயர் *'
                : 'Harvest Region / Village / Biosphere Reserve Name *'}
            </label>
            <input
              type="text"
              required
              value={regionText}
              onChange={(e) => {
                setRegionText(e.target.value);
                setIsConfirmed(false);
              }}
              placeholder={
                language === 'ta'
                  ? 'எ.கா: ஆனைமலை காப்புக் காடு, வால்பாறை, தமிழ்நாடு'
                  : 'e.g. Anaimalai Rainforest Reserve, Valparai, Tamil Nadu'
              }
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Confirmation Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-100">
            <div>
              {isConfirmed ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {language === 'ta' ? 'சேகரிப்பு இடம் உறுதிப்படுத்தப்பட்டது' : 'Collection Location Confirmed'} (
                    {confirmedTime})
                  </span>
                </span>
              ) : (
                <span className="text-amber-700 text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {language === 'ta'
                      ? 'தயவுசெய்து இடத்தை சரிபார்த்து உறுதிப்படுத்தவும்'
                      : 'Unconfirmed: Please review and click Confirm Location'}
                  </span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirmLocation}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isConfirmed
                  ? 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isConfirmed
                  ? language === 'ta'
                    ? 'மீண்டும் உறுதிப்படுத்து'
                    : 'Re-Confirm Location'
                  : language === 'ta'
                  ? 'சேகரிப்பு இடத்தை உறுதிப்படுத்து'
                  : 'Confirm Collection Location'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
