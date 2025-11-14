// API 설정
const API_CONFIG = {
    WORD_ANALYSIS_API: 'https://word-genetic-map.onrender.com/api/word',
    STORY_API: 'https://word-genetic-map.onrender.com/api/story'
};

// Mock 데이터
const MOCK_DATA = {
    'spectacle': {
        prefix: '',
        root: 'spect',
        suffix: 'acle',
        prefixMeaning: '',
        rootMeaning: '보다(to look, to see)',
        suffixMeaning: '명사를 만드는 접미사: ~하는 도구, ~하는 것',
        prefixBackground: '',
        rootBackground: `어원: 라틴어 specere → "to look, to see (보다)"
관련 라틴어 단어: spectare ("to watch"), speculum ("거울")

고대 로마 사회에서 spectare는 단순히 보는 것을 넘어 "공공의 시선 아래 무언가를 바라보다"는 뜻으로 사용되었음.
로마의 원형경기장 (Colosseum)에서의 spectacle은 대중이 지켜보는 장대한 전시나 공연을 의미했음.`,
        suffixBackground: `라틴어 -aculum에서 파생.
도구 또는 수단을 나타내는 명사형 접미사.
의미: "~하는 것", "~의 결과", 또는 "~를 위한 도구"`,
        derivatives: [
            'inspect (안을 들여다보다 → 조사하다)',
            'respect (다시 보다 → 존중하다)',
            'suspect (아래로 보다 → 의심하다)',
            'expect (밖을 보다 → 기대하다)',
            'prospect (앞으로 보다 → 전망, 가능성)',
            'retrospect (뒤를 보다 → 회상)',
            'circumspect (주위를 보다 → 신중한)',
            'aspect (~쪽을 보다 → 양상, 모습)',
            'spectator (보는 사람 → 관객)',
            'specter (보이는 유령 → 유령, 환영)',
            'spectacles (보는 도구 → 안경)',
            'perspective (관점을 갖고 보다 → 관점, 시각)',
            'speculate (보다에서 시작 → 사색하다, 추측하다)',
            'conspicuous (함께+보다 → 눈에 띄는)'
        ],
        culturalBackground: `고대 로마 시대의 spectacula (복수형)는 검투사 경기, 연극, 군사 퍼레이드 등 공공 구경거리를 의미.
로마인의 여가 문화는 '보는 것' 중심이었으며, 이 문화에서 spectacle은 권력의 과시, 국가의 위엄을 전달하는 도구로 사용되었음.
중세를 거치며 spectacle은 종교적 의례, 축제, 왕실 행사를 지칭하는 단어로 확장.
근대 이후에는 시각적으로 압도적인 경험(공연, 영화 등)을 가리키는 중립적 또는 긍정적 의미로 정착.`
    }
};

// 캐릭터별 이야기 템플릿
const STORY_TEMPLATES = {
    poet: (word, data) => `[A Poem about ${word}]
In the theater of time, a spectacle unfolds
Where moments freeze in grand display
We all become spectators here
Watching history's page turn away

From ancient Rome's grand Colosseum walls
To modern stages bright and new
The magnificent show goes ever on
Capturing hearts with every view`,

    robot: (word, data) => `[Analysis Report: "${word}"]
Etymology Structure:
- Root(${data.root}): ${data.rootMeaning}
- Suffix(${data.suffix}): ${data.suffixMeaning}

Derivative Analysis:
Total ${data.derivatives.length} derivatives identified,
all sharing semantic connection to root 'spect-' meaning "to see/look"

Conclusion: The word demonstrates semantic structure related to visual experience,
showing high extensibility and applicability in linguistic usage.`,

    linguist: (word, data) => `[Linguistic Analysis of "${word}"]
This word presents a fascinating example of Latin etymology.
The root '${data.root}' derives from Latin 'specere',
while the suffix '${data.suffix}' evolved from Latin '-aculum'.

${data.culturalBackground}

This exemplifies how language reflects and preserves cultural and historical evolution.`,

    fantasy: (word, data) => `[The Tale of the Magic Mirror]
In the ancient realm of wizards, there existed a powerful spell called '${word}'.
This enchantment held the power to reveal the unseen.

Legend tells that the root word '${data.root}' contained magical properties
allowing one to see all things in existence.

Even today, wizards use its derivatives as various spells:
${data.derivatives.slice(0, 3).join(', ')} ...`,

    children: (word, data) => `[The Amazing Word Story]
Hello, children! Today we're going to learn about a fascinating word: '${word}'!

Long ago, in a place called Rome, people would gather in a huge round building
to watch exciting shows. That's why this word came to mean "something amazing to see"!

Today, we still use this word when we see something really impressive
or spectacular. Isn't that interesting?`
};

