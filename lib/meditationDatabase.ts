export interface Meditation {
  id: string;
  title: string;
  url: string;
  category: string;
  tags: string[];
}

interface MeditationDatabase {
  meditationsMap: {
    [key: string]: Meditation;
  };
}

export const meditationDatabase: MeditationDatabase = {
  meditationsMap: {
    "1": {
      id: "1",
      title: "Успокоение тела, речи и ума",
      url: "https://soundcloud.com/contemplative-ru/sxmxc6cz31kr",
      category: "beginners",
      tags: ["basic", "body", "mind", "speech"]
    },
    "2": {
      id: "2",
      title: "Краткая медитация на сострадании",
      url: "https://soundcloud.com/contemplative-ru/03dtvyvymyqh",
      category: "compassion",
      tags: ["short", "compassion"]
    },
    "3": {
      id: "3",
      title: "Краткая медитация на любящей доброте",
      url: "https://soundcloud.com/contemplative-ru/lhtnydz3tkws",
      category: "loving_kindness",
      tags: ["short", "loving-kindness"]
    },
    "4": {
      id: "4",
      title: "Порождение сострадательной мотивации",
      url: "https://soundcloud.com/contemplative-ru/xu1iv7nohmmm",
      category: "compassion",
      tags: ["motivation", "compassion"]
    },
    "5": {
      id: "5",
      title: "Упражнение на сострадание к себе в затруднительной ситуации",
      url: "https://soundcloud.com/contemplative-ru/axlkvsel9a97",
      category: "self_compassion",
      tags: ["difficult-situations", "self-compassion"]
    },
    "6": {
      id: "6",
      title: "Медитация на любви к себе",
      url: "https://soundcloud.com/contemplative-ru/myv7rsgdckfq",
      category: "self_love",
      tags: ["self-love", "emotional-wellbeing"]
    },
    "7": {
      id: "7",
      title: "Медитация на видении потенциального счастья",
      url: "https://soundcloud.com/contemplative-ru/kbw7kjtimt7q",
      category: "happiness",
      tags: ["potential", "happiness", "vision"]
    },
    "8": {
      id: "8",
      title: "Развитие эмпатии",
      url: "https://soundcloud.com/contemplative-ru/x0rbuvam1c2q",
      category: "empathy",
      tags: ["empathy", "emotional-intelligence"]
    }
  }
}; 