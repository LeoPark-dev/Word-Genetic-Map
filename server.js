// server.js
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3001;

// Google Gemini Pro API 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 모델명 목록 (우선순위 순)
const DEFAULT_MODEL_PRIORITY = [
    'gemini-2.0-pro',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
];

const MODEL_NAMES = (process.env.GEMINI_MODEL_PRIORITY || '')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean);

if (MODEL_NAMES.length === 0) {
    MODEL_NAMES.push(...DEFAULT_MODEL_PRIORITY);
}

console.log('[Gemini] 모델 우선순위:', MODEL_NAMES.join(', '));

// 모델 초기화 - 첫 번째 사용 가능한 모델 사용
let model = genAI.getGenerativeModel({ model: MODEL_NAMES[0] });

app.use(cors());
app.use(express.json());

// 스토리 생성을 위한 프롬프트 템플릿
const STORY_TEMPLATES = {
    ko: {
        poet: (word, analysis) => 
            `당신은 시인입니다. '${word}' 단어에 대한 시를 문학적 표현들을 포함하여 써주세요. 
            이 단어의 어원은 다음과 같습니다:
            - 어근: ${analysis.root} (${analysis.rootMeaning})
            - 접두사: ${analysis.prefix} (${analysis.prefixMeaning})
            - 접미사: ${analysis.suffix} (${analysis.suffixMeaning})
            
            한국어로 시적이고 아름다운 시를 작성해주세요.`,

        robot: (word, analysis) => 
            `당신은 분석적인 AI 로봇입니다. '${word}' 단어를 기계적이고 논리적으로 분석해주세요.
            다음 정보를 바탕으로 분석하되, 기계적이고 차가운 어조로 설명해주세요:
            - 어근: ${analysis.root} (${analysis.rootMeaning})
            - 접두사: ${analysis.prefix} (${analysis.prefixMeaning})
            - 접미사: ${analysis.suffix} (${analysis.suffixMeaning})
            
            한국어로 응답해주세요.`,

        linguist: (word, analysis) => 
            `당신은 언어학자입니다. '${word}' 단어의 어원과 발달 과정을 학술적으로 설명해주세요.
            다음 정보를 바탕으로 설명해주세요:
            - 어근: ${analysis.root} (${analysis.rootMeaning})
            - 접두사: ${analysis.prefix} (${analysis.prefixMeaning})
            - 접미사: ${analysis.suffix} (${analysis.suffixMeaning})
            - 어원 배경: ${analysis.rootBackground}
            
            한국어로 응답해주세요.`,

        fantasy: (word, analysis) => 
            `당신은 판타지 소설가입니다. '${word}' 단어를 주제로 한 짧은 판타지 이야기를 들려주세요.
            다음 요소들을 이야기에 창의적으로 녹여내주세요:
            - 어근의 의미: ${analysis.rootMeaning}
            - 접두사의 의미: ${analysis.prefixMeaning}
            - 접미사의 의미: ${analysis.suffixMeaning}
            
            한국어로 마법과 환상이 가득한 이야기를 들려주세요.`,

        children: (word, analysis) => 
            `당신은 동화작가입니다. '${word}' 단어의 의미를 아이들이 이해하기 쉽게 설명하는 짧은 이야기를 들려주세요.
            다음 내용을 아이들의 눈높이에 맞게 설명해주세요:
            - 단어의 뜻: ${analysis.rootMeaning}
            - 단어의 유래: ${analysis.rootBackground}
            
            한국어로 재미있고 교육적인 이야기를 들려주세요.`
    },
    en: {
        poet: (word, analysis) => 
            `You are a poet. Write a poem about the word '${word}' with literary expressions.
            The etymology of this word is:
            - Root: ${analysis.root} (${analysis.rootMeaning})
            - Prefix: ${analysis.prefix} (${analysis.prefixMeaning})
            - Suffix: ${analysis.suffix} (${analysis.suffixMeaning})
            
            Please write a poetic and beautiful poem in English.`,

        robot: (word, analysis) => 
            `You are an analytical AI robot. Please analyze the word '${word}' mechanically and logically.
            Based on the following information, please explain in a mechanical and cold tone:
            - Root: ${analysis.root} (${analysis.rootMeaning})
            - Prefix: ${analysis.prefix} (${analysis.prefixMeaning})
            - Suffix: ${analysis.suffix} (${analysis.suffixMeaning})
            
            Please respond in English.`,

        linguist: (word, analysis) => 
            `You are a linguist. Please explain the etymology and development process of the word '${word}' academically.
            Please explain based on the following information:
            - Root: ${analysis.root} (${analysis.rootMeaning})
            - Prefix: ${analysis.prefix} (${analysis.prefixMeaning})
            - Suffix: ${analysis.suffix} (${analysis.suffixMeaning})
            - Etymology Background: ${analysis.rootBackground}
            
            Please respond in English.`,

        fantasy: (word, analysis) => 
            `You are a fantasy writer. Tell a short fantasy story about the word '${word}'.
            Please creatively incorporate these elements into the story:
            - Root meaning: ${analysis.rootMeaning}
            - Prefix meaning: ${analysis.prefixMeaning}
            - Suffix meaning: ${analysis.suffixMeaning}
            
            Please write a magical and fantastical story in English.`,

        children: (word, analysis) => 
            `You are a children's book author. Tell a short story explaining the meaning of the word '${word}' in a way that children can easily understand.
            Please explain the following content at a child's level:
            - Word meaning: ${analysis.rootMeaning}
            - Word origin: ${analysis.rootBackground}
            
            Please write a fun and educational story in English.`
    }
};

