// EVE军团OA - 主逻辑
// 处理登录、导航、图片上传、AI识别、花名册提交等

// ==================== 内嵌配置（确保可用） ====================
if (typeof window.CONFIG === 'undefined') {
    window.CONFIG = {
        DOUBAO: {
            API_KEY: 'cbd75516-1387-4a79-a391-91f450a6dacc',
            ENDPOINT_ID: 'ep-20260429133513-6n8wp',
            API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
        },
        FEISHU: {
            APP_ID: 'cli_aab5fc9c81785cbd',
            APP_SECRET: 'hYhh2CYsV9TDG7kglDPghdXra6BCOfcD',
            APP_TOKEN: 'M2Xwbaybpaoej9sjCHicwg5Unib',
            TABLE_IDS: {
                ROSTER: 'tblQf7bADmFSunna',
                CHARACTER: 'tbl5BeZqf7Jk96On'
            }
        },
        APP: {
            BACKEND_URL: ''
        }
    };
    console.log('CONFIG已内嵌（config.js未加载）');
}

// ==================== 全局变量 ====================
let currentUser = null;
let sidebarOpen = false;
let doubaoAPI = null;
let feishuAPI = null;

// Demo mode flag
const DEMO_MODE = false;  // true = Demo模式（模拟数据）, false = 真实API

// ==================== 初始化 ====================
function initApp() {
    console.log('EVE军团OA v1.0.0 初始化...');
    
    // 初始化API类
    try {
        if (typeof DoubaoAPI !== 'undefined') {
            doubaoAPI = new DoubaoAPI();
            console.log('DoubaoAPI OK');
        }
    } catch(e) {
        console.error('DoubaoAPI init failed:', e);
    }
    
    try {
        if (typeof FeishuAPI !== 'undefined') {
            feishuAPI = new FeishuAPI();
            console.log('FeishuAPI OK');
        }
    } catch(e) {
        console.error('FeishuAPI init failed:', e);
    }
    
    // 检查登录状态
    checkLoginStatus();
    
    // 绑定事件
    bindEvents();
    
    console.log('初始化完成');
}

// ==================== 登录逻辑 ====================
function checkLoginStatus() {
    const savedUser = localStorage.getItem('eve_oa_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainPage();
    } else {
        showLoginPage();
    }
}

function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username) {
        alert('请输入角色名或QQ号');
        return;
    }
    
    // Demo模式：模拟登录
    currentUser = {
        username: username,
        role: username === 'admin' ? 'admin' : 'member',
        loginTime: new Date().toISOString(),
        points: 1250,
        losses: 3,
        attendance: 15
    };
    
    localStorage.setItem('eve_oa_user', JSON.stringify(currentUser));
    
    showMainPage();
    showNotificationMessage('登录成功！欢迎回来，指挥官！');
}

function handleLogout() {
    localStorage.removeItem('eve_oa_user');
    currentUser = null;
    showLoginPage();
}

function showLoginPage() {
    document.getElementById('login-page').classList.add('active');
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('main-page').style.display = 'none';
}

function showMainPage() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-page').style.display = 'block';
    
    updateUserInfo();
    loadHomeData();
}

function updateUserInfo() {
    if (!currentUser) return;
    
    const username = currentUser.username;
    document.getElementById('sidebar-username').textContent = username;
    document.getElementById('welcome-name').textContent = username;
    
    if (currentUser.role === 'admin') {
        document.getElementById('admin-menu').style.display = 'block';
    }
}

// ==================== 导航逻辑 ====================
function navigateTo(page) {
    // 隐藏所有页面
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(p => p.classList.remove('active'));
    
    // 显示目标页面
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // 更新侧边栏菜单状态
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => item.classList.remove('active'));
    
    // 更新页面标题
    const titles = {
        'home': '首页',
        'roster': '登记军团花名册',
        'loss': '战损登记',
        'attendance': '出勤记录',
        'assets': '军团资产',
        'points': '我的积分',
        'announce': '公告栏',
        'admin': '管理后台'
    };
    document.getElementById('page-title').textContent = titles[page] || '首页';
    
    // 关闭侧边栏
    toggleSidebar(false);
    
    // 如果是花名册页面，预填QQ号
    if (page === 'roster') {
        prefillRosterQQ();
    }
}

