// EVE军团OA - API接口封装
// 直连豆包AI和飞书API（国内服务，无需代理）

// ==================== 豆包多模态API（直连） ====================
class DoubaoAPI {
    constructor() {
        this.apiUrl = CONFIG.DOUBAO.API_URL;
        this.apiKey = CONFIG.DOUBAO.API_KEY;
        this.endpointId = CONFIG.DOUBAO.ENDPOINT_ID;
    }
    
    /**
     * 识别EVE截图 - 直接调用豆包API
     * @param {string} base64Image - 图片的base64编码
     * @param {string} imageType - 图片类型 (jpeg/png)
     * @returns {Promise<Object>} 识别结果JSON
     */
    async recognizeEveScreenshot(base64Image, imageType = 'jpeg') {
        const prompt = `你是EVE Online游戏数据分析助手。

请仔细识别图片中的EVE游戏界面，根据图片类型提取对应信息，**严格按JSON格式返回**：

**如果图片是角色信息界面**，提取：
{
  "type": "character_info",
  "character_name": "角色名（必须去掉前面的[军团缩写]前缀，如[AIAD]张三 只保留 张三）",
  "character_id": "角色ID数字(如有，字符串格式)",
  "corporation": "军团名",
  "alliance": "联盟名(如无则为空字符串)",
  "faction": "阵营(如有)",
  "bloodline": "血统(如有)",
  "gender": "性别(如有)",
  "skill_points": "技能点总数(数字，如无则为0)",
  "wallet_balance": "钱包余额(如有，字符串格式)"
}

**如果图片是战损报告**，提取：
{
  "type": "combat_loss",
  "character_name": "角色名",
  "ship_name": "舰船名称",
  "ship_class": "舰船分类",
  "loss_value": "损失价值(ISK,数字)",
  "battle_time": "战斗时间(如有)",
  "location": "战斗地点(如有)"
}

**如果图片是军团成员列表**，提取：
{
  "type": "member_list",
  "member_count": "成员数量(数字)",
  "corporation_name": "军团名"
}

**如果无法识别**，返回：
{"error": "无法识别图片内容"}

**重要**：
1. 只返回纯JSON，不要有markdown代码块标记
2. 不要有任何解释文字
3. 字段值要准确，从图片中精确提取
4. 如果某个字段在图片中不存在，设为空字符串或0
5. **character_name必须去掉前面的[军团缩写]前缀**：如"[AIAD]张三"只提取"张三"，"[ABC]Player"只提取"Player"，方括号及内容一律删除
`;
        
        const payload = {
            model: this.endpointId,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/${imageType};base64,${base64Image}`
                            }
                        },
                        {
                            type: 'text',
                            text: prompt
                        }
                    ]
                }
            ],
            max_tokens: 1024,
            temperature: 0.1
        };
        
        try {
            // 直连豆包API
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`豆包API请求失败(${response.status}): ${errorText}`);
            }
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(`豆包API错误: ${JSON.stringify(result.error)}`);
            }
            
            // 提取AI回答
            const content = result.choices[0].message.content;
            
            // 清洗输出（去掉```json```标记）
            let cleanContent = content.trim();
            if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.substring(7);
            }
            if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.substring(3);
            }
            if (cleanContent.endsWith('```')) {
                cleanContent = cleanContent.substring(0, cleanContent.length - 3);
            }
            cleanContent = cleanContent.trim();
            
            // 解析JSON
            const data = JSON.parse(cleanContent);
            return data;
            
        } catch (error) {
            console.error('豆包API调用失败:', error);
            throw error;
        }
    }
}

// ==================== 飞书多维表格API ====================
class FeishuAPI {
    constructor() {
        this.appId = CONFIG.FEISHU.APP_ID;
        this.appSecret = CONFIG.FEISHU.APP_SECRET;
        this.appToken = CONFIG.FEISHU.APP_TOKEN;
        // 代理服务器地址（需部署到可访问的服务器）
        this.proxyUrl = CONFIG.APP.BACKEND_URL || '';
        this.tokenCache = null;
        this.tokenExpireTime = 0;
    }

