import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import {
  GlobeAltIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

import usePersistentCollection from '../../hooks/usePersistentCollection.js';
import worldData from '../../data/world-110m.json';

const defaultLocations = [
  {
    id: 'hub-sf',
    name: 'San Francisco Hub',
    description: 'HQ broadcast studio, production pods, and 180 seat theatre.',
    latitude: 37.7749,
    longitude: -122.4194,
    members: 612,
    online: 124,
    nextEvent: '2024-05-25T18:00:00.000Z'
  },
  {
    id: 'hub-london',
    name: 'London Guild',
    description: 'Async labs, monetisation clinics, and sponsorship lounges.',
    latitude: 51.5074,
    longitude: -0.1278,
    members: 428,
    online: 80,
    nextEvent: '2024-05-29T09:00:00.000Z'
  },
  {
    id: 'hub-singapore',
    name: 'Singapore Lab',
    description: 'APAC operations centre with bilingual support pods.',
    latitude: 1.3521,
    longitude: 103.8198,
    members: 312,
    online: 68,
    nextEvent: '2024-06-02T13:00:00.000Z'
  }
];

const worldFeatures = feature(worldData, worldData.objects.countries).features;

function formatDate(value) {
  if (!value) return 'TBC';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBC';
  return date.toLocaleString();
}

function LocationForm({ location, onSubmit, onCancel }) {
  const [formState, setFormState] = useState(() => ({
    name: location?.name ?? '',
    description: location?.description ?? '',
    latitude: location?.latitude ?? '',
    longitude: location?.longitude ?? '',
    members: location?.members ?? 0,
    online: location?.online ?? 0,
    nextEvent: location?.nextEvent ?? ''
  }));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.({
      ...formState,
      latitude: Number.parseFloat(formState.latitude) || 0,
      longitude: Number.parseFloat(formState.longitude) || 0,
      members: Number.parseInt(formState.members, 10) || 0,
      online: Number.parseInt(formState.online, 10) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Hub name
          <input
            type="text"
            name="name"
            required
            value={formState.name}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Next event
          <input
            type="datetime-local"
            name="nextEvent"
            value={formState.nextEvent}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <label className="space-y-1 text-xs font-semibold text-slate-600">
        Description
        <textarea
          name="description"
          rows={3}
          value={formState.description}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Latitude
          <input
            type="number"
            step="0.0001"
            name="latitude"
            value={formState.latitude}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Longitude
          <input
            type="number"
            step="0.0001"
            name="longitude"
            value={formState.longitude}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Members
          <input
            type="number"
            name="members"
            min="0"
            value={formState.members}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Online now
          <input
            type="number"
            name="online"
            min="0"
            value={formState.online}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          <SparklesIcon className="h-4 w-4" /> Save hub
        </button>
      </div>
    </form>
  );
}

LocationForm.propTypes = {
  location: PropTypes.object,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func
};

LocationForm.defaultProps = {
  location: null,
  onSubmit: undefined,
  onCancel: undefined
};

function LocationCard({ location, isActive, onSelect, onEdit, onRemove }) {
  return (
    <article
      className={`space-y-3 rounded-3xl border p-4 transition ${
        isActive ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-white/80 text-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{location.name}</p>
          <p className="mt-1 text-xs text-slate-500">{location.description}</p>
        </div>
        <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold text-slate-600">
          {location.members} members
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
        <MapPinIcon className="h-4 w-4" />
        {location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-600">{location.online} online</span>
      </div>
      <p className="text-[11px] font-semibold text-slate-500">Next event · {formatDate(location.nextEvent)}</p>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
        <button
          type="button"
          onClick={() => onSelect(location.id)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 transition hover:bg-slate-200"
        >
          <GlobeAltIcon className="h-4 w-4" /> Focus
        </button>
        <button
          type="button"
          onClick={() => onEdit(location)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 transition hover:bg-slate-200"
        >
          <PencilSquareIcon className="h-4 w-4" /> Edit
        </button>
        <button
          type="button"
          onClick={() => onRemove(location.id)}
          className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-rose-600 transition hover:bg-rose-100"
        >
          <TrashIcon className="h-4 w-4" /> Remove
        </button>
      </div>
    </article>
  );
}

LocationCard.propTypes = {
  location: PropTypes.object.isRequired,
  isActive: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default function CommunityMap({ communityId, communityName, initialLocations }) {
  const storageNamespace = communityId ? `community:${communityId}` : 'community:preview';

  const seedLocations = useMemo(() => {
    if (Array.isArray(initialLocations) && initialLocations.length) {
      return initialLocations.map((location) => ({
        ...location,
        latitude: Number.parseFloat(location.latitude) || 0,
        longitude: Number.parseFloat(location.longitude) || 0,
        members: Number.parseInt(location.members, 10) || 0,
        online: Number.parseInt(location.online, 10) || 0
      }));
    }
    return defaultLocations;
  }, [initialLocations]);

  const { items: locations, addItem, updateItem, removeItem } = usePersistentCollection(
    `${storageNamespace}:locations`,
    seedLocations
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(() => locations[0]?.id ?? null);

  useEffect(() => {
    if (!locations.length) {
      setSelectedLocationId(null);
      return;
    }
    if (!selectedLocationId) {
      setSelectedLocationId(locations[0].id);
      return;
    }
    const exists = locations.some((location) => location.id === selectedLocationId);
    if (!exists) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const projection = useMemo(() => geoEqualEarth().fitSize([640, 320], { type: 'Sphere' }), []);
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  const totalMembers = locations.reduce((acc, item) => acc + (item.members ?? 0), 0);
  const totalOnline = locations.reduce((acc, item) => acc + (item.online ?? 0), 0);

  const handleCreate = (payload) => {
    const newLocation = addItem(payload);
    setIsCreating(false);
    setSelectedLocationId(newLocation.id);
  };

  const handleUpdate = (payload) => {
    if (!editingLocation) return;
    updateItem(editingLocation.id, {
      ...editingLocation,
      ...payload
    });
    setEditingLocation(null);
  };

  const handleRemove = (id) => {
    removeItem(id);
    if (selectedLocationId === id) {
      const next = locations.filter((location) => location.id !== id);
      setSelectedLocationId(next[0]?.id ?? null);
    }
  };

  return (
    <section className="space-y-6 rounded-4xl border border-slate-200 bg-white/70 p-6 shadow-xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Member map</p>
          <h2 className="text-lg font-semibold text-slate-900">{communityName} · Presence map</h2>
          <p className="mt-1 text-sm text-slate-600">
            Plot member hubs, monitor active counts, and plan on-the-ground programming.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{locations.length} hubs</span>
          <span className="rounded-full bg-slate-900/5 px-3 py-1">{totalMembers} members</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">{totalOnline} online</span>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-gradient-to-br from-white via-white to-primary/5 shadow-sm">
            <svg viewBox="0 0 640 360" className="h-full w-full">
              <defs>
                <radialGradient id="location-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g>
                {worldFeatures.map((featureItem) => (
                  <path key={featureItem.id} d={pathGenerator(featureItem)} className="fill-slate-100 stroke-slate-200" />
                ))}
              </g>
              <g>
                {locations.map((location) => {
                  const [x, y] = projection([location.longitude, location.latitude]);
                  const isActive = selectedLocationId === location.id;
                  return (
                    <g key={location.id} transform={`translate(${x}, ${y})`}>
                      <circle r={18} fill="url(#location-glow)" opacity={isActive ? 0.9 : 0.5} />
                      <circle
                        r={8}
                        fill={isActive ? '#6366F1' : '#0F172A'}
                        className="cursor-pointer"
                        onClick={() => setSelectedLocationId(location.id)}
                      />
                    </g>
                  );
                })}
              </g>
            </svg>
            {selectedLocation ? (
              <div className="absolute bottom-4 left-4 right-4 rounded-3xl border border-slate-200 bg-white/90 p-4 text-sm shadow-lg">
                <p className="text-sm font-semibold text-slate-900">{selectedLocation.name}</p>
                <p className="mt-1 text-xs text-slate-500">{selectedLocation.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                    {selectedLocation.members} members
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                    {selectedLocation.online} online
                  </span>
                  <span className="rounded-full bg-slate-900/5 px-3 py-1">
                    Next · {formatDate(selectedLocation.nextEvent)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {isCreating ? (
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
              <p className="text-sm font-semibold text-slate-900">Add a location</p>
              <p className="mt-1 text-xs text-slate-500">Store coordinates, member counts, and upcoming programming.</p>
              <div className="mt-4">
                <LocationForm location={null} onSubmit={handleCreate} onCancel={() => setIsCreating(false)} />
              </div>
            </div>
          ) : null}

          {editingLocation ? (
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
              <p className="text-sm font-semibold text-slate-900">Update location · {editingLocation.name}</p>
              <p className="mt-1 text-xs text-slate-500">Keep coordinates and live counts aligned.</p>
              <div className="mt-4">
                <LocationForm location={editingLocation} onSubmit={handleUpdate} onCancel={() => setEditingLocation(null)} />
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setEditingLocation(null);
              setIsCreating((value) => !value);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            <PlusIcon className="h-5 w-5" /> New hub
          </button>

          <div className="space-y-3">
            {locations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                isActive={selectedLocationId === location.id}
                onSelect={setSelectedLocationId}
                onEdit={(item) => {
                  setIsCreating(false);
                  setEditingLocation(item);
                }}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

CommunityMap.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  communityName: PropTypes.string,
  initialLocations: PropTypes.array
};

CommunityMap.defaultProps = {
  communityId: 'preview',
  communityName: 'Community',
  initialLocations: undefined
};