const wordData = {
  "spectacle": {
    "structure": {
      "prefix": null,
      "root": {
        "text": "spect",
        "meaning": "보다 (to look, to see)"
      },
      "suffix": {
        "text": "-acle",
        "meaning": "명사를 만드는 접미사 : ~하는 도구, ~하는 것"
      }
    },
    "components": {
      "root": {
        "origin": "라틴어 specere",
        "meaning": "to look, to see (보다)",
        "cultural": "고대 로마 사회에서 spectare는 단순히 보는 것을 넘어 '공공의 시선 아래 무언가를 바라보다'는 뜻으로 사용되었음. 로마의 원형경기장 (Colosseum)에서의 spectacle은 대중이 지켜보는 장대한 전시나 공연을 의미했음."
      },
      "suffix": {
        "origin": "라틴어 -aculum",
        "meaning": "도구 또는 수단을 나타내는 명사형 접미사",
        "effect": "'~하는 것', '~의 결과', 또는 '~를 위한 도구'를 의미"
      }
    },
    "meaning": {
      "basic": "a visually striking performance or display (시각적으로 인상적인 공연 또는 장면)",
      "extended": [
        "어떤 사건이나 장면이 사람들의 시선을 끄는 구경거리가 될 때 사용",
        "종종 부정적 뉘앙스로도 쓰임 → '우스꽝스러운 꼴'이라는 뜻으로도 사용됨 ('He made a spectacle of himself.')"
      ],
      "etymological": "spectacle = something to be looked at → '보는 것을 위한 것', '시선을 끄는 장면 또는 물건'"
    },
    "derivatives": [
      "inspect: 안을 들여다보다 → 조사하다",
      "respect: 다시 보다 → 존중하다",
      "suspect: 아래로 보다 → 의심하다",
      "expect: 밖을 보다 → 기대하다",
      "prospect: 앞으로 보다 → 전망, 가능성",
      "retrospect: 뒤를 보다 → 회상",
      "circumspect: 주위를 보다 → 신중한",
      "aspect: ~쪽을 보다 → 양상, 모습",
      "spectator: 보는 사람 → 관객",
      "specter: 보이는 유령 → 유령, 환영",
      "spectacles: 보는 도구 → 안경 (복수형 형태로 사용)",
      "perspective: 관점을 갖고 보다 → 관점, 시각",
      "speculate: 보다에서 시작 → 사색하다, 추측하다",
      "conspicuous: 함께+보다 → 눈에 띄는"
    ],
    "cultural": "고대 로마 시대의 spectacula (복수형)는 검투사 경기, 연극, 군사 퍼레이드 등 공공 구경거리를 의미. 로마인의 여가 문화는 '보는 것' 중심이었으며, 이 문화에서 spectacle은 권력의 과시, 국가의 위엄을 전달하는 도구로 사용되었음. 중세를 거치며 spectacle은 종교적 의례, 축제, 왕실 행사를 지칭하는 단어로 확장. 근대 이후에는 시각적으로 압도적인 경험(공연, 영화 등)을 가리키는 중립적 또는 긍정적 의미로 정착."
  },
  "inspect": {
    "structure": {
      "prefix": {
        "text": "in-",
        "meaning": "안으로"
      },
      "root": {
        "text": "spect",
        "meaning": "보다"
      },
      "suffix": null
    },
    "components": {
      "root": {
        "origin": "라틴어 specere",
        "meaning": "to look, to see (보다)",
        "related": ["spectare (to watch)", "speculum (거울)"],
        "cultural": "고대 로마 사회에서 시각, 관찰, 공공성이라는 맥락에서 중요한 역할을 함. 공공 연설, 신의 계시, 점술, 연극 등에서 보는 행위는 진실, 권위, 통제의 수단으로 여겨짐. 단순히 '시각'의 개념을 넘어서, 관찰과 판단의 도구로 'spect' 계열의 단어가 발전."
      },
      "prefix": {
        "origin": "라틴어 in-",
        "meaning": "into, in (안으로)",
        "effect": "단어에 '안으로 들여다보다'는 의미를 부여. 단순히 '보다(spect)'가 아닌, 대상을 깊이 관찰하거나 조사한다는 의미로 확장."
      }
    },
    "meaning": {
      "basic": "to look into carefully; to examine (주의 깊게 들여다보다; 조사하다)",
      "extended": [
        "공식 문서, 건축물, 시스템, 제품 등을 검사하거나 감시하는 공식적인 절차를 포함",
        "사물의 겉이 아니라 내부와 세부까지 들여다보는 것을 강조"
      ],
      "etymological": "in- (into) + spect (look) → '안을 들여다보다' → 조사하다, 면밀히 검토하다"
    },
    "derivatives": [
      "inspect: 안을 들여다보다 → 조사하다",
      "respect: 다시 보다 → 존중하다",
      "suspect: 아래로 보다 → 의심하다",
      "expect: 밖을 보다 → 기대하다",
      "prospect: 앞으로 보다 → 전망, 가능성",
      "retrospect: 뒤를 보다 → 회상",
      "circumspect: 주위를 보다 → 신중한",
      "aspect: ~쪽을 보다 → 양상, 모습",
      "spectator: 보는 사람 → 관객",
      "specter: 보이는 유령 → 유령, 환영",
      "spectacles: 보는 도구 → 안경",
      "perspective: 관점을 갖고 보다 → 관점, 시각",
      "speculate: 보다에서 시작 → 사색하다, 추측하다",
      "conspicuous: 함께+보다 → 눈에 띄는"
    ],
    "cultural": "inspect라는 단어는 고대 로마 행정 및 군사 체계에서 감찰관(inspector)이 수행하던 역할과 관련 깊음. 이들은 병사, 건축, 기록 등을 면밀히 살펴보고 문제가 없는지 파악하는 역할을 맡음. 중세 유럽에서는 종교적 심문과 재판 절차에서도 'inspect'의 개념이 적용되어, 인간의 내면(신앙, 양심)을 '조사'하는 관점으로 발전. 근대에 들어서는 산업혁명 이후의 기계 점검, 법률 감사, 교육 평가 등 체계적인 '조사' 행위로서의 의미가 확장됨. 오늘날에는 공공 행정(health inspection), 보안(security inspection), 교육 시험(test inspection) 등 광범위하게 사용됨."
  },
  "respect": {
    "structure": {
      "prefix": {
        "text": "re-",
        "meaning": "다시, 거슬러"
      },
      "root": {
        "text": "spect",
        "meaning": "보다"
      },
      "suffix": null
    },
    "components": {
      "root": {
        "origin": "라틴어 specere",
        "meaning": "to look, to see (보다)",
        "related": ["spectare (to watch)", "speculum (거울)"],
        "cultural": "고대 로마 사회에서 spectare는 단순히 보는 것이 아닌, 공공의 행위나 인물에 대한 주의 깊은 주시 또는 관심의 의미로도 사용됨. 이는 정치, 종교, 철학적 상황에서의 '관찰'을 넘어 평가와 존중의 태도로 발전함."
      },
      "prefix": {
        "origin": "라틴어 re-",
        "meaning": "again, back (다시, 거슬러)",
        "effect": "동작이나 태도를 되돌아봄, 재확인, 또는 반응적 태도로 전환하는 느낌을 줌. 이 경우, 단순히 '보다(spect)'가 아닌, 다시 바라보고 주의를 기울이다는 뉘앙스를 부여."
      }
    },
    "meaning": {
      "basic": "to look back at with regard; to admire (다시 바라보다 → 존경하다, 존중하다)",
      "extended": [
        "경의, 존경, 또는 타인에 대한 배려나 관심",
        "어떤 사람이나 사물의 가치, 존재, 감정 등을 인정하고 중시하는 태도"
      ],
      "etymological": "re- (again/back) + spect (look) → '다시 바라보다, 되돌아보다' → 존경하다, 주의 깊게 고려하다"
    },
    "derivatives": [
      "inspect: 안을 들여다보다 → 조사하다",
      "respect: 다시 보다 → 존중하다",
      "suspect: 아래로 보다 → 의심하다",
      "expect: 밖을 보다 → 기대하다",
      "prospect: 앞으로 보다 → 전망, 가능성",
      "retrospect: 뒤를 보다 → 회상",
      "circumspect: 주위를 보다 → 신중한",
      "aspect: ~쪽을 보다 → 양상, 모습",
      "spectator: 보는 사람 → 관객",
      "specter: 보이는 유령 → 유령, 환영",
      "spectacles: 보는 도구 → 안경",
      "perspective: 관점을 갖고 보다 → 관점, 시각",
      "speculate: 보다에서 시작 → 사색하다, 추측하다",
      "conspicuous: 함께+보다 → 눈에 띄는"
    ],
    "cultural": "respect는 고대 라틴어 respectus ('a looking back at, regard, consideration')에서 파생되었으며, 이는 단지 육체적인 '시선'이 아니라 도덕적 주의, 평가, 고려의 개념을 내포함. 중세 및 르네상스 시대에는 사회적 지위나 권위를 인식하고 그에 맞는 태도를 갖는 것이 중요시되며, '존경'이라는 의미로 정착. 근현대에 와서는 사람, 문화, 관습, 의견 등 다양한 사회적 요소에 대한 배려와 인정의 태도를 뜻하는 핵심 윤리어로 자리잡음. 철학, 인권, 민주주의 담론에서도 respect는 자율성, 타인의 권리 존중이라는 중요한 개념어로 사용됨 (ex: Kant의 인간존엄 개념)."
  },
  "predict": {
    "structure": {
      "prefix": {
        "text": "pre-",
        "meaning": "미리, 앞서 (before)"
      },
      "root": {
        "text": "dict",
        "meaning": "말하다 (to say, to speak)"
      },
      "suffix": null
    },
    "components": {
      "root": {
        "origin": "라틴어 dicere",
        "meaning": "말하다, 선언하다",
        "related": ["dictum (말, 격언)", "dictator (말하는 사람 → 명령자)"],
        "cultural": "고대 로마에서 dicere는 단순한 발화가 아니라, 공식적 선언이나 법적 진술을 의미. 정치, 종교, 법률 영역에서 '말'은 권위의 전달 수단으로 사용되었으며, 신탁(oracle), 예언, 법령은 모두 dict 계열로 표현됨."
      },
      "prefix": {
        "origin": "라틴어 prae-",
        "meaning": "앞서, 미리 (before)",
        "effect": "시간적으로 먼저, 앞에, 예측하는 태도나 사전 발화를 나타냄. dict와 결합하여 '앞서 말하다', 즉 예언하거나 예측하다는 의미 생성."
      }
    },
    "meaning": {
      "basic": "to say something before it happens; to foretell (어떤 일이 일어나기 전에 말하다; 예언하다)",
      "extended": [
        "날씨, 정치, 경기, 심리 상태 등 과학적·경험적 기반에서 추론하는 경우",
        "종교, 점성술, 신화에서는 신적 계시나 통찰에 의한 예언으로 사용됨"
      ],
      "etymological": "pre- (before) + dict (say) → '앞서 말하다' → 예측하다, 예언하다"
    },
    "derivatives": [
      "predict: 미리 말하다 → 예측하다",
      "dictate: 명령하듯 말하다 → 지시하다",
      "dictator: 명령하는 사람 → 독재자",
      "verdict: 진실을 말하다 → 평결",
      "contradict: 반대하여 말하다 → 반박하다",
      "indict: 안으로 말하다 → 기소하다",
      "benediction: 좋은 말을 하다 → 축복",
      "malediction: 나쁜 말을 하다 → 저주",
      "dictionary: 말의 모음 → 사전",
      "addict: ~에 말하다 → 중독자 (→ 원래는 '헌신하다'는 뜻)",
      "jurisdiction: 법적으로 말할 권한 → 사법권"
    ],
    "cultural": "predict의 개념은 고대 로마의 사제들과 점성술사들이 미래 사건을 '미리 말하는' 신탁적 전통에서 유래함. 초기에는 신의 계시, 꿈 해석, 제물의 내장 관찰 등을 통해 미래를 말하는 행위로서 신성한 의미를 가졌음. 중세에는 예언자(prophet)들이 predictio를 통해 종교적 미래를 선포하는 도구로 사용. 근세 이후에는 과학적 방법론(통계, 확률, 패턴 분석)을 통해 예측이라는 세속적 개념으로 확장됨. 오늘날에는 인공지능, 기상학, 경제학, 심리학 등에서도 핵심 용어로 사용됨."
  },
  "contradict": {
    "structure": {
      "prefix": {
        "text": "contra-",
        "meaning": "~에 반하여, 반대하여 (against)"
      },
      "root": {
        "text": "dict",
        "meaning": "말하다 (to say, to speak)"
      },
      "suffix": null
    },
    "components": {
      "root": {
        "origin": "라틴어 dicere",
        "meaning": "말하다, 선언하다",
        "related": ["dictum (격언, 진술)", "dictator (명령하는 사람)"],
        "cultural": "고대 로마에서 dicere는 법률적 선언, 신탁, 공식적 발표를 포함하는 '권위 있는 말하기'의 행위. 이는 단순한 발화가 아니라 진리를 표명하거나 법적 효력을 가지는 언어 행위였음."
      },
      "prefix": {
        "origin": "라틴어 contra",
        "meaning": "against, opposite (반대하여)",
        "effect": "어떤 의견, 진술, 주장을 정면으로 반박하거나 거스른다는 개념을 부여. dict와 결합하여, '말에 반대하다', 즉 논박하거나 모순을 드러낸다는 뜻으로 확장됨."
      }
    },
    "meaning": {
      "basic": "to speak against; to assert the opposite (반대하여 말하다; 정반대를 주장하다)",
      "extended": [
        "논리적 모순, 주장의 반박, 자기모순(self-contradiction) 등에서 사용",
        "종종 사람 간의 논쟁, 반대 의견 제시에서 사용되며, 정중함과 무례함의 경계에 있는 행위로 인식되기도 함"
      ],
      "etymological": "contra- (against) + dict (say) → '말에 반하여 말하다' → 반박하다, 부정하다, 모순되다"
    },
    "derivatives": [
      "predict: 미리 말하다 → 예측하다",
      "dictate: 지시하듯 말하다 → 명령하다",
      "dictator: 명령하는 사람 → 독재자",
      "verdict: 진실을 말하다 → 평결",
      "contradict: 반대하여 말하다 → 반박하다",
      "indict: 안으로 말하다 → 기소하다",
      "benediction: 좋은 말 → 축복",
      "malediction: 나쁜 말 → 저주",
      "dictionary: 말을 모은 것 → 사전",
      "addict: ~에 대해 말하다 → 중독자 (원래는 헌신하는 사람)",
      "jurisdiction: 말할 수 있는 권한 → 사법권, 관할권"
    ],
    "cultural": "contradict는 고대 수사학과 철학의 핵심 개념 중 하나인 반대 명제(antithesis), 논박(refutation)과 깊은 관련이 있음. 로마 및 중세 법률 제도에서는, 어떤 주장을 정식으로 반박하는 말하기 행위가 중요한 절차였고, 이에 contradicere라는 용어가 사용됨. 이는 법정에서의 반대 주장 제기를 의미했음. 신학과 철학에서도 진리에 대한 이견을 표현할 때, contradictio는 이단성 여부, 논리적 정당성을 판단하는 기준이었음. 오늘날에는 철학, 법률, 논리학, 토론뿐 아니라 일상 대화에서도 핵심적 기능을 수행하는 개념어로 자리잡고 있음."
  },
  "dictionary": {
    "structure": {
      "prefix": null,
      "root": {
        "text": "dict",
        "meaning": "말하다 (to say, to speak)"
      },
      "suffix": {
        "text": "-ary",
        "meaning": "~와 관련된 것, ~의 장소 또는 모음 (related to, collection or repository)"
      }
    },
    "components": {
      "root": {
        "origin": "라틴어 dicere",
        "meaning": "to say, to speak (말하다)",
        "related": ["dictio (말하기, 표현)", "dictum (격언, 선언)"],
        "cultural": "고대 로마에서 dictio는 단순한 말하기를 넘어서 말의 예술, 법적 발언, 수사학적 표현을 포함. 이 어근은 언어, 권위, 진술의 뿌리가 되는 개념어였음. dictionary는 라틴어 dictionarium에서 유래 → 'a collection of words and expressions'"
      },
      "suffix": {
        "origin": "라틴어 -arius",
        "meaning": "~에 관한, ~을 담은 장소 또는 모음",
        "effect": "무언가의 집합, 저장소, 또는 특정 주제와 관련된 자료를 담은 곳. dictionary에서 -ary는 '말의 모음, 어휘의 저장소'라는 뜻으로 사용됨."
      }
    },
    "meaning": {
      "basic": "a reference book or resource containing words and their meanings (단어와 그 의미를 담은 참고 서적 또는 자료)",
      "extended": [
        "단어의 뜻뿐 아니라 발음, 품사, 용법, 어원 등을 설명하는 종합 언어 정보서",
        "디지털 시대에는 멀티미디어 사전, 언어 데이터베이스, AI 기반 어휘 분석 툴로도 확장"
      ],
      "etymological": "dict (말하다) + -ary (모음, 장소) → '말(단어)을 모아놓은 장소' → 사전"
    },
    "derivatives": [
      "predict: 미리 말하다 → 예측하다",
      "dictate: 명령하듯 말하다 → 지시하다",
      "dictator: 명령하는 사람 → 독재자",
      "verdict: 진실을 말하다 → 평결",
      "contradict: 반대하여 말하다 → 반박하다",
      "indict: 안으로 말하다 → 기소하다",
      "benediction: 좋은 말 → 축복",
      "malediction: 나쁜 말 → 저주",
      "dictionary: 말을 모은 것 → 사전",
      "addict: ~에 대해 말하다 → 중독자 (원래는 헌신자)",
      "jurisdiction: 말할 권리 → 사법권"
    ],
    "cultural": "dictionary라는 단어는 13세기 이탈리아의 Johannes de Garlandia가 처음 사용한 'Dictionarius'라는 라틴어에서 유래. 이 책은 라틴어 단어들을 정리한 학생용 단어 목록집이었음. 중세와 르네상스 시대에는 라틴어→현지어, 혹은 현지어→라틴어 번역을 위한 도구로 발전하며, 언어 보존 및 지식 축적의 핵심 도구로 기능. 근대 인쇄술의 발전과 함께, 각 민족의 고유 언어로 된 대중용 사전이 확산됨. 대표적 사례: Samuel Johnson의 『A Dictionary of the English Language』 (1755), Noah Webster의 『An American Dictionary of the English Language』 (1828). 오늘날에는 AI 기반, 음성인식, 자동번역, 대화형 사전 등으로 진화하며, 언어와 인공지능 기술의 접점에 있는 핵심 정보 인프라로 작용함."
  },
  "benefit": {
    "structure": {
      "prefix": {
        "text": "bene-",
        "meaning": "잘, 좋게 (well, good)"
      },
      "root": {
        "text": "fit (fac)",
        "meaning": "만들다, 하다 (to make, to do)"
      },
      "suffix": null
    },
    "components": {
      "root": {
        "origin": "라틴어 facere",
        "meaning": "to make, to do (만들다, 행하다)",
        "related": ["factum (행위, 만들어진 것)", "facilis (하기 쉬운 → easy)"],
        "cultural": "facere는 라틴어에서 능동적 창조 행위를 의미하며, 신의 창조, 인간의 노동, 기술의 실행 등 폭넓은 분야에서 사용됨. 후에 '-fit'이라는 변형형이 benefit과 같은 합성어에서 등장"
      },
      "prefix": {
        "origin": "라틴어 bene",
        "meaning": "well, good (잘, 좋게)",
        "effect": "도덕적으로 옳거나 유익함을 암시. bene-는 보통 긍정적 효과, 선의, 도움을 나타냄."
      }
    },
    "meaning": {
      "basic": "something that promotes well-being or is helpful; an advantage (유익함, 이익; 복지, 혜택)",
      "extended": [
        "사회적·경제적 맥락에서는 복리후생, 보조금, 보험 혜택, 사회 안전망 등을 뜻함",
        "동사형으로는 '이익을 얻다' 또는 '도움을 주다'의 의미로 사용됨"
      ],
      "etymological": "bene- (good) + fit (make/do) → '좋은 것을 만들어내다' → 이익, 유익함"
    },
    "derivatives": [
      "benefit: 좋은 것을 만들다 → 이익, 혜택",
      "satisfy: 충만하게 하다 → 만족시키다",
      "manufacture: 손으로 만들다 → 제조하다",
      "perfect: 완전하게 만들다 → 완전한",
      "defect: 결함 있는 만들기 → 결함, 흠",
      "effect: 밖으로 만들어진 것 → 효과",
      "infect: 안으로 행동하다 → 감염시키다",
      "fiction: 만들어진 것 → 허구, 소설",
      "facilitate: 쉽게 하게 만들다 → 용이하게 하다",
      "proficient: 앞서서 잘 만들다 → 능숙한",
      "efficient: 밖으로 잘 만들다 → 효율적인",
      "benevolent: 좋은 의지를 가진 → 자비로운",
      "benediction: 좋은 말 → 축복",
      "benefactor: 좋은 일을 하는 사람 → 후원자",
      "beneficence: 선행, 자선",
      "benign: 부드럽고 유익한 → 온화한, 양성의"
    ],
    "cultural": "benefit는 라틴어 bene facere ('to do well')에서 직접적으로 파생된 단어이며, 이는 선행, 공익, 도움의 개념과 직결됨. 고대 로마에서는 귀족들이 가난한 시민에게 주던 원조(기부금, 식량 등)를 beneficia라고 불렀고, 이 개념이 중세의 봉신 관계에서 주어지는 토지나 특권(benefice)로 이어짐. 중세 영어로 들어오면서 benefit는 물질적 이익뿐 아니라 도덕적, 사회적, 제도적 혜택을 모두 포함하는 용어로 확장됨. 오늘날에는 경제학, 경영학, 사회복지, 고용 제도, 심리학 등 다양한 분야에서 핵심 개념으로 자리잡음."
  },
  "benevolent": {
    "structure": {
      "prefix": {
        "text": "bene-",
        "meaning": "잘, 선하게 (well, good)"
      },
      "root": {
        "text": "vol",
        "meaning": "의지, 뜻 (will, wish)"
      },
      "suffix": {
        "text": "-ent",
        "meaning": "~하는 성질이 있는, ~한 상태의 (having the quality of, inclined to)"
      }
    },
    "components": {
      "root": {
        "origin": "라틴어 voluntas",
        "meaning": "의지, 바람, 뜻 (will, desire)",
        "related": ["velle (원하다, 바라다)", "voluntarius (자발적인)"],
        "cultural": "vol은 고대 라틴 세계에서 인간 또는 신의 내면적 동기를 표현하는 중요한 개념. 신의 뜻(divine will), 시민의 의무, 자발적 행위 등에서 도덕적 선택과 선의를 표현하는 데 쓰였음."
      },
      "prefix": {
        "origin": "라틴어 bene",
        "meaning": "well, good (잘, 좋게)",
        "effect": "도덕적 선의, 선행, 자비로움을 암시. bene-는 vol과 결합해 '좋은 의지를 가진'이라는 뜻이 됨."
      },
      "suffix": {
        "origin": "라틴어 -ens, -entis",
        "meaning": "현재 분사형 접미사",
        "effect": "'~하는 성질이 있는', '~하는 사람' 또는 '~의 상태에 있는'. 형용사로 쓰이면 어떤 성질이나 상태를 지닌 의미를 나타냄."
      }
    },
    "meaning": {
      "basic": "well-meaning and kindly; having a good will (선의의, 자비로운, 친절한)",
      "extended": [
        "도움이 되려는 의지, 타인에 대한 배려, 이타성, 관용 등을 의미",
        "개인적 성격뿐 아니라, 자선 기관, 법인, 제도적 정책의 성격 묘사에도 자주 사용됨"
      ],
      "etymological": "bene- (good) + vol (will) + -ent (having) → '좋은 의지를 가진' → 자비로운, 친절한, 이타적인"
    },
    "derivatives": [
      "benefit: 좋은 것을 만들다 → 이익, 혜택",
      "benevolent: 좋은 뜻을 가진 → 자비로운",
      "benediction: 좋은 말 → 축복",
      "benefactor: 좋은 일을 하는 사람 → 후원자",
      "beneficence: 선행, 자선",
      "benign: 부드럽고 유익한 → 온화한, 양성의",
      "malevolent: 나쁜 의지를 가진 → 악의적인",
      "volunteer: 자발적으로 나서는 사람 → 자원봉사자",
      "volition: 의지 작용 → 결단력, 자의",
      "involuntary: 의도하지 않은 → 무의식적인, 본능적인"
    ],
    "cultural": "benevolent는 라틴어 benevolentia에서 유래하였으며, 이는 로마 시대의 덕성, 명예, 시민적 미덕과 관련된 중요한 개념어였음. 고대 로마와 중세 기독교 세계에서는 '선한 의지를 가진 사람'이 가장 이상적인 시민이자 신앙인의 모습으로 여겨졌음. 르네상스 이후 인간 중심주의와 자선 개념이 발전하며, benevolent는 자선 단체, 박애주의적 행동, 관대한 지도자상을 표현하는 핵심 단어가 됨. 오늘날에는 비영리 단체, 사회적 가치 지향 기업, 공공복지의 성격을 나타내는 데에도 자주 사용됨 (예: benevolent fund, benevolent society)."
  },
  "aquatic": {
    "structure": {
      "prefix": null,
      "root": {
        "text": "aqua",
        "meaning": "물 (water)"
      },
      "suffix": {
        "text": "-ic",
        "meaning": "~와 관련된, ~의 성질을 가진 (pertaining to, related to)"
      }
    },
    "components": {
      "root": {
        "origin": "라틴어 aqua",
        "meaning": "물 (water)",
        "related": ["aqueductus (물을 이끄는 → 수도교)", "aquarium (물을 담는 그릇 → 수족관)"],
        "cultural": "고대 로마는 물 관리와 수로 기술(aqueduct)로 유명했으며, 이로 인해 aqua는 도시문명, 공중 위생, 생명의 근원이라는 상징적 의미를 가짐. 라틴어 aqua는 이후 유럽 전역의 언어(프랑스어 eau, 이탈리아어 acqua, 영어 aquatic)에 영향을 주며, 과학·환경·건축 등에서 보편적인 어근으로 자리잡음."
      },
      "suffix": {
        "origin": "그리스어 -ikos, 라틴어 -icus",
        "meaning": "~에 관한, ~와 관련된",
        "effect": "형용사형 접미사로, 특정 대상, 성질, 속성에 관련된 의미를 부여. aquatic에서는 '물에 관련된, 물에서 살아가는'의 의미를 형성."
      }
    },
    "meaning": {
      "basic": "relating to water; living or growing in water (물과 관련된; 물속에서 사는 또는 자라는)",
      "extended": [
        "수중 생태계에 사는 생물(예: aquatic plants, aquatic animals)",
        "스포츠나 활동(예: aquatic sports, aquatic center)과 연관",
        "수생 환경, 해양 생물학, 수질 관리 등에서도 빈번히 사용됨"
      ],
      "etymological": "aqua (water) + -ic (related to) → '물과 관련된' → 수생의, 물속의"
    },
    "derivatives": [
      "aquatic: 물과 관련된 → 수생의",
      "aquarium: 물을 담는 용기 → 수족관",
      "aqueduct: 물을 이끄는 것 → 수도교",
      "aquifer: 지하수를 담고 있는 지층 → 대수층",
      "aquaplane: 물 위를 미끄러지듯 타는 보드 → 수상 활공판",
      "aquarelle: 물로 그린 것 → 수채화",
      "subaqueous: 물 아래의 → 수중의",
      "aqua regia: 왕의 물 → 금을 녹이는 강산 혼합물 (황산+염산)",
      "poetic: 시에 관한 → 시적인",
      "historic: 역사에 관한 → 역사적인",
      "athletic: 운동에 관련된 → 운동의",
      "metallic: 금속과 관련된 → 금속성의",
      "scientific: 과학과 관련된 → 과학적인",
      "biologic: 생물과 관련된 → 생물학적인"
    ],
    "cultural": "aquatic이라는 단어는 고대 로마의 수도 및 도시계획 기술에서 기원하며, aqua는 곧 문명과 위생, 생존의 기반을 의미했음. 르네상스와 계몽주의 시대에 들어서면서 자연과학의 분화가 활발해졌고, aquatic biology, aquatic chemistry와 같은 학문 용어로 확장됨. 현대에는 기후 변화, 생물 다양성, 환경 보존과 관련된 분야에서 핵심적인 과학 용어로 사용되고 있음."
  },
  "aquarium": {
    "structure": {
      "prefix": null,
      "root": {
        "text": "aqua",
        "meaning": "물 (water)"
      },
      "suffix": {
        "text": "-arium",
        "meaning": "장소, 그릇, 저장 공간 (a place for, a container for)"
      }
    },
    "components": {
      "root": {
        "origin": "라틴어 aqua",
        "meaning": "물 (water)",
        "related": ["aquae ductus (수도)", "aqua vitae (생명의 물 → 알코올)"],
        "cultural": "고대 로마는 aqua를 공공의 필수 자원으로 간주했고, 이를 운반하기 위한 aqueduct는 문명의 상징이자 기술적 자랑거리. 물은 단지 생존을 위한 요소가 아니라 정화, 치유, 통치력의 상징이기도 했음."
      },
      "suffix": {
        "origin": "라틴어 -arium",
        "meaning": "~을 위한 장소 또는 용기 (a place or container for)",
        "effect": "특정한 목적이나 대상을 보관하거나 전시하는 공간을 의미. 예: planetarium (행성을 보여주는 장소), terrarium (육지 생물을 키우는 용기)."
      }
    },
    "meaning": {
      "basic": "a container or place for keeping aquatic organisms (수생 생물을 기르는 용기 또는 장소)",
      "extended": [
        "개인용 수조뿐 아니라 공공 전시 공간, 교육 목적의 수족관도 포함",
        "현대에는 생태계 보존, 해양 교육, 환경 감시 기능을 포함한 복합 공간으로 발전"
      ],
      "etymological": "aqua (water) + -arium (place/container) → '물을 위한 장소' → 수족관, 물속 생물을 위한 공간"
    },
    "derivatives": [
      "aquarium: 물을 위한 장소 → 수족관",
      "aquatic: 물과 관련된 → 수생의",
      "aqueduct: 물을 이끄는 것 → 수도교",
      "aquifer: 물을 품은 지층 → 대수층",
      "aquaplane: 물 위를 활주하는 판 → 수상 활주판",
      "aquarelle: 물로 그린 것 → 수채화",
      "subaqueous: 물 아래의 → 수중의",
      "terrarium: 땅의 장소 → 건조 생물 사육 용기",
      "planetarium: 행성의 장소 → 천체 투영관",
      "vivarium: 생물을 위한 장소 → 생물 사육실",
      "sanitarium: 건강을 위한 장소 → 요양원",
      "herbarium: 식물을 보관하는 장소 → 식물 표본관",
      "librarium: 책이 모인 장소 → 도서관 (library의 어근)"
    ],
    "cultural": "aquarium이라는 단어는 19세기 중반에 처음 일반화됨. 특히 1853년 런던 동물학회(Zoological Society of London)에서 세계 최초의 공공 Aquarium이 개관되며 대중화됨. 산업혁명 이후 유리 제작 기술과 펌프 기술의 발달로 인해 일반 가정에서도 소형 aquarium 사용이 가능해졌으며, 과학적 관찰과 취미가 결합된 형태로 확산됨. 현대 수족관은 생물학, 환경교육, 보존활동 등 다양한 역할을 수행하는 복합 과학 문화 공간으로 발전. 또한 aquarium은 해양 생물과 인간의 관계, 생태계 보존 의식을 높이는 상징적 장소로 여겨짐."
  },
  "chronology": {
    "structure": {
      "prefix": null,
      "root": {
        "text": "chron",
        "meaning": "시간 (time)"
      },
      "suffix": {
        "text": "-logy",
        "meaning": "학문, 연구, 체계적인 지식 (study of, discourse on)"
      }
    },
    "components": {
      "root": {
        "origin": "고대 그리스어 khronos (χρόνος)",
        "meaning": "시간 (time)",
        "related": ["Chronos (시간의 의인화 또는 신격화된 존재)"],
        "cultural": "chron은 그리스 신화에서 시간 그 자체를 상징하는 존재로, '크로노스(Chronos)'는 시간이 모든 것을 삼켜버리는 존재로 묘사됨. 고대 그리스에서 chronos는 인간 경험의 지속성, 즉 과거-현재-미래의 연속성 개념을 나타내며, 역사·천문학·철학에서 핵심어로 자리잡음. 로마 시대에도 연대기적 시간 개념(chronological time)은 역사의 기록과 질서화의 핵심으로 계승됨."
      },
      "suffix": {
        "origin": "고대 그리스어 -logia (λογία), logos (λόγος)",
        "meaning": "말, 담론, 연구",
        "effect": "체계적 연구, 학문, 또는 어떤 주제에 대한 논리적 설명. chronology에서는 시간의 흐름과 사건의 배열을 논리적이고 체계적으로 다루는 학문이라는 뜻을 형성."
      }
    },
    "meaning": {
      "basic": "the arrangement of events or dates in the order of their occurrence (사건이나 날짜를 시간 순으로 배열하는 것; 연대기)",
      "extended": [
        "단순한 나열이 아니라 시간에 따라 사건의 인과 관계와 발전을 추적하는 역사적 방식",
        "고고학, 역사학, 지질학, 천문학, 생물학 등 다양한 학문에서 사용됨",
        "디지털 시대에는 타임라인 구성, 시퀀싱 알고리즘, 시간 기반 데이터 분석 등으로 확장"
      ],
      "etymological": "chron (time) + -logy (study) → '시간에 대한 체계적 연구' → 연대기학, 시간 배열 체계"
    },
    "derivatives": [
      "chronology: 시간의 논리적 배열 → 연대기",
      "chronic: 오랜 시간 지속되는 → 만성의",
      "chronicle: 시간순 사건 기록 → 연대기, 기록문",
      "synchronize: 같은 시간에 맞추다 → 동기화하다",
      "anachronism: 시간에서 벗어난 것 → 시대착오",
      "chronograph: 시간 기록 장치 → 정밀 시계",
      "chronometer: 시간 측정 기기 → 항해용 정밀시계",
      "chronotherapy: 시간에 따른 치료법 → 시간치료법",
      "biology: 생명의 연구 → 생물학",
      "geology: 지구의 연구 → 지질학",
      "psychology: 마음의 연구 → 심리학",
      "theology: 신에 대한 연구 → 신학",
      "etymology: 말의 기원 연구 → 어원학",
      "anthropology: 인간에 대한 연구 → 인류학"
    ],
    "cultural": "chronology는 고대 문명에서 기록을 질서화하는 시도에서 비롯됨. 이집트, 메소포타미아, 중국, 마야 문명 등은 모두 천문학적 사건과 정치적 사건을 시간 순으로 기록하려 했음. 고대 그리스 철학자 헤로도토스(Herodotus)와 투키디데스(Thucydides)는 연대기적 역사 서술의 창시자라 불리며, 시간의 순서를 따라 사건을 배열하고 해석하는 기법을 사용. 르네상스 이후에는 과학적 탐구와 함께 객관적 연대 측정 방법(예: 연대 측정법, 방사성 탄소 연대법 등)이 도입되며 chronology는 독립된 학문 분야로 발전. 오늘날에는 단지 과거의 사건 정리에 그치지 않고, 데이터 과학, 우주 연구, 의료, 디지털 기술 등에서 핵심 개념으로 활용됨."
  },
  "chronic": {
    "structure": {
      "prefix": null,
      "root": {
        "text": "chron",
        "meaning": "시간 (time)"
      },
      "suffix": {
        "text": "-ic",
        "meaning": "~에 관련된, ~의 성질을 가진 (pertaining to, having the quality of)"
      }
    },
    "components": {
      "root": {
        "origin": "고대 그리스어 khronos (χρόνος)",
        "meaning": "시간 (time)",
        "related": ["Chronos (시간을 상징하는 신)"],
        "cultural": "chron은 고대 그리스 철학에서 지속성, 변화, 순환, 운명과 관련된 핵심 개념이었음. 그리스 사상에서 시간은 단지 흐르는 것이 아니라, 모든 존재를 소모하고 변화시키는 힘으로 여겨졌고, 질병이나 인간의 고통 역시 그 지속성을 기준으로 판단했음."
      },
      "suffix": {
        "origin": "라틴어 및 그리스어 -icus, -ikos",
        "meaning": "~에 관한, ~적인",
        "effect": "형용사를 만들며, 특정한 속성이나 성질을 가진 것을 나타냄. chronic에서는 시간과 관련된 특성을 의미 → '시간이 오래 지속되는'."
      }
    },
    "meaning": {
      "basic": "lasting for a long time; persistent (오랜 시간 지속되는; 만성적인)",
      "extended": [
        "의학에서 만성 질환(chronic disease)은 수주에서 수년까지 지속되며, 급성(acute)과 대조됨",
        "심리학이나 사회문제에서도 사용됨 (예: chronic anxiety, chronic unemployment)",
        "때때로 부정적인 의미를 내포하여 끊이지 않는 문제, 고질적 상태를 암시"
      ],
      "etymological": "chron (time) + -ic (having the quality of) → '시간의 특성을 지닌' → 장기간 지속되는, 만성적인"
    },
    "derivatives": [
      "chronology: 시간 배열에 대한 연구 → 연대기",
      "chronic: 시간과 관련된 → 오래 지속되는",
      "chronicle: 시간순으로 사건을 기록하다 → 연대기, 역사기록",
      "synchronize: 같은 시간에 맞추다 → 동기화하다",
      "anachronism: 시간에서 벗어난 것 → 시대착오",
      "chronograph: 시간 기록 장치 → 정밀 시계",
      "chronometer: 시간 측정 기기 → 항해용 정밀시계",
      "chronotherapy: 시간에 따른 치료법 → 시간치료법",
      "biology: 생명의 연구 → 생물학",
      "geology: 지구의 연구 → 지질학",
      "psychology: 마음의 연구 → 심리학",
      "theology: 신에 대한 연구 → 신학",
      "etymology: 말의 기원 연구 → 어원학",
      "anthropology: 인간에 대한 연구 → 인류학"
    ],
    "cultural": "chronic은 고대 그리스 의학자 히포크라테스(Hippocrates)가 질병의 시간적 경과에 따라 병을 분류하면서 본격적으로 사용되기 시작함. nosos chronia → '오래 지속되는 병'. 이는 후에 morbus chronicus로 라틴화되어 중세 의학서에 자주 등장. 르네상스 이후, 질병의 급성/만성 구분이 더욱 명확해지면서 chronic은 질병 분류학의 핵심 개념이 됨. 현대 의학에서는 당뇨, 고혈압, 암, 우울증, 관절염 등과 같은 완치보다는 장기 관리가 필요한 상태를 지칭하는 중요한 의학적 용어로 정착. 이와 동시에 사회학, 경제학, 심리학 등에서도 반복적이고 구조적인 문제를 지칭하는 메타포로서의 용어로 확장됨."
  },
  "synchronize": {
    "structure": {
      "prefix": {
        "text": "syn-",
        "meaning": "함께, 동시에 (together, with)"
      },
      "root": {
        "text": "chron",
        "meaning": "시간 (time)"
      },
      "suffix": {
        "text": "-ize",
        "meaning": "~화하다, ~하게 만들다 (to make, to cause to become)"
      }
    },
    "components": {
      "prefix": {
        "origin": "고대 그리스어 syn- (σύν)",
        "meaning": "together, with (함께, 동시에)",
        "effect": "무언가를 동시에 맞추거나 조정한다는 의미 부여. 영어의 다른 형태로 sym- (ex: sympathy, symbol)도 있음."
      },
      "root": {
        "origin": "고대 그리스어 khronos (χρόνος)",
        "meaning": "시간 (time)",
        "related": ["Chronos (시간을 신격화한 존재)"],
        "cultural": "chron은 절대적 시간의 흐름 또는 사건의 순서를 나타냄. 고대부터 시간은 신의 영역으로 간주되었으며, 질서, 변화, 숙명과 연결되어 왔음. 과학·기술 문명이 발달하면서 chron- 어근은 정밀한 시간 조정의 기술적 맥락에서 점점 더 중요해짐."
      },
      "suffix": {
        "origin": "그리스어 -izein, 라틴어 -izare",
        "meaning": "~화하다, ~로 만들다",
        "effect": "동사형을 만들며, '어떤 상태로 만들다', '기능하게 하다'의 뜻. synchronize에서는 동시에 움직이게 하다, 시간을 맞추다라는 의미 형성."
      }
    },
    "meaning": {
      "basic": "to cause to occur at the same time; to operate in unison (동시에 발생하게 하다; 시간을 맞추다)",
      "extended": [
        "시계나 장치뿐 아니라, 사람의 움직임, 시스템 간의 데이터, 영상과 음성 등 모든 시간 기반 요소 간의 정렬에 사용",
        "컴퓨터 공학, 방송 기술, 스포츠, 심지어 일상 대화에서도 사용됨 (예: 'Let's synchronize our calendars')"
      ],
      "etymological": "syn- (together) + chron (time) + -ize (to make) → '시간을 함께 만들다' → 동시에 맞추다, 동기화하다"
    },
    "derivatives": [
      "chronology: 시간의 배열 연구 → 연대기",
      "chronic: 시간과 관련된 → 장기간의, 만성의",
      "chronicle: 시간순으로 사건을 기록하다 → 연대기, 역사기록",
      "synchronize: 시간을 함께 맞추다 → 동기화하다",
      "anachronism: 시간에서 벗어난 것 → 시대착오",
      "chronograph: 시간 기록 장치 → 정밀 시계",
      "chronometer: 시간 측정 기기 → 항해용 정밀시계",
      "chronotherapy: 시간에 따른 치료법 → 시간치료법",
      "synthesis: 함께 놓기 → 종합, 통합",
      "sympathy: 함께 느끼기 → 공감",
      "symbol: 함께 던져진 것 → 상징",
      "synergy: 함께 작용함 → 시너지",
      "symphony: 함께 울리는 소리 → 교향곡",
      "synchrony: 동시성 → 동시에 일어나는 현상",
      "realize: 현실로 만들다 → 실현하다",
      "organize: 조직으로 만들다 → 조직하다",
      "maximize: 최대화하다",
      "prioritize: 우선순위를 매기다",
      "harmonize: 조화를 이루게 하다",
      "synchronize: 시간을 맞추다 → 동기화하다"
    ],
    "cultural": "synchronize라는 단어는 17세기 과학혁명기, 시계 제작과 천문학 발달 과정에서 등장. 천문학자들은 관측 기록을 정밀하게 맞추기 위해 시간의 일치(synchronization)를 필수 요소로 보았고, 이로 인해 'synchronism'이라는 개념이 먼저 생김. 19세기 후반 철도 시간 통일, 표준 시간대 제정, 전신 통신 등이 등장하면서 synchronize는 필수 기술적 개념으로 확산. 현대에는 디지털 통신, 클라우드 시스템, 실시간 협업 등 다양한 분야에서 필수 키워드."
  },
  "geology": {
    "structure": {
      "prefix": null,
      "root": {
        "text": "geo",
        "meaning": "땅, 지구 (earth)"
      },
      "suffix": {
        "text": "-logy",
        "meaning": "~의 학문, ~에 대한 체계적 연구 (study of, discourse on)"
      }
    },
    "components": {
      "root": {
        "origin": "고대 그리스어 gē (γῆ)",
        "meaning": "대지, 땅, 지구 (earth, land)",
        "related": ["Gaia (대지의 여신, '지구'의 의인화)"],
        "cultural": "geo는 인류 문명의 기초인 토지, 자원, 공간을 상징함. 고대 그리스에서는 Gaia를 신격화하여 생명의 어머니이자 모든 것의 근원으로 숭배함. 철학자 탈레스, 아리스토텔레스 등은 지구와 자연의 본질에 대해 논의하며 geo-를 과학적 개념으로 확장시킴. 이후 geo-는 수학(geometry), 지도학(geography), 물리학(geophysics) 등에서 뿌리 개념으로 발전."
      },
      "suffix": {
        "origin": "고대 그리스어 -logia (λογία), logos (λόγος)",
        "meaning": "학문, 담론, 연구",
        "effect": "어떤 대상을 논리적, 체계적으로 연구하거나 설명하는 학문을 뜻함. geology에서는 지구의 구조와 역사를 연구하는 학문을 지칭."
      }
    },
    "meaning": {
      "basic": "the scientific study of the Earth's physical structure, substance, history, and processes (지구의 물리적 구조, 물질, 역사, 그리고 변화 과정을 연구하는 과학)",
      "extended": [
        "암석, 광물, 지각 운동, 화석, 판 구조론 등 지구의 형성과 변화에 대한 전반적인 학문",
        "지진, 화산, 기후 변화, 자원 개발, 환경 보존 등 실용적 분야와도 깊이 연결됨"
      ],
      "etymological": "geo (earth) + -logy (study of) → '지구에 대한 체계적 연구' → 지질학"
    },
    "derivatives": [
      "geology: 지구의 학문 → 지질학",
      "geography: 지구의 기록 → 지리학",
      "geometry: 지구를 재는 기술 → 기하학",
      "geopolitics: 지리적 요소가 정치에 미치는 영향 → 지정학",
      "geothermal: 지구의 열 → 지열",
      "geocentric: 지구 중심의 → 천동설적인",
      "geosphere: 지구의 고체 부분 → 암석권",
      "geochemistry: 지구의 화학적 구성 → 지구화학",
      "biology: 생명의 연구 → 생물학",
      "psychology: 마음의 연구 → 심리학",
      "theology: 신의 연구 → 신학",
      "anthropology: 인간의 연구 → 인류학",
      "etymology: 단어의 기원 연구 → 어원학",
      "zoology: 동물의 연구 → 동물학"
    ],
    "cultural": "geology라는 용어는 18세기 유럽에서 학문적으로 정착. 최초 사용자는 아마도 이탈리아 자연학자 Jean-André Deluc (1760년대). 그러나 지질학적 사고는 고대 그리스 시대부터 존재. 아리스토텔레스는 지진, 지각의 형태 변화 등에 대한 설명을 시도함. 19세기에는 제임스 허턴(James Hutton)과 찰스 라이엘(Charles Lyell)에 의해 근대 지질학의 토대가 형성됨. 이들은 '현재는 과거를 푸는 열쇠다'(uniformitarianism)라는 원리를 주장하며 지구의 변화는 천천히, 점진적으로 일어난다고 설명함. 현대에는 지구의 역사, 자원 개발, 자연재해 분석, 환경 보호까지 폭넓게 활용되는 핵심 과학 분야."
  },
  "geography": {
    "structure": {
      "prefix": null,
      "root": {
        "text": "geograph",
        "meaning": "지구를 기록하다 (to write about earth)"
      },
      "suffix": {
        "text": "-y",
        "meaning": "행위, 분야, 상태 (the study or practice of)"
      }
    },
    "components": {
      "root": {
        "origin": "고대 그리스어 gē (γῆ) + graphein (γράφειν)",
        "meaning": "지구를 기록하다",
        "cultural": "geo-는 고대 세계에서 삶의 터전, 농경, 지리적 인식을 기반으로 한 개념어. graph는 단지 '글쓰기'가 아니라 사물이나 개념을 시각적으로 형상화하거나 분석적으로 정리하는 도구로 사용됨. 지도, 도표, 기록, 관찰 등이 모두 graphein의 철학적·기술적 확장. 고대 그리스에서는 땅과 자연 현상을 통합적으로 이해하려는 시도에서 지리학적 사고가 출발."
      },
      "suffix": {
        "origin": "고대 프랑스어 -ie, 라틴어 -ia",
        "meaning": "행위, 분야, 상태",
        "effect": "어떤 분야, 활동, 상태를 의미하는 명사형 접미사. geography에서는 '지구를 기록하는 행위 또는 분야'로 작용."
      }
    },
    "meaning": {
      "basic": "the study of the Earth's surface, environments, places, and the relationships between people and their environments (지구 표면, 환경, 장소, 인간과 환경 사이의 관계를 연구하는 학문)",
      "extended": [
        "자연지리학 (지형, 기후, 생태 등)과 인문지리학 (도시, 인구, 문화, 경제 활동 등)으로 분화",
        "GIS(지리 정보 시스템), 위성지도, 재난관리, 기후변화 분석 등 디지털 기술과도 밀접하게 연결됨"
      ],
      "etymological": "geo (earth) + graph (write) + -y (field) → '지구를 쓰고 기록하는 학문' → 지리학"
    },
    "derivatives": [
      "geography: 지구를 기록하는 학문 → 지리학",
      "geology: 지구의 구조 연구 → 지질학",
      "geometry: 지구를 측정하는 기술 → 기하학",
      "geopolitics: 지리 + 정치 → 지정학",
      "geothermal: 지구의 열 → 지열의",
      "geocentric: 지구 중심의 → 천동설적",
      "geosphere: 지구의 물리적 층 → 암석권",
      "geochemistry: 지구의 화학 구성 → 지구화학",
      "autograph: 자신의 손으로 쓰다 → 자필 서명",
      "photograph: 빛으로 기록하다 → 사진",
      "telegraph: 멀리서 쓰다 → 전신, 전보",
      "paragraph: 문단을 나누어 쓰다 → 문단",
      "graphology: 필체를 연구하다 → 필적학",
      "biography: 생애를 기록하다 → 전기"
    ],
    "cultural": "geography는 고대 그리스 철학자 에라토스테네스(Eratosthenes)가 처음으로 사용한 개념 중 하나. 그는 '지구(geo)'를 '기록(graph)'하는 학문으로서 지리학을 정의. 그는 지구 둘레를 정밀하게 측정하고, 최초의 지리적 좌표 체계를 구상한 인물. 이후 로마 시대와 이슬람 황금기 학자들(예: 알 이드리시)은 지리학을 실용적 탐험과 국가 전략에 접목. 근대에는 대항해 시대, 제국주의, 식민지 개척과 함께 지리학이 급격히 발전 → 국가의 군사, 외교, 무역 전략 수립에 필수. 오늘날에는 지속 가능한 개발, 기후 변화 대응, 도시 계획, 데이터 기반 인문학(GIS 등)의 핵심 학문으로 자리잡음."
  }
};