    /**
     * 获取Tenant Access Token
     */
    async getTenantAccessToken() {
        if (this.tokenCache && Date.now() < this.tokenExpireTime) {
            return this.tokenCache;
        }

        try {
            let data;
            
            // 如果有代理服务器，通过代理获取
            if (this.proxyUrl) {
                const response = await fetch(`${this.proxyUrl}/api/feishu/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        app_id: this.appId,
                        app_secret: this.appSecret
                    })
                });
                data = await response.json();
            } else {
                // 直连飞书API获取token（仅在Node.js环境或代理转发时可用）
                // 浏览器直接调用会CORS失败
                throw new Error('请配置CONFIG.APP.BACKEND_URL代理服务器地址');
            }

            if (data.code !== 0) {
                throw new Error(`获取飞书Token失败: ${data.msg} (code: ${data.code})`);
            }

            this.tokenCache = data.tenant_access_token;
            this.tokenExpireTime = Date.now() + (data.expire - 300) * 1000;

            console.log('飞书Token获取成功');
            return this.tokenCache;

        } catch (error) {
            console.error('获取飞书Token失败:', error);
            throw error;
        }
    }
    
    /**
     * 上传截图到飞书云盘，返回 file_token
     */
    async uploadScreenshot(token, base64Data, fileName = 'screenshot.jpg') {
        if (!this.proxyUrl) {
            throw new Error('请配置CONFIG.APP.BACKEND_URL代理服务器地址');
        }

        try {
            const response = await fetch(`${this.proxyUrl}/api/feishu/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token,
                    app_token: this.appToken,
                    base64_data: base64Data,
                    file_name: fileName
                })
            });

            const data = await response.json();

            if (data.code !== 0) {
                throw new Error(`截图上传失败: ${data.msg || '未知错误'}`);
            }

            console.log('[uploadScreenshot] 上传成功, file_token:', data.file_token);
            return data.file_token;

        } catch (error) {
            console.error('[uploadScreenshot] 失败:', error);
            throw error;
        }
    }

    /**
     * 写入记录到多维表格
     */
    async createRecord(tableId, fields) {
        if (!this.proxyUrl) {
            throw new Error('请配置CONFIG.APP.BACKEND_URL代理服务器地址');
        }

        const token = await this.getTenantAccessToken();

        // 构建字段数据
        const recordFields = {};
        for (const field of fields) {
            const key = Object.keys(field)[0];
            recordFields[key] = field[key];
        }

        try {
            const response = await fetch(`${this.proxyUrl}/api/feishu/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token,
                    app_token: this.appToken,
                    table_id: tableId,
                    fields: recordFields
                })
            });

            const data = await response.json();

            console.log('=== 飞书写入完整响应 ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('========================');

            if (data.code !== 0) {
                const errMsg = `写入飞书记录失败: ${data.msg || '未知错误'} (code: ${data.code})` +
                    (data.error ? `\n详情: ${JSON.stringify(data.error)}` : '');
                throw new Error(errMsg);
            }

            console.log('飞书记录创建成功:', data.data.records[0]);
            return data.data.records[0];

        } catch (error) {
            console.error('写入飞书失败:', error);
            throw error;
        }
    }
    
    /**
     * 查询记录
     */
    async listRecords(tableId, filter = '') {
        const token = await this.getTenantAccessToken();
        
        let url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.appToken}/tables/${tableId}/records?page_size=500`;
        
        if (filter) {
            url += `&filter=${encodeURIComponent(filter)}`;
        }
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.code !== 0) {
                throw new Error(`查询飞书记录失败: ${data.msg} (code: ${data.code})`);
            }
            
            return data.data.items || [];
            
        } catch (error) {
            console.error('查询飞书失败:', error);
            throw error;
        }
    }
}

// 导出API类
window.DoubaoAPI = DoubaoAPI;
window.FeishuAPI = FeishuAPI;
