// Page-specific figures extracted from the user's copy of Kürti and Czakó.
const bookReactions = {
  "aldol": {
    "pages": [
      8,
      9
    ],
    "reaction": {
      "image": "assets/book/aldol-reaction.png",
      "printedPage": 8,
      "pdfPage": 60,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/aldol-mechanism.png",
      "printedPage": 8,
      "pdfPage": 60,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/aldol-applications.png",
        "printedPage": 9,
        "pdfPage": 61,
        "caption": "Synthetic applications"
      }
    ]
  },
  "grignard": {
    "pages": [
      188,
      189
    ],
    "reaction": {
      "image": "assets/book/grignard-reaction.png",
      "printedPage": 188,
      "pdfPage": 240,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/grignard-mechanism.png",
      "printedPage": 188,
      "pdfPage": 240,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/grignard-applications.png",
        "printedPage": 189,
        "pdfPage": 241,
        "caption": "Synthetic applications"
      }
    ]
  },
  "suzuki": {
    "pages": [
      448,
      449
    ],
    "reaction": {
      "image": "assets/book/suzuki-reaction.png",
      "printedPage": 448,
      "pdfPage": 500,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/suzuki-mechanism.png",
      "printedPage": 448,
      "pdfPage": 500,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/suzuki-applications.png",
        "printedPage": 449,
        "pdfPage": 501,
        "caption": "Synthetic applications"
      }
    ]
  },
  "wittig": {
    "pages": [
      486,
      487
    ],
    "reaction": {
      "image": "assets/book/wittig-reaction.png",
      "printedPage": 486,
      "pdfPage": 538,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/wittig-mechanism.png",
      "printedPage": 486,
      "pdfPage": 538,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/wittig-applications.png",
        "printedPage": 487,
        "pdfPage": 539,
        "caption": "Synthetic applications"
      }
    ]
  },
  "swern": {
    "pages": [
      450,
      451
    ],
    "reaction": {
      "image": "assets/book/swern-reaction.png",
      "printedPage": 450,
      "pdfPage": 502,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/swern-mechanism.png",
      "printedPage": 450,
      "pdfPage": 502,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/swern-applications.png",
        "printedPage": 451,
        "pdfPage": 503,
        "caption": "Synthetic applications"
      }
    ]
  },
  "clemmensen": {
    "pages": [
      92,
      93
    ],
    "reaction": {
      "image": "assets/book/clemmensen-reaction.png",
      "printedPage": 92,
      "pdfPage": 144,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/clemmensen-mechanism.png",
      "printedPage": 92,
      "pdfPage": 144,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/clemmensen-applications.png",
        "printedPage": 93,
        "pdfPage": 145,
        "caption": "Synthetic applications"
      }
    ]
  },
  "wolff": {
    "pages": [
      496,
      497
    ],
    "reaction": {
      "image": "assets/book/wolff-reaction.png",
      "printedPage": 496,
      "pdfPage": 548,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/wolff-mechanism.png",
      "printedPage": 496,
      "pdfPage": 548,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/wolff-applications.png",
        "printedPage": 497,
        "pdfPage": 549,
        "caption": "Synthetic applications"
      }
    ]
  },
  "birch": {
    "pages": [
      60,
      61
    ],
    "reaction": {
      "image": "assets/book/birch-reaction.png",
      "printedPage": 60,
      "pdfPage": 112,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/birch-mechanism.png",
      "printedPage": 60,
      "pdfPage": 112,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/birch-applications.png",
        "printedPage": 61,
        "pdfPage": 113,
        "caption": "Synthetic applications"
      }
    ]
  },
  "beckmann": {
    "pages": [
      50,
      51
    ],
    "reaction": {
      "image": "assets/book/beckmann-reaction.png",
      "printedPage": 50,
      "pdfPage": 102,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/beckmann-mechanism.png",
      "printedPage": 50,
      "pdfPage": 102,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/beckmann-applications.png",
        "printedPage": 51,
        "pdfPage": 103,
        "caption": "Synthetic applications"
      }
    ]
  },
  "pinacol": {
    "pages": [
      350,
      351
    ],
    "reaction": {
      "image": "assets/book/pinacol-reaction.png",
      "printedPage": 350,
      "pdfPage": 402,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/pinacol-mechanism.png",
      "printedPage": 350,
      "pdfPage": 402,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/pinacol-applications.png",
        "printedPage": 351,
        "pdfPage": 403,
        "caption": "Synthetic applications"
      }
    ]
  },
  "hofmann": {
    "pages": [
      210,
      211
    ],
    "reaction": {
      "image": "assets/book/hofmann-reaction.png",
      "printedPage": 210,
      "pdfPage": 262,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/hofmann-mechanism.png",
      "printedPage": 210,
      "pdfPage": 262,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/hofmann-applications.png",
        "printedPage": 211,
        "pdfPage": 263,
        "caption": "Synthetic applications"
      }
    ]
  },
  "baeyer": {
    "pages": [
      28,
      29
    ],
    "reaction": {
      "image": "assets/book/baeyer-reaction.png",
      "printedPage": 28,
      "pdfPage": 80,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/baeyer-mechanism.png",
      "printedPage": 28,
      "pdfPage": 80,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/baeyer-applications.png",
        "printedPage": 29,
        "pdfPage": 81,
        "caption": "Synthetic applications"
      }
    ]
  },
  "williamson": {
    "pages": [
      484,
      485
    ],
    "reaction": {
      "image": "assets/book/williamson-reaction.png",
      "printedPage": 484,
      "pdfPage": 536,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/williamson-mechanism.png",
      "printedPage": 484,
      "pdfPage": 536,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/williamson-applications.png",
        "printedPage": 485,
        "pdfPage": 537,
        "caption": "Synthetic applications"
      }
    ]
  },
  "sandmeyer": {
    "pages": [
      394,
      395
    ],
    "reaction": {
      "image": "assets/book/sandmeyer-reaction.png",
      "printedPage": 394,
      "pdfPage": 446,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/sandmeyer-mechanism.png",
      "printedPage": 394,
      "pdfPage": 446,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/sandmeyer-applications.png",
        "printedPage": 395,
        "pdfPage": 447,
        "caption": "Synthetic applications"
      }
    ]
  },
  "finkelstein": {
    "pages": [
      170,
      171
    ],
    "reaction": {
      "image": "assets/book/finkelstein-reaction.png",
      "printedPage": 170,
      "pdfPage": 222,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/finkelstein-mechanism.png",
      "printedPage": 170,
      "pdfPage": 222,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/finkelstein-applications.png",
        "printedPage": 171,
        "pdfPage": 223,
        "caption": "Synthetic applications"
      }
    ]
  },
  "chugaev": {
    "pages": [
      82,
      83
    ],
    "reaction": {
      "image": "assets/book/chugaev-reaction.png",
      "printedPage": 82,
      "pdfPage": 134,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/chugaev-mechanism.png",
      "printedPage": 82,
      "pdfPage": 134,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/chugaev-applications.png",
        "printedPage": 83,
        "pdfPage": 135,
        "caption": "Synthetic applications"
      }
    ]
  },
  "diels": {
    "pages": [
      140,
      141
    ],
    "reaction": {
      "image": "assets/book/diels-reaction.png",
      "printedPage": 140,
      "pdfPage": 192,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/diels-mechanism.png",
      "printedPage": 140,
      "pdfPage": 192,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/diels-applications.png",
        "printedPage": 141,
        "pdfPage": 193,
        "caption": "Synthetic applications"
      }
    ]
  },
  "cope": {
    "pages": [
      98,
      99
    ],
    "reaction": {
      "image": "assets/book/cope-reaction.png",
      "printedPage": 98,
      "pdfPage": 150,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/cope-mechanism.png",
      "printedPage": 98,
      "pdfPage": 150,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/cope-applications.png",
        "printedPage": 99,
        "pdfPage": 151,
        "caption": "Synthetic applications"
      }
    ]
  },
  "claisen": {
    "pages": [
      88,
      89
    ],
    "reaction": {
      "image": "assets/book/claisen-reaction.png",
      "printedPage": 88,
      "pdfPage": 140,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/claisen-mechanism.png",
      "printedPage": 88,
      "pdfPage": 140,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/claisen-applications.png",
        "printedPage": 89,
        "pdfPage": 141,
        "caption": "Synthetic applications"
      }
    ]
  },
  "ene": {
    "pages": [
      6,
      7
    ],
    "reaction": {
      "image": "assets/book/ene-reaction.png",
      "printedPage": 6,
      "pdfPage": 58,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/ene-mechanism.png",
      "printedPage": 6,
      "pdfPage": 58,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/ene-applications.png",
        "printedPage": 7,
        "pdfPage": 59,
        "caption": "Synthetic applications"
      }
    ]
  },
  "gabriel": {
    "pages": [
      182,
      183
    ],
    "reaction": {
      "image": "assets/book/gabriel-reaction.png",
      "printedPage": 182,
      "pdfPage": 234,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/gabriel-mechanism.png",
      "printedPage": 182,
      "pdfPage": 234,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/gabriel-applications.png",
        "printedPage": 183,
        "pdfPage": 235,
        "caption": "Synthetic applications"
      }
    ]
  },
  "hell": {
    "pages": [
      200,
      201
    ],
    "reaction": {
      "image": "assets/book/hell-reaction.png",
      "printedPage": 200,
      "pdfPage": 252,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/hell-mechanism.png",
      "printedPage": 200,
      "pdfPage": 252,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/hell-applications.png",
        "printedPage": 201,
        "pdfPage": 253,
        "caption": "Synthetic applications"
      }
    ]
  },
  "ritter": {
    "pages": [
      382,
      383
    ],
    "reaction": {
      "image": "assets/book/ritter-reaction.png",
      "printedPage": 382,
      "pdfPage": 434,
      "caption": "General reaction scheme"
    },
    "mechanism": {
      "image": "assets/book/ritter-mechanism.png",
      "printedPage": 382,
      "pdfPage": 434,
      "caption": "Mechanism and commentary"
    },
    "applications": [
      {
        "image": "assets/book/ritter-applications.png",
        "printedPage": 383,
        "pdfPage": 435,
        "caption": "Synthetic applications"
      }
    ]
  },
  "fischer": {
    "pages": [
      265
    ],
    "reaction": {
      "image": "assets/book/fischer-reaction.png",
      "printedPage": 265,
      "pdfPage": 317,
      "caption": "Fischer esterification in the synthesis of (±)-methyl epijasmonate"
    },
    "mechanismNote": "This book has no standalone Fischer esterification entry or mechanism figure. Its application appears within the Lieben haloform reaction chapter (p. 265).",
    "applicationIntro": "H. C. Hailes and co-workers used Fischer esterification with methanol and sulfuric acid to form a methyl ester during the synthesis of (±)-methyl epijasmonate. The same step removed a silyl protecting group; Dess–Martin oxidation then furnished the target.",
    "applications": [
      {
        "image": "assets/book/fischer-applications.png",
        "printedPage": 265,
        "pdfPage": 317,
        "caption": "Methyl epijasmonate synthesis, from the Lieben haloform applications page"
      }
    ]
  }
};
