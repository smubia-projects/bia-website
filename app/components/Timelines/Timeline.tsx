import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Controller } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { motionTransition } from '@/app/components/ui/motion';
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
                      <motion.div
                        className={`absolute inset-0 ${
                          index !== activeIndex ? 'bg-[var(--pine-deep)]/30' : ''
                        }`}
                        animate={{ opacity: index !== activeIndex ? 1 : 0 }}
                        transition={motionTransition.quick}
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <motion.button
                onClick={() => imageSwiper?.slidePrev()}
                aria-label="Previous event"
                className="bg-white text-[var(--ink)] border border-[var(--border)] rounded-full p-3 shadow-sm"
                whileHover={{ color: 'var(--emerald)', borderColor: 'var(--emerald)', scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                transition={motionTransition.quick}
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>
              <motion.button
                onClick={() => imageSwiper?.slideNext()}
                aria-label="Next event"
                className="bg-white text-[var(--ink)] border border-[var(--border)] rounded-full p-3 shadow-sm"
                whileHover={{ color: 'var(--emerald)', borderColor: 'var(--emerald)', scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                transition={motionTransition.quick}
              >
                <ChevronRight className="w-6 h-6" />
              </motion.button>
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
                    <h3 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold text-[var(--ink)] mb-3">
                      {event.title}
                    </h3>
                    <p className="text-base text-[var(--ink-soft)] max-w-[36rem] mx-auto leading-relaxed">
                      {event.description}
                    </p>
                    {event.futureEvent && (
                      <motion.button className="mt-6 bg-[var(--emerald)] text-white font-semibold
                                     px-8 py-3 rounded-full
                                     text-base uppercase tracking-wider"
                        whileHover={{ y: -2, backgroundColor: 'var(--emerald-strong)', boxShadow: 'var(--shadow-md)' }}
                        whileTap={{ scale: 0.98 }}
                        transition={motionTransition.quick}>
                        Sign up
                      </motion.button>
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
