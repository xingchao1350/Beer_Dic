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
                        content: `你是一个专业的啤酒术语翻译助手。请遵循以下翻译守则：

1. 大小写规范：
- 大写：啤酒风格名称(American, Belgian等)、专有名词(Pilsner等)、评分项目标题
- 小写：一般性描述词(lager, ale)、工艺术语(fermentation)、感官描述词(estery)、原料通用名词(malt, hop)

2. 句式规范：
- 使用动词开头的直接表达，如 "Increase cold conditioning time"
- 避免使用 "It is recommended to..."
- 使用简洁的表达，如 "Store in cool temperature"

3. 术语标准化：
- 香气强度：low, medium-low, medium, medium-high, high
- 口感描述：smooth, crisp, clean, rough
- 缺陷描述：oxidation, cardboard, lightstruck, phenolic
- 工艺术语：fermentation, conditioning, aging

4. 翻译要求：
- 保持专业性：使用标准评审术语
- 保持一致性：同一概念使用相同术语
- 保持简洁性：去除冗余词语，使用主动语态
- 保留文本中的 {{xxx}} 格式的标记，不要翻译它们

请将用户输入的文本从${currentDirection === 'zhToEn' ? '中文翻译成英文' : '英文翻译成中文'}。`
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
        translatedText = translatedText.replace(/{{(.*?)}}/g, (match, term) => {
            // 直接返回 AI 处理后的术语（保持其大小写）
            return term;
        });
        
        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}

// 添加术语大小写处理函数
function processTermCase(term, position = 'middle') {
    // 检查是否是需要永远大写的术语
    const alwaysCapitalized = [
        'American', 'Belgian', 'German', 'Czech', 'British', 'Irish', 'Scottish',
        'Pilsner', 'Munich', 'Vienna', 'Saaz', 'Reinheitsgebot'
    ];
    
    if (alwaysCapitalized.includes(term)) {
        return term;
    }

    // 检查是否是评分项目标题
    const scoreItems = ['Aroma', 'Appearance', 'Flavor', 'Mouthfeel', 'Overall Impression'];
    if (scoreItems.includes(term)) {
        return term;
    }

    // 句首位置大写
    if (position === 'start') {
        return term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
    }

    // 其他情况小写
    return term.toLowerCase();
}

