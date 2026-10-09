import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Car } from 'lucide-react';

interface VehicleCarouselProps {
  photos: string[];
  mainPhoto: string;
  vehicleId: string;
}

export function VehicleCarousel({ photos, mainPhoto, vehicleId }: VehicleCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const photosList = useCallback(() => {
    if (photos.length === 0) return [mainPhoto];
    return [mainPhoto, ...photos];
  }, [photos, mainPhoto]);

  const photoList = photosList();
  const currentPhoto = photoList[activeIndex] || mainPhoto;

  const goToPrevious = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? photoList.length - 1 : prev - 1));
  }, [photoList.length]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev === photoList.length - 1 ? 0 : prev + 1));
  }, [photoList.length]);

  if (photos.length <= 1) return null;

  return (
    <div className="relative mx-auto max-w-7xl">
      <div className="relative overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={currentPhoto}
          alt={`${vehicleId} - foto ${activeIndex + 1} de ${photoList.length}`}
          className="w-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-between p-3 bg-gradient-to-t from-black/30 to-transparent">
          <button
            onClick={goToPrevious}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-700 transition hover:bg-white hover:text-primary-600"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNext}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-700 transition hover:bg-white hover:text-primary-600"
            aria-label="Próxima foto"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="text-xs text-white/80">
            {activeIndex + 1} / {photoList.length}
          </span>
          <div className="flex gap-2">
            {photoList.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all ${i === activeIndex ? 'w-6 bg-primary-600' : 'w-2 bg-white/50 hover:bg-white/70'}`}
                aria-label={`Ir para foto ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
