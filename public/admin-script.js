let categoriesData = null;
let currentEditingTerm = null;

// IPA 映射表
const ipaMap = {
    // 元音
    'a': 'æ',
    'e': 'e',
    'i': 'aɪ',
    'o': 'oʊ',
    'u': 'ʌ',
    'oo': 'uː',
    'ee': 'iː',
    'ea': 'iː',
    'er': 'ər',
    'ar': 'ɑːr',
    'or': 'ɔːr',
    'ir': 'ɜːr',
    
    // 辅音
    'th': 'θ',
    'ch': 'tʃ',
    'sh': 'ʃ',
    'ph': 'f',
    'wh': 'w',
    'ng': 'ŋ',
    'ck': 'k',
    
    // 常见组合
    'tion': 'ʃən',
    'sion': 'ʒən',
    'ture': 'tʃər',
    'sure': 'ʒər',
    'age': 'ɪdʒ',
    'ous': 'əs',
    'able': 'əbl',
    'ible': 'ɪbl',
    'ment': 'mənt',
    'ness': 'nəs',
    'ful': 'fʊl',
    'less': 'ləs',
    'ing': 'ɪŋ',
    'ed': 'd',
    'er': 'ər',
    'est': 'ɪst',
    'ly': 'li',
    'y': 'i',
    
    // 啤酒相关特殊词
    'ale': 'eɪl',
    'beer': 'bɪər',
    'brew': 'bruː',
    'malt': 'mɔːlt',
    'hop': 'hɒp',
    'yeast': 'jiːst',
    'craft': 'kræft',
    'draft': 'dræft',
    'lager': 'ˈlɑːɡər',
    'stout': 'staʊt',
    'porter': 'ˈpɔːrtər',
    'pilsner': 'ˈpɪlznər',
    'weizen': 'ˈvaɪtsən',
    'dunkel': 'ˈdʊŋkəl',
    'saison': 'seɪˈzɒn',
    'tripel': 'ˈtrɪpəl',
    'dubbel': 'ˈdʌbəl',
    'lambic': 'ˈlæmbɪk',
    'gose': 'ˈɡoʊzə',
    'kolsch': 'kœlʃ',
};

// 添加全局变量来存储当前筛选状态
let currentFilter = {
    categoryKey: '',
    tag: ''
};

// 生成音标
function generateIPA(word) {
    // 转换为小写并分割成单词
    const words = word.toLowerCase().split(/[\s-]+/);
    let result = [];
    
    for (let word of words) {
        // 检查完整单词是否在映射表中
        if (ipaMap[word]) {
            result.push(ipaMap[word]);
            continue;
        }
        
        // 如果不是完整单词匹配，则进行部分匹配
        let temp = word;
        let ipa = '';
        
        while (temp.length > 0) {
            let found = false;
            // 从最长的可能组合开始匹配
            for (let len = Math.min(temp.length, 5); len > 0; len--) {
                const part = temp.slice(0, len);
                if (ipaMap[part]) {
                    ipa += ipaMap[part];
                    temp = temp.slice(len);
                    found = true;
                    break;
                }
            }
            // 如果没有匹配到任何组合，保留原字符
            if (!found) {
                ipa += temp[0];
                temp = temp.slice(1);
            }
        }
        result.push(ipa);
    }
    
    // 添加音标符号并返回
    return '/' + result.join(' ') + '/';
}

