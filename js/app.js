// EVE Corps OA - Main Logic
// Handle login, navigation, image upload, AI recognition, etc.

// ==================== Global Variables ====================
let currentUser = null;
let sidebarOpen = false;
let doubaoAPI = null;
let feishuAPI = null;

// Demo mode flag
const DEMO_MODE = true;

// Mock database (localStorage)
const DEMO_DB = {
    users: 'eve_oa_demo_users',
    characters: 'eve_oa_demo_characters',
    losses: 'eve_oa_demo_losses',
    attendance: 'eve_oa_demo_attendance'
};

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('EVE Corps OA v1.0.0 Initializing...');
    doubaoAPI = new DoubaoAPI();
    feishuAPI = new FeishuAPI();
    checkLoginStatus();
    bindEvents();
    console.log('Initialization complete');
});

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
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value.trim();
    
    if (!username) {
        alert('Please enter character name or QQ number');
        return;
    }
    
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
    showNotificationMessage('Login successful! Welcome back, Commander!');
    
    if (DEMO_MODE) {
        setTimeout(function() {
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
    updateUserInfo();
    loadHomeData();
}

function updateUserInfo() {
    if (!currentUser) return;
    var username = currentUser.username;
    document.getElementById('sidebar-username').textContent = username;
    document.getElementById('welcome-name').textContent = username;
    if (currentUser.role === 'admin') {
        document.getElementById('admin-menu').style.display = 'block';
    }
}

// ==================== Navigation Logic ====================
function navigateTo(page) {
    var pages = document.querySelectorAll('.page-content');
    for (var i = 0; i < pages.length; i++) {
        pages[i].classList.remove('active');
    }
    
    var targetPage = document.getElementById('page-' + page);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    var menuItems = document.querySelectorAll('.sidebar-menu li');
    for (var j = 0; j < menuItems.length; j++) {
        menuItems[j].classList.remove('active');
    }
    
    var titles = {
        'home': 'Home',
        'loss': 'Combat Loss',
        'attendance': 'Attendance',
        'assets': 'Assets',
        'points': 'My Points',
        'announce': 'Announcements',
        'admin': 'Admin'
    };
    document.getElementById('page-title').textContent = titles[page] || 'Home';
    toggleSidebar(false);
}

function toggleSidebar(forceClose) {
    var sidebar = document.getElementById('sidebar');
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
    var file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        alert('Please upload an image file');
        return;
    }
    
    var reader = new FileReader();
    reader.onload = function(e) {
        var previewArea = document.getElementById('preview-area');
        var previewImage = document.getElementById('preview-image');
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
            await new Promise(function(resolve) { setTimeout(resolve, 2000); });
            
            var mockResult = {
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
            var parts = dataUrl.split(',');
            var base64Data = parts[1];
            var imgTypeParts = dataUrl.split(';')[0].split(':')[1].split('/');
            var imageType = imgTypeParts[1];
            var result = await doubaoAPI.recognizeEveScreenshot(base64Data, imageType);
            displayRecognitionResult(result);
        }
    } catch (error) {
        console.error('Recognition failed:', error);
        alert('Recognition failed: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayRecognitionResult(data) {
    var resultDiv = document.getElementById('recognition-result');
    var contentDiv = document.getElementById('result-content');
    contentDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    resultDiv.dataset.result = JSON.stringify(data);
    resultDiv.style.display = 'block';
}

async function confirmResult() {
    var resultDiv = document.getElementById('recognition-result');
    var data = JSON.parse(resultDiv.dataset.result);
    
    try {
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
        alert('Entry failed: ' + error.message);
    }
}

function rejectResult() {
    if (confirm('Confirm recognition error? Image will be kept.')) {
        alert('Manual input feature under development...');
    }
}

// ==================== Feishu Write Logic ====================
async function writeCharacterInfo(data) {
    var fields = [
        { 'Character Name': data.character_name },
        { 'Corporation': data.corporation },
        { 'Alliance': data.alliance || '' },
        { 'Skill Points': data.skill_points || 0 },
        { 'Update Time': new Date().toISOString().split('T')[0] }
    ];
    var record = await feishuAPI.createRecord(
        CONFIG.FEISHU.TABLE_IDS.CHARACTER,
        fields
    );
    console.log('Character info written:', record);
}

async function writeCombatLoss(data) {
    alert('Combat loss table not created yet.');
}

// ==================== Data Loading ====================
async function loadHomeData() {
    try {
        if (DEMO_MODE) {
            var user = currentUser;
            document.getElementById('stat-loss-count').textContent = user.losses || 3;
            document.getElementById('stat-points').textContent = formatNumber(user.points || 1250);
            document.getElementById('stat-attendance').textContent = user.attendance || 15;
            document.getElementById('stat-corps').textContent = '47';
        }
    } catch (error) {
        console.error('Data loading failed:', error);
    }
}

function showNotification() {
    document.getElementById('notification-modal').classList.add('active');
}

function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function showNotificationMessage(message) {
    alert(message);
}

function bindEvents() {
    var modals = document.querySelectorAll('.modal');
    for (var i = 0; i < modals.length; i++) {
        modals[i].addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active');
        });
    }
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

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
window.showProfile = function() { alert('Profile feature under development...'); };
