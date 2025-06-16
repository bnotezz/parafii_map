"use client"

import { useEffect, useRef, useState } from "react"

interface ParishFeature {
  type: "Feature"
  properties: {
    id: string
    title: string
    religion: string
    settlements: string
    modern_settlement: string
    name: string
    settlement: string
  }
  geometry: {
    type: "Point"
    coordinates: [number, number]
  }
}

interface ParishMapProps {
  focusParishId?: string
  className?: string
}

declare global {
  interface Window {
    L: any
  }
}

export default function ParishMap({ focusParishId, className }: ParishMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)


  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const loadLeaflet = async () => {
      // Load CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      // Load JS
      if (!window.L) {
        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        document.head.appendChild(script)

        await new Promise((resolve) => {
          script.onload = resolve
        })
      }

      initializeMap()
    }

    const initializeMap = () => {
      if (!window.L || !mapRef.current) return

      console.log("Initializing map...")
      const L = window.L

      // Initialize map
      const map = L.map(mapRef.current).setView([50.6196175,26.2513165], 6)

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)

      // Create custom icons for different religions
      function createIcon(iconUrl: string) {
        return L.icon({
          iconUrl: iconUrl,
          iconSize: [31, 46], // size of the icon
          iconAnchor: [15.5, 42], // point of the icon which will correspond to marker's location
          popupAnchor: [0, -45], // point from which the popup should open relative to the iconAnchor
        })
      }

      const orthodoxIcon = createIcon("/icons/r_orthodox.png")
      const greekCatholicIcon = createIcon("/icons/r_greek_catholic.png")
      const romanCatholicIcon = createIcon("/icons/r_roman_catholic.png")
      const synagogueIcon = createIcon("/icons/r_judaism.png")
      const lutheranIcon = createIcon("/icons/r_lutheran.png")

      let focusMarker: any = null

       // Load the GeoJSON file
      fetch("data/parafii.geojson")
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          // Create a GeoJSON layer and add popups if a property "title" exists
          var geojsonLayer = L.geoJson(data, {
            // Use pointToLayer to create markers with a custom icon
            pointToLayer: function (feature, latlng) {
              var religion = feature.properties.religion || "orthodox"; 
              const { id, name, settlements } = feature.properties
              var customIcon;
              switch (religion) {
                case "orthodox": customIcon = orthodoxIcon; break;
                case "greek_catholic": customIcon = greekCatholicIcon; break;
                case "roman_catholic": customIcon = romanCatholicIcon; break;
                case "judaism": customIcon = synagogueIcon; break;
                case "lutheran": customIcon = lutheranIcon; break;
                default: customIcon = orthodoxIcon;
              }
              var marker = L.marker(latlng, { icon: customIcon });

              // Focus on specific parish if provided
              if (focusParishId && id === focusParishId) {
                focusMarker = marker
              }

              return marker;
            },
            onEachFeature: function (feature, layer) {
                const { religion, id, name, settlements } = feature.properties
                layer.bindPopup(`
                  <div style="padding: 12px; min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">${name || feature.properties.title}</h3>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">${settlements || feature.properties.settlements}</p>
                    <a href="/parafia/${id}" style="color: #2563eb; text-decoration: none; font-weight: 500;">
                      Детальніше →
                    </a>
                  </div>
                `)
            },
          }).addTo(map);

           // Focus on specific parish
          if (focusMarker && focusParishId) {
            const coords = focusMarker.getLatLng()
            map.setView([coords.lat, coords.lng], 12)
            focusMarker.openPopup()
          }
          else{
              // Adjust the map view to the geojson bounds
              map.fitBounds(geojsonLayer.getBounds());
          }
        })
        .catch(function (error) {
          console.error("Error loading GeoJSON:", error);
        });


      mapInstanceRef.current = map
      console.log("Map setup complete")
    }

    loadLeaflet()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [focusParishId])

  return (
    <div className={`relative h-full ${className}`}>
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
}
