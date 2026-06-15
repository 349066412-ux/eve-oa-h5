// EVE军团OA - 配置文件
// 请替换为你的实际API密钥和端点ID

const CONFIG = {
    // 豆包多模态API配置
    DOUBAO: {
        API_KEY: 'cbd75516-1387-4a79-a391-91f450a6dacc',  // 你的豆包API Key
        ENDPOINT_ID: 'ep-20260429133513-6n8wp',           // 你的推理端点ID
        API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
    },
    
    // 飞书多维表格API配置
    FEISHU: {
        APP_ID: 'cli_aaa41e93ca78dcc0',                   // 你的飞书App ID
        APP_SECRET: 'z5N7xQKQbOW5eQjvE5MTgphGQlhLtVM',  // 你的飞书App Secret
        BASE_TOKEN: 'Sae7bkls2aeyhGsqOI8c710kn6e',       // 你的多维表格Base Token
        TABLE_IDS: {
            CHARACTER: 'tbl5BeZqf7Jk96On',                // 角色花名册表ID
            COMBAT_LOSS: '',                                // 战损记录表ID（待创建）
            ATTENDANCE: '',                                 // 出勤记录表ID（待创建）
            ASSETS: '',                                     // 军团资产表ID（待创建）
            POINTS: ''                                      // 积分记录表ID（待创建）
        }
    },
    
    // 腾讯混元AI配置（备用）
    HUNYUAN: {
        API_KEY: 'your-hunyuan-api-key',                   // 如不使用可留空
        ENDPOINT_ID: 'your-hunyuan-endpoint-id'
    },
    
    // 应用配置
    APP: {
        NAME: 'EVE军团OA',
        VERSION: '1.0.0',
        CORP_NAME: '无尽星河',
        CORP_FULL_NAME: '无尽星河 - 维鲜集团',
        CONTACT_QQ: '12123123',
        DEBUG: true  // 调试模式（正式上线改为false）
    }
};

// 飞书API Token缓存
let FEISHU_TOKEN = null;
let TOKEN_EXPIRE_TIME = 0;

// 导出配置（如需模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