// 修改检测术语函数，添加位置信息
function detectTerms(text, position = 'middle') {
    const terms = new Set();
    const database = currentDirection === 'zhToEn' ? 
        termsDatabase.zhToEn : termsDatabase.enToZh;
    
    database.forEach((term, key) => {
        const regex = new RegExp(key, 'i');
        if (regex.test(text)) {
            // 处理术语大小写
            term.en = processTermCase(term.en, position);
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

// 修改语法校验功能
function setupGrammarCheck() {
    const outputSection = document.querySelector('.output-section');
    
    // 创建工具栏和语法检查按钮
    const toolBar = document.createElement('div');
    toolBar.className = 'output-toolbar';
    
    const grammarCheckBtn = document.createElement('button');
    grammarCheckBtn.className = 'grammar-check-btn';
    grammarCheckBtn.innerHTML = `
        <i class="fas fa-check-double"></i>
        语法校验
    `;
    
    toolBar.appendChild(grammarCheckBtn);
    
    // 创建语法检查结果区域
    const grammarResultSection = document.createElement('div');
    grammarResultSection.className = 'grammar-result-section';
    grammarResultSection.style.display = 'none';
    grammarResultSection.innerHTML = `
        <div class="grammar-result-header">
            <h3>语法检查结果</h3>
            <button class="close-btn" onclick="hideGrammarResult()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="grammar-result-content"></div>
    `;
    
    // 插入到DOM中
    outputSection.insertBefore(toolBar, outputSection.firstChild);
    outputSection.appendChild(grammarResultSection);

    // 添加点击事件
    grammarCheckBtn.addEventListener('click', async () => {
        const translationResult = document.getElementById('translationResult');
        const text = translationResult.textContent;
        
        if (!text || text === '翻译结果将显示在这里...') {
            alert('请先进行翻译');
            return;
        }

        // 显示加载状态
        grammarCheckBtn.disabled = true;
        grammarCheckBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 检查中...';

        try {
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
                            content: "你是一个专业的语言校对专家。请检查用户提供的文本，分析其中的语法、用词和表达问题，并给出改进建议,尤其要保证翻译的简洁性。"
                        },
                        {
                            role: "user",
                            content: `请帮我检查以下${currentDirection === 'zhToEn' ? '英文' : '中文'}文本的语法和表达是否准确、地道：\n\n${text}\n\n请按以下格式回复：\n1. 指出存在的问题（如果有）\n2. 给出改进建议（如果需要）\n3. 总体评价`
                        }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid API response');
            }

            showGrammarResult(data.choices[0].message.content);
        } catch (error) {
            console.error('语法检查失败:', error);
            alert('语法检查失败: ' + error.message);
        } finally {
            grammarCheckBtn.disabled = false;
            grammarCheckBtn.innerHTML = '<i class="fas fa-check-double"></i> 语法校验';
        }
    });
}

// 显示语法检查结果
function showGrammarResult(result) {
    const resultContent = document.querySelector('.grammar-result-content');
    resultContent.innerHTML = formatGrammarResult(result);
    document.querySelector('.grammar-result-section').style.display = 'block';
}

// 隐藏语法检查结果
function hideGrammarResult() {
    document.querySelector('.grammar-result-section').style.display = 'none';
}

// 格式化语法检查结果
function formatGrammarResult(result) {
    return result
        .replace(/问题[：:]/gi, '<span class="grammar-issue">问题：</span>')
        .replace(/建议[：:]/gi, '<span class="grammar-suggestion">建议：</span>')
        .replace(/总体评价[：:]/gi, '<span class="grammar-summary">总体评价：</span>')
        .replace(/(\d+\.|•)/g, '<br>$1')
        .replace(/\n/g, '<br>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// 添加文件上传相关的事件监听器
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    console.log('Setting up file upload...', { uploadArea, fileInput }); // 调试信息

    // 点击上传区域触发文件选择
    uploadArea.addEventListener('click', (e) => {
        console.log('Upload area clicked'); // 调试信息
        fileInput.click();
    });

    // 处理文件选择
    fileInput.addEventListener('change', (e) => {
        console.log('File selected:', e.target.files); // 调试信息
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    // 处理拖放
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
}

// 添加进度显示函数
function showProgress(message) {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    
    progressBar.style.display = 'block';
    progressText.textContent = message;
}

// 隐藏进度条
function hideProgress() {
    const progressBar = document.querySelector('.progress-bar');
    progressBar.style.display = 'none';
}

// 显示错误信息
function showError(message) {
    alert(message); // 可以改为更友好的错误提示方式
}

// 在初始化函数中添加文件上传设置
async function initializeApp() {
    await loadTermsDatabase();
    setupEventListeners();
    setupGrammarCheck();
    setupFileUpload();
}

// 添加文件结构解析函数
async function parseFileStructure(text, fileType) {
    const sections = [];
    
    switch (fileType) {
        case 'md':
            // 处理 Markdown 文件
            const lines = text.split('\n');
            let currentSection = { type: 'text', content: '', format: {} };
            
            for (const line of lines) {
                if (line.startsWith('#')) {
                    if (currentSection.content) {
                        sections.push(currentSection);
                    }
                    currentSection = {
                        type: 'heading',
                        level: line.match(/^#+/)[0].length,
                        content: line.replace(/^#+\s*/, ''),
                        format: { heading: true }
                    };
                } else if (line.match(/^```/)) {
                    if (currentSection.content) {
                        sections.push(currentSection);
                    }
                    sections.push({
                        type: 'code',
                        content: line,
                        format: { code: true }
                    });
                    currentSection = { type: 'text', content: '', format: {} };
                } else {
                    currentSection.content += line + '\n';
                }
            }
            if (currentSection.content) {
                sections.push(currentSection);
            }
            break;
            
        default:
            // 对于其他类型的文件，简单按段落分割
            sections.push({
                type: 'text',
                content: text,
                format: {}
            });
    }
    
    return sections;
}

// 添加翻译段落函数
async function translateSections(sections) {
    const translatedSections = [];
    let progress = 0;
    
    for (const section of sections) {
        if (section.type === 'code') {
            // 代码块直接保留
            translatedSections.push(section);
        } else {
            // 翻译文本内容
            const translatedContent = await translate(section.content);
            translatedSections.push({
                ...section,
                content: translatedContent
            });
        }
        
        // 更新进度
        progress += (1 / sections.length) * 100;
        showProgress(`翻译进度: ${Math.round(progress)}%`);
    }
    
    return translatedSections;
}

// 添加文件重建函数
async function rebuildFile(sections, fileType) {
    let output = '';
    
    switch (fileType) {
        case 'md':
            // 重建 Markdown 文件
            sections.forEach(section => {
                if (section.type === 'heading') {
                    output += '#'.repeat(section.level) + ' ' + section.content + '\n\n';
                } else if (section.type === 'code') {
                    output += section.content + '\n';
                } else {
                    output += section.content + '\n';
                }
            });
            break;
            
        default:
            // 对于其他类型的文件，简单连接内容
            output = sections.map(section => section.content).join('\n\n');
    }
    
    return output;
}

// 修改文件上传处理函数
async function handleFileUpload(file) {
    console.log('Handling file upload:', file);
    try {
        const formData = new FormData();
        formData.append('file', file);

        showProgress('正在上传文件...');

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || '上传失败');
        }

        showProgress('正在分析文件结构...');
        const sections = await parseFileStructure(data.text, file.name.split('.').pop().toLowerCase());
        
        // 开始翻译
        const translatedSections = await translateSections(sections);
        
        // 重建文件
        const outputFile = await rebuildFile(translatedSections, file.name.split('.').pop().toLowerCase());
        
        // 导出文件
        await exportFile(outputFile, file.name);
        
    } catch (error) {
        console.error('文件处理错误:', error);
        showError(`文件处理失败: ${error.message}`);
    } finally {
        hideProgress();
    }
}

// 添加文件导出函数
async function exportFile(content, originalName) {
    try {
        const response = await fetch('/api/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content,
                format: originalName.split('.').pop().toLowerCase(),
                originalName
            })
        });

        if (!response.ok) {
            throw new Error('导出失败');
        }

        // 处理文件下载
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translated_${originalName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('导出文件错误:', error);
        showError(`导出失败: ${error.message}`);
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
}); 