function toggleSidebar(forceClose = null) {
    const sidebar = document.getElementById('sidebar');
    
    if (forceClose === false) {
        sidebar.classList.remove('active');
        sidebarOpen = false;
    } else {
        sidebar.classList.toggle('active');
        sidebarOpen = !sidebarOpen;
    }
}

// ==================== 首页数据加载 ====================
async function loadHomeData() {
    try {
        if (DEMO_MODE) {
            const user = currentUser;
            document.getElementById('stat-loss-count').textContent = user.losses || 3;
            document.getElementById('stat-points').textContent = formatNumber(user.points || 1250);
            document.getElementById('stat-attendance').textContent = user.attendance || 15;
            document.getElementById('stat-corps').textContent = '47';
        } else {
            // 真实模式：从飞书API加载（待实现）
        }
    } catch (error) {
        console.error('数据加载失败:', error);
    }
}

// ==================== 战损登记 - 图片上传 & AI识别 ====================
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        alert('请上传图片文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewArea = document.getElementById('preview-area');
        const previewImage = document.getElementById('preview-image');
        
        previewImage.src = e.target.result;
        previewArea.style.display = 'block';
        document.getElementById('upload-area').style.display = 'none';
        
        startRecognition(e.target.result);
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    document.getElementById('preview-area').style.display = 'none';
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('recognition-result').style.display = 'none';
    document.getElementById('file-input').value = '';
}

async function startRecognition(dataUrl) {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('recognition-result').style.display = 'none';
    
    try {
        if (DEMO_MODE) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mockResult = {
                type: 'character_info',
                character_name: currentUser.username,
                corporation: '维鲜集团',
                alliance: '无尽星河',
                skill_points: 70110651
            };
            displayRecognitionResult(mockResult);
        } else {
            const base64Data = dataUrl.split(',')[1];
            const imageType = dataUrl.split(';')[0].split(':')[1].split('/')[1];
            
            const result = await doubaoAPI.recognizeEveScreenshot(base64Data, imageType);
            displayRecognitionResult(result);
        }
    } catch (error) {
        console.error('识别失败:', error);
        alert(`识别失败: ${error.message}`);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayRecognitionResult(data) {
    const resultDiv = document.getElementById('recognition-result');
    const contentDiv = document.getElementById('result-content');
    
    contentDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    resultDiv.dataset.result = JSON.stringify(data);
    resultDiv.style.display = 'block';
}

async function confirmResult() {
    const resultDiv = document.getElementById('recognition-result');
    const data = JSON.parse(resultDiv.dataset.result);
    
    try {
        if (data.type === 'character_info') {
            await writeCharacterInfo(data);
        } else if (data.type === 'combat_loss') {
            await writeCombatLoss(data);
        } else {
            alert('该数据类型暂不支持自动录入');
            return;
        }
        
        showNotificationMessage('录入成功！');
        removeImage();
    } catch (error) {
        console.error('录入失败:', error);
        alert(`录入失败: ${error.message}`);
    }
}

function rejectResult() {
    if (confirm('确认识别错误？将保留图片，你可以手动填写。')) {
        alert('手动填写功能开发中...');
    }
}

async function writeCharacterInfo(data) {
    const fields = [
        { '角色名': data.character_name },
        { '军团': data.corporation || '' },
        { '联盟': data.alliance || '' },
        { '技能点': data.skill_points || 0 },
        { '更新时间': new Date().toISOString().split('T')[0] }
    ];
    
    const record = await feishuAPI.createRecord(
        CONFIG.FEISHU.TABLE_IDS.CHARACTER,
        fields
    );
    
    console.log('角色信息已写入:', record);
}

async function writeCombatLoss(data) {
    alert('战损记录表尚未创建，请在飞书中先创建数据表');
}

// ==================== 军团花名册功能 ====================
let rosterImageData = null;

function prefillRosterQQ() {
    if (!currentUser) return;
    
    const qqInput = document.getElementById('roster-qq');
    if (qqInput) {
        qqInput.value = currentUser.username || '未获取';
    }
}

function handleRosterImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        alert('请上传图片文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewArea = document.getElementById('roster-preview-area');
        const previewImage = document.getElementById('roster-preview-image');
        
        previewImage.src = e.target.result;
        previewArea.style.display = 'block';
        document.getElementById('roster-upload-area').style.display = 'none';
        
        rosterImageData = e.target.result;
        
        startRosterRecognition(e.target.result);
    };
    reader.readAsDataURL(file);
}

