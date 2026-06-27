// EVE Corps OA - Main Logic
// Handle login, navigation, image upload, AI recognition, etc.

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
        }
    };
    console.log('CONFIG已内嵌（config.js未加载）');
}

// ==================== Global Variables ====================
let currentUser = null;
let sidebarOpen = false;
let doubaoAPI = null;
let feishuAPI = null;

// Demo mode flag
const DEMO_MODE = false;  // true = Demo mode (mock data), false = Real API

// Mock database (localStorage)
const DEMO_DB = {
    users: 'eve_oa_demo_users',
    characters: 'eve_oa_demo_characters',
    losses: 'eve_oa_demo_losses',
    attendance: 'eve_oa_demo_attendance'
};

// ==================== Initialize ====================
function initApp() {
    console.log('EVE Corps OA v1.0.0 Initializing...');
    
    // Initialize API classes (with lazy fallback)
    try {
        if (typeof DoubaoAPI !== 'undefined') {
            doubaoAPI = new DoubaoAPI();
            console.log('DoubaoAPI OK:', typeof doubaoAPI.recognizeEveScreenshot);
        } else {
            console.warn('DoubaoAPI class not defined yet, will lazy-init');
        }
    } catch(e) {
        console.error('DoubaoAPI init failed:', e);
        doubaoAPI = null;
    }
    
    try {
        if (typeof FeishuAPI !== 'undefined') {
            feishuAPI = new FeishuAPI();
            console.log('FeishuAPI OK');
        } else {
            console.warn('FeishuAPI class not defined yet, will lazy-init');
        }
    } catch(e) {
        console.error('FeishuAPI init failed:', e);
        feishuAPI = null;
    }
    
    // Debug: check CONFIG
    console.log('CONFIG check:', !!window.CONFIG, window.CONFIG?.DOUBAO?.API_KEY ? 'DOUBAO key set' : 'NO DOUBAO KEY');
    
    // Check login status
    checkLoginStatus();
    
    // Bind events
    bindEvents();
    
    console.log('Initialization complete');
}

// Run init immediately (scripts are at end of body, DOM is ready)
initApp();

// ==================== Login Logic ====================
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
        alert('Please enter character name or QQ number');
        return;
    }
    
    // Demo mode: mock login
    currentUser = {
        username: username,
        role: username === 'admin' ? 'admin' : 'member',  // admin account = admin
        loginTime: new Date().toISOString(),
        points: 1250,  // mock points
        losses: 3,       // mock losses
        attendance: 15    // mock attendance
    };
    
    // Save to local
    localStorage.setItem('eve_oa_user', JSON.stringify(currentUser));
    
    showMainPage();
    showNotificationMessage('Login successful! Welcome back, Commander!');
    
    // Demo tip
    if (DEMO_MODE) {
        setTimeout(() => {
            alert('Demo Mode\n\nThis is demo mode, data saved locally in browser.\n\nReal deployment will connect to Feishu Bitable and Doubao AI.');
        }, 500);
    }
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
    
    // Update user info
    updateUserInfo();
    
    // Load home page data
    loadHomeData();
}

function updateUserInfo() {
    if (!currentUser) return;
    
    const username = currentUser.username;
    document.getElementById('sidebar-username').textContent = username;
    document.getElementById('welcome-name').textContent = username;
    
    // If admin, show admin menu
    if (currentUser.role === 'admin') {
        document.getElementById('admin-menu').style.display = 'block';
    }
}

