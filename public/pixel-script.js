// 配置
const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';
const UNSPLASH_ACCESS_KEY = 'QthsXxlR7kx51aNa-25C-jGr8AdAXc8Z9SXgLFmfJ7E';

// DOM 元素
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const sourceImage = document.getElementById('sourceImage');
const pixelCanvas = document.getElementById('pixelCanvas');
const pixelSize = document.getElementById('pixelSize');
const pixelSizeValue = document.getElementById('pixelSizeValue');
const downloadBtn = document.getElementById('downloadBtn');
const loadingIndicator = document.getElementById('loadingIndicator');

// 画布上下文
const ctx = pixelCanvas.getContext('2d');

// 当前图片数据
let currentImageData = null;

// 事件监听
generateBtn.addEventListener('click', generatePixelArt);
pixelSize.addEventListener('input', updatePixelSize);
pixelSize.addEventListener('change', pixelateImage);
downloadBtn.addEventListener('click', downloadImage);

// 生成像素艺术
async function generatePixelArt() {
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    try {
        showLoading(true);
        generateBtn.disabled = true;
        
        // 构建搜索参数
        const searchParams = new URLSearchParams({
            query: prompt,
            orientation: 'landscape',
            per_page: 10, // 获取多张图片
            content_filter: 'high',
            order_by: 'relevant' // 按相关度排序
        });
        
        // 使用 Unsplash 搜索 API 获取图片
        const response = await fetch(`${UNSPLASH_API_URL}?${searchParams}`, {
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error('图片搜索失败');
        }
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            throw new Error('未找到相关图片');
        }
        
        // 从结果中选择最相关的图片
        const imageUrl = selectBestImage(data.results, prompt);
        
        // 加载图片
        sourceImage.src = imageUrl;
        sourceImage.crossOrigin = "Anonymous";
        
        sourceImage.onerror = () => {
            throw new Error('图片加载失败');
        };
        
        sourceImage.onload = () => {
            currentImageData = imageUrl;
            pixelateImage();
            downloadBtn.disabled = false;
            showLoading(false);
            generateBtn.disabled = false;
        };

    } catch (error) {
        console.error('生成失败:', error);
        // 如果是搜索无结果，使用备选方案
        if (error.message === '未找到相关图片' || error.message === '图片搜索失败') {
            try {
                // 尝试使用更简单的关键词重新搜索
                const simplifiedPrompt = simplifyPrompt(prompt);
                const retryResponse = await fetch(`${UNSPLASH_API_URL}?query=${encodeURIComponent(simplifiedPrompt)}&orientation=landscape&per_page=1`, {
                    headers: {
                        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
                    }
                });
                
                if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    if (retryData.results && retryData.results.length > 0) {
                        sourceImage.src = retryData.results[0].urls.regular;
                        sourceImage.crossOrigin = "Anonymous";
                        return;
                    }
                }
            } catch (e) {
                console.error('备选搜索失败:', e);
            }
        }
        
        alert('生成失败，请稍后重试');
        showLoading(false);
        generateBtn.disabled = false;
        
        // 清理已有内容
        sourceImage.src = '';
        ctx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);
        downloadBtn.disabled = true;
    }
}

// 从搜索结果中选择最佳图片
function selectBestImage(images, prompt) {
    // 优先选择描述或标签匹配度高的图片
    const promptWords = prompt.toLowerCase().split(/\s+/);
    
    let bestMatch = images[0];
    let highestScore = 0;
    
    images.forEach(image => {
        let score = 0;
        const description = (image.description || '').toLowerCase();
        const altDescription = (image.alt_description || '').toLowerCase();
        const tags = image.tags || [];
        
        // 检查描述匹配度
        promptWords.forEach(word => {
            if (description.includes(word)) score += 2;
            if (altDescription.includes(word)) score += 1;
        });
        
        // 检查标签匹配度
        tags.forEach(tag => {
            if (promptWords.includes(tag.toLowerCase())) {
                score += 3;
            }
        });
        
        // 考虑图片质量因素
        if (image.width >= 1920) score += 1;
        if (image.likes > 10) score += 1;
        
        if (score > highestScore) {
            highestScore = score;
            bestMatch = image;
        }
    });
    
    return bestMatch.urls.regular;
}

// 简化搜索提示词
function simplifyPrompt(prompt) {
    // 移除特殊字符和多余空格
    let simplified = prompt.replace(/[^\w\s]/g, ' ').trim();
    
    // 分割成单词并只保留主要词汇
    const words = simplified.split(/\s+/);
    if (words.length > 2) {
        // 只保留前两个词
        simplified = words.slice(0, 2).join(' ');
    }
    
    return simplified;
}

// 更新像素大小显示
function updatePixelSize() {
    pixelSizeValue.textContent = `${pixelSize.value}px`;
}

// 像素化图片
function pixelateImage() {
    if (!currentImageData) return;

    try {
        const size = parseInt(pixelSize.value);
        const img = sourceImage;
        
        // 设置画布尺寸，保持合适的宽高比
        const maxWidth = 800;
        const maxHeight = 600;
        let w = img.width;
        let h = img.height;
        
        if (w > maxWidth) {
            const ratio = maxWidth / w;
            w = maxWidth;
            h = Math.floor(h * ratio);
        }
        
        if (h > maxHeight) {
            const ratio = maxHeight / h;
            h = maxHeight;
            w = Math.floor(w * ratio);
        }
        
        pixelCanvas.width = w;
        pixelCanvas.height = h;

        // 清空画布
        ctx.clearRect(0, 0, w, h);

        // 绘制原图并保持比例
        ctx.drawImage(img, 0, 0, w, h);

        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // 像素化处理
        for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
                // 获取块的平均颜色
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let py = 0; py < size && y + py < h; py++) {
                    for (let px = 0; px < size && x + px < w; px++) {
                        const i = ((y + py) * w + (x + px)) * 4;
                        r += data[i];
                        g += data[i + 1];
                        b += data[i + 2];
                        count++;
                    }
                }
                
                // 计算平均值
                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);

                // 填充像素块
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, y, size, size);
            }
        }
    } catch (error) {
        handleError(error);
    }
}

// 下载图片
function downloadImage() {
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = pixelCanvas.toDataURL('image/png');
    link.click();
}

// 显示/隐藏加载指示器
function showLoading(show) {
    loadingIndicator.classList.toggle('active', show);
}

// 添加错误处理函数
function handleError(error) {
    console.error('Error:', error);
    alert('操作失败，请稍后重试');
    showLoading(false);
    generateBtn.disabled = false;
    downloadBtn.disabled = true;
} 