document.addEventListener('DOMContentLoaded', () => {
    initializePixelBlast();

    const searchScreen = document.getElementById('search-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const resultsScreen = document.getElementById('results-screen');
    const searchInput = document.getElementById('search-input');
    const gptCharacter = document.getElementById('gpt-character');
    const generateStoryBtn = document.getElementById('generate-story');
    const backButton = document.getElementById('back-button');

    const langKoBtn = document.getElementById('lang-ko');
    const langEnBtn = document.getElementById('lang-en');
    let currentLanguage = 'ko';

    // 브라우저 히스토리 관리
    initializeHistory();
    window.addEventListener('popstate', handlePopState);

    // 검색 처리
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                await handleSearch(searchTerm);
            }
        }
    });

    // 언어 선택 버튼 이벤트 처리
    langKoBtn.addEventListener('click', () => {
        currentLanguage = 'ko';
        langKoBtn.classList.add('active');
        langEnBtn.classList.remove('active');
        generateStoryBtn.textContent = '이야기 생성하기';
    });

    langEnBtn.addEventListener('click', () => {
        currentLanguage = 'en';
        langEnBtn.classList.add('active');
        langKoBtn.classList.remove('active');
        generateStoryBtn.textContent = 'Generate Story';
    });

    // 결과 화면 뒤로가기
    backButton.addEventListener('click', () => {
        window.location.reload();
    });

    // 브라우저 히스토리 초기화
    function initializeHistory() {
        const urlParams = new URLSearchParams(window.location.search);
        const word = urlParams.get('word');
        if (word) {
            searchInput.value = word;
            handleSearch(word);
        }
    }

    // 브라우저 히스토리 상태 처리
    function handlePopState(event) {
        const state = event.state;
        if (state) {
            if (state.screen === 'results') {
                showResults(state.word);
            } else {
                showSearch();
            }
        } else {
            showSearch();
        }
    }

    // 화면 상태 관리
    function showSearch() {
        searchScreen.style.display = 'flex';
        searchScreen.classList.remove('fade-out');
        loadingScreen.classList.remove('active');
        resultsScreen.classList.remove('active');
    }

    function showResults(word) {
        searchScreen.style.display = 'none';
        loadingScreen.classList.remove('active');
        resultsScreen.classList.add('active');
        displayResults(word);
    }

    // 검색 처리 함수
    async function handleSearch(word) {
        try {
            // 초기 화면 페이드 아웃
            searchScreen.classList.add('fade-out');
            
            // 로딩 화면 표시
            setTimeout(() => {
                searchScreen.style.display = 'none';
                loadingScreen.classList.add('active');
            }, 500);

            // 서버에서 단어 데이터 가져오기
            const response = await fetch(`${API_CONFIG.WORD_ANALYSIS_API}/${word.toLowerCase()}`);
            if (!response.ok) {
                throw new Error('단어를 찾을 수 없습니다.');
            }
            const data = await response.json();
            
            // 로딩 화면 5초 유지
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 로딩 텍스트 변경
            document.querySelector('.loading-text').textContent = '분석 완료';
            
            // 결과 화면으로 전환
            setTimeout(() => {
                loadingScreen.classList.remove('active');
                resultsScreen.classList.add('active');
                displayResults(data);
            }, 1000);
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
            showSearch();
        }
    }

    // 결과 표시 함수
    function displayResults(data) {
        const wordData = data.data;
        
        // DNA 구조에 단어 부분 표시
        document.querySelector('.prefix-part .part-content').textContent = wordData.structure.prefix?.text || '';
        document.querySelector('.root-part .part-content').textContent = wordData.structure.root?.text || '';
        document.querySelector('.suffix-part .part-content').textContent = wordData.structure.suffix?.text || '';

        // 유틸 함수: 값이 없거나 undefined undefined면 안내 문구 반환
        function safeText(value) {
            if (!value || value === 'undefined undefined' || value.trim() === '') return '추가 정보가 없습니다.';
            return value;
        }

        // 분석 결과 표시 - 접두사
        const prefixCard = document.querySelector('.prefix-card');
        prefixCard.querySelector('.word-content').textContent = safeText(wordData.structure.prefix?.text);
        prefixCard.querySelector('.meaning').textContent = safeText(wordData.structure.prefix?.meaning);
        let prefixBackground = '';
        if (wordData.components.prefix) {
            prefixBackground = (wordData.components.prefix.origin || '') + '\n' + (wordData.components.prefix.effect || '');
        }
        prefixCard.querySelector('.background').textContent = safeText(prefixBackground);

        // 분석 결과 표시 - 어근
        const rootCard = document.querySelector('.root-card');
        rootCard.querySelector('.word-content').textContent = safeText(wordData.structure.root?.text);
        rootCard.querySelector('.meaning').textContent = safeText(wordData.components.root?.meaning);
        rootCard.querySelector('.background').textContent = safeText(wordData.components.root?.cultural);

        // 분석 결과 표시 - 접미사
        const suffixCard = document.querySelector('.suffix-card');
        suffixCard.querySelector('.word-content').textContent = safeText(wordData.structure.suffix?.text);
        suffixCard.querySelector('.meaning').textContent = safeText(wordData.structure.suffix?.meaning);
        let suffixBackground = '';
        if (wordData.components.suffix) {
            suffixBackground = (wordData.components.suffix.origin || '') + '\n' + (wordData.components.suffix.effect || '');
        }
        suffixCard.querySelector('.background').textContent = safeText(suffixBackground);

        // Mutant Gene 섹션 업데이트
        const wordButtons = document.querySelector('.word-buttons');
        wordButtons.innerHTML = wordData.derivatives.map(derivative => {
            const [word, meaning] = derivative.split(': ');
            return `
                <div class="word-button group">
                    <span class="tooltip">${meaning}</span>
                    ${word}
                </div>
            `;
        }).join('');

        // DNA 시각화 섹션 표시
        document.querySelector('.dna-visualization').style.display = 'block';
    }

    // 이야기 생성 처리
    generateStoryBtn.addEventListener('click', async () => {
        const word = searchInput.value.trim();
        const character = gptCharacter.value;
        const storyContent = document.querySelector('.story-content');
        
        if (!word || !character) {
            storyContent.innerHTML = '<div class="error-message">단어와 캐릭터를 모두 선택해주세요.</div>';
            return;
        }
        
        // 버튼 비활성화 및 로딩 상태 표시
        generateStoryBtn.disabled = true;
        generateStoryBtn.innerHTML = currentLanguage === 'ko' ? 
            '이야기 생성 중... <span class="loading-dots"></span>' :
            'Generating story... <span class="loading-dots"></span>';
        storyContent.innerHTML = '<div class="loading-message">' + 
            (currentLanguage === 'ko' ? 'AI가 이야기를 만들고 있어요...' : 'AI is creating a story...') +
            '</div>';

        try {
            // 서버 상태 확인
            const healthCheck = await fetch(API_CONFIG.STORY_API.replace('/api/story', '/api/health'))
                .catch(() => ({ ok: false }));
            
            if (!healthCheck.ok) {
                throw new Error(currentLanguage === 'ko' ?
                    '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.' :
                    'Cannot connect to server. Please check if the server is running.');
            }

            // 이야기 생성 요청
            const response = await fetch(API_CONFIG.STORY_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ word, character, language: currentLanguage })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || (currentLanguage === 'ko' ?
                    '이야기 생성에 실패했습니다.' :
                    'Failed to generate story.'));
            }

            if (!data.success || !data.story) {
                throw new Error(currentLanguage === 'ko' ?
                    '서버 응답이 올바르지 않습니다.' :
                    'Invalid server response.');
            }
            
            // 줄바꿈 처리 및 결과 표시
            storyContent.innerHTML = `
                <div class="story-header">
                    <div class="story-info">
                        <span class="word-label">${currentLanguage === 'ko' ? '단어' : 'Word'}:</span> <strong>${data.word}</strong>
                        <span class="character-label">${currentLanguage === 'ko' ? '작가' : 'Author'}:</span> <strong>${data.character}</strong>
                    </div>
                </div>
                <div class="story-text">
                    ${data.story.split('\n').map(line => `<p>${line}</p>`).join('')}
                </div>
            `;

        } catch (error) {
            console.error('이야기 생성 오류:', error);
            storyContent.innerHTML = `<div class="error-message">
                ${error.message || (currentLanguage === 'ko' ?
                    '이야기 생성 중 오류가 발생했습니다.' :
                    'An error occurred while generating the story.')}
            </div>`;
        } finally {
            // 버튼 상태 복구
            generateStoryBtn.disabled = false;
            generateStoryBtn.textContent = currentLanguage === 'ko' ? '이야기 생성하기' : 'Generate Story';
        }
    });
}); 

