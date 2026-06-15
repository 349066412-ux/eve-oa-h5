// EVE军团OA - 主逻辑
// 处理登录、导航、图片上传、AI识别等

// ==================== 全局变量 ====================
let currentUser = null;
let sidebarOpen = false;
let doubaoAPI = null;
let feishuAPI = null;

// Demo模式标志
const DEMO_MODE = true;  // true = 演示模式（模拟数据），false = 真实API

// 模拟数据库（localStorage）
const DEMO_DB = {
    users: 'eve_oa_demo_users',
    characters: 'eve_oa_demo_characters',
    losses: 'eve_oa_demo_losses',
    attendance: 'eve_oa_demo_attendance'
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log(`${CONFIG.APP.NAME} v${CONFIG.APP.VERSION} 初始化...`);
    
    // 初始化API类
    doubaoAPI = new DoubaoAPI();
    feishuAPI = new FeishuAPI();
    
    // 检查登录状态
    checkLoginStatus();
    
    // 绑定事件
    bindEvents();
    
    console.log('初始化完成');
});

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
        role: username === 'admin' ? 'admin' : 'member',  // admin账号为管理员
        loginTime: new Date().toISOString(),
        points: 1250,  // 模拟积分
        losses: 3,       // 模拟战损次数
        attendance: 15    // 模拟出勤次数
    };
    
    // 保存到本地
    localStorage.setItem('eve_oa_user', JSON.stringify(currentUser));
    
    showMainPage();
    showNotificationMessage('登录成功！欢迎回来，指挥官！');
    
    // Demo提示
    if (DEMO_MODE) {
        setTimeout(() => {
            alert('🎮 演示模式\n\n当前为演示模式，数据保存在浏览器本地。\n\n真实部署后将连接飞书多维表格和豆包AI。');
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
    document.getElementById('main-page').style.display = 'none';
}

function showMainPage() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-page').style.display = 'block';
    
    // 更新用户信息
    updateUserInfo();
    
    // 加载首页数据
    loadHomeData();
}

function updateUserInfo() {
    if (!currentUser) return;
    
    const username = currentUser.username;
    document.getElementById('sidebar-username').textContent = username;
    document.getElementById('welcome-name').textContent = username;
    
    // 如果是管理员，显示管理菜单
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

// ==================== 图片上传与识别 ====================
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.match('image.*')) {
        alert('请上传图片文件');
        return;
    }
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewArea = document.getElementById('preview-area');
        const previewImage = document.getElementById('preview-image');
        
        previewImage.src = e.target.result;
        previewArea.style.display = 'block';
        document.getElementById('upload-area').style.display = 'none';
        
        // 自动开始识别
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
    // 显示加载动画
    document.getElementById('loading').style.display = 'block';
    document.getElementById('recognition-result').style.display = 'none';
    
    try {
        if (DEMO_MODE) {
            // Demo模式：模拟AI识别（2秒延迟）
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 模拟识别结果
            const mockResult = {
                type: 'character_info',
                character_name: currentUser.username,
                corporation: '维鲜集团',
                alliance: '无尽星河',
                faction: '加达里',
                bloodline: '阿赫尔',
                gender: '男',
                skill_points: 70110651,
                wallet_balance: '10,399,713,360 ISK'
            };
            
            displayRecognitionResult(mockResult);
            
        } else {
            // 真实模式：调用豆包API
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
    
    // 格式化JSON显示
    contentDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    
    // 保存结果供确认时使用
    resultDiv.dataset.result = JSON.stringify(data);
    
    resultDiv.style.display = 'block';
}

async function confirmResult() {
    const resultDiv = document.getElementById('recognition-result');
    const data = JSON.parse(resultDiv.dataset.result);
    
    try {
        // 根据类型写入飞书
        if (data.type === 'character_info') {
            await writeCharacterInfo(data);
        } else if (data.type === 'combat_loss') {
            await writeCombatLoss(data);
        } else {
            alert('暂不支持该类型数据自动录入');
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
    if (confirm('确认识别错误？将保留图片，您可以手动填写。')) {
        // TODO: 显示手动填写表单
        alert('手动填写功能开发中...');
    }
}

// ==================== 飞书写入逻辑 ====================
async function writeCharacterInfo(data) {
    // 字段映射（根据飞书表格实际字段名调整）
    const fields = [
        { '角色名': data.character_name },
        { '军团': data.corporation },
        { '联盟': data.alliance || '' },
        { '技能点': data.skill_points || 0 },
        { '更新时间': new Date().toISOString().split('T')[0] }
    ];
    
    const record = await feishuAPI.createRecord(
        CONFIG.FEISHU.TABLE_IDS.CHARACTER,
        fields
    );
    
    console.log('写入角色信息成功:', record);
}

async function writeCombatLoss(data) {
    // 战损记录表ID待创建
    alert('战损记录表尚未创建，请先在飞书创建数据表');
    
    // TODO: 实现战损写入逻辑
}

// ==================== 数据加载 ====================
async function loadHomeData() {
    try {
        // 加载统计数据（示例）
        document.getElementById('stat-loss-count').textContent = '0';
        document.getElementById('stat-points').textContent = '0';
        document.getElementById('stat-attendance').textContent = '0';
        document.getElementById('stat-corps').textContent = '0';
        
        // TODO: 实际应从飞书API加载
        
    } catch (error) {
        console.error('加载数据失败:', error);
    }
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
    // 简单实现：用alert（实际应做成toast）
    alert(message);
}

// ==================== 事件绑定 ====================
function bindEvents() {
    // 点击模态框背景关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // 回车键登录
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

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 导出全局函数
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