function removeRosterImage() {
    document.getElementById('roster-preview-area').style.display = 'none';
    document.getElementById('roster-upload-area').style.display = 'block';
    document.getElementById('roster-recognition-result').style.display = 'none';
    document.getElementById('roster-file-input').value = '';
    rosterImageData = null;
}

async function startRosterRecognition(dataUrl) {
    document.getElementById('roster-loading').style.display = 'block';
    document.getElementById('roster-recognition-result').style.display = 'none';
    
    try {
        if (DEMO_MODE) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mockResult = {
                type: 'character_info',
                character_name: '示例角色名',
                character_id: '1234567890'
            };
            displayRosterRecognitionResult(mockResult);
        } else {
            console.log('CONFIG exists:', !!window.CONFIG);
            
            if (!window.CONFIG || !window.CONFIG.DOUBAO) {
                throw new Error('CONFIG未定义，检查config.js是否加载');
            }
            
            const base64Data = dataUrl.split(',')[1];
            const imageType = dataUrl.split(';')[0].split(':')[1].split('/')[1];
            
            const apiUrl = CONFIG.DOUBAO.API_URL;
            const apiKey = CONFIG.DOUBAO.API_KEY;
            const endpointId = CONFIG.DOUBAO.ENDPOINT_ID;
            
            const prompt = '你是EVE Online游戏数据分析助手。请识别图片中的EVE角色信息，提取character_name(去掉[军团缩写]前缀)和character_id，严格按JSON返回：{"type":"character_info","character_name":"角色名","character_id":"ID数字"}';
            
            const payload = {
                model: endpointId,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: 'data:image/' + imageType + ';base64,' + base64Data } },
                        { type: 'text', text: prompt }
                    ]
                }],
                max_tokens: 512,
                temperature: 0.1
            };
            
            console.log('调用豆包API:', apiUrl);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error('豆包API错误(' + response.status + '): ' + errText);
            }
            
            const result = await response.json();
            
            if (result.error) throw new Error('豆包API: ' + JSON.stringify(result.error));
            
            let content = result.choices[0].message.content.trim();
            if (content.startsWith('```json')) content = content.substring(7);
            if (content.startsWith('```')) content = content.substring(3);
            if (content.endsWith('```')) content = content.substring(0, content.length - 3);
            content = content.trim();
            
            const data = JSON.parse(content);
            displayRosterRecognitionResult(data);
        }
    } catch (error) {
        console.error('识别失败:', error);
        alert(`识别失败: ${error.message}`);
    } finally {
        document.getElementById('roster-loading').style.display = 'none';
    }
}

function displayRosterRecognitionResult(data) {
    // 清洗角色名：去掉[军团缩写]前缀
    if (data.character_name) {
        data.character_name = data.character_name.replace(/^\[.*?\]\s*/, '').trim();
    }
    
    const resultDiv = document.getElementById('roster-recognition-result');
    const contentDiv = document.getElementById('roster-result-content');
    
    let html = '<div class="recognition-fields">';
    if (data.character_name) {
        html += '<div class="recognition-field"><label>游戏名:</label><span>' + data.character_name + '</span></div>';
    }
    if (data.character_id) {
        html += '<div class="recognition-field"><label>游戏ID:</label><span>' + data.character_id + '</span></div>';
    }
    if (data.corporation) {
        html += '<div class="recognition-field"><label>军团:</label><span>' + data.corporation + '</span></div>';
    }
    html += '</div>';
    
    contentDiv.innerHTML = html;
    
    // 自动填入表单
    if (data.character_name) {
        document.getElementById('roster-character-name').value = data.character_name;
    }
    if (data.character_id) {
        document.getElementById('roster-character-id').value = data.character_id;
    }
    
    resultDiv.dataset.result = JSON.stringify(data);
    resultDiv.style.display = 'block';
}

function confirmRosterResult() {
    const resultDiv = document.getElementById('roster-recognition-result');
    const data = JSON.parse(resultDiv.dataset.result);
    
    if (data.character_name) {
        document.getElementById('roster-character-name').value = data.character_name;
    }
    if (data.character_id) {
        document.getElementById('roster-character-id').value = data.character_id;
    }
    
    showNotificationMessage('已自动填入识别结果，请检查并确认');
}