// 加载数据
async function loadData() {
    try {
        const response = await fetch('/beer_categories.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        categoriesData = await response.json();
        initializeAdmin();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// 初始化管理界面
function initializeAdmin() {
    renderCategories();
    renderCategorySelect();
    setupEventListeners();
    setupImportFeatures();
}

// 渲染分类列表
function renderCategories() {
    const categoryList = document.querySelector('.category-list');
    categoryList.innerHTML = '';
    
    Object.entries(categoriesData.categories).forEach(([key, category]) => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.innerHTML = `
            <span>${category.cn} (${category.en})</span>
            <div class="category-actions">
                <button onclick="editCategory('${key}')">编辑</button>
                <button onclick="deleteCategory('${key}')">删除</button>
            </div>
        `;
        categoryList.appendChild(categoryItem);
    });
}

// 渲染分类选择器
function renderCategorySelect() {
    const select = document.getElementById('categorySelect');
    select.innerHTML = '<option value="">选择分类...</option>';
    
    Object.entries(categoriesData.categories).forEach(([key, category]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${category.cn} (${category.en})`;
        select.appendChild(option);
    });
}

// 渲染术语列表
function renderTermsList(categoryKey, tag = '') {
    const termsList = document.querySelector('.terms-list');
    termsList.innerHTML = '';
    
    // 更新当前筛选状态
    currentFilter.categoryKey = categoryKey;
    currentFilter.tag = tag;
    
    if (!categoryKey) {
        termsList.innerHTML = '<div class="info-message">请选择分类查看术语</div>';
        return;
    }
    
    const category = categoriesData.categories[categoryKey];
    if (!category || !category.terms) return;
    
    // 修改筛选逻辑，使用不区分大小写的比较
    const filteredTerms = tag 
        ? category.terms.filter(term => 
            term.tags && term.tags.some(t => 
                t.toLowerCase() === tag.toLowerCase()
            )
        )
        : category.terms;
    
    if (tag) {
        // 添加标签筛选提示
        const filterInfo = document.createElement('div');
        filterInfo.className = 'filter-info';
        filterInfo.innerHTML = `
            <span>当前筛选: ${tag}</span>
            <button onclick="clearTagFilter()" class="clear-filter-btn">清除筛选</button>
        `;
        termsList.appendChild(filterInfo);
    }
    
    filteredTerms.forEach((term, index) => {
        const termItem = document.createElement('div');
        termItem.className = 'term-item';
        termItem.innerHTML = `
            <div class="term-item-content">
                <div class="term-info">
                    <span class="term-name">${term.cn} (${term.en})</span>
                    <div class="term-tags">
                        ${term.tags ? term.tags.map(t => 
                            `<span class="tag" onclick="filterByTag('${t}')">${t}</span>`
                        ).join('') : ''}
                    </div>
                </div>
                <div class="term-actions">
                    <button onclick="editTerm('${categoryKey}', ${index})">编辑</button>
                    <button onclick="deleteTerm('${categoryKey}', ${index})">删除</button>
                </div>
            </div>
        `;
        termsList.appendChild(termItem);
    });
    
    if (filteredTerms.length === 0) {
        termsList.innerHTML += '<div class="info-message">没有找到匹配的术语</div>';
    }
}

// 编辑术语
function editTerm(categoryKey, termIndex) {
    const term = categoriesData.categories[categoryKey].terms[termIndex];
    currentEditingTerm = { categoryKey, termIndex };
    
    // 填充表单
    document.getElementById('categorySelect').value = categoryKey;
    document.getElementById('termEn').value = term.en;
    document.getElementById('termCn').value = term.cn;
    document.getElementById('termIpa').value = term.ipa || '';
    document.getElementById('termTags').value = term.tags.join(', ');
    document.getElementById('termDescription').value = term.description || '';
    
    // 更改保存按钮文本
    document.getElementById('saveTermBtn').textContent = '更新术语';
    
    // 滚动到表单位置
    document.querySelector('.term-form').scrollIntoView({ behavior: 'smooth' });
}

// 删除术语
async function deleteTerm(categoryKey, termIndex) {
    if (!confirm('确定要删除这个术语吗？')) return;
    
    try {
        const response = await fetch('/api/terms', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                categoryKey,
                termIndex
            })
        });
        
        if (!response.ok) throw new Error('删除失败');
        
        // 更新本地数据
        categoriesData.categories[categoryKey].terms.splice(termIndex, 1);
        renderTermsList(categoryKey);
        alert('删除成功');
    } catch (error) {
        console.error('Error deleting term:', error);
        alert('删除失败: ' + error.message);
    }
}

// 更新保存术语函数
async function saveTerm() {
    const categoryKey = document.getElementById('categorySelect').value;
    if (!categoryKey) {
        alert('请选择分类');
        return;
    }
    
    const term = {
        en: document.getElementById('termEn').value,
        cn: document.getElementById('termCn').value,
        ipa: document.getElementById('termIpa').value,
        tags: document.getElementById('termTags').value.split(',').map(t => t.trim()).filter(t => t),
        description: document.getElementById('termDescription').value
    };
    
    if (!term.en || !term.cn) {
        alert('请填写英文和中文名称');
        return;
    }
    
    try {
        const url = '/api/terms';
        const method = currentEditingTerm ? 'PUT' : 'POST';
        const body = currentEditingTerm 
            ? { ...currentEditingTerm, term }
            : { categoryKey, term };
            
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) throw new Error(currentEditingTerm ? '更新失败' : '保存失败');
        
        // 更新本地数据
        if (currentEditingTerm) {
            categoriesData.categories[currentEditingTerm.categoryKey].terms[currentEditingTerm.termIndex] = term;
        } else {
            categoriesData.categories[categoryKey].terms.push(term);
        }
        
        clearForm();
        renderTermsList(categoryKey);
        alert(currentEditingTerm ? '更新成功' : '保存成功');
    } catch (error) {
        console.error('Error saving term:', error);
        alert('操作失败: ' + error.message);
    }
}

// 修改清空表单函数
function clearForm() {
    document.getElementById('termEn').value = '';
    document.getElementById('termCn').value = '';
    document.getElementById('termIpa').value = '';
    document.getElementById('termTags').value = '';
    document.getElementById('termDescription').value = '';
    document.getElementById('saveTermBtn').textContent = '保存术语';
    currentEditingTerm = null;
}

// 更新事件监听器设置
function setupEventListeners() {
    document.getElementById('saveTermBtn').addEventListener('click', saveTerm);
    document.getElementById('addCategoryBtn').addEventListener('click', showAddCategoryDialog);
    
    // 添加分类选择变化监听
    document.getElementById('categorySelect').addEventListener('change', (e) => {
        renderTermsList(e.target.value);
    });
    
    // 添加音标生成按钮事件
    document.getElementById('generateIpaBtn').addEventListener('click', () => {
        const englishName = document.getElementById('termEn').value;
        if (!englishName) {
            alert('请先输入英文名称');
            return;
        }
        
        const ipaInput = document.getElementById('termIpa');
        ipaInput.value = generateIPA(englishName);
    });
    
    // 添加英文名称输入监听，实时更新生成按钮状态
    document.getElementById('termEn').addEventListener('input', (e) => {
        const generateBtn = document.getElementById('generateIpaBtn');
        generateBtn.disabled = !e.target.value;
    });
    
    // 添加检查重复按钮事件
    document.getElementById('checkDuplicatesBtn').addEventListener('click', checkDuplicates);
}

// 添加分类对话框
function showAddCategoryDialog() {
    const categoryKey = prompt('请输入分类键名 (例如: HISTORY_CULTURE):');
    if (!categoryKey) return;
    
    const formattedKey = formatCategoryKey(categoryKey);
    
    const categoryEn = prompt('请输入分类英文名称:');
    if (!categoryEn) return;
    
    const categoryCn = prompt('请输入分类中文名称:');
    if (!categoryCn) return;
    
    addNewCategory(formattedKey, categoryEn, categoryCn);
}

// 添加新分类
async function addNewCategory(key, en, cn) {
    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                key,
                category: {
                    en,
                    cn,
                    terms: []
                }
            })
        });
        
        if (!response.ok) throw new Error('添加分类失败');
        
        // 更新本地数据
        categoriesData.categories[key] = {
            en,
            cn,
            terms: []
        };
        
        // 重新渲染界面
        renderCategories();
        renderCategorySelect();
        alert('添加分类成功');
    } catch (error) {
        console.error('Error adding category:', error);
        alert('添加分类失败: ' + error.message);
    }
}

// 编辑分类
function editCategory(key) {
    const category = categoriesData.categories[key];
    if (!category) return;
    
    const newEn = prompt('请输入新的英文名称:', category.en);
    if (!newEn) return;
    
    const newCn = prompt('请输入新的中文名称:', category.cn);
    if (!newCn) return;
    
    updateCategory(key, newEn, newCn);
}

// 更新分类
async function updateCategory(key, en, cn) {
    try {
        const response = await fetch('/api/categories', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                key,
                category: {
                    en,
                    cn,
                    terms: categoriesData.categories[key].terms
                }
            })
        });
        
        if (!response.ok) throw new Error('更新分类失败');
        
        // 更新本地数据
        categoriesData.categories[key] = {
            ...categoriesData.categories[key],
            en,
            cn
        };
        
        // 重新渲染界面
        renderCategories();
        renderCategorySelect();
        alert('更新分类成功');
    } catch (error) {
        console.error('Error updating category:', error);
        alert('更新分类失败: ' + error.message);
    }
}

// 删除分类
async function deleteCategory(key) {
    if (!confirm(`确定要删除分类 "${categoriesData.categories[key].cn}" 吗？\n注意：该分类下的所有术语都会被删除！`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/categories', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key })
        });
        
        if (!response.ok) throw new Error('删除分类失败');
        
        // 更新本地数据
        delete categoriesData.categories[key];
        
        // 重新渲染界面
        renderCategories();
        renderCategorySelect();
        alert('删除分类成功');
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('删除分类失败: ' + error.message);
    }
}

// CSV导入相关函数
function setupImportFeatures() {
    const importBtn = document.getElementById('importCsvBtn');
    const fileInput = document.getElementById('csvFileInput');
    
    importBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileSelect);
}

// 处理文件选择
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const records = parseCSV(text);
        await importRecords(records);
    } catch (error) {
        showImportResult('error', `导入失败: ${error.message}`);
    }
    
    // 重置文件输入
    event.target.value = '';
}

// 解析CSV文件
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].trim().split(',');
    const records = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        const record = {};
        
        headers.forEach((header, index) => {
            record[header.trim()] = values[index]?.trim() || '';
        });
        
        records.push(record);
    }
    
    return records;
}

// 格式化分类键名
function formatCategoryKey(key) {
    return key
        .toUpperCase()                         // 转换为大写
        .trim()                                // 去除首尾空格
        .replace(/[^A-Z0-9]+/g, '_')          // 非字母数字字符替换为下划线
        .replace(/^_+|_+$/g, '')              // 去除首尾下划线
        .replace(/_+/g, '_');                 // 多个下划线替换为单个
}

// 修改导入记录函数
async function importRecords(records) {
    const progress = createProgressBar();
    const total = records.length;
    let imported = 0;
    let errors = [];
    
    // 按分类分组记录
    const recordsByCategory = {};
    records.forEach(record => {
        const categoryKey = formatCategoryKey(record.category_key); // 使用格式化后的键名
        if (!recordsByCategory[categoryKey]) {
            recordsByCategory[categoryKey] = {
                category: {
                    en: record.category_en,
                    cn: record.category_cn,
                    terms: []
                },
                terms: []
            };
        }
        
        // 处理标签
        const tags = record.term_tags ? record.term_tags.split(';').map(tag => tag.trim()) : [];
        
        // 自动生成音标
        const ipa = record.term_ipa || generateIPA(record.term_en);
        
        recordsByCategory[categoryKey].terms.push({
            en: record.term_en,
            cn: record.term_cn,
            ipa: ipa,
            description: record.term_description,
            tags: tags
        });
    });
    
    // 逐个处理分类
    for (const [categoryKey, data] of Object.entries(recordsByCategory)) {
        try {
            // 检查分类是否存在
            if (!categoriesData.categories[categoryKey]) {
                // 创建新分类
                await createCategory(categoryKey, data.category);
            }
            
            // 添加术语
            for (const term of data.terms) {
                await addTermToCategory(categoryKey, term);
                imported++;
                updateProgress(progress, (imported / total) * 100);
            }
        } catch (error) {
            errors.push(`分类 ${categoryKey} 处理失败: ${error.message}`);
        }
    }
    
    // 移除进度条
    setTimeout(() => progress.remove(), 500);
    
    // 显示结果
    if (errors.length > 0) {
        showImportResult('error', `导入完成，但有${errors.length}个错误\n${errors.join('\n')}`);
    } else {
        showImportResult('success', `成功导入 ${imported} 条记录`);
    }
    
    // 重新加载数据
    await loadData();
}

// 创建新分类
async function createCategory(key, category) {
    const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, category })
    });
    
    if (!response.ok) throw new Error('创建分类失败');
}

// 添加术语到分类
async function addTermToCategory(categoryKey, term) {
    const response = await fetch('/api/terms', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categoryKey, term })
    });
    
    if (!response.ok) throw new Error('添加术语失败');
}

// 创建进度条
function createProgressBar() {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'import-progress';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'import-progress-bar';
    
    progressContainer.appendChild(progressBar);
    document.body.appendChild(progressContainer);
    
    return progressContainer;
}

// 更新进度条
function updateProgress(progressContainer, percentage) {
    const progressBar = progressContainer.querySelector('.import-progress-bar');
    progressBar.style.width = `${percentage}%`;
}

// 显示导入结果
function showImportResult(type, message) {
    const resultDiv = document.createElement('div');
    resultDiv.className = `import-result ${type}`;
    resultDiv.textContent = message;
    
    document.body.appendChild(resultDiv);
    
    setTimeout(() => {
        resultDiv.style.opacity = '0';
        setTimeout(() => resultDiv.remove(), 300);
    }, 3000);
}

// 检查重复术语
function checkDuplicates() {
    const duplicates = new Map();
    
    // 遍历所有分类和术语
    Object.entries(categoriesData.categories).forEach(([categoryKey, category]) => {
        category.terms.forEach((term, index) => {
            // 使用英文名称作为键（转换为小写以忽略大小写）
            const key = term.en.toLowerCase();
            if (!duplicates.has(key)) {
                duplicates.set(key, []);
            }
            duplicates.get(key).push({
                categoryKey,
                index,
                term
            });
        });
    });
    
    // 过滤出确实有重复的术语
    const realDuplicates = Array.from(duplicates.entries())
        .filter(([_, terms]) => terms.length > 1);
    
    if (realDuplicates.length === 0) {
        alert('没有发现重复的术语');
        return;
    }
    
    showDuplicatesDialog(realDuplicates);
}

// 修改显示重复术语对话框函数
function showDuplicatesDialog(duplicates) {
    const dialog = document.createElement('div');
    dialog.className = 'duplicates-dialog';
    dialog.innerHTML = `
        <h3>发现 ${duplicates.length} 组重复术语</h3>
        <div class="duplicates-list">
            ${duplicates.map(([key, terms]) => `
                <div class="duplicate-group">
                    <h4>术语: ${key}</h4>
                    <div class="duplicate-terms">
                        ${terms.map(({categoryKey, term, index}) => `
                            <div class="duplicate-term">
                                <div class="duplicate-term-info">
                                    <div>分类: ${categoriesData.categories[categoryKey].cn}</div>
                                    <div>中文: ${term.cn}</div>
                                    <div>英文: ${term.en}</div>
                                    <div class="term-details">
                                        ${term.ipa ? `<div>音标: ${term.ipa}</div>` : ''}
                                        ${term.description ? `<div>描述: ${term.description}</div>` : ''}
                                        ${term.tags?.length ? `<div>标签: ${term.tags.map(tag => 
                                            `<span class="tag" onclick="filterByTag('${tag}')">${tag}</span>`
                                        ).join(' ')}</div>` : ''}
                                    </div>
                                </div>
                                <button onclick="keepTermAndDeleteOthers('${key}', '${categoryKey}', ${index})" class="keep-btn">
                                    保留此条
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="dialog-actions">
            <button onclick="closeDialog(this.closest('.duplicates-dialog'))">关闭</button>
        </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.onclick = () => closeDialog(dialog);
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
}

// 添加保留某一条并删除其他重复项的函数
async function keepTermAndDeleteOthers(termKey, keepCategoryKey, keepIndex) {
    if (!confirm('确定要保留此条并删除其他重复项吗？')) return;
    
    const duplicateTerms = [];
    
    // 收集所有重复项
    Object.entries(categoriesData.categories).forEach(([categoryKey, category]) => {
        category.terms.forEach((term, index) => {
            if (term.en.toLowerCase() === termKey.toLowerCase() &&
                (categoryKey !== keepCategoryKey || index !== keepIndex)) {
                duplicateTerms.push({ categoryKey, index });
            }
        });
    });
    
    try {
        // 按索引从大到小排序，以避免删除影响索引
        duplicateTerms.sort((a, b) => b.index - a.index);
        
        // 逐个删除重复项
        for (const { categoryKey, index } of duplicateTerms) {
            await fetch('/api/terms', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    categoryKey,
                    termIndex: index
                })
            });
            
            // 更新本地数据
            categoriesData.categories[categoryKey].terms.splice(index, 1);
        }
        
        // 关闭对话框
        const dialog = document.querySelector('.duplicates-dialog');
        if (dialog) {
            closeDialog(dialog);
        }
        
        // 重新渲染当前分类的术语列表
        const currentCategory = document.getElementById('categorySelect').value;
        if (currentCategory) {
            renderTermsList(currentCategory);
        }
        
        alert(`成功删除 ${duplicateTerms.length} 个重复项`);
    } catch (error) {
        console.error('Error removing duplicates:', error);
        alert('删除重复项时出错: ' + error.message);
    }
}

// 关闭对话框
function closeDialog(dialog) {
    dialog.previousElementSibling?.remove(); // 移除遮罩
    dialog.remove();
}

// 标签筛选函数
function filterByTag(tag) {
    // 获取当前选中的分类
    const categoryKey = currentFilter.categoryKey || document.getElementById('categorySelect').value;
    if (!categoryKey) {
        alert('请先选择一个分类');
        return;
    }
    
    // 应用标签筛选
    renderTermsList(categoryKey, tag);
}

// 清除标签筛选
function clearTagFilter() {
    const categoryKey = document.getElementById('categorySelect').value;
    if (!categoryKey) return;
    
    renderTermsList(categoryKey);
}

// 启动应用
loadData(); 