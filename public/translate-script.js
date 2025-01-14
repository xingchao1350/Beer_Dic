let termsDatabase = null;
let currentDirection = 'zhToEn';

// 加载术语库
async function loadTermsDatabase() {
    try {
        const response = await fetch('/beer_categories.json');
        if (!response.ok) throw new Error('Failed to load terms database');
        const data = await response.json();
        
        // 构建术语查找表
        termsDatabase = {
            zhToEn: new Map(),
            enToZh: new Map()
        };
        
        // 处理所有分类中的术语
        Object.values(data.categories).forEach(category => {
            category.terms.forEach(term => {
                termsDatabase.zhToEn.set(term.cn, term);
                termsDatabase.enToZh.set(term.en.toLowerCase(), term);
            });
        });
    } catch (error) {
        console.error('Error loading terms database:', error);
    }
}

// 使用术语库替换文本中的专业术语
function replaceTermsInText(text, terms) {
    let result = text;
    // 按术语长度降序排序，避免短词替换长词的一部分
    terms.sort((a, b) => {
        const keyA = currentDirection === 'zhToEn' ? a.cn : a.en;
        const keyB = currentDirection === 'zhToEn' ? b.cn : b.en;
        return keyB.length - keyA.length;
    });
    
    // 替换专业术语
    terms.forEach(term => {
        const source = currentDirection === 'zhToEn' ? term.cn : term.en;
        const target = currentDirection === 'zhToEn' ? term.en : term.cn;
        const regex = new RegExp(source, 'gi');
        result = result.replace(regex, `{{${target}}}`);
    });
    
    return result;
}

// 修改翻译函数
async function translate(text) {
    try {
        // 检测并替换专业术语
        const detectedTerms = detectTerms(text);
        const textWithReplacedTerms = replaceTermsInText(text, detectedTerms);
        
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-f52cb3b0f1564ed8a67e08203d6b65d2'
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: `你是一个专业的啤酒术语翻译助手。请将用户输入的文本从${
                            currentDirection === 'zhToEn' ? '中文翻译成英文' : '英文翻译成中文'
                        }。注意：
                        1. 保持专业性和准确性
                        2. 保留文本中的 {{xxx}} 格式的标记，不要翻译它们
                        3. 保持原文的语气和语调
                        4. 确保输出的是完整的句子`
                    },
                    {
                        role: "user",
                        content: textWithReplacedTerms
                    }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error('Translation failed');
        
        const data = await response.json();
        let translatedText = data.choices[0].message.content;
        
        // 还原专业术语标记
        detectedTerms.forEach(term => {
            const target = currentDirection === 'zhToEn' ? term.en : term.cn;
            const regex = new RegExp(`{{${target}}}`, 'g');
            translatedText = translatedText.replace(regex, target);
        });
        
        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}

// 改进检测专业术语的函数
function detectTerms(text) {
    const terms = new Set();
    const database = currentDirection === 'zhToEn' ? 
        termsDatabase.zhToEn : termsDatabase.enToZh;
    
    database.forEach((term, key) => {
        // 使用不区分大小写的正则表达式进行匹配
        const regex = new RegExp(key, 'i');
        if (regex.test(text)) {
            terms.add(term);
        }
    });
    
    return Array.from(terms);
}

// 显示检测到的术语时添加更多信息
function displayDetectedTerms(terms) {
    const container = document.getElementById('detectedTerms');
    container.innerHTML = terms.length ? terms.map(term => `
        <div class="term-item" title="${term.description || ''}">
            <div class="term-main">
                ${currentDirection === 'zhToEn' ? term.cn : term.en}
                →
                ${currentDirection === 'zhToEn' ? term.en : term.cn}
            </div>
            ${term.ipa ? `<div class="term-ipa">[${term.ipa}]</div>` : ''}
            ${term.description ? `<div class="term-desc">${term.description}</div>` : ''}
        </div>
    `).join('') : '<div class="no-terms">未检测到专业术语</div>';
}

// 设置事件监听器
function setupEventListeners() {
    const sourceText = document.getElementById('sourceText');
    const translationResult = document.getElementById('translationResult');
    const clearBtn = document.getElementById('clearText');
    const copyBtn = document.getElementById('copyResult');
    const zhToEnBtn = document.getElementById('zhToEn');
    const enToZhBtn = document.getElementById('enToZh');
    
    let translateTimeout;
    
    sourceText.addEventListener('input', (e) => {
        const text = e.target.value;
        document.querySelector('.char-count').textContent = `${text.length}/5000`;
        
        // 检测术语
        const terms = detectTerms(text);
        displayDetectedTerms(terms);
        
        // 防抖处理翻译请求
        clearTimeout(translateTimeout);
        if (text.trim()) {
            translateTimeout = setTimeout(async () => {
                try {
                    translationResult.textContent = '翻译中...';
                    const result = await translate(text);
                    translationResult.textContent = result;
                } catch (error) {
                    translationResult.textContent = '翻译失败，请稍后重试';
                }
            }, 1000);
        } else {
            translationResult.textContent = '翻译结果将显示在这里...';
        }
    });
    
    clearBtn.addEventListener('click', () => {
        sourceText.value = '';
        translationResult.textContent = '翻译结果将显示在这里...';
        document.querySelector('.char-count').textContent = '0/5000';
        displayDetectedTerms([]);
    });
    
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(translationResult.textContent)
            .then(() => {
                copyBtn.classList.add('copied');
                setTimeout(() => copyBtn.classList.remove('copied'), 2000);
            });
    });
    
    zhToEnBtn.addEventListener('click', () => {
        currentDirection = 'zhToEn';
        zhToEnBtn.classList.add('active');
        enToZhBtn.classList.remove('active');
        sourceText.placeholder = '请输入中文...';
        if (sourceText.value) sourceText.dispatchEvent(new Event('input'));
    });
    
    enToZhBtn.addEventListener('click', () => {
        currentDirection = 'enToZh';
        enToZhBtn.classList.add('active');
        zhToEnBtn.classList.remove('active');
        sourceText.placeholder = 'Enter English text...';
        if (sourceText.value) sourceText.dispatchEvent(new Event('input'));
    });
}

// 初始化应用
async function initializeApp() {
    await loadTermsDatabase();
    setupEventListeners();
}

// 启动应用
initializeApp(); 