// ==================== Navigation Logic ====================
function navigateTo(page) {
    // Hide all pages
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(p => p.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update sidebar menu status
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => item.classList.remove('active'));
    
    // Update page title
    const titles = {
        'home': 'Home',
        'loss': 'Combat Loss',
        'attendance': 'Attendance',
        'assets': 'Assets',
        'points': 'My Points',
        'announce': 'Announcements',
        'admin': 'Admin'
    };
    document.getElementById('page-title').textContent = titles[page] || 'Home';
    
    // Close sidebar
    toggleSidebar(false);
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

// ==================== Image Upload & Recognition ====================
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.match('image.*')) {
        alert('Please upload an image file');
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewArea = document.getElementById('preview-area');
        const previewImage = document.getElementById('preview-image');
        
        previewImage.src = e.target.result;
        previewArea.style.display = 'block';
        document.getElementById('upload-area').style.display = 'none';
        
        // Auto start recognition
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
    // Show loading animation
    document.getElementById('loading').style.display = 'block';
    document.getElementById('recognition-result').style.display = 'none';
    
    try {
        if (DEMO_MODE) {
            // Demo mode: mock AI recognition (2s delay)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Mock recognition result
            const mockResult = {
                type: 'character_info',
                character_name: currentUser.username,
                corporation: 'Wei Xian Group',
                alliance: 'Endless Galaxy',
                faction: 'Caldari',
                bloodline: 'Achura',
                gender: 'Male',
                skill_points: 70110651,
                wallet_balance: '10,399,713,360 ISK'
            };
            
            displayRecognitionResult(mockResult);
            
        } else {
            // Real mode: call Doubao API
            const base64Data = dataUrl.split(',')[1];
            const imageType = dataUrl.split(';')[0].split(':')[1].split('/')[1];
            
            const result = await doubaoAPI.recognizeEveScreenshot(base64Data, imageType);
            displayRecognitionResult(result);
        }
        
    } catch (error) {
        console.error('Recognition failed:', error);
        alert(`Recognition failed: ${error.message}`);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayRecognitionResult(data) {
    const resultDiv = document.getElementById('recognition-result');
    const contentDiv = document.getElementById('result-content');
    
    // Format JSON display
    contentDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    
    // Save result for confirmation
    resultDiv.dataset.result = JSON.stringify(data);
    
    resultDiv.style.display = 'block';
}

async function confirmResult() {
    const resultDiv = document.getElementById('recognition-result');
    const data = JSON.parse(resultDiv.dataset.result);
    
    try {
        // Write to Feishu based on type
        if (data.type === 'character_info') {
            await writeCharacterInfo(data);
        } else if (data.type === 'combat_loss') {
            await writeCombatLoss(data);
        } else {
            alert('This data type not supported for auto-entry');
            return;
        }
        
        showNotificationMessage('Entry successful!');
        removeImage();
        
    } catch (error) {
        console.error('Entry failed:', error);
        alert(`Entry failed: ${error.message}`);
    }
}

function rejectResult() {
    if (confirm('Confirm recognition error? Image will be kept, you can manually fill in.')) {
        // TODO: show manual input form
        alert('Manual input feature under development...');
    }
}

// ==================== Feishu Write Logic ====================
async function writeCharacterInfo(data) {
    // Field mapping (adjust based on actual Feishu table field names)
    const fields = [
        { 'Character Name': data.character_name },
        { 'Corporation': data.corporation },
        { 'Alliance': data.alliance || '' },
        { 'Skill Points': data.skill_points || 0 },
        { 'Update Time': new Date().toISOString().split('T')[0] }
    ];
    
    const record = await feishuAPI.createRecord(
        CONFIG.FEISHU.TABLE_IDS.CHARACTER,
        fields
    );
    
    console.log('Character info written:', record);
}

async function writeCombatLoss(data) {
    // Combat loss table ID not created yet
    alert('Combat loss table not created yet, please create data table in Feishu first');
    
    // TODO: implement combat loss write logic
}

// ==================== Data Loading ====================
async function loadHomeData() {
    try {
        if (DEMO_MODE) {
            // Demo mode: use mock data
            const user = currentUser;
            document.getElementById('stat-loss-count').textContent = user.losses || 3;
            document.getElementById('stat-points').textContent = formatNumber(user.points || 1250);
            document.getElementById('stat-attendance').textContent = user.attendance || 15;
            document.getElementById('stat-corps').textContent = '47';  // mock corp member count
            
        } else {
            // Real mode: load from Feishu API
            // TODO: implement real data loading
        }
        
    } catch (error) {
        console.error('Data loading failed:', error);
    }
}

// ==================== Notification Logic ====================
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
    // Simple implementation: use alert (should use toast in production)
    alert(message);
}

// ==================== Event Binding ====================
function bindEvents() {
    // Click modal background to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Enter key to login
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

// ==================== Utility Functions ====================
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Export global functions
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
    alert('Profile feature under development...');
};

// ==================== 军团花名册功能 ====================
let rosterImageData = null;  // 存储截图数据

// 页面跳转时预填QQ号
function navigateTo(page) {
    // Hide all pages
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(p => p.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update sidebar menu status
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => item.classList.remove('active'));
    
    // Update page title
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
    
    // Close sidebar
    toggleSidebar(false);
    
    // 如果是花名册页面，预填QQ号
    if (page === 'roster') {
        prefillRosterQQ();
    }
}

function prefillRosterQQ() {
    if (!currentUser) return;
    
    // 从登录信息中获取QQ号（假设用户名就是QQ号，或者从用户信息中提取）
    // 这里需要根据实际登录逻辑调整
    const qqInput = document.getElementById('roster-qq');
    if (qqInput) {
        // 如果是demo模式，使用用户名作为QQ号
        qqInput.value = currentUser.username || '未获取';
    }
}

// 处理花名册图片上传
function handleRosterImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.match('image.*')) {
        alert('请上传图片文件');
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewArea = document.getElementById('roster-preview-area');
        const previewImage = document.getElementById('roster-preview-image');
        
        previewImage.src = e.target.result;
        previewArea.style.display = 'block';
        document.getElementById('roster-upload-area').style.display = 'none';
        
        // 保存图片数据
        rosterImageData = e.target.result;
        
        // Auto start recognition
        startRosterRecognition(e.target.result);
    };
    reader.readAsDataURL(file);
}

