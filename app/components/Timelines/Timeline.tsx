import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Controller } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/effect-cards';

interface Event {
  imageUrl: string;
  title: string;
  description: string;
  futureEvent?: boolean;
}

const Timeline = ({ events }: { events: Event[] }) => {
  const [imageSwiper, setImageSwiper] = useState<SwiperType | null>(null);
  const [contentSwiper, setContentSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="relative w-full flex flex-col items-center px-4 md:px-8">
      <div className="relative w-full max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col items-center">
        {/* Main Content Wrapper */}
        <div className="w-full flex flex-col items-center gap-4 py-4">
          {/* Image Section */}
          <div className="w-full relative">
            <div className="w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[60%] xl:max-w-[55%] mx-auto aspect-[16/9]">
              <Swiper
                effect="cards"
                grabCursor={true}
                modules={[EffectCards, Controller]}
                className="w-full h-full"
                onSwiper={setImageSwiper}
                controller={{ control: contentSwiper }}
                cardsEffect={{
                  perSlideOffset: 8,
                  perSlideRotate: 2,
                  rotate: true,
                  slideShadows: true,
                }}
                onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
              >
                {events.map((event, index) => (
                  <SwiperSlide key={index} className="rounded-xl overflow-hidden border border-[var(--border)]">
                    <div className="relative w-full h-full">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className={`absolute inset-0 ${
                          index !== activeIndex ? 'bg-[#0C211C]/30' : ''
                        }`}
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => imageSwiper?.slidePrev()}
                aria-label="Previous event"
                className="bg-white text-[var(--ink)] border border-[var(--border)] rounded-full p-3 hover:border-[var(--emerald)] hover:text-[var(--emerald)] transition-colors shadow-sm"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => imageSwiper?.slideNext()}
                aria-label="Next event"
                className="bg-white text-[var(--ink)] border border-[var(--border)] rounded-full p-3 hover:border-[var(--emerald)] hover:text-[var(--emerald)] transition-colors shadow-sm"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[65%] mx-auto">
            <Swiper
              modules={[Controller]}
              onSwiper={setContentSwiper}
              controller={{ control: imageSwiper }}
              className="w-full"
              allowTouchMove={false}
            >
              {events.map((event, index) => (
                <SwiperSlide key={index}>
                  <div className="text-center p-6">
                    <h3 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold text-[var(--ink)] mb-4">
                      {event.title}
                    </h3>
                    <p className="text-base md:text-lg text-[var(--ink-soft)] mb-6 max-w-[90%] mx-auto leading-relaxed">
                      {event.description}
                    </p>
                    {event.futureEvent && (
                      <button className="bg-[var(--emerald)] text-white font-semibold
                                     px-8 py-3 rounded-full
                                     hover:bg-[var(--emerald-strong)] transition-colors
                                     text-base uppercase tracking-wider">
                        Sign up
                      </button>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
