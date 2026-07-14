"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import styles from "../page.module.css";
import { MOTION_EASE } from "./ui/motion";

const photoTransition = { duration: 0.35, ease: MOTION_EASE } as const;

export default function HomeHeroCluster() {
  return (
    <motion.div
      className={styles.heroCluster}
      initial="rest"
      animate="rest"
      whileHover="hover"
    >
      <motion.figure
        className={`${styles.clusterPhoto} ${styles.clusterA}`}
        variants={{
          rest: { rotate: -5, y: 0 },
          hover: { rotate: -6, y: -4 },
        }}
        transition={photoTransition}
      >
        <Image
          src="/images/home/hero-cohort.webp"
          alt="SMUBIA Data Associate Programme cohort"
          fill
          sizes="(min-width: 1024px) 30vw, 60vw"
          className={styles.clusterImg}
          priority
        />
      </motion.figure>
      <motion.figure
        className={`${styles.clusterPhoto} ${styles.clusterB}`}
        variants={{
          rest: { rotate: 5, y: 0 },
          hover: { rotate: 6, y: -4 },
        }}
        transition={photoTransition}
      >
        <Image
          src="/images/home/hero-demoday.webp"
          alt="Members presenting at an AI Lodge demo day"
          fill
          sizes="(min-width: 1024px) 22vw, 45vw"
          className={styles.clusterImg}
        />
      </motion.figure>
      <motion.figure
        className={`${styles.clusterPhoto} ${styles.clusterC}`}
        variants={{
          rest: { rotate: 3, y: 0 },
          hover: { rotate: 4, y: -4 },
        }}
        transition={photoTransition}
      >
        <Image
          src="/images/home/hero-ailodge.webp"
          alt="An AI Lodge team hanging out"
          fill
          sizes="(min-width: 1024px) 28vw, 55vw"
          className={styles.clusterImg}
        />
      </motion.figure>
      <motion.div
        className={styles.clusterMascot}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
      >
        <Image
          src="/images/bia-cat-mascot.svg"
          alt=""
          aria-hidden="true"
          width={160}
          height={160}
        />
      </motion.div>
    </motion.div>
  );
}