function rejectRosterResult() {
    if (confirm('确认识别错误？将清空识别结果，你可以手动填写。')) {
        document.getElementById('roster-character-name').value = '';
        document.getElementById('roster-character-id').value = '';
        document.getElementById('roster-recognition-result').style.display = 'none';
        showNotificationMessage('请手动填写角色信息');
    }
}

async function submitRoster() {
    const qq = document.getElementById('roster-qq').value.trim();
    let characterName = document.getElementById('roster-character-name').value.trim();
    characterName = characterName.replace(/^\[.*?\]\s*/, '');
    const characterId = document.getElementById('roster-character-id').value.trim();
    
    if (!qq || qq === '未获取') {
        alert('QQ号获取失败，请重新登录');
        return;
    }
    
    if (!characterName) {
        alert('请填写游戏名（EVE角色名）');
        return;
    }
    
    if (!characterId) {
        alert('请填写游戏ID（角色ID）');
        return;
    }
    
    if (!rosterImageData) {
        alert('请上传游戏截图（必选）');
        return;
    }
    
    const submitBtn = document.querySelector('#page-roster .btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
    submitBtn.disabled = true;
    
    try {
        let fieldsObj = {
            'QQ号': String(qq),
            '游戏名': characterName,
            '游戏ID': characterId,
            '登记时间': new Date().toISOString()
        };
        
        // 如果有截图，先上传到飞书拿 file_token
        if (rosterImageData && !DEMO_MODE) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传截图中...';
            
            if (!feishuAPI && typeof FeishuAPI !== 'undefined') {
                try { feishuAPI = new FeishuAPI(); } catch(e) { console.error('Feishu init failed:', e); }
            }
            if (!feishuAPI) {
                throw new Error('FeishuAPI未初始化，无法上传截图');
            }
            
            const token = await feishuAPI.getTenantAccessToken();
            const fileToken = await feishuAPI.uploadScreenshot(token, rosterImageData.split(',')[1], `roster_${qq}_${Date.now()}.jpg`);
            
            fieldsObj['截图'] = [{ file_token: fileToken }];
            console.log('[submitRoster] 截图已上传, file_token:', fileToken);
        }
        
        const fields = Object.keys(fieldsObj).map(k => ({ [k]: fieldsObj[k] }));
        
        console.log('=== 准备写入飞书的数据 ===');
        console.log(JSON.stringify(fieldsObj, null, 2));
        console.log('==========================');
        
        if (!DEMO_MODE) {
            if (!feishuAPI && typeof FeishuAPI !== 'undefined') {
                try { feishuAPI = new FeishuAPI(); } catch(e) { console.error('Feishu init failed:', e); }
            }
            if (!feishuAPI) {
                throw new Error('FeishuAPI未初始化，无法写入飞书');
            }
            
            const record = await feishuAPI.createRecord(
                CONFIG.FEISHU.TABLE_IDS.ROSTER,
                fields
            );
            console.log('Roster record created:', record);
        } else {
            console.log('Demo mode: Roster data would be written to Feishu:', fields);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        showNotificationMessage('登记成功！');
        resetRosterForm();
        
    } catch (error) {
        console.error('提交失败:', error);
        alert(`提交失败: ${error.message}`);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function resetRosterForm() {
    document.getElementById('roster-character-name').value = '';
    document.getElementById('roster-character-id').value = '';
    removeRosterImage();
    document.getElementById('roster-recognition-result').style.display = 'none';
}

// ==================== 通知逻辑 ====================
function showNotification() {
    const modal = document.getElementById('notification-modal');
    modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function showNotificationMessage(message) {
    alert(message);
}

// ==================== 事件绑定 ====================
function bindEvents() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

// ==================== 工具函数 ====================
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ==================== 导出全局函数 ====================
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.handleImageUpload = handleImageUpload;
window.removeImage = removeImage;
window.confirmResult = confirmResult;
window.rejectResult = rejectResult;
window.showNotification = showNotification;
window.closeModal = closeModal;
window.showProfile = function() {
    alert('个人资料功能开发中...');
};

// 花名册相关函数导出
window.handleRosterImageUpload = handleRosterImageUpload;
window.removeRosterImage = removeRosterImage;
window.confirmRosterResult = confirmRosterResult;
window.rejectRosterResult = rejectRosterResult;
window.submitRoster = submitRoster;
window.resetRosterForm = resetRosterForm;

// 初始化
initApp();