// 移除花名册图片
function removeRosterImage() {
    document.getElementById('roster-preview-area').style.display = 'none';
    document.getElementById('roster-upload-area').style.display = 'block';
    document.getElementById('roster-recognition-result').style.display = 'none';
    document.getElementById('roster-file-input').value = '';
    rosterImageData = null;
}

// 开始AI识别
async function startRosterRecognition(dataUrl) {
    // Show loading animation
    document.getElementById('roster-loading').style.display = 'block';
    document.getElementById('roster-recognition-result').style.display = 'none';
    
    try {
        if (DEMO_MODE) {
            // Demo mode: mock AI recognition (2s delay)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Mock recognition result
            const mockResult = {
                type: 'character_info',
                character_name: '示例角色名',
                character_id: '1234567890',
                corporation: 'Wei Xian Group',
                alliance: 'Endless Galaxy'
            };
            
            displayRosterRecognitionResult(mockResult);
            
        } else {
            // Real mode: inline call to Doubao API (bypass class)
            console.log('CONFIG exists:', !!window.CONFIG);
            console.log('DOUBAO config:', window.CONFIG?.DOUBAO);

            if (!window.CONFIG || !window.CONFIG.DOUBAO) {
                throw new Error('CONFIG或CONFIG.DOUBAO未定义，检查config.js是否加载');
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

            console.log('Calling Doubao API:', apiUrl);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify(payload)
            });

            console.log('Doubao response status:', response.status);
            if (!response.ok) {
                const errText = await response.text();
                throw new Error('豆包API错误(' + response.status + '): ' + errText);
            }

            const result = await response.json();
            console.log('Doubao raw result:', result);

            if (result.error) throw new Error('豆包API: ' + JSON.stringify(result.error));

            let content = result.choices[0].message.content.trim();
            // 清洗markdown标记
            if (content.startsWith('```json')) content = content.substring(7);
            if (content.startsWith('```')) content = content.substring(3);
            if (content.endsWith('```')) content = content.substring(0, content.length - 3);
            content = content.trim();

            const data = JSON.parse(content);
            displayRosterRecognitionResult(data);
        }
        
    } catch (error) {
        console.error('Recognition failed:', error);
        alert(`识别失败: ${error.message}`);
    } finally {
        document.getElementById('roster-loading').style.display = 'none';
    }
}

