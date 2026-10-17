(function(root){
  const data={
  "chain": [
    {
      "name": "轻轻一划",
      "target": 16,
      "board": [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        2,
        2,
        0,
        0,
        8,
        0,
        0,
        4,
        0
      ],
      "solution": [
        "left",
        "up",
        "left"
      ],
      "par": 5
    },
    {
      "name": "合到角落",
      "target": 16,
      "board": [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        4,
        8,
        2,
        0,
        2,
        0
      ],
      "solution": [
        "left",
        "up",
        "left"
      ],
      "par": 5
    },
    {
      "name": "绕开石块",
      "target": 32,
      "board": [
        0,
        8,
        0,
        16,
        0,
        -1,
        0,
        2,
        4,
        0,
        0,
        0,
        0,
        2,
        0,
        0
      ],
      "solution": [
        "left",
        "down",
        "left",
        "up"
      ],
      "par": 6
    },
    {
      "name": "留出空格",
      "target": 32,
      "board": [
        0,
        0,
        4,
        0,
        0,
        0,
        -1,
        0,
        0,
        0,
        2,
        16,
        2,
        0,
        0,
        8
      ],
      "solution": [
        "left",
        "down",
        "left",
        "up"
      ],
      "par": 6
    },
    {
      "name": "送到右下",
      "target": 32,
      "board": [
        0,
        0,
        0,
        8,
        0,
        -1,
        -1,
        0,
        16,
        0,
        4,
        2,
        0,
        2,
        0,
        0
      ],
      "exits": [
        15
      ],
      "solution": [
        "right",
        "up",
        "right",
        "down",
        "right"
      ],
      "par": 7
    },
    {
      "name": "两条通路",
      "target": 32,
      "board": [
        0,
        0,
        0,
        16,
        0,
        -1,
        2,
        0,
        0,
        -1,
        8,
        2,
        0,
        4,
        0,
        0
      ],
      "exits": [
        0
      ],
      "solution": [
        "right",
        "down",
        "left",
        "up",
        "left"
      ],
      "par": 7
    },
    {
      "name": "先腾再合",
      "target": 32,
      "board": [
        2,
        16,
        2,
        0,
        0,
        0,
        -1,
        0,
        0,
        0,
        -1,
        0,
        0,
        4,
        0,
        8
      ],
      "exits": [
        15
      ],
      "solution": [
        "left",
        "down",
        "left",
        "up",
        "left",
        "down",
        "right"
      ],
      "par": 9
    },
    {
      "name": "错位出口",
      "target": 32,
      "board": [
        16,
        8,
        0,
        0,
        0,
        -1,
        0,
        0,
        0,
        2,
        -1,
        0,
        2,
        0,
        0,
        4
      ],
      "exits": [
        0
      ],
      "solution": [
        "right",
        "down",
        "right",
        "up",
        "left"
      ],
      "par": 7
    },
    {
      "name": "穿过窄道",
      "target": 32,
      "board": [
        0,
        2,
        0,
        8,
        0,
        -1,
        -1,
        2,
        0,
        -1,
        4,
        0,
        16,
        0,
        0,
        0
      ],
      "exits": [
        15
      ],
      "solution": [
        "down",
        "right",
        "down",
        "left",
        "down",
        "left",
        "down",
        "right"
      ],
      "par": 10
    },
    {
      "name": "留一个角落",
      "target": 32,
      "board": [
        0,
        0,
        2,
        0,
        4,
        16,
        -1,
        8,
        0,
        -1,
        -1,
        0,
        2,
        0,
        0,
        0
      ],
      "exits": [
        0
      ],
      "solution": [
        "left",
        "up",
        "right",
        "up",
        "right",
        "down",
        "left",
        "up"
      ],
      "par": 10
    },
    {
      "name": "双份收纳",
      "target": 32,
      "board": [
        32,
        0,
        0,
        0,
        16,
        -1,
        -1,
        0,
        2,
        0,
        4,
        0,
        0,
        0,
        8,
        2
      ],
      "exits": [
        15
      ],
      "solution": [
        "up",
        "left",
        "down",
        "right",
        "down",
        "right",
        "down"
      ],
      "par": 9
    },
    {
      "name": "最后的空位",
      "target": 32,
      "board": [
        8,
        16,
        0,
        0,
        0,
        -1,
        0,
        0,
        32,
        2,
        -1,
        4,
        2,
        0,
        0,
        0
      ],
      "exits": [
        0
      ],
      "solution": [
        "up",
        "right",
        "up",
        "down",
        "left",
        "up",
        "left"
      ],
      "par": 9
    }
  ],
  "storage": [
    {
      "name": "刚好合适",
      "cols": 3,
      "rows": 2,
      "pieces": [
        "I2",
        "I2",
        "I2"
      ],
      "blocked": [],
      "solution": [
        {
          "x": 0,
          "y": 0,
          "rot": 0
        },
        {
          "x": 0,
          "y": 1,
          "rot": 0
        },
        {
          "x": 2,
          "y": 0,
          "rot": 1
        }
      ],
      "par": 5
    },
    {
      "name": "转个方向",
      "cols": 4,
      "rows": 3,
      "pieces": [
        "O4",
        "L3",
        "L3",
        "I2"
      ],
      "blocked": [],
      "solution": [
        {
          "x": 0,
          "y": 0,
          "rot": 0
        },
        {
          "x": 2,
          "y": 1,
          "rot": 0
        },
        {
          "x": 2,
          "y": 0,
          "rot": 2
        },
        {
          "x": 0,
          "y": 2,
          "rot": 0
        }
      ],
      "par": 6
    },
    {
      "name": "留出长边",
      "cols": 4,
      "rows": 3,
      "pieces": [
        "I3",
        "I3",
        "L3",
        "L3"
      ],
      "blocked": [],
      "solution": [
        {
          "x": 0,
          "y": 0,
          "rot": 0
        },
        {
          "x": 1,
          "y": 2,
          "rot": 0
        },
        {
          "x": 0,
          "y": 1,
          "rot": 1
        },
        {
          "x": 2,
          "y": 0,
          "rot": 3
        }
      ],
      "par": 6
    },
    {
      "name": "文具抽屉",
      "cols": 4,
      "rows": 4,
      "pieces": [
        "O4",
        "O4",
        "L4",
        "L4"
      ],
      "blocked": [],
      "solution": [
        {
          "x": 0,
          "y": 0,
          "rot": 0
        },
        {
          "x": 2,
          "y": 0,
          "rot": 0
        },
        {
          "x": 0,
          "y": 2,
          "rot": 1
        },
        {
          "x": 1,
          "y": 2,
          "rot": 3
        }
      ],
      "par": 6
    },
    {
      "name": "角落拼合",
      "cols": 4,
      "rows": 4,
      "pieces": [
        "T4",
        "T4",
        "L4",
        "Z4"
      ],
      "blocked": [],
      "solution": [
        {
          "x": 1,
          "y": 2,
          "rot": 2
        },
        {
          "x": 0,
          "y": 1,
          "rot": 3
        },
        {
          "x": 2,
          "y": 0,
          "rot": 2
        },
        {
          "x": 0,
          "y": 0,
          "rot": 0
        }
      ],
      "par": 6
    },
    {
      "name": "厨房收纳",
      "cols": 5,
      "rows": 4,
      "pieces": [
        "I4",
        "O4",
        "L4",
        "L4",
        "O4"
      ],
      "blocked": [],
      "solution": [
        {
          "x": 1,
          "y": 3,
          "rot": 0
        },
        {
          "x": 0,
          "y": 0,
          "rot": 0
        },
        {
          "x": 2,
          "y": 0,
          "rot": 1
        },
        {
          "x": 0,
          "y": 2,
          "rot": 1
        },
        {
          "x": 3,
          "y": 1,
          "rot": 0
        }
      ],
      "par": 7
    },
    {
      "name": "把大件放好",
      "cols": 5,
      "rows": 4,
      "pieces": [
        "O4",
        "L4",
        "T4",
        "L3",
        "L3",
        "I2"
      ],
      "blocked": [],
      "solution": [
        {
          "x": 0,
          "y": 0,
          "rot": 0
        },
        {
          "x": 2,
          "y": 0,
          "rot": 1
        },
        {
          "x": 1,
          "y": 2,
          "rot": 0
        },
        {
          "x": 0,
          "y": 2,
          "rot": 0
        },
        {
          "x": 3,
          "y": 1,
          "rot": 2
        },
        {
          "x": 3,
          "y": 3,
          "rot": 0
        }
      ],
      "par": 8
    },
    {
      "name": "绕开隔板",
      "cols": 5,
      "rows": 4,
      "pieces": [
        "L4",
        "T4",
        "O4",
        "L3",
        "I3"
      ],
      "blocked": [
        8,
        13
      ],
      "solution": [
        {
          "x": 2,
          "y": 0,
          "rot": 1
        },
        {
          "x": 1,
          "y": 2,
          "rot": 2
        },
        {
          "x": 0,
          "y": 0,
          "rot": 0
        },
        {
          "x": 0,
          "y": 2,
          "rot": 1
        },
        {
          "x": 4,
          "y": 1,
          "rot": 1
        }
      ],
      "par": 7
    },
    {
      "name": "靠边整理",
      "cols": 5,
      "rows": 4,
      "pieces": [
        "L4",
        "L4",
        "T4",
        "T4",
        "O4"
      ],
      "blocked": [],
      "edges": {
        "0": "top"
      },
      "solution": [
        {
          "x": 0,
          "y": 0,
          "rot": 1
        },
        {
          "x": 3,
          "y": 0,
          "rot": 2
        },
        {
          "x": 1,
          "y": 1,
          "rot": 0
        },
        {
          "x": 2,
          "y": 2,
          "rot": 2
        },
        {
          "x": 0,
          "y": 2,
          "rot": 0
        }
      ],
      "par": 7
    },
    {
      "name": "先开通道",
      "cols": 5,
      "rows": 4,
      "pieces": [
        "I4",
        "Z4",
        "L4",
        "I3",
        "L3"
      ],
      "blocked": [
        8,
        13
      ],
      "edges": {
        "0": "left"
      },
      "entry": [
        0
      ],
      "solution": [
        {
          "x": 0,
          "y": 0,
          "rot": 1
        },
        {
          "x": 1,
          "y": 1,
          "rot": 1
        },
        {
          "x": 3,
          "y": 0,
          "rot": 2
        },
        {
          "x": 2,
          "y": 3,
          "rot": 0
        },
        {
          "x": 1,
          "y": 0,
          "rot": 1
        }
      ],
      "par": 7
    },
    {
      "name": "长件先行",
      "cols": 5,
      "rows": 4,
      "pieces": [
        "I4",
        "O4",
        "L4",
        "L4",
        "O4"
      ],
      "blocked": [],
      "edges": {
        "0": "top"
      },
      "entry": [
        0
      ],
      "solution": [
        {
          "x": 0,
          "y": 0,
          "rot": 0
        },
        {
          "x": 0,
          "y": 1,
          "rot": 0
        },
        {
          "x": 2,
          "y": 0,
          "rot": 3
        },
        {
          "x": 0,
          "y": 2,
          "rot": 3
        },
        {
          "x": 3,
          "y": 2,
          "rot": 0
        }
      ],
      "par": 7
    },
    {
      "name": "旅行箱",
      "cols": 5,
      "rows": 4,
      "pieces": [
        "O4",
        "L4",
        "T4",
        "L3",
        "L3",
        "I2"
      ],
      "blocked": [],
      "edges": {
        "0": "left"
      },
      "entry": [
        0
      ],
      "solution": [
        {
          "x": 0,
          "y": 0,
          "rot": 0
        },
        {
          "x": 2,
          "y": 0,
          "rot": 1
        },
        {
          "x": 1,
          "y": 2,
          "rot": 0
        },
        {
          "x": 0,
          "y": 2,
          "rot": 0
        },
        {
          "x": 3,
          "y": 1,
          "rot": 2
        },
        {
          "x": 3,
          "y": 3,
          "rot": 0
        }
      ],
      "par": 8
    }
  ],
  "magnet": [
    {
      "name": "点亮一段",
      "cols": 2,
      "rows": 2,
      "source": 0,
      "sink": 2,
      "fixed": [
        0,
        2
      ],
      "ports": [
        2,
        3,
        2,
        3
      ],
      "solution": [
        2,
        12,
        2,
        9
      ],
      "par": 8
    },
    {
      "name": "转角相接",
      "cols": 3,
      "rows": 2,
      "source": 0,
      "sink": 3,
      "fixed": [
        0,
        3
      ],
      "ports": [
        2,
        5,
        9,
        2,
        5,
        3
      ],
      "solution": [
        2,
        10,
        12,
        2,
        10,
        9
      ],
      "par": 12
    },
    {
      "name": "绕过空心",
      "cols": 3,
      "rows": 3,
      "source": 0,
      "sink": 3,
      "fixed": [
        0,
        3
      ],
      "ports": [
        2,
        5,
        6,
        4,
        0,
        10,
        9,
        10,
        3
      ],
      "solution": [
        2,
        10,
        12,
        4,
        0,
        5,
        3,
        10,
        9
      ],
      "par": 16
    },
    {
      "name": "串起九格",
      "cols": 3,
      "rows": 3,
      "source": 0,
      "sink": 8,
      "fixed": [
        0,
        8
      ],
      "ports": [
        2,
        10,
        6,
        12,
        5,
        12,
        9,
        5,
        8
      ],
      "solution": [
        2,
        10,
        12,
        6,
        10,
        9,
        3,
        10,
        8
      ],
      "par": 18
    },
    {
      "name": "一条长路",
      "cols": 4,
      "rows": 3,
      "source": 0,
      "sink": 11,
      "fixed": [
        0,
        11
      ],
      "ports": [
        2,
        5,
        5,
        9,
        9,
        5,
        10,
        3,
        9,
        5,
        10,
        8
      ],
      "solution": [
        2,
        10,
        10,
        12,
        6,
        10,
        10,
        9,
        3,
        10,
        10,
        8
      ],
      "par": 24
    },
    {
      "name": "分支连接",
      "cols": 4,
      "rows": 3,
      "source": 0,
      "sink": 11,
      "fixed": [
        0,
        11
      ],
      "ports": [
        2,
        11,
        5,
        3,
        3,
        14,
        10,
        3,
        12,
        10,
        5,
        8
      ],
      "solution": [
        2,
        14,
        10,
        12,
        6,
        11,
        10,
        9,
        3,
        10,
        10,
        8
      ],
      "par": 24
    },
    {
      "name": "固定锚点",
      "cols": 4,
      "rows": 3,
      "source": 0,
      "sink": 11,
      "fixed": [
        0,
        11
      ],
      "ports": [
        6,
        10,
        5,
        6,
        13,
        10,
        11,
        6,
        6,
        10,
        13,
        8
      ],
      "solution": [
        6,
        10,
        10,
        12,
        7,
        10,
        14,
        9,
        3,
        10,
        11,
        8
      ],
      "par": 24
    },
    {
      "name": "整网接通",
      "cols": 4,
      "rows": 3,
      "source": 0,
      "sink": 11,
      "fixed": [
        0,
        11
      ],
      "ports": [
        2,
        11,
        11,
        6,
        3,
        15,
        14,
        3,
        12,
        7,
        10,
        8
      ],
      "solution": [
        2,
        14,
        14,
        12,
        6,
        15,
        11,
        9,
        3,
        11,
        10,
        8
      ],
      "par": 24
    }
  ],
  "sand": [
    {
      "name": "第一瓶砂",
      "bins": [
        [
          30,
          52
        ]
      ],
      "layers": [
        [
          0
        ]
      ],
      "dose": 150,
      "quota": 216,
      "maxChanges": 0,
      "par": 150
    },
    {
      "name": "分给两瓶",
      "bins": [
        [
          10,
          32
        ],
        [
          50,
          72
        ]
      ],
      "layers": [
        [
          0
        ],
        [
          1
        ]
      ],
      "dose": 150,
      "quota": 426,
      "maxChanges": 0,
      "par": 300
    },
    {
      "name": "颜色有顺序",
      "bins": [
        [
          30,
          52
        ]
      ],
      "layers": [
        [
          2,
          0
        ]
      ],
      "dose": 150,
      "quota": 426,
      "maxChanges": 0,
      "par": 300
    },
    {
      "name": "两层晚霞",
      "bins": [
        [
          10,
          32
        ],
        [
          50,
          72
        ]
      ],
      "layers": [
        [
          0,
          1
        ],
        [
          1,
          0
        ]
      ],
      "dose": 150,
      "quota": 852,
      "maxChanges": 0,
      "par": 600
    },
    {
      "name": "三色小瓶",
      "bins": [
        [
          3,
          25
        ],
        [
          30,
          52
        ],
        [
          57,
          79
        ]
      ],
      "layers": [
        [
          0
        ],
        [
          1
        ],
        [
          2
        ]
      ],
      "dose": 240,
      "quota": 1026,
      "maxChanges": 0,
      "par": 720
    },
    {
      "name": "留一层空间",
      "bins": [
        [
          10,
          32
        ],
        [
          50,
          72
        ]
      ],
      "layers": [
        [
          0,
          1
        ],
        [
          1,
          2
        ]
      ],
      "dose": 150,
      "quota": 852,
      "maxChanges": 0,
      "par": 600
    },
    {
      "name": "分流练习",
      "bins": [
        [
          10,
          32
        ],
        [
          50,
          72
        ]
      ],
      "layers": [
        [
          2,
          0
        ],
        [
          1
        ]
      ],
      "dose": 150,
      "quota": 642,
      "maxChanges": 0,
      "par": 450
    },
    {
      "name": "错开色层",
      "bins": [
        [
          3,
          25
        ],
        [
          30,
          52
        ],
        [
          57,
          79
        ]
      ],
      "layers": [
        [
          0,
          2
        ],
        [
          1,
          0
        ],
        [
          2,
          1
        ]
      ],
      "dose": 120,
      "quota": 1026,
      "maxChanges": 0,
      "par": 720
    },
    {
      "name": "三层回忆",
      "bins": [
        [
          10,
          32
        ],
        [
          50,
          72
        ]
      ],
      "layers": [
        [
          0,
          1,
          2
        ],
        [
          2,
          1,
          0
        ]
      ],
      "dose": 180,
      "quota": 1344,
      "maxChanges": 0,
      "par": 1080
    },
    {
      "name": "材料刚刚好",
      "bins": [
        [
          3,
          25
        ],
        [
          30,
          52
        ],
        [
          57,
          79
        ]
      ],
      "layers": [
        [
          0,
          1
        ],
        [
          1,
          2
        ],
        [
          2,
          0
        ]
      ],
      "dose": 120,
      "quota": 894,
      "maxChanges": 18,
      "par": 720
    },
    {
      "name": "少调一次阀",
      "bins": [
        [
          3,
          25
        ],
        [
          30,
          52
        ],
        [
          57,
          79
        ]
      ],
      "layers": [
        [
          2,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          2
        ]
      ],
      "dose": 120,
      "quota": 894,
      "maxChanges": 5,
      "par": 720
    },
    {
      "name": "彩砂收藏家",
      "bins": [
        [
          3,
          25
        ],
        [
          30,
          52
        ],
        [
          57,
          79
        ]
      ],
      "layers": [
        [
          0,
          1,
          2
        ],
        [
          1,
          2,
          0
        ],
        [
          2,
          0,
          1
        ]
      ],
      "dose": 180,
      "quota": 2010,
      "maxChanges": 10,
      "par": 1620
    }
  ],
  "fluid": [
    {
      "name": "一片薄荷湖",
      "regions": [
        {
          "x": 11,
          "y": 13,
          "w": 18,
          "h": 22,
          "color": 1
        }
      ],
      "coverage": 0.48,
      "quota": 150,
      "par": 60
    },
    {
      "name": "两岸不同色",
      "regions": [
        {
          "x": 3,
          "y": 10,
          "w": 13,
          "h": 28,
          "color": 0
        },
        {
          "x": 24,
          "y": 10,
          "w": 13,
          "h": 28,
          "color": 2
        }
      ],
      "coverage": 0.48,
      "quota": 160,
      "par": 60
    },
    {
      "name": "给中间留白",
      "regions": [
        {
          "x": 4,
          "y": 5,
          "w": 30,
          "h": 13,
          "color": 1
        },
        {
          "x": 4,
          "y": 30,
          "w": 30,
          "h": 13,
          "color": 2
        },
        {
          "x": 16,
          "y": 20,
          "w": 8,
          "h": 8,
          "protect": true
        }
      ],
      "coverage": 0.55,
      "quota": 160,
      "par": 60
    },
    {
      "name": "绕过白色河道",
      "regions": [
        {
          "x": 3,
          "y": 7,
          "w": 12,
          "h": 32,
          "color": 2
        },
        {
          "x": 25,
          "y": 7,
          "w": 12,
          "h": 32,
          "color": 0
        },
        {
          "x": 17,
          "y": 8,
          "w": 6,
          "h": 30,
          "protect": true
        }
      ],
      "coverage": 0.55,
      "quota": 140,
      "par": 60
    },
    {
      "name": "三色岛屿",
      "regions": [
        {
          "x": 3,
          "y": 4,
          "w": 14,
          "h": 17,
          "color": 0
        },
        {
          "x": 23,
          "y": 4,
          "w": 14,
          "h": 17,
          "color": 1
        },
        {
          "x": 12,
          "y": 28,
          "w": 16,
          "h": 16,
          "color": 2
        }
      ],
      "coverage": 0.55,
      "quota": 160,
      "par": 60
    },
    {
      "name": "对角的风",
      "regions": [
        {
          "x": 3,
          "y": 5,
          "w": 13,
          "h": 15,
          "color": 1
        },
        {
          "x": 24,
          "y": 28,
          "w": 13,
          "h": 15,
          "color": 2
        },
        {
          "x": 17,
          "y": 18,
          "w": 6,
          "h": 12,
          "protect": true
        }
      ],
      "coverage": 0.55,
      "quota": 120,
      "par": 60
    },
    {
      "name": "并排的颜色",
      "regions": [
        {
          "x": 3,
          "y": 5,
          "w": 10,
          "h": 38,
          "color": 0
        },
        {
          "x": 15,
          "y": 5,
          "w": 10,
          "h": 38,
          "color": 1
        },
        {
          "x": 27,
          "y": 5,
          "w": 10,
          "h": 38,
          "color": 2
        }
      ],
      "coverage": 0.62,
      "quota": 150,
      "par": 60
    },
    {
      "name": "留白收藏家",
      "regions": [
        {
          "x": 3,
          "y": 5,
          "w": 13,
          "h": 15,
          "color": 2
        },
        {
          "x": 24,
          "y": 5,
          "w": 13,
          "h": 15,
          "color": 1
        },
        {
          "x": 12,
          "y": 30,
          "w": 16,
          "h": 13,
          "color": 0
        },
        {
          "x": 15,
          "y": 21,
          "w": 10,
          "h": 6,
          "protect": true
        }
      ],
      "coverage": 0.62,
      "quota": 120,
      "par": 60
    }
  ],
  "soft": [
    {
      "name": "轻放入盒",
      "cups": [
        {
          "x": 110,
          "y": 210,
          "w": 120,
          "h": 138
        }
      ],
      "items": [
        {
          "rx": 24,
          "ry": 24,
          "color": 0,
          "x": 45,
          "y": 42,
          "cup": 0
        }
      ],
      "solution": [
        {
          "cup": 0,
          "x": 170,
          "y": 315,
          "rx": 24,
          "ry": 24
        }
      ],
      "par": 4
    },
    {
      "name": "分进两格",
      "cups": [
        {
          "x": 16,
          "y": 195,
          "w": 128,
          "h": 153
        },
        {
          "x": 190,
          "y": 195,
          "w": 128,
          "h": 153
        }
      ],
      "items": [
        {
          "rx": 26,
          "ry": 26,
          "color": 0,
          "x": 45,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 26,
          "ry": 26,
          "color": 1,
          "x": 163,
          "y": 42,
          "cup": 1
        }
      ],
      "solution": [
        {
          "cup": 0,
          "x": 80,
          "y": 315,
          "rx": 26,
          "ry": 26
        },
        {
          "cup": 1,
          "x": 254,
          "y": 315,
          "rx": 26,
          "ry": 26
        }
      ],
      "par": 8
    },
    {
      "name": "圆团留空间",
      "cups": [
        {
          "x": 16,
          "y": 195,
          "w": 128,
          "h": 153
        },
        {
          "x": 190,
          "y": 195,
          "w": 128,
          "h": 153
        }
      ],
      "items": [
        {
          "rx": 22,
          "ry": 22,
          "color": 0,
          "x": 45,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 22,
          "ry": 22,
          "color": 0,
          "x": 163,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 28,
          "ry": 28,
          "color": 1,
          "x": 281,
          "y": 42,
          "cup": 1
        }
      ],
      "solution": [
        {
          "cup": 0,
          "x": 48,
          "y": 315,
          "rx": 22,
          "ry": 22
        },
        {
          "cup": 0,
          "x": 108,
          "y": 315,
          "rx": 22,
          "ry": 22
        },
        {
          "cup": 1,
          "x": 254,
          "y": 315,
          "rx": 28,
          "ry": 28
        }
      ],
      "par": 12
    },
    {
      "name": "长团转个身",
      "cups": [
        {
          "x": 16,
          "y": 195,
          "w": 128,
          "h": 153,
          "mouth": 64
        },
        {
          "x": 190,
          "y": 195,
          "w": 128,
          "h": 153,
          "mouth": 64
        }
      ],
      "items": [
        {
          "rx": 38,
          "ry": 18,
          "color": 0,
          "x": 45,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 23,
          "ry": 23,
          "color": 1,
          "x": 163,
          "y": 42,
          "cup": 1
        },
        {
          "rx": 23,
          "ry": 23,
          "color": 1,
          "x": 281,
          "y": 42,
          "cup": 1
        }
      ],
      "solution": [
        {
          "cup": 0,
          "x": 80,
          "y": 285,
          "rx": 38,
          "ry": 18,
          "rot": 1
        },
        {
          "cup": 1,
          "x": 222,
          "y": 315,
          "rx": 23,
          "ry": 23
        },
        {
          "cup": 1,
          "x": 285,
          "y": 315,
          "rx": 23,
          "ry": 23
        }
      ],
      "par": 12
    },
    {
      "name": "穿过窄口",
      "cups": [
        {
          "x": 20,
          "y": 175,
          "w": 294,
          "h": 173,
          "mouth": 80
        }
      ],
      "items": [
        {
          "rx": 46,
          "ry": 18,
          "color": 0,
          "x": 45,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 26,
          "ry": 26,
          "color": 0,
          "x": 163,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 26,
          "ry": 26,
          "color": 0,
          "x": 281,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 26,
          "ry": 26,
          "color": 0,
          "x": 45,
          "y": 112,
          "cup": 0
        }
      ],
      "solution": [
        {
          "cup": 0,
          "x": 70,
          "y": 265,
          "rx": 46,
          "ry": 18,
          "rot": 1
        },
        {
          "cup": 0,
          "x": 140,
          "y": 315,
          "rx": 26,
          "ry": 26
        },
        {
          "cup": 0,
          "x": 202,
          "y": 315,
          "rx": 26,
          "ry": 26
        },
        {
          "cup": 0,
          "x": 270,
          "y": 315,
          "rx": 26,
          "ry": 26
        }
      ],
      "par": 16
    },
    {
      "name": "先长后圆",
      "cups": [
        {
          "x": 16,
          "y": 195,
          "w": 128,
          "h": 153,
          "mouth": 64
        },
        {
          "x": 190,
          "y": 195,
          "w": 128,
          "h": 153,
          "mouth": 64
        }
      ],
      "items": [
        {
          "rx": 22,
          "ry": 22,
          "color": 0,
          "x": 45,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 22,
          "ry": 22,
          "color": 0,
          "x": 163,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 40,
          "ry": 18,
          "color": 1,
          "x": 281,
          "y": 42,
          "cup": 1
        },
        {
          "rx": 25,
          "ry": 25,
          "color": 1,
          "x": 45,
          "y": 112,
          "cup": 1
        }
      ],
      "solution": [
        {
          "cup": 0,
          "x": 48,
          "y": 315,
          "rx": 22,
          "ry": 22
        },
        {
          "cup": 0,
          "x": 108,
          "y": 315,
          "rx": 22,
          "ry": 22
        },
        {
          "cup": 1,
          "x": 224,
          "y": 270,
          "rx": 40,
          "ry": 18,
          "rot": 1
        },
        {
          "cup": 1,
          "x": 285,
          "y": 315,
          "rx": 25,
          "ry": 25
        }
      ],
      "par": 16
    },
    {
      "name": "三个小格",
      "cups": [
        {
          "x": 8,
          "y": 175,
          "w": 92,
          "h": 173,
          "mouth": 58
        },
        {
          "x": 121,
          "y": 175,
          "w": 92,
          "h": 173,
          "mouth": 58
        },
        {
          "x": 234,
          "y": 175,
          "w": 92,
          "h": 173,
          "mouth": 58
        }
      ],
      "items": [
        {
          "rx": 29,
          "ry": 17,
          "color": 0,
          "x": 45,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 22,
          "ry": 22,
          "color": 0,
          "x": 163,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 29,
          "ry": 17,
          "color": 1,
          "x": 281,
          "y": 42,
          "cup": 1
        },
        {
          "rx": 22,
          "ry": 22,
          "color": 1,
          "x": 45,
          "y": 112,
          "cup": 1
        },
        {
          "rx": 29,
          "ry": 17,
          "color": 2,
          "x": 163,
          "y": 112,
          "cup": 2
        },
        {
          "rx": 22,
          "ry": 22,
          "color": 2,
          "x": 281,
          "y": 112,
          "cup": 2
        }
      ],
      "solution": [
        {
          "cup": 0,
          "x": 54,
          "y": 245,
          "rx": 29,
          "ry": 17,
          "rot": 1
        },
        {
          "cup": 0,
          "x": 54,
          "y": 315,
          "rx": 22,
          "ry": 22
        },
        {
          "cup": 1,
          "x": 167,
          "y": 245,
          "rx": 29,
          "ry": 17,
          "rot": 1
        },
        {
          "cup": 1,
          "x": 167,
          "y": 315,
          "rx": 22,
          "ry": 22
        },
        {
          "cup": 2,
          "x": 280,
          "y": 245,
          "rx": 29,
          "ry": 17,
          "rot": 1
        },
        {
          "cup": 2,
          "x": 280,
          "y": 315,
          "rx": 22,
          "ry": 22
        }
      ],
      "par": 24
    },
    {
      "name": "合上旅行盒",
      "cups": [
        {
          "x": 8,
          "y": 175,
          "w": 92,
          "h": 173,
          "mouth": 48
        },
        {
          "x": 121,
          "y": 175,
          "w": 92,
          "h": 173,
          "mouth": 48
        },
        {
          "x": 234,
          "y": 175,
          "w": 92,
          "h": 173,
          "mouth": 48
        }
      ],
      "items": [
        {
          "rx": 34,
          "ry": 17,
          "color": 0,
          "x": 45,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 22,
          "ry": 22,
          "color": 0,
          "x": 163,
          "y": 42,
          "cup": 0
        },
        {
          "rx": 34,
          "ry": 17,
          "color": 1,
          "x": 281,
          "y": 42,
          "cup": 1
        },
        {
          "rx": 22,
          "ry": 22,
          "color": 1,
          "x": 45,
          "y": 112,
          "cup": 1
        },
        {
          "rx": 34,
          "ry": 17,
          "color": 2,
          "x": 163,
          "y": 112,
          "cup": 2
        },
        {
          "rx": 22,
          "ry": 22,
          "color": 2,
          "x": 281,
          "y": 112,
          "cup": 2
        }
      ],
      "solution": [
        {
          "cup": 0,
          "x": 54,
          "y": 245,
          "rx": 34,
          "ry": 17,
          "rot": 1
        },
        {
          "cup": 0,
          "x": 54,
          "y": 315,
          "rx": 22,
          "ry": 22
        },
        {
          "cup": 1,
          "x": 167,
          "y": 245,
          "rx": 34,
          "ry": 17,
          "rot": 1
        },
        {
          "cup": 1,
          "x": 167,
          "y": 315,
          "rx": 22,
          "ry": 22
        },
        {
          "cup": 2,
          "x": 280,
          "y": 245,
          "rx": 34,
          "ry": 17,
          "rot": 1
        },
        {
          "cup": 2,
          "x": 280,
          "y": 315,
          "rx": 22,
          "ry": 22
        }
      ],
      "par": 24
    }
  ]
};
  if(typeof module!=='undefined')module.exports=data;else root.ChallengeData=data;
})(typeof globalThis!=='undefined'?globalThis:this);
