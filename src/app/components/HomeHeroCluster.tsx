"use client";

import Image from "next/image";
import { usePhoto } from "./SitePhotosProvider";
import { motion } from "framer-motion";
import styles from "../page.module.css";
import { MOTION_EASE } from "./ui/motion";

const photoTransition = { duration: 0.35, ease: MOTION_EASE } as const;

export default function HomeHeroCluster() {
  const cohort = usePhoto("home.heroCohort");
  const demoDay = usePhoto("home.heroDemoDay");
  const aiLodge = usePhoto("home.heroAiLodge");
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
          src={cohort.src}
          alt={cohort.alt}
          data-photo-slot="home.heroCohort"
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
          src={demoDay.src}
          alt={demoDay.alt}
          data-photo-slot="home.heroDemoDay"
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
          src={aiLodge.src}
          alt={aiLodge.alt}
          data-photo-slot="home.heroAiLodge"
          fill
          sizes="(min-width: 1024px) 28vw, 55vw"
          className={styles.clusterImg}
        />
      </motion.figure>
      <div className={styles.clusterMascot}>
        <Image
          src="/images/bia-cat-mascot.webp"
          alt=""
          aria-hidden="true"
          width={160}
          height={160}
        />
      </div>
    </motion.div>
  );
}
