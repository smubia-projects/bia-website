"use client";

import Image from "next/image";
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
      imgSrc:
        "https://ssvs8thfuktvqsqk.public.blob.vercel-storage.com/jowett-Afv3kaIlSii6rjl5hBj3u2pm5uAy09.jpg",
    },
    {
      name: "Gigi Teo",
      title: "ML Quant",
      text: "DAP is a wonderful chance to get your hands dirty with data and ML, guided by industry experts and seniors.",
      imgSrc:
        "https://ssvs8thfuktvqsqk.public.blob.vercel-storage.com/gigi3-DYIV83HGA7dhcL3KNN70Azz9stUjbA.jpg",
    },
    {
      name: "Aryan Khera",
      title: "Assurance Associate",
      text: "The perfect blend of theory and practice — applying data science to real-world problems.",
      imgSrc:
        "https://ssvs8thfuktvqsqk.public.blob.vercel-storage.com/aryan3-FmkPn0Ey0i2lt1QVPbbbW4eNFusXn5.jpg",
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
                src={testimonial.imgSrc}
                alt={testimonial.name}
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
