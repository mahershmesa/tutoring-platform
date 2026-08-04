"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { MapTeacher } from "@/lib/supabase/types";

// نقطة صفراء مخصّصة بدل أيقونة Leaflet الافتراضية (تتجنّب مشاكل مسارات الصور)
const teacherIcon = L.divIcon({
  className: "",
  html: '<div class="teacher-pin"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

// مركز العراق تقريباً
const IRAQ_CENTER: [number, number] = [33.2, 43.7];

// فقاعة التجميع: دائرة تيل بالرقم الأبيض. حجمها يتدرّج مع عدد المدرّسين
// حتى يميّزها الطالب بصرياً عن النقطة الصفراء الفردية.
function clusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 50 ? 48 : 56;
  return L.divIcon({
    html: `<div class="teacher-cluster" style="width:${size}px;height:${size}px">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function TeacherMap({ teachers }: { teachers: MapTeacher[] }) {
  return (
    <MapContainer
      center={IRAQ_CENTER}
      zoom={6}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* المدرّسون في نفس المحافظة على نفس الإحداثيات (مركز المحافظة).
          التجميع يلمّهم في فقاعة واحدة بالرقم، ويوزّعهم (spiderfy) عند الضغط
          أو أقصى تكبير فتظهر كل نقطة وبطاقتها. لا "جغرافيا كاذبة". */}
      <MarkerClusterGroup
        iconCreateFunction={clusterIcon}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom
        maxClusterRadius={60}
        chunkedLoading
      >
        {teachers.map((t) => (
          <Marker
            key={t.user_id}
            position={[t.latitude, t.longitude]}
            icon={teacherIcon}
          >
            <Popup>
              <div className="space-y-1 text-right" dir="rtl">
                <div className="flex items-center gap-2">
                  {t.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.photo_url}
                      alt={t.full_name}
                      className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
                      {t.full_name?.trim().charAt(0) || "؟"}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">{t.full_name}</p>
                    <p className="text-xs text-ink-soft">
                      {t.subjects.join("، ") || "—"} · {t.governorate_name}
                    </p>
                  </div>
                </div>
                <p className="flex items-center gap-1 text-xs text-teal-dark">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  أجاب على {t.answered_count} طالب
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