// 서버 상태 확인 엔드포인트
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 이야기 생성 엔드포인트
app.post('/api/story', async (req, res) => {
    try {
        const { word, character, language = 'ko' } = req.body;

        if (!word || !character) {
            return res.status(400).json({
                success: false,
                error: '단어와 캐릭터 정보가 필요합니다.'
            });
        }

        // 단어 분석 데이터 가져오기
        const wordLower = word.toLowerCase();
        const wordInfo = wordData[wordLower];
        
        if (!wordInfo) {
            return res.status(404).json({
                success: false,
                error: '해당 단어를 찾을 수 없습니다.'
            });
        }

        // 분석 데이터 구성
        const analysis = {
            prefix: wordInfo.structure.prefix?.text || '',
            root: wordInfo.structure.root?.text || '',
            suffix: wordInfo.structure.suffix?.text || '',
            prefixMeaning: wordInfo.structure.prefix?.meaning || wordInfo.components.prefix?.meaning || '',
            rootMeaning: wordInfo.components.root?.meaning || wordInfo.structure.root?.meaning || '',
            suffixMeaning: wordInfo.structure.suffix?.meaning || wordInfo.components.suffix?.meaning || '',
            rootBackground: wordInfo.components.root?.cultural || wordInfo.cultural || ''
        };

        // 캐릭터와 언어 유효성 검증
        if (!STORY_TEMPLATES[language]) {
            return res.status(400).json({
                success: false,
                error: `지원하지 않는 언어입니다: ${language}`
            });
        }
        
        if (!STORY_TEMPLATES[language][character]) {
            return res.status(400).json({
                success: false,
                error: `지원하지 않는 캐릭터입니다: ${character}`
            });
        }

        // 캐릭터와 언어에 맞는 프롬프트 생성
        const prompt = STORY_TEMPLATES[language][character](word, analysis);

        // 시스템 메시지 설정
        const systemMessage = language === 'en' ?
            "You are a creative storyteller. Always respond in English only. Never use Korean or any other language." :
            "당신은 창의적인 이야기꾼입니다. 항상 한국어로만 응답하세요. 절대로 영어나 다른 언어를 사용하지 마세요.";

        // Google Gemini Pro API 호출
        const fullPrompt = `${systemMessage}\n\n${prompt}`;
        
        console.log('Generating story for:', { word, character, language });
        console.log('Prompt length:', fullPrompt.length);
        
        let story;
        let lastError = null;
        
        // 여러 모델 시도 (fallback)
        for (const modelName of MODEL_NAMES) {
            try {
                const currentModel = genAI.getGenerativeModel({ model: modelName });
                console.log(`모델 ${modelName} 시도 중...`);
                
                const result = await currentModel.generateContent(fullPrompt);
                
                // 응답 구조 확인
                if (!result || !result.response) {
                    throw new Error('API 응답 구조가 올바르지 않습니다.');
                }
                
                const response = result.response;
                
                // 텍스트 추출 시도
                if (typeof response.text === 'function') {
                    story = response.text();
                } else if (response.candidates && response.candidates[0] && response.candidates[0].content) {
                    // 대체 응답 구조 처리
                    story = response.candidates[0].content.parts[0].text;
                } else {
                    throw new Error('API 응답에서 텍스트를 추출할 수 없습니다.');
                }
                
                // 스토리 유효성 검증
                if (!story || typeof story !== 'string' || story.trim().length === 0) {
                    throw new Error('생성된 이야기가 비어있습니다.');
                }
                
                console.log(`모델 ${modelName}로 이야기 생성 성공, 길이: ${story.length}`);
                break; // 성공하면 루프 종료
            } catch (apiError) {
                console.log(`모델 ${modelName} 실패:`, apiError.message);
                lastError = apiError;
                continue; // 다음 모델 시도
            }
        }
        
        // 모든 모델 실패 시
        if (!story) {
            console.error('모든 모델 시도 실패');
            console.error('[Gemini] 사용 가능한 모델을 찾지 못했습니다. 현재 우선순위:', MODEL_NAMES.join(', '));
            console.error('[Gemini] 환경 변수 GEMINI_MODEL_PRIORITY로 모델 우선순위를 지정할 수 있습니다. 예) gemini-2.5-pro,gemini-2.5-pro-preview-03-2025');
            throw new Error(`Google Gemini API 오류: ${lastError?.message || '사용 가능한 모델을 찾을 수 없습니다.'}`);
        }
            
        res.json({ 
            success: true,
            word,
            character,
            language,
            story
        });

    } catch (error) {
        console.error('Story generation error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // 더 자세한 에러 메시지 전달
        const errorMessage = error.message || '이야기 생성 중 오류가 발생했습니다.';
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 단어 검색 엔드포인트
app.get('/api/word/:word', (req, res) => {
    const word = req.params.word.toLowerCase();
    const wordInfo = wordData[word];
    
    if (!wordInfo) {
        return res.status(404).json({
            success: false,
            error: '해당 단어를 찾을 수 없습니다.'
        });
    }

    res.json({
        success: true,
        word,
        data: wordInfo
    });
});

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
