export const MOTION_VARIANTS = {
    scaleUp: {
        initial: {
            scale: 0,
        },
        animate: {
            scale: 1,
        },
        exit: {
            scale:0
        }
    },
    scaleUpStaggered: {
        initial: {
            opacity: 0,
        },
        animate: {
            opacity: 1,
            transition: {
                duration: 0,
                when: 'beforeChildren',
                staggerChildren: 0.1
            }
        },
        exit: {
            opacity:0,
            transition: {
                duration: 0,
                when: 'beforeChildren',
                staggerChildren: 0.1
            }
        }
    },
    toHeightAutoContainer: {
        initial: {
            height: 0
        },
        animate: {
            height: 'auto',
            transition: {
                duration: 0.2,
                staggerChildren: 0.02,
                when: "beforeChildren"
            }
        },
        exit: {
            height: 0,
            transition: {
                duration: 0.2,
                staggerChildren: 0.02,
                when: "afterChildren"
            }
        }
    },
    appearUp: {
        initial: {
            opacity:0,
            y: 10,
            scale: 0.9
        },
        animate: {
            opacity:1,
            y: 0,
            scale: 1
        },
        exit: {
            opacity:0,
            y: 5,
            scale: 0.95
        }
    },
    linklistItemAppearDown: {
        initial: {
            opacity:0,
            y: -4
        },
        animate: {
            opacity:1,
            y: 0,
            transition: {
                duration: 0.2
            }
        },
        exit: {
            opacity:0,
            y: -4,
            transition: {
                duration: 0.1
            }
        }
    },
    lightboxContent: {
        initial: {
            opacity: 0,
            y: -20,
        },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                staggerChildren: 0.05,
                when: "beforeChildren"
            }
        },
        exit: {
            opacity: 0,
            y: 20,
            transition: {
                duration: 0.3
            }
        }
    },
    lightbox: {
        initial: {
            opacity: 0,
        },
        animate: {
            opacity: 1,
            transition: {
                duration: 0.1,
                staggerChildren: 0.1,
                when: "beforeChildren"
            }
        },
        exit: {
            opacity: 0,
            transition: {
                duration: 0.1,
                staggerChildren: 0.2,
                when: "afterChildren"
            }
        }
    }
}