function initializePixelBlast() {
    const layer = document.querySelector('.pixel-blast-layer');
    if (!layer) return;

    const PIXEL_COUNT = 140;

    for (let i = 0; i < PIXEL_COUNT; i++) {
        const pixel = document.createElement('span');
        pixel.className = 'pixel';
        layer.appendChild(pixel);
        randomizePixel(pixel, true);
        pixel.addEventListener('animationiteration', () => randomizePixel(pixel, false));
    }
}

function randomizePixel(pixel, initial = false) {
    const size = (Math.random() * 4 + 3).toFixed(2);
    pixel.style.width = `${size}px`;
    pixel.style.height = `${size}px`;

    const startX = (Math.random() * 100).toFixed(2);
    const startY = (Math.random() * 100).toFixed(2);
    pixel.style.left = `${startX}%`;
    pixel.style.top = `${startY}%`;

    const moveX = (Math.random() * 320 - 160).toFixed(0);
    const moveY = (Math.random() * 260 - 200).toFixed(0);
    pixel.style.setProperty('--moveX', `${moveX}px`);
    pixel.style.setProperty('--moveY', `${moveY}px`);

    const duration = (Math.random() * 6 + 7).toFixed(2);
    pixel.style.animationDuration = `${duration}s`;
    pixel.style.setProperty('--delay', initial ? `${(Math.random() * duration).toFixed(2)}s` : '0s');

    const opacity = (Math.random() * 0.35 + 0.25).toFixed(2);
    pixel.style.setProperty('--opacity', opacity);

    const hues = [195, 205, 210, 265, 295];
    const hue = hues[Math.floor(Math.random() * hues.length)];
    pixel.style.backgroundColor = `hsla(${hue}, 85%, 72%, ${opacity})`;
    pixel.style.boxShadow = `0 0 14px hsla(${hue}, 85%, 68%, ${opacity})`;
}