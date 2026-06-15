// EVE军团OA - API接口封装
// 封装豆包AI识别和飞书多维表格API调用

// ==================== 豆包多模态API ====================
class DoubaoAPI {
    constructor() {
        // 改为调用Vercel代理
        this.apiUrl = '/api/doubao';
    }
    
    /**
     * 识别EVE截图
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
  "character_name": "角色名",
  "corporation": "军团名",
  "alliance": "联盟名(如无则为空字符串)",
  "faction": "阵营(如有)",
  "bloodline": "血统(如有)",
  "gender": "性别(如有)",
  "skill_points": 技能点总数(数字，如无则为0),
  "wallet_balance": "钱包余额(如有，字符串格式)"
}

**如果图片是战损报告**，提取：
{
  "type": "combat_loss",
  "character_name": "角色名",
  "ship_name": "舰船名称",
  "ship_class": "舰船分类",
  "loss_value": 损失价值(ISK,数字),
  "battle_time": "战斗时间(如有)",
  "location": "战斗地点(如有)"
}

**如果图片是军团成员列表**，提取：
{
  "type": "member_list",
  "member_count": 成员数量(数字),
  "corporation_name": "军团名"
}

**如果无法识别**，返回：
{"error": "无法识别图片内容"}

**重要**：
1. 只返回纯JSON，不要有\`\`\`json\`\`\`标记
2. 不要有任何解释文字
3. 字段值要准确，从图片中精确提取
4. 如果某个字段在图片中不存在，设为空字符串或0
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
            // 调用Vercel代理（无需前端传API Key）
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    base64Image: base64Image,
                    imageType: imageType
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(`API返回错误: ${JSON.stringify(result.error)}`);
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
        // 改为调用Vercel代理
        this.apiUrl = '/api/feishu';
    }
    
    /**
     * 获取Tenant Access Token
     * （现在由Vercel代理处理，前端无需调用）
     */
    async getTenantAccessToken() {
        // 不再需要前端获取Token
        return null;
    }
    
    /**
     * 写入记录到多维表格
     * @param {string} tableId - 数据表ID
     * @param {Array} fields - 字段数组 [{field_name: value}, ...]
     */
    async createRecord(tableId, fields) {
        // 调用Vercel代理
        const payload = {
            action: 'create_record',
            tableId: tableId,
            fields: fields
        };
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(`写入记录失败: ${result.error}`);
            }
            
            return result.data.record;
            
        } catch (error) {
            console.error('写入飞书失败:', error);
            throw error;
        }
    }
    
    /**
     * 查询记录
     * @param {string} tableId - 数据表ID
     * @param {string} filter - 过滤条件（可选）
     */
    async listRecords(tableId, filter = '') {
        // 调用Vercel代理
        const payload = {
            action: 'list_records',
            tableId: tableId,
            filter: filter
        };
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(`查询记录失败: ${result.error}`);
            }
            
            return result.data.items || [];
            
        } catch (error) {
            console.error('查询飞书失败:', error);
            throw error;
        }
    }
}

// 导出API类
window.DoubaoAPI = DoubaoAPI;
window.FeishuAPI = FeishuAPI;
