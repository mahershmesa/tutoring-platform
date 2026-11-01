"use client";

import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { MapTeacher } from "@/lib/supabase/types";
import ReportButton from "@/components/reports/ReportButton";

// نقطة صفراء مخصّصة بدل أيقونة Leaflet الافتراضية (تتجنّب مشاكل مسارات الصور)
const teacherIcon = L.divIcon({
  className: "",
  html: '<div class="teacher-pin"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const IRAQ_CENTER: [number, number] = [33.2, 43.7];

// فقاعة التجميع: دائرة تيل بالرقم الأبيض.
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

function genderLabel(g: MapTeacher["gender"]): string | null {
  return g === "male" ? "مدرّس" : g === "female" ? "مدرّسة" : null;
}

function shareText(t: MapTeacher): string {
  const subj = t.subjects.join("، ");
  return `${genderLabel(t.gender) ?? "مدرّس"} ${t.full_name}${
    subj ? " — " + subj : ""
  } في ${t.governorate_name} على دليلي 👇`;
}

const posKey = (lat: number, lng: number) =>
  `${lat.toFixed(5)},${lng.toFixed(5)}`;

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function ShareButtons({ t, origin }: { t: MapTeacher; origin: string }) {
  const wa = `https://wa.me/?text=${encodeURIComponent(shareText(t) + "\n" + origin)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(origin)}&text=${encodeURIComponent(shareText(t))}`;
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs text-ink-soft">مشاركة:</span>
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        aria-label="مشاركة عبر واتساب"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700"
      >
        <WhatsAppIcon />
      </a>
      <a
        href={tg}
        target="_blank"
        rel="noreferrer"
        aria-label="مشاركة عبر تلغرام"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-600"
      >
        <TelegramIcon />
      </a>
      <span className="mr-auto">
        <ReportButton
          reportedId={t.user_id}
          reportedName={t.full_name}
          variant="icon"
        />
      </span>
    </div>
  );
}

// بطاقة المدرّس — مشتركة بين الـ popup وقائمة التجمّع.
function TeacherCard({ t, origin }: { t: MapTeacher; origin: string }) {
  return (
    <div className="space-y-1 text-right" dir="rtl">
      <div className="flex items-center gap-2">
        {t.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.photo_url}
            alt={t.full_name}
            className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
            {t.full_name?.trim().charAt(0) || "؟"}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{t.full_name}</p>
          <p className="text-xs text-ink-soft">
            {t.subjects.join("، ") || "—"} · {t.governorate_name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft">
            {genderLabel(t.gender) && (
              <span className="rounded-full bg-teal-light px-2 py-0.5 text-teal-dark">
                {genderLabel(t.gender)}
              </span>
            )}
            {t.years_experience != null && (
              <span className="rounded-full bg-surface px-2 py-0.5">
                خبرة {t.years_experience} سنة
              </span>
            )}
            {t.rating_count > 0 && (
              <span className="font-medium text-amber">
                ★ {t.avg_rating}{" "}
                <span className="font-normal text-ink-soft">
                  ({t.rating_count})
                </span>
              </span>
            )}
          </p>
        </div>
      </div>
      {t.bio && <p className="text-xs leading-relaxed text-ink">{t.bio}</p>}
      <p className="flex items-center gap-1 text-xs text-teal-dark">
        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
        أجاب على {t.answered_count} طالب
      </p>
      <a
        href={`/teacher/${t.user_id}`}
        className="inline-block rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-dark"
      >
        عرض الملف الكامل ←
      </a>
      <ShareButtons t={t} origin={origin} />
    </div>
  );
}

type ClusterClickEvent = {
  layer: {
    getAllChildMarkers?: () => Array<{ getLatLng: () => L.LatLng }>;
  };
};

export default function TeacherMap({ teachers }: { teachers: MapTeacher[] }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [panel, setPanel] = useState<MapTeacher[] | null>(null);

  const byPos = useMemo(() => {
    const m = new Map<string, MapTeacher[]>();
    teachers.forEach((t) => {
      const k = posKey(t.latitude, t.longitude);
      const arr = m.get(k) ?? [];
      arr.push(t);
      m.set(k, arr);
    });
    return m;
  }, [teachers]);

  function handleClusterClick(e: ClusterClickEvent) {
    const markers = e.layer.getAllChildMarkers?.() ?? [];
    const keys = new Set<string>();
    markers.forEach((mk) => {
      const ll = mk.getLatLng();
      keys.add(posKey(ll.lat, ll.lng));
    });
    const list: MapTeacher[] = [];
    keys.forEach((k) => {
      const arr = byPos.get(k);
      if (arr) list.push(...arr);
    });
    if (list.length) setPanel(list);
  }

  return (
    <div className="relative h-full w-full">
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
        {/* الضغط على التجمّع يفتح قائمة ببطاقات المدرّسين فوراً (بدل نشر نقاط). */}
        <MarkerClusterGroup
          iconCreateFunction={clusterIcon}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={false}
          spiderfyOnMaxZoom={false}
          maxClusterRadius={60}
          chunkedLoading
          onClick={handleClusterClick}
        >
          {teachers.map((t) => (
            <Marker
              key={t.user_id}
              position={[t.latitude, t.longitude]}
              icon={teacherIcon}
            >
              <Popup>
                <TeacherCard t={t} origin={origin} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {panel && (
        <div
          className="fixed inset-0 z-[1100] bg-black/40"
          onClick={() => setPanel(null)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-auto rounded-t-2xl bg-card p-4 shadow-2xl"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">
                {panel.length} مدرّس في هذه المنطقة
              </h3>
              <button
                onClick={() => setPanel(null)}
                aria-label="إغلاق"
                className="rounded-lg px-2 py-1 text-ink-soft hover:text-ink"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {panel.map((t) => (
                <div
                  key={t.user_id}
                  className="rounded-xl border border-border p-3"
                >
                  <TeacherCard t={t} origin={origin} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
