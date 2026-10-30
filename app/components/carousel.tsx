"use client";

import Image from "next/image";
import { usePhoto } from "./SitePhotosProvider";
import { motion } from "framer-motion";
import styles from "./carousel.module.css";
import SectionHeading from "./ui/SectionHeading";
import { motionTransition } from "./ui/motion";

const AlumniTestimonials = () => {
  const testimonials = [
    {
      name: "Jowett",
      title: "Cloud Native Architect",
      text: "Hands-on data science experience, and a vibrant community of professionals and industry experts.",
      photo: usePhoto("home.alumni1"),
      slot: "home.alumni1",
    },
    {
      name: "Gigi Teo",
      title: "ML Quant",
      text: "DAP is a wonderful chance to get your hands dirty with data and ML, guided by industry experts and seniors.",
      photo: usePhoto("home.alumni2"),
      slot: "home.alumni2",
    },
    {
      name: "Aryan Khera",
      title: "Assurance Associate",
      text: "The perfect blend of theory and practice — applying data science to real-world problems.",
      photo: usePhoto("home.alumni3"),
      slot: "home.alumni3",
    },
  ];

  return (
    <div>
      <SectionHeading
        eyebrow="Alumni"
        title="Beyond SMU"
        lede="Our alumni have gone on to careers across technology, finance, and other industries."
      />
      <div className={styles.grid}>
        {testimonials.map((testimonial) => (
          <motion.figure
            key={testimonial.name}
            className={styles.card}
            whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
            transition={motionTransition.quick}
          >
            <blockquote className={styles.quote}>
              &ldquo;{testimonial.text}&rdquo;
            </blockquote>
            <figcaption className={styles.person}>
              <Image
                className={styles.avatar}
                src={testimonial.photo.src}
                alt={testimonial.photo.alt || testimonial.name}
                data-photo-slot={testimonial.slot}
                width={96}
                height={96}
              />
              <div>
                <p className={styles.name}>{testimonial.name}</p>
                <p className={styles.title}>{testimonial.title}</p>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  );
};

export default AlumniTestimonials;