// 显示识别结果
function displayRosterRecognitionResult(data) {
    // 清洗角色名：去掉[军团缩写]前缀
    if (data.character_name) {
        data.character_name = data.character_name.replace(/^\[.*?\]\s*/, '').trim();
    }
    
    const resultDiv = document.getElementById('roster-recognition-result');
    const contentDiv = document.getElementById('roster-result-content');
    
    // 格式化显示
    let html = '<div class="recognition-fields">';
    if (data.character_name) {
        html += `<div class="recognition-field">
            <label>游戏名:</label>
            <span>${data.character_name}</span>
        </div>`;
    }
    if (data.character_id) {
        html += `<div class="recognition-field">
            <label>游戏ID:</label>
            <span>${data.character_id}</span>
        </div>`;
    }
    if (data.corporation) {
        html += `<div class="recognition-field">
            <label>军团:</label>
            <span>${data.corporation}</span>
        </div>`;
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
    
    // Save result for confirmation
    resultDiv.dataset.result = JSON.stringify(data);
    
    resultDiv.style.display = 'block';
}

// 确认识别结果
function confirmRosterResult() {
    const resultDiv = document.getElementById('roster-recognition-result');
    const data = JSON.parse(resultDiv.dataset.result);
    
    // 填入表单
    if (data.character_name) {
        document.getElementById('roster-character-name').value = data.character_name;
    }
    if (data.character_id) {
        document.getElementById('roster-character-id').value = data.character_id;
    }
    
    showNotificationMessage('已自动填入识别结果，请检查并确认');
}

// 拒绝识别结果（手动输入）
function rejectRosterResult() {
    if (confirm('确认识别错误？将清空识别结果，您可以手动填写。')) {
        document.getElementById('roster-character-name').value = '';
        document.getElementById('roster-character-id').value = '';
        document.getElementById('roster-recognition-result').style.display = 'none';
        showNotificationMessage('请手动填写角色信息');
    }
}

// 提交花名册登记
async function submitRoster() {
    // 验证必填字段
    const qq = document.getElementById('roster-qq').value.trim();
    let characterName = document.getElementById('roster-character-name').value.trim();
    // 提交前再次清洗：去掉[军团缩写]前缀
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

    // 显示提交中
    const submitBtn = document.querySelector('#page-roster .btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
    submitBtn.disabled = true;

    try {
        // 准备数据（注意：先上传截图拿file_token）
        let fieldsObj = {
            'QQ号': String(qq),                    // 统一用文本，避免类型不匹配
            '游戏名': characterName,
            '游戏ID': characterId,                   // 保持原样（可能是数字或文本）
            '登记时间': new Date().toISOString()     // 完整ISO格式
        };

        // 如果有截图，先上传到飞书拿 file_token
        if (rosterImageData && !DEMO_MODE) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传截图中...';
            
            // Lazy init feishuAPI if needed
            if (!feishuAPI && typeof FeishuAPI !== 'undefined') {
                try { feishuAPI = new FeishuAPI(); console.log('FeishuAPI lazy init OK'); } catch(e) { console.error('Feishu lazy init failed:', e); }
            }
            if (!feishuAPI) {
                throw new Error('FeishuAPI未初始化，无法上传截图');
            }

            const token = await feishuAPI.getTenantAccessToken();
            const fileToken = await feishuAPI.uploadScreenshot(token, rosterImageData, `roster_${qq}_${Date.now()}.jpg`);
            
            // 飞书附件字段格式：数组，每个元素是一个对象 { file_token: "xxx" }
            fieldsObj['截图'] = [{ file_token: fileToken }];
            console.log('[submitRoster] 截图已上传, file_token:', fileToken);
        }

        // 转成数组格式（兼容 createRecord 接口）
        const fields = Object.keys(fieldsObj).map(k => ({ [k]: fieldsObj[k] }));

        console.log('=== 准备写入飞书的数据 ===');
        console.log(JSON.stringify(fieldsObj, null, 2));
        console.log('==========================');

        // 写入飞书
        if (!DEMO_MODE) {
            // Lazy init feishuAPI if needed
            if (!feishuAPI && typeof FeishuAPI !== 'undefined') {
                try { feishuAPI = new FeishuAPI(); console.log('FeishuAPI lazy init OK'); } catch(e) { console.error('Feishu lazy init failed:', e); }
            }
            if (!feishuAPI) {
                throw new Error('FeishuAPI未初始化，无法写入飞书');
            }

            // 先拉取表格字段，确认字段名
            try {
                const token = await feishuAPI.getTenantAccessToken();
                const fieldsInfo = await feishuAPI.listFields(token);
                console.log('飞书表格实际字段:', JSON.stringify(fieldsInfo, null, 2));
            } catch(e) {
                console.warn('获取字段列表失败（不影响提交）:', e.message);
            }

            const record = await feishuAPI.createRecord(
                CONFIG.FEISHU.TABLE_IDS.ROSTER,
                fields
            );
            console.log('Roster record created:', record);
        } else {
            // Demo mode: 模拟写入
            console.log('Demo mode: Roster data would be written to Feishu:', fields);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        showNotificationMessage('登记成功！');
        resetRosterForm();
        
    } catch (error) {
        console.error('Submission failed:', error);
        alert(`提交失败: ${error.message}`);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// 重置花名册表单
function resetRosterForm() {
    document.getElementById('roster-character-name').value = '';
    document.getElementById('roster-character-id').value = '';
    removeRosterImage();
    document.getElementById('roster-recognition-result').style.display = 'none';